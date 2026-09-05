import type { AnchorTarget, BranchName, ChartAndApps, ProjectId, ValuesPath } from "../types.js"
import { getOrFetch } from "../utils/cache.js"
import { toErrorMessage } from "../utils/http.js"
import { reduceAsync } from "../utils/sequential.js"
import { type GitlabClient, branchExists, getFileContent, projectExists } from "./gitlab/gitlab.js"
import { getValueAtAnchor } from "./helm.js"

// config/ に書かれた値がGitLab上に実在するかを検証する。ローカルのYAMLだけを見る
// `config.ts` のバリデーション（形が正しいか）に対して、こちらは「その先が本当にあるか」を
// 見る（存在しないアンカー・valuesPath・ブランチ・projectIdは、従来は本番実行時にはじめて
// ERROR になっていた）。CIから `pnpm lint:validate-config:remote` 経由で呼ぶ。

/** values.yamlの取得結果。`getOrFetch`のキャッシュ値に undefined を持てないためオブジェクトで包む */
type FileResult = { readonly content: string | undefined }

type Caches = {
  readonly projects: Map<ProjectId, boolean>
  readonly branches: Map<string, boolean>
  readonly files: Map<string, FileResult>
}

function newCaches(): Caches {
  return { projects: new Map(), branches: new Map(), files: new Map() }
}

function checkProject(
  gitlab: GitlabClient,
  caches: Caches,
  projectId: ProjectId,
): Promise<boolean> {
  return getOrFetch(caches.projects, projectId, () => projectExists(gitlab, projectId))
}

function checkBranch(
  gitlab: GitlabClient,
  caches: Caches,
  projectId: ProjectId,
  branch: BranchName,
): Promise<boolean> {
  return getOrFetch(caches.branches, `${projectId}#${branch}`, () =>
    branchExists(gitlab, projectId, branch),
  )
}

function loadValuesYaml(
  gitlab: GitlabClient,
  caches: Caches,
  projectId: ProjectId,
  ref: BranchName,
  valuesPath: ValuesPath,
): Promise<FileResult> {
  return getOrFetch(caches.files, `${projectId}#${ref}#${valuesPath}`, async () => ({
    content: await getFileContent(gitlab, projectId, valuesPath, ref),
  }))
}

/**
 * 書き込み先1件分（`valuesPath`+`anchor`）を検証する。ファイルが無ければファイルの問題を、
 * ファイルはあるがアンカーが無ければアンカーの問題を返す。同じ`valuesPath`について
 * ファイル不在を何度も報告しないよう、報告済みのパスは`reportedPaths`で覚えておく。
 */
async function verifyTarget(
  gitlab: GitlabClient,
  caches: Caches,
  reportedPaths: Set<string>,
  where: string,
  chartProjectId: ProjectId,
  baseBranch: BranchName,
  target: AnchorTarget,
  label: string,
): Promise<string[]> {
  const { content } = await loadValuesYaml(
    gitlab,
    caches,
    chartProjectId,
    baseBranch,
    target.valuesPath,
  )
  if (content === undefined) {
    const key = `${chartProjectId}#${baseBranch}#${target.valuesPath}`
    if (reportedPaths.has(key)) return []
    reportedPaths.add(key)
    return [
      `${where}: ${label} の values.yaml が見つかりません（${target.valuesPath} @ ${baseBranch}）`,
    ]
  }
  if (getValueAtAnchor(content, target.anchor) === undefined) {
    return [
      `${where}: ${label} のアンカー "${target.anchor}" が ${target.valuesPath} に見つかりません`,
    ]
  }
  return []
}

/**
 * 1つのchartAndApps（＝1つのtenantId/clientId）分を検証する。chartリポジトリ自体が
 * 見つからない場合、そこに依存する検証（mrTargetBranch・values.yaml）は結果が自明なので
 * 行わず、原因となる1件だけを報告する。
 */
