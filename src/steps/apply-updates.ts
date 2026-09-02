import { type GitlabClient, commitFileUpdates, createMergeRequest } from "../lib/gitlab.js"
import type { ChartUpdateResult } from "../types.js"
import { FatalError } from "../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../utils/http.js"
import { logger } from "../utils/logger.js"
import { mapWithConcurrency } from "../utils/parallel.js"
import type { ChartUpdateTarget } from "./build-plans.js"
import { UPDATE_BRANCH } from "./constants.js"
import { chartLogContext } from "./log-context.js"
import { buildDescription, buildTitle, describePlan } from "./mr-content.js"

/**
 * 更新計画があるchartグループに対して、固定ブランチへのコミットとMR作成を並列実行する。
 */
export async function applyUpdates(
  gitlab: GitlabClient,
  targets: readonly ChartUpdateTarget[],
  concurrencyLimit: number,
): Promise<ChartUpdateResult[]> {
  return mapWithConcurrency(targets, concurrencyLimit, (target) => applyUpdate(gitlab, target))
}

async function applyUpdate(
  gitlab: GitlabClient,
  { chartGroup, plans, files }: ChartUpdateTarget,
): Promise<ChartUpdateResult> {
  const logContext = chartLogContext(chartGroup)
  const { chart } = chartGroup

  try {
    const title = buildTitle(plans)
    await commitFileUpdates(
      gitlab,
      chart.projectId,
      UPDATE_BRANCH,
      chart.mrTargetBranch,
      title,
      files,
    )
    await createMergeRequest(
      gitlab,
      chart.projectId,
      UPDATE_BRANCH,
      chart.mrTargetBranch,
      title,
      await buildDescription(gitlab, plans),
    )
    logger.info({ ...logContext, result: "CREATED", apps: plans.map(describePlan) })
    return "CREATED"
  } catch (err) {
    if (isFatalError(err)) throw new FatalError(extractHttpStatus(err), err)
    logger.error({
      ...logContext,
      result: "ERROR",
      reason: `httpStatus: ${extractHttpStatus(err)}, message: ${toErrorMessage(err)}`,
    })
    return "ERROR"
  }
}
