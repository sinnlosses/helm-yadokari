import { existsSync } from "node:fs"
import { join } from "node:path"

import { z } from "zod"

import type { AppConfig, ChartAndApps, Config, TargetClient } from "../types.js"
import {
  toAnchorName,
  toBranchName,
  toChartDirName,
  toProjectId,
  toProjectName,
  toValuesPath,
} from "../types.js"
import { assertSafePath, listSubdirectories } from "../utils/fs.js"
import { parseYamlFile } from "../utils/yaml.js"

const ChartYamlSchema = z.object({
  chart: z.object({
    projectId: z.number().int().transform(toProjectId),
    projectName: z.string().min(1).transform(toProjectName),
    mrTargetBranch: z.string().min(1, "mrTargetBranch は空にできません").transform(toBranchName),
  }),
})

const ImageTagTargetSchema = z.object({
  valuesPath: z.string().min(1, "valuesPath は空にできません").transform(toValuesPath),
  imageTagAnchor: z.string().min(1, "imageTagAnchor は空にできません").transform(toAnchorName),
})

const AppConfigSchema = z.object({
  projectId: z.number().int().transform(toProjectId),
  projectName: z.string().min(1).transform(toProjectName),
  branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
  chart: z.array(ImageTagTargetSchema).min(1, "chart は1件以上指定してください"),
})

const AppsYamlSchema = z.object({
  apps: z.array(AppConfigSchema),
})

/**
 * 特定のchartディレクトリ・特定のtenantId/clientIdの組（複数可）に処理対象を絞り込む
 * ためのフィルタ。手動トリガー時に全chart/全clientではなく一部だけを実行したい場合に使う
 * （`TARGET_CHART_DIR` / `TARGET_CLIENT` 環境変数由来）。
 */
export type ConfigTarget = {
  readonly chartDir?: string
  readonly clients?: readonly TargetClient[]
}

/**
 * apps.yaml は `<chartDir>/<tenantId>/<clientId>/apps.yaml` の2階層固定で配置される。
 * 該当ファイルが存在しない tenant/client は空扱いとする。
 */
function loadApps(chartDirPath: string, target: ConfigTarget): AppConfig[] {
  const tenantIds = listSubdirectories(chartDirPath).filter(
    (id) => !target.clients || target.clients.some((c) => c.tenantId === id),
  )
  return tenantIds.flatMap((tenantId) => {
    const tenantDirPath = join(chartDirPath, tenantId)
    const clientIds = listSubdirectories(tenantDirPath).filter(
      (id) =>
        !target.clients || target.clients.some((c) => c.tenantId === tenantId && c.clientId === id),
    )
    return clientIds.flatMap((clientId) => {
      const appsYamlPath = join(tenantDirPath, clientId, "apps.yaml")
      if (!existsSync(appsYamlPath)) return []
      return parseYamlFile(appsYamlPath, AppsYamlSchema).apps
    })
  })
}

/** 指定chart群のいずれかの配下に、指定tenantId/clientIdのディレクトリが存在するか */
function clientDirExists(
  path: string,
  chartDirs: readonly string[],
  client: TargetClient,
): boolean {
  return chartDirs.some((chartDir) =>
    existsSync(join(path, chartDir, client.tenantId, client.clientId)),
  )
}

/**
 * `config/<chartディレクトリ>/chart.yaml` + `config/<chartディレクトリ>/<tenantId>/<clientId>/apps.yaml`
 * という2階層固定のディレクトリ構成を再帰的に読み込む。chart.yaml のないディレクトリは無視する。
 * `target` を指定すると該当chart/tenant・clientのみに絞り込む。指定した対象がtypo等で
 * 1件も見つからない場合は例外をスローする（`target`未指定時は素通しで、0件でもエラーにしない）。
 */
export function loadConfig(configPath?: string, target: ConfigTarget = {}): Config {
  const path = configPath ?? "config"
  assertSafePath(path, "CONFIG_PATH")

  const chartDirs = listSubdirectories(path)
  if (target.chartDir && !chartDirs.includes(target.chartDir)) {
    throw new Error(
      `TARGET_CHART_DIR で指定された "${target.chartDir}" が config/ 配下に見つかりません`,
    )
  }
  const targetChartDirs = target.chartDir ? [target.chartDir] : chartDirs

  const missingClients = (target.clients ?? []).filter(
    (client) => !clientDirExists(path, targetChartDirs, client),
  )
  if (missingClients.length > 0) {
    const missingList = missingClients.map((c) => `${c.tenantId}/${c.clientId}`).join(", ")
    throw new Error(`TARGET_CLIENT で指定された "${missingList}" が見つかりません`)
  }

  const chartAndAppsList = targetChartDirs
    .map((chartDir): ChartAndApps | undefined => {
      const chartDirPath = join(path, chartDir)
      const chartYamlPath = join(chartDirPath, "chart.yaml")
      if (!existsSync(chartYamlPath)) return undefined
      const { chart } = parseYamlFile(chartYamlPath, ChartYamlSchema)
      return { chartDir: toChartDirName(chartDir), chart, apps: loadApps(chartDirPath, target) }
    })
    .filter((group): group is ChartAndApps => group !== undefined)

  return { chartAndAppsList }
}
