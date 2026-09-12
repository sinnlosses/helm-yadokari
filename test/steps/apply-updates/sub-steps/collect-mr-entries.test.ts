import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/lib/gitlab/gitlab.js")

import { getLatestPipelineForRef, getProjectWebUrl } from "../../../../src/lib/gitlab/gitlab.js"
import { collectMrEntries } from "../../../../src/steps/apply-updates/sub-steps/collect-mr-entries.js"
import {
  toAnchorName,
  toBranchName,
  toPlatformUrl,
  toTagName,
  toValuesPath,
} from "../../../../src/types/types.js"
import { makePlan, newBatchCache } from "../../../helpers.js"

const webUrl = toPlatformUrl("https://gitlab.example.com/g/my-app")

const helmBranchRef = toBranchName("release/2026-q1")

const helmUpdate = {
  location: { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
  currentBranch: toBranchName("release/2025-q4"),
}

function mockWebUrl() {
  vi.mocked(getProjectWebUrl).mockResolvedValue(webUrl)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("collectMrEntries", () => {
  it("イメージタグの書き換え箇所ごとに1件、解決したweb URLを添えて返す", async () => {
    mockWebUrl()
    const plan = makePlan({
      updates: [
        {
          location: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("x") },
          currentTag: toTagName("prev"),
        },
        {
          location: { valuesPath: toValuesPath("b.yaml"), anchorName: toAnchorName("y") },
          currentTag: toTagName("prev"),
        },
      ],
    })

    const entries = await collectMrEntries(newBatchCache(), [plan], [], helmBranchRef)

    expect(entries.imageTags).toHaveLength(2)
    expect(entries.imageTags.map((entry) => entry.update.location.anchorName)).toEqual(["x", "y"])
    expect(entries.imageTags.every((entry) => entry.webUrl === webUrl)).toBe(true)
    expect(entries.imageTags[0]?.plan).toBe(plan)
  })

  it("plansが空のとき、imageTagsは空でweb URLも要求しない（helm向き先ブランチだけのMR）", async () => {
    mockWebUrl()

    const entries = await collectMrEntries(newBatchCache(), [], [helmUpdate], helmBranchRef)

    expect(entries.imageTags).toEqual([])
    expect(getProjectWebUrl).not.toHaveBeenCalled()
  })

  it("向き先ブランチの更新はclient単位で確定済みなので、そのまま並べる", async () => {
    mockWebUrl()
    const other = {
      ...helmUpdate,
      location: {
        valuesPath: toValuesPath("values.yaml"),
        anchorName: toAnchorName("otherBranch"),
      },
    }

    const entries = await collectMrEntries(newBatchCache(), [], [helmUpdate, other], helmBranchRef)

    expect(entries.helmBranches).toEqual([helmUpdate, other])
    expect(entries.helmBranchRef).toBe(helmBranchRef)
  })

  it("plan単位の解決で失敗したとき、エラーにどのアプリかを付ける", async () => {
    mockWebUrl()
    vi.mocked(getLatestPipelineForRef).mockRejectedValue(new Error("パイプラインの取得に失敗"))

    await expect(
      collectMrEntries(newBatchCache(), [makePlan({ projectName: "my-app" })], [], helmBranchRef),
    ).rejects.toThrow("[アプリ: my-app] パイプラインの取得に失敗")
  })

  it("同じappが複数clientに登録されていても、web URLとパイプラインの問い合わせは1回に収束する", async () => {
    mockWebUrl()
    vi.mocked(getLatestPipelineForRef).mockResolvedValue(undefined)
    // バッチ1回ぶんのキャッシュを共有したまま、clientの数だけ collectMrEntries が呼ばれる形
    const gitlabCache = newBatchCache()

    await collectMrEntries(gitlabCache, [makePlan()], [], helmBranchRef)
    await collectMrEntries(gitlabCache, [makePlan()], [], helmBranchRef)

    expect(getProjectWebUrl).toHaveBeenCalledOnce()
    expect(getLatestPipelineForRef).toHaveBeenCalledOnce()
  })
})
