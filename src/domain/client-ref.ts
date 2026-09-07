import type { ClientId, TargetClient, TenantId } from "../types/types.js"
import { toClientId, toTenantId } from "../types/types.js"

// `(tenantId, clientId)`の組を1つの文字列 `<tenantId>/<clientId>` で表す規則。
// 固定ブランチ名・MRタイトル・`TARGET_CLIENTS`環境変数・設定エラーメッセージが同じ表記を
// 共有するため、組み立てと分解を1箇所に置く。

const SEPARATOR = "/"

export function formatClientRef(tenantId: TenantId, clientId: ClientId): string {
  return `${tenantId}${SEPARATOR}${clientId}`
}

/** `formatClientRef()`の逆変換。この表記になっていない文字列には undefined を返す */
export function parseClientRef(raw: string): TargetClient | undefined {
  const parts = raw.split(SEPARATOR)
  const [tenantId, clientId] = parts
  if (parts.length !== 2 || !tenantId || !clientId) return undefined
  return { tenantId: toTenantId(tenantId), clientId: toClientId(clientId) }
}
