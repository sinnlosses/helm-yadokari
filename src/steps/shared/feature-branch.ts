import type { BranchName, ClientId, TenantId } from "../../types/types.js"
import { toBranchName } from "../../types/types.js"

/**
 * 1つの`(chartリポジトリ, tenantId, clientId)`分の更新に使う固定ブランチ名。
 * 同じGitLabプロジェクト内で複数のtenantId/clientIdのMRが共存するため、IDをブランチ名に
 * 含めて分離する。
 */
export function buildFeatureBranch(tenantId: TenantId, clientId: ClientId): BranchName {
  return toBranchName(`feature/yadokari/${tenantId}/${clientId}`)
}
