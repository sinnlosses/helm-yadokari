import { buildFeatureBranch } from "../../domain/feature-branch.js"
import type { ConfigUnit, ConfigUnitReport, ConfigUnitUpdateOutcome } from "../../domain/types.js"
import type { PlatformAdapter } from "../../lib/platform/adapter.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { left, partitionMap, right } from "../../utils/partition.js"
import {
  type ConfigUnitLogContext,
  type StepOutcome,
  ok,
  settle,
  withHandling,
} from "../shared/step-outcome.js"

export type FilterTargetsResult = {
  readonly targets: readonly ConfigUnit[]
  readonly settled: readonly ConfigUnitReport[]
}

/**
 * 登録アプリが0件、または固定ブランチにオープン中のMRが既にある設定ユニットを除外する。
 * 除外された設定ユニットの判定結果（SKIPPED/ERROR）は settled にまとめて返す。
 */
export async function filterTargets(
  adapter: PlatformAdapter,
  configUnits: readonly ConfigUnit[],
  concurrencyLimit: number,
): Promise<FilterTargetsResult> {
  const outcomes = await mapWithConcurrency(configUnits, concurrencyLimit, (configUnit) =>
    withHandling(adapter, configUnit, (logContext) =>
      evaluateTarget(adapter, configUnit, logContext),
    ),
  )

  const { left: settled, right: targets } = partitionMap(outcomes, (outcome) =>
    outcome.status === "ok" ? right(outcome.value) : left(outcome.report),
  )
  return { targets, settled }
}

/**
 * 1つの設定ユニットが処理対象か判定する（このstepの並列処理1件分）。登録アプリが0件、
 * または固定ブランチにオープン中のMRがある場合はSKIPPED。
 */
async function evaluateTarget(
  adapter: PlatformAdapter,
  configUnit: ConfigUnit,
  logContext: ConfigUnitLogContext,
): Promise<StepOutcome<ConfigUnit>> {
  if (configUnit.apps.length === 0) {
    const outcome: ConfigUnitUpdateOutcome = { result: "SKIPPED", reason: "no_apps" }
    logger.info({ ...logContext, ...outcome })
    return settle(logContext, outcome)
  }

  const branch = buildFeatureBranch(configUnit.unitPath)
  if (await adapter.openMergeRequestExists(configUnit.chartRepo.projectId, branch)) {
    const outcome: ConfigUnitUpdateOutcome = { result: "SKIPPED", reason: "mr_exists" }
    logger.info({ ...logContext, ...outcome })
    return settle(logContext, outcome)
  }
  return ok(configUnit)
}
