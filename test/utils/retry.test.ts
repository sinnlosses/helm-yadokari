import { describe, expect, it, vi } from "vitest"

import { withRetry } from "../../src/utils/retry.js"

// `withRetry()` はどのエラーを再試行するかを自分で決めない（`isRetryable` で受け取る）。
// GitLab APIに対する判定は `test/lib/gitlab/errors.test.ts` が守る
const always = () => true
const never = () => false

describe("withRetry", () => {
  it("成功する操作はそのまま結果を返す", async () => {
    const fn = vi.fn().mockResolvedValue("ok")
    expect(await withRetry(fn, always)).toBe("ok")
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("isRetryable が true のエラーは再試行し、成功したらその結果を返す", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok")
    expect(await withRetry(fn, always, { baseDelayMs: 0 })).toBe("ok")
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("isRetryable が false のエラーは即座にスローする", async () => {
    const err = new Error("boom")
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, never, { baseDelayMs: 0 })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("maxAttempts 回試しても失敗し続けた場合は最後のエラーをスローする", async () => {
    const err = new Error("boom")
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, always, { maxAttempts: 3, baseDelayMs: 0 })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("maxAttempts のデフォルトは 3", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"))
    await expect(withRetry(fn, always, { baseDelayMs: 0 })).rejects.toBeDefined()
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("待ち時間は指数バックオフで伸びる", async () => {
    vi.useFakeTimers()
    try {
      const delays: number[] = []
      vi.spyOn(globalThis, "setTimeout").mockImplementation(((cb: () => void, ms?: number) => {
        delays.push(ms ?? 0)
        cb()
        return 0 as unknown as ReturnType<typeof setTimeout>
      }) as typeof setTimeout)

      const fn = vi.fn().mockRejectedValue(new Error("boom"))
      await expect(
        withRetry(fn, always, { maxAttempts: 3, baseDelayMs: 100 }),
      ).rejects.toBeDefined()
      expect(delays).toEqual([100, 200])
    } finally {
      vi.useRealTimers()
      vi.restoreAllMocks()
    }
  })
})
