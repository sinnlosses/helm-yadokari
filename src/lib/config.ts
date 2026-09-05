import { existsSync } from "node:fs"
import { join } from "node:path"

import { z } from "zod"

import type {
  AnchorTarget,
  AppConfig,
  BranchName,
  ChartAndApps,
  ChartDirName,
  ChartRepoConfig,
  Config,
  HelmTargetBranchConfig,
  HelmTargetBranchTarget,
  ImageTagTarget,
  ProjectId,
  ProjectName,
  TargetClient,
} from "../types.js"
import {
  toAnchorName,
  toBranchName,
  toChartDirName,
  toClientId,
  toProjectId,
  toProjectName,
  toTenantId,
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

/**
 * `apps[].chart[]`（イメージタグの書き込み先）と`helm.chart[]`（Helm向き先ブランチの
 * 書き込み先）はどちらも`valuesPath`+`anchor`という同じ形なので、スキーマも共有する
 * （型側も`AnchorTarget`とそのエイリアス、T-024）
 */
const AnchorTargetSchema = z
  .object({
    valuesPath: z.string().min(1, "valuesPath は空にできません").transform(toValuesPath),
    anchor: z.string().min(1, "anchor は空にできません").transform(toAnchorName),
  })
  .transform((v): AnchorTarget => ({ valuesPath: v.valuesPath, anchor: v.anchor }))

/** config.yaml側。運用値のみ（chart構造はanchors.yaml側が持つ） */
const AppOperationalSchema = z.object({
  projectId: z.number().int().transform(toProjectId),
  projectName: z.string().min(1).transform(toProjectName),
  branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
})

const HelmOperationalSchema = z.object({
  branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
})

const ConfigYamlSchema = z.object({
  helm: HelmOperationalSchema.optional(),
  apps: z.array(AppOperationalSchema),
})

/**
 * anchors.yaml側。1app分のchart構造（`chart[]`）に加え、`config.yaml`側と紐付けて
 * 整合性検証するための`projectId`/`projectName`を重複して持つ（`projectId`だけをキーにすると
 * 何のappか読み解きにくいという指摘を踏まえ、あえて自己完結した配列要素にしている）
 */
const AnchorsAppSchema = z.object({
  projectId: z.number().int().transform(toProjectId),
  projectName: z.string().min(1).transform(toProjectName),
  chart: z.array(AnchorTargetSchema).min(1, "chart は1件以上指定してください"),
})

const AnchorsHelmSchema = z.object({
  chart: z.array(AnchorTargetSchema).min(1, "chart は1件以上指定してください"),
})

const AnchorsYamlSchema = z.object({
  helm: AnchorsHelmSchema.optional(),
  apps: z.array(AnchorsAppSchema),
})

type AnchorsApp = z.infer<typeof AnchorsAppSchema>

type Anchors = {
  readonly apps: readonly AnchorsApp[]
  readonly helmChart: readonly HelmTargetBranchTarget[] | undefined
}

/**
 * config.yamlと同じtenantId/clientIdディレクトリにある`anchors.yaml`を読み込む。
 * 存在しない場合は空扱い（そのclientに1件もappが無いケースを許容するため）。
 */
function loadAnchors(clientDirPath: string): Anchors {
  const path = join(clientDirPath, "anchors.yaml")
  if (!existsSync(path)) return { apps: [], helmChart: undefined }
  const parsed = parseYamlFile(path, AnchorsYamlSchema)
  return { apps: parsed.apps, helmChart: parsed.helm?.chart }
}

/**
 * `config.yaml`（運用値）と`anchors.yaml`（chart構造）の間で、appの紐づけに矛盾が
 * ないか検証する。どちらのファイルも`projectId`を持つため、単純な存在チェックに加えて
 * `projectName`の食い違い（コピペミス等）も検知できる
 * - config.yamlの各appに対応するprojectIdがanchors.yamlに無ければ、書き込み先が
 *   定義されていない設定ミスとして例外をスローする
 * - anchors.yamlの各appに対応するprojectIdがconfig.yamlに無ければ、使われない
 *   孤児設定として例外をスローする（appを削除した際の消し忘れに気づけるようにするため）
 * - 両方に存在するprojectIdについて、projectNameが一致しなければ例外をスローする
 */
function validateProjectLinkage(
  configYamlPath: string,
  anchorsPath: string,
  configApps: readonly { readonly projectId: ProjectId; readonly projectName: ProjectName }[],
  anchorApps: readonly { readonly projectId: ProjectId; readonly projectName: ProjectName }[],
): void {
  const anchorByProjectId = new Map(anchorApps.map((app) => [app.projectId, app]))
  for (const app of configApps) {
    const anchorApp = anchorByProjectId.get(app.projectId)
    if (anchorApp === undefined) {
      throw new Error(
        `${configYamlPath}: app "${app.projectName}"（projectId: ${app.projectId}）に対応する設定が ${anchorsPath} に見つかりません`,
      )
    }
    if (anchorApp.projectName !== app.projectName) {
      throw new Error(
        `${configYamlPath} と ${anchorsPath} で projectId ${app.projectId} の projectName が一致しません（"${app.projectName}" / "${anchorApp.projectName}"）`,
      )
    }
  }

  const configProjectIds = new Set(configApps.map((app) => app.projectId))
  const orphanApps = anchorApps.filter((app) => !configProjectIds.has(app.projectId))
  if (orphanApps.length > 0) {
    const orphanList = orphanApps
      .map((app) => `${app.projectName}（projectId: ${app.projectId}）`)
      .join(", ")
    throw new Error(
      `${anchorsPath}: ${configYamlPath} に存在しないapp（${orphanList}）が定義されています`,
    )
  }
}

/**
 * config.yamlの`helm.branchToSync`（書き込む値）とanchors.yamlの`helm.chart[]`
 * （書き込み先の`valuesPath`+`anchor`一覧）を、app単位の`HelmTargetBranchConfig`に振り分ける。
 * 振り分けは`helm.chart[].valuesPath`とapp自身の`chart[].valuesPath`の一致で行う（どのappの
 * values.yamlに書き込むかを、app側に専用フィールドを持たせず`valuesPath`だけで判定する）。
 * Helmの向き先ブランチは「1client内のapps全体で共通」という前提（T-013）のため、
 * `branchToSync`が指定されている場合は、そのconfig.yaml配下の全アプリの全`chart[].valuesPath`が
 * `helm.chart[]`でカバーされている必要がある（1つでも漏れていれば、そのvaluesPathだけ
 * 更新対象から漏れてしまう設定ミスとして例外をスローする）。`branchToSync`と`helm.chart[]`は
 * 片方だけの指定も設定ミスとして例外をスローする
 */
function resolveHelmTargetBranch(
  configYamlPath: string,
  anchorsPath: string,
  branchToSync: BranchName | undefined,
  helmChart: readonly HelmTargetBranchTarget[] | undefined,
  projectName: string,
  chart: readonly ImageTagTarget[],
): HelmTargetBranchConfig | undefined {
  if (branchToSync === undefined && helmChart === undefined) return undefined
  if (branchToSync === undefined) {
    throw new Error(
      `${anchorsPath}: helm.chart が指定されていますが、${configYamlPath} の helm.branchToSync がありません`,
    )
  }
  if (helmChart === undefined) {
    throw new Error(
      `${configYamlPath}: helm.branchToSync が指定されていますが、${anchorsPath} の helm.chart がありません`,
    )
  }

  const appValuesPaths = [...new Set(chart.map((target) => target.valuesPath))]
  const uncoveredValuesPaths = appValuesPaths.filter(
    (valuesPath) => !helmChart.some((target) => target.valuesPath === valuesPath),
  )
  if (uncoveredValuesPaths.length > 0) {
    throw new Error(
      `${anchorsPath}: helm.branchToSync が指定されていますが、app "${projectName}" の valuesPath（${uncoveredValuesPaths.join(", ")}）が helm.chart[] に見つかりません（Helmの向き先ブランチはclient内の全appで共通のため、全appのvaluesPathを helm.chart[] に含めてください）`,
    )
  }

  const targets = helmChart.filter((target) => appValuesPaths.includes(target.valuesPath))
  return { branch: branchToSync, targets }
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
      validateProjectLinkage(configYamlPath, anchorsPath, apps, anchors.apps)

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
