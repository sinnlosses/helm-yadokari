import { type GitlabClient, getProjectWebUrls } from "../../../lib/gitlab/gitlab.js"
import type {
  AppUpdatePlan,
  GitLabUrl,
  HelmTargetBranchUpdate,
  ProjectId,
} from "../../../types/types.js"
import type { MrEntries } from "./shared/types.js"

/**
 * 1つのMRに載せる項目を計画から選び出す。イメージタグはリンクに使うweb URLを解決して
 * 添え、向き先ブランチは書き込み先単位で一意にする。
 */
export async function collectMrEntries(
  gitlab: GitlabClient,
  plans: readonly AppUpdatePlan[],
): Promise<MrEntries> {
  // 表に行を持つplanだけがweb URLを必要とする（向き先ブランチの表にはリンクが無い）
  const plansWithRows = plans.filter((plan) => plan.updates.length > 0)
  const webUrls = await getProjectWebUrls(
    gitlab,
    plansWithRows.map((plan) => plan.app.projectId),
  )

  return {
    imageTags: plansWithRows.flatMap((plan) => {
      const webUrl = resolveWebUrl(webUrls, plan.app.projectId)
      return plan.updates.map((update) => ({ plan, update, webUrl }))
    }),
    helmBranches: uniqueHelmTargetBranchUpdates(plans),
  }
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

/**
 * 向き先ブランチの更新は`helm.chart[]`をvaluesPath一致でアプリに振り分けた結果なので、
 * 同じ書き込み先が複数アプリの計画に現れうる。件数・表示は書き込み先（valuesPath+anchorName）
 * 単位で一意にする
 */
function uniqueHelmTargetBranchUpdates(
  plans: readonly AppUpdatePlan[],
): readonly HelmTargetBranchUpdate[] {
  const byTarget = new Map(
    plans.flatMap((plan) =>
      plan.helmTargetBranchUpdates.map((update): [string, HelmTargetBranchUpdate] => [
        `${update.target.valuesPath}#${update.target.anchorName}`,
        update,
      ]),
    ),
  )
  return [...byTarget.values()]
}