async function verifyChartAndApps(
  gitlab: GitlabClient,
  caches: Caches,
  chartAndApps: ChartAndApps,
): Promise<string[]> {
  const where = `${chartAndApps.chartDir}/${chartAndApps.tenantId}/${chartAndApps.clientId}`
  const { chart, apps } = chartAndApps
  const reportedPaths = new Set<string>()

  const chartProjectFound = await checkProject(gitlab, caches, chart.projectId)
  const chartProblems = chartProjectFound
    ? []
    : [
        `${where}: chart.yaml の projectId ${chart.projectId}（${chart.projectName}）が見つかりません`,
      ]

  const baseBranchFound =
    chartProjectFound && (await checkBranch(gitlab, caches, chart.projectId, chart.mrTargetBranch))
  const baseBranchProblems =
    !chartProjectFound || baseBranchFound
      ? []
      : [
          `${where}: chart.yaml の mrTargetBranch "${chart.mrTargetBranch}" が ${chart.projectName} に見つかりません`,
        ]

  const appProblems = await reduceAsync(apps, [] as string[], async (acc, app) => {
    const appProjectFound = await checkProject(gitlab, caches, app.projectId)
    if (!appProjectFound) {
      return [
        ...acc,
        `${where}: app "${app.projectName}" の projectId ${app.projectId} が見つかりません`,
      ]
    }
    const branchFound = await checkBranch(gitlab, caches, app.projectId, app.branchToSync)
    const branchProblems = branchFound
      ? []
      : [
          `${where}: app "${app.projectName}" の branchToSync "${app.branchToSync}" が ${app.projectName} に見つかりません`,
        ]

    // values.yaml側の検証は、chartリポジトリと参照先ブランチが揃っているときだけ意味がある
    if (!baseBranchFound) return [...acc, ...branchProblems]

    const imageTagProblems = await reduceAsync(app.chart, [] as string[], async (inner, target) => [
      ...inner,
      ...(await verifyTarget(
        gitlab,
        caches,
        reportedPaths,
        where,
        chart.projectId,
        chart.mrTargetBranch,
        target,
        `app "${app.projectName}" の chart[]`,
      )),
    ])

    const helmTargetBranch = app.helmTargetBranch
    if (helmTargetBranch === undefined) {
      return [...acc, ...branchProblems, ...imageTagProblems]
    }

    const helmBranchFound = await checkBranch(
      gitlab,
      caches,
      chart.projectId,
      helmTargetBranch.branch,
    )
    const helmBranchProblems = helmBranchFound
      ? []
      : [
          `${where}: helm.branchToSync "${helmTargetBranch.branch}" が ${chart.projectName} に見つかりません`,
        ]
    const helmTargetProblems = await reduceAsync(
      helmTargetBranch.targets,
      [] as string[],
      async (inner, target) => [
        ...inner,
        ...(await verifyTarget(
          gitlab,
          caches,
          reportedPaths,
          where,
          chart.projectId,
          chart.mrTargetBranch,
          target,
          "helm.chart[]",
        )),
      ],
    )
    return [
      ...acc,
      ...branchProblems,
      ...imageTagProblems,
      ...helmBranchProblems,
      ...helmTargetProblems,
    ]
  })

  return [...chartProblems, ...baseBranchProblems, ...appProblems]
}

/**
 * `config/` に書かれた projectId・ブランチ・valuesPath・アンカーがGitLab上に実在するかを
 * 検証し、見つかった問題を人が読める文字列の配列で返す（1件目で止めず全件集める）。
 * 問題が無ければ空配列を返す。GitLabへの問い合わせは読み取りのみで、タグ・ブランチ・MRは
 * 一切作らない。
 *
 * 同じプロジェクト・ブランチ・values.yamlへの問い合わせは全chartAndAppsで共有した
 * キャッシュで1回に抑える。chartAndApps単位では逐次実行する（設定ファイルの規模では
 * 十分速く、出力順が設定の並び順と一致して読みやすいため）。
 */
export async function verifyConfigExistence(
  gitlab: GitlabClient,
  chartAndAppsList: readonly ChartAndApps[],
): Promise<string[]> {
  const caches = newCaches()
  return reduceAsync(chartAndAppsList, [] as string[], async (acc, chartAndApps) => {
    try {
      return [...acc, ...(await verifyChartAndApps(gitlab, caches, chartAndApps))]
    } catch (err) {
      return [
        ...acc,
        `${chartAndApps.chartDir}/${chartAndApps.tenantId}/${chartAndApps.clientId}: 検証中にエラーが発生しました（${toErrorMessage(err)}）`,
      ]
    }
  })
}
