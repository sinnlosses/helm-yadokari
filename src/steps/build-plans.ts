import { type GitlabClient, getFileContent } from "../lib/gitlab/gitlab.js"
import type {
  AppUpdatePlan,
  BranchName,
  ChartAndApps,
  ChartUpdateResult,
  ChartUpdateTarget,
  FileUpdate,
  ProjectId,
  ValuesPath,
} from "../types.js"
import { getOrFetch } from "../utils/cache.js"
import { FatalError } from "../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../utils/http.js"
import { logger } from "../utils/logger.js"
import { mapWithConcurrency } from "../utils/parallel.js"
import { buildAppUpdatePlan } from "./sub-steps/build-plans/app-update-plan.js"
import type { BuildChartUpdateAcc, LoadValuesYamlContent } from "./sub-steps/build-plans/types.js"

export type BuildPlansResult = {
  readonly toApply: ChartUpdateTarget[]
  readonly settled: ChartUpdateResult[]
}

type PlanResult =
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
    process(gitlab, chartAndApps, dryRun),
  )

  return outcomes.reduce<BuildPlansResult>(
    (acc, outcome) =>
      outcome.status === "apply"
        ? { ...acc, toApply: [...acc.toApply, outcome.target] }
        : { ...acc, settled: [...acc.settled, outcome.result] },
    { toApply: [], settled: [] },
  )
}

async function process(
  gitlab: GitlabClient,
  chartAndApps: ChartAndApps,
  dryRun: boolean,
): Promise<PlanResult> {
  const logContext = {
    event: "update_chart",
    chartDir: chartAndApps.chartDir,
    chartProjectId: chartAndApps.chart.projectId,
    chartProjectName: chartAndApps.chart.projectName,
  }

  try {
    const { plans, files } = await buildPlan(gitlab, chartAndApps, dryRun)
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

/**
 * 1つのchartAndAppsについて、配下の全アプリを`buildAppUpdatePlan()`（1アプリ分の
 * サブステップ）に順番に渡し、差分があったアプリだけの計画を積み上げる。同じvalues.yamlを
 * 参照する複数アプリ・複数箇所の変更が`valuesYamlCache`に積み重なるよう、アプリ間で
 * 並列化はせず1つずつ処理する。最終的に書き換えのあったファイルだけを`buildFileUpdates()`で
 * `FileUpdate[]`にする。
 */
async function buildPlan(
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
        buildAppUpdatePlan(
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

  return {
    plans: [...plans],
    files: buildFileUpdates(modifiedValuesPaths, valuesYamlCache),
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
