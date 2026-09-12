import { afterEach, describe, expect, it, vi } from "vitest"

import { withCachedReads } from "../../../src/lib/platform/cached-reads.js"
import { toBranchName, toProjectId } from "../../../src/types/types.js"
import { makeAdapter } from "../../helpers.js"

const PROJECT_ID = toProjectId("1")
const MAIN = toBranchName("main")

describe("withCachedReads", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("同じ引数を同時に呼んでもPlatformへの問い合わせは1回だけになる", async () => {
    const adapter = makeAdapter()
    vi.mocked(adapter.branchExists).mockResolvedValue(true)
    const cached = withCachedReads(adapter).cached

    const results = await Promise.all([
      cached.branchExists(PROJECT_ID, MAIN),
      cached.branchExists(PROJECT_ID, MAIN),
    ])
    await cached.branchExists(PROJECT_ID, MAIN)

    expect(results).toEqual([true, true])
    expect(adapter.branchExists).toHaveBeenCalledOnce()
    expect(adapter.branchExists).toHaveBeenCalledWith(PROJECT_ID, MAIN)
  })

  it("引数が違えばそれぞれ問い合わせる", async () => {
    const adapter = makeAdapter()
    vi.mocked(adapter.branchExists).mockResolvedValue(true)
    const cached = withCachedReads(adapter).cached

    await cached.branchExists(PROJECT_ID, MAIN)
    await cached.branchExists(PROJECT_ID, toBranchName("develop"))
    await cached.branchExists(toProjectId("2"), MAIN)

    expect(adapter.branchExists).toHaveBeenCalledTimes(3)
  })

  it("falsyな結果もキャッシュされ、2回目は問い合わせない", async () => {
    const adapter = makeAdapter()
    vi.mocked(adapter.branchExists).mockResolvedValue(false)
    const cached = withCachedReads(adapter).cached

    expect(await cached.branchExists(PROJECT_ID, MAIN)).toBe(false)
    expect(await cached.branchExists(PROJECT_ID, MAIN)).toBe(false)

    expect(adapter.branchExists).toHaveBeenCalledOnce()
  })

  it("失敗した問い合わせはキャッシュに残らず、次の呼び出しで再試行する", async () => {
    const adapter = makeAdapter()
    vi.mocked(adapter.branchExists).mockRejectedValueOnce(new Error("boom")).mockResolvedValue(true)
    const cached = withCachedReads(adapter).cached

    await expect(cached.branchExists(PROJECT_ID, MAIN)).rejects.toThrow("boom")

    expect(await cached.branchExists(PROJECT_ID, MAIN)).toBe(true)
    expect(adapter.branchExists).toHaveBeenCalledTimes(2)
  })

  it("キャッシュのインスタンスが違えば共有しない", async () => {
    const adapter = makeAdapter()
    vi.mocked(adapter.branchExists).mockResolvedValue(true)

    await withCachedReads(adapter).cached.branchExists(PROJECT_ID, MAIN)
    await withCachedReads(adapter).cached.branchExists(PROJECT_ID, MAIN)

    expect(adapter.branchExists).toHaveBeenCalledTimes(2)
  })

  it("生の関数（branchExists等）はキャッシュを経由せず、adapterの元の関数のまま同居する", async () => {
    const adapter = makeAdapter()
    vi.mocked(adapter.branchExists).mockResolvedValue(true)
    const withCached = withCachedReads(adapter)

    await withCached.branchExists(PROJECT_ID, MAIN)
    await withCached.branchExists(PROJECT_ID, MAIN)

    expect(adapter.branchExists).toHaveBeenCalledTimes(2)
  })
})
