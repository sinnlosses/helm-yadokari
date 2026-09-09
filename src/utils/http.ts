// @gitbeaker/rest がスローするエラー構造 (Error → cause.response.status)、その内部の fetch が
// ネットワーク障害時に投げる構造 (TypeError: fetch failed → cause.code)、タイムアウト時の
// エラー名 (GitbeakerTimeoutError)、内部リトライを使い切ったときのエラー名と
// そのメッセージ (GitbeakerRetryError → "last status code: N") に依存している。
// ライブラリのメジャーバージョンアップ時はこれらが変わる可能性がある。

// gitbeaker が queryTimeout の超過時に投げるエラーの名前。クラスの `instanceof` ではなく名前で
// 判定するのは、@gitbeaker/requester-utils の実体が二重に解決されると `instanceof` が偽になる
// ため（gitbeaker はコンストラクタでこの名前を明示的に設定している）。
const GITBEAKER_TIMEOUT_ERROR_NAME = "GitbeakerTimeoutError"

// gitbeaker が内部リトライ（429と502のみ、最大10回）を使い切ったときに投げるエラーの名前と、
// そのメッセージからHTTPステータスを読むためのパターン。gitbeaker はこのエラーに `cause` を
// 付けないため、ステータスはメッセージにしか残らない。
const GITBEAKER_RETRY_ERROR_NAME = "GitbeakerRetryError"
const EXHAUSTED_RETRY_STATUS_PATTERN = /last status code: (\d+)/

export function extractHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined
  const { cause } = error
  if (typeof cause !== "object" || cause === null) return undefined
  if (!hasKey(cause, "response")) return undefined
  const { response } = cause
  if (typeof response !== "object" || response === null) return undefined
  if (!hasKey(response, "status")) return undefined
  const { status } = response
  return typeof status === "number" ? status : undefined
}

export function isNotFoundError(error: unknown): boolean {
  return extractHttpStatus(error) === 404
}

// HTTP ステータスのほか、DNS 解決失敗・接続拒否・リクエストのタイムアウトなどネットワーク障害も
// 全プロジェクトに影響する致命的エラーとして扱う。gitbeaker の queryTimeout 超過
// (`GitbeakerTimeoutError`) は HTTP ステータスも `code` も持たないため、名前で判定する。
export function isFatalError(error: unknown): boolean {
  const status = extractHttpStatus(error)
  if (status !== undefined) return isFatalStatus(status)
  if (!(error instanceof Error)) return false
  if (error.name === GITBEAKER_TIMEOUT_ERROR_NAME) return true
  const exhaustedStatus = extractExhaustedRetryStatus(error)
  if (exhaustedStatus !== undefined) return isFatalStatus(exhaustedStatus)
  const code = extractErrorCode(error)
  return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT"
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function hasKey<K extends string>(obj: object, key: K): obj is Record<K, unknown> {
  return key in obj
}

// 403 はトークンが特定プロジェクトへのアクセス権を持たない場合に発生しうるため fatal 扱いしない。
// 401（認証失敗）と 5xx（サーバー障害）は全プロジェクトに影響するため即時終了する。
function isFatalStatus(status: number): boolean {
  return status === 401 || status >= 500
}

/**
 * エラー自身の `code`、無ければ `cause` の `code` を返す。fetch はネットワーク障害を
 * `TypeError: fetch failed` として投げ、`ENOTFOUND` などの実際の `code` は `cause` に入れるため。
 * `extractHttpStatus()` と同様に `cause` は1段だけ辿る。これで足りるのは、致命的エラーを包み直さない
 * ことを `rethrowWithAppContext()` が保証しているため。際限なく辿ると、無関係な内側のエラーの
 * `code` で実行全体を止める危険がある。
 */
function extractErrorCode(error: Error): string | undefined {
  return readCode(error) ?? readCode(error.cause)
}

function readCode(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined
  if (!hasKey(value, "code")) return undefined
  const { code } = value
  return typeof code === "string" ? code : undefined
}

/**
 * gitbeakerが内部リトライを使い切ったときのエラーから、最後のHTTPステータスを読む。
 * このエラーは`cause`を持たずメッセージにしかステータスが残らないため、文字列から読む。
 * 読めなければ`undefined`を返す（fatalに昇格させない安全側に倒す）。
 *
 * gitbeakerが内部リトライするのは429と502だけなので、ここで拾えるのは実質その2つ。
 * 502は5xxとして即時終了になり、429は該当chartAndAppsの`ERROR`のままになる。
 *
 * **この値は`isFatalError()`の判定にだけ使い、`utils/retry.ts`のリトライ判定には渡さない。**
 * gitbeakerが既に10回試したあとなので、こちらから追加で叩く相手ではない。
 */
function extractExhaustedRetryStatus(error: Error): number | undefined {
  if (error.name !== GITBEAKER_RETRY_ERROR_NAME) return undefined
  const digits = EXHAUSTED_RETRY_STATUS_PATTERN.exec(error.message)?.[1]
  return digits === undefined ? undefined : Number(digits)
}
