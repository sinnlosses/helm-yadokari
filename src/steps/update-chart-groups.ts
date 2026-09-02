import pLimit from "p-limit"

import type { GitlabClient } from "../lib/gitlab.js"
import type { ChartGroup, ChartUpdateResult } from "../types.js"
import { FatalError } from "../utils/errors.js"
import { updateChartGroupIfNeeded } from "./chart-update.js"

/**
 * 登録された全chartリポジトリを、concurrencyLimit で同時実行数を制御しながら並列処理する。
 * FatalError を検出した時点でキューをクリアし、後続タスクの開始を防いだ上でそのまま reject する。
 */
export async function updateChartGroups(
  gitlab: GitlabClient,
  chartGroups: readonly ChartGroup[],
  concurrencyLimit: number,
  dryRun: boolean,
): Promise<ChartUpdateResult[]> {
  const limit = pLimit(concurrencyLimit)
  const tasks = chartGroups.map((chartGroup) =>
    limit(async () => {
      try {
        return await updateChartGroupIfNeeded(gitlab, chartGroup, dryRun)
      } catch (err) {
        // FatalError を検出した瞬間にキューをクリアし、後続タスクが開始されるのを防ぐ。
        if (err instanceof FatalError) limit.clearQueue()
        throw err
      }
    }),
  )

  return Promise.all(tasks)
}
