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
  ValuesPath,
} from "../types.js"
import { getOrFetch } from "../utils/cache.js"
import { logger } from "../utils/logger.js"
import { mapWithConcurrency } from "../utils/parallel.js"
import { left, partitionMap, right } from "../utils/partition.js"
import { reduceAsync } from "../utils/sequential.js"
import { buildLogContext, describePlan, settleAsError } from "./shared/step-outcome.js"
import {
  type ApplyHelmTargetsAcc,
  applyHelmTargetBranchTargets,
} from "./sub-steps/build-plans/helm-target-branch-target.js"
import {
  type ApplyImageTagAcc,
  applyImageTagTargets,
} from "./sub-steps/build-plans/image-tag-target.js"
import { resolveLatestTag } from "./sub-steps/build-plans/resolve-latest-tag.js"
import type {
  BranchExists,
  BuildChartUpdateAcc,
  LoadValuesYamlContent,
} from "./sub-steps/build-plans/types.js"

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
 * 同じvalues.yamlを参照する複数アプリ・複数箇所の変更が`valuesYamlCache`に積み重なるよう、
 * アプリ間で並列化はせず1つずつ処理する。最終的に書き換えのあったファイルだけを`buildFileUpdates()`で
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
      return valuesYamlContent
    })

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
    valuesYamlCache: new Map(),
    modifiedValuesPaths: new Set(),
  }

  const { plans, valuesYamlCache, modifiedValuesPaths } = await reduceAsync(
    chartAndApps.apps,
    initialAcc,
    (acc, app) => buildAppUpdatePlan(context, acc, app),
  )

  return {
    plans: [...plans],
    files: buildFileUpdates(modifiedValuesPaths, valuesYamlCache),
  }
}

/**
 * 1アプリ分の更新計画を組み立てる。手順は次の4つ
 *
 * 1. `resolveLatestTag()` — 追跡ブランチ由来の最新タグが存在するか確認し、無ければ作成する
 * 2. `applyImageTagTargets()` — `app.chart`全箇所について、最新タグとの差分をチェックする
 * 3. `applyHelmTargetBranchTargets()` — `app.helmTargetBranch`があれば、向き先ブランチの
 *    全箇所について設定値との差分をチェック
 * 4. 差分が1件も無ければSKIPPEDとしてログを出して終了、あれば最新パイプラインを取得して
 *    `AppUpdatePlan`を組み立てる
 */
async function buildAppUpdatePlan(
  context: BuildPlanContext,
  acc: BuildChartUpdateAcc,
  app: AppConfig,
): Promise<BuildChartUpdateAcc> {
  const { gitlab, dryRun, tagFormat, loadValuesYamlContent, branchExists } = context
  const latestTag = await resolveLatestTag(gitlab, app, dryRun, tagFormat)

  const initialTargetsAcc: ApplyImageTagAcc = {
    valuesYamlCache: acc.valuesYamlCache,
    modifiedValuesPaths: acc.modifiedValuesPaths,
    updates: [],
  }
  const afterChartTargets = await applyImageTagTargets(
    loadValuesYamlContent,
    latestTag.name,
    initialTargetsAcc,
    app.chart,
  )

  const helmTargetBranch = app.helmTargetBranch
  const initialHelmTargetsAcc: ApplyHelmTargetsAcc = {
    valuesYamlCache: afterChartTargets.valuesYamlCache,
    modifiedValuesPaths: afterChartTargets.modifiedValuesPaths,
    updates: [],
  }
  const afterHelmTargets = helmTargetBranch
    ? await applyHelmTargetBranchTargets(
        branchExists,
        loadValuesYamlContent,
        helmTargetBranch,
        initialHelmTargetsAcc,
      )
    : initialHelmTargetsAcc

  const { valuesYamlCache, modifiedValuesPaths } = afterHelmTargets
  const { updates } = afterChartTargets
  const helmTargetBranchUpdates = afterHelmTargets.updates

  if (updates.length === 0 && helmTargetBranchUpdates.length === 0) {
    logger.info({
      event: "check_app",
      projectName: app.projectName,
      result: "SKIPPED",
      reason: "already_up_to_date",
      tag: latestTag.name,
    })
    return { plans: acc.plans, valuesYamlCache, modifiedValuesPaths }
  }

  const pipeline = await getLatestPipelineForRef(gitlab, app.projectId, latestTag.name)
  const plan: AppUpdatePlan = { app, latestTag, pipeline, updates, helmTargetBranchUpdates }

  return {
    plans: [...acc.plans, plan],
    valuesYamlCache,
    modifiedValuesPaths,
  }
}

function buildFileUpdates(
  modifiedValuesPaths: ReadonlySet<ValuesPath>,
  valuesYamlCache: ReadonlyMap<ValuesPath, string>,
): FileUpdate[] {
  return [...modifiedValuesPaths].map((filePath) => {
    const content = valuesYamlCache.get(filePath)
    if (content === undefined) {
      throw new Error(`internal error: missing values.yaml content for ${filePath}`)
    }
    return { filePath, content }
  })
}
