/**
 * 実行全体を止める例外。`context`はログ行にそのまま広げる項目で、文字列・数値だけを入れる。
 */
export class FatalError extends Error {
  constructor(
    public readonly httpStatus: number | undefined,
    cause: unknown,
    public readonly context: Readonly<Record<string, unknown>> = {},
  ) {
    super(cause instanceof Error ? cause.message : String(cause), { cause })
    this.name = "FatalError"
  }

  /** `extra`を足した新しい`FatalError`を返す。キーが重なったときは既にある値を残す */
  withContext(extra: Readonly<Record<string, unknown>>): FatalError {
    return new FatalError(this.httpStatus, this.cause, { ...extra, ...this.context })
  }
}

/** 例外として投げられた値を、そのままログに載せられる文字列にする */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * `error`のスタックに、`cause`のスタックを`Caused by: `でつないだ文字列を返す。
 * `Error`でない値を渡したときは undefined。
 *
 * `Error`でない`cause`は辿らず、中身も読まない（トークンを載せたリクエストを抱えていることがある）。
 */
export function toErrorStack(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined
  return collectErrorChain(error, new Set())
    .map((e) => e.stack ?? `${e.name}: ${e.message}`)
    .join("\nCaused by: ")
}

function collectErrorChain(error: Error, seen: ReadonlySet<Error>): readonly Error[] {
  if (seen.has(error)) return []
  const { cause } = error
  const rest = cause instanceof Error ? collectErrorChain(cause, new Set([...seen, error])) : []
  return [error, ...rest]
}
