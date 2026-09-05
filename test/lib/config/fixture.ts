import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach } from "vitest"

/**
 * `loadConfig()` のテスト用に、テストごとの使い捨て `config/` ディレクトリを用意する。
 * `beforeEach`/`afterEach` の登録も行うので、テストファイル側は
 * `const dir = useConfigDir()` と書くだけでよい（T-041）。
 */
export type ConfigDir = {
  /** 現在のテスト用ディレクトリの絶対パス */
  readonly path: string
  readonly writeFile: (relativePath: string, content: string) => void
  readonly writeChartYaml: (chartDir: string, chart: string) => void
  readonly writeConfigYaml: (
    chartDir: string,
    tenantId: string,
    clientId: string,
    config: string,
  ) => void
  readonly writeAnchorsYaml: (
    chartDir: string,
    tenantId: string,
    clientId: string,
    content: string,
  ) => void
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
    writeChartYaml: (chartDir, chart) => writeFile(`${chartDir}/chart.yaml`, chart),
    writeConfigYaml: (chartDir, tenantId, clientId, config) =>
      writeFile(`${chartDir}/${tenantId}/${clientId}/config.yaml`, config),
    writeAnchorsYaml: (chartDir, tenantId, clientId, content) =>
      writeFile(`${chartDir}/${tenantId}/${clientId}/anchors.yaml`, content),
  }
}
