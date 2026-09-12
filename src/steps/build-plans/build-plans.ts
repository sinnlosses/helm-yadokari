import type { PlatformAdapterWithCachedReads } from "../../lib/platform/cached-reads.js"
import type {
  ConfigUnit,
  ConfigUnitUpdateResult,
  ConfigUnitUpdateTarget,
} from "../../types/types.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { left, partitionMap, right } from "../../utils/partition.js"
import { describeHelmBranchRefUpdates, describePlan } from "../shared/describe-plan.js"
import {
  type ConfigUnitLogContext,
  type StepOutcome,
  ok,
  settle,
  withHandling,
} from "../shared/step-outcome.js"
import { type ResolveLatestTags, createResolveLatestTags } from "./sub-steps/resolve-latest-tags.js"
import { toFileUpdates } from "./sub-steps/shared/values-yaml-draft.js"
import { stageHelmBranchRefUpdates } from "./sub-steps/stage-helm-branch-ref-updates.js"
import { stageImageTagUpdates } from "./sub-steps/stage-image-tag-updates.js"

export type BuildPlansResult = {
  readonly toApply: readonly ConfigUnitUpdateTarget[]
  readonly settled: readonly ConfigUnitUpdateResult[]
}

/**
 * 各設定ユニットの更新計画を並列に構築する。差分がないもの・dryRunのものは
 * settled（SKIPPED）に、実際に適用が必要なものは toApply にまとめて返す。
 *
 * いずれか1つのアプリの処理が失敗した場合、その設定ユニット全体をオールオアナッシングで
 * settled（ERROR）に含める（`buildPlan()` 参照）。
 */
export async function buildPlans(
  adapter: PlatformAdapterWithCachedReads,
  targets: readonly ConfigUnit[],
  concurrencyLimit: number,
  dryRun: boolean,
): Promise<BuildPlansResult> {
  const resolveLatestTags = createResolveLatestTags(adapter, dryRun)

  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (configUnit) =>
    withHandling(adapter, configUnit, (logContext) =>
      buildPlan(adapter, resolveLatestTags, configUnit, dryRun, logContext),
    ),
  )

  const { left: settled, right: toApply } = partitionMap(outcomes, (outcome) =>
    outcome.status === "ok" ? right(outcome.value) : left(outcome.result),
  )
  return { toApply, settled }
}

/**
 * 1つの設定ユニットの更新計画を組み立て、結果を振り分ける（このstepの並列処理1件分）。
 *
 * 向き先ブランチは設定ユニット内のapps全体で共通なので、全アプリのイメージタグを積んだ後の
 * 下書きに重ねる。こうすることで同じvalues.yamlへの書き換えが失われない。
 */
async function buildPlan(
  adapter: PlatformAdapterWithCachedReads,
  resolveLatestTags: ResolveLatestTags,
  configUnit: ConfigUnit,
  dryRun: boolean,
  logContext: ConfigUnitLogContext,
): Promise<StepOutcome<ConfigUnitUpdateTarget>> {
  const appsWithLatestTag = await resolveLatestTags(configUnit.apps)
  const { plans, draft: draftAfterApps } = await stageImageTagUpdates(
    adapter,
    configUnit.chartRepo,
    appsWithLatestTag,
  )
  const { draft, updates: helmBranchRefUpdates } = await stageHelmBranchRefUpdates(
    adapter,
    configUnit.chartRepo,
    configUnit.helm,
    draftAfterApps,
  )

  if (plans.length === 0 && helmBranchRefUpdates.length === 0) {
    logger.info({ ...logContext, result: "SKIPPED", reason: "no_diff" })
    return settle("SKIPPED")
  }
  if (dryRun) {
    logger.info({
      ...logContext,
      result: "SKIPPED",
      reason: "dry_run",
      apps: plans.map(describePlan),
      helmBranchRefUpdates: describeHelmBranchRefUpdates(
        helmBranchRefUpdates,
        configUnit.helm.branchRef,
      ),
    })
    return settle("SKIPPED")
  }
  return ok({ configUnit, plans, helmBranchRefUpdates, files: toFileUpdates(draft) })
}
