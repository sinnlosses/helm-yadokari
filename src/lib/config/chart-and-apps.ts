import { existsSync } from "node:fs"
import { join } from "node:path"

import type {
  AnchorTarget,
  AppConfig,
  BranchName,
  ChartAndApps,
  ChartDirName,
  ChartRepoConfig,
  ClientId,
  HelmTargetBranchConfig,
  ProjectName,
  TenantId,
} from "../../types/types.js"
import { parseYamlFile } from "../../utils/yaml.js"
import { ConfigYamlSchema, loadAnchors } from "./schema.js"
import {
  validateNoDuplicateProjectIds,
  validateNoDuplicateTargets,
  validateProjectLinkage,
} from "./validate.js"

/**
 * 1つのclientディレクトリ（`<chartDir>/<tenantId>/<clientId>/`）の`config.yaml`（運用値）と
 * `anchors.yaml`（chart構造）を`projectId`で結合し、`ChartAndApps`（MRを作成する単位）
 * 1件にする。両ファイル間の紐づけ矛盾は`validateProjectLinkage()`で検証する。
 * `config.yaml`が無いディレクトリからは`ChartAndApps`を作らない（空扱いのMR単位を作らない
 * ため）ので、その場合は undefined を返す。
 */
export function loadChartAndApps(
  clientDirPath: string,
  chartDirName: ChartDirName,
  tenantId: TenantId,
  clientId: ClientId,
  chart: ChartRepoConfig,
): ChartAndApps | undefined {
  const configYamlPath = join(clientDirPath, "config.yaml")
  const anchorsPath = join(clientDirPath, "anchors.yaml")
  if (!existsSync(configYamlPath)) return undefined

  const { helm, apps } = parseYamlFile(configYamlPath, ConfigYamlSchema)
  const anchors = loadAnchors(clientDirPath)
  validateNoDuplicateProjectIds(configYamlPath, apps)
  validateNoDuplicateProjectIds(anchorsPath, anchors.apps)
  validateProjectLinkage(configYamlPath, anchorsPath, apps, anchors.apps)
  validateNoDuplicateTargets(anchorsPath, [
    ...anchors.apps.flatMap((anchorApp) =>
      anchorApp.chart.map((anchorTarget) => ({
        target: anchorTarget,
        label: `app "${anchorApp.projectName}" の chart[]`,
      })),
    ),
    ...(anchors.helmChart ?? []).map((anchorTarget) => ({
      target: anchorTarget,
      label: "helm.chart[]",
    })),
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
      imageTagTargets: appChart,
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

  return { chartDirName, tenantId, clientId, chart, apps: appConfigs }
}

/**
 * config.yamlの`helm.branchToSync`（書き込む値）とanchors.yamlの`helm.chart[]`
 * （書き込み先の`valuesPath`+`anchor`一覧）を、app単位の`HelmTargetBranchConfig`に振り分ける。
 * 振り分けは`helm.chart[].valuesPath`とapp自身の`chart[].valuesPath`の一致で行う（どのappの
 * values.yamlに書き込むかを、app側に専用フィールドを持たせず`valuesPath`だけで判定する）。
 * Helmの向き先ブランチは「1client内のapps全体で共通」という前提のため、
 * `branchToSync`が指定されている場合は、そのconfig.yaml配下の全アプリの全`chart[].valuesPath`が
 * `helm.chart[]`でカバーされている必要がある（1つでも漏れていれば、そのvaluesPathだけ
 * 更新対象から漏れてしまう設定ミスとして例外をスローする）。`branchToSync`と`helm.chart[]`は
 * 片方だけの指定も設定ミスとして例外をスローする
 */
function resolveHelmTargetBranch(
  configYamlPath: string,
  anchorsPath: string,
  branchToSync: BranchName | undefined,
  helmChart: readonly AnchorTarget[] | undefined,
  projectName: ProjectName,
  imageTagTargets: readonly AnchorTarget[],
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

  const appValuesPaths = [...new Set(imageTagTargets.map((target) => target.valuesPath))]
  const uncoveredValuesPaths = appValuesPaths.filter(
    (valuesPath) => !helmChart.some((target) => target.valuesPath === valuesPath),
  )
  if (uncoveredValuesPaths.length > 0) {
    throw new Error(
      `${anchorsPath}: helm.branchToSync が指定されていますが、app "${projectName}" の valuesPath（${uncoveredValuesPaths.join(", ")}）が helm.chart[] に見つかりません（Helmの向き先ブランチはclient内の全appで共通のため、全appのvaluesPathを helm.chart[] に含めてください）`,
    )
  }

  const targets = helmChart.filter((target) => appValuesPaths.includes(target.valuesPath))
  return { branchName: branchToSync, targets }
}
