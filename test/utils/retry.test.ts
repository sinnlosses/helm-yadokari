import { describe, expect, it, vi } from "vitest"

import { withRetry } from "../../src/utils/retry.js"
import { makeHttpError } from "../helpers.js"

describe("withRetry", () => {
  it("成功する操作はそのまま結果を返す", async () => {
    const fn = vi.fn().mockResolvedValue("ok")
    expect(await withRetry(fn)).toBe("ok")
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("429 で失敗後に成功する場合はリトライして結果を返す", async () => {
    const fn = vi.fn().mockRejectedValueOnce(makeHttpError(429)).mockResolvedValueOnce("ok")
    expect(await withRetry(fn, { baseDelayMs: 0 })).toBe("ok")
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("502 で失敗後に成功する場合はリトライして結果を返す", async () => {
    const fn = vi.fn().mockRejectedValueOnce(makeHttpError(502)).mockResolvedValueOnce("ok")
    expect(await withRetry(fn, { baseDelayMs: 0 })).toBe("ok")
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("503 で失敗後に成功する場合はリトライして結果を返す", async () => {
    const fn = vi.fn().mockRejectedValueOnce(makeHttpError(503)).mockResolvedValueOnce("ok")
    expect(await withRetry(fn, { baseDelayMs: 0 })).toBe("ok")
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("504 で失敗後に成功する場合はリトライして結果を返す", async () => {
    const fn = vi.fn().mockRejectedValueOnce(makeHttpError(504)).mockResolvedValueOnce("ok")
    expect(await withRetry(fn, { baseDelayMs: 0 })).toBe("ok")
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("maxAttempts 回リトライしても失敗し続けた場合は最後のエラーをスローする", async () => {
    const err = makeHttpError(503)
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 0 })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("リトライ対象外のエラー（401）は即座にスローする", async () => {
    const err = makeHttpError(401)
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, { baseDelayMs: 0 })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("リトライ対象外のエラー（500）は即座にスローする", async () => {
    const err = makeHttpError(500)
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, { baseDelayMs: 0 })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("gitbeaker が内部リトライを使い切ったエラー（GitbeakerRetryError）は再試行しない", async () => {
    // gitbeaker が既に10回試したあとなので、こちらから追加で叩く相手ではない。
    // ステータス（メッセージ中の 502/429）は isFatalError の判定にだけ使う
    const err = new Error(
      "Could not successfully complete this request after 10 retries, last status code: 502.",
    )
    err.name = "GitbeakerRetryError"
    const fn = vi.fn().mockRejectedValue(err)

    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toThrow(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("リトライ対象外の通常エラーは即座にスローする", async () => {
    const err = new Error("network error")
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, { baseDelayMs: 0 })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("maxAttempts のデフォルトは 3", async () => {
    const err = makeHttpError(503)
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, { baseDelayMs: 0 })).rejects.toBeDefined()
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
