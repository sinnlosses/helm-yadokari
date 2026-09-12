import type { GitlabBatchCache } from "../../../lib/gitlab/batch-cache.js"
import type { AppUpdatePlan, BranchName, HelmTargetBranchUpdate } from "../../../types/types.js"
import { withAppContext } from "../../shared/step-outcome.js"
import type { MrEntries } from "./shared/types.js"

/**
 * 1つのMRに載せる項目を抽出する。イメージタグはリンクに使うURLと最新パイプラインを解決して
 * 添える。向き先ブランチは設定ユニット単位で確定済みなのでそのまま渡す。
 * `helmBranchName`は`ConfigUnit.helmTargetBranch.branchName`（全箇所で共通の書き込み後の値）。
 */
export async function collectMrEntries(
  gitlabCache: GitlabBatchCache,
  plans: readonly AppUpdatePlan[],
  helmBranches: readonly HelmTargetBranchUpdate[],
  helmBranchName: BranchName,
): Promise<MrEntries> {
  const imageTagsPerPlan = await Promise.all(
    plans.map(async (plan) =>
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

  return { imageTags, helmBranches, helmBranchName }
}
