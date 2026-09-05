import { Gitlab } from "@gitbeaker/rest"

import type {
  BranchName,
  FileUpdate,
  GitLabUrl,
  PipelineInfo,
  ProjectId,
  TagInfo,
  TagName,
  ValuesPath,
} from "../../types.js"
import { toGitLabUrl, toTagName } from "../../types.js"
import { extractHttpStatus, isNotFoundError } from "../../utils/http.js"
import { withRetry } from "../../utils/retry.js"

export type GitlabClient = InstanceType<typeof Gitlab>

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

/** タグ名とそれが指すコミットSHAの一覧を返す */
export async function listTags(gitlab: GitlabClient, projectId: ProjectId): Promise<TagInfo[]> {
  const tags = await withRetry(() => gitlab.Tags.all(projectId))
  return tags.map((tag) => ({ name: toTagName(tag.name), commitSha: tag.commit.id }))
}

/**
 * プロジェクトが存在し、アクセストークンで参照できるかを返す（404のときのみ false）。
 * 設定ファイルに書かれた projectId の実在確認に使う。
 */
export async function projectExists(gitlab: GitlabClient, projectId: ProjectId): Promise<boolean> {
  return withRetry(() =>
    withNotFoundFallback(async () => {
      await gitlab.Projects.show(projectId)
      return true
    }, false),
  )
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

/** 指定ブランチを削除する */
export async function deleteBranch(
  gitlab: GitlabClient,
  projectId: ProjectId,
  branch: BranchName,
): Promise<void> {
  await withRetry(() => gitlab.Branches.remove(projectId, branch))
}

/** 指定ブランチの現在のHEADコミットSHAを返す。ブランチが存在しない場合は undefined */
export async function getBranchHeadSha(
  gitlab: GitlabClient,
  projectId: ProjectId,
  branch: BranchName,
): Promise<string | undefined> {
  return withRetry(() =>
    withNotFoundFallback(async () => {
      const result = await gitlab.Branches.show(projectId, branch)
      return result.commit.id
    }, undefined),
  )
}

/**
 * 指定した ref 時点の values.yaml の内容を返す。ファイルが存在しない場合は undefined を返す。
 */
export async function getFileContent(
  gitlab: GitlabClient,
  projectId: ProjectId,
  filePath: ValuesPath,
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

type CommitAction = { action: "create" | "update"; filePath: ValuesPath; content: string }

/**
 * 固定ブランチへコミットを作成する。呼び出し元（`filterTargets`）が、このブランチに
 * オープン中のMRが無いことを既に確認済みである前提のため、ブランチが既に存在する場合は
 * （マージ済み・クローズ済みいずれのMRの残骸であっても）一旦削除し、`baseBranch` から
 * 常に新規作成し直す（T-021）。これにより、過去の（もう追跡していない）変更が新しいMRの
 * 差分に紛れ込むことを防ぐ。
 *
 * ファイルごとの action（create/update）は、常に `baseBranch` に該当ファイルが既に
 * 存在するかで判定する（ブランチを作り直す前提のため、判定基準は常に `baseBranch` でよい）。
 */
export async function commitFileUpdates(
  gitlab: GitlabClient,
  projectId: ProjectId,
  branch: BranchName,
  baseBranch: BranchName,
  message: string,
  files: readonly FileUpdate[],
): Promise<void> {
  if (await branchExists(gitlab, projectId, branch)) {
    await deleteBranch(gitlab, projectId, branch)
  }
  const actions = await Promise.all(
    files.map(async (file): Promise<CommitAction> => {
      const currentContent = await getFileContent(gitlab, projectId, file.filePath, baseBranch)
      return {
        action: currentContent === undefined ? "create" : "update",
        filePath: file.filePath,
        content: file.content,
      }
    }),
  )
  await withRetry(() =>
    gitlab.Commits.create(projectId, branch, message, actions, { startBranch: baseBranch }),
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
  tagName: TagName,
  ref: BranchName,
): Promise<void> {
  await withRetry(() => gitlab.Tags.create(projectId, tagName, ref))
}

export async function getProjectWebUrl(
  gitlab: GitlabClient,
  projectId: ProjectId,
): Promise<GitLabUrl> {
  const project = await withRetry(() => gitlab.Projects.show(projectId))
  return toGitLabUrl(String(project.web_url))
}

/**
 * 指定した ref（タグ名）に紐づく最新のパイプラインを返す。パイプラインが存在しない場合は undefined。
 * GitLab実機で確認済みの挙動として、`pipelines/latest` は該当プロジェクトにパイプラインが
 * 1件も無い場合、404ではなく403を返す。パイプライン情報はMR本文への参考情報にすぎず
 * 更新処理の必須条件ではないため、404と同様に「パイプライン無し」として扱う。
 */
export async function getLatestPipelineForRef(
  gitlab: GitlabClient,
  projectId: ProjectId,
  ref: TagName,
): Promise<PipelineInfo | undefined> {
  return withRetry(async () => {
    try {
      const pipeline = await gitlab.Pipelines.showLatest(projectId, { ref })
      return { webUrl: toGitLabUrl(String(pipeline.web_url)) }
    } catch (error) {
      const status = extractHttpStatus(error)
      if (status === 404 || status === 403) return undefined
      throw error
    }
  })
}
