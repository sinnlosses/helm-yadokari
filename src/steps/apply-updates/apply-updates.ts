import { buildFeatureBranch } from "../../domain/feature-branch.js"
import type { GitlabBatchCache } from "../../lib/gitlab/batch-cache.js"
import type { GitlabClient } from "../../lib/gitlab/gitlab.js"
import type { ChartUpdateResult, ChartUpdateTarget } from "../../types/types.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { describeHelmTargetBranchUpdates, describePlan } from "../shared/describe-plan.js"
import { type StepOutcome, ok, withHandling } from "../shared/step-outcome.js"
import { buildMrContent } from "./sub-steps/build-mr-content.js"
import { collectMrEntries } from "./sub-steps/collect-mr-entries.js"
import { submitMergeRequest } from "./sub-steps/submit-merge-request.js"

/**
 * 更新計画があるchartAndAppsに対して、固定ブランチへのコミットとMR作成を並列実行する。
 */
export async function applyUpdates(
  gitlab: GitlabClient,
  gitlabCache: GitlabBatchCache,
  targets: readonly ChartUpdateTarget[],
  concurrencyLimit: number,
): Promise<readonly ChartUpdateResult[]> {
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (target) =>
    withHandling(target.chartAndApps, (logContext) =>
      applyUpdate(gitlab, gitlabCache, target, logContext),
    ),
  )
  return outcomes.map((outcome) => (outcome.status === "ok" ? outcome.value : outcome.result))
}

/**
 * 1つのchartAndAppsにコミットとMR作成を適用する。
 */
async function applyUpdate(
  gitlab: GitlabClient,
  gitlabCache: GitlabBatchCache,
  target: ChartUpdateTarget,
  logContext: Record<string, unknown>,
): Promise<StepOutcome<ChartUpdateResult>> {
  const { chartAndApps, plans, helmTargetBranchUpdates, files } = target
  const { chart, unitPath } = chartAndApps
  const featureBranch = buildFeatureBranch(unitPath)

  const entries = await collectMrEntries(gitlabCache, plans, helmTargetBranchUpdates)
  const content = buildMrContent(unitPath, entries)
  await submitMergeRequest(gitlab, chart, featureBranch, content, files)

  logger.info({
    ...logContext,
    result: "CREATED",
    apps: plans.map(describePlan),
    helmTargetBranchUpdates: describeHelmTargetBranchUpdates(helmTargetBranchUpdates),
  })
  return ok<ChartUpdateResult>("CREATED")
}
