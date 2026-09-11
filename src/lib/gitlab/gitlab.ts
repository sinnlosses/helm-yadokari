import { Gitlab } from "@gitbeaker/rest"

import type {
  AccessToken,
  BranchName,
  CommitSha,
  FileUpdate,
  GitLabUrl,
  PipelineInfo,
  ProjectId,
  TagInfo,
  TagName,
  ValuesPath,
} from "../../types/types.js"
import { toCommitSha, toGitLabUrl, toTagName } from "../../types/types.js"
import { withRetry } from "../../utils/retry.js"
import { extractHttpStatus, isNotFoundError, isRetryableError } from "./errors.js"

export type GitlabClient = InstanceType<typeof Gitlab>

/**
 * GitLab APIへの1リクエストあたりの上限時間（ミリ秒）。gitbeakerはこの値を
 * `AbortSignal.timeout()`として全リクエストに載せる。gitbeakerが429/502で行う内部リトライも
 * 同じsignalを共有するため、これは**リトライ込みの総予算**になる。
 *
 * 値はgitbeakerの既定値と同じだが、明示しているのは既定値がバージョンアップで黙って変わっても
 * 気づけないため。超過時の`GitbeakerTimeoutError`は`isFatalError()`が致命的エラーとして扱う。
 */
const QUERY_TIMEOUT_MS = 300_000

export function createClient(host: GitLabUrl, token: AccessToken): GitlabClient {
  return new Gitlab({ host, token, queryTimeout: QUERY_TIMEOUT_MS })
}

/** タグ名とそれが指すコミットSHAの一覧を返す */
export async function listTags(gitlab: GitlabClient, projectId: ProjectId): Promise<TagInfo[]> {
  const tags = await withGitlabRetry(() => gitlab.Tags.all(projectId))
  return tags.map((tag) => ({ name: toTagName(tag.name), commitSha: toCommitSha(tag.commit.id) }))
}

/**
 * プロジェクトが存在し、アクセストークンで参照できるかを返す（404のときのみ false）。
 * 設定ファイルに書かれた projectId の実在確認に使う。
 */
export async function projectExists(gitlab: GitlabClient, projectId: ProjectId): Promise<boolean> {
  return withGitlabRetry(() =>
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
  return withGitlabRetry(() =>
    withNotFoundFallback(async () => {
      await gitlab.Branches.show(projectId, branch)
      return true
    }, false),
  )
}

export async function deleteBranch(
  gitlab: GitlabClient,
  projectId: ProjectId,
  branch: BranchName,
): Promise<void> {
  await withGitlabRetry(() => gitlab.Branches.remove(projectId, branch))
}

/** 指定ブランチの現在のHEADコミットSHAを返す。ブランチが存在しない場合は undefined */
export async function getBranchHeadSha(
  gitlab: GitlabClient,
  projectId: ProjectId,
  branch: BranchName,
): Promise<CommitSha | undefined> {
  return withGitlabRetry(() =>
    withNotFoundFallback(async () => {
      const result = await gitlab.Branches.show(projectId, branch)
      return toCommitSha(result.commit.id)
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
  return withGitlabRetry(() =>
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
  const mergeRequests = await withGitlabRetry(() =>
    gitlab.MergeRequests.all({
      projectId,
      sourceBranch,
      state: "opened",
    }),
  )
  return mergeRequests.length > 0
}

type CommitAction = { action: "update"; filePath: ValuesPath; content: string }

/**
 * `baseBranch` を起点に `featureBranch` を作り、渡したファイルを1コミットで積む。
 * `featureBranch` が既に存在する場合の扱い（削除して作り直すか）は呼び出し元の判断で、
 * ここでは行わない。
 *
 * ファイルごとの action は常に `update`。呼び出し元がここへ渡すのは、`baseBranch` 時点の内容を
 * 読み込めたファイルだけを書き換えた結果で、読み込めなければその時点で例外になる
 * （`steps/build-plans/sub-steps/shared/values-yaml-draft.ts`）。つまり `baseBranch` に
 * 存在しないファイルは渡ってこない。この前提は`lib/gitlab/`からは見えないためここに書く。
 */
export async function commitFileUpdates(
  gitlab: GitlabClient,
  projectId: ProjectId,
  featureBranch: BranchName,
  baseBranch: BranchName,
  message: string,
  files: readonly FileUpdate[],
): Promise<void> {
  // gitbeaker が可変配列を要求するため、ここだけ readonly にしない
  const actions: CommitAction[] = files.map((file) => ({
    action: "update",
    filePath: file.valuesPath,
    content: file.content,
  }))
  await withGitlabRetry(() =>
    gitlab.Commits.create(projectId, featureBranch, message, actions, { startBranch: baseBranch }),
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
  await withGitlabRetry(() =>
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
  await withGitlabRetry(() => gitlab.Tags.create(projectId, tagName, ref))
}

/** プロジェクトのweb URL（MR本文のリンクの起点）を返す */
export async function getProjectWebUrl(
  gitlab: GitlabClient,
  projectId: ProjectId,
): Promise<GitLabUrl> {
  const project = await withGitlabRetry(() => gitlab.Projects.show(projectId))
  return toGitLabUrl(String(project.web_url), "GitLab APIが返したプロジェクトの web_url")
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
  return withGitlabRetry(async () => {
    try {
      const pipeline = await gitlab.Pipelines.showLatest(projectId, { ref })
      return {
        webUrl: toGitLabUrl(String(pipeline.web_url), "GitLab APIが返したパイプラインの web_url"),
      }
    } catch (error) {
      const status = extractHttpStatus(error)
      if (status === 404 || status === 403) return undefined
      throw error
    }
  })
}

async function withNotFoundFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (isNotFoundError(error)) return fallback
    throw error
  }
}

/**
 * `lib/gitlab/`からのすべての呼び出しに同じリトライ方針を当てる。どのエラーを再試行するかの
 * 判断は`errors.ts`が持ち、`withRetry()`は指数バックオフの仕組みだけを提供する。
 */
function withGitlabRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, isRetryableError)
}
