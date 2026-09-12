import { describe, expect, it, vi } from "vitest"

vi.mock("../../../src/lib/gitlab/gitlab.js")

import { extractHttpStatus, isFatalError } from "../../../src/lib/gitlab/errors.js"
import {
  type GitlabClient,
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
} from "../../../src/lib/gitlab/gitlab.js"
import { createGitlabPlatform } from "../../../src/lib/gitlab/platform.js"
import { buildCompareUrl, buildTagUrl } from "../../../src/lib/gitlab/web-url.js"
import { toBranchName, toProjectId, toTagName, toValuesPath } from "../../../src/types/types.js"

const gitlab = {} as unknown as GitlabClient
const PROJECT_ID = toProjectId("1")
const BRANCH = toBranchName("main")

describe("createGitlabPlatform", () => {
  it("各関数にクライアントを結びつけて呼ぶ", async () => {
    const platform = createGitlabPlatform(gitlab)

    await platform.listTags(PROJECT_ID)
    expect(listTags).toHaveBeenCalledWith(gitlab, PROJECT_ID)

    await platform.branchExists(PROJECT_ID, BRANCH)
    expect(branchExists).toHaveBeenCalledWith(gitlab, PROJECT_ID, BRANCH)

    await platform.deleteBranch(PROJECT_ID, BRANCH)
    expect(deleteBranch).toHaveBeenCalledWith(gitlab, PROJECT_ID, BRANCH)

    await platform.getBranchHeadSha(PROJECT_ID, BRANCH)
    expect(getBranchHeadSha).toHaveBeenCalledWith(gitlab, PROJECT_ID, BRANCH)

    const valuesPath = toValuesPath("values.yaml")
    await platform.getFileContent(PROJECT_ID, valuesPath, BRANCH)
    expect(getFileContent).toHaveBeenCalledWith(gitlab, PROJECT_ID, valuesPath, BRANCH)

    await platform.openMergeRequestExists(PROJECT_ID, BRANCH)
    expect(openMergeRequestExists).toHaveBeenCalledWith(gitlab, PROJECT_ID, BRANCH)

    const files = [{ valuesPath, content: "content" }]
    await platform.commitFileUpdates(PROJECT_ID, BRANCH, BRANCH, "message", files)
    expect(commitFileUpdates).toHaveBeenCalledWith(
      gitlab,
      PROJECT_ID,
      BRANCH,
      BRANCH,
      "message",
      files,
    )

    await platform.createMergeRequest(PROJECT_ID, BRANCH, BRANCH, "title", "description")
    expect(createMergeRequest).toHaveBeenCalledWith(
      gitlab,
      PROJECT_ID,
      BRANCH,
      BRANCH,
      "title",
      "description",
    )

    const tagName = toTagName("v1")
    await platform.createTag(PROJECT_ID, tagName, BRANCH)
    expect(createTag).toHaveBeenCalledWith(gitlab, PROJECT_ID, tagName, BRANCH)

    await platform.getProjectWebUrl(PROJECT_ID)
    expect(getProjectWebUrl).toHaveBeenCalledWith(gitlab, PROJECT_ID)

    await platform.getLatestPipelineForRef(PROJECT_ID, tagName)
    expect(getLatestPipelineForRef).toHaveBeenCalledWith(gitlab, PROJECT_ID, tagName)
  })

  it("URLの組み立ては`web-url.ts`の純粋関数をそのまま渡す", () => {
    const platform = createGitlabPlatform(gitlab)
    expect(platform.buildTagUrl).toBe(buildTagUrl)
    expect(platform.buildCompareUrl).toBe(buildCompareUrl)
  })

  it("エラーの分類は`errors.ts`の関数をそのまま渡す", () => {
    // `steps/shared/step-outcome.ts`はここから渡った関数だけを見る。取り違えると
    // 別プラットフォームの形でステータスを探すことになり、すべての分類が黙って外れる
    const platform = createGitlabPlatform(gitlab)
    expect(platform.isFatalError).toBe(isFatalError)
    expect(platform.extractHttpStatus).toBe(extractHttpStatus)
  })
})
