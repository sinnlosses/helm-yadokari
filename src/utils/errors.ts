export class FatalError extends Error {
  constructor(
    public readonly httpStatus: number | undefined,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause), { cause })
    this.name = "FatalError"
  }
}

/** 例外として投げられた値を、そのままログに載せられる文字列にする */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
