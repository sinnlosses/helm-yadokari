import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/lib/gitlab/gitlab.js")

import {
  branchExists,
  commitFileUpdates,
  createMergeRequest,
  deleteBranch,
} from "../../../../src/lib/gitlab/gitlab.js"
import type { MrContent } from "../../../../src/steps/apply-updates/sub-steps/shared/types.js"
import { submitMergeRequest } from "../../../../src/steps/apply-updates/sub-steps/submit-merge-request.js"
import type { ChartRepoConfig, FileUpdate } from "../../../../src/types/types.js"
import {
  toBranchName,
  toProjectId,
  toProjectName,
  toValuesPath,
} from "../../../../src/types/types.js"
import { mockGitlab } from "../../../helpers.js"

const CHART: ChartRepoConfig = {
  projectId: toProjectId(100),
  projectName: toProjectName("teamA-chart"),
  mrTargetBranch: toBranchName("develop"),
}
const FEATURE_BRANCH = toBranchName("feature/yadokari/tenant1/client1")
const CONTENT: MrContent = {
  title: "Auto MR by yadokari: update tenant1/client1 (image tag 1)",
  description: "### my-app\n...",
}
const FILES: readonly FileUpdate[] = [
  { valuesPath: toValuesPath("values.yaml"), content: "image:\n  tag: v2\n" },
]

describe("submitMergeRequest", () => {
  beforeEach(() => {
    vi.mocked(deleteBranch).mockResolvedValue(undefined)
    vi.mocked(commitFileUpdates).mockResolvedValue(undefined)
    vi.mocked(createMergeRequest).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("固定ブランチが残っているとき、削除してからコミットする", async () => {
    vi.mocked(branchExists).mockResolvedValue(true)
    await submitMergeRequest(mockGitlab, CHART, FEATURE_BRANCH, CONTENT, FILES)

    expect(deleteBranch).toHaveBeenCalledWith(mockGitlab, CHART.projectId, FEATURE_BRANCH)
    expect(vi.mocked(deleteBranch).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(commitFileUpdates).mock.invocationCallOrder[0] ?? 0,
    )
  })

  it("固定ブランチが無いとき、削除せずコミットする", async () => {
    vi.mocked(branchExists).mockResolvedValue(false)
    await submitMergeRequest(mockGitlab, CHART, FEATURE_BRANCH, CONTENT, FILES)

    expect(deleteBranch).not.toHaveBeenCalled()
    expect(commitFileUpdates).toHaveBeenCalledOnce()
  })

  it("mrTargetBranch を起点に、MRタイトルと同じコミットメッセージでコミットする", async () => {
    vi.mocked(branchExists).mockResolvedValue(false)
    await submitMergeRequest(mockGitlab, CHART, FEATURE_BRANCH, CONTENT, FILES)

    expect(commitFileUpdates).toHaveBeenCalledWith(
      mockGitlab,
      CHART.projectId,
      FEATURE_BRANCH,
      CHART.mrTargetBranch,
      CONTENT.title,
      FILES,
    )
  })

  it("固定ブランチから mrTargetBranch 宛てのMRを作る", async () => {
    vi.mocked(branchExists).mockResolvedValue(false)
    await submitMergeRequest(mockGitlab, CHART, FEATURE_BRANCH, CONTENT, FILES)

    expect(createMergeRequest).toHaveBeenCalledWith(
      mockGitlab,
      CHART.projectId,
      FEATURE_BRANCH,
      CHART.mrTargetBranch,
      CONTENT.title,
      CONTENT.description,
    )
  })
})
