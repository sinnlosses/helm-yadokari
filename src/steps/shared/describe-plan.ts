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
    readonly currentTag: TagName
  }[]
}

/** `describeHelmTargetBranchUpdates()`が組み立てる、向き先ブランチの更新1件分のログ表現 */
export type HelmTargetBranchLogSummary = {
  readonly valuesPath: ValuesPath
  readonly currentBranch: BranchName
  readonly newBranch: BranchName
}

/** 1アプリ分の更新計画を、ログ用のサマリに変換する（dryRun時とMR作成時の両方で使う） */
export function describePlan(plan: AppUpdatePlan): PlanLogSummary {
  return {
    projectName: plan.app.projectName,
    latestTag: plan.latestTag.name,
    updates: plan.updates.map((update) => ({
      valuesPath: update.location.valuesPath,
      currentTag: update.currentTag,
    })),
  }
}

/**
 * Helmの向き先ブランチの更新をログ用のサマリに変換する。設定ユニット単位なのでアプリ名は持たない。
 * `branchName`（`ConfigUnit.helmTargetBranch.branchName`）は全箇所で共通の書き込み後の値で、
 * 1行だけで前→後が読めるようサマリの各件にも入れる。
 */
export function describeHelmTargetBranchUpdates(
  updates: readonly HelmTargetBranchUpdate[],
  branchName: BranchName,
): readonly HelmTargetBranchLogSummary[] {
  return updates.map((update) => ({
    valuesPath: update.location.valuesPath,
    currentBranch: update.currentBranch,
    newBranch: branchName,
  }))
}
