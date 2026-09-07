import { describe, expect, it, vi } from "vitest"

import { getOrFetchShared } from "../../src/utils/cache.js"

describe("getOrFetchShared", () => {
  it("同じキーを同時に呼んでも fetch() は1回だけ呼ばれる", async () => {
    const cache = new Map<string, Promise<number>>()
    const fetch = vi.fn().mockImplementation(async () => 42)

    const [a, b] = await Promise.all([
      getOrFetchShared(cache, "key", fetch),
      getOrFetchShared(cache, "key", fetch),
    ])

    expect([a, b]).toEqual([42, 42])
    expect(fetch).toHaveBeenCalledOnce()
  })

  it("fetch() が失敗したときはキャッシュに残さず、次の呼び出しで再試行する", async () => {
    const cache = new Map<string, Promise<number>>()
    const fetch = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(7)

    await expect(getOrFetchShared(cache, "key", fetch)).rejects.toThrow("boom")

    expect(cache.has("key")).toBe(false)
    expect(await getOrFetchShared(cache, "key", fetch)).toBe(7)
  })
})
