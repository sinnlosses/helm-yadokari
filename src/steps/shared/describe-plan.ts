import type { AppUpdatePlan } from "../../types/types.js"

/** 1アプリ分の更新計画を、ログ用のサマリに変換する（dryRun時とMR作成時の両方で使う） */
export function describePlan(plan: AppUpdatePlan): Record<string, unknown> {
  return {
    projectName: plan.app.projectName,
    latestTag: plan.latestTag.name,
    updates: plan.updates.map((update) => ({
      valuesPath: update.target.valuesPath,
      previousTagName: update.previousTagName,
    })),
    helmTargetBranchUpdates: plan.helmTargetBranchUpdates.map((update) => ({
      valuesPath: update.target.valuesPath,
      previousBranch: update.previousBranch,
      newBranch: update.newBranch,
    })),
  }
}
