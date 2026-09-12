// Octokitが投げるエラーを、このツールのエラー方針（`docs/architecture.md`「エラーは
// 『fatalは例外・それ以外は戻り値』の2チャネル」）に翻訳する。**Octokitのエラーの形を
// 知っているのはこのファイルだけ**で、`utils/`にはこの知識を置かない（原則2）。
//
// @octokit/request-error の `RequestError` は HTTP ステータスを `status` プロパティに、
// レスポンスヘッダを `response.headers`（キーは小文字）に持つ。gitbeakerは
// `cause.response.status` の位置に持つため、`lib/gitlab/errors.ts` は流用できない。
//
// ネットワーク障害は @octokit/request が `RequestError`（status 500）に包み直すため、
// 5xxの経路でfatalになる。包まれない素の `TypeError: fetch failed` が出てくる場合に備えて
// `code` も見る（GitLab側と同じ判定）。

// 一時的なゲートウェイ障害を表すステータス。待てば直る相手なので指数バックオフで再試行する。
const RETRYABLE_STATUSES = new Set([502, 503, 504])

// GitHubが一次・二次のレート制限を伝えるステータス。403は権限不足でも返るため、
// この2つは「レート制限かもしれない」ところまでしか分からず、`retry-after` の有無で振り分ける。
// https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
const RATE_LIMIT_STATUSES = new Set([403, 429])

// `retry-after` に従って待てる上限。GitHubは「このヘッダがあるなら、その秒数が経つまで再試行して
// はならない」としているので、指数バックオフ（1s/2s/4s）で上書きはできず、指定された秒数を待つか
// 再試行を諦めるかの二択になる。一次レート制限の枯渇ではリセットまで最大1時間になりうるため、
// 待てない長さを指定されたら`isRetryableError()`が false を返して該当設定ユニットをERRORにする。
// 二次レート制限は60秒程度で解けるので、その範囲だけ待つ。
const MAX_RETRY_AFTER_MS = 60_000

export function extractHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined
  if (!hasKey(error, "status")) return undefined
  const { status } = error
  return typeof status === "number" ? status : undefined
}

/**
 * 対象が存在しないことを表すエラーか。
 *
 * **GitHubはトークンに権限が無いリソースも404で返す**ため、この判定が true でも「存在しない」と
 * 「見えない」は区別できない。実装では吸収せず（区別するには権限の問い合わせを別途足すことになり、
 * 1関数＝1 API呼び出しの形が崩れる）、404を既定値に読み替えた後の書き込みが403/404で失敗し、
 * その設定ユニットが`ERROR`としてメッセージ付きでログに残ることに委ねる。
 */
export function isNotFoundError(error: unknown): boolean {
  return extractHttpStatus(error) === 404
}

/**
 * 実行全体を止めるべきエラーか。401（認証失敗）と5xx（サーバー障害）は全設定ユニットに影響する。
 * DNS解決失敗・接続拒否・タイムアウトなどネットワーク障害も同じ扱いにする。
 *
 * **403はfatalにしない。** 権限不足なら他の設定ユニットは処理できるし、レート制限なら
 * `isRetryableError()`側で待って再試行する（待てない長さならその設定ユニットだけERRORになる）。
 */
export function isFatalError(error: unknown): boolean {
  const status = extractHttpStatus(error)
  if (status !== undefined) return isFatalStatus(status)
  const code = extractErrorCode(error)
  return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT"
}

/**
 * このエラーを再試行してよいか。判定に使うステータスの選定はGitHub APIに対する方針なので、
 * 汎用の`utils/retry.ts`ではなくここが持つ（`withRetry()`にはこの関数を渡す）。
 *
 * 403と429は**`retry-after`が付いているかどうか**でレート制限と権限不足を分ける。付いていない403は
 * 権限不足とみなして再試行しない。一次レート制限の枯渇（`x-ratelimit-remaining: 0`）もここに
 * 落ちるが、リセットは数分〜1時間先で`MAX_RETRY_AFTER_MS`を超えるため、そのヘッダを読んでも
 * 行き先は同じ`ERROR`になる。判定の分岐を増やさないために読まない。
 */
export function isRetryableError(error: unknown): boolean {
  const status = extractHttpStatus(error)
  if (status === undefined) return false
  if (RETRYABLE_STATUSES.has(status)) return true
  if (!RATE_LIMIT_STATUSES.has(status)) return false
  const delayMs = retryAfterMs(error)
  // 429はレート制限以外では返らないので、待ち時間の指定が無くても指数バックオフで再試行してよい。
  if (delayMs === undefined) return status === 429
  return delayMs <= MAX_RETRY_AFTER_MS
}

/**
 * `retry-after`ヘッダが指定する待ち時間（ミリ秒）。指定が無い・数値として読めない場合は undefined。
 * `withRetry()`に渡すと、この値がある回だけ指数バックオフの代わりに使われる。
 */
export function retryAfterMs(error: unknown): number | undefined {
  const raw = readRetryAfterHeader(error)
  if (raw === undefined) return undefined
  // GitHubは秒数で返す。RFCが許すHTTP-dateなど数値で読めない値は尊重しようがないので無視する。
  if (typeof raw === "string" && raw.trim() === "") return undefined
  const seconds = Number(raw)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined
}

function hasKey<K extends string>(obj: object, key: K): obj is Record<K, unknown> {
  return key in obj
}

function isFatalStatus(status: number): boolean {
  return status === 401 || status >= 500
}

/**
 * エラー自身の `code`、無ければ `cause` の `code` を返す。fetch はネットワーク障害を
 * `TypeError: fetch failed` として投げ、`ENOTFOUND` などの実際の `code` は `cause` に入れるため。
 * `cause`は1段だけ辿る。際限なく辿ると、無関係な内側のエラーの`code`で実行全体を止める危険がある。
 */
function extractErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined
  return readCode(error) ?? readCode(error.cause)
}

function readCode(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined
  if (!hasKey(value, "code")) return undefined
  const { code } = value
  return typeof code === "string" ? code : undefined
}

/** `RequestError.response.headers` の `retry-after` を、値の型を確かめながら取り出す */
function readRetryAfterHeader(error: unknown): string | number | undefined {
  if (!(error instanceof Error)) return undefined
  if (!hasKey(error, "response")) return undefined
  const { response } = error
  if (typeof response !== "object" || response === null) return undefined
  if (!hasKey(response, "headers")) return undefined
  const { headers } = response
  if (typeof headers !== "object" || headers === null) return undefined
  if (!hasKey(headers, "retry-after")) return undefined
  const value = headers["retry-after"]
  return typeof value === "string" || typeof value === "number" ? value : undefined
}
