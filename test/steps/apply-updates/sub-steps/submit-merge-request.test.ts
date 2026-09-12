import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { MrContent } from "../../../../src/steps/apply-updates/sub-steps/shared/types.js"
import { submitMergeRequest } from "../../../../src/steps/apply-updates/sub-steps/submit-merge-request.js"
import type { ChartRepoConfig, FileUpdate } from "../../../../src/types/types.js"
import {
  toBranchName,
  toProjectId,
  toProjectName,
  toValuesPath,
} from "../../../../src/types/types.js"
import { makeAdapter } from "../../../helpers.js"

const adapter = makeAdapter()

const CHART: ChartRepoConfig = {
  projectId: toProjectId("100"),
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
    vi.mocked(adapter.deleteBranch).mockResolvedValue(undefined)
    vi.mocked(adapter.commitFileUpdates).mockResolvedValue(undefined)
    vi.mocked(adapter.createMergeRequest).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("固定ブランチが残っているとき、削除してからコミットする", async () => {
    vi.mocked(adapter.branchExists).mockResolvedValue(true)
    await submitMergeRequest(adapter, CHART, FEATURE_BRANCH, CONTENT, FILES)

    expect(adapter.deleteBranch).toHaveBeenCalledWith(CHART.projectId, FEATURE_BRANCH)
    expect(vi.mocked(adapter.deleteBranch).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(adapter.commitFileUpdates).mock.invocationCallOrder[0] ?? 0,
    )
  })

  it("固定ブランチが無いとき、削除せずコミットする", async () => {
    vi.mocked(adapter.branchExists).mockResolvedValue(false)
    await submitMergeRequest(adapter, CHART, FEATURE_BRANCH, CONTENT, FILES)

    expect(adapter.deleteBranch).not.toHaveBeenCalled()
    expect(adapter.commitFileUpdates).toHaveBeenCalledOnce()
  })

  it("mrTargetBranch を起点に、MRタイトルと同じコミットメッセージでコミットする", async () => {
    vi.mocked(adapter.branchExists).mockResolvedValue(false)
    await submitMergeRequest(adapter, CHART, FEATURE_BRANCH, CONTENT, FILES)

    expect(adapter.commitFileUpdates).toHaveBeenCalledWith(
      CHART.projectId,
      FEATURE_BRANCH,
      CHART.mrTargetBranch,
      CONTENT.title,
      FILES,
    )
  })

  it("固定ブランチから mrTargetBranch 宛てのMRを作る", async () => {
    vi.mocked(adapter.branchExists).mockResolvedValue(false)
    await submitMergeRequest(adapter, CHART, FEATURE_BRANCH, CONTENT, FILES)

    expect(adapter.createMergeRequest).toHaveBeenCalledWith(
      CHART.projectId,
      FEATURE_BRANCH,
      CHART.mrTargetBranch,
      CONTENT.title,
      CONTENT.description,
    )
  })
})
