import type { BranchName, ConfigUnitPath } from "../types/types.js"
import { toBranchName } from "../types/types.js"

const FEATURE_BRANCH_PREFIX = "feature/yadokari/"

/**
 * 1つの`(chartリポジトリ, 設定ユニット)`分の更新に使う固定ブランチ名。
 * 同じGitLabプロジェクト内で複数の設定ユニットのMRが共存するため、unitPathをブランチ名に
 * 含めて分離する。
 */
export function buildFeatureBranch(unitPath: ConfigUnitPath): BranchName {
  return toBranchName(`${FEATURE_BRANCH_PREFIX}${unitPath}`)
}

/**
 * このツールが作った固定ブランチかどうか。GitLab上のブランチ・MRの一覧から自分が作った
 * ものだけを選び出す用途で使う。
 */
export function isFeatureBranch(branchName: string): boolean {
  return branchName.startsWith(FEATURE_BRANCH_PREFIX)
}
