import { Gitlab } from "@gitbeaker/rest"

import type {
  AppUpdatePlan,
  BranchName,
  ClientId,
  FileUpdate,
  GitLabUrl,
  HelmTargetBranchUpdate,
  ImageTagUpdate,
  ParsedTag,
  PipelineInfo,
  ProjectId,
  TagInfo,
  TagName,
  TenantId,
  ValuesPath,
} from "../../types.js"
import { toBranchName, toGitLabUrl, toTagName } from "../../types.js"
import { getOrFetch } from "../../utils/cache.js"
import { extractHttpStatus, isNotFoundError } from "../../utils/http.js"
import { withRetry } from "../../utils/retry.js"

export type GitlabClient = InstanceType<typeof Gitlab>

/**
 * 1つの`(chartリポジトリ, tenantId, clientId)`分の更新に使う固定ブランチ名（T-019）。
 * 同じGitLabプロジェクト内で複数のtenantId/clientIdのMRが共存するため、IDをブランチ名に
 * 含めて分離する。
 */
export function buildUpdateBranch(tenantId: TenantId, clientId: ClientId): BranchName {
  return toBranchName(`feature/yadokari/${tenantId}/${clientId}`)
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

/** タグ名とそれが指すコミットSHAの一覧を返す */
export async function listTags(gitlab: GitlabClient, projectId: ProjectId): Promise<TagInfo[]> {
  const tags = await withRetry(() => gitlab.Tags.all(projectId))
  return tags.map((tag) => ({ name: toTagName(tag.name), commitSha: tag.commit.id }))
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
      return { status: pipeline.status, webUrl: toGitLabUrl(String(pipeline.web_url)) }
    } catch (error) {
      const status = extractHttpStatus(error)
      if (status === 404 || status === 403) return undefined
      throw error
    }
  })
}

export function buildMrTitle(
  tenantId: TenantId,
  clientId: ClientId,
  plans: readonly AppUpdatePlan[],
): string {
  return `Auto MR by yadokari: update ${tenantId}/${clientId} ${plans.length} app image tag(s)`
}

function buildTagUrl(webUrl: GitLabUrl, tagName: TagName): string {
  return `${webUrl}/-/tags/${encodeURIComponent(tagName)}`
}

/**
 * `chart`の1箇所分の更新内容を1行にまとめる。同じ最新タグを複数箇所（WebAPI/バッチ/
 * デーモンなど）へ反映するケース（T-014）では、この行がアプリ1件につき複数出力される
 */
function buildImageTagUpdateLine(
  webUrl: GitLabUrl,
  latestTag: ParsedTag,
  update: ImageTagUpdate,
): string {
  const previousTagText = update.previousTag
    ? `[${update.previousTag}](${buildTagUrl(webUrl, update.previousTag)})`
    : "(未設定)"
  const compareText = update.previousTag
    ? `[比較](${webUrl}/-/compare/${encodeURIComponent(update.previousTag)}...${encodeURIComponent(latestTag.name)})`
    : "(旧タグ未設定のため比較できません)"
  return `  - \`${update.target.valuesPath}\`（アンカー: ${update.target.anchor}）: ${previousTagText} → [${latestTag.name}](${buildTagUrl(webUrl, latestTag.name)}) / ${compareText}`
}

/** Helmの向き先ブランチの更新内容を1行にまとめる（T-016） */
function buildHelmTargetBranchUpdateLine(update: HelmTargetBranchUpdate): string {
  const previousBranchText = update.previousBranch ? `\`${update.previousBranch}\`` : "(未設定)"
  return `  - \`${update.target.valuesPath}\`（アンカー: ${update.target.anchor}、向き先ブランチ）: ${previousBranchText} → \`${update.newBranch}\``
}

function buildMrPlanSection(plan: AppUpdatePlan, webUrl: GitLabUrl): string {
  const pipelineLine = plan.pipeline
    ? `- パイプライン: [${plan.pipeline.status}](${plan.pipeline.webUrl})`
    : "- パイプライン: (見つかりません)"
  return [
    `### ${plan.app.projectName}`,
    `- 打刻日時: ${plan.latestTag.builtAt.toISOString()}`,
    pipelineLine,
    ...plan.updates.map((update) => buildImageTagUpdateLine(webUrl, plan.latestTag, update)),
    ...plan.helmTargetBranchUpdates.map((update) => buildHelmTargetBranchUpdateLine(update)),
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
