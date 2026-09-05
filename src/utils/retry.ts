import { extractHttpStatus } from "./http.js"

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504])

function isRetryable(error: unknown): boolean {
  const status = extractHttpStatus(error)
  return status !== undefined && RETRYABLE_STATUSES.has(status)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * `attempt`回目の試行を行い、リトライ可能なエラーなら指数バックオフを挟んで次の試行を
 * 再帰的に呼ぶ。リトライ不能なエラー・最終試行での失敗はそのままスローする。
 */
async function runAttempt<T>(
  fn: () => Promise<T>,
  attempt: number,
  maxAttempts: number,
  baseDelayMs: number,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!isRetryable(err) || attempt === maxAttempts) throw err
    await sleep(baseDelayMs * 2 ** (attempt - 1))
    return runAttempt(fn, attempt + 1, maxAttempts, baseDelayMs)
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000 } = options
  return runAttempt(fn, 1, maxAttempts, baseDelayMs)
}
