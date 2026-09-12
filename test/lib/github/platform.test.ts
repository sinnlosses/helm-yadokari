import { describe, expect, it, vi } from "vitest"

vi.mock("../../../src/lib/github/github.js")

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
import { createGithubPlatform } from "../../../src/lib/github/platform.js"
import { buildCompareUrl, buildTagUrl } from "../../../src/lib/github/web-url.js"
import { toBranchName, toProjectId, toTagName, toValuesPath } from "../../../src/types/types.js"

const github = {} as unknown as GithubClient
const PROJECT_ID = toProjectId("acme/chart")
const BRANCH = toBranchName("main")

describe("createGithubPlatform", () => {
  it("各関数にクライアントを結びつけて呼ぶ", async () => {
    const platform = createGithubPlatform(github)

    await platform.listTags(PROJECT_ID)
    expect(listTags).toHaveBeenCalledWith(github, PROJECT_ID)

    await platform.branchExists(PROJECT_ID, BRANCH)
    expect(branchExists).toHaveBeenCalledWith(github, PROJECT_ID, BRANCH)

    await platform.deleteBranch(PROJECT_ID, BRANCH)
    expect(deleteBranch).toHaveBeenCalledWith(github, PROJECT_ID, BRANCH)

    await platform.getBranchHeadSha(PROJECT_ID, BRANCH)
    expect(getBranchHeadSha).toHaveBeenCalledWith(github, PROJECT_ID, BRANCH)

    const valuesPath = toValuesPath("values.yaml")
    await platform.getFileContent(PROJECT_ID, valuesPath, BRANCH)
    expect(getFileContent).toHaveBeenCalledWith(github, PROJECT_ID, valuesPath, BRANCH)

    await platform.openMergeRequestExists(PROJECT_ID, BRANCH)
    expect(openMergeRequestExists).toHaveBeenCalledWith(github, PROJECT_ID, BRANCH)

    const files = [{ valuesPath, content: "content" }]
    await platform.commitFileUpdates(PROJECT_ID, BRANCH, BRANCH, "message", files)
    expect(commitFileUpdates).toHaveBeenCalledWith(
      github,
      PROJECT_ID,
      BRANCH,
      BRANCH,
      "message",
      files,
    )

    await platform.createMergeRequest(PROJECT_ID, BRANCH, BRANCH, "title", "description")
    expect(createMergeRequest).toHaveBeenCalledWith(
      github,
      PROJECT_ID,
      BRANCH,
      BRANCH,
      "title",
      "description",
    )

    const tagName = toTagName("v1")
    await platform.createTag(PROJECT_ID, tagName, BRANCH)
    expect(createTag).toHaveBeenCalledWith(github, PROJECT_ID, tagName, BRANCH)

    await platform.getProjectWebUrl(PROJECT_ID)
    expect(getProjectWebUrl).toHaveBeenCalledWith(github, PROJECT_ID)

    await platform.getLatestPipelineForRef(PROJECT_ID, tagName)
    expect(getLatestPipelineForRef).toHaveBeenCalledWith(github, PROJECT_ID, tagName)
  })

  it("URLの組み立ては`web-url.ts`の純粋関数をそのまま渡す", () => {
    const platform = createGithubPlatform(github)
    expect(platform.buildTagUrl).toBe(buildTagUrl)
    expect(platform.buildCompareUrl).toBe(buildCompareUrl)
  })
})
