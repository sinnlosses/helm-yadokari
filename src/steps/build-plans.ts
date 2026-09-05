import {
  type GitlabClient,
  branchExists,
  createTag,
  getBranchHeadSha,
  getFileContent,
  getLatestPipelineForRef,
  listTags,
} from "../lib/gitlab/gitlab.js"
import { buildNewTag, findLatestParsedTag } from "../lib/gitlab/tag.js"
import { getValueAtAnchor, setValueAtAnchor } from "../lib/helm.js"
import type {
  AppConfig,
  AppUpdatePlan,
  BranchName,
  ChartAndApps,
  ChartUpdateResult,
  ChartUpdateTarget,
  FileUpdate,
  HelmTargetBranchTarget,
  HelmTargetBranchUpdate,
  ImageTagTarget,
  ImageTagUpdate,
  ParsedTag,
  ProjectId,
  TagName,
  ValuesPath,
} from "../types.js"
import { toBranchName, toTagName } from "../types.js"
import { getOrFetch } from "../utils/cache.js"
import { FatalError } from "../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../utils/http.js"
import { logger } from "../utils/logger.js"
import { mapWithConcurrency } from "../utils/parallel.js"

export type BuildPlansResult = {
  readonly toApply: ChartUpdateTarget[]
  readonly settled: ChartUpdateResult[]
}

type PlanOutcome =
  | { readonly status: "apply"; readonly target: ChartUpdateTarget }
  | { readonly status: "settled"; readonly result: ChartUpdateResult }

/**
 * 各chartAndAppsの更新計画を並列に構築する。差分がないもの・dryRunのものは
 * settled（SKIPPED）に、実際に適用が必要なものは toApply にまとめて返す。
 *
 * いずれか1つのアプリの処理が失敗した場合、そのchartAndApps全体をオールオアナッシングで
 * settled（ERROR）に含める（`buildChartUpdate()` 参照）。
 */
export async function buildPlans(
  gitlab: GitlabClient,
  targets: readonly ChartAndApps[],
  concurrencyLimit: number,
  dryRun: boolean,
): Promise<BuildPlansResult> {
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (chartAndApps) =>
    buildPlanForChartAndApps(gitlab, chartAndApps, dryRun),
  )

  return outcomes.reduce<BuildPlansResult>(
    (acc, outcome) =>
      outcome.status === "apply"
        ? { ...acc, toApply: [...acc.toApply, outcome.target] }
        : { ...acc, settled: [...acc.settled, outcome.result] },
    { toApply: [], settled: [] },
  )
}

function describePlan(plan: AppUpdatePlan): Record<string, unknown> {
  return {
    projectName: plan.app.projectName,
    latestTag: plan.latestTag.name,
    updates: plan.updates.map((update) => ({
      valuesPath: update.target.valuesPath,
      previousTag: update.previousTag,
    })),
    helmTargetBranchUpdates: plan.helmTargetBranchUpdates.map((update) => ({
      valuesPath: update.target.valuesPath,
      previousBranch: update.previousBranch,
      newBranch: update.newBranch,
    })),
  }
}

async function buildPlanForChartAndApps(
  gitlab: GitlabClient,
  chartAndApps: ChartAndApps,
  dryRun: boolean,
): Promise<PlanOutcome> {
  const logContext = {
    event: "update_chart",
    chartDir: chartAndApps.chartDir,
    chartProjectId: chartAndApps.chart.projectId,
    chartProjectName: chartAndApps.chart.projectName,
  }

  try {
    const { plans, files } = await buildChartUpdate(gitlab, chartAndApps, dryRun)
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
    if (isFatalError(err)) throw new FatalError(extractHttpStatus(err), err)
    logger.error({
      ...logContext,
      result: "ERROR",
      reason: `httpStatus: ${extractHttpStatus(err)}, message: ${toErrorMessage(err)}`,
    })
    return { status: "settled", result: "ERROR" }
  }
}

/**
 * 追跡ブランチ由来の最新タグを判定する。追跡ブランチの現在のHEADコミットと一致する
 * 既存タグが無い場合（1件も見つからない場合に加え、見つかった最新タグが追跡ブランチの
 * 進行にビハインドしている場合を含む）は、このツール自身が追跡ブランチの最新コミットに
 * 対して新しいタグを作成し、それを最新タグとして扱う（dryRun のときは実際の作成は
 * スキップし、作成予定のタグ名だけを使う）。
 */
