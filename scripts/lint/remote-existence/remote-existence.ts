import { buildConfigUnitLocation } from "../../../src/domain/config-unit.js"
import type { GitlabClient } from "../../../src/lib/gitlab/gitlab.js"
import { lookupValueAtAnchor } from "../../../src/lib/helm.js"
import type {
  AnchorLocation,
  AppConfig,
  ChartRepoConfig,
  ConfigUnit,
  HelmTargetBranchConfig,
} from "../../../src/types/types.js"
import { toErrorMessage } from "../../../src/utils/errors.js"
import { mapWithConcurrency } from "../../../src/utils/parallel.js"
import { reduceAsync } from "../../../src/utils/sequential.js"
import { type RemoteCache, newRemoteCache } from "./remote-cache.js"

// config/ に書かれた値がGitLab上に実在するかを検証する。ローカルのYAMLだけを見る
// `config/validate.ts` のバリデーション（形が正しいか）に対して、こちらは「その先が本当に
// あるか」を見る。CIから `pnpm lint:validate-config:remote` 経由で呼ぶ。

/**
 * 1つの設定ユニットを検証する間ずっと変わらない値をまとめたもの。
 * `where` は問題を報告するときの位置表示（`<chartDir>/<unitPath>`）、
 * `reportedPaths` は同じvalues.yamlの不在を何度も報告しないための記録。
 */
type ValidateContext = {
  readonly cache: RemoteCache
  readonly where: string
  readonly chart: ChartRepoConfig
  readonly reportedPaths: Set<string>
}

/**
 * `config/` に書かれた projectId・ブランチ・valuesPath・アンカーがGitLab上に実在するかを
 * 検証し、見つかった問題を人が読める文字列の配列で返す（1件目で止めず全件集める）。
 * 問題が無ければ空配列を返す。GitLabへの問い合わせは読み取りのみで、タグ・ブランチ・MRは
 * 一切作らない。
 *
 * 同じプロジェクト・ブランチ・values.yamlへの問い合わせは全設定ユニットで共有したキャッシュで
 * 1回に抑える。設定ユニット単位は`concurrencyLimit`件ずつ並列に検証するが、結果は入力順を
 * 保った配列で返るため、報告の順序は`config/`の並び順と一致する。
 * アプリ単位は設定ユニット内で逐次のまま（キャッシュのヒット率を保つため）。
 */
export async function validateRemoteExistence(
  gitlab: GitlabClient,
  configUnits: readonly ConfigUnit[],
  concurrencyLimit: number,
): Promise<string[]> {
  const cache = newRemoteCache(gitlab)
  const problemsPerConfigUnit = await mapWithConcurrency(
    configUnits,
    concurrencyLimit,
    async (configUnit) => {
      try {
        return await validateConfigUnit(cache, configUnit)
      } catch (err) {
        return [
          `${buildConfigUnitLocation(configUnit.chartDirName, configUnit.unitPath)}: 検証中にエラーが発生しました（${toErrorMessage(err)}）`,
        ]
      }
    },
  )
  return problemsPerConfigUnit.flat()
}

/**
 * 1つの設定ユニット分を検証する。chartリポジトリ自体が
 * 見つからない場合、そこに依存する検証（mrTargetBranch・values.yaml）は結果が自明なので
 * 行わず、原因となる1件だけを報告する。
 */
async function validateConfigUnit(cache: RemoteCache, configUnit: ConfigUnit): Promise<string[]> {
  const { chartRepo, apps, helmTargetBranch } = configUnit
  const context: ValidateContext = {
    cache,
    where: buildConfigUnitLocation(configUnit.chartDirName, configUnit.unitPath),
    chart: chartRepo,
    reportedPaths: new Set<string>(),
  }
  const { where } = context

  const chartProjectFound = await cache.hasProject(chartRepo.projectId)
  const chartProblems = chartProjectFound
    ? []
    : [
        `${where}: registry.yaml の projectId ${chartRepo.projectId}（${chartRepo.projectName}）が見つかりません`,
      ]

  const baseBranchFound =
    chartProjectFound && (await cache.hasBranch(chartRepo.projectId, chartRepo.mrTargetBranch))
  const baseBranchProblems =
    !chartProjectFound || baseBranchFound
      ? []
      : [
          `${where}: registry.yaml の mrTargetBranch "${chartRepo.mrTargetBranch}" が ${chartRepo.projectName} に見つかりません`,
        ]

  const initial: readonly string[] = []
  const appProblems = await reduceAsync(apps, initial, async (acc, app) => [
    ...acc,
    ...(await validateApp(context, app, baseBranchFound)),
  ])
  const helmProblems = baseBranchFound
    ? await validateHelmTargetBranch(context, helmTargetBranch)
    : []

  return [...chartProblems, ...baseBranchProblems, ...appProblems, ...helmProblems]
}

