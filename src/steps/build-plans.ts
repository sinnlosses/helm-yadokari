import {
  type GitlabClient,
  createTag,
  getFileContent,
  getLatestPipelineForRef,
  listTagNames,
} from "../lib/gitlab/gitlab.js"
import { buildNewTag, findLatestParsedTag } from "../lib/gitlab/tag.js"
import { getValueAtPath, setValueAtPath } from "../lib/helm.js"
import type {
  AppConfig,
  AppUpdatePlan,
  BranchName,
  ChartGroup,
  ChartUpdateResult,
  ChartUpdateTarget,
  FileUpdate,
  ParsedTag,
  ProjectId,
} from "../types.js"
import { toTagName } from "../types.js"
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
 * 各chartグループの更新計画を並列に構築する。差分がないもの・dryRunのものは
 * settled（SKIPPED）に、実際に反映が必要なものは toApply にまとめて返す。
 *
 * いずれか1つのアプリの処理が失敗した場合、そのchartグループ全体をオールオアナッシングで
 * settled（ERROR）に含める（`buildChartUpdate()` 参照）。
 */
export async function buildPlans(
  gitlab: GitlabClient,
  targets: readonly ChartGroup[],
  concurrencyLimit: number,
  dryRun: boolean,
): Promise<BuildPlansResult> {
  const outcomes = await mapWithConcurrency(targets, concurrencyLimit, (chartGroup) =>
    buildPlanForChartGroup(gitlab, chartGroup, dryRun),
  )

  const toApply: ChartUpdateTarget[] = []
  const settled: ChartUpdateResult[] = []
  for (const outcome of outcomes) {
    if (outcome.status === "apply") toApply.push(outcome.target)
    else settled.push(outcome.result)
  }
  return { toApply, settled }
}

function describePlan(plan: AppUpdatePlan): Record<string, unknown> {
  return {
    projectName: plan.app.projectName,
    previousTag: plan.previousTag,
    latestTag: plan.latestTag.name,
  }
}

async function buildPlanForChartGroup(
  gitlab: GitlabClient,
  chartGroup: ChartGroup,
  dryRun: boolean,
): Promise<PlanOutcome> {
  const logContext = {
    event: "update_chart",
    chartDir: chartGroup.chartDir,
    chartProjectId: chartGroup.chart.projectId,
    chartProjectName: chartGroup.chart.projectName,
  }

  try {
    const { plans, files } = await buildChartUpdate(gitlab, chartGroup, dryRun)
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
    return { status: "apply", target: { chartGroup, plans, files } }
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
 * 追跡ブランチ由来の最新タグを判定する。1件も見つからない場合は、このツール自身が
 * 追跡ブランチの最新コミットに対して新しいタグを作成し、それを最新タグとして扱う
 * （dryRun のときは実際の作成はスキップし、作成予定のタグ名だけを使う）。
 */
async function resolveLatestTag(
  gitlab: GitlabClient,
  app: AppConfig,
  dryRun: boolean,
): Promise<ParsedTag> {
  const tags = await listTagNames(gitlab, app.projectId)
  const existingTag = findLatestParsedTag(tags, app.branchToSync)
  if (existingTag) return existingTag

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
 * 1つのchartグループについて、アプリごとに最新タグを判定し、反映済みタグと異なる
 * アプリだけを更新計画に含める。同じ values.yaml を参照する複数アプリの変更は、
 * 同一ファイル内に積み重ねてまとめる。
 */
async function buildChartUpdate(
  gitlab: GitlabClient,
  chartGroup: ChartGroup,
  dryRun: boolean,
): Promise<{ plans: AppUpdatePlan[]; files: FileUpdate[] }> {
  const chartProjectId: ProjectId = chartGroup.chart.projectId
  const baseBranch: BranchName = chartGroup.chart.mrTargetBranch
  const valuesYamlCache = new Map<string, string>()
  const modifiedValuesPaths = new Set<string>()

  function loadValuesYamlContent(valuesPath: string): Promise<string> {
    return getOrFetch(valuesYamlCache, valuesPath, async () => {
      const valuesYamlContent = await getFileContent(gitlab, chartProjectId, valuesPath, baseBranch)
      if (valuesYamlContent === undefined) {
        throw new Error(`values.yaml が見つかりません: ${valuesPath}`)
      }
      return valuesYamlContent
    })
  }

  const plans: AppUpdatePlan[] = []

  for (const app of chartGroup.apps) {
    const latestTag = await resolveLatestTag(gitlab, app, dryRun)

    const valuesYamlContent = await loadValuesYamlContent(app.chart.valuesPath)
    const previousTagRaw = getValueAtPath(valuesYamlContent, app.chart.imageTagKey)
    if (previousTagRaw === latestTag.name) {
      logger.info({
        event: "check_app",
        projectName: app.projectName,
        result: "SKIPPED",
        reason: "already_up_to_date",
        tag: latestTag.name,
      })
      continue
    }

    const pipeline = await getLatestPipelineForRef(gitlab, app.projectId, latestTag.name)
    plans.push({
      app,
      previousTag: previousTagRaw === undefined ? undefined : toTagName(previousTagRaw),
      latestTag,
      pipelineUrl: pipeline?.webUrl,
      pipelineStatus: pipeline?.status,
    })
    valuesYamlCache.set(
      app.chart.valuesPath,
      setValueAtPath(valuesYamlContent, app.chart.imageTagKey, latestTag.name),
    )
    modifiedValuesPaths.add(app.chart.valuesPath)
  }

  const files: FileUpdate[] = [...modifiedValuesPaths].map((filePath) => {
    const valuesYamlContent = valuesYamlCache.get(filePath)
    if (valuesYamlContent === undefined) {
      throw new Error(`internal error: missing values.yaml content for ${filePath}`)
    }
    return { filePath, content: valuesYamlContent }
  })

  return { plans, files }
}
