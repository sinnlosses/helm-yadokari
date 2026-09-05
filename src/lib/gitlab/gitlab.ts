import { Gitlab } from "@gitbeaker/rest"

import type {
  AppUpdatePlan,
  BranchName,
  ClientId,
  FileUpdate,
  GitLabUrl,
  HelmTargetBranchUpdate,
  ImageTagUpdate,
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
      return { status: pipeline.status, webUrl: toGitLabUrl(String(pipeline.web_url)) }
    } catch (error) {
      const status = extractHttpStatus(error)
      if (status === 404 || status === 403) return undefined
      throw error
    }
  })
}

/**
 * 向き先ブランチの更新は`helm.chart[]`をvaluesPath一致でアプリに振り分けた結果なので、
 * 同じ書き込み先が複数アプリの計画に現れうる。件数・表示は書き込み先（valuesPath+anchor）
 * 単位で一意にする（T-034）
 */
function uniqueHelmTargetBranchUpdates(
  plans: readonly AppUpdatePlan[],
): readonly HelmTargetBranchUpdate[] {
  const byTarget = new Map(
    plans.flatMap((plan) =>
      plan.helmTargetBranchUpdates.map((update): [string, HelmTargetBranchUpdate] => [
        `${update.target.valuesPath}#${update.target.anchor}`,
        update,
      ]),
    ),
  )
  return [...byTarget.values()]
}

/**
 * MRのタイトル。何が何件変わったかを種別ごとに示す（T-034。以前は「N app image tag(s)」と
 * 固定で、向き先ブランチだけが変わった場合もイメージタグが変わったように読めていた）。
 * 数える単位はアプリ数ではなく values.yaml の書き換え箇所数（1アプリが複数箇所を持つ
 * ケース、T-014、も正しく数えるため）。`apply-updates.ts` がコミットメッセージにも流用する。
 */
export function buildMrTitle(
  tenantId: TenantId,
  clientId: ClientId,
  plans: readonly AppUpdatePlan[],
): string {
  const imageTagCount = plans.reduce((count, plan) => count + plan.updates.length, 0)
  const helmBranchCount = uniqueHelmTargetBranchUpdates(plans).length
  const parts = [
    ...(imageTagCount > 0 ? [`image tag ${imageTagCount}`] : []),
    ...(helmBranchCount > 0 ? [`helm branch ${helmBranchCount}`] : []),
  ]
  const summary = parts.length > 0 ? ` (${parts.join(", ")})` : ""
  return `Auto MR by yadokari: update ${tenantId}/${clientId}${summary}`
}

function buildTagUrl(webUrl: GitLabUrl, tagName: TagName): string {
  return `${webUrl}/-/tags/${encodeURIComponent(tagName)}`
}

/**
 * イメージタグの更新1箇所分をテーブルの1行にする（T-036）。1アプリが複数箇所を書き換える
 * 場合（T-014）は同じリポジトリの行が箇所の数だけ並ぶため、ファイル・アンカーの列で区別する。
 * 比較・パイプラインはリンクテキストを付けずURLをそのまま載せ（GitLabが自動リンクする）、
 * 値が無いセルは `-` で埋める。
 */
function buildImageTagRow(webUrl: GitLabUrl, plan: AppUpdatePlan, update: ImageTagUpdate): string {
  const previousTagText = update.previousTag
    ? `[${update.previousTag}](${buildTagUrl(webUrl, update.previousTag)})`
    : "(未設定)"
  const compareUrl = update.previousTag
    ? `${webUrl}/-/compare/${encodeURIComponent(update.previousTag)}...${encodeURIComponent(plan.latestTag.name)}`
    : "-"
  const cells = [
    plan.app.projectName,
    `\`${update.target.valuesPath}\``,
    `\`${update.target.anchor}\``,
    previousTagText,
    `[${plan.latestTag.name}](${buildTagUrl(webUrl, plan.latestTag.name)})`,
    compareUrl,
    plan.pipeline ? plan.pipeline.webUrl : "-",
  ]
  return `| ${cells.join(" | ")} |`
}

/**
 * Helmの向き先ブランチの更新をテーブルにする（T-016、T-034、T-036）。
 * 向き先ブランチはclient単位で共通の値なので、イメージタグとは別のセクションに置く。
 * 書き込み先はイメージタグの表と同じくファイル・アンカーの2列に分ける。
 */
function buildHelmTargetBranchSection(updates: readonly HelmTargetBranchUpdate[]): string {
  return [
    "## Helmの向き先ブランチ",
    "",
    "| 旧ブランチ | 新ブランチ | ファイル | アンカー |",
    "| --- | --- | --- | --- |",
    ...updates.map((update) => {
      const previousBranchText = update.previousBranch ? `\`${update.previousBranch}\`` : "(未設定)"
      const cells = [
        previousBranchText,
        `\`${update.newBranch}\``,
        `\`${update.target.valuesPath}\``,
        `\`${update.target.anchor}\``,
      ]
      return `| ${cells.join(" | ")} |`
    }),
  ].join("\n")
}

export async function buildMrDescription(
  gitlab: GitlabClient,
  plans: readonly AppUpdatePlan[],
): Promise<string> {
  const initialAcc = {
    rows: [] as readonly string[],
    webUrlCache: new Map<ProjectId, GitLabUrl>(),
  }

  const { rows } = await plans
    .filter((plan) => plan.updates.length > 0)
    .reduce(async (accPromise, plan) => {
      const acc = await accPromise
      const webUrlCache = new Map(acc.webUrlCache)
      const webUrl = await getOrFetch(webUrlCache, plan.app.projectId, () =>
        getProjectWebUrl(gitlab, plan.app.projectId),
      )
      return {
        rows: [
          ...acc.rows,
          ...plan.updates.map((update) => buildImageTagRow(webUrl, plan, update)),
        ],
        webUrlCache,
      }
    }, Promise.resolve(initialAcc))

  const imageTagSection = [
    "## イメージタグ",
    "",
    "| リポジトリ | ファイル | アンカー | 旧タグ | 新タグ | 比較 | パイプライン |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n")

  const helmUpdates = uniqueHelmTargetBranchUpdates(plans)
  return [
    ...(rows.length > 0 ? [imageTagSection] : []),
    ...(helmUpdates.length > 0 ? [buildHelmTargetBranchSection(helmUpdates)] : []),
  ].join("\n\n")
}
