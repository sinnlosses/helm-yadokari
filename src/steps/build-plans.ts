import {
  type GitlabClient,
  branchExists as branchExistsOnGitlab,
  getFileContent,
  getLatestPipelineForRef,
} from "../lib/gitlab/gitlab.js"
import type {
  AppConfig,
  AppUpdatePlan,
  BranchName,
  ChartAndApps,
  ChartUpdateResult,
  ChartUpdateTarget,
  FileUpdate,
  ProjectId,
  TagFormat,
} from "../types.js"
import { getOrFetch } from "../utils/cache.js"
import { logger } from "../utils/logger.js"
import { mapWithConcurrency } from "../utils/parallel.js"
import { left, partitionMap, right } from "../utils/partition.js"
import { reduceAsync } from "../utils/sequential.js"
import {
  buildLogContext,
  describePlan,
  rethrowWithAppContext,
  settleAsError,
} from "./shared/step-outcome.js"
import {
  type ApplyHelmTargetsAcc,
  applyHelmTargetBranchTargets,
} from "./sub-steps/build-plans/helm-target-branch-target.js"
import {
  applyImageTagTargets,
  readCurrentImageTags,
} from "./sub-steps/build-plans/image-tag-target.js"
import { resolveLatestTag } from "./sub-steps/build-plans/resolve-latest-tag.js"
import type {
  BranchExists,
  BuildChartUpdateAcc,
  LoadValuesYamlContent,
} from "./sub-steps/build-plans/types.js"
import { toFileUpdates } from "./sub-steps/build-plans/values-yaml-draft.js"

export type BuildPlansResult = {
  readonly toApply: ChartUpdateTarget[]
  readonly settled: ChartUpdateResult[]
}

/**
 * 1つのchartAndAppsを処理する間ずっと変わらない文脈。アプリを1つずつ処理する
 * `buildAppUpdatePlan()` へ、アプリごとに変わる値（`acc`/`app`）と分けて渡す。
 * `loadValuesYamlContent`/`branchExists` はGitLabクライアント・chartのprojectId・
 * chartAndApps単位のキャッシュを閉じ込めた関数で、サブステップ側はGitLabを知らずに済む。
 */
type BuildPlanContext = {
  readonly gitlab: GitlabClient
  readonly dryRun: boolean
  readonly tagFormat: TagFormat
  readonly loadValuesYamlContent: LoadValuesYamlContent
  readonly branchExists: BranchExists
}

type PlanResult =
  | { readonly status: "apply"; readonly target: ChartUpdateTarget }
  | { readonly status: "settled"; readonly result: ChartUpdateResult }

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
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (chartAndApps) =>
    planTarget(gitlab, chartAndApps, dryRun, tagFormat),
  )

  const { left: toApply, right: settled } = partitionMap(outcomes, (outcome) =>
    outcome.status === "apply" ? left(outcome.target) : right(outcome.result),
  )
  return { toApply, settled }
}

/**
 * 1つのchartAndAppsの更新計画を組み立て、結果を振り分ける（このstepの並列処理1件分）。
 * `buildPlan()`の結果を見て SKIPPED（差分無し / dryRun）・ERROR・apply のどれにするかを
 * 判定する。
 */
async function planTarget(
  gitlab: GitlabClient,
  chartAndApps: ChartAndApps,
  dryRun: boolean,
  tagFormat: TagFormat,
): Promise<PlanResult> {
  const logContext = buildLogContext(chartAndApps)

  try {
    const { plans, files } = await buildPlan(gitlab, chartAndApps, dryRun, tagFormat)
    if (plans.length === 0) {
      logger.info({ ...logContext, result: "SKIPPED", reason: "no_diff" })
      return { status: "settled", result: "SKIPPED" }
    }
    if (dryRun) {
      logger.info({
        ...logContext,
        result: "SKIPPED",
        reason: "dry_run",
        apps: plans.map(describePlan),
      })
      return { status: "settled", result: "SKIPPED" }
    }
    return { status: "apply", target: { chartAndApps, plans, files } }
  } catch (err) {
    return { status: "settled", result: settleAsError(err, logContext) }
  }
}

/**
 * 1つのchartAndAppsについて、配下の全アプリ(Apps)のうち差分があったアプリだけの計画を積み上げる。
 * 同じvalues.yamlを参照する複数アプリ・複数箇所の変更が下書き（`ValuesYamlDraft`）に積み重なるよう、
 * アプリ間で並列化はせず1つずつ処理する。最終的に書き換えのあったファイルだけを`toFileUpdates()`で
 * `FileUpdate[]`にする。
 */
