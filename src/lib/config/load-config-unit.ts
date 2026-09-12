import { join } from "node:path"

import type {
  AppConfig,
  ChartDirName,
  ChartRepoConfig,
  ConfigUnit,
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
import type { ChartDirUnits } from "./find-config-units.js"
import { validateNoDuplicateProjectIds, validateNoDuplicateLocations } from "./validate.js"

/**
 * 1つのchartディレクトリの`registry.yaml`を読み、`chartUnits.unitPaths`（走査＋`TARGET_UNITS`の
 * 絞り込み済み）それぞれを設定ユニット単位の`ConfigUnit`にする。`registry.yaml`の`appSpecs[]`
 * （タグ形式の台帳）は1つのchartディレクトリで共有されるため、重複チェックもここで1回だけ行う。
 */
export function loadConfigUnits(chartUnits: ChartDirUnits): readonly ConfigUnit[] {
  const registryYamlPath = toLocalPath(join(chartUnits.chartDirPath, REGISTRY_YAML_FILE_NAME))
  const { chartToUpdate: chart, appSpecs } = parseYamlFile(registryYamlPath, RegistryYamlSchema)
  validateNoDuplicateProjectIds(registryYamlPath, appSpecs)
  const chartRepoScope: ChartRepoScope = {
    chartDirName: chartUnits.chartDirName,
    chart,
    appSpecs,
    registryYamlPath,
  }
  return chartUnits.unitPaths.map((unitPath) =>
    buildConfigUnit(chartRepoScope, {
      unitPath,
      configYamlPath: toLocalPath(join(chartUnits.chartDirPath, unitPath, CONFIG_YAML_FILE_NAME)),
    }),
  )
}

/** `buildConfigUnit()`の引数のうち、chartリポジトリ単位で1回だけ決まる値 */
type ChartRepoScope = {
  readonly chartDirName: ChartDirName
  readonly chart: ChartRepoConfig
  readonly appSpecs: readonly AppSpec[]
  readonly registryYamlPath: LocalPath
}

/** `buildConfigUnit()`の引数のうち、設定ユニットごとに変わる値 */
type ConfigUnitScope = {
  readonly unitPath: ConfigUnitPath
  readonly configYamlPath: LocalPath
}

/**
 * 1つの設定ユニットのディレクトリ（`<chartDir>/<unitPath>/`）の`config.yaml`（運用値＋chart構造）を
 * 読み込み、`appSpecs`（`registry.yaml`の`appSpecs[]`、`projectId`をキーにしたタグ形式の台帳）と
 * `projectId`で結合して`ConfigUnit`（MRを作成する単位）1件にする。`config.yaml`が実在する
 * ディレクトリだけが渡ってくる前提（どのディレクトリが設定ユニットかは`find-config-units.ts`の
 * 走査が決める）。`unitPath`は識別子（ログ・`TARGET_UNITS`・固定ブランチ名に使う）、
 * `*YamlPath`はローカルの実ファイルパス。
 */
function buildConfigUnit(
  chartRepoScope: ChartRepoScope,
  configUnitScope: ConfigUnitScope,
): ConfigUnit {
  const { chartDirName, chart, appSpecs, registryYamlPath } = chartRepoScope
  const { unitPath, configYamlPath } = configUnitScope
  const { helm, apps } = parseYamlFile(configYamlPath, ConfigYamlSchema)
  validateNoDuplicateProjectIds(configYamlPath, apps)
  const linkedApps = resolveProjectLinkage(configYamlPath, registryYamlPath, apps, appSpecs)
  validateNoDuplicateLocations(configYamlPath, [
    ...apps.flatMap((app) =>
      app.locations.map((location) => ({
        location,
        label: `app "${app.projectName}" の locations[]`,
      })),
    ),
    ...helm.locations.map((location) => ({
      location,
      label: "helm.locations[]",
    })),
  ])

  const appConfigs: readonly AppConfig[] = linkedApps.map(({ app, appSpec }) => ({
    projectId: app.projectId,
    projectName: app.projectName,
    branchToSync: app.branchToSync,
    tagFormat: appSpec.tagFormat,
    imageTagLocations: app.locations,
  }))

  return {
    chartDirName,
    unitPath,
    chartRepo: chart,
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
 * config.yamlの`helm`（`branchRef`＝書き込む値、`locations[]`＝書き込み先の`valuesPath`+
 * `anchor`一覧）から、設定ユニット単位の`HelmTargetBranchConfig`を作る。Helmの向き先ブランチは
 * 「1設定ユニット内のapps全体で共通」という前提なので、appごとに振り分けず設定ユニット単位で
 * 1つだけ持つ。そのconfig.yaml配下の全アプリの全`locations[].valuesPath`が`helm.locations[]`で
 * カバーされている必要がある（1つでも漏れていれば、そのvaluesPathだけ更新対象から漏れてしまう
 * 設定ミスとして例外をスローする）。
 * 逆にどのappも書き込まないvaluesPathを指す`helm.locations[]`の要素は`locations`に含めない。
 */
function resolveHelmTargetBranch(
  configYamlPath: LocalPath,
  helm: HelmConfig,
  apps: readonly AppConfig[],
): HelmTargetBranchConfig {
  for (const app of apps) {
    const appValuesPaths = [
      ...new Set(app.imageTagLocations.map((location) => location.valuesPath)),
    ]
    const uncoveredValuesPaths = appValuesPaths.filter(
      (valuesPath) => !helm.locations.some((location) => location.valuesPath === valuesPath),
    )
    if (uncoveredValuesPaths.length > 0) {
      throw new Error(
        `${configYamlPath}: app "${app.projectName}" の valuesPath（${uncoveredValuesPaths.join(", ")}）が helm.locations[] に見つかりません（Helmの向き先ブランチは設定ユニット内の全appで共通のため、全appのvaluesPathを helm.locations[] に含めてください）`,
      )
    }
  }

  const allValuesPaths = new Set(
    apps.flatMap((app) => app.imageTagLocations.map((location) => location.valuesPath)),
  )
  const locations = helm.locations.filter((location) => allValuesPaths.has(location.valuesPath))
  return { branchRef: helm.branchRef, locations }
}
