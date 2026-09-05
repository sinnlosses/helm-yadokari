import type { GitlabClient } from "../lib/gitlab/gitlab.js"
import type { AppUpdatePlan, ChartAndApps, ChartUpdateResult, ChartUpdateTarget } from "../types.js"
import { FatalError } from "../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../utils/http.js"
import { logger } from "../utils/logger.js"
import { mapWithConcurrency } from "../utils/parallel.js"
import { buildChartUpdate } from "./sub-steps/build-plans/chart-update.js"

export type BuildPlansResult = {
  readonly toApply: ChartUpdateTarget[]
  readonly settled: ChartUpdateResult[]
}

type PlanOutcome =
  | { readonly status: "apply"; readonly target: ChartUpdateTarget }
  | { readonly status: "settled"; readonly result: ChartUpdateResult }

/**
 * 各chartAndAppsの更新計画を並列に構築する。差分がないもの・dryRunのものは
 * settled（SKIPPED）に、実際に適用が必要なものは toApply にまとめて返す。
 *
 * いずれか1つのアプリの処理が失敗した場合、そのchartAndApps全体をオールオアナッシングで
 * settled（ERROR）に含める（`build-plans/chart-update.ts`の`buildChartUpdate()`参照）。
 */
export async function buildPlans(
  gitlab: GitlabClient,
  targets: readonly ChartAndApps[],
  concurrencyLimit: number,
  dryRun: boolean,
): Promise<BuildPlansResult> {
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (chartAndApps) =>
    buildPlanForChartAndApps(gitlab, chartAndApps, dryRun),
  )

  return outcomes.reduce<BuildPlansResult>(
    (acc, outcome) =>
      outcome.status === "apply"
        ? { ...acc, toApply: [...acc.toApply, outcome.target] }
        : { ...acc, settled: [...acc.settled, outcome.result] },
    { toApply: [], settled: [] },
  )
}

function describePlan(plan: AppUpdatePlan): Record<string, unknown> {
  return {
    projectName: plan.app.projectName,
    latestTag: plan.latestTag.name,
    updates: plan.updates.map((update) => ({
      valuesPath: update.target.valuesPath,
      previousTag: update.previousTag,
    })),
    helmTargetBranchUpdates: plan.helmTargetBranchUpdates.map((update) => ({
      valuesPath: update.target.valuesPath,
      previousBranch: update.previousBranch,
      newBranch: update.newBranch,
    })),
  }
}

async function buildPlanForChartAndApps(
  gitlab: GitlabClient,
  chartAndApps: ChartAndApps,
  dryRun: boolean,
): Promise<PlanOutcome> {
  const logContext = {
    event: "update_chart",
    chartDir: chartAndApps.chartDir,
    chartProjectId: chartAndApps.chart.projectId,
    chartProjectName: chartAndApps.chart.projectName,
  }

  try {
    const { plans, files } = await buildChartUpdate(gitlab, chartAndApps, dryRun)
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
    return { status: "apply", target: { chartAndApps, plans, files } }
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
