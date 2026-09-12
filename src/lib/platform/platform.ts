import type {
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

/**
 * GitLab・GitHubのどちらでチャートリポジトリを管理していても`steps/`が同じ形で呼べるようにする
 * 関数テーブル。`lib/gitlab/`・`lib/github/`がそれぞれこの形の値を組み立てて渡す
 * （`lib/gitlab/platform.ts`の`createGitlabPlatform()`）。1回の実行でGitLab・GitHubの混在は
 * させないため、`steps/`はどちらの実装が渡ってきたかを気にしない。
 *
 * 各関数はプロジェクトやアクセストークンを結びつけたクライアントを内側に閉じ込めた状態で渡る
 * ため、`steps/`の引数にはクライアントの型が一切出てこない。
 */
export type Platform = {
  /** タグ名とそれが指すコミットSHAの一覧を返す */
  readonly listTags: (projectId: ProjectId) => Promise<TagInfo[]>

  readonly branchExists: (projectId: ProjectId, branch: BranchName) => Promise<boolean>

  readonly deleteBranch: (projectId: ProjectId, branch: BranchName) => Promise<void>

  /** 指定ブランチの現在のHEADコミットSHAを返す。ブランチが存在しない場合は undefined */
  readonly getBranchHeadSha: (
    projectId: ProjectId,
    branch: BranchName,
  ) => Promise<CommitSha | undefined>

  /** 指定した ref 時点の values.yaml の内容を返す。ファイルが存在しない場合は undefined */
  readonly getFileContent: (
    projectId: ProjectId,
    filePath: ValuesPath,
    ref: BranchName,
  ) => Promise<string | undefined>

  readonly openMergeRequestExists: (
    projectId: ProjectId,
    sourceBranch: BranchName,
  ) => Promise<boolean>

  /**
   * `baseBranch` を起点に `featureBranch` を作り、渡したファイルを1コミットで積む。
   * `featureBranch` が既に存在する場合の扱いは呼び出し元の判断で、ここでは行わない。
   */
  readonly commitFileUpdates: (
    projectId: ProjectId,
    featureBranch: BranchName,
    baseBranch: BranchName,
    message: string,
    files: readonly FileUpdate[],
  ) => Promise<void>

  readonly createMergeRequest: (
    projectId: ProjectId,
    sourceBranch: BranchName,
    targetBranch: BranchName,
    title: string,
    description: string,
  ) => Promise<void>

  /** 追跡ブランチの最新コミットに対して、指定した名前のタグを作成する */
  readonly createTag: (projectId: ProjectId, tagName: TagName, ref: BranchName) => Promise<void>

  /** プロジェクトのweb URL（MR本文のリンクの起点）を返す */
  readonly getProjectWebUrl: (projectId: ProjectId) => Promise<PlatformUrl>

  /** 指定した ref（タグ名）に紐づく最新のパイプラインを返す。存在しない場合は undefined */
  readonly getLatestPipelineForRef: (
    projectId: ProjectId,
    ref: TagName,
  ) => Promise<PipelineInfo | undefined>

  /** プロジェクトのweb URL配下の、タグ1件分のページURLを組み立てる */
  readonly buildTagUrl: (webUrl: PlatformUrl, tagName: TagName) => PlatformUrl

  /** プロジェクトのweb URL配下の、2つのタグ間の比較ページURLを組み立てる */
  readonly buildCompareUrl: (webUrl: PlatformUrl, from: TagName, to: TagName) => PlatformUrl
}
