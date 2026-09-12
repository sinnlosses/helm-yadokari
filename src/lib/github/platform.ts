import type { Platform } from "../platform/platform.js"
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
} from "./github.js"
import { buildCompareUrl, buildTagUrl } from "./web-url.js"

/**
 * GitHubクライアントを`Platform`の形に組み立てる。`github.ts`の各関数は第1引数に
 * クライアントを取るが、ここで束ねることでクライアントは閉じ込められ、`Platform`の
 * 呼び出し側（`steps/`）には見えなくなる（`lib/gitlab/platform.ts`と同じ形）。
 */
export function createGithubPlatform(github: GithubClient): Platform {
  return {
    listTags: (projectId) => listTags(github, projectId),
    branchExists: (projectId, branch) => branchExists(github, projectId, branch),
    deleteBranch: (projectId, branch) => deleteBranch(github, projectId, branch),
    getBranchHeadSha: (projectId, branch) => getBranchHeadSha(github, projectId, branch),
    getFileContent: (projectId, filePath, ref) => getFileContent(github, projectId, filePath, ref),
    openMergeRequestExists: (projectId, sourceBranch) =>
      openMergeRequestExists(github, projectId, sourceBranch),
    commitFileUpdates: (projectId, featureBranch, baseBranch, message, files) =>
      commitFileUpdates(github, projectId, featureBranch, baseBranch, message, files),
    createMergeRequest: (projectId, sourceBranch, targetBranch, title, description) =>
      createMergeRequest(github, projectId, sourceBranch, targetBranch, title, description),
    createTag: (projectId, tagName, ref) => createTag(github, projectId, tagName, ref),
    getProjectWebUrl: (projectId) => getProjectWebUrl(github, projectId),
    getLatestPipelineForRef: (projectId, ref) => getLatestPipelineForRef(github, projectId, ref),
    buildTagUrl,
    buildCompareUrl,
  }
}
