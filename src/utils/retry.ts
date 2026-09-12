/** `withRetry()`が1回の呼び出しのあいだ持ち回る設定。既定値を埋めた後の形 */
type RetryPolicy = {
  readonly isRetryable: (error: unknown) => boolean
  readonly retryDelayMs: ((error: unknown) => number | undefined) | undefined
  readonly maxAttempts: number
  readonly baseDelayMs: number
}

/**
 * 指数バックオフ付きの再試行。**どのエラーを再試行してよいかはこのファイルが決めない**
 * （`isRetryable`で受け取る）。特定の技術・外部システムに依存しないための形で、
 * 各APIに対する判定は`lib/gitlab/errors.ts`・`lib/github/errors.ts`の`isRetryableError()`が持つ。
 *
 * `retryDelayMs`を渡すと、エラーが待ち時間を指定してきた回だけ指数バックオフの代わりに
 * その値を使う（GitHubの`retry-after`のように、サーバー側が待つべき秒数を伝えてくる場合）。
 * 何を読んで何ミリ秒にするかは渡す側が決めるので、ここは外部システムを知らないままでいられる。
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
  options: {
    maxAttempts?: number
    baseDelayMs?: number
    retryDelayMs?: (error: unknown) => number | undefined
  } = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, retryDelayMs } = options
  return runAttempt(fn, { isRetryable, retryDelayMs, maxAttempts, baseDelayMs }, 1)
}

/**
 * `attempt`回目の試行を行い、リトライ可能なエラーなら待ち時間を挟んで次の試行を
 * 再帰的に呼ぶ。リトライ不能なエラー・最終試行での失敗はそのままスローする。
 */
async function runAttempt<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy,
  attempt: number,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!policy.isRetryable(err) || attempt === policy.maxAttempts) throw err
    await sleep(nextDelayMs(err, policy, attempt))
    return runAttempt(fn, policy, attempt + 1)
  }
}

function nextDelayMs(err: unknown, policy: RetryPolicy, attempt: number): number {
  return policy.retryDelayMs?.(err) ?? policy.baseDelayMs * 2 ** (attempt - 1)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
