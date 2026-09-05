import { existsSync } from "node:fs"
import { join } from "node:path"

import { z } from "zod"

import type {
  AppConfig,
  ChartAndApps,
  Config,
  HelmTargetBranchConfig,
  HelmTargetBranchTarget,
  ImageTagTarget,
  TargetClient,
} from "../types.js"
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

const ImageTagTargetSchema = z
  .object({
    valuesPath: z.string().min(1, "valuesPath は空にできません").transform(toValuesPath),
    anchor: z.string().min(1, "anchor は空にできません").transform(toAnchorName),
  })
  .transform((v): ImageTagTarget => ({ valuesPath: v.valuesPath, anchor: v.anchor }))

const AppConfigSchema = z.object({
  projectId: z.number().int().transform(toProjectId),
  projectName: z.string().min(1).transform(toProjectName),
  branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
  chart: z.array(ImageTagTargetSchema).min(1, "chart は1件以上指定してください"),
})

const HelmTargetBranchTargetSchema = z
  .object({
    valuesPath: z.string().min(1, "valuesPath は空にできません").transform(toValuesPath),
    anchor: z.string().min(1, "anchor は空にできません").transform(toAnchorName),
  })
  .transform((v): HelmTargetBranchTarget => ({ valuesPath: v.valuesPath, anchor: v.anchor }))

const HelmConfigSchema = z
  .object({
    branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
    chart: z.array(HelmTargetBranchTargetSchema).min(1, "chart は1件以上指定してください"),
  })
  .transform((v): HelmTargetBranchConfig => ({ branch: v.branchToSync, targets: v.chart }))

const AppsYamlSchema = z.object({
  helm: HelmConfigSchema.optional(),
  apps: z.array(AppConfigSchema),
})

/**
 * apps.yamlのファイル直下の`helm`（`branchToSync`＝書き込む値、`chart[]`＝書き込み先の
 * `valuesPath`+`anchor`一覧、tenantId/clientId単位で1件）を、app単位の`HelmTargetBranchConfig`
 * に振り分ける。振り分けは`helm.chart[].valuesPath`とapp自身の`chart[].valuesPath`の一致で行う
 * （どのappのvalues.yamlに書き込むかを、app側に専用フィールドを持たせず`valuesPath`だけで
 * 判定する）。Helmの向き先ブランチは「1client内のapps全体で共通」という前提（T-013）のため、
 * `helm`が指定されている場合は、そのapps.yaml配下の全アプリの全`chart[].valuesPath`が
 * `helm.chart[]`でカバーされている必要がある（1つでも漏れていれば、そのvaluesPathだけ
 * 更新対象から漏れてしまう設定ミスとして例外をスローする）
 */
function resolveHelmTargetBranch(
  appsYamlPath: string,
  helm: HelmTargetBranchConfig | undefined,
  projectName: string,
  chart: readonly ImageTagTarget[],
): HelmTargetBranchConfig | undefined {
  if (helm === undefined) return undefined

  const appValuesPaths = [...new Set(chart.map((target) => target.valuesPath))]
  const uncoveredValuesPaths = appValuesPaths.filter(
    (valuesPath) => !helm.targets.some((target) => target.valuesPath === valuesPath),
  )
  if (uncoveredValuesPaths.length > 0) {
    throw new Error(
      `${appsYamlPath}: helm が指定されていますが、app "${projectName}" の valuesPath（${uncoveredValuesPaths.join(", ")}）が helm.chart[] に見つかりません（Helmの向き先ブランチはclient内の全appで共通のため、全appのvaluesPathを helm.chart[] に含めてください）`,
    )
  }

  const targets = helm.targets.filter((target) => appValuesPaths.includes(target.valuesPath))
  return { branch: helm.branch, targets }
}

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
      const { helm, apps } = parseYamlFile(appsYamlPath, AppsYamlSchema)
      return apps.map((app) => ({
        ...app,
        helmTargetBranch: resolveHelmTargetBranch(appsYamlPath, helm, app.projectName, app.chart),
      }))
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
