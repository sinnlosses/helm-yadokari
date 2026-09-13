import { buildTagSourceKey } from "../../domain/tag-source.js"
import type {
  AppConfig,
  AppWithLatestTag,
  ConfigUnit,
  ConfigUnitUpdateResult,
  ConfigUnitUpdateTarget,
  LatestTagResolution,
  TagSourceKey,
} from "../../domain/types.js"
import type { PlatformAdapterWithCachedReads } from "../../lib/platform/cached-reads.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { left, partitionMap, right } from "../../utils/partition.js"
import { describeHelmBranchRefUpdates, describePlan } from "../shared/describe-plan.js"
import {
  type AppOutcome,
  type ConfigUnitLogContext,
  type StepOutcome,
  ok,
  settle,
  withHandling,
} from "../shared/step-outcome.js"
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
 * settled（ERROR）に含める（`buildPlan()` 参照）。最新タグの解決の失敗も同じ扱いになる。
 */
export async function buildPlans(
  adapter: PlatformAdapterWithCachedReads,
  targets: readonly ConfigUnit[],
  resolvedTags: ReadonlyMap<TagSourceKey, AppOutcome<LatestTagResolution>>,
  concurrencyLimit: number,
  dryRun: boolean,
): Promise<BuildPlansResult> {
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (configUnit) =>
    withHandling(adapter, configUnit, (logContext) =>
      buildPlan(adapter, resolvedTags, configUnit, dryRun, logContext),
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
  resolvedTags: ReadonlyMap<TagSourceKey, AppOutcome<LatestTagResolution>>,
  configUnit: ConfigUnit,
  dryRun: boolean,
  logContext: ConfigUnitLogContext,
): Promise<StepOutcome<ConfigUnitUpdateTarget>> {
  const appsWithLatestTag = lookUpLatestTags(configUnit.apps, resolvedTags)
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

/**
 * `resolveTags()`が解決済みの最新タグから、この設定ユニットのappぶんを引き当てる。
 * 解決は設定ユニットをまたいで一意化されているため、1つのappの失敗はそのappを含む
 * すべての設定ユニットのERRORになる。
 */
function lookUpLatestTags(
  apps: readonly AppConfig[],
  resolvedTags: ReadonlyMap<TagSourceKey, AppOutcome<LatestTagResolution>>,
): readonly AppWithLatestTag[] {
  return apps.map((app) => {
    const resolved = resolvedTags.get(buildTagSourceKey(app))
    if (resolved === undefined) {
      throw new Error(`アプリ "${app.projectName}" の最新タグが解決されていません`)
    }
    // 値として持ち回ってきた例外をここで投げ直し、ERROR判定と記録を既存の`withHandling()`に任せる
    if (resolved.status === "failed") throw resolved.error
    return { app, latestTag: resolved.value }
  })
}
