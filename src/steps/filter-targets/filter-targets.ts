import { type GitlabClient, openMergeRequestExists } from "../../lib/gitlab/gitlab.js"
import type { ChartAndApps, ChartUpdateResult } from "../../types/types.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { left, partitionMap, right } from "../../utils/partition.js"
import { buildFeatureBranch } from "../shared/feature-branch.js"
import { type StepOutcome, ok, runSettled, settle } from "../shared/step-outcome.js"

export type FilterTargetsResult = {
  readonly targets: readonly ChartAndApps[]
  readonly settled: readonly ChartUpdateResult[]
}

/**
 * 登録アプリが0件、または固定ブランチにオープン中のMRが既にあるchartAndAppsを除外する。
 * 除外されたchartAndAppsの判定結果（SKIPPED/ERROR）は settled にまとめて返す。
 */
export async function filterTargets(
  gitlab: GitlabClient,
  chartAndAppsList: readonly ChartAndApps[],
  concurrencyLimit: number,
): Promise<FilterTargetsResult> {
  const outcomes = await mapWithConcurrency(chartAndAppsList, concurrencyLimit, (chartAndApps) =>
    runSettled(chartAndApps, (logContext) => evaluateTarget(gitlab, chartAndApps, logContext)),
  )

  const { left: targets, right: settled } = partitionMap(outcomes, (outcome) =>
    outcome.status === "ok" ? left(outcome.value) : right(outcome.result),
  )
  return { targets, settled }
}

/**
 * 1つのchartAndAppsが処理対象か判定する（このstepの並列処理1件分）。登録アプリが0件、
 * または固定ブランチにオープン中のMRがある場合はSKIPPED。
 */
async function evaluateTarget(
  gitlab: GitlabClient,
  chartAndApps: ChartAndApps,
  logContext: Record<string, unknown>,
): Promise<StepOutcome<ChartAndApps>> {
  if (chartAndApps.apps.length === 0) {
    logger.info({ ...logContext, result: "SKIPPED", reason: "no_apps" })
    return settle("SKIPPED")
  }

  const branch = buildFeatureBranch(chartAndApps.tenantId, chartAndApps.clientId)
  if (await openMergeRequestExists(gitlab, chartAndApps.chart.projectId, branch)) {
    logger.info({ ...logContext, result: "SKIPPED", reason: "mr_exists" })
    return settle("SKIPPED")
  }
  return ok(chartAndApps)
}
