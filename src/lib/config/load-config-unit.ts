import { join } from "node:path"

import type {
  AccessTokenEnvName,
  AnchorLocation,
  AppConfig,
  BranchName,
  ChartConfig,
  ChartDirName,
  ConfigUnit,
  ConfigUnitPath,
  GroupConfig,
  HelmConfig,
  LocalPath,
  ProjectName,
} from "../../domain/types.js"
import { toLocalPath } from "../../domain/types.js"
import { parseYamlFile } from "../../utils/yaml.js"
import type { RegistryApp } from "./schema.js"
import {
  LOCATIONS_YAML_FILE_NAME,
  LocationsYamlSchema,
  REGISTRY_YAML_FILE_NAME,
  RegistryYamlSchema,
  VERSIONS_YAML_FILE_NAME,
  VersionsYamlSchema,
} from "./schema.js"
import type { ChartDirUnits } from "./find-config-units.js"
import {
  validateNoDuplicateLocations,
  validateNoDuplicateProjectIds,
  validateNoDuplicateProjectNames,
} from "./validate.js"

/**
 * 1つのchartディレクトリを、設定ユニット単位の`ConfigUnit`一覧にする。
 *
 * `registry.yaml`を読み、`chartUnits.unitPaths`（走査＋`TARGET_UNITS`の絞り込み済み）それぞれを
 * `ConfigUnit`にする。`apps[]`は1つのchartディレクトリで共有されるため、
 * 重複チェックもここで1回だけ行う。
 */
export function loadConfigUnits(chartUnits: ChartDirUnits): readonly ConfigUnit[] {
  const registryYamlPath = toLocalPath(join(chartUnits.chartDirPath, REGISTRY_YAML_FILE_NAME))
  const {
    chart,
    apps: registryApps,
    accessTokenEnv,
    group,
  } = parseYamlFile(registryYamlPath, RegistryYamlSchema)
  validateNoDuplicateProjectIds(registryYamlPath, registryApps)
  validateNoDuplicateProjectNames(registryYamlPath, registryApps)
  const chartRepoScope: ChartRepoScope = {
    chartDirName: chartUnits.chartDirName,
    chart,
    registryAppByName: new Map(registryApps.map((registryApp) => [registryApp.projectName, registryApp])),
    accessTokenEnv,
    group,
    registryYamlPath,
  }
  return chartUnits.unitPaths.map((unitPath) =>
    buildConfigUnit(chartRepoScope, {
      unitPath,
      versionsYamlPath: toLocalPath(join(chartUnits.chartDirPath, unitPath, VERSIONS_YAML_FILE_NAME)),
      locationsYamlPath: toLocalPath(
        join(chartUnits.chartDirPath, unitPath, LOCATIONS_YAML_FILE_NAME),
      ),
    }),
  )
}

/** `buildConfigUnit()`の引数のうち、chartリポジトリ単位で1回だけ決まる値 */
type ChartRepoScope = {
  readonly chartDirName: ChartDirName
  readonly chart: ChartConfig
  readonly registryAppByName: ReadonlyMap<ProjectName, RegistryApp>
  readonly accessTokenEnv: AccessTokenEnvName
  readonly group: GroupConfig
  readonly registryYamlPath: LocalPath
}

/** `buildConfigUnit()`の引数のうち、設定ユニットごとに変わる値 */
type ConfigUnitScope = {
  readonly unitPath: ConfigUnitPath
  readonly versionsYamlPath: LocalPath
  readonly locationsYamlPath: LocalPath
}

/**
 * 1つの設定ユニットのディレクトリを読み、`ConfigUnit`（MRを作成する単位）1件にする。
 *
 * `versions.yaml`と`locations.yaml`を読み、app名（`projectName`）で`registry.yaml`の
 * `apps[]`（タグ形式の台帳）を引いて結合する。
 * 2ファイルが実在するディレクトリだけが渡ってくる前提（どのディレクトリが設定ユニットかは走査が
 * 決める）。`unitPath`は識別子（ログ・`TARGET_UNITS`・固定ブランチ名に使う）、
 * `*YamlPath`はローカルの実ファイルパス。
 */
