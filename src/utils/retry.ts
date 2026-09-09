/**
 * 指数バックオフ付きの再試行。**どのエラーを再試行してよいかはこのファイルが決めない**
 * （`isRetryable`で受け取る）。特定の技術・外部システムに依存しないための形で、
 * GitLab APIに対する判定は`lib/gitlab/errors.ts`の`isRetryableError()`が持つ。
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
  options: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000 } = options
  return runAttempt(fn, isRetryable, 1, maxAttempts, baseDelayMs)
}

/**
 * `attempt`回目の試行を行い、リトライ可能なエラーなら指数バックオフを挟んで次の試行を
 * 再帰的に呼ぶ。リトライ不能なエラー・最終試行での失敗はそのままスローする。
 */
async function runAttempt<T>(
  fn: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
  attempt: number,
  maxAttempts: number,
  baseDelayMs: number,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!isRetryable(err) || attempt === maxAttempts) throw err
    await sleep(baseDelayMs * 2 ** (attempt - 1))
    return runAttempt(fn, isRetryable, attempt + 1, maxAttempts, baseDelayMs)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
