import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/lib/gitlab/gitlab.js")

import type { GitlabClient } from "../../../../src/lib/gitlab/gitlab.js"
import { getProjectWebUrls } from "../../../../src/lib/gitlab/gitlab.js"
import { collectMrEntries } from "../../../../src/steps/apply-updates/sub-steps/collect-mr-entries.js"
import type { GitLabUrl, ProjectId } from "../../../../src/types/types.js"
import {
  toAnchorName,
  toBranchName,
  toGitLabUrl,
  toProjectId,
  toValuesPath,
} from "../../../../src/types/types.js"
import { makePlan } from "../../../helpers.js"

const mockGitlab = {} as unknown as GitlabClient
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
          previousTagName: undefined,
        },
        {
          target: { valuesPath: toValuesPath("b.yaml"), anchorName: toAnchorName("y") },
          previousTagName: undefined,
        },
      ],
    })

    const entries = await collectMrEntries(mockGitlab, [plan])

    expect(entries.imageTags).toHaveLength(2)
    expect(entries.imageTags.map((entry) => entry.update.target.anchorName)).toEqual(["x", "y"])
    expect(entries.imageTags.every((entry) => entry.webUrl === webUrl)).toBe(true)
    expect(entries.imageTags[0]?.plan).toBe(plan)
  })

  it("イメージタグに差分が無いplanは含めず、そのweb URLも要求しない", async () => {
    mockWebUrls(new Map())

    const entries = await collectMrEntries(mockGitlab, [
      makePlan({ updates: [], helmTargetBranchUpdates: [helmUpdate] }),
    ])

    expect(entries.imageTags).toEqual([])
    expect(getProjectWebUrls).toHaveBeenCalledWith(mockGitlab, [])
  })

  it("同じ書き込み先の向き先ブランチ更新が複数planにあっても1件にまとめる", async () => {
    mockWebUrls(new Map())

    const entries = await collectMrEntries(mockGitlab, [
      makePlan({ updates: [], helmTargetBranchUpdates: [helmUpdate] }),
      makePlan({ projectName: "other-app", updates: [], helmTargetBranchUpdates: [helmUpdate] }),
    ])

    expect(entries.helmBranches).toEqual([helmUpdate])
  })

  it("書き込み先が違う向き先ブランチ更新はまとめない", async () => {
    mockWebUrls(new Map())
    const other = {
      ...helmUpdate,
      target: { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("otherBranch") },
    }

    const entries = await collectMrEntries(mockGitlab, [
      makePlan({ updates: [], helmTargetBranchUpdates: [helmUpdate, other] }),
    ])

    expect(entries.helmBranches).toHaveLength(2)
  })

  it("web URLが解決されなかったprojectIdがあるとエラーにする", async () => {
    mockWebUrls(new Map())

    await expect(collectMrEntries(mockGitlab, [makePlan()])).rejects.toThrow(
      "web URLが解決されていないprojectIdです: 1",
    )
  })
})
