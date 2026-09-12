import { buildFeatureBranch } from "../../domain/feature-branch.js"
import type { PlatformAdapter } from "../../lib/platform/adapter.js"
import type { ConfigUnit, ConfigUnitUpdateResult } from "../../types/types.js"
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
  readonly settled: readonly ConfigUnitUpdateResult[]
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
    outcome.status === "ok" ? right(outcome.value) : left(outcome.result),
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
    logger.info({ ...logContext, result: "SKIPPED", reason: "no_apps" })
    return settle("SKIPPED")
  }

  const branch = buildFeatureBranch(configUnit.unitPath)
  if (await adapter.openMergeRequestExists(configUnit.chartRepo.projectId, branch)) {
    logger.info({ ...logContext, result: "SKIPPED", reason: "mr_exists" })
    return settle("SKIPPED")
  }
  return ok(configUnit)
}
