import type { GitlabBatchCache } from "../../lib/gitlab/batch-cache.js"
import type { GitlabClient } from "../../lib/gitlab/gitlab.js"
import type {
  ConfigUnit,
  ConfigUnitUpdateResult,
  ConfigUnitUpdateTarget,
} from "../../types/types.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { left, partitionMap, right } from "../../utils/partition.js"
import { describeHelmTargetBranchUpdates, describePlan } from "../shared/describe-plan.js"
import {
  type ConfigUnitLogContext,
  type StepOutcome,
  ok,
  settle,
  withHandling,
} from "../shared/step-outcome.js"
import { type ResolveLatestTags, createResolveLatestTags } from "./sub-steps/resolve-latest-tags.js"
import { type ValuesYamlSource, toFileUpdates } from "./sub-steps/shared/values-yaml-draft.js"
import { stageHelmTargetBranchUpdates } from "./sub-steps/stage-helm-target-branch-updates.js"
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
  gitlab: GitlabClient,
  gitlabCache: GitlabBatchCache,
  targets: readonly ConfigUnit[],
  concurrencyLimit: number,
  dryRun: boolean,
): Promise<BuildPlansResult> {
  const resolveLatestTags = createResolveLatestTags(gitlab, dryRun)

  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (configUnit) =>
    withHandling(configUnit, (logContext) =>
      buildPlan(gitlabCache, resolveLatestTags, configUnit, dryRun, logContext),
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
  gitlabCache: GitlabBatchCache,
  resolveLatestTags: ResolveLatestTags,
  configUnit: ConfigUnit,
  dryRun: boolean,
  logContext: ConfigUnitLogContext,
): Promise<StepOutcome<ConfigUnitUpdateTarget>> {
  const valuesYamlSource: ValuesYamlSource = { gitlabCache, chart: configUnit.chartRepo }

  const appsWithLatestTag = await resolveLatestTags(configUnit.apps)
  const { plans, draft: draftAfterApps } = await stageImageTagUpdates(
    valuesYamlSource,
    appsWithLatestTag,
  )
  const { draft, updates: helmTargetBranchUpdates } = await stageHelmTargetBranchUpdates(
    valuesYamlSource,
    configUnit.helmTargetBranch,
    draftAfterApps,
  )

  if (plans.length === 0 && helmTargetBranchUpdates.length === 0) {
    logger.info({ ...logContext, result: "SKIPPED", reason: "no_diff" })
    return settle("SKIPPED")
  }
  if (dryRun) {
    logger.info({
      ...logContext,
      result: "SKIPPED",
      reason: "dry_run",
      apps: plans.map(describePlan),
      helmTargetBranchUpdates: describeHelmTargetBranchUpdates(helmTargetBranchUpdates),
    })
    return settle("SKIPPED")
  }
  return ok({ configUnit, plans, helmTargetBranchUpdates, files: toFileUpdates(draft) })
}
