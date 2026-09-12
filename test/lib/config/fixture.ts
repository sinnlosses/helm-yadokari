import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach } from "vitest"

import type { LocalPath } from "../../../src/types/types.js"
import { toLocalPath } from "../../../src/types/types.js"

/**
 * `loadConfig()` のテスト用に、テストごとの使い捨て `config/` ディレクトリを用意する。
 * `beforeEach`/`afterEach` の登録も行うので、テストファイル側は
 * `const dir = useConfigDir()` と書くだけでよい。
 */
export type ConfigDir = {
  /** 現在のテスト用ディレクトリの絶対パス */
  readonly path: LocalPath
  readonly writeFile: (relativePath: string, content: string) => void
  readonly writeRegistryYaml: (chartDir: string, registry: string) => void
  readonly writeConfigYaml: (chartDir: string, unitPath: string, config: string) => void
}

export function useConfigDir(): ConfigDir {
  // テストごとに作り直すため、フックの外側に持ち出す用途で let を使う
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = mkdtempSync(join(process.cwd(), "test-tmp-"))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  const writeFile = (relativePath: string, content: string): void => {
    const filePath = join(tmpDir, relativePath)
    mkdirSync(join(filePath, ".."), { recursive: true })
    writeFileSync(filePath, content, "utf-8")
  }

  return {
    get path() {
      return toLocalPath(tmpDir)
    },
    writeFile,
    writeRegistryYaml: (chartDir, registry) => writeFile(`${chartDir}/registry.yaml`, registry),
    writeConfigYaml: (chartDir, unitPath, config) =>
      writeFile(`${chartDir}/${unitPath}/config.yaml`, config),
  }
}

/** `registryYaml()`/`configYaml()` の既定タグ形式（`config/`の実ファイルと同じ値） */
export const DEFAULT_TAG_FORMAT = "{branch}-build-at-{date}-{time}"

/** `registry.yaml`の`appSpecs[]`1件分（タグ形式の台帳） */
export type AppSpecFixture = {
  readonly projectId: number
  readonly projectName: string
  readonly tagFormat?: string
}

/** `apps[].locations[]`・`helm.locations[]`共通の書き込み先1件分 */
export type AnchorLocationFixture = {
  readonly valuesPath: string
  readonly anchor: string
}

/**
 * `registry.yaml`のYAML文字列を組み立てる。`appSpecs`を省略すると`appSpecs: []`になる
 * （`RegistryYamlSchema`が`appSpecs`を必須キーとして要求するため、空でも明示が要る）。
 */
export function registryYaml(
  chartToUpdate: {
    readonly projectId: number
    readonly projectName: string
    readonly mrTargetBranch: string
  },
  appSpecs: readonly AppSpecFixture[] = [],
): string {
  const chartToUpdateBlock =
    `chartToUpdate:\n  projectId: ${chartToUpdate.projectId}\n  projectName: ${chartToUpdate.projectName}\n` +
    `  mrTargetBranch: ${chartToUpdate.mrTargetBranch}\n`
  return chartToUpdateBlock + listField("appSpecs", appSpecs, (app) => appSpecEntry(app))
}

function appSpecEntry(app: AppSpecFixture): string {
  return (
    `  - projectId: ${app.projectId}\n    projectName: ${app.projectName}\n` +
    `    tagFormat: '${app.tagFormat ?? DEFAULT_TAG_FORMAT}'\n`
  )
}

/** `config.yaml`の`apps[]`1件分（運用値＋書き込み位置） */
export type ConfigAppFixture = {
  readonly projectId: number
  readonly projectName: string
  readonly branchToSync: string
  readonly locations: readonly AnchorLocationFixture[]
}

/**
 * `config.yaml`の`helm`（Helmの向き先ブランチ）1件分。`branchToSync`・`locations`を省略すると
 * そのキーごとYAMLに出さないので、片方だけ書いた設定エラーの検証にも使える
 */
export type ConfigHelmFixture = {
  readonly branchToSync?: string
  readonly locations?: readonly AnchorLocationFixture[]
}

/**
 * `config.yaml`のYAML文字列を組み立てる。`apps`を省略すると`apps: []`になる。
 * `helm`は必須フィールドなので、省略時は`apps`の全`valuesPath`をカバーする既定値を組み立てる
 * （向き先ブランチが主題でないテストが毎回同じブロックを書かずに済むようにするため）。
 * `helm`が書かれていない状態そのものを検証したいテストは、YAML文字列を直接書く。
 */
export function configYaml(
  apps: readonly ConfigAppFixture[] = [],
  helm: ConfigHelmFixture = defaultHelm(apps),
): string {
  return helmField(helm) + listField("apps", apps, (app) => configAppEntry(app))
}

/** `apps`が書き込む全`valuesPath`を1つのアンカー名でカバーする`helm`（appsが空なら1件だけ置く） */
function defaultHelm(apps: readonly ConfigAppFixture[]): ConfigHelmFixture {
  const valuesPaths = [...new Set(apps.flatMap((app) => app.locations.map((l) => l.valuesPath)))]
  const covered = valuesPaths.length === 0 ? ["values.yaml"] : valuesPaths
  return {
    branchToSync: "release/2026-q1",
    locations: covered.map((valuesPath) => ({ valuesPath, anchor: "defaultHelmTargetBranch" })),
  }
}

function helmField(helm: ConfigHelmFixture): string {
  const branchBlock =
    helm.branchToSync === undefined ? "" : `  branchToSync: ${helm.branchToSync}\n`
  return `helm:\n${branchBlock}${helm.locations === undefined ? "" : helmLocationsBlock(helm.locations)}`
}

/** `helm.locations`は空配列も表現できるようにする（`locations: []`が設定エラーになることの検証で使う） */
function helmLocationsBlock(locations: readonly AnchorLocationFixture[]): string {
  return locations.length === 0
    ? "  locations: []\n"
    : `  locations:\n${locationsBlock(locations, "    ")}`
}

function configAppEntry(app: ConfigAppFixture): string {
  return (
    `  - projectId: ${app.projectId}\n    projectName: ${app.projectName}\n` +
    `    branchToSync: ${app.branchToSync}\n    locations:\n${locationsBlock(app.locations, "      ")}`
  )
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