function buildConfigUnit(
  chartRepoScope: ChartRepoScope,
  configUnitScope: ConfigUnitScope,
): ConfigUnit {
  const { chartDirName, chart, registryAppByName, accessTokenEnv, group, registryYamlPath } =
    chartRepoScope
  const { unitPath, versionsYamlPath, locationsYamlPath } = configUnitScope
  const versions = parseYamlFile(versionsYamlPath, VersionsYamlSchema)
  const locations = parseYamlFile(locationsYamlPath, LocationsYamlSchema)
  validateSameAppNames(versionsYamlPath, locationsYamlPath, versions.apps, locations.apps)
  validateNoDuplicateLocations(locationsYamlPath, [
    ...[...locations.apps].flatMap(([name, appLocations]) =>
      appLocations.map((location) => ({ location, label: `app "${name}" の書き込み先` })),
    ),
    ...locations.helm.map((location) => ({ location, label: "helm[]" })),
  ])

  const appConfigs: readonly AppConfig[] = [...versions.apps].map(
    ([projectName, branchToSync]) => {
      const registryApp = registryAppByName.get(projectName)
      if (registryApp === undefined) {
        throw new Error(
          `${versionsYamlPath}: app "${projectName}" に対応する設定が ${registryYamlPath} の apps[] に見つかりません`,
        )
      }
      return {
        projectId: registryApp.projectId,
        projectName,
        branchToSync,
        tagFormat: registryApp.tagFormat,
        locations: locations.apps.get(projectName) ?? [],
      }
    },
  )

  return {
    chartDirName,
    unitPath,
    chart,
    apps: appConfigs,
    helm: resolveHelmConfig(locationsYamlPath, versions.helm, locations.helm, appConfigs),
    accessTokenEnv,
    group,
  }
}

/** `versions.yaml`の`apps`と`locations.yaml`の`apps`のapp名の集合が一致していなければ例外をスローする */
function validateSameAppNames(
  versionsYamlPath: LocalPath,
  locationsYamlPath: LocalPath,
  versionsApps: ReadonlyMap<ProjectName, unknown>,
  apps: ReadonlyMap<ProjectName, unknown>,
): void {
  const onlyInVersions = [...versionsApps.keys()].filter((name) => !apps.has(name))
  const onlyInLocations = [...apps.keys()].filter((name) => !versionsApps.has(name))
  if (onlyInVersions.length === 0 && onlyInLocations.length === 0) return
  const details = [
    ...onlyInVersions.map((name) => `"${name}"（${versionsYamlPath} のみ）`),
    ...onlyInLocations.map((name) => `"${name}"（${locationsYamlPath} のみ）`),
  ].join(", ")
  throw new Error(
    `${versionsYamlPath} の apps と ${locationsYamlPath} の apps で app 名の集合が一致しません: ${details}`,
  )
}

/**
 * `versions.yaml`の`helm`と`locations.yaml`の`helm[]`から、設定ユニット単位の`HelmConfig`を作る。
 *
 * `versions.yaml`の`helm`（引数`branchRef`）＝書き込む値、`helm[]`＝書き込み先の`valuesPath`+`anchor`一覧。
 * Helmの向き先ブランチは「1設定ユニット内のapps全体で共通」という前提なので、
 * appごとに振り分けず設定ユニット単位で1つだけ持つ。
 *
 * その設定ユニットの全アプリの全書き込み先の`valuesPath`が`helm[]`でカバーされている
 * 必要がある（1つでも漏れていれば、そのvaluesPathだけ更新対象から漏れてしまう設定ミスとして例外を
 * スローする）。逆にどのappも書き込まないvaluesPathを指す`helm[]`の要素は`locations`に含めない。
 */
function resolveHelmConfig(
  locationsYamlPath: LocalPath,
  branchRef: BranchName,
  helmLocations: readonly AnchorLocation[],
  apps: readonly AppConfig[],
): HelmConfig {
  for (const app of apps) {
    const appValuesPaths = [
      ...new Set(app.locations.map((location) => location.valuesPath)),
    ]
    const uncoveredValuesPaths = appValuesPaths.filter(
      (valuesPath) => !helmLocations.some((location) => location.valuesPath === valuesPath),
    )
    if (uncoveredValuesPaths.length > 0) {
      throw new Error(
        `${locationsYamlPath}: app "${app.projectName}" の valuesPath（${uncoveredValuesPaths.join(", ")}）が helm[] に見つかりません（Helmの向き先ブランチは設定ユニット内の全appで共通のため、全appのvaluesPathを helm[] に含めてください）`,
      )
    }
  }

  const allValuesPaths = new Set(
    apps.flatMap((app) => app.locations.map((location) => location.valuesPath)),
  )
  const locations = helmLocations.filter((location) => allValuesPaths.has(location.valuesPath))
  return { branchRef, locations }
}
