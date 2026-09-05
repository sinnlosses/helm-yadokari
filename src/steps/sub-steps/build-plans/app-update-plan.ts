import { type GitlabClient, getLatestPipelineForRef } from "../../../lib/gitlab/gitlab.js"
import type { AppConfig, AppUpdatePlan, BranchName, ProjectId } from "../../../types.js"
import { logger } from "../../../utils/logger.js"
import {
  type ApplyHelmTargetsAcc,
  applyHelmTargetBranchTargets,
} from "./helm-target-branch-target.js"
import { type ApplyTargetsAcc, applyImageTagTargets } from "./image-tag-target.js"
import { resolveLatestTag } from "./resolve-latest-tag.js"
import type { BuildChartUpdateAcc, LoadValuesYamlContent } from "./types.js"

/**
 * 1アプリ分の更新計画を組み立てる。手順は次の4つだけ:
 * 1. `resolveLatestTag()` — 追跡ブランチ由来の最新タグを判定（無ければ作成）
 * 2. `applyImageTagTargets()` — `app.chart`全箇所について、最新タグとの差分をチェック
 * 3. `applyHelmTargetBranchTargets()` — `app.helmTargetBranch`があれば、向き先ブランチの
 *    全箇所について設定値との差分をチェック
 * 4. 差分が1件も無ければSKIPPEDとしてログを出して終了、あれば最新パイプラインを取得して
 *    `AppUpdatePlan`を組み立てる
 */
export async function buildAppUpdatePlan(
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
  const afterChartTargets = await applyImageTagTargets(
    loadValuesYamlContent,
    latestTag.name,
    initialTargetsAcc,
    app.chart,
  )

  const helmTargetBranch = app.helmTargetBranch
  const initialHelmTargetsAcc: ApplyHelmTargetsAcc = {
    valuesYamlCache: afterChartTargets.valuesYamlCache,
    modifiedValuesPaths: afterChartTargets.modifiedValuesPaths,
    updates: [],
  }
  const afterHelmTargets = helmTargetBranch
    ? await applyHelmTargetBranchTargets(
        gitlab,
        chartProjectId,
        branchExistsCache,
        loadValuesYamlContent,
        helmTargetBranch,
        initialHelmTargetsAcc,
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
