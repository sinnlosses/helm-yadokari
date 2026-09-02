import { describe, expect, it, vi } from "vitest"

import { getOrFetch } from "../../src/utils/cache.js"

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
