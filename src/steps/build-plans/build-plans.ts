import { type GitlabClient, branchExists as branchExistsOnGitlab } from "../../lib/gitlab/gitlab.js"
import type {
  AppConfig,
  AppUpdatePlan,
  BranchName,
  ChartAndApps,
  ChartUpdateResult,
  ChartUpdateTarget,
  ProjectId,
  TagFormat,
} from "../../types/types.js"
import { getOrFetchShared } from "../../utils/cache.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { left, partitionMap, right } from "../../utils/partition.js"
import { reduceAsync } from "../../utils/sequential.js"
import { describeHelmTargetBranchUpdates, describePlan } from "../shared/describe-plan.js"
import {
  type StepOutcome,
  ok,
  withHandling,
  settle,
  withAppContext,
} from "../shared/step-outcome.js"
import { resolveLatestTag } from "./sub-steps/resolve-latest-tag.js"
import type { BranchExists } from "./sub-steps/shared/types.js"
import {
  type ValuesYamlDraft,
  type ValuesYamlSource,
  toFileUpdates,
} from "./sub-steps/shared/values-yaml-draft.js"
import { stageHelmTargetBranchUpdates } from "./sub-steps/stage-helm-target-branch-updates.js"
import { stageImageTagUpdates } from "./sub-steps/stage-image-tag-updates.js"

export type BuildPlansResult = {
  readonly toApply: readonly ChartUpdateTarget[]
  readonly settled: readonly ChartUpdateResult[]
}

/** 1つのchartAndAppsを処理する間ずっと変わらない文脈。アプリごとに変わる値と分けて渡す */
type BuildPlanContext = {
  readonly gitlab: GitlabClient
  readonly dryRun: boolean
  readonly tagFormat: TagFormat
  readonly valuesYamlSource: ValuesYamlSource
  readonly branchExists: BranchExists
}

/** projectId+ブランチ名単位でブランチの実在確認をキャッシュする、バッチ全体で共有する関数 */
type CachedBranchExists = (projectId: ProjectId, branch: BranchName) => Promise<boolean>

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
  const branchExists = createCachedBranchExists(gitlab)

  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (chartAndApps) =>
    withHandling(chartAndApps, (logContext) =>
      buildPlan(gitlab, chartAndApps, dryRun, tagFormat, branchExists, logContext),
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
  branchExists: CachedBranchExists,
  logContext: Record<string, unknown>,
): Promise<StepOutcome<ChartUpdateTarget>> {
  const { chart } = chartAndApps
  const context: BuildPlanContext = {
    gitlab,
    dryRun,
    tagFormat,
    valuesYamlSource: { gitlab, chart },
    branchExists: (branch) => branchExists(chart.projectId, branch),
  }
  const initialAcc: BuildChartUpdateAcc = { plans: [], draft: new Map() }
  const { plans, draft: draftAfterApps } = await reduceAsync(
    chartAndApps.apps,
    initialAcc,
    (acc, app) =>
      withAppContext(app.projectName, async () => buildAppUpdatePlan(context, acc, app)),
  )

  // 向き先ブランチはclient内のapps全体で共通なのでappループの外で1回だけ適用する。
  // 全アプリのイメージタグを積んだ後の下書きに重ねるため、同じvalues.yamlへの書き換えは失われない
  const { draft, updates: helmTargetBranchUpdates } = chartAndApps.helmTargetBranch
    ? await stageHelmTargetBranchUpdates(
        context.valuesYamlSource,
        context.branchExists,
        chartAndApps.helmTargetBranch,
        draftAfterApps,
      )
    : { draft: draftAfterApps, updates: [] }

  if (plans.length === 0 && helmTargetBranchUpdates.length === 0) {
    logger.info({ ...logContext, result: "SKIPPED", reason: "no_diff" })
    return settle("SKIPPED")
  }
  if (dryRun) {
    logger.info({
      ...logContext,
      result: "SKIPPED",
      reason: "dry_run",
      apps: plans.map(describePlan),
      helmTargetBranchUpdates: describeHelmTargetBranchUpdates(helmTargetBranchUpdates),
    })
    return settle("SKIPPED")
  }
  return ok({ chartAndApps, plans, helmTargetBranchUpdates, files: toFileUpdates(draft) })
}

/**
 * ブランチの実在確認をprojectId+ブランチ名単位でバッチ全体を通してキャッシュする。同じ
 * chartディレクトリ配下の複数tenant/client（＝複数chartAndApps）が同じchart.projectIdを
 * 共有するため、chartAndApps単位でなくバッチ単位（`buildPlans()`で1つ生成）にすることで
 * 問い合わせを使い回せる。`mapWithConcurrency`によりchartAndAppsは並列実行されるため、
 * 同時に来た同じキーの問い合わせも1回にまとめる`getOrFetchShared`を使う。
 */
function createCachedBranchExists(gitlab: GitlabClient): CachedBranchExists {
  const cache = new Map<string, Promise<boolean>>()
  return (projectId, branch) =>
    getOrFetchShared(cache, `${projectId}:${branch}`, () =>
      branchExistsOnGitlab(gitlab, projectId, branch),
    )
}

/**
 * 1アプリ分の更新計画を組み立てる。手順は次の3つ
 *
 * 1. `resolveLatestTag()` — 追跡ブランチのHEADを指すタグが存在するか確認し、無ければ作成する
 * 2. `stageImageTagUpdates()` — `app.imageTagTargets`全箇所について、最新タグとの差分をチェックする
 * 3. 差分が1件も無ければSKIPPEDとしてログを出して終了、あれば`AppUpdatePlan`を組み立てる
 *
 * 処理中に投げられた例外は`withAppContext()`がアプリ名を付けて投げ直す。
 * 致命的エラーの扱いを含む方針は`steps/shared/step-outcome.ts`に集約している。
 */
async function buildAppUpdatePlan(
  context: BuildPlanContext,
  acc: BuildChartUpdateAcc,
  app: AppConfig,
): Promise<BuildChartUpdateAcc> {
  const { gitlab, dryRun, tagFormat, valuesYamlSource } = context

  const latestTag = await resolveLatestTag(gitlab, app, dryRun, tagFormat)

  const { draft, updates } = await stageImageTagUpdates(
    valuesYamlSource,
    latestTag,
    acc.draft,
    app.imageTagTargets,
  )

  if (updates.length === 0) {
    logger.info({
      event: "check_app",
      projectName: app.projectName,
      result: "SKIPPED",
      reason: "already_up_to_date",
      tag: latestTag.tag.name,
    })
    return { plans: acc.plans, draft }
  }

  const plan: AppUpdatePlan = { app, latestTag: latestTag.tag, updates }

  return { plans: [...acc.plans, plan], draft }
}
