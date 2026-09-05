import {
  type GitlabClient,
  getFileContent,
  getLatestPipelineForRef,
} from "../../../lib/gitlab/gitlab.js"
import type {
  AppConfig,
  AppUpdatePlan,
  BranchName,
  ChartAndApps,
  FileUpdate,
  ProjectId,
  ValuesPath,
} from "../../../types.js"
import { getOrFetch } from "../../../utils/cache.js"
import { logger } from "../../../utils/logger.js"
import {
  type ApplyHelmTargetsAcc,
  applyHelmTargetBranchTarget,
} from "./helm-target-branch-target.js"
import { type ApplyTargetsAcc, applyImageTagTarget } from "./image-tag-target.js"
import { resolveLatestTag } from "./resolve-latest-tag.js"

export type LoadValuesYamlContent = (
  cache: Map<ValuesPath, string>,
  valuesPath: ValuesPath,
) => Promise<string>

type BuildChartUpdateAcc = {
  readonly plans: readonly AppUpdatePlan[]
  readonly valuesYamlCache: ReadonlyMap<ValuesPath, string>
  readonly modifiedValuesPaths: ReadonlySet<ValuesPath>
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

/**
 * 1つのchartAndAppsについて、アプリごとに最新タグを判定し、反映済みタグと異なる
 * アプリだけを更新計画に含める。同じ values.yaml を参照する複数アプリ・複数箇所の変更は、
 * 同一ファイル内に積み重ねてまとめる。
 */
export async function buildChartUpdate(
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
