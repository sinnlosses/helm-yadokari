import { Octokit } from "@octokit/rest"

import type {
  AccessToken,
  BranchName,
  CommitSha,
  FileUpdate,
  PipelineInfo,
  PlatformUrl,
  ProjectId,
  TagInfo,
  TagName,
  ValuesPath,
} from "../../types/types.js"
import { toCommitSha, toPlatformUrl, toTagName } from "../../types/types.js"
import { withRetry } from "../../utils/retry.js"
import { isNotFoundError, isRetryableError } from "./errors.js"

export type GithubClient = InstanceType<typeof Octokit>

// 一覧取得の1ページあたりの件数。GitHub REST APIが許す最大値で、ページ数＝リクエスト数が
// 最小になる。レート制限（認証済みで5,000req/h）を無駄に消費しないために明示する。
const PER_PAGE = 100

/**
 * `baseUrl`は**APIのエンドポイント**（github.comなら`https://api.github.com`、GHESなら
 * `https://<host>/api/v3`）で、リポジトリのweb URLではない。末尾のスラッシュを落とすのは、
 * Octokitが`baseUrl`とパスを単純連結するため、付いたままだと`//repos/...`になってしまうから。
 *
 * gitbeakerの`queryTimeout`にあたる設定はOctokitに無い。コンストラクタで
 * `request.signal`を渡すとクライアント1つにつき1本の`AbortSignal`を全リクエストが共有し、
 * 実行全体がその時間で打ち切られてしまうため、ここでは設定せずNode組み込みのfetchの
 * タイムアウトに委ねる。
 */
export function createClient(baseUrl: PlatformUrl, token: AccessToken): GithubClient {
  return new Octokit({ auth: token, baseUrl: baseUrl.replace(/\/+$/, "") })
}

/**
 * タグ名とそれが指すコミットSHAの一覧を返す。GitHubにはgitbeakerの`.all()`にあたる
 * 自動ページングが無いため`paginate()`を明示する（既定は1ページ30件で、タグが31件以上ある
 * リポジトリでは黙って取りこぼす）。
 */
export async function listTags(github: GithubClient, projectId: ProjectId): Promise<TagInfo[]> {
  const { owner, repo } = splitProjectId(projectId)
  const tags = await withGithubRetry(() =>
    github.paginate(github.rest.repos.listTags, { owner, repo, per_page: PER_PAGE }),
  )
  return tags.map((tag) => ({ name: toTagName(tag.name), commitSha: toCommitSha(tag.commit.sha) }))
}

export async function branchExists(
  github: GithubClient,
  projectId: ProjectId,
  branch: BranchName,
): Promise<boolean> {
  const { owner, repo } = splitProjectId(projectId)
  return withGithubRetry(() =>
    withNotFoundFallback(async () => {
      await github.rest.repos.getBranch({ owner, repo, branch })
      return true
    }, false),
  )
}

export async function deleteBranch(
  github: GithubClient,
  projectId: ProjectId,
  branch: BranchName,
): Promise<void> {
  const { owner, repo } = splitProjectId(projectId)
  // ref削除のエンドポイントは`refs/`を含まない形（`heads/<branch>`）を受け取る。
  // 作成側（`createTag()`）が`refs/tags/<tag>`を渡すのと非対称なのはGitHub API側の仕様。
  await withGithubRetry(() => github.rest.git.deleteRef({ owner, repo, ref: `heads/${branch}` }))
}

/** 指定ブランチの現在のHEADコミットSHAを返す。ブランチが存在しない場合は undefined */
export async function getBranchHeadSha(
  github: GithubClient,
  projectId: ProjectId,
  branch: BranchName,
): Promise<CommitSha | undefined> {
  const { owner, repo } = splitProjectId(projectId)
  return withGithubRetry(() =>
    withNotFoundFallback(async () => {
      const result = await github.rest.repos.getBranch({ owner, repo, branch })
      return toCommitSha(result.data.commit.sha)
    }, undefined),
  )
}

/**
 * 指定した ref 時点の values.yaml の内容を返す。ファイルが存在しない場合は undefined を返す。
 *
 * **1MBを超えるファイルは取得できずエラーになる。** GitHubはその場合`content`を空文字・
 * `encoding`を`"none"`にして返し、内容を得るにはraw media typeかGit Blobs APIへの
 * 切り替えが要る。values.yamlがその大きさになることは実運用で起きないため、黙って空文字を
 * 返して差分を壊すより、どのファイルが原因かが読めるエラーで止める。
 */
export async function getFileContent(
  github: GithubClient,
  projectId: ProjectId,
  filePath: ValuesPath,
  ref: BranchName,
): Promise<string | undefined> {
  const { owner, repo } = splitProjectId(projectId)
  return withGithubRetry(() =>
    withNotFoundFallback(async () => {
      const result = await github.rest.repos.getContent({ owner, repo, path: filePath, ref })
      return decodeFileContent(result.data, filePath)
    }, undefined),
  )
}

export async function openMergeRequestExists(
  github: GithubClient,
  projectId: ProjectId,
  sourceBranch: BranchName,
): Promise<boolean> {
  const { owner, repo } = splitProjectId(projectId)
  const pulls = await withGithubRetry(() =>
    // `head`は`<owner>:<ブランチ名>`の形でしか絞り込めない。フォークからのPRは対象外になるが、
    // このツールが作るPRは常に同じリポジトリ内のブランチが起点。
    github.rest.pulls.list({ owner, repo, head: `${owner}:${sourceBranch}`, state: "open" }),
  )
  return pulls.data.length > 0
}

