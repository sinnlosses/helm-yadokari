import type {
  AppConfig,
  ChartAndApps,
  ChartDirName,
  ChartRepoConfig,
  ConfigUnitPath,
  HelmTargetBranchConfig,
} from "../../types/types.js"
import { parseYamlFile } from "../../utils/yaml.js"
import type { AppSpec, HelmConfig } from "./schema.js"
import { ConfigYamlSchema } from "./schema.js"
import {
  resolveProjectLinkage,
  validateNoDuplicateProjectIds,
  validateNoDuplicateTargets,
} from "./validate.js"

/**
 * 1つの設定ユニットのディレクトリ（`<chartDir>/<unitPath>/`）の`config.yaml`（運用値＋chart構造）を
 * 読み込み、`appSpecs`（`registry.yaml`の`appSpecs[]`、`projectId`をキーにしたタグ形式の台帳）と
 * `projectId`で結合して`ChartAndApps`（MRを作成する単位）1件にする。両者間の紐づけ矛盾の検証と
 * 結合そのものは`resolveProjectLinkage()`が一度に行う。`config.yaml`が実在するディレクトリだけが渡ってくる
 * 前提（どのディレクトリが設定ユニットかは`config.ts`の走査が決める）。
 * `unitPath`は識別子（ログ・`TARGET_UNITS`・固定ブランチ名に使う）、`*YamlPath`はローカルの実ファイルパス。
 */
export function loadChartAndApps(
  chartDirName: ChartDirName,
  unitPath: ConfigUnitPath,
  chart: ChartRepoConfig,
  appSpecs: readonly AppSpec[],
  configYamlPath: string,
  registryYamlPath: string,
): ChartAndApps {
  const { helm, apps } = parseYamlFile(configYamlPath, ConfigYamlSchema)
  validateNoDuplicateProjectIds(configYamlPath, apps)
  const linkedApps = resolveProjectLinkage(configYamlPath, registryYamlPath, apps, appSpecs)
  validateNoDuplicateTargets(configYamlPath, [
    ...apps.flatMap((app) =>
      app.chart.map((target) => ({
        target,
        label: `app "${app.projectName}" の chart[]`,
      })),
    ),
    ...helm.chart.map((target) => ({
      target,
      label: "helm.chart[]",
    })),
  ])

  const appConfigs: readonly AppConfig[] = linkedApps.map(({ app, appSpec }) => ({
    projectId: app.projectId,
    projectName: app.projectName,
    branchToSync: app.branchToSync,
    tagFormat: appSpec.tagFormat,
    imageTagTargets: app.chart,
  }))

  return {
    chartDirName,
    unitPath,
    chart,
    apps: appConfigs,
    helmTargetBranch: resolveHelmTargetBranch(configYamlPath, helm, appConfigs),
  }
}

/**
 * config.yamlの`helm`（`branchToSync`＝書き込む値、`chart[]`＝書き込み先の`valuesPath`+
 * `anchor`一覧）から、設定ユニット単位の`HelmTargetBranchConfig`を作る。Helmの向き先ブランチは
 * 「1設定ユニット内のapps全体で共通」という前提なので、appごとに振り分けず設定ユニット単位で
 * 1つだけ持つ。そのconfig.yaml配下の全アプリの全`chart[].valuesPath`が`helm.chart[]`でカバー
 * されている必要がある（1つでも漏れていれば、そのvaluesPathだけ更新対象から漏れてしまう
 * 設定ミスとして例外をスローする）。
 * 逆にどのappも書き込まないvaluesPathを指す`helm.chart[]`の要素は`targets`に含めない。
 */
function resolveHelmTargetBranch(
  configYamlPath: string,
  helm: HelmConfig,
  apps: readonly AppConfig[],
): HelmTargetBranchConfig {
  for (const app of apps) {
    const appValuesPaths = [...new Set(app.imageTagTargets.map((target) => target.valuesPath))]
    const uncoveredValuesPaths = appValuesPaths.filter(
      (valuesPath) => !helm.chart.some((target) => target.valuesPath === valuesPath),
    )
    if (uncoveredValuesPaths.length > 0) {
      throw new Error(
        `${configYamlPath}: app "${app.projectName}" の valuesPath（${uncoveredValuesPaths.join(", ")}）が helm.chart[] に見つかりません（Helmの向き先ブランチは設定ユニット内の全appで共通のため、全appのvaluesPathを helm.chart[] に含めてください）`,
      )
    }
  }

  const allValuesPaths = new Set(
    apps.flatMap((app) => app.imageTagTargets.map((target) => target.valuesPath)),
  )
  const targets = helm.chart.filter((target) => allValuesPaths.has(target.valuesPath))
  return { branchName: helm.branchToSync, targets }
}
