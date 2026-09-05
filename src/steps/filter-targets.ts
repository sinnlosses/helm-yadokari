import {
  type GitlabClient,
  buildUpdateBranch,
  openMergeRequestExists,
} from "../lib/gitlab/gitlab.js"
import type { ChartAndApps, ChartUpdateResult } from "../types.js"
import { FatalError } from "../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../utils/http.js"
import { logger } from "../utils/logger.js"
import { mapWithConcurrency } from "../utils/parallel.js"

export type FilterTargetsResult = {
  readonly targets: ChartAndApps[]
  readonly settled: ChartUpdateResult[]
}

type TargetOutcome =
  | { readonly status: "target"; readonly chartAndApps: ChartAndApps }
  | { readonly status: "settled"; readonly result: ChartUpdateResult }

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
    alreadyMrExists(gitlab, chartAndApps),
  )

  return outcomes.reduce<FilterTargetsResult>(
    (acc, outcome) =>
      outcome.status === "target"
        ? { ...acc, targets: [...acc.targets, outcome.chartAndApps] }
        : { ...acc, settled: [...acc.settled, outcome.result] },
    { targets: [], settled: [] },
  )
}

async function alreadyMrExists(
  gitlab: GitlabClient,
  chartAndApps: ChartAndApps,
): Promise<TargetOutcome> {
  const logContext = {
    event: "update_chart",
    chartDir: chartAndApps.chartDir,
    tenantId: chartAndApps.tenantId,
    clientId: chartAndApps.clientId,
    chartProjectId: chartAndApps.chart.projectId,
    chartProjectName: chartAndApps.chart.projectName,
  }

  if (chartAndApps.apps.length === 0) {
    logger.info({ ...logContext, result: "SKIPPED", reason: "no_apps" })
    return { status: "settled", result: "SKIPPED" }
  }

  try {
    const branch = buildUpdateBranch(chartAndApps.tenantId, chartAndApps.clientId)
    if (await openMergeRequestExists(gitlab, chartAndApps.chart.projectId, branch)) {
      logger.info({ ...logContext, result: "SKIPPED", reason: "mr_exists" })
      return { status: "settled", result: "SKIPPED" }
    }
    return { status: "target", chartAndApps }
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
