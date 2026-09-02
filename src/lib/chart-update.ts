import type { BranchName, ChartGroup, ChartUpdateResult } from "../types.js"
import { toBranchName } from "../types.js"
import { FatalError } from "../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../utils/http.js"
import { logger } from "../utils/logger.js"
import {
  type GitlabClient,
  commitFileUpdates,
  createMergeRequest,
  openMergeRequestExists,
} from "./gitlab.js"
import { buildDescription, buildTitle, describePlan } from "./mr-content.js"
import { buildChartUpdate } from "./update-plan.js"

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
 * 成功した分だけを反映せずチャートリポジトリ全体を ERROR として見送る
 * （更新計画自体の組み立ては `update-plan.ts` の `buildChartUpdate()` が担う）。
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