async function resolveLatestTag(
  gitlab: GitlabClient,
  app: AppConfig,
  dryRun: boolean,
): Promise<ParsedTag> {
  const [tags, headSha] = await Promise.all([
    listTags(gitlab, app.projectId),
    getBranchHeadSha(gitlab, app.projectId, app.branchToSync),
  ])
  const existingTag = findLatestParsedTag(
    tags.map((tag) => tag.name),
    app.branchToSync,
  )
  const existingTagCommitSha = tags.find((tag) => tag.name === existingTag?.name)?.commitSha
  if (existingTag && existingTagCommitSha === headSha) return existingTag

  const newTag = buildNewTag(app.branchToSync, new Date())
  if (!dryRun) {
    await createTag(gitlab, app.projectId, newTag.name, app.branchToSync)
  }
  logger.info({
    event: "create_tag",
    projectName: app.projectName,
    branch: app.branchToSync,
    tag: newTag.name,
    dryRun,
  })
  return newTag
}

/**
 * 1つのchartAndAppsについて、アプリごとに最新タグを判定し、反映済みタグと異なる
 * アプリだけを更新計画に含める。同じ values.yaml を参照する複数アプリ・複数箇所の変更は、
 * 同一ファイル内に積み重ねてまとめる。
 */
type BuildChartUpdateAcc = {
  readonly plans: readonly AppUpdatePlan[]
  readonly valuesYamlCache: ReadonlyMap<ValuesPath, string>
  readonly modifiedValuesPaths: ReadonlySet<ValuesPath>
}

type LoadValuesYamlContent = (
  cache: Map<ValuesPath, string>,
  valuesPath: ValuesPath,
) => Promise<string>

type ApplyTargetsAcc = {
  readonly valuesYamlCache: ReadonlyMap<ValuesPath, string>
  readonly modifiedValuesPaths: ReadonlySet<ValuesPath>
  readonly updates: readonly ImageTagUpdate[]
}

type ApplyHelmTargetsAcc = {
  readonly valuesYamlCache: ReadonlyMap<ValuesPath, string>
  readonly modifiedValuesPaths: ReadonlySet<ValuesPath>
  readonly updates: readonly HelmTargetBranchUpdate[]
}

/**
 * `app.chart`のうち1箇所分について、現在の値を読み取り最新タグと比較する。差分が
 * あれば書き換え内容をキャッシュに積み、`updates`にも積む（差分が無ければキャッシュの
 * 更新分だけを引き継ぎ、その箇所は`updates`に含めない）。
 */
async function applyImageTagTarget(
  loadValuesYamlContent: LoadValuesYamlContent,
  latestTagName: TagName,
  acc: ApplyTargetsAcc,
  target: ImageTagTarget,
): Promise<ApplyTargetsAcc> {
  const valuesYamlCache = new Map(acc.valuesYamlCache)
  const valuesYamlContent = await loadValuesYamlContent(valuesYamlCache, target.valuesPath)
  const previousTagRaw = getValueAtAnchor(valuesYamlContent, target.anchor)
  if (previousTagRaw === latestTagName) return { ...acc, valuesYamlCache }

  valuesYamlCache.set(
    target.valuesPath,
    setValueAtAnchor(valuesYamlContent, target.anchor, latestTagName),
  )
  return {
    valuesYamlCache,
    modifiedValuesPaths: new Set(acc.modifiedValuesPaths).add(target.valuesPath),
    updates: [
      ...acc.updates,
      { target, previousTag: previousTagRaw === undefined ? undefined : toTagName(previousTagRaw) },
    ],
  }
}

/**
 * `app.helmTargetBranch.targets`のうち1箇所分について、現在の値を読み取り設定値（`branch`）と
 * 比較する。差分があれば、書き込み前にそのブランチがchartリポジトリ上に実在するか検証したうえで
 * 書き換え内容をキャッシュに積み、`updates`にも積む（差分が無ければ`updates`に含めない）。
 * ブランチ存在チェックは同一ブランチ名につき1回だけになるよう`branchExistsCache`で共有する。
 */
