import type {
  AppConfig,
  AppUpdatePlan,
  BranchName,
  ChartGroup,
  ChartUpdateResult,
  ParsedTag,
  ProjectId,
} from "../types.js"
import { toBranchName, toTagName } from "../types.js"
import { FatalError } from "../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../utils/http.js"
import { logger } from "../utils/logger.js"
import {
  type FileUpdate,
  type GitlabClient,
  commitFileUpdates,
  createMergeRequest,
  createTag,
  getFileContent,
  getLatestPipelineForRef,
  listTagNames,
  openMergeRequestExists,
} from "./gitlab.js"
import { buildDescription, buildTitle, describePlan } from "./mr-content.js"
import { buildNewTag, findLatestParsedTag } from "./tag.js"
import { getValueAtPath, setValueAtPath } from "./values.js"

/** 全chartリポジトリで共通の固定ブランチ名。chartリポジトリ単位で1つのMRに集約するため使い回す */
export const UPDATE_BRANCH: BranchName = toBranchName("yadokari/update")

/**
 * 1つのchartリポジトリ配下の全アプリをオールオアナッシングで処理する。
 *
 * 以下のいずれかに該当する場合は SKIPPED を返す:
 * - 登録アプリが0件
 * - 固定ブランチにオープン中のMRが既に存在する
 * - 全アプリが反映済みタグと最新タグが一致している（差分なし）
 * - dryRun が true
 *
 * いずれか1つのアプリの処理（タグ取得・values.yaml読み込み等）が失敗した場合は、
 * 成功した分だけを反映せずチャートリポジトリ全体を ERROR として見送る。
 *
 * 401 / 5xx などの fatal なエラーは FatalError としてスローし、呼び出し元で即時終了させる。
 */
export async function updateChartGroupIfNeeded(
  gitlab: GitlabClient,
  chartGroup: ChartGroup,
  dryRun = false,
): Promise<ChartUpdateResult> {
  const { chart, apps, chartDir } = chartGroup
  const logContext = {
    event: "update_chart",
    chartDir,
    chartProjectId: chart.projectId,
    chartProjectName: chart.projectName,
  }

  try {
    if (apps.length === 0) {
      logger.info({ ...logContext, result: "SKIPPED", reason: "no_apps" })
      return "SKIPPED"
    }

    if (await openMergeRequestExists(gitlab, chart.projectId, UPDATE_BRANCH)) {
      logger.info({ ...logContext, result: "SKIPPED", reason: "mr_exists" })
      return "SKIPPED"
    }

    const { plans, files } = await buildChartUpdate(
      gitlab,
      chart.projectId,
      chart.mrTargetBranch,
      apps,
      dryRun,
    )
    if (plans.length === 0) {
      logger.info({ ...logContext, result: "SKIPPED", reason: "no_diff" })
      return "SKIPPED"
    }

    const summary = plans.map(describePlan)
    if (dryRun) {
      logger.info({ ...logContext, result: "SKIPPED", reason: "dry_run", apps: summary })
      return "SKIPPED"
    }

    const title = buildTitle(plans)
    await commitFileUpdates(
      gitlab,
      chart.projectId,
      UPDATE_BRANCH,
      chart.mrTargetBranch,
      title,
      files,
    )
    await createMergeRequest(
      gitlab,
      chart.projectId,
      UPDATE_BRANCH,
      chart.mrTargetBranch,
      title,
      await buildDescription(gitlab, plans),
    )
    logger.info({ ...logContext, result: "CREATED", apps: summary })
    return "CREATED"
  } catch (err) {
    if (isFatalError(err)) throw new FatalError(extractHttpStatus(err), err)
    logger.error({
      ...logContext,
      result: "ERROR",
      reason: `httpStatus: ${extractHttpStatus(err)}, message: ${toErrorMessage(err)}`,
    })
    return "ERROR"
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
 * 各アプリの最新タグを判定し、反映済みタグと異なるアプリだけを更新計画に含める。
 * 同じ values.yaml を参照する複数アプリの変更は、同一ファイル内に積み重ねてまとめる。
 */
async function buildChartUpdate(
  gitlab: GitlabClient,
  chartProjectId: ProjectId,
  baseBranch: BranchName,
  apps: readonly AppConfig[],
  dryRun: boolean,
): Promise<{ plans: AppUpdatePlan[]; files: FileUpdate[] }> {
  const contentCache = new Map<string, string>()
  const modifiedPaths = new Set<string>()

  async function loadContent(path: string): Promise<string> {
    const cached = contentCache.get(path)
    if (cached !== undefined) return cached
    const content = await getFileContent(gitlab, chartProjectId, path, baseBranch)
    if (content === undefined) {
      throw new Error(`values.yaml が見つかりません: ${path}`)
    }
    contentCache.set(path, content)
    return content
  }

  const plans: AppUpdatePlan[] = []

  for (const app of apps) {
    const latestTag = await resolveLatestTag(gitlab, app, dryRun)

    const content = await loadContent(app.chart.valuesPath)
    const currentTag = getValueAtPath(content, app.chart.imageTagKey)
    if (currentTag === latestTag.name) {
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
      previousTag: currentTag === undefined ? undefined : toTagName(currentTag),
      latestTag,
      pipelineUrl: pipeline?.webUrl,
      pipelineStatus: pipeline?.status,
    })
    contentCache.set(
      app.chart.valuesPath,
      setValueAtPath(content, app.chart.imageTagKey, latestTag.name),
    )
    modifiedPaths.add(app.chart.valuesPath)
  }

  const files: FileUpdate[] = [...modifiedPaths].map((filePath) => {
    const content = contentCache.get(filePath)
    if (content === undefined) {
      throw new Error(`internal error: missing content for ${filePath}`)
    }
    return { filePath, content }
  })

  return { plans, files }
}