/**
 * `baseBranch` を起点に `featureBranch` を作り、渡したファイルを1コミットで積む。
 *
 * **未実装。** GitHubにはGitLabの`POST /projects/:id/repository/commits`に相当する
 * 「複数ファイルの更新とブランチ作成を1呼び出しで行う」エンドポイントが無く、Git Data APIの
 * 4呼び出し（`getRef`→`createTree`→`createCommit`→`createRef`）に分解する必要がある。
 * シグネチャだけを`lib/gitlab/`と揃えて先に置いてある。
 */
export function commitFileUpdates(
  _github: GithubClient,
  _projectId: ProjectId,
  _featureBranch: BranchName,
  _baseBranch: BranchName,
  _message: string,
  _files: readonly FileUpdate[],
): Promise<void> {
  throw new Error("lib/github/ の commitFileUpdates は未実装です")
}

export async function createMergeRequest(
  github: GithubClient,
  projectId: ProjectId,
  sourceBranch: BranchName,
  targetBranch: BranchName,
  title: string,
  description: string,
): Promise<void> {
  const { owner, repo } = splitProjectId(projectId)
  await withGithubRetry(() =>
    github.rest.pulls.create({
      owner,
      repo,
      head: sourceBranch,
      base: targetBranch,
      title,
      body: description,
    }),
  )
}

/**
 * 追跡ブランチの最新コミットに対して、指定した名前のタグを作成する。
 *
 * GitLabの`Tags.create`はrefにブランチ名を渡せるが、GitHubの`git.createRef`は**コミットSHA
 * 必須**なので、ここでブランチのHEADを引いてから作る（1関数あたり2呼び出しになる唯一の理由）。
 * 呼び出し元も同じSHAを持っているが、その受け渡しのためにシグネチャを変えるとGitLab側と
 * `steps/`にも波及するため、差はこのファイルの中に閉じ込める。
 */
export async function createTag(
  github: GithubClient,
  projectId: ProjectId,
  tagName: TagName,
  ref: BranchName,
): Promise<void> {
  const { owner, repo } = splitProjectId(projectId)
  const sha = await getBranchHeadSha(github, projectId, ref)
  if (sha === undefined) {
    throw new Error(`タグ "${tagName}" の作成元ブランチ "${ref}" が見つかりません`)
  }
  await withGithubRetry(() =>
    github.rest.git.createRef({ owner, repo, ref: `refs/tags/${tagName}`, sha }),
  )
}

/** リポジトリのweb URL（MR本文のリンクの起点）を返す */
export async function getProjectWebUrl(
  github: GithubClient,
  projectId: ProjectId,
): Promise<PlatformUrl> {
  const { owner, repo } = splitProjectId(projectId)
  const result = await withGithubRetry(() => github.rest.repos.get({ owner, repo }))
  return toPlatformUrl(String(result.data.html_url), "GitHub APIが返したリポジトリの html_url")
}

/**
 * 指定した ref（タグ名）に紐づく最新のワークフロー実行を返す。存在しない場合は undefined。
 *
 * GitHub Actionsの実行一覧はタグ名では絞り込めず`head_sha`が要るため、先にタグをコミットに
 * 解決する。`repos.getCommit`のrefはコミットSHA・ブランチ名・タグ名のいずれも受け、
 * annotated tagも中身のコミットまで辿ってくれる。実行一覧は新しい順に返るため先頭が最新。
 */
export async function getLatestPipelineForRef(
  github: GithubClient,
  projectId: ProjectId,
  ref: TagName,
): Promise<PipelineInfo | undefined> {
  const { owner, repo } = splitProjectId(projectId)
  return withGithubRetry(() =>
    withNotFoundFallback(async () => {
      const commit = await github.rest.repos.getCommit({ owner, repo, ref })
      const runs = await github.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        head_sha: commit.data.sha,
        per_page: 1,
      })
      const [latest] = runs.data.workflow_runs
      if (latest === undefined) return undefined
      return {
        webUrl: toPlatformUrl(
          String(latest.html_url),
          "GitHub APIが返したワークフロー実行の html_url",
        ),
      }
    }, undefined),
  )
}

/**
 * `ProjectId`をOctokitが別々に受け取る`owner`と`repo`に分ける。`ProjectId`は形式を検証しない
 * ブランド型（`types/brand.ts`）なので、GitHub向けの形になっているかを見るのはここだけ。
 * GitLab流の数値IDが`config/`に残っていても、どの値が原因かが読めるメッセージで止まる。
 */
function splitProjectId(projectId: ProjectId): { readonly owner: string; readonly repo: string } {
  const [owner, repo, ...rest] = projectId.split("/")
  if (owner === undefined || repo === undefined || rest.length > 0 || owner === "" || repo === "") {
    throw new Error(`GitHubのprojectIdは "owner/repo" の形式で指定してください: "${projectId}"`)
  }
  return { owner, repo }
}

type GetContentResponseData = Awaited<
  ReturnType<GithubClient["rest"]["repos"]["getContent"]>
>["data"]

/**
 * `repos.getContent`の戻り値はパスの中身によってディレクトリ（配列）・ファイル・シンボリック
 * リンク・サブモジュールのいずれにもなるため、ファイルであることを確かめてからデコードする。
 */
function decodeFileContent(data: GetContentResponseData, filePath: ValuesPath): string {
  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`"${filePath}" はファイルではありません`)
  }
  if (data.encoding !== "base64") {
    throw new Error(
      `"${filePath}" の内容を取得できませんでした（encoding: "${data.encoding}"）。` +
        `GitHubは1MBを超えるファイルの内容を返しません`,
    )
  }
  return Buffer.from(data.content, "base64").toString("utf-8")
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
 * `lib/github/`からのすべての呼び出しに同じリトライ方針を当てる。どのエラーを再試行するかの
 * 判断は`errors.ts`が持ち、`withRetry()`は指数バックオフの仕組みだけを提供する。
 */
function withGithubRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, isRetryableError)
}
