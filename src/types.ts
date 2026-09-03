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

declare const chartDirNameBrand: unique symbol
/** config/ 直下、1chart分の設定を束ねるディレクトリ名（例: "teamA-chart"） */
export type ChartDirName = string & { readonly [chartDirNameBrand]: never }
export function toChartDirName(s: string): ChartDirName {
  return s as ChartDirName
}

declare const anchorNameBrand: unique symbol
/**
 * values.yaml内のYAMLアンカー名（例: `&tenant1client1AppsVersion`の`tenant1client1AppsVersion`
 * 部分）。オブジェクトのネストではなく配列要素にアンカーで名前を付けた構成のvalues.yamlで、
 * `imageTagKey`（dotパス）の代わりに値の位置を指定するために使う
 */
export type AnchorName = string & { readonly [anchorNameBrand]: never }
export function toAnchorName(s: string): AnchorName {
  return s as AnchorName
}

/**
 * TARGET_CLIENT環境変数由来、1件分のtenantId/clientIdの組。config/のディレクトリ階層
 * `<chartDir>/<tenantId>/<clientId>/`に対応する絞り込み条件。永続化されるドメイン値では
 * なくディレクトリ名との単純な文字列比較にしか使わないため、非ブランド型のまま扱う
 * （`docs/glossary.md`の「テナント / クライアント」の項も参照）
 */
export type TargetClient = {
  readonly tenantId: string
  readonly clientId: string
}

/**
 * values.yaml内でイメージタグの値がどこにあるかを指す2通りの方式。
 * `imageTagKey`はオブジェクトのネストをdotパスで辿る（例: "image.tag"）。
 * `imageTagAnchor`は配列要素にYAMLアンカーで名前を付けた構成向けで、アンカー名で
 * 該当要素を直接指す（例: `variables: [&tenant1client1AppsVersion main, ...]`）。
 * 1アプリにつきどちらか一方のみを指定する
 */
export type ImageTagLocation =
  | { readonly imageTagKey: DotPath }
  | { readonly imageTagAnchor: AnchorName }

/** ソースリポジトリ（タグが打たれるGitLabプロジェクト）に対応する1アプリの設定。apps.yamlの1エントリ */
export type AppConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly branchToSync: BranchName
  readonly chart: { readonly valuesPath: ValuesPath } & ImageTagLocation
}

/** chartリポジトリ共通の設定。chart.yamlに対応する */
export type ChartRepoConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly mrTargetBranch: BranchName
}

/** config/<chartリポジトリ>/ 配下1つ分。chart.yaml + そのディレクトリ配下で見つかった全apps.yamlの集約 */
export type ChartAndApps = {
  readonly chartDir: ChartDirName
  readonly chart: ChartRepoConfig
  readonly apps: readonly AppConfig[]
}

export type Config = {
  readonly chartAndAppsList: readonly ChartAndApps[]
}

/** タグ名から読み取れる情報。追跡ブランチとビルド日時 */
export type ParsedTag = {
  readonly name: TagName
  readonly branch: BranchName
  readonly builtAt: Date
}

/**
 * GitLab CIパイプラインの実行状態。GitLab側のドキュメントに載っている既知の値をリテラルで
 * 列挙しつつ、`@gitbeaker/rest`の型自体が`string`のままで将来の値追加を保証しないため、
 * 未知の文字列も引き続き受け付ける（分岐ロジックがなくログ・MR本文への埋め込みにしか
 * 使わないため、未知の値が来ても実行時エラーにはならない）
 */
export type PipelineStatus =
  | "created"
  | "waiting_for_resource"
  | "preparing"
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "canceled"
  | "skipped"
  | "manual"
  | "scheduled"
  | (string & {})

/** タグに紐づく最新パイプラインの情報 */
export type PipelineInfo = {
  readonly status: PipelineStatus
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
  readonly chartAndApps: ChartAndApps
  readonly plans: AppUpdatePlan[]
  readonly files: FileUpdate[]
}
