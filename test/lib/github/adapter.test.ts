import { describe, expect, it, vi } from "vitest"

vi.mock("../../../src/lib/github/api.js")

import {
  toBranchName,
  toCommitSha,
  toProjectId,
  toTagName,
  toValuesPath,
} from "../../../src/domain/types.js"
import { createGithubAdapter } from "../../../src/lib/github/adapter.js"
import {
  type GithubClient,
  branchExists,
  commitFileUpdates,
  createMergeRequest,
  createTag,
  deleteBranch,
  getBranchHeadSha,
  getFileContent,
  getLatestPipelineForRef,
  getProjectWebUrl,
  listTagsAtCommit,
  openMergeRequestExists,
} from "../../../src/lib/github/api.js"
import {
  describeFailedRequest,
  extractHttpStatus,
  isFatalError,
} from "../../../src/lib/github/errors.js"
import { buildCompareUrl, buildTagUrl } from "../../../src/lib/github/web-url.js"

const github = {} as unknown as GithubClient
const PROJECT_ID = toProjectId("acme/chart")
const BRANCH = toBranchName("main")
const SHA = toCommitSha("sha")

describe("createGithubAdapter", () => {
  it("各関数にクライアントを結びつけて呼ぶ", async () => {
    const adapter = createGithubAdapter(github)

    const isCandidate = () => true
    await adapter.listTagsAtCommit(PROJECT_ID, SHA, isCandidate)
    expect(listTagsAtCommit).toHaveBeenCalledWith(github, PROJECT_ID, SHA, isCandidate)

    await adapter.branchExists(PROJECT_ID, BRANCH)
    expect(branchExists).toHaveBeenCalledWith(github, PROJECT_ID, BRANCH)

    await adapter.deleteBranch(PROJECT_ID, BRANCH)
    expect(deleteBranch).toHaveBeenCalledWith(github, PROJECT_ID, BRANCH)

    await adapter.getBranchHeadSha(PROJECT_ID, BRANCH)
    expect(getBranchHeadSha).toHaveBeenCalledWith(github, PROJECT_ID, BRANCH)

    const valuesPath = toValuesPath("values.yaml")
    await adapter.getFileContent(PROJECT_ID, valuesPath, BRANCH)
    expect(getFileContent).toHaveBeenCalledWith(github, PROJECT_ID, valuesPath, BRANCH)

    await adapter.openMergeRequestExists(PROJECT_ID, BRANCH)
    expect(openMergeRequestExists).toHaveBeenCalledWith(github, PROJECT_ID, BRANCH)

    const files = [{ valuesPath, content: "content" }]
    await adapter.commitFileUpdates(PROJECT_ID, BRANCH, BRANCH, "message", files)
    expect(commitFileUpdates).toHaveBeenCalledWith(
      github,
      PROJECT_ID,
      BRANCH,
      BRANCH,
      "message",
      files,
    )

    await adapter.createMergeRequest(PROJECT_ID, BRANCH, BRANCH, "title", "description")
    expect(createMergeRequest).toHaveBeenCalledWith(
      github,
      PROJECT_ID,
      BRANCH,
      BRANCH,
      "title",
      "description",
    )

    const tagName = toTagName("v1")
    await adapter.createTag(PROJECT_ID, tagName, BRANCH)
    expect(createTag).toHaveBeenCalledWith(github, PROJECT_ID, tagName, BRANCH)

    await adapter.getProjectWebUrl(PROJECT_ID)
    expect(getProjectWebUrl).toHaveBeenCalledWith(github, PROJECT_ID)

    await adapter.getLatestPipelineForRef(PROJECT_ID, tagName)
    expect(getLatestPipelineForRef).toHaveBeenCalledWith(github, PROJECT_ID, tagName)
  })

  it("URLの組み立ては`web-url.ts`の純粋関数をそのまま渡す", () => {
    const adapter = createGithubAdapter(github)
    expect(adapter.buildTagUrl).toBe(buildTagUrl)
    expect(adapter.buildCompareUrl).toBe(buildCompareUrl)
  })

  it("エラーの分類は`errors.ts`の関数をそのまま渡す", () => {
    // `steps/shared/step-outcome.ts`はここから渡った関数だけを見る。取り違えると
    // 別プラットフォームの形でステータスを探すことになり、すべての分類が黙って外れる
    const adapter = createGithubAdapter(github)
    expect(adapter.isFatalError).toBe(isFatalError)
    expect(adapter.extractHttpStatus).toBe(extractHttpStatus)
    expect(adapter.describeFailedRequest).toBe(describeFailedRequest)
  })
})
