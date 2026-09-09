import type {
  AppUpdatePlan,
  BranchName,
  HelmTargetBranchUpdate,
  ProjectName,
  TagName,
  ValuesPath,
} from "../../types/types.js"

/** `describePlan()`が組み立てる、1アプリ分の更新計画のログ表現 */
export type PlanLogSummary = {
  readonly projectName: ProjectName
  readonly latestTag: TagName
  readonly updates: readonly {
    readonly valuesPath: ValuesPath
    readonly previousTagName: TagName
  }[]
}

/** `describeHelmTargetBranchUpdates()`が組み立てる、向き先ブランチの更新1件分のログ表現 */
export type HelmTargetBranchLogSummary = {
  readonly valuesPath: ValuesPath
  readonly previousBranch: BranchName
  readonly newBranch: BranchName
}

/** 1アプリ分の更新計画を、ログ用のサマリに変換する（dryRun時とMR作成時の両方で使う） */
export function describePlan(plan: AppUpdatePlan): PlanLogSummary {
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
): readonly HelmTargetBranchLogSummary[] {
  return updates.map((update) => ({
    valuesPath: update.target.valuesPath,
    previousBranch: update.previousBranch,
    newBranch: update.newBranch,
  }))
}
