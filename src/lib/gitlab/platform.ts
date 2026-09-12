import type { Platform } from "../platform/platform.js"
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
} from "./gitlab.js"
import { buildCompareUrl, buildTagUrl } from "./web-url.js"

/**
 * GitLabクライアントを`Platform`の形に組み立てる。`gitlab.ts`の各関数は第1引数に
 * クライアントを取るが、ここで束ねることでクライアントは閉じ込められ、`Platform`の
 * 呼び出し側（`steps/`）には見えなくなる。
 *
 * `projectExists`はここに含めない。`steps/`のどのファイルからも呼ばれておらず
 * （`scripts/lint/remote-existence/`だけが使う、本体パイプライン外の読み取り専用チェック）、
 * `Platform`は`steps/`が必要とする関数だけを並べる。
 */
export function createGitlabPlatform(gitlab: GitlabClient): Platform {
  return {
    listTags: (projectId) => listTags(gitlab, projectId),
    branchExists: (projectId, branch) => branchExists(gitlab, projectId, branch),
    deleteBranch: (projectId, branch) => deleteBranch(gitlab, projectId, branch),
    getBranchHeadSha: (projectId, branch) => getBranchHeadSha(gitlab, projectId, branch),
    getFileContent: (projectId, filePath, ref) => getFileContent(gitlab, projectId, filePath, ref),
    openMergeRequestExists: (projectId, sourceBranch) =>
      openMergeRequestExists(gitlab, projectId, sourceBranch),
    commitFileUpdates: (projectId, featureBranch, baseBranch, message, files) =>
      commitFileUpdates(gitlab, projectId, featureBranch, baseBranch, message, files),
    createMergeRequest: (projectId, sourceBranch, targetBranch, title, description) =>
      createMergeRequest(gitlab, projectId, sourceBranch, targetBranch, title, description),
    createTag: (projectId, tagName, ref) => createTag(gitlab, projectId, tagName, ref),
    getProjectWebUrl: (projectId) => getProjectWebUrl(gitlab, projectId),
    getLatestPipelineForRef: (projectId, ref) => getLatestPipelineForRef(gitlab, projectId, ref),
    buildTagUrl,
    buildCompareUrl,
  }
}
