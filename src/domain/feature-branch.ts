import type { BranchName, ClientId, TenantId } from "../types/types.js"
import { toBranchName } from "../types/types.js"
import { formatClientRef } from "./client-ref.js"

const FEATURE_BRANCH_PREFIX = "feature/yadokari/"

/**
 * 1つの`(chartリポジトリ, tenantId, clientId)`分の更新に使う固定ブランチ名。
 * 同じGitLabプロジェクト内で複数のtenantId/clientIdのMRが共存するため、IDをブランチ名に
 * 含めて分離する。
 */
export function buildFeatureBranch(tenantId: TenantId, clientId: ClientId): BranchName {
  return toBranchName(`${FEATURE_BRANCH_PREFIX}${formatClientRef(tenantId, clientId)}`)
}

/**
 * このツールが作った固定ブランチかどうか。GitLab上のブランチ・MRの一覧から自分が作った
 * ものだけを選ぶ用途（`scripts/smoke/`の後片付け）で使う。
 */
export function isFeatureBranch(branchName: string): boolean {
  return branchName.startsWith(FEATURE_BRANCH_PREFIX)
}
