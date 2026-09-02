import { Gitlab } from "@gitbeaker/rest"

import type { BranchName, GitLabUrl, ProjectId } from "../types.js"
import { isNotFoundError } from "../utils/http.js"
import { withRetry } from "../utils/retry.js"

export type GitlabClient = InstanceType<typeof Gitlab>

export type PipelineInfo = {
  readonly status: string
  readonly webUrl: string
}

export function createClient(host: GitLabUrl, token: string): GitlabClient {
  return new Gitlab({ host, token })
}

/**
 * fn() を実行し、404エラーのときだけ fallback を返す。404以外のエラーは再スローする。
 */
async function withNotFoundFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (isNotFoundError(error)) return fallback
    throw error
  }
}

export async function listTagNames(gitlab: GitlabClient, projectId: ProjectId): Promise<string[]> {
  const tags = await withRetry(() => gitlab.Tags.all(projectId))
  return tags.map((tag) => tag.name)
}

export async function branchExists(
  gitlab: GitlabClient,
  projectId: ProjectId,
  branch: BranchName,
): Promise<boolean> {
  return withRetry(() =>
    withNotFoundFallback(async () => {
      await gitlab.Branches.show(projectId, branch)
      return true
    }, false),
  )
}

/**
 * 指定した ref 時点の values.yaml の内容を返す。ファイルが存在しない場合は undefined を返す。
 */
export async function getFileContent(
  gitlab: GitlabClient,
  projectId: ProjectId,
  filePath: string,
  ref: BranchName,
): Promise<string | undefined> {
  return withRetry(() =>
    withNotFoundFallback(async () => {
      const file = await gitlab.RepositoryFiles.show(projectId, filePath, ref)
      return Buffer.from(file.content, "base64").toString("utf-8")
    }, undefined),
  )
}

export async function openMergeRequestExists(
  gitlab: GitlabClient,
  projectId: ProjectId,
  sourceBranch: BranchName,
): Promise<boolean> {
  const mergeRequests = await withRetry(() =>
    gitlab.MergeRequests.all({
      projectId,
      sourceBranch,
      state: "opened",
    }),
  )
  return mergeRequests.length > 0
}

export type FileUpdate = {
  readonly filePath: string
  readonly content: string
}

/**
 * 固定ブランチへコミットを作成する。ブランチが存在しない場合は baseBranch から新規作成する。
 * 既存ブランチへのコミットは追加コミットとして積む。
 */
export async function commitFileUpdates(
  gitlab: GitlabClient,
  projectId: ProjectId,
  branch: BranchName,
  baseBranch: BranchName,
  message: string,
  files: readonly FileUpdate[],
): Promise<void> {
  const exists = await branchExists(gitlab, projectId, branch)
  await withRetry(() =>
    gitlab.Commits.create(
      projectId,
      branch,
      message,
      files.map((file) => ({ action: "update", filePath: file.filePath, content: file.content })),
      exists ? {} : { startBranch: baseBranch },
    ),
  )
}

export async function createMergeRequest(
  gitlab: GitlabClient,
  projectId: ProjectId,
  sourceBranch: BranchName,
  targetBranch: BranchName,
  title: string,
  description: string,
): Promise<void> {
  await withRetry(() =>
    gitlab.MergeRequests.create(projectId, sourceBranch, targetBranch, title, { description }),
  )
}

/**
 * 追跡ブランチの最新コミットに対して、指定した名前のタグを作成する。
 */
export async function createTag(
  gitlab: GitlabClient,
  projectId: ProjectId,
  tagName: string,
  ref: BranchName,
): Promise<void> {
  await withRetry(() => gitlab.Tags.create(projectId, tagName, ref))
}

export async function getProjectWebUrl(
  gitlab: GitlabClient,
  projectId: ProjectId,
): Promise<string> {
  const project = await withRetry(() => gitlab.Projects.show(projectId))
  return String(project.web_url)
}

/**
 * 指定した ref（タグ名）に紐づく最新のパイプラインを返す。パイプラインが存在しない場合は undefined。
 */
export async function getLatestPipelineForRef(
  gitlab: GitlabClient,
  projectId: ProjectId,
  ref: string,
): Promise<PipelineInfo | undefined> {
  return withRetry(() =>
    withNotFoundFallback(async () => {
      const pipeline = await gitlab.Pipelines.showLatest(projectId, { ref })
      return { status: pipeline.status, webUrl: String(pipeline.web_url) }
    }, undefined),
  )
}
