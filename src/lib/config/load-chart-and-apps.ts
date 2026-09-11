import { join } from "node:path"

import type {
  AppConfig,
  ChartAndApps,
  ChartDirName,
  ChartRepoConfig,
  ConfigUnitPath,
  HelmTargetBranchConfig,
  LocalPath,
} from "../../types/types.js"
import { toLocalPath } from "../../types/types.js"
import { parseYamlFile } from "../../utils/yaml.js"
import type { AppSpec, ConfigApp, HelmConfig } from "./schema.js"
import {
  CONFIG_YAML_FILE_NAME,
  ConfigYamlSchema,
  REGISTRY_YAML_FILE_NAME,
  RegistryYamlSchema,
} from "./schema.js"
import type { ChartUnits } from "./find-config-units.js"
import { validateNoDuplicateProjectIds, validateNoDuplicateTargets } from "./validate.js"

/**
 * 1つのchartディレクトリの`registry.yaml`を読み、`chartUnits.unitPaths`（走査＋`TARGET_UNITS`の
 * 絞り込み済み）それぞれを設定ユニット単位の`ChartAndApps`にする。`registry.yaml`の`appSpecs[]`
 * （タグ形式の台帳）は1つのchartディレクトリで共有されるため、重複チェックもここで1回だけ行う。
 */
export function loadChartAndApps(chartUnits: ChartUnits): readonly ChartAndApps[] {
  const registryYamlPath = toLocalPath(join(chartUnits.chartDirPath, REGISTRY_YAML_FILE_NAME))
  const { chartToUpdate: chart, appSpecs } = parseYamlFile(registryYamlPath, RegistryYamlSchema)
  validateNoDuplicateProjectIds(registryYamlPath, appSpecs)
  return chartUnits.unitPaths.map((unitPath) =>
    buildChartAndApps(
      chartUnits.chartDirName,
      unitPath,
      chart,
      appSpecs,
      toLocalPath(join(chartUnits.chartDirPath, unitPath, CONFIG_YAML_FILE_NAME)),
      registryYamlPath,
    ),
  )
}

/**
 * 1つの設定ユニットのディレクトリ（`<chartDir>/<unitPath>/`）の`config.yaml`（運用値＋chart構造）を
 * 読み込み、`appSpecs`（`registry.yaml`の`appSpecs[]`、`projectId`をキーにしたタグ形式の台帳）と
 * `projectId`で結合して`ChartAndApps`（MRを作成する単位）1件にする。`config.yaml`が実在する
 * ディレクトリだけが渡ってくる前提（どのディレクトリが設定ユニットかは`find-config-units.ts`の
 * 走査が決める）。`unitPath`は識別子（ログ・`TARGET_UNITS`・固定ブランチ名に使う）、
 * `*YamlPath`はローカルの実ファイルパス。
 */
function buildChartAndApps(
  chartDirName: ChartDirName,
  unitPath: ConfigUnitPath,
  chart: ChartRepoConfig,
  appSpecs: readonly AppSpec[],
  configYamlPath: LocalPath,
  registryYamlPath: LocalPath,
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

/** `config.yaml`のapp1件と、`projectId`で引き当てた`registry.yaml`の`appSpecs[]`1件の組 */
type LinkedApp = {
  readonly app: ConfigApp
  readonly appSpec: AppSpec
}

/**
 * `config.yaml`（運用値＋chart構造）の各appを、同じchartリポジトリの`registry.yaml`の`appSpecs[]`
 * （タグ形式の台帳）と`projectId`で突き合わせ、組にして返す。どちらのファイルも`projectId`を持つため、
 * 単純な存在チェックに加えて`projectName`の食い違い（コピペミス等）も検知できる
 * - config.yamlの各appに対応するprojectIdがregistry.yamlの`appSpecs[]`に無ければ、`tagFormat`が
 *   引けず最新タグを判定できない設定ミスとして例外をスローする
 * - 両方に存在するprojectIdについて、projectNameが一致しなければ例外をスローする
 * - `registry.yaml`の`appSpecs[]`にだけあってどの設定ユニットからも参照されないappは
 *   エラーにしない（そのchartリポジトリで一時的に更新対象から外している状態を許すため）
 *
 * 検証だけして捨てるのではなく組を返すのは、呼び出し元が同じ突き合わせをもう一度やらずに
 * 済ませるため。2回引くと、ここを通った時点で起こりえない「見つからない」を型と分岐に持つことになる。
 */
function resolveProjectLinkage(
  configYamlPath: LocalPath,
  registryYamlPath: LocalPath,
  configApps: readonly ConfigApp[],
  appSpecs: readonly AppSpec[],
): readonly LinkedApp[] {
  const appSpecByProjectId = new Map(appSpecs.map((appSpec) => [appSpec.projectId, appSpec]))
  return configApps.map((app) => {
    const appSpec = appSpecByProjectId.get(app.projectId)
    if (appSpec === undefined) {
      throw new Error(
        `${configYamlPath}: app "${app.projectName}"（projectId: ${app.projectId}）に対応する設定が ${registryYamlPath} に見つかりません`,
      )
    }
    if (appSpec.projectName !== app.projectName) {
      throw new Error(
        `${configYamlPath} と ${registryYamlPath} で projectId ${app.projectId} の projectName が一致しません（"${app.projectName}" / "${appSpec.projectName}"）`,
      )
    }
    return { app, appSpec }
  })
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
  configYamlPath: LocalPath,
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
