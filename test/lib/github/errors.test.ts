import { describe, expect, it } from "vitest"

import {
  extractHttpStatus,
  isFatalError,
  isNotFoundError,
  isRetryableError,
  retryAfterMs,
} from "../../../src/lib/github/errors.js"

/**
 * Octokitの`RequestError`が実際に持つ形。`@octokit/request-error`は直接の依存ではないので
 * クラスは import せず、依存している形（`status`とレスポンスヘッダ）だけを組み立てる。
 */
const makeHttpError = (status: number, headers: Record<string, string | number> = {}): Error =>
  Object.assign(new Error("HTTP Error"), { status, response: { status, headers } })

const makeNetworkError = (code: string): Error =>
  new TypeError("fetch failed", { cause: Object.assign(new Error(`connect ${code}`), { code }) })

describe("extractHttpStatus", () => {
  it("Error でない値は undefined を返す", () => {
    expect(extractHttpStatus("string")).toBeUndefined()
    expect(extractHttpStatus(null)).toBeUndefined()
    expect(extractHttpStatus(42)).toBeUndefined()
  })

  it("status を持たない Error は undefined を返す", () => {
    expect(extractHttpStatus(new Error("oops"))).toBeUndefined()
  })

  it("status が数値でないとき undefined を返す", () => {
    expect(extractHttpStatus(Object.assign(new Error("oops"), { status: "404" }))).toBeUndefined()
  })

  it("status から HTTP ステータスコードを返す", () => {
    expect(extractHttpStatus(makeHttpError(404))).toBe(404)
    expect(extractHttpStatus(makeHttpError(401))).toBe(401)
    expect(extractHttpStatus(makeHttpError(500))).toBe(500)
  })

  it("gitbeaker形の cause.response.status は読まない", () => {
    // GitLab版とGitHub版でエラーの形が違うことの確認。取り違えるとすべての分類が黙って外れる
    expect(
      extractHttpStatus(new Error("oops", { cause: { response: { status: 404 } } })),
    ).toBeUndefined()
  })
})

describe("isNotFoundError", () => {
  it("404 エラーのとき true を返す", () => {
    // GitHubは権限の無いリソースも404で返すため、true でも「存在しない」と断定はできない
    expect(isNotFoundError(makeHttpError(404))).toBe(true)
  })

  it("404 以外の HTTP エラーのとき false を返す", () => {
    expect(isNotFoundError(makeHttpError(401))).toBe(false)
    expect(isNotFoundError(makeHttpError(403))).toBe(false)
    expect(isNotFoundError(makeHttpError(500))).toBe(false)
  })

  it("Error でない値のとき false を返す", () => {
    expect(isNotFoundError("Not Found")).toBe(false)
    expect(isNotFoundError(null)).toBe(false)
  })
})

describe("isFatalError", () => {
  it("HTTP 401 エラーのとき true を返す", () => {
    expect(isFatalError(makeHttpError(401))).toBe(true)
  })

  it.each([500, 502, 503, 504])("HTTP %s エラーのとき true を返す", (status) => {
    expect(isFatalError(makeHttpError(status))).toBe(true)
  })

  it("ネットワーク障害を包み直した 500 のとき true を返す", () => {
    // @octokit/request は fetch の失敗を status 500 の RequestError に包み直すため、
    // 実運用のネットワーク障害はこの経路でfatalになる
    expect(isFatalError(makeHttpError(500))).toBe(true)
  })

  it("HTTP 403 エラーのとき、retry-after の有無によらず false を返す", () => {
    // 権限不足なら他の設定ユニットは処理できる。レート制限なら待って再試行する側の判断になる
    expect(isFatalError(makeHttpError(403))).toBe(false)
    expect(isFatalError(makeHttpError(403, { "retry-after": "30" }))).toBe(false)
  })

  it("HTTP 429 エラーのとき false を返す", () => {
    expect(isFatalError(makeHttpError(429, { "retry-after": "60" }))).toBe(false)
  })

  it("HTTP 404 エラーのとき false を返す", () => {
    expect(isFatalError(makeHttpError(404))).toBe(false)
  })

  it.each(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"])(
    "エラー自身が code=%s を持つとき true を返す",
    (code) => {
      const err = Object.assign(new Error(`connect ${code}`), { code })
      expect(isFatalError(err)).toBe(true)
    },
  )

  it.each(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"])(
    "cause に code=%s を持つとき true を返す",
    (code) => {
      // fetch が実際に投げる形。code は TypeError 自身ではなく cause に入る
      const err = makeNetworkError(code)
      expect(extractHttpStatus(err)).toBeUndefined()
      expect(isFatalError(err)).toBe(true)
    },
  )

  it("cause が code を持たないとき false を返す", () => {
    expect(isFatalError(new TypeError("fetch failed", { cause: new Error("boom") }))).toBe(false)
  })

  it("cause の code がネットワーク障害以外のとき false を返す", () => {
    expect(isFatalError(makeNetworkError("ERR_UNKNOWN"))).toBe(false)
  })

  it("cause の code が文字列でないとき false を返す", () => {
    expect(isFatalError(new Error("oops", { cause: { code: 500 } }))).toBe(false)
  })

  it("HTTP ステータスも code もない通常の Error のとき false を返す", () => {
    expect(isFatalError(new Error("generic error"))).toBe(false)
  })

  it("Error でない値のとき false を返す", () => {
    expect(isFatalError("string error")).toBe(false)
    expect(isFatalError(null)).toBe(false)
  })
})

