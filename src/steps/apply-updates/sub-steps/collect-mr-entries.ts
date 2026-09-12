import type { PlatformAdapterWithCachedReads } from "../../../lib/platform/cached-reads.js"
import type { AppUpdatePlan, BranchName, HelmBranchRefUpdate } from "../../../types/types.js"
import { withAppContext } from "../../shared/step-outcome.js"
import type { MrEntries } from "./shared/types.js"

/**
 * 1つのMRに載せる項目を抽出する。イメージタグはリンクに使うURLと最新パイプラインを解決して
 * 添える。向き先ブランチは設定ユニット単位で確定済みなのでそのまま渡す。
 * `helmBranchRef`は`ConfigUnit.helm.branchRef`（全箇所で共通の書き込み後の値）。
 */
export async function collectMrEntries(
  adapter: PlatformAdapterWithCachedReads,
  plans: readonly AppUpdatePlan[],
  helmBranches: readonly HelmBranchRefUpdate[],
  helmBranchRef: BranchName,
): Promise<MrEntries> {
  const imageTagsPerPlan = await Promise.all(
    plans.map(async (plan) =>
      withAppContext(adapter, plan.app.projectName, async () => {
        const [webUrl, pipeline] = await Promise.all([
          adapter.cached.getProjectWebUrl(plan.app.projectId),
          adapter.cached.getLatestPipelineForRef(plan.app.projectId, plan.latestTag.name),
        ])
        return plan.updates.map((update) => ({ plan, update, webUrl, pipeline }))
      }),
    ),
  )
  const imageTags = imageTagsPerPlan.flat()

  return { imageTags, helmBranches, helmBranchRef }
}
