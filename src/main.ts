import type {
  AccessToken,
  ConfigUnitReport,
  ConfigUnitUpdateResult,
  RunResult,
} from "./domain/types.js"
import { loadConfig } from "./lib/config/config.js"
import type { EnvConfig } from "./lib/env.js"
import { createGithubAdapter } from "./lib/github/adapter.js"
import { createClient as createGithubClient } from "./lib/github/github.js"
import { createGitlabAdapter } from "./lib/gitlab/adapter.js"
import { createClient as createGitlabClient } from "./lib/gitlab/gitlab.js"
import type { PlatformAdapter } from "./lib/platform/adapter.js"
import { withCachedReads } from "./lib/platform/cached-reads.js"
import { formatReport } from "./lib/report/format-report.js"
import { writeReport } from "./lib/report/write-report.js"
import { applyUpdates } from "./steps/apply-updates/apply-updates.js"
import { buildPlans } from "./steps/build-plans/build-plans.js"
import { filterTargets } from "./steps/filter-targets/filter-targets.js"
import { resolveTags } from "./steps/resolve-tags/resolve-tags.js"
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
  const { value: processed, durationMs } = await timed(() => runProcess(env))
  logger.info({ event: "summary", ...processed.counts })
  logger.info({ event: "run_end", durationMs })
  return processed.counts.ERROR === 0 ? "SUCCESS" : "PARTIAL_FAILURE"
}

/**
 * バッチ1回分の処理結果。`counts`は`summary`ログに出す設定ユニット単位の件数、`reports`は
 * 同じ結果を設定ユニット1件につき1レコードで並べたもの
 */
type RunProcessResult = {
  readonly counts: Record<ConfigUnitUpdateResult, number>
  readonly reports: readonly ConfigUnitReport[]
}

/**
 * `runPipeline()`を実行し、その所要時間込みでレポートをMarkdownに整形して
 * `env.reportOutputPath`へ書き出す。`runPipeline()`が`FatalError`を投げたときはこの関数も
 * reject するため書き出しには到達しない（fatalなバッチはレポートを残さないのが期待する挙動）。
 */
async function runProcess(env: EnvConfig): Promise<RunProcessResult> {
  const startedAt = new Date()
  const { value: result, durationMs } = await timed(() => runPipeline(env))
  writeReport(
    env.reportOutputPath,
    formatReport(
      { startedAt, durationMs, dryRun: env.dryRun, counts: result.counts },
      result.reports,
    ),
  )
  return result
}

/**
 * config/ を読み込み、以下のステップを順に呼び出して全chartリポジトリを更新する。
 * dryRun のときはブランチ作成・MR作成をせず、更新予定の内容のみログ出力する。
 * targetChart / targetUnits が設定されている場合は、該当するchart・設定ユニットのみに
 * 絞り込んで実行する。
 *
 * 1. filterTargets: 登録アプリが0件、または既にオープン中のMRがある設定ユニットを除外する
 * 2. resolveTags: 残った設定ユニットの全アプリの最新タグを、解決の単位ごとに1回だけ解決する
 * 3. buildPlans: 設定ユニットそれぞれの更新計画（差分）を構築する
 * 4. applyUpdates: 差分がある設定ユニットに対してコミット・MR作成を行う
 */
async function runPipeline(env: EnvConfig): Promise<RunProcessResult> {
  const adapter = withCachedReads(createPlatformAdapter(env))
  const { configUnits } = loadConfig(env.configRootPath, {
    chartDirName: env.targetChart,
    units: env.targetUnits,
  })

  const { targets, settled: filtered } = await filterTargets(
    adapter,
    configUnits,
    env.concurrencyLimit,
  )
  const resolvedTags = await resolveTags(adapter, targets, env.concurrencyLimit, env.dryRun)
  const { toApply, settled: planned } = await buildPlans(
    adapter,
    targets,
    resolvedTags,
    env.concurrencyLimit,
    env.dryRun,
  )
  const applied = await applyUpdates(adapter, toApply, env.concurrencyLimit)

  const reports = [...filtered, ...planned, ...applied]
  return { counts: summarizeResults(reports), reports }
}

/** `env.platform`（1回の実行でGitLab/GitHubを混在させない選択）に応じてPlatformAdapterを組み立てる */
function createPlatformAdapter(env: EnvConfig): PlatformAdapter {
  const accessToken = requireAccessToken(env)
  return env.platform === "github"
    ? createGithubAdapter(createGithubClient(env.platformUrl, accessToken))
    : createGitlabAdapter(createGitlabClient(env.platformUrl, accessToken))
}

/**
 * T-244（`accessTokenEnv`で宣言されたトークンへの振り分け）までの暫定処置。今はまだ
 * `createRoutedAdapter()`が無く常に既定の`ACCESS_TOKEN`だけを使うため、未設定なら
 * 従来どおり即座に例外を投げて終了する。
 */
function requireAccessToken(env: EnvConfig): AccessToken {
  if (env.accessToken === undefined) {
    throw new Error("ACCESS_TOKEN が未設定です")
  }
  return env.accessToken
}

function summarizeResults(
  reports: readonly ConfigUnitReport[],
): Record<ConfigUnitUpdateResult, number> {
  return reports.reduce<Record<ConfigUnitUpdateResult, number>>(
    (counts, { result }) => ({ ...counts, [result]: counts[result] + 1 }),
    { CREATED: 0, SKIPPED: 0, ERROR: 0 },
  )
}
