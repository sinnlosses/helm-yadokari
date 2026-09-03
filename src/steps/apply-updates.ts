import {
  UPDATE_BRANCH,
  type GitlabClient,
  buildMrDescription,
  buildMrTitle,
  commitFileUpdates,
  createMergeRequest,
} from "../lib/gitlab/gitlab.js"
import type { AppUpdatePlan, ChartUpdateResult, ChartUpdateTarget } from "../types.js"
import { FatalError } from "../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../utils/http.js"
import { logger } from "../utils/logger.js"
import { mapWithConcurrency } from "../utils/parallel.js"

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

function describePlan(plan: AppUpdatePlan): Record<string, unknown> {
  return {
    projectName: plan.app.projectName,
    previousTag: plan.previousTag,
    latestTag: plan.latestTag.name,
  }
}

async function applyUpdate(
  gitlab: GitlabClient,
  { chartGroup, plans, files }: ChartUpdateTarget,
): Promise<ChartUpdateResult> {
  const logContext = {
    event: "update_chart",
    chartDir: chartGroup.chartDir,
    chartProjectId: chartGroup.chart.projectId,
    chartProjectName: chartGroup.chart.projectName,
  }
  const { chart } = chartGroup

  try {
    const mrTitle = buildMrTitle(plans)
    await commitFileUpdates(
      gitlab,
      chart.projectId,
      UPDATE_BRANCH,
      chart.mrTargetBranch,
      mrTitle,
      files,
    )
    await createMergeRequest(
      gitlab,
      chart.projectId,
      UPDATE_BRANCH,
      chart.mrTargetBranch,
      mrTitle,
      await buildMrDescription(gitlab, plans),
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
