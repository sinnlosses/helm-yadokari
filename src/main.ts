import { loadConfig } from "./lib/config.js"
import { ACCESS_TOKEN, CONCURRENCY_LIMIT, CONFIG_PATH, DRY_RUN, GITLAB_URL } from "./lib/env.js"
import { createClient } from "./lib/gitlab.js"
import { updateChartGroups } from "./steps/update-chart-groups.js"
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
  })
  const { value: resultCounts, duration_ms } = await timed(process)
  logger.info({ event: "summary", ...resultCounts })
  logger.info({ event: "run_end", duration_ms })
  return resultCounts.ERROR === 0 ? "SUCCESS" : "PARTIAL_FAILURE"
}

/**
 * 設定ファイルを読み込み、全chartリポジトリに対して更新要否判定とMR作成を並列実行する。
 * DRY_RUN=true のときはブランチ作成・MR作成をせず、更新予定の内容のみログ出力する。
 */
export async function process(): Promise<Record<ChartUpdateResult, number>> {
  const gitlab = createClient(GITLAB_URL, ACCESS_TOKEN)
  const { chartGroups } = loadConfig(CONFIG_PATH)
  const results = await updateChartGroups(gitlab, chartGroups, CONCURRENCY_LIMIT, DRY_RUN)
  return summarizeResults(results)
}

function summarizeResults(
  results: readonly ChartUpdateResult[],
): Record<ChartUpdateResult, number> {
  return results.reduce<Record<ChartUpdateResult, number>>(
    (counts, result) => ({ ...counts, [result]: counts[result] + 1 }),
    { CREATED: 0, SKIPPED: 0, ERROR: 0 },
  )
}
