import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/lib/gitlab/gitlab.js")

import { getLatestPipelineForRef, getProjectWebUrls } from "../../../../src/lib/gitlab/gitlab.js"
import { collectMrEntries } from "../../../../src/steps/apply-updates/sub-steps/collect-mr-entries.js"
import type { GitLabUrl, ProjectId } from "../../../../src/types/types.js"
import {
  toAnchorName,
  toBranchName,
  toGitLabUrl,
  toProjectId,
  toTagName,
  toValuesPath,
} from "../../../../src/types/types.js"
import { makePlan, mockGitlab } from "../../../helpers.js"

const webUrl = toGitLabUrl("https://gitlab.example.com/g/my-app")

const helmUpdate = {
  target: { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
  previousBranch: toBranchName("release/2025-q4"),
  newBranch: toBranchName("release/2026-q1"),
}

function mockWebUrls(
  webUrls: ReadonlyMap<ProjectId, GitLabUrl> = new Map([[toProjectId(1), webUrl]]),
) {
  vi.mocked(getProjectWebUrls).mockResolvedValue(webUrls)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("collectMrEntries", () => {
  it("イメージタグの書き換え箇所ごとに1件、解決したweb URLを添えて返す", async () => {
    mockWebUrls()
    const plan = makePlan({
      updates: [
        {
          target: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("x") },
          previousTagName: toTagName("prev"),
        },
        {
          target: { valuesPath: toValuesPath("b.yaml"), anchorName: toAnchorName("y") },
          previousTagName: toTagName("prev"),
        },
      ],
    })

    const entries = await collectMrEntries(mockGitlab, [plan], [])

    expect(entries.imageTags).toHaveLength(2)
    expect(entries.imageTags.map((entry) => entry.update.target.anchorName)).toEqual(["x", "y"])
    expect(entries.imageTags.every((entry) => entry.webUrl === webUrl)).toBe(true)
    expect(entries.imageTags[0]?.plan).toBe(plan)
  })

  it("イメージタグに差分が無いplanは含めず、そのweb URLも要求しない", async () => {
    mockWebUrls(new Map())

    const entries = await collectMrEntries(mockGitlab, [makePlan({ updates: [] })], [helmUpdate])

    expect(entries.imageTags).toEqual([])
    expect(getProjectWebUrls).toHaveBeenCalledWith(mockGitlab, [])
  })

  it("向き先ブランチの更新はclient単位で確定済みなので、そのまま並べる", async () => {
    mockWebUrls(new Map())
    const other = {
      ...helmUpdate,
      target: { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("otherBranch") },
    }

    const entries = await collectMrEntries(mockGitlab, [], [helmUpdate, other])

    expect(entries.helmBranches).toEqual([helmUpdate, other])
  })

  it("web URLが解決されなかったprojectIdがあるとエラーにする", async () => {
    mockWebUrls(new Map())

    await expect(collectMrEntries(mockGitlab, [makePlan()], [])).rejects.toThrow(
      "web URLが解決されていないprojectIdです: 1",
    )
  })

  it("plan単位の解決で失敗したとき、エラーにどのアプリかを付ける", async () => {
    mockWebUrls()
    vi.mocked(getLatestPipelineForRef).mockRejectedValue(new Error("パイプラインの取得に失敗"))

    await expect(
      collectMrEntries(mockGitlab, [makePlan({ projectName: "my-app" })], []),
    ).rejects.toThrow("[アプリ: my-app] パイプラインの取得に失敗")
  })
})
