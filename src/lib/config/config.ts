import { existsSync } from "node:fs"
import { join } from "node:path"

import type {
  AppConfig,
  ChartAndApps,
  ChartDirName,
  ChartRepoConfig,
  Config,
  TargetClient,
} from "../../types.js"
import { toChartDirName, toClientId, toTenantId } from "../../types.js"
import { assertSafePath, listSubdirectories } from "../../utils/fs.js"
import { parseYamlFile } from "../../utils/yaml.js"
import { resolveHelmTargetBranch } from "./helm-target-branch.js"
import { ChartYamlSchema, ConfigYamlSchema, loadAnchors } from "./schema.js"
import {
  validateNoDuplicateProjectIds,
  validateNoDuplicateTargets,
  validateProjectLinkage,
} from "./validate.js"

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
 * config.yaml は `<chartDir>/<tenantId>/<clientId>/config.yaml` の2階層固定で配置される。
 * 同じディレクトリの`anchors.yaml`とprojectId単位で結合し、両ファイル間の紐づけ矛盾
 * （`validateProjectLinkage()`）を検証する。tenantId/clientIdごとに独立した`ChartAndApps`を
 * 1件返す（T-019、MRを作成する単位に対応）。該当する`config.yaml`が存在しないtenant/client
 * ディレクトリからは`ChartAndApps`を作らない（空扱いのMR単位を作らないため）。
 */
function loadClientChartAndApps(
  chartDirPath: string,
  chartDir: ChartDirName,
  chart: ChartRepoConfig,
  target: ConfigTarget,
): ChartAndApps[] {
  const tenantIds = listSubdirectories(chartDirPath).filter(
    (id) => !target.clients || target.clients.some((c) => c.tenantId === id),
  )
  return tenantIds.flatMap((tenantId) => {
    const tenantDirPath = join(chartDirPath, tenantId)
    const clientIds = listSubdirectories(tenantDirPath).filter(
      (id) =>
        !target.clients || target.clients.some((c) => c.tenantId === tenantId && c.clientId === id),
    )
    return clientIds.flatMap((clientId): ChartAndApps[] => {
      const clientDirPath = join(tenantDirPath, clientId)
      const configYamlPath = join(clientDirPath, "config.yaml")
      const anchorsPath = join(clientDirPath, "anchors.yaml")
      if (!existsSync(configYamlPath)) return []

      const { helm, apps } = parseYamlFile(configYamlPath, ConfigYamlSchema)
      const anchors = loadAnchors(clientDirPath)
      validateNoDuplicateProjectIds(configYamlPath, apps)
      validateNoDuplicateProjectIds(anchorsPath, anchors.apps)
      validateProjectLinkage(configYamlPath, anchorsPath, apps, anchors.apps)
      validateNoDuplicateTargets(anchorsPath, [
        ...anchors.apps.flatMap((anchorApp) =>
          anchorApp.chart.map((target) => ({
            target,
            label: `app "${anchorApp.projectName}" の chart[]`,
          })),
        ),
        ...(anchors.helmChart ?? []).map((target) => ({ target, label: "helm.chart[]" })),
      ])

      const anchorAppByProjectId = new Map(
        anchors.apps.map((anchorApp) => [anchorApp.projectId, anchorApp]),
      )
      const appConfigs: AppConfig[] = apps.map((app) => {
        const anchorApp = anchorAppByProjectId.get(app.projectId)
        if (anchorApp === undefined) {
          throw new Error(
            `internal error: validateProjectLinkage を通過したのに projectId ${app.projectId} が見つからない`,
          )
        }
        const { chart: appChart } = anchorApp
        return {
          ...app,
          chart: appChart,
          helmTargetBranch: resolveHelmTargetBranch(
            configYamlPath,
            anchorsPath,
            helm?.branchToSync,
            anchors.helmChart,
            app.projectName,
            appChart,
          ),
        }
      })

      return [
        {
          chartDir,
          tenantId: toTenantId(tenantId),
          clientId: toClientId(clientId),
          chart,
          apps: appConfigs,
        },
      ]
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
 * `config/<chartディレクトリ>/chart.yaml` + `config/<chartディレクトリ>/<tenantId>/<clientId>/config.yaml`
 * （+ 同じディレクトリの`anchors.yaml`）という2階層固定のディレクトリ構成を再帰的に
 * 読み込む。chart.yaml のないディレクトリは無視する。`target` を指定すると該当chart/tenant・
 * clientのみに絞り込む。指定した対象がtypo等で1件も見つからない場合は例外をスローする
 * （`target`未指定時は素通しで、0件でもエラーにしない）。tenantId/clientIdごとに独立した
 * `ChartAndApps`（MRを作成する単位、T-019）を返すため、1つのchartディレクトリに複数の
 * tenantId/clientIdがあれば`chartAndAppsList`には複数件が並ぶ。
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

  const chartAndAppsList = targetChartDirs.flatMap((chartDir): ChartAndApps[] => {
    const chartDirPath = join(path, chartDir)
    const chartYamlPath = join(chartDirPath, "chart.yaml")
    if (!existsSync(chartYamlPath)) return []
    const { chart } = parseYamlFile(chartYamlPath, ChartYamlSchema)
    return loadClientChartAndApps(chartDirPath, toChartDirName(chartDir), chart, target)
  })

  return { chartAndAppsList }
}
