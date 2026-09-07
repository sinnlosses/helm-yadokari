import type { GitlabBatchCache } from "../../../lib/gitlab/batch-cache.js"
import type { AppUpdatePlan, HelmTargetBranchUpdate } from "../../../types/types.js"
import { withAppContext } from "../../shared/step-outcome.js"
import type { MrEntries } from "./shared/types.js"

/**
 * 1つのMRに載せる項目を抽出する。イメージタグはリンクに使うURLと最新パイプラインを解決して
 * 添える。向き先ブランチはclient単位で確定済みなのでそのまま渡す。
 */
export async function collectMrEntries(
  gitlabCache: GitlabBatchCache,
  plans: readonly AppUpdatePlan[],
  helmBranches: readonly HelmTargetBranchUpdate[],
): Promise<MrEntries> {
  const updatedPlans = plans.filter((plan) => plan.updates.length > 0)

  const imageTagsPerPlan = await Promise.all(
    updatedPlans.map(async (plan) =>
      withAppContext(plan.app.projectName, async () => {
        const [webUrl, pipeline] = await Promise.all([
          gitlabCache.getProjectWebUrl(plan.app.projectId),
          gitlabCache.getLatestPipelineForRef(plan.app.projectId, plan.latestTag.name),
        ])
        return plan.updates.map((update) => ({ plan, update, webUrl, pipeline }))
      }),
    ),
  )
  const imageTags = imageTagsPerPlan.flat()

  return { imageTags, helmBranches }
}
