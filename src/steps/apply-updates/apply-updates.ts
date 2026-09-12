import { buildFeatureBranch } from "../../domain/feature-branch.js"
import type { PlatformBatchCache } from "../../lib/platform/batch-cache.js"
import type { Platform } from "../../lib/platform/platform.js"
import type { ConfigUnitUpdateResult, ConfigUnitUpdateTarget } from "../../types/types.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { describeHelmBranchRefUpdates, describePlan } from "../shared/describe-plan.js"
import {
  type ConfigUnitLogContext,
  type StepOutcome,
  ok,
  withHandling,
} from "../shared/step-outcome.js"
import { buildMrContent } from "./sub-steps/build-mr-content.js"
import { collectMrEntries } from "./sub-steps/collect-mr-entries.js"
import { submitMergeRequest } from "./sub-steps/submit-merge-request.js"

/**
 * 更新計画がある設定ユニットに対して、固定ブランチへのコミットとMR作成を並列実行する。
 */
export async function applyUpdates(
  platform: Platform,
  platformCache: PlatformBatchCache,
  targets: readonly ConfigUnitUpdateTarget[],
  concurrencyLimit: number,
): Promise<readonly ConfigUnitUpdateResult[]> {
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (target) =>
    withHandling(platform, target.configUnit, (logContext) =>
      applyUpdate(platform, platformCache, target, logContext),
    ),
  )
  return outcomes.map((outcome) => (outcome.status === "ok" ? outcome.value : outcome.result))
}

/**
 * 1つの設定ユニットにコミットとMR作成を適用する。
 */
async function applyUpdate(
  platform: Platform,
  platformCache: PlatformBatchCache,
  target: ConfigUnitUpdateTarget,
  logContext: ConfigUnitLogContext,
): Promise<StepOutcome<ConfigUnitUpdateResult>> {
  const { configUnit, plans, helmBranchRefUpdates, files } = target
  const { chartRepo, unitPath } = configUnit
  const featureBranch = buildFeatureBranch(unitPath)

  const entries = await collectMrEntries(
    platform,
    platformCache,
    plans,
    helmBranchRefUpdates,
    configUnit.helm.branchRef,
  )
  const content = buildMrContent(platform, unitPath, entries)
  await submitMergeRequest(platform, chartRepo, featureBranch, content, files)

  logger.info({
    ...logContext,
    result: "CREATED",
    apps: plans.map(describePlan),
    helmBranchRefUpdates: describeHelmBranchRefUpdates(
      helmBranchRefUpdates,
      configUnit.helm.branchRef,
    ),
  })
  return ok<ConfigUnitUpdateResult>("CREATED")
}
