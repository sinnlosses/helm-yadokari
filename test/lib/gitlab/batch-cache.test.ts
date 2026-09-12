import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../src/lib/gitlab/gitlab.js")

import { createGitlabBatchCache } from "../../../src/lib/gitlab/batch-cache.js"
import { branchExists } from "../../../src/lib/gitlab/gitlab.js"
import { toBranchName, toProjectId } from "../../../src/types/types.js"
import { mockGitlab } from "../../helpers.js"

const PROJECT_ID = toProjectId("1")
const MAIN = toBranchName("main")

describe("createGitlabBatchCache", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("同じ引数を同時に呼んでもGitLabへの問い合わせは1回だけになる", async () => {
    vi.mocked(branchExists).mockResolvedValue(true)
    const cache = createGitlabBatchCache(mockGitlab)

    const results = await Promise.all([
      cache.branchExists(PROJECT_ID, MAIN),
      cache.branchExists(PROJECT_ID, MAIN),
    ])
    await cache.branchExists(PROJECT_ID, MAIN)

    expect(results).toEqual([true, true])
    expect(branchExists).toHaveBeenCalledOnce()
    expect(branchExists).toHaveBeenCalledWith(mockGitlab, PROJECT_ID, MAIN)
  })

  it("引数が違えばそれぞれ問い合わせる", async () => {
    vi.mocked(branchExists).mockResolvedValue(true)
    const cache = createGitlabBatchCache(mockGitlab)

    await cache.branchExists(PROJECT_ID, MAIN)
    await cache.branchExists(PROJECT_ID, toBranchName("develop"))
    await cache.branchExists(toProjectId("2"), MAIN)

    expect(branchExists).toHaveBeenCalledTimes(3)
  })

  it("falsyな結果もキャッシュされ、2回目は問い合わせない", async () => {
    vi.mocked(branchExists).mockResolvedValue(false)
    const cache = createGitlabBatchCache(mockGitlab)

    expect(await cache.branchExists(PROJECT_ID, MAIN)).toBe(false)
    expect(await cache.branchExists(PROJECT_ID, MAIN)).toBe(false)

    expect(branchExists).toHaveBeenCalledOnce()
  })

  it("失敗した問い合わせはキャッシュに残らず、次の呼び出しで再試行する", async () => {
    vi.mocked(branchExists).mockRejectedValueOnce(new Error("boom")).mockResolvedValue(true)
    const cache = createGitlabBatchCache(mockGitlab)

    await expect(cache.branchExists(PROJECT_ID, MAIN)).rejects.toThrow("boom")

    expect(await cache.branchExists(PROJECT_ID, MAIN)).toBe(true)
    expect(branchExists).toHaveBeenCalledTimes(2)
  })

  it("キャッシュのインスタンスが違えば共有しない", async () => {
    vi.mocked(branchExists).mockResolvedValue(true)

    await createGitlabBatchCache(mockGitlab).branchExists(PROJECT_ID, MAIN)
    await createGitlabBatchCache(mockGitlab).branchExists(PROJECT_ID, MAIN)

    expect(branchExists).toHaveBeenCalledTimes(2)
  })
})
