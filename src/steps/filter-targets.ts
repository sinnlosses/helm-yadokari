import { UPDATE_BRANCH } from "../lib/constants.js"
import { type GitlabClient, openMergeRequestExists } from "../lib/gitlab.js"
import { chartLogContext } from "../lib/log-context.js"
import type { ChartGroup, ChartUpdateResult } from "../types.js"
import { FatalError } from "../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../utils/http.js"
import { logger } from "../utils/logger.js"
import { mapWithConcurrency } from "../utils/parallel.js"

export type FilterTargetsResult = {
  readonly targets: ChartGroup[]
  readonly settled: ChartUpdateResult[]
}

type TargetOutcome =
  | { readonly status: "target"; readonly chartGroup: ChartGroup }
  | { readonly status: "settled"; readonly result: ChartUpdateResult }

/**
 * 登録アプリが0件、または固定ブランチにオープン中のMRが既にあるchartグループを除外する。
 * 除外されたchartグループの判定結果（SKIPPED/ERROR）は settled にまとめて返す。
 */
export async function filterTargets(
  gitlab: GitlabClient,
  chartGroups: readonly ChartGroup[],
  concurrencyLimit: number,
): Promise<FilterTargetsResult> {
  const outcomes = await mapWithConcurrency(chartGroups, concurrencyLimit, (chartGroup) =>
    checkTarget(gitlab, chartGroup),
  )

  const targets: ChartGroup[] = []
  const settled: ChartUpdateResult[] = []
  for (const outcome of outcomes) {
    if (outcome.status === "target") targets.push(outcome.chartGroup)
    else settled.push(outcome.result)
  }
  return { targets, settled }
}

async function checkTarget(gitlab: GitlabClient, chartGroup: ChartGroup): Promise<TargetOutcome> {
  const logContext = chartLogContext(chartGroup)

  if (chartGroup.apps.length === 0) {
    logger.info({ ...logContext, result: "SKIPPED", reason: "no_apps" })
    return { status: "settled", result: "SKIPPED" }
  }

  try {
    if (await openMergeRequestExists(gitlab, chartGroup.chart.projectId, UPDATE_BRANCH)) {
      logger.info({ ...logContext, result: "SKIPPED", reason: "mr_exists" })
      return { status: "settled", result: "SKIPPED" }
    }
    return { status: "target", chartGroup }
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
