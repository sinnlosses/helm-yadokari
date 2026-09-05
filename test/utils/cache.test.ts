import { describe, expect, it, vi } from "vitest"

import { getOrFetch, getOrFetchShared } from "../../src/utils/cache.js"

describe("getOrFetch", () => {
  it("未キャッシュのとき fetch() を呼び出し、結果を返す", async () => {
    const cache = new Map<string, number>()
    const fetch = vi.fn().mockResolvedValue(42)
    expect(await getOrFetch(cache, "key", fetch)).toBe(42)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it("未キャッシュのとき fetch() の結果をキャッシュに格納する", async () => {
    const cache = new Map<string, number>()
    await getOrFetch(cache, "key", vi.fn().mockResolvedValue(42))
    expect(cache.get("key")).toBe(42)
  })

  it("キャッシュ済みのとき fetch() を呼ばずキャッシュ値を返す", async () => {
    const cache = new Map<string, number>([["key", 1]])
    const fetch = vi.fn().mockResolvedValue(999)
    expect(await getOrFetch(cache, "key", fetch)).toBe(1)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("異なるキーはそれぞれ独立してfetch()する", async () => {
    const cache = new Map<string, number>()
    const fetch = vi.fn().mockImplementation(async () => cache.size + 100)
    const a = await getOrFetch(cache, "a", fetch)
    const b = await getOrFetch(cache, "b", fetch)
    expect(a).not.toBe(b)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

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
