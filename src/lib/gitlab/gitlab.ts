import { Gitlab } from "@gitbeaker/rest"

import type {
  AppUpdatePlan,
  BranchName,
  FileUpdate,
  GitLabUrl,
  PipelineInfo,
  ProjectId,
  TagName,
  ValuesPath,
} from "../../types.js"
import { toBranchName, toGitLabUrl, toTagName } from "../../types.js"
import { getOrFetch } from "../../utils/cache.js"
import { extractHttpStatus, isNotFoundError } from "../../utils/http.js"
import { withRetry } from "../../utils/retry.js"

export type GitlabClient = InstanceType<typeof Gitlab>

/** 全chartリポジトリで共通の固定ブランチ名。chartリポジトリ単位で1つのMRに集約するため使い回す */
export const UPDATE_BRANCH: BranchName = toBranchName("yadokari/update")

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

export async function listTagNames(gitlab: GitlabClient, projectId: ProjectId): Promise<TagName[]> {
  const tags = await withRetry(() => gitlab.Tags.all(projectId))
  return tags.map((tag) => toTagName(tag.name))
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
 * 固定ブランチへコミットを作成する。ブランチが存在しない場合は baseBranch から新規作成する。
 * 既存ブランチへのコミットは追加コミットとして積む。
 *
 * ファイルごとの action（create/update）は、参照先ブランチ（ブランチが既に存在すればそれ自身、
 * まだ無ければ baseBranch）に該当ファイルが既に存在するかで判定する。固定ブランチ自体は
 * 存在してもファイルは無い、というケースがあり得るため（例: MRがクローズされブランチが
 * 残ったまま、新しくvaluesPathが増えたアプリが追加された場合）、「ブランチが存在するか」だけで
 * 全ファイルのactionを決め打ちしない
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
  const referenceBranch = exists ? branch : baseBranch
  const actions = await Promise.all(
    files.map(async (file): Promise<CommitAction> => {
      const currentContent = await getFileContent(gitlab, projectId, file.filePath, referenceBranch)
      return {
        action: currentContent === undefined ? "create" : "update",
        filePath: file.filePath,
        content: file.content,
      }
    }),
  )
  await withRetry(() =>
    gitlab.Commits.create(
      projectId,
      branch,
      message,
      actions,
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
      return { status: pipeline.status, webUrl: toGitLabUrl(String(pipeline.web_url)) }
    } catch (error) {
      const status = extractHttpStatus(error)
      if (status === 404 || status === 403) return undefined
      throw error
    }
  })
}

export function buildMrTitle(plans: readonly AppUpdatePlan[]): string {
  return `chore: update ${plans.length} app image tag(s)`
}

function buildMrPlanSection(plan: AppUpdatePlan, webUrl: GitLabUrl): string {
  const tagUrl = `${webUrl}/-/tags/${encodeURIComponent(plan.latestTag.name)}`
  const pipelineLine = plan.pipeline
    ? `- パイプライン: [${plan.pipeline.status}](${plan.pipeline.webUrl})`
    : "- パイプライン: (見つかりません)"
  return [
    `### ${plan.app.projectName}`,
    `- タグ: ${plan.previousTag ?? "(未設定)"} → [${plan.latestTag.name}](${tagUrl})`,
    `- 打刻日時: ${plan.latestTag.builtAt.toISOString()}`,
    pipelineLine,
  ].join("\n")
}

/**
 * MRの本文を組み立てる。タグへのリンクは対象アプリのソースリポジトリのweb_urlを元に構築するため、
 * プロジェクトごとに `getProjectWebUrl()` を呼び出す（同一プロジェクトへの呼び出しはキャッシュする）。
 */
export async function buildMrDescription(
  gitlab: GitlabClient,
  plans: readonly AppUpdatePlan[],
): Promise<string> {
  const initialAcc = {
    sections: [] as readonly string[],
    webUrlCache: new Map<ProjectId, GitLabUrl>(),
  }

  const { sections } = await plans.reduce(async (accPromise, plan) => {
    const acc = await accPromise
    const webUrlCache = new Map(acc.webUrlCache)
    const webUrl = await getOrFetch(webUrlCache, plan.app.projectId, () =>
      getProjectWebUrl(gitlab, plan.app.projectId),
    )
    return { sections: [...acc.sections, buildMrPlanSection(plan, webUrl)], webUrlCache }
  }, Promise.resolve(initialAcc))

  return sections.join("\n\n")
}
