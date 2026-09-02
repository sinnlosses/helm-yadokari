import pLimit from "p-limit"

import { updateChartGroupIfNeeded } from "./lib/chart-update.js"
import { loadConfig } from "./lib/config.js"
import { ACCESS_TOKEN, CONCURRENCY_LIMIT, CONFIG_PATH, DRY_RUN, GITLAB_URL } from "./lib/env.js"
import { createClient } from "./lib/gitlab.js"
import type { ChartUpdateResult, RunResult } from "./types.js"
import { FatalError } from "./utils/errors.js"
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

  const limit = pLimit(CONCURRENCY_LIMIT)
  const tasks = chartGroups.map((chartGroup) =>
    limit(async () => {
      try {
        return await updateChartGroupIfNeeded(gitlab, chartGroup, DRY_RUN)
      } catch (err) {
        // FatalError を検出した瞬間にキューをクリアし、後続タスクが開始されるのを防ぐ。
        if (err instanceof FatalError) limit.clearQueue()
        throw err
      }
    }),
  )

  const results = await Promise.all(tasks)

  return results.reduce<Record<ChartUpdateResult, number>>(
    (counts, result) => ({ ...counts, [result]: counts[result] + 1 }),
    { CREATED: 0, SKIPPED: 0, ERROR: 0 },
  )
}
