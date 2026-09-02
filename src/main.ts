import pLimit from "p-limit"

import { loadConfig } from "./lib/config.js"
import { ACCESS_TOKEN, CONCURRENCY_LIMIT, CONFIG_PATH, DRY_RUN, GITLAB_URL } from "./lib/env.js"
import {
  type FileUpdate,
  type GitlabClient,
  commitFileUpdates,
  createClient,
  createMergeRequest,
  createTag,
  getFileContent,
  getLatestPipelineForRef,
  getProjectWebUrl,
  listTagNames,
  openMergeRequestExists,
} from "./lib/gitlab.js"
import { buildNewTag, findLatestParsedTag } from "./lib/tag.js"
import { getValueAtPath, setValueAtPath } from "./lib/values.js"
import type {
  AppConfig,
  AppUpdatePlan,
  BranchName,
  ChartGroup,
  ChartUpdateResult,
  ProjectId,
  RunResult,
} from "./types.js"
import { toBranchName, toTagName } from "./types.js"
import { FatalError } from "./utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "./utils/http.js"
import { logger } from "./utils/logger.js"
import { timed } from "./utils/timer.js"

/** 全chartリポジトリで共通の固定ブランチ名。chartリポジトリ単位で1つのMRに集約するため使い回す */
const UPDATE_BRANCH: BranchName = toBranchName("yadokari/update")

export async function run(): Promise<RunResult> {
  logger.info({
    event: "run_start",
    gitlabUrl: GITLAB_URL,
    dryRun: DRY_RUN,
    concurrencyLimit: CONCURRENCY_LIMIT,
    configPath: CONFIG_PATH,
  })
  const { value: resultCounts, duration_ms } = await timed(process)
  logger.info({ event: "summary", ...resultCounts })
  logger.info({ event: "run_end", duration_ms })
  return resultCounts.ERROR === 0 ? "SUCCESS" : "PARTIAL_FAILURE"
}

/**
 * 設定ファイルを読み込み、全chartリポジトリに対して更新要否判定とMR作成を並列実行する。
 * DRY_RUN=true のときはブランチ作成・MR作成をせず、更新予定の内容のみログ出力する。
 */
export async function process(): Promise<Record<ChartUpdateResult, number>> {
  const gitlab = createClient(GITLAB_URL, ACCESS_TOKEN)
  const { chartGroups } = loadConfig(CONFIG_PATH)

  const limit = pLimit(CONCURRENCY_LIMIT)
  const tasks = chartGroups.map((chartGroup) =>
    limit(async () => {
      try {
        return await updateChartGroupIfNeeded(gitlab, chartGroup, DRY_RUN)
      } catch (err) {
        // FatalError を検出した瞬間にキューをクリアし、後続タスクが開始されるのを防ぐ。
        if (err instanceof FatalError) limit.clearQueue()
        throw err
      }
    }),
  )

  const results = await Promise.all(tasks)

  return results.reduce<Record<ChartUpdateResult, number>>(
    (counts, result) => ({ ...counts, [result]: counts[result] + 1 }),
    { CREATED: 0, SKIPPED: 0, ERROR: 0 },
  )
}

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
 * 各アプリの最新タグを判定し、反映済みタグと異なるアプリだけを更新計画に含める。
 * 同じ values.yaml を参照する複数アプリの変更は、同一ファイル内に積み重ねてまとめる。
 *
 * 追跡ブランチ由来のタグが1件も見つからないアプリについては、このツール自身が
 * 追跡ブランチの最新コミットに対して新しいタグを作成し、それを最新タグとして扱う
 * （dryRun のときは実際の作成はスキップし、作成予定のタグ名だけを使う）。
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
    const tags = await listTagNames(gitlab, app.projectId)
    let latestTag = findLatestParsedTag(tags, app.branchToSync)
    if (!latestTag) {
      latestTag = buildNewTag(app.branchToSync, new Date())
      if (!dryRun) {
        await createTag(gitlab, app.projectId, latestTag.name, app.branchToSync)
      }
      logger.info({
        event: "create_tag",
        projectName: app.projectName,
        branch: app.branchToSync,
        tag: latestTag.name,
        dryRun,
      })
    }

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

function describePlan(plan: AppUpdatePlan): Record<string, unknown> {
  return {
    projectName: plan.app.projectName,
    previousTag: plan.previousTag,
    latestTag: plan.latestTag.name,
  }
}

function buildTitle(plans: readonly AppUpdatePlan[]): string {
  return `chore: update ${plans.length} app image tag(s)`
}

async function buildDescription(
  gitlab: GitlabClient,
  plans: readonly AppUpdatePlan[],
): Promise<string> {
  const webUrlCache = new Map<ProjectId, string>()
  const sections: string[] = []

  for (const plan of plans) {
    let webUrl = webUrlCache.get(plan.app.projectId)
    if (webUrl === undefined) {
      webUrl = await getProjectWebUrl(gitlab, plan.app.projectId)
      webUrlCache.set(plan.app.projectId, webUrl)
    }
    const tagUrl = `${webUrl}/-/tags/${encodeURIComponent(plan.latestTag.name)}`
    const pipelineLine = plan.pipelineUrl
      ? `- パイプライン: [${plan.pipelineStatus ?? "unknown"}](${plan.pipelineUrl})`
      : "- パイプライン: (見つかりません)"
    sections.push(
      [
        `### ${plan.app.projectName}`,
        `- タグ: ${plan.previousTag ?? "(未設定)"} → [${plan.latestTag.name}](${tagUrl})`,
        `- 打刻日時: ${plan.latestTag.builtAt.toISOString()}`,
        pipelineLine,
      ].join("\n"),
    )
  }

  return sections.join("\n\n")
}
