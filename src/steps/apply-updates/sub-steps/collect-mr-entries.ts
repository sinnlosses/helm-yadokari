import type { GitlabBatchCache } from "../../../lib/gitlab/batch-cache.js"
import { type GitlabClient, getProjectWebUrls } from "../../../lib/gitlab/gitlab.js"
import type {
  AppUpdatePlan,
  GitLabUrl,
  HelmTargetBranchUpdate,
  ProjectId,
} from "../../../types/types.js"
import { withAppContext } from "../../shared/step-outcome.js"
import type { MrEntries } from "./shared/types.js"

/**
 * 1つのMRに載せる項目を抽出する。イメージタグはリンクに使うURLと最新パイプラインを解決して
 * 添える。向き先ブランチはclient単位で確定済みなのでそのまま渡す。
 */
export async function collectMrEntries(
  gitlab: GitlabClient,
  gitlabCache: GitlabBatchCache,
  plans: readonly AppUpdatePlan[],
  helmBranches: readonly HelmTargetBranchUpdate[],
): Promise<MrEntries> {
  const updatedPlans = plans.filter((plan) => plan.updates.length > 0)
  const updatedProjectIds = updatedPlans.map((plan) => plan.app.projectId)
  const webUrls = await getProjectWebUrls(gitlab, updatedProjectIds)

  const imageTagsPerPlan = await Promise.all(
    updatedPlans.map(async (plan) =>
      withAppContext(plan.app.projectName, async () => {
        const webUrl = resolveWebUrl(webUrls, plan.app.projectId)
        const pipeline = await gitlabCache.getLatestPipelineForRef(
          plan.app.projectId,
          plan.latestTag.name,
        )
        return plan.updates.map((update) => ({ plan, update, webUrl, pipeline }))
      }),
    ),
  )
  const imageTags = imageTagsPerPlan.flat()

  return { imageTags, helmBranches }
}

/**
 * 解決を依頼した`projectId`はすべて解決済みである前提。該当する`projectId`が
 * 無い場合はその前提が崩れているためエラーにする。
 */
function resolveWebUrl(
  webUrls: ReadonlyMap<ProjectId, GitLabUrl>,
  projectId: ProjectId,
): GitLabUrl {
  const webUrl = webUrls.get(projectId)
  if (webUrl === undefined) {
    throw new Error(`web URLが解決されていないprojectIdです: ${projectId}`)
  }
  return webUrl
}
