import type { FileUpdate, GitlabClient } from "../lib/gitlab.js"
import type { AppUpdatePlan, ChartGroup, ChartUpdateResult } from "../types.js"
import { FatalError } from "../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../utils/http.js"
import { logger } from "../utils/logger.js"
import { mapWithConcurrency } from "../utils/parallel.js"
import { chartLogContext } from "./log-context.js"
import { describePlan } from "./mr-content.js"
import { buildChartUpdate } from "./update-plan.js"

export type ChartUpdateTarget = {
  readonly chartGroup: ChartGroup
  readonly plans: AppUpdatePlan[]
  readonly files: FileUpdate[]
}

export type BuildPlansResult = {
  readonly toApply: ChartUpdateTarget[]
  readonly settled: ChartUpdateResult[]
}

type PlanOutcome =
  | { readonly status: "apply"; readonly target: ChartUpdateTarget }
  | { readonly status: "settled"; readonly result: ChartUpdateResult }

/**
 * 各chartグループの更新計画を並列に構築する。差分がないもの・dryRunのものは
 * settled（SKIPPED）に、実際に反映が必要なものは toApply にまとめて返す。
 *
 * いずれか1つのアプリの処理が失敗した場合、そのchartグループ全体をオールオアナッシングで
 * settled（ERROR）に含める（`update-plan.ts` の `buildChartUpdate()` 参照）。
 */
export async function buildPlans(
  gitlab: GitlabClient,
  targets: readonly ChartGroup[],
  concurrencyLimit: number,
  dryRun: boolean,
): Promise<BuildPlansResult> {
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (chartGroup) =>
    buildPlanForChartGroup(gitlab, chartGroup, dryRun),
  )

  const toApply: ChartUpdateTarget[] = []
  const settled: ChartUpdateResult[] = []
  for (const outcome of outcomes) {
    if (outcome.status === "apply") toApply.push(outcome.target)
    else settled.push(outcome.result)
  }
  return { toApply, settled }
}

async function buildPlanForChartGroup(
  gitlab: GitlabClient,
  chartGroup: ChartGroup,
  dryRun: boolean,
): Promise<PlanOutcome> {
  const logContext = chartLogContext(chartGroup)
  const { chart, apps } = chartGroup

  try {
    const { plans, files } = await buildChartUpdate(
      gitlab,
      chart.projectId,
      chart.mrTargetBranch,
      apps,
      dryRun,
    )
    if (plans.length === 0) {
      logger.info({ ...logContext, result: "SKIPPED", reason: "no_diff" })
      return { status: "settled", result: "SKIPPED" }
    }
    if (dryRun) {
      logger.info({
        ...logContext,
        result: "SKIPPED",
        reason: "dry_run",
        apps: plans.map(describePlan),
      })
      return { status: "settled", result: "SKIPPED" }
    }
    return { status: "apply", target: { chartGroup, plans, files } }
  } catch (err) {
    if (isFatalError(err)) throw new FatalError(extractHttpStatus(err), err)
    logger.error({
      ...logContext,
      result: "ERROR",
      reason: `httpStatus: ${extractHttpStatus(err)}, message: ${toErrorMessage(err)}`,
    })
    return { status: "settled", result: "ERROR" }
  }
}
