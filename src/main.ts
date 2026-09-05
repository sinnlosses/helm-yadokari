import { loadConfig } from "./lib/config.js"
import {
  ACCESS_TOKEN,
  CONCURRENCY_LIMIT,
  CONFIG_PATH,
  DRY_RUN,
  GITLAB_URL,
  TARGET_CHART_DIR,
  TARGET_CLIENT,
} from "./lib/env.js"
import { createClient } from "./lib/gitlab/gitlab.js"
import { applyUpdates } from "./steps/apply-updates.js"
import { buildPlans } from "./steps/build-plans.js"
import { filterTargets } from "./steps/filter-targets.js"
import type { ChartUpdateResult, RunResult } from "./types.js"
import { logger } from "./utils/logger.js"
import { timed } from "./utils/timer.js"

export async function run(): Promise<RunResult> {
  logger.info({
    event: "run_start",
    gitlabUrl: GITLAB_URL,
    dryRun: DRY_RUN,
    concurrencyLimit: CONCURRENCY_LIMIT,
    configPath: CONFIG_PATH,
    targetChartDir: TARGET_CHART_DIR,
    targetClient: TARGET_CLIENT,
  })
  const { value: resultCounts, duration_ms } = await timed(process)
  logger.info({ event: "summary", ...resultCounts })
  logger.info({ event: "run_end", duration_ms })
  return resultCounts.ERROR === 0 ? "SUCCESS" : "PARTIAL_FAILURE"
}

/**
 * config/ を読み込み、以下のステップを順に呼び出して全chartリポジトリを更新する。
 * DRY_RUN=true のときはブランチ作成・MR作成をせず、更新予定の内容のみログ出力する。
 * TARGET_CHART_DIR / TARGET_CLIENT が設定されている場合は、該当するchart/tenant/client
 * のみに絞り込んで実行する（`loadConfig`側の`target`絞り込み。指定した対象がconfig/配下に
 * 見つからない場合は`loadConfig`が例外をスローする）。
 *
 * 1. filterTargets: 登録アプリが0件、または既にオープン中のMRがあるchartAndAppsを除外する
 * 2. buildPlans: 残ったchartAndAppsそれぞれの更新計画（差分）を構築する
 * 3. applyUpdates: 差分があるchartAndAppsに対してコミット・MR作成を行う
 */
export async function process(): Promise<Record<ChartUpdateResult, number>> {
  const gitlab = createClient(GITLAB_URL, ACCESS_TOKEN)
  const { chartAndAppsList } = loadConfig(CONFIG_PATH, {
    chartDir: TARGET_CHART_DIR,
    clients: TARGET_CLIENT,
  })

  const { targets, settled: filtered } = await filterTargets(
    gitlab,
    chartAndAppsList,
    CONCURRENCY_LIMIT,
  )
  const { toApply, settled: planned } = await buildPlans(
    gitlab,
    targets,
    CONCURRENCY_LIMIT,
    DRY_RUN,
  )
  const applied = await applyUpdates(gitlab, toApply, CONCURRENCY_LIMIT)

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
