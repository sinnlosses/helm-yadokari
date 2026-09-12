import { describe, expect, it, vi } from "vitest"

vi.mock("../../../src/lib/github/github.js")

import { createGithubAdapter } from "../../../src/lib/github/adapter.js"
import { extractHttpStatus, isFatalError } from "../../../src/lib/github/errors.js"
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
  listTags,
  openMergeRequestExists,
} from "../../../src/lib/github/github.js"
import { buildCompareUrl, buildTagUrl } from "../../../src/lib/github/web-url.js"
import { toBranchName, toProjectId, toTagName, toValuesPath } from "../../../src/types/types.js"

const github = {} as unknown as GithubClient
const PROJECT_ID = toProjectId("acme/chart")
const BRANCH = toBranchName("main")

describe("createGithubAdapter", () => {
  it("各関数にクライアントを結びつけて呼ぶ", async () => {
    const adapter = createGithubAdapter(github)

    await adapter.listTags(PROJECT_ID)
    expect(listTags).toHaveBeenCalledWith(github, PROJECT_ID)

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
  })
})
