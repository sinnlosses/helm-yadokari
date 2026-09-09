import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach } from "vitest"

/**
 * `loadConfig()` のテスト用に、テストごとの使い捨て `config/` ディレクトリを用意する。
 * `beforeEach`/`afterEach` の登録も行うので、テストファイル側は
 * `const dir = useConfigDir()` と書くだけでよい。
 */
export type ConfigDir = {
  /** 現在のテスト用ディレクトリの絶対パス */
  readonly path: string
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
      return tmpDir
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

/** `apps[].chart[]`・`helm.chart[]`共通の書き込み先1件分 */
export type AnchorTargetFixture = {
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

/** `config.yaml`の`apps[]`1件分（運用値＋chart構造） */
export type ConfigAppFixture = {
  readonly projectId: number
  readonly projectName: string
  readonly branchToSync: string
  readonly chart: readonly AnchorTargetFixture[]
}

/** `config.yaml`の`helm`（Helmの向き先ブランチ）1件分 */
export type ConfigHelmFixture = {
  readonly branchToSync: string
  readonly chart?: readonly AnchorTargetFixture[]
}

/**
 * `config.yaml`のYAML文字列を組み立てる。`apps`を省略すると`apps: []`になる。
 */
export function configYaml(
  apps: readonly ConfigAppFixture[] = [],
  helm?: ConfigHelmFixture,
): string {
  const helmBlock = helm === undefined ? "" : helmField(helm)
  return helmBlock + listField("apps", apps, (app) => configAppEntry(app))
}

function helmField(helm: ConfigHelmFixture): string {
  const chartBlock = helm.chart === undefined ? "" : `  chart:\n${targetsBlock(helm.chart, "    ")}`
  return `helm:\n  branchToSync: ${helm.branchToSync}\n${chartBlock}`
}

function configAppEntry(app: ConfigAppFixture): string {
  return (
    `  - projectId: ${app.projectId}\n    projectName: ${app.projectName}\n` +
    `    branchToSync: ${app.branchToSync}\n    chart:\n${targetsBlock(app.chart, "      ")}`
  )
}

function targetsBlock(targets: readonly AnchorTargetFixture[], indent: string): string {
  return targets
    .map((target) => `${indent}- valuesPath: ${target.valuesPath}\n${indent}  anchor: ${target.anchor}\n`)
    .join("")
}

/** `key: []`（空）または`key:\n<entry>...`のYAMLブロックを組み立てる */
function listField<T>(key: string, list: readonly T[], toEntry: (item: T) => string): string {
  return list.length === 0 ? `${key}: []\n` : `${key}:\n${list.map(toEntry).join("")}`
}
