import { type GitlabClient, branchExists as branchExistsOnGitlab } from "../../lib/gitlab/gitlab.js"
import type {
  BranchName,
  ChartAndApps,
  ChartUpdateResult,
  ChartUpdateTarget,
  ProjectId,
  TagFormat,
} from "../../types/types.js"
import { getOrFetchShared } from "../../utils/cache.js"
import { logger } from "../../utils/logger.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { left, partitionMap, right } from "../../utils/partition.js"
import { describeHelmTargetBranchUpdates, describePlan } from "../shared/describe-plan.js"
import { type StepOutcome, ok, withHandling, settle } from "../shared/step-outcome.js"
import { resolveLatestTags } from "./sub-steps/resolve-latest-tags.js"
import { type ValuesYamlSource, toFileUpdates } from "./sub-steps/shared/values-yaml-draft.js"
import { stageHelmTargetBranchUpdates } from "./sub-steps/stage-helm-target-branch-updates.js"
import { stageImageTagUpdates } from "./sub-steps/stage-image-tag-updates.js"

export type BuildPlansResult = {
  readonly toApply: readonly ChartUpdateTarget[]
  readonly settled: readonly ChartUpdateResult[]
}

/** projectId+ブランチ名単位でブランチの実在確認をキャッシュする、バッチ全体で共有する関数 */
type CachedBranchExists = (projectId: ProjectId, branch: BranchName) => Promise<boolean>

/**
 * 各chartAndAppsの更新計画を並列に構築する。差分がないもの・dryRunのものは
 * settled（SKIPPED）に、実際に適用が必要なものは toApply にまとめて返す。
 *
 * いずれか1つのアプリの処理が失敗した場合、そのchartAndApps全体をオールオアナッシングで
 * settled（ERROR）に含める（`buildPlan()` 参照）。
 */
export async function buildPlans(
  gitlab: GitlabClient,
  targets: readonly ChartAndApps[],
  concurrencyLimit: number,
  dryRun: boolean,
  tagFormat: TagFormat,
): Promise<BuildPlansResult> {
  const branchExists = createCachedBranchExists(gitlab)

  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (chartAndApps) =>
    withHandling(chartAndApps, (logContext) =>
      buildPlan(gitlab, chartAndApps, dryRun, tagFormat, branchExists, logContext),
    ),
  )

  const { left: toApply, right: settled } = partitionMap(outcomes, (outcome) =>
    outcome.status === "ok" ? left(outcome.value) : right(outcome.result),
  )
  return { toApply, settled }
}

/**
 * 1つのchartAndAppsの更新計画を組み立て、結果を振り分ける（このstepの並列処理1件分）。
 * アプリ・書き込み先のループはいずれもサブステップの内側にあるため、ここはサブステップを
 * 順に呼んで下書き（`ValuesYamlDraft`）を受け渡すだけになっている。
 *
 * 向き先ブランチはclient内のapps全体で共通なので、全アプリのイメージタグを積んだ後の
 * 下書きに重ねる。こうすることで同じvalues.yamlへの書き換えが失われない。
 *
 * 差分があったアプリが1件も無ければSKIPPED、dryRunならMRを作らないのでこれもSKIPPEDとして
 * 振り分ける。
 */
async function buildPlan(
  gitlab: GitlabClient,
  chartAndApps: ChartAndApps,
  dryRun: boolean,
  tagFormat: TagFormat,
  branchExists: CachedBranchExists,
  logContext: Record<string, unknown>,
): Promise<StepOutcome<ChartUpdateTarget>> {
  const { chart } = chartAndApps
  const valuesYamlSource: ValuesYamlSource = { gitlab, chart }

  const appsWithLatestTag = await resolveLatestTags(gitlab, chartAndApps.apps, dryRun, tagFormat)
  const { plans, draft: draftAfterApps } = await stageImageTagUpdates(
    valuesYamlSource,
    appsWithLatestTag,
    new Map(),
  )
  const { draft, updates: helmTargetBranchUpdates } = chartAndApps.helmTargetBranch
    ? await stageHelmTargetBranchUpdates(
        valuesYamlSource,
        (branch) => branchExists(chart.projectId, branch),
        chartAndApps.helmTargetBranch,
        draftAfterApps,
      )
    : { draft: draftAfterApps, updates: [] }

  if (plans.length === 0 && helmTargetBranchUpdates.length === 0) {
    logger.info({ ...logContext, result: "SKIPPED", reason: "no_diff" })
    return settle("SKIPPED")
  }
  if (dryRun) {
    logger.info({
      ...logContext,
      result: "SKIPPED",
      reason: "dry_run",
      apps: plans.map(describePlan),
      helmTargetBranchUpdates: describeHelmTargetBranchUpdates(helmTargetBranchUpdates),
    })
    return settle("SKIPPED")
  }
  return ok({ chartAndApps, plans, helmTargetBranchUpdates, files: toFileUpdates(draft) })
}

/**
 * ブランチの実在確認をprojectId+ブランチ名単位でバッチ全体を通してキャッシュする。同じ
 * chartディレクトリ配下の複数tenant/client（＝複数chartAndApps）が同じchart.projectIdを
 * 共有するため、chartAndApps単位でなくバッチ単位（`buildPlans()`で1つ生成）にすることで
 * 問い合わせを使い回せる。`mapWithConcurrency`によりchartAndAppsは並列実行されるため、
 * 同時に来た同じキーの問い合わせも1回にまとめる`getOrFetchShared`を使う。
 */
function createCachedBranchExists(gitlab: GitlabClient): CachedBranchExists {
  const cache = new Map<string, Promise<boolean>>()
  return (projectId, branch) =>
    getOrFetchShared(cache, `${projectId}:${branch}`, () =>
      branchExistsOnGitlab(gitlab, projectId, branch),
    )
}