async function buildPlan(
  gitlab: GitlabClient,
  chartAndApps: ChartAndApps,
  dryRun: boolean,
  tagFormat: TagFormat,
): Promise<{ plans: AppUpdatePlan[]; files: FileUpdate[] }> {
  const chartProjectId: ProjectId = chartAndApps.chart.projectId
  const baseBranch: BranchName = chartAndApps.chart.mrTargetBranch

  const loadValuesYamlContent: LoadValuesYamlContent = (cache, valuesPath) =>
    getOrFetch(cache, valuesPath, async () => {
      const valuesYamlContent = await getFileContent(gitlab, chartProjectId, valuesPath, baseBranch)
      if (valuesYamlContent === undefined) {
        throw new Error(`values.yaml が見つかりません: ${valuesPath}`)
      }
      return { content: valuesYamlContent, modified: false }
    }).then((entry) => entry.content)

  // 同じブランチ名の存在確認はこのchartAndApps内で1回だけになるようキャッシュを共有する
  const branchExistsCache = new Map<BranchName, boolean>()
  const branchExists: BranchExists = (branch) =>
    getOrFetch(branchExistsCache, branch, () =>
      branchExistsOnGitlab(gitlab, chartProjectId, branch),
    )

  const context: BuildPlanContext = {
    gitlab,
    dryRun,
    tagFormat,
    loadValuesYamlContent,
    branchExists,
  }
  const initialAcc: BuildChartUpdateAcc = {
    plans: [],
    draft: new Map(),
  }

  const { plans, draft } = await reduceAsync(chartAndApps.apps, initialAcc, (acc, app) =>
    buildAppUpdatePlan(context, acc, app),
  )

  return {
    plans: [...plans],
    files: toFileUpdates(draft),
  }
}

/**
 * 1アプリ分の更新計画を組み立てる。手順は次の5つ
 *
 * 1. `readCurrentImageTags()` — `app.chart`全箇所の反映済みタグを読み取る
 * 2. `resolveLatestTag()` — 追跡ブランチ由来の最新タグが存在するか確認し、無ければ作成する
 *    （反映済みタグが現在の追跡ブランチ由来でない場合も作成する）
 * 3. `applyImageTagTargets()` — `app.chart`全箇所について、最新タグとの差分をチェックする
 *    （反映済みタグは1で読んだ`previousTags`をそのまま使い、同じアンカーを読み直さない。T-048）
 * 4. `applyHelmTargetBranchTargets()` — `app.helmTargetBranch`があれば、向き先ブランチの
 *    全箇所について設定値との差分をチェック
 * 5. 差分が1件も無ければSKIPPEDとしてログを出して終了、あれば最新パイプラインを取得して
 *    `AppUpdatePlan`を組み立てる
 *
 * 処理中に投げられた例外は`rethrowWithAppContext()`でアプリ名を付けて投げ直す（T-052）。
 * 致命的エラーの扱いを含む方針は`steps/shared/step-outcome.ts`に集約している。
 */
async function buildAppUpdatePlan(
  context: BuildPlanContext,
  acc: BuildChartUpdateAcc,
  app: AppConfig,
): Promise<BuildChartUpdateAcc> {
  const { gitlab, dryRun, tagFormat, loadValuesYamlContent, branchExists } = context
  try {
    const { draft: draftWithCurrentTags, previousTags } = await readCurrentImageTags(
      loadValuesYamlContent,
      acc.draft,
      app.chart,
    )
    const latestTag = await resolveLatestTag(gitlab, app, dryRun, tagFormat, previousTags)

    const { draft: draftAfterChartTargets, updates } = await applyImageTagTargets(
      loadValuesYamlContent,
      latestTag,
      draftWithCurrentTags,
      app.chart,
      previousTags,
    )

    const helmTargetBranch = app.helmTargetBranch
    const afterHelmTargets: ApplyHelmTargetsAcc = helmTargetBranch
      ? await applyHelmTargetBranchTargets(
          branchExists,
          loadValuesYamlContent,
          helmTargetBranch,
          draftAfterChartTargets,
        )
      : { draft: draftAfterChartTargets, updates: [] }
    const { draft, updates: helmTargetBranchUpdates } = afterHelmTargets

    if (updates.length === 0 && helmTargetBranchUpdates.length === 0) {
      logger.info({
        event: "check_app",
        projectName: app.projectName,
        result: "SKIPPED",
        reason: "already_up_to_date",
        tag: latestTag.tag.name,
      })
      return { plans: acc.plans, draft }
    }

    // dryRun時はMRを作らないため（planTarget()でSKIPPEDになる）、MR本文組み立てで必要な
    // パイプライン情報は不要。APIコストを削減するため取得をスキップする
    const pipeline = dryRun
      ? undefined
      : await getLatestPipelineForRef(gitlab, app.projectId, latestTag.tag.name)
    const plan: AppUpdatePlan = {
      app,
      latestTag: latestTag.tag,
      pipeline,
      updates,
      helmTargetBranchUpdates,
    }

    return {
      plans: [...acc.plans, plan],
      draft,
    }
  } catch (err) {
    rethrowWithAppContext(err, app.projectName)
  }
}
