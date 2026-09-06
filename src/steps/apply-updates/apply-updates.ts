import {
  type GitlabClient,
  commitFileUpdates,
  createMergeRequest,
  getProjectWebUrl,
} from "../../lib/gitlab/gitlab.js"
import { buildMrDescription, buildMrTitle, buildUpdateBranch } from "../../lib/gitlab/mr-content.js"
import type { ChartUpdateResult, ChartUpdateTarget } from "../../types/types.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { buildLogContext, describePlan, settleAsError } from "../shared/step-outcome.js"

/**
 * 更新計画があるchartAndAppsに対して、固定ブランチへのコミットとMR作成を並列実行する。
 */
export async function applyUpdates(
  gitlab: GitlabClient,
  targets: readonly ChartUpdateTarget[],
  concurrencyLimit: number,
): Promise<ChartUpdateResult[]> {
  return mapWithConcurrency(targets, concurrencyLimit, (target) => applyUpdate(gitlab, target))
}

/**
 * 1つのchartAndAppsにコミットとMR作成を適用する（このstepの並列処理1件分）。
 */
async function applyUpdate(
  gitlab: GitlabClient,
  { chartAndApps, plans, files }: ChartUpdateTarget,
): Promise<ChartUpdateResult> {
  const logContext = buildLogContext(chartAndApps)
  const { chart, tenantId, clientId } = chartAndApps
  const updateBranch = buildUpdateBranch(tenantId, clientId)

  try {
    // MRタイトルをコミットメッセージにもそのまま使い回す
    const mrTitle = buildMrTitle(tenantId, clientId, plans)
    await commitFileUpdates(
      gitlab,
      chart.projectId,
      updateBranch,
      chart.mrTargetBranch,
      mrTitle,
      files,
    )
    await createMergeRequest(
      gitlab,
      chart.projectId,
      updateBranch,
      chart.mrTargetBranch,
      mrTitle,
      await buildMrDescription((projectId) => getProjectWebUrl(gitlab, projectId), plans),
    )
    logger.info({ ...logContext, result: "CREATED", apps: plans.map(describePlan) })
    return "CREATED"
  } catch (err) {
    return settleAsError(err, logContext)
  }
}