/**
 * 1アプリ分を検証する。ソースプロジェクト自体が見つからない場合、そこに依存する検証
 * （branchToSync）は結果が自明なので行わず、原因となる1件だけを報告する。
 * values.yaml側（`locations[]`）の検証は、chartリポジトリとそのベースブランチが
 * 揃っているとき（`baseBranchFound`）だけ意味があるためスキップする。
 */
async function validateApp(
  context: ValidateContext,
  app: AppConfig,
  baseBranchFound: boolean,
): Promise<string[]> {
  const { cache, where } = context

  if (!(await cache.hasProject(app.projectId))) {
    return [`${where}: app "${app.projectName}" の projectId ${app.projectId} が見つかりません`]
  }

  const branchFound = await cache.hasBranch(app.projectId, app.branchToSync)
  const branchProblems = branchFound
    ? []
    : [
        `${where}: app "${app.projectName}" の branchToSync "${app.branchToSync}" が ${app.projectName} に見つかりません`,
      ]
  if (!baseBranchFound) return branchProblems

  const imageTagProblems = await validateLocations(
    context,
    app.imageTagLocations,
    `app "${app.projectName}" の locations[]`,
  )
  return [...branchProblems, ...imageTagProblems]
}

/**
 * Helmの向き先ブランチ（`helm.branchRef` と `helm.locations[]`）を検証する。設定ユニット単位で
 * 1つなので、アプリの数だけ同じ問題を報告しないようアプリのループの外で1回だけ呼ぶ。
 */
async function validateHelmTargetBranch(
  context: ValidateContext,
  helmTargetBranch: HelmTargetBranchConfig,
): Promise<string[]> {
  const { cache, where, chart } = context

  const branchFound = await cache.hasBranch(chart.projectId, helmTargetBranch.branchRef)
  const branchProblems = branchFound
    ? []
    : [
        `${where}: helm.branchRef "${helmTargetBranch.branchRef}" が ${chart.projectName} に見つかりません`,
      ]
  const targetProblems = await validateLocations(
    context,
    helmTargetBranch.locations,
    "helm.locations[]",
  )
  return [...branchProblems, ...targetProblems]
}

/** 複数の書き込み先を同じラベルで検証する */
function validateLocations(
  context: ValidateContext,
  locations: readonly AnchorLocation[],
  label: string,
): Promise<readonly string[]> {
  const initial: readonly string[] = []
  return reduceAsync(locations, initial, async (acc, location) => [
    ...acc,
    ...(await validateLocation(context, location, label)),
  ])
}

/**
 * 書き込み先1件分（`valuesPath`+`anchor`）を検証する。ファイルが無ければファイルの問題を、
 * ファイルはあるがアンカーを引けなければアンカーの問題を返す（アンカー自体が無いのか、
 * スカラー以外に付いているのかは直せる手が違うので文言を分ける）。同じ`valuesPath`について
 * ファイル不在を何度も報告しないよう、報告済みのパスは`reportedPaths`で覚えておく。
 */
async function validateLocation(
  { cache, where, chart, reportedPaths }: ValidateContext,
  location: AnchorLocation,
  label: string,
): Promise<string[]> {
  const content = await cache.loadValuesYaml(
    chart.projectId,
    chart.mrTargetBranch,
    location.valuesPath,
  )
  if (content === undefined) {
    const key = `${chart.projectId}#${chart.mrTargetBranch}#${location.valuesPath}`
    if (reportedPaths.has(key)) return []
    reportedPaths.add(key)
    return [
      `${where}: ${label} の values.yaml が見つかりません（${location.valuesPath} @ ${chart.mrTargetBranch}）`,
    ]
  }
  const lookup = lookupValueAtAnchor(content, location.anchorName)
  if (lookup.kind === "not_found") {
    return [
      `${where}: ${label} のアンカー "${location.anchorName}" が ${location.valuesPath} に見つかりません`,
    ]
  }
  if (lookup.kind === "non_scalar") {
    return [
      `${where}: ${label} のアンカー "${location.anchorName}" が ${location.valuesPath} でスカラー値に付いていません（マッピングまたはシーケンスに付いています）`,
    ]
  }
  return []
}
