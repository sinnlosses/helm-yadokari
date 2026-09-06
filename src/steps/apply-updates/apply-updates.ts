import {
  type GitlabClient,
  commitFileUpdates,
  createMergeRequest,
  getProjectWebUrls,
} from "../../lib/gitlab/gitlab.js"
import type { ChartUpdateResult, ChartUpdateTarget } from "../../types/types.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { buildFeatureBranch } from "../shared/feature-branch.js"
import { type StepOutcome, describePlan, ok, runSettled } from "../shared/step-outcome.js"
import { buildMrContent } from "./sub-steps/build-mr-content.js"

/**
 * 更新計画があるchartAndAppsに対して、固定ブランチへのコミットとMR作成を並列実行する。
 */
export async function applyUpdates(
  gitlab: GitlabClient,
  targets: readonly ChartUpdateTarget[],
  concurrencyLimit: number,
): Promise<ChartUpdateResult[]> {
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (target) =>
    applyUpdate(gitlab, target),
  )
  return outcomes.map((outcome) => (outcome.status === "ok" ? outcome.value : outcome.result))
}

/**
 * 1つのchartAndAppsにコミットとMR作成を適用する（このstepの並列処理1件分）。
 */
async function applyUpdate(
  gitlab: GitlabClient,
  target: ChartUpdateTarget,
): Promise<StepOutcome<ChartUpdateResult>> {
  const { chartAndApps, plans, files } = target
  const { chart, tenantId, clientId } = chartAndApps
  const featureBranch = buildFeatureBranch(tenantId, clientId)

  return runSettled(chartAndApps, async (logContext) => {
    // MRタイトルをコミットメッセージにもそのまま使い回す
    const { title, description } = await buildMrContent(tenantId, clientId, plans, (projectIds) =>
      getProjectWebUrls(gitlab, projectIds),
    )

    await commitFileUpdates(
      gitlab,
      chart.projectId,
      featureBranch,
      chart.mrTargetBranch,
      title,
      files,
    )
    await createMergeRequest(
      gitlab,
      chart.projectId,
      featureBranch,
      chart.mrTargetBranch,
      title,
      description,
    )
    logger.info({ ...logContext, result: "CREATED", apps: plans.map(describePlan) })
    return ok<ChartUpdateResult>("CREATED")
  })
}
