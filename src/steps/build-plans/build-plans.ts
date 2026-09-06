import {
  type GitlabClient,
  branchExists as branchExistsOnGitlab,
  getFileContent,
  getLatestPipelineForRef,
} from "../../lib/gitlab/gitlab.js"
import type {
  AppConfig,
  AppUpdatePlan,
  BranchName,
  ChartAndApps,
  ChartRepoConfig,
  ChartUpdateResult,
  ChartUpdateTarget,
  TagFormat,
} from "../../types/types.js"
import { getOrFetch } from "../../utils/cache.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { left, partitionMap, right } from "../../utils/partition.js"
import { reduceAsync } from "../../utils/sequential.js"
import {
  type StepOutcome,
  describePlan,
  ok,
  runSettled,
  settle,
  withAppContext,
} from "../shared/step-outcome.js"
import { applyHelmTargetBranchTargets } from "./sub-steps/helm-target-branch-target.js"
import { applyImageTagTargets } from "./sub-steps/image-tag-target.js"
import { resolveLatestTag } from "./sub-steps/resolve-latest-tag.js"
import type { BranchExists, LoadValuesYamlContent } from "./sub-steps/shared/types.js"
import {
  type ValuesYamlDraft,
  cacheValuesYamlDraft,
  toFileUpdates,
} from "./sub-steps/shared/values-yaml-draft.js"

export type BuildPlansResult = {
  readonly toApply: readonly ChartUpdateTarget[]
  readonly settled: readonly ChartUpdateResult[]
}

/**
 * 1つのchartAndAppsのGitLabアクセスを、chartのprojectIdとchartAndApps単位のキャッシュごと
 * 閉じ込めた関数の組。サブステップ側はGitLabを知らずに済む。
 */
type ChartAccess = {
  readonly loadValuesYamlContent: LoadValuesYamlContent
  readonly branchExists: BranchExists
}

/** 1つのchartAndAppsを処理する間ずっと変わらない文脈。アプリごとに変わる値と分けて渡す */
type BuildPlanContext = ChartAccess & {
  readonly gitlab: GitlabClient
  readonly dryRun: boolean
  readonly tagFormat: TagFormat
}

/** アプリを1つずつ処理しながら積み上げる、1つのchartAndApps分の更新計画 */
type BuildChartUpdateAcc = {
  readonly plans: readonly AppUpdatePlan[]
  readonly draft: ValuesYamlDraft
}

/**
 * 各chartAndAppsの更新計画を並列に構築する。差分がないもの・dryRunのものは
 * settled（SKIPPED）に、実際に適用が必要なものは toApply にまとめて返す。
 *
 * いずれか1つのアプリの処理が失敗した場合、そのchartAndApps全体をオールオアナッシングで
 * settled（ERROR）に含める（`buildPlan()` 参照）。
 */
export async function buildPlans(
  gitlab: GitlabClient,
  targets: readonly ChartAndApps[],
  concurrencyLimit: number,
  dryRun: boolean,
  tagFormat: TagFormat,
): Promise<BuildPlansResult> {
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (chartAndApps) =>
    runSettled(chartAndApps, (logContext) =>
      buildPlan(gitlab, chartAndApps, dryRun, tagFormat, logContext),
    ),
  )

  const { left: toApply, right: settled } = partitionMap(outcomes, (outcome) =>
    outcome.status === "ok" ? left(outcome.value) : right(outcome.result),
  )
  return { toApply, settled }
}

/**
 * 1つのchartAndAppsの更新計画を組み立て、結果を振り分ける（このstepの並列処理1件分）。
 *
 * 同じvalues.yamlを参照する複数アプリ・複数箇所の変更が下書き（`ValuesYamlDraft`）に
 * 積み重なるよう、配下のアプリは並列化せず1つずつ処理する。差分があったアプリが1件も
 * 無ければSKIPPED、dryRunならMRを作らないのでこれもSKIPPEDとして振り分ける。
 */
async function buildPlan(
  gitlab: GitlabClient,
  chartAndApps: ChartAndApps,
  dryRun: boolean,
  tagFormat: TagFormat,
  logContext: Record<string, unknown>,
): Promise<StepOutcome<ChartUpdateTarget>> {
  const context: BuildPlanContext = {
    gitlab,
    dryRun,
    tagFormat,
    ...createChartAccess(gitlab, chartAndApps.chart),
  }
  const initialAcc: BuildChartUpdateAcc = { plans: [], draft: new Map() }
  const { plans, draft } = await reduceAsync(chartAndApps.apps, initialAcc, (acc, app) =>
    buildAppUpdatePlan(context, acc, app),
  )

  if (plans.length === 0) {
    logger.info({ ...logContext, result: "SKIPPED", reason: "no_diff" })
    return settle("SKIPPED")
  }
  if (dryRun) {
    logger.info({
      ...logContext,
      result: "SKIPPED",
      reason: "dry_run",
      apps: plans.map(describePlan),
    })
    return settle("SKIPPED")
  }
  return ok({ chartAndApps, plans, files: toFileUpdates(draft) })
}