describe("isRetryableError", () => {
  it.each([502, 503, 504])("一時的なゲートウェイ障害 %s は再試行してよい", (status) => {
    expect(isRetryableError(makeHttpError(status))).toBe(true)
  })

  it("429 は retry-after が無くても再試行してよい", () => {
    // 429はレート制限以外で返らないので、待ち時間の指定が無ければ指数バックオフに任せる
    expect(isRetryableError(makeHttpError(429))).toBe(true)
  })

  it("403 は retry-after があるとき（＝レート制限）だけ再試行する", () => {
    expect(isRetryableError(makeHttpError(403, { "retry-after": "30" }))).toBe(true)
  })

  it("403 は retry-after が無いとき（＝権限不足）再試行しない", () => {
    expect(isRetryableError(makeHttpError(403))).toBe(false)
  })

  it.each([403, 429])("%s でも retry-after が待てる上限を超えるときは再試行しない", (status) => {
    // 一次レート制限の枯渇はリセットまで最大1時間。GitHubはその秒数が経つまで再試行するなと
    // 言うので、指数バックオフで上書きせず該当設定ユニットをERRORに落とす
    expect(isRetryableError(makeHttpError(status, { "retry-after": "3600" }))).toBe(false)
  })

  it("403 で retry-after が無く x-ratelimit-remaining が 0 でも再試行しない", () => {
    // 一次レート制限の枯渇。リセットは待てる上限より先なので、権限不足と同じERRORに落ちる。
    // 分岐を足しても行き先が変わらないため x-ratelimit-remaining は読んでいない
    const err = makeHttpError(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1800000" })
    expect(isRetryableError(err)).toBe(false)
  })

  it("403 の retry-after が HTTP-date のときは再試行しない", () => {
    // GitHubは秒数で返す。尊重しようのない値なら、待たずに叩き直すより諦めるほうを選ぶ
    const err = makeHttpError(403, { "retry-after": "Wed, 21 Oct 2015 07:28:00 GMT" })
    expect(isRetryableError(err)).toBe(false)
  })

  it.each([401, 404, 500])("%s は再試行しない", (status) => {
    expect(isRetryableError(makeHttpError(status))).toBe(false)
  })

  it("HTTP ステータスを持たないエラーは再試行しない", () => {
    expect(isRetryableError(makeNetworkError("ECONNREFUSED"))).toBe(false)
    expect(isRetryableError(new Error("network error"))).toBe(false)
    expect(isRetryableError("string")).toBe(false)
  })
})

describe("retryAfterMs", () => {
  it("retry-after の秒数をミリ秒にして返す", () => {
    expect(retryAfterMs(makeHttpError(403, { "retry-after": "30" }))).toBe(30_000)
    expect(retryAfterMs(makeHttpError(429, { "retry-after": 60 }))).toBe(60_000)
  })

  it("retry-after が無いとき undefined を返す", () => {
    expect(retryAfterMs(makeHttpError(403))).toBeUndefined()
  })

  it("retry-after が数値として読めないとき undefined を返す", () => {
    expect(retryAfterMs(makeHttpError(403, { "retry-after": "soon" }))).toBeUndefined()
    expect(retryAfterMs(makeHttpError(403, { "retry-after": "" }))).toBeUndefined()
    expect(retryAfterMs(makeHttpError(403, { "retry-after": "-1" }))).toBeUndefined()
  })

  it("レスポンスやヘッダを持たないエラーは undefined を返す", () => {
    expect(retryAfterMs(new Error("oops"))).toBeUndefined()
    expect(retryAfterMs(Object.assign(new Error("oops"), { response: null }))).toBeUndefined()
    expect(retryAfterMs(Object.assign(new Error("oops"), { response: {} }))).toBeUndefined()
    expect(
      retryAfterMs(Object.assign(new Error("oops"), { response: { headers: null } })),
    ).toBeUndefined()
  })

  it("retry-after の値が文字列でも数値でもないとき undefined を返す", () => {
    const err = Object.assign(new Error("oops"), { response: { headers: { "retry-after": true } } })
    expect(retryAfterMs(err)).toBeUndefined()
  })

  it("Error でない値は undefined を返す", () => {
    expect(retryAfterMs("string")).toBeUndefined()
    expect(retryAfterMs(null)).toBeUndefined()
  })
})
