import { loadConfig } from "./lib/config/config.js"
import type { EnvConfig } from "./lib/env.js"
import { createGithubAdapter } from "./lib/github/adapter.js"
import { createClient as createGithubClient } from "./lib/github/github.js"
import { createGitlabAdapter } from "./lib/gitlab/adapter.js"
import { createClient as createGitlabClient } from "./lib/gitlab/gitlab.js"
import type { PlatformAdapter } from "./lib/platform/adapter.js"
import { createPlatformBatchCache } from "./lib/platform/batch-cache.js"
import { applyUpdates } from "./steps/apply-updates/apply-updates.js"
import { buildPlans } from "./steps/build-plans/build-plans.js"
import { filterTargets } from "./steps/filter-targets/filter-targets.js"
import type { ConfigUnitUpdateResult, RunResult } from "./types/types.js"
import { logger } from "./utils/logger.js"
import { timed } from "./utils/timer.js"

export async function run(env: EnvConfig): Promise<RunResult> {
  logger.info({
    event: "run_start",
    // フィールド名はEnvConfig.platformUrlに揃える。README.md「実行ログの例」もこの名前で示す
    platformUrl: env.platformUrl,
    dryRun: env.dryRun,
    concurrencyLimit: env.concurrencyLimit,
    configRootPath: env.configRootPath,
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
 * 1. filterTargets: 登録アプリが0件、または既にオープン中のMRがある設定ユニットを除外する
 * 2. buildPlans: 残った設定ユニットそれぞれの更新計画（差分）を構築する
 * 3. applyUpdates: 差分がある設定ユニットに対してコミット・MR作成を行う
 */
async function runProcess(env: EnvConfig): Promise<Record<ConfigUnitUpdateResult, number>> {
  const adapter = createPlatform(env)
  const platformCache = createPlatformBatchCache(adapter)
  const { configUnits } = loadConfig(env.configRootPath, {
    chartDirName: env.targetChart,
    units: env.targetUnits,
  })

  const { targets, settled: filtered } = await filterTargets(
    adapter,
    configUnits,
    env.concurrencyLimit,
  )
  const { toApply, settled: planned } = await buildPlans(
    adapter,
    platformCache,
    targets,
    env.concurrencyLimit,
    env.dryRun,
  )
  const applied = await applyUpdates(adapter, platformCache, toApply, env.concurrencyLimit)

  return summarizeResults([...filtered, ...planned, ...applied])
}

/** `env.platform`（1回の実行でGitLab/GitHubを混在させない選択）に応じてPlatformAdapterを組み立てる */
function createPlatform(env: EnvConfig): PlatformAdapter {
  return env.platform === "github"
    ? createGithubAdapter(createGithubClient(env.platformUrl, env.accessToken))
    : createGitlabAdapter(createGitlabClient(env.platformUrl, env.accessToken))
}

function summarizeResults(
  results: readonly ConfigUnitUpdateResult[],
): Record<ConfigUnitUpdateResult, number> {
  return results.reduce<Record<ConfigUnitUpdateResult, number>>(
    (counts, result) => ({ ...counts, [result]: counts[result] + 1 }),
    { CREATED: 0, SKIPPED: 0, ERROR: 0 },
  )
}
