declare const projectIdBrand: unique symbol
export type ProjectId = number & { readonly [projectIdBrand]: never }
export function toProjectId(n: number): ProjectId {
  return n as ProjectId
}

declare const projectNameBrand: unique symbol
export type ProjectName = string & { readonly [projectNameBrand]: never }
export function toProjectName(s: string): ProjectName {
  return s as ProjectName
}

declare const branchNameBrand: unique symbol
export type BranchName = string & { readonly [branchNameBrand]: never }
export function toBranchName(s: string): BranchName {
  return s as BranchName
}

declare const tagNameBrand: unique symbol
export type TagName = string & { readonly [tagNameBrand]: never }
export function toTagName(s: string): TagName {
  return s as TagName
}

declare const gitLabUrlBrand: unique symbol
export type GitLabUrl = string & { readonly [gitLabUrlBrand]: never }
export function toGitLabUrl(s: string): GitLabUrl {
  return s as GitLabUrl
}

declare const valuesPathBrand: unique symbol
/** chart内でのvalues.yamlの相対パス */
export type ValuesPath = string & { readonly [valuesPathBrand]: never }
export function toValuesPath(s: string): ValuesPath {
  return s as ValuesPath
}

declare const dotPathBrand: unique symbol
/** values.yaml内の値を指すdotパス（例: "image.tag"） */
export type DotPath = string & { readonly [dotPathBrand]: never }
export function toDotPath(s: string): DotPath {
  return s as DotPath
}

/** ソースリポジトリ（タグが打たれるGitLabプロジェクト）に対応する1アプリの設定。apps.yamlの1エントリ */
export type AppConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly branchToSync: BranchName
  readonly chart: {
    readonly valuesPath: ValuesPath
    readonly imageTagKey: DotPath
  }
}

/** chartリポジトリ共通の設定。chart.yamlに対応する */
export type ChartRepoConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly mrTargetBranch: BranchName
}

/** config/<chartリポジトリ>/ 配下1つ分。chart.yaml + そのディレクトリ配下で見つかった全apps.yamlの集約 */
export type ChartGroup = {
  readonly chartDir: string
  readonly chart: ChartRepoConfig
  readonly apps: readonly AppConfig[]
}

export type Config = {
  readonly chartGroups: readonly ChartGroup[]
}

/** タグ名から読み取れる情報。追跡ブランチとビルド日時 */
export type ParsedTag = {
  readonly name: TagName
  readonly branch: BranchName
  readonly builtAt: Date
}

/** タグに紐づく最新パイプラインの情報 */
export type PipelineInfo = {
  readonly status: string
  readonly webUrl: GitLabUrl
}

/** 1アプリの更新内容。最新タグが反映済みタグと異なる場合にのみ生成される */
export type AppUpdatePlan = {
  readonly app: AppConfig
  readonly previousTag: TagName | undefined
  readonly latestTag: ParsedTag
  readonly pipeline: PipelineInfo | undefined
}

export type ChartUpdateResult = "CREATED" | "SKIPPED" | "ERROR"

export type RunResult = "SUCCESS" | "PARTIAL_FAILURE"

/** GitLabへコミットする1ファイル分の更新内容 */
export type FileUpdate = {
  readonly filePath: ValuesPath
  readonly content: string
}

/** 差分が確定し、コミット・MR作成の対象になった1chartグループ分の更新内容 */
export type ChartUpdateTarget = {
  readonly chartGroup: ChartGroup
  readonly plans: AppUpdatePlan[]
  readonly files: FileUpdate[]
}
