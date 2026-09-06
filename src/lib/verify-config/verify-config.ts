import type { AnchorTarget, AppConfig, ChartAndApps, ChartRepoConfig } from "../../types/types.js"
import { toErrorMessage } from "../../utils/http.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { reduceAsync } from "../../utils/sequential.js"
import type { GitlabClient } from "../gitlab/gitlab.js"
import { getValueAtAnchor } from "../helm.js"
import { type RemoteCache, newRemoteCache } from "./remote-cache.js"

// config/ に書かれた値がGitLab上に実在するかを検証する。ローカルのYAMLだけを見る
// `config/validate.ts` のバリデーション（形が正しいか）に対して、こちらは「その先が本当に
// あるか」を見る（存在しないアンカー・valuesPath・ブランチ・projectIdは、従来は本番実行時に
// はじめて ERROR になっていた）。CIから `pnpm lint:validate-config:remote` 経由で呼ぶ。

/**
 * 1つのchartAndApps（＝1つのtenantId/clientId）を検証する間ずっと変わらない値をまとめたもの。
 * `where` は問題を報告するときの位置表示（`<chartDir>/<tenantId>/<clientId>`）、
 * `reportedPaths` は同じvalues.yamlの不在を何度も報告しないための記録。
 */
type VerifyContext = {
  readonly cache: RemoteCache
  readonly where: string
  readonly chart: ChartRepoConfig
  readonly reportedPaths: Set<string>
}

/**
 * 書き込み先1件分（`valuesPath`+`anchor`）を検証する。ファイルが無ければファイルの問題を、
 * ファイルはあるがアンカーが無ければアンカーの問題を返す。同じ`valuesPath`について
 * ファイル不在を何度も報告しないよう、報告済みのパスは`reportedPaths`で覚えておく。
 */
async function verifyTarget(
  { cache, where, chart, reportedPaths }: VerifyContext,
  target: AnchorTarget,
  label: string,
): Promise<string[]> {
  const { content } = await cache.loadValuesYaml(
    chart.projectId,
    chart.mrTargetBranch,
    target.valuesPath,
  )
  if (content === undefined) {
    const key = `${chart.projectId}#${chart.mrTargetBranch}#${target.valuesPath}`
    if (reportedPaths.has(key)) return []
    reportedPaths.add(key)
    return [
      `${where}: ${label} の values.yaml が見つかりません（${target.valuesPath} @ ${chart.mrTargetBranch}）`,
    ]
  }
  if (getValueAtAnchor(content, target.anchor) === undefined) {
    return [
      `${where}: ${label} のアンカー "${target.anchor}" が ${target.valuesPath} に見つかりません`,
    ]
  }
  return []
}

/** 複数の書き込み先を同じラベルで検証する */
function verifyTargets(
  context: VerifyContext,
  targets: readonly AnchorTarget[],
  label: string,
): Promise<string[]> {
  return reduceAsync(targets, [] as string[], async (acc, target) => [
    ...acc,
    ...(await verifyTarget(context, target, label)),
  ])
}

/**
 * 1アプリ分を検証する。ソースプロジェクト自体が見つからない場合、そこに依存する検証
 * （branchToSync）は結果が自明なので行わず、原因となる1件だけを報告する。
 * values.yaml側（`chart[]`・`helm.chart[]`）の検証は、chartリポジトリとそのベースブランチが
 * 揃っているとき（`baseBranchFound`）だけ意味があるためスキップする。
 */
async function verifyApp(
  context: VerifyContext,
  app: AppConfig,
  baseBranchFound: boolean,
): Promise<string[]> {
  const { cache, where, chart } = context

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

  const imageTagProblems = await verifyTargets(
    context,
    app.chart,
    `app "${app.projectName}" の chart[]`,
  )

  const helmTargetBranch = app.helmTargetBranch
  if (helmTargetBranch === undefined) return [...branchProblems, ...imageTagProblems]

  const helmBranchFound = await cache.hasBranch(chart.projectId, helmTargetBranch.branch)
  const helmBranchProblems = helmBranchFound
    ? []
    : [
        `${where}: helm.branchToSync "${helmTargetBranch.branch}" が ${chart.projectName} に見つかりません`,
      ]
  const helmTargetProblems = await verifyTargets(context, helmTargetBranch.targets, "helm.chart[]")
  return [...branchProblems, ...imageTagProblems, ...helmBranchProblems, ...helmTargetProblems]
}

/**
 * 1つのchartAndApps（＝1つのtenantId/clientId）分を検証する。chartリポジトリ自体が
 * 見つからない場合、そこに依存する検証（mrTargetBranch・values.yaml）は結果が自明なので
 * 行わず、原因となる1件だけを報告する。
 */
async function verifyChartAndApps(
  cache: RemoteCache,
  chartAndApps: ChartAndApps,
): Promise<string[]> {
  const { chart, apps } = chartAndApps
  const context: VerifyContext = {
    cache,
    where: `${chartAndApps.chartDir}/${chartAndApps.tenantId}/${chartAndApps.clientId}`,
    chart,
    reportedPaths: new Set<string>(),
  }
  const { where } = context

  const chartProjectFound = await cache.hasProject(chart.projectId)
  const chartProblems = chartProjectFound
    ? []
    : [
        `${where}: chart.yaml の projectId ${chart.projectId}（${chart.projectName}）が見つかりません`,
      ]

  const baseBranchFound =
    chartProjectFound && (await cache.hasBranch(chart.projectId, chart.mrTargetBranch))
  const baseBranchProblems =
    !chartProjectFound || baseBranchFound
      ? []
      : [
          `${where}: chart.yaml の mrTargetBranch "${chart.mrTargetBranch}" が ${chart.projectName} に見つかりません`,
        ]

  const appProblems = await reduceAsync(apps, [] as string[], async (acc, app) => [
    ...acc,
    ...(await verifyApp(context, app, baseBranchFound)),
  ])

  return [...chartProblems, ...baseBranchProblems, ...appProblems]
}

/**
 * `config/` に書かれた projectId・ブランチ・valuesPath・アンカーがGitLab上に実在するかを
 * 検証し、見つかった問題を人が読める文字列の配列で返す（1件目で止めず全件集める）。
 * 問題が無ければ空配列を返す。GitLabへの問い合わせは読み取りのみで、タグ・ブランチ・MRは
 * 一切作らない。
 *
 * 同じプロジェクト・ブランチ・values.yamlへの問い合わせは全chartAndAppsで共有したキャッシュで
 * 1回に抑える。chartAndApps単位は`concurrencyLimit`件ずつ並列に検証するが、結果は入力順を
 * 保った配列で返るため、報告の順序は`config/`の並び順と一致する（T-042）。
 * アプリ単位はchartAndApps内で逐次のまま（キャッシュのヒット率を保つため）。
 */
export async function verifyConfigExistence(
  gitlab: GitlabClient,
  chartAndAppsList: readonly ChartAndApps[],
  concurrencyLimit: number,
): Promise<string[]> {
  const cache = newRemoteCache(gitlab)
  const problemsPerChartAndApps = await mapWithConcurrency(
    chartAndAppsList,
    concurrencyLimit,
    async (chartAndApps) => {
      try {
        return await verifyChartAndApps(cache, chartAndApps)
      } catch (err) {
        return [
          `${chartAndApps.chartDir}/${chartAndApps.tenantId}/${chartAndApps.clientId}: 検証中にエラーが発生しました（${toErrorMessage(err)}）`,
        ]
      }
    },
  )
  return problemsPerChartAndApps.flat()
}
