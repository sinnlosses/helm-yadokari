import { afterEach, describe, expect, it, vi } from "vitest"

import { createPlatformBatchCache } from "../../../src/lib/platform/batch-cache.js"
import { toBranchName, toProjectId } from "../../../src/types/types.js"
import { makePlatform } from "../../helpers.js"

const PROJECT_ID = toProjectId("1")
const MAIN = toBranchName("main")

describe("createPlatformBatchCache", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("同じ引数を同時に呼んでもPlatformへの問い合わせは1回だけになる", async () => {
    const platform = makePlatform()
    vi.mocked(platform.branchExists).mockResolvedValue(true)
    const cache = createPlatformBatchCache(platform)

    const results = await Promise.all([
      cache.branchExists(PROJECT_ID, MAIN),
      cache.branchExists(PROJECT_ID, MAIN),
    ])
    await cache.branchExists(PROJECT_ID, MAIN)

    expect(results).toEqual([true, true])
    expect(platform.branchExists).toHaveBeenCalledOnce()
    expect(platform.branchExists).toHaveBeenCalledWith(PROJECT_ID, MAIN)
  })

  it("引数が違えばそれぞれ問い合わせる", async () => {
    const platform = makePlatform()
    vi.mocked(platform.branchExists).mockResolvedValue(true)
    const cache = createPlatformBatchCache(platform)

    await cache.branchExists(PROJECT_ID, MAIN)
    await cache.branchExists(PROJECT_ID, toBranchName("develop"))
    await cache.branchExists(toProjectId("2"), MAIN)

    expect(platform.branchExists).toHaveBeenCalledTimes(3)
  })

  it("falsyな結果もキャッシュされ、2回目は問い合わせない", async () => {
    const platform = makePlatform()
    vi.mocked(platform.branchExists).mockResolvedValue(false)
    const cache = createPlatformBatchCache(platform)

    expect(await cache.branchExists(PROJECT_ID, MAIN)).toBe(false)
    expect(await cache.branchExists(PROJECT_ID, MAIN)).toBe(false)

    expect(platform.branchExists).toHaveBeenCalledOnce()
  })

  it("失敗した問い合わせはキャッシュに残らず、次の呼び出しで再試行する", async () => {
    const platform = makePlatform()
    vi.mocked(platform.branchExists)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(true)
    const cache = createPlatformBatchCache(platform)

    await expect(cache.branchExists(PROJECT_ID, MAIN)).rejects.toThrow("boom")

    expect(await cache.branchExists(PROJECT_ID, MAIN)).toBe(true)
    expect(platform.branchExists).toHaveBeenCalledTimes(2)
  })

  it("キャッシュのインスタンスが違えば共有しない", async () => {
    const platform = makePlatform()
    vi.mocked(platform.branchExists).mockResolvedValue(true)

    await createPlatformBatchCache(platform).branchExists(PROJECT_ID, MAIN)
    await createPlatformBatchCache(platform).branchExists(PROJECT_ID, MAIN)

    expect(platform.branchExists).toHaveBeenCalledTimes(2)
  })
})