async function applyHelmTargetBranchTarget(
  gitlab: GitlabClient,
  chartProjectId: ProjectId,
  branchExistsCache: Map<BranchName, boolean>,
  loadValuesYamlContent: LoadValuesYamlContent,
  branch: BranchName,
  acc: ApplyHelmTargetsAcc,
  target: HelmTargetBranchTarget,
): Promise<ApplyHelmTargetsAcc> {
  const valuesYamlCache = new Map(acc.valuesYamlCache)
  const valuesYamlContent = await loadValuesYamlContent(valuesYamlCache, target.valuesPath)
  const previousBranchRaw = getValueAtAnchor(valuesYamlContent, target.anchor)
  if (previousBranchRaw === branch) return { ...acc, valuesYamlCache }

  const exists = await getOrFetch(branchExistsCache, branch, () =>
    branchExists(gitlab, chartProjectId, branch),
  )
  if (!exists) {
    throw new Error(`向き先ブランチ "${branch}" がchartリポジトリに見つかりません`)
  }

  valuesYamlCache.set(target.valuesPath, setValueAtAnchor(valuesYamlContent, target.anchor, branch))
  return {
    valuesYamlCache,
    modifiedValuesPaths: new Set(acc.modifiedValuesPaths).add(target.valuesPath),
    updates: [
      ...acc.updates,
      {
        target,
        previousBranch:
          previousBranchRaw === undefined ? undefined : toBranchName(previousBranchRaw),
        newBranch: branch,
      },
    ],
  }
}

/**
 * 1アプリ分の最新タグ判定・箇所ごとの差分チェックを行い、差分があった箇所だけを
 * 更新計画に積んだアキュムレータを返す（全箇所が反映済みなら plans は増えない）。
 */
async function applyAppToChartUpdate(
  gitlab: GitlabClient,
  dryRun: boolean,
  loadValuesYamlContent: LoadValuesYamlContent,
  chartProjectId: ProjectId,
  branchExistsCache: Map<BranchName, boolean>,
  acc: BuildChartUpdateAcc,
  app: AppConfig,
): Promise<BuildChartUpdateAcc> {
  const latestTag = await resolveLatestTag(gitlab, app, dryRun)

  const initialTargetsAcc: ApplyTargetsAcc = {
    valuesYamlCache: acc.valuesYamlCache,
    modifiedValuesPaths: acc.modifiedValuesPaths,
    updates: [],
  }
  const afterChartTargets = await app.chart.reduce(
    (accPromise, target) =>
      accPromise.then((current) =>
        applyImageTagTarget(loadValuesYamlContent, latestTag.name, current, target),
      ),
    Promise.resolve(initialTargetsAcc),
  )

  const helmTargetBranch = app.helmTargetBranch
  const initialHelmTargetsAcc: ApplyHelmTargetsAcc = {
    valuesYamlCache: afterChartTargets.valuesYamlCache,
    modifiedValuesPaths: afterChartTargets.modifiedValuesPaths,
    updates: [],
  }
  const afterHelmTargets = helmTargetBranch
    ? await helmTargetBranch.targets.reduce(
        (accPromise, target) =>
          accPromise.then((current) =>
            applyHelmTargetBranchTarget(
              gitlab,
              chartProjectId,
              branchExistsCache,
              loadValuesYamlContent,
              helmTargetBranch.branch,
              current,
              target,
            ),
          ),
        Promise.resolve(initialHelmTargetsAcc),
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

async function buildChartUpdate(
  gitlab: GitlabClient,
  chartAndApps: ChartAndApps,
  dryRun: boolean,
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

  const initialAcc: BuildChartUpdateAcc = {
    plans: [],
    valuesYamlCache: new Map(),
    modifiedValuesPaths: new Set(),
  }
  const branchExistsCache = new Map<BranchName, boolean>()

  const { plans, valuesYamlCache, modifiedValuesPaths } = await chartAndApps.apps.reduce(
    (accPromise, app) =>
      accPromise.then((acc) =>
        applyAppToChartUpdate(
          gitlab,
          dryRun,
          loadValuesYamlContent,
          chartProjectId,
          branchExistsCache,
          acc,
          app,
        ),
      ),
    Promise.resolve(initialAcc),
  )

  return { plans: [...plans], files: buildFileUpdates(modifiedValuesPaths, valuesYamlCache) }
}
