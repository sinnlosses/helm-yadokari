import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import type { ConfigRootPath } from "../../../src/domain/types.js"
import { toConfigRootPath } from "../../../src/domain/types.js"
import { useTmpDir } from "../../helpers.js"

/**
 * `loadConfig()` のテスト用に、テストごとの使い捨て `config/` ディレクトリを用意する。
 * 作成・削除は `useTmpDir()` が行うので、テストファイル側は `const dir = useConfigDir()` と
 * 書くだけでよい。
 */
export type ConfigDir = {
  /** 現在のテスト用ディレクトリの絶対パス */
  readonly path: ConfigRootPath
  readonly writeFile: (relativePath: string, content: string) => void
  readonly writeRegistryYaml: (chartDir: string, registry: string) => void
  readonly writeConfigUnit: (chartDir: string, unitPath: string, files: ConfigUnitFiles) => void
}

export function useConfigDir(): ConfigDir {
  const tmpDir = useTmpDir()

  const writeFile = (relativePath: string, content: string): void => {
    const filePath = join(tmpDir.path, relativePath)
    mkdirSync(join(filePath, ".."), { recursive: true })
    writeFileSync(filePath, content, "utf-8")
  }

  return {
    get path() {
      return toConfigRootPath(tmpDir.path)
    },
    writeFile,
    writeRegistryYaml: (chartDir, registry) => writeFile(`${chartDir}/registry.yaml`, registry),
    writeConfigUnit: (chartDir, unitPath, files) => {
      writeFile(`${chartDir}/${unitPath}/versions.yaml`, files.versions)
      writeFile(`${chartDir}/${unitPath}/locations.yaml`, files.locations)
    },
  }
}

/** `registryYaml()`/`configYaml()` の既定タグ形式（`config/`の実ファイルと同じ値） */
export const DEFAULT_TAG_FORMAT = "{branch}-build-at-{date}-{time}"

/** `registry.yaml`の`apps[]`1件分（タグ形式の台帳） */
/** `registry.yaml`トップレベルの`group`。`id`は数値・文字列の両方の書き方を試せるようにしている */
export type GroupFixture = {
  readonly id: number | string
  readonly name: string
}

export type AppSpecFixture = {
  readonly projectId: number
  readonly projectName: string
  readonly tagFormat?: string
}

/** `apps`配下・`helm`共通の書き込み先1件分 */
export type AnchorLocationFixture = {
  readonly valuesPath: string
  readonly anchor: string
}

/**
 * `registry.yaml`のYAML文字列を組み立てる。`apps`を省略すると`apps: []`になる
 * （`RegistryYamlSchema`が`apps`を必須キーとして要求するため、空でも明示が要る）。
 * `accessTokenEnv`と`group`は必須フィールドなので、省略時も既定の値を書き出す（トークンや
 * グループが主題でないテストが毎回同じ行を書かずに済むようにするため）。これらが書かれて
 * いない状態そのものを検証したいテストは、YAML文字列を直接書く。
 */
export function registryYaml(
  chart: {
    readonly projectId: number
    readonly projectName: string
    readonly mrTargetBranch: string
  },
  registryApps: readonly AppSpecFixture[] = [],
  accessTokenEnv: string = "ACCESS_TOKEN_TEAM_A",
  group: GroupFixture = { id: 10, name: "team-a-group" },
): string {
  const accessTokenEnvBlock =
    `accessTokenEnv: ${accessTokenEnv}\n` +
    `group:\n  id: ${group.id}\n  name: ${group.name}\n`
  const chartToUpdateBlock =
    `chart:\n  projectId: ${chart.projectId}\n  projectName: ${chart.projectName}\n` +
    `  mrTargetBranch: ${chart.mrTargetBranch}\n`
  return (
    accessTokenEnvBlock +
    chartToUpdateBlock +
    listField("apps", registryApps, (app) => appSpecEntry(app))
  )
}

function appSpecEntry(app: AppSpecFixture): string {
  return (
    `  - projectId: ${app.projectId}\n    projectName: ${app.projectName}\n` +
    `    tagFormat: '${app.tagFormat ?? DEFAULT_TAG_FORMAT}'\n`
  )
}

/** 設定ユニットの`apps`1件分（追跡ブランチ＋書き込み位置）。app名は`registry.yaml`の`apps[].projectName` */
export type ConfigAppFixture = {
  readonly projectName: string
  readonly branchToSync: string
  readonly locations: readonly AnchorLocationFixture[]
}

/**
 * Helmの向き先ブランチ1件分。`branchRef`・`locations`を省略するとそのキーごとYAMLに出さないので、
 * 片方だけ書いた設定エラーの検証にも使える
 */
export type ConfigHelmFixture = {
  readonly branchRef?: string
  readonly locations?: readonly AnchorLocationFixture[]
}

/** 設定ユニットの2ファイルの中身 */
export type ConfigUnitFiles = {
  readonly versions: string
  readonly locations: string
}

/**
 * `versions.yaml`と`locations.yaml`のYAML文字列を組み立てる。`apps`を省略すると空のマップになる。
 * `helm`は必須なので、省略時は`apps`の全`valuesPath`をカバーする既定値を組み立てる。
 * 書かれていない状態そのものを検証したいテストは、YAML文字列を直接書く。
 */
export function configUnitFiles(
  apps: readonly ConfigAppFixture[] = [],
  helm: ConfigHelmFixture = defaultHelm(apps),
): ConfigUnitFiles {
  const helmLine =
    helm.branchRef === undefined ? "" : `helm: ${helm.branchRef}\n`
  const appsLine =
    apps.length === 0
      ? "apps: {}\n"
      : `apps:\n${apps.map((app) => `  ${app.projectName}: ${app.branchToSync}\n`).join("")}`
  const helmBlock =
    helm.locations === undefined
      ? ""
      : helm.locations.length === 0
        ? "helm: []\n"
        : `helm:\n${locationsBlock(helm.locations, "  ")}`
  const appsBlock =
    apps.length === 0
      ? "apps: {}\n"
      : `apps:\n${apps.map((app) => `  ${app.projectName}:\n${locationsBlock(app.locations, "    ")}`).join("")}`
  return { versions: helmLine + appsLine, locations: helmBlock + appsBlock }
}

/** `apps`が書き込む全`valuesPath`を1つのアンカー名でカバーする`helm`（appsが空なら1件だけ置く） */
function defaultHelm(apps: readonly ConfigAppFixture[]): ConfigHelmFixture {
  const valuesPaths = [...new Set(apps.flatMap((app) => app.locations.map((l) => l.valuesPath)))]
  const covered = valuesPaths.length === 0 ? ["values.yaml"] : valuesPaths
  return {
    branchRef: "release/2026-q1",
    locations: covered.map((valuesPath) => ({ valuesPath, anchor: "defaultHelmTargetBranch" })),
  }
}

function locationsBlock(locations: readonly AnchorLocationFixture[], indent: string): string {
  return locations
    .map(
      (location) =>
        `${indent}- valuesPath: ${location.valuesPath}\n${indent}  anchor: ${location.anchor}\n`,
    )
    .join("")
}

/** `key: []`（空）または`key:\n<entry>...`のYAMLブロックを組み立てる */
function listField<T>(key: string, list: readonly T[], toEntry: (item: T) => string): string {
  return list.length === 0 ? `${key}: []\n` : `${key}:\n${list.map(toEntry).join("")}`
}
