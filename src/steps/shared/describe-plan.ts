import type { AppUpdatePlan, HelmTargetBranchUpdate } from "../../types/types.js"

/** 1アプリ分の更新計画を、ログ用のサマリに変換する（dryRun時とMR作成時の両方で使う） */
export function describePlan(plan: AppUpdatePlan): Record<string, unknown> {
  return {
    projectName: plan.app.projectName,
    latestTag: plan.latestTag.name,
    updates: plan.updates.map((update) => ({
      valuesPath: update.target.valuesPath,
      previousTagName: update.previousTagName,
    })),
  }
}

/** Helmの向き先ブランチの更新をログ用のサマリに変換する。設定ユニット単位なのでアプリ名は持たない */
export function describeHelmTargetBranchUpdates(
  updates: readonly HelmTargetBranchUpdate[],
): readonly Record<string, unknown>[] {
  return updates.map((update) => ({
    valuesPath: update.target.valuesPath,
    previousBranch: update.previousBranch,
    newBranch: update.newBranch,
  }))
}
