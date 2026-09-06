import {
  type GitlabClient,
  commitFileUpdates,
  createMergeRequest,
} from "../../lib/gitlab/gitlab.js"
import type { ChartUpdateResult, ChartUpdateTarget } from "../../types/types.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { buildFeatureBranch } from "../shared/feature-branch.js"
import { type StepOutcome, describePlan, ok, withHandling } from "../shared/step-outcome.js"
import { buildMrContent } from "./sub-steps/build-mr-content.js"
import { collectMrEntries } from "./sub-steps/collect-mr-entries.js"

/**
 * 更新計画があるchartAndAppsに対して、固定ブランチへのコミットとMR作成を並列実行する。
 */
export async function applyUpdates(
  gitlab: GitlabClient,
  targets: readonly ChartUpdateTarget[],
  concurrencyLimit: number,
): Promise<readonly ChartUpdateResult[]> {
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (target) =>
    withHandling(target.chartAndApps, (logContext) => applyUpdate(gitlab, target, logContext)),
  )
  return outcomes.map((outcome) => (outcome.status === "ok" ? outcome.value : outcome.result))
}

/**
 * 1つのchartAndAppsにコミットとMR作成を適用する（このstepの並列処理1件分）。
 */
async function applyUpdate(
  gitlab: GitlabClient,
  target: ChartUpdateTarget,
  logContext: Record<string, unknown>,
): Promise<StepOutcome<ChartUpdateResult>> {
  const { chartAndApps, plans, files } = target
  const { chart, tenantId, clientId } = chartAndApps
  const featureBranch = buildFeatureBranch(tenantId, clientId)

  const entries = await collectMrEntries(gitlab, plans)
  // MRタイトルをコミットメッセージにもそのまま使い回す
  const { title, description } = buildMrContent(tenantId, clientId, entries)

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
}
