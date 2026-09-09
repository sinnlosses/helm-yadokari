import { loadConfig } from "./lib/config/config.js"
import type { EnvConfig } from "./lib/env.js"
import { createGitlabBatchCache } from "./lib/gitlab/batch-cache.js"
import { createClient } from "./lib/gitlab/gitlab.js"
import { applyUpdates } from "./steps/apply-updates/apply-updates.js"
import { buildPlans } from "./steps/build-plans/build-plans.js"
import { filterTargets } from "./steps/filter-targets/filter-targets.js"
import type { ChartUpdateResult, RunResult } from "./types/types.js"
import { logger } from "./utils/logger.js"
import { timed } from "./utils/timer.js"

export async function run(env: EnvConfig): Promise<RunResult> {
  logger.info({
    event: "run_start",
    gitlabUrl: env.gitlabUrl,
    dryRun: env.dryRun,
    concurrencyLimit: env.concurrencyLimit,
    configDirPath: env.configDirPath,
    targetChart: env.targetChart,
    targetUnits: env.targetUnits,
  })
  const { value: resultCounts, durationMs } = await timed(() => runProcess(env))
  logger.info({ event: "summary", ...resultCounts })
  logger.info({ event: "run_end", durationMs })
  return resultCounts.ERROR === 0 ? "SUCCESS" : "PARTIAL_FAILURE"
}

/**
 * config/ を読み込み、以下のステップを順に呼び出して全chartリポジトリを更新する。
 * dryRun のときはブランチ作成・MR作成をせず、更新予定の内容のみログ出力する。
 * targetChart / targetUnits が設定されている場合は、該当するchart・設定ユニットのみに
 * 絞り込んで実行する。
 *
 * 1. filterTargets: 登録アプリが0件、または既にオープン中のMRがあるchartAndAppsを除外する
 * 2. buildPlans: 残ったchartAndAppsそれぞれの更新計画（差分）を構築する
 * 3. applyUpdates: 差分があるchartAndAppsに対してコミット・MR作成を行う
 */
async function runProcess(env: EnvConfig): Promise<Record<ChartUpdateResult, number>> {
  const gitlab = createClient(env.gitlabUrl, env.accessToken)
  const gitlabCache = createGitlabBatchCache(gitlab)
  const { chartAndAppsList } = loadConfig(env.configDirPath, {
    chartDirName: env.targetChart,
    units: env.targetUnits,
  })

  const { targets, settled: filtered } = await filterTargets(
    gitlab,
    chartAndAppsList,
    env.concurrencyLimit,
  )
  const { toApply, settled: planned } = await buildPlans(
    gitlab,
    gitlabCache,
    targets,
    env.concurrencyLimit,
    env.dryRun,
  )
  const applied = await applyUpdates(gitlab, gitlabCache, toApply, env.concurrencyLimit)

  return summarizeResults([...filtered, ...planned, ...applied])
}

function summarizeResults(
  results: readonly ChartUpdateResult[],
): Record<ChartUpdateResult, number> {
  return results.reduce<Record<ChartUpdateResult, number>>(
    (counts, result) => ({ ...counts, [result]: counts[result] + 1 }),
    { CREATED: 0, SKIPPED: 0, ERROR: 0 },
  )
}