/**
 * chartリポジトリへの読み取りをキャッシュ付きで閉じ込める。values.yamlの内容は下書きを
 * 兼ねるためアプリをまたいで引き継ぎ、ブランチの実在確認はこのchartAndApps内で
 * 同じブランチ名につき1回だけになるよう専用のキャッシュを持つ。
 */
function createChartAccess(gitlab: GitlabClient, chart: ChartRepoConfig): ChartAccess {
  const loadValuesYamlContent: LoadValuesYamlContent = async (draft, valuesPath) => {
    const cached = draft.get(valuesPath)
    if (cached !== undefined) return { content: cached.content, draft }

    const content = await getFileContent(gitlab, chart.projectId, valuesPath, chart.mrTargetBranch)
    if (content === undefined) {
      throw new Error(`values.yaml が見つかりません: ${valuesPath}`)
    }
    return { content, draft: cacheValuesYamlDraft(draft, valuesPath, content) }
  }

  const branchExistsCache = new Map<BranchName, boolean>()
  const branchExists: BranchExists = (branch) =>
    getOrFetch(branchExistsCache, branch, () =>
      branchExistsOnGitlab(gitlab, chart.projectId, branch),
    )

  return { loadValuesYamlContent, branchExists }
}

/**
 * 1アプリ分の更新計画を組み立てる。手順は次の4つ
 *
 * 1. `resolveLatestTag()` — 追跡ブランチのHEADを指すタグが存在するか確認し、無ければ作成する
 * 2. `applyImageTagTargets()` — `app.imageTagTargets`全箇所について、最新タグとの差分をチェックする
 * 3. `applyHelmTargetBranchTargets()` — `app.helmTargetBranch`があれば、向き先ブランチの
 *    全箇所について設定値との差分をチェックする
 * 4. 差分が1件も無ければSKIPPEDとしてログを出して終了、あれば最新パイプラインを取得して
 *    `AppUpdatePlan`を組み立てる
 *
 * 処理中に投げられた例外は`withAppContext()`がアプリ名を付けて投げ直す。
 * 致命的エラーの扱いを含む方針は`steps/shared/step-outcome.ts`に集約している。
 */
async function buildAppUpdatePlan(
  context: BuildPlanContext,
  acc: BuildChartUpdateAcc,
  app: AppConfig,
): Promise<BuildChartUpdateAcc> {
  const { gitlab, dryRun, tagFormat, loadValuesYamlContent, branchExists } = context
  return withAppContext(app.projectName, async () => {
    const latestTag = await resolveLatestTag(gitlab, app, dryRun, tagFormat)

    const { draft: draftAfterChartTargets, updates } = await applyImageTagTargets(
      loadValuesYamlContent,
      latestTag,
      acc.draft,
      app.imageTagTargets,
    )

    const afterHelmTargets = app.helmTargetBranch
      ? await applyHelmTargetBranchTargets(
          branchExists,
          loadValuesYamlContent,
          app.helmTargetBranch,
          draftAfterChartTargets,
        )
      : { draft: draftAfterChartTargets, updates: [] }
    const { draft, updates: helmTargetBranchUpdates } = afterHelmTargets

    if (updates.length === 0 && helmTargetBranchUpdates.length === 0) {
      logger.info({
        event: "check_app",
        projectName: app.projectName,
        result: "SKIPPED",
        reason: "already_up_to_date",
        tag: latestTag.tag.name,
      })
      return { plans: acc.plans, draft }
    }

    // dryRun時はMRを作らないため（`buildPlan()`でSKIPPEDになる）、MR本文組み立てで必要な
    // パイプライン情報は不要。APIコストを削減するため取得をスキップする
    const pipeline = dryRun
      ? undefined
      : await getLatestPipelineForRef(gitlab, app.projectId, latestTag.tag.name)
    const plan: AppUpdatePlan = {
      app,
      latestTag: latestTag.tag,
      pipeline,
      updates,
      helmTargetBranchUpdates,
    }

    return {
      plans: [...acc.plans, plan],
      draft,
    }
  })
}
