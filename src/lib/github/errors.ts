// Octokitが投げるエラーを、このツールのエラー方針（`docs/architecture.md`「エラーは
// 『fatalは例外・それ以外は戻り値』の2チャネル」）に翻訳する。**Octokitのエラーの形を
// 知っているのはこのファイルだけ**で、`utils/`にはこの知識を置かない（原則2）。
//
// @octokit/request-error の `RequestError` は HTTP ステータスを `status` プロパティに直接持つ。
// gitbeakerは `cause.response.status` の位置に持つため、`lib/gitlab/errors.ts` は流用できない。

// 再試行してよいステータス。429は一次・二次のレート制限、502/503/504は一時的なゲートウェイ障害。
// GitHubはレート制限を403で返すこともあるが、403は権限不足とも重なるため、ここでは区別しない
// （`retry-after` ヘッダを見た振り分けは、エラー分類をプラットフォームごとに選ぶ仕組みと
// 合わせて決める）。
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504])

export function extractHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined
  if (!hasKey(error, "status")) return undefined
  const { status } = error
  return typeof status === "number" ? status : undefined
}

/**
 * 対象が存在しないことを表すエラーか。GitHubはトークンに権限が無いリソースも404で返すため、
 * この判定が true でも「存在しない」と「見えない」は区別できない。
 */
export function isNotFoundError(error: unknown): boolean {
  return extractHttpStatus(error) === 404
}

/**
 * このエラーを再試行してよいか。判定に使うステータスの選定はGitHub APIに対する方針なので、
 * 汎用の`utils/retry.ts`ではなくここが持つ（`withRetry()`にはこの関数を渡す）。
 */
export function isRetryableError(error: unknown): boolean {
  const status = extractHttpStatus(error)
  return status !== undefined && RETRYABLE_STATUSES.has(status)
}

function hasKey<K extends string>(obj: object, key: K): obj is Record<K, unknown> {
  return key in obj
}
