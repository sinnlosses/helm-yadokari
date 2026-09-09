import { describe, expect, it } from "vitest"

import {
  extractHttpStatus,
  isFatalError,
  isNotFoundError,
  isRetryableError,
} from "../../../src/lib/gitlab/errors.js"
import { makeHttpError } from "../../helpers.js"

describe("extractHttpStatus", () => {
  it("Error でない値は undefined を返す", () => {
    expect(extractHttpStatus("string")).toBeUndefined()
    expect(extractHttpStatus(null)).toBeUndefined()
    expect(extractHttpStatus(42)).toBeUndefined()
  })

  it("cause を持たない Error は undefined を返す", () => {
    expect(extractHttpStatus(new Error("oops"))).toBeUndefined()
  })

  it("cause に response がない場合は undefined を返す", () => {
    expect(extractHttpStatus(new Error("oops", { cause: {} }))).toBeUndefined()
  })

  it("cause.response に status がない場合は undefined を返す", () => {
    expect(extractHttpStatus(new Error("oops", { cause: { response: {} } }))).toBeUndefined()
  })

  it("cause.response が null のとき undefined を返す", () => {
    expect(extractHttpStatus(new Error("oops", { cause: { response: null } }))).toBeUndefined()
  })

  it("cause.response.status が数値でないとき undefined を返す", () => {
    expect(
      extractHttpStatus(new Error("oops", { cause: { response: { status: "200" } } })),
    ).toBeUndefined()
  })

  it("cause.response.status から HTTP ステータスコードを返す", () => {
    expect(extractHttpStatus(makeHttpError(404))).toBe(404)
    expect(extractHttpStatus(makeHttpError(401))).toBe(401)
    expect(extractHttpStatus(makeHttpError(500))).toBe(500)
  })
})

describe("isNotFoundError", () => {
  it("404 エラーのとき true を返す", () => {
    expect(isNotFoundError(makeHttpError(404))).toBe(true)
  })

  it("404 以外の HTTP エラーのとき false を返す", () => {
    expect(isNotFoundError(makeHttpError(401))).toBe(false)
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

  it("HTTP 500 エラーのとき true を返す", () => {
    expect(isFatalError(makeHttpError(500))).toBe(true)
  })

  it("HTTP 403 エラーのとき false を返す", () => {
    expect(isFatalError(makeHttpError(403))).toBe(false)
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
      const err = new TypeError("fetch failed", {
        cause: Object.assign(new Error(`connect ${code}`), { code }),
      })
      expect(extractHttpStatus(err)).toBeUndefined()
      expect(isFatalError(err)).toBe(true)
    },
  )

  it("cause が code を持たないとき false を返す", () => {
    expect(isFatalError(new TypeError("fetch failed", { cause: new Error("boom") }))).toBe(false)
  })

  it("cause の code がネットワーク障害以外のとき false を返す", () => {
    const err = new TypeError("fetch failed", {
      cause: Object.assign(new Error("aborted"), { code: "ERR_UNKNOWN" }),
    })
    expect(isFatalError(err)).toBe(false)
  })

  it("cause の code が文字列でないとき false を返す", () => {
    expect(isFatalError(new Error("oops", { cause: { code: 500 } }))).toBe(false)
  })

  it("gitbeaker の queryTimeout 超過（GitbeakerTimeoutError）のとき true を返す", () => {
    // gitbeaker が実際に投げる形。HTTP ステータスも code も持たず、name だけが手掛かりになる
    const err = new Error("Query timeout was reached")
    err.name = "GitbeakerTimeoutError"
    expect(extractHttpStatus(err)).toBeUndefined()
    expect(isFatalError(err)).toBe(true)
  })

  it("gitbeaker が内部リトライを使い切った 502（GitbeakerRetryError）のとき true を返す", () => {
    // gitbeaker は 429/502 を内部で最大10回リトライし、使い切るとこのエラーを投げる。
    // `cause` を持たないためステータスはメッセージにしか残らない
    const err = new Error(
      "Could not successfully complete this request after 10 retries, last status code: 502. Verify the status of the endpoint.",
    )
    err.name = "GitbeakerRetryError"
    expect(extractHttpStatus(err)).toBeUndefined()
    expect(isFatalError(err)).toBe(true)
  })

  it("gitbeaker が内部リトライを使い切った 429（GitbeakerRetryError）のとき false を返す", () => {
    // レート制限は該当プロジェクトの問題で、実行全体を止める理由にならない
    const err = new Error(
      "Could not successfully complete this request after 10 retries, last status code: 429. Check the applicable rate limits for this endpoint.",
    )
    err.name = "GitbeakerRetryError"
    expect(isFatalError(err)).toBe(false)
  })

  it("GitbeakerRetryError のメッセージからステータスを読めないときは false を返す", () => {
    // ライブラリがメッセージの書式を変えたときに、黙って実行全体を止めない安全側に倒す
    const err = new Error("Could not successfully complete this request")
    err.name = "GitbeakerRetryError"
    expect(isFatalError(err)).toBe(false)
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
  it.each([429, 502, 503, 504])("%s は再試行してよい", (status) => {
    expect(isRetryableError(makeHttpError(status))).toBe(true)
  })

  it.each([401, 403, 404, 500])("%s は再試行しない", (status) => {
    expect(isRetryableError(makeHttpError(status))).toBe(false)
  })

  it("gitbeaker が内部リトライを使い切ったエラーは再試行しない", () => {
    // gitbeaker が既に10回試したあとなので、こちらから追加で叩く相手ではない。
    // メッセージ中のステータスは isFatalError の判定にだけ使う
    const err = new Error(
      "Could not successfully complete this request after 10 retries, last status code: 502.",
    )
    err.name = "GitbeakerRetryError"
    expect(isRetryableError(err)).toBe(false)
    expect(isFatalError(err)).toBe(true)
  })

  it("HTTP ステータスを持たないエラーは再試行しない", () => {
    expect(isRetryableError(new Error("network error"))).toBe(false)
    expect(isRetryableError("string")).toBe(false)
  })
})
