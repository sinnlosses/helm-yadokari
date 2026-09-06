/**
 * ドメイン固有のブランド型と、その生成に使う factory 関数。`src/` 内で `as` を使うのは
 * このファイルだけ。`src/types/types.ts` から再エクスポートしている。
 */

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

declare const commitShaBrand: unique symbol
/** GitLab APIが返すコミットSHA。タグ名との取り違えを型で防ぐためにブランド型にしている */
export type CommitSha = string & { readonly [commitShaBrand]: never }
export function toCommitSha(s: string): CommitSha {
  return s as CommitSha
}

declare const tagFormatBrand: unique symbol
/** タグ命名規則のテンプレート文字列（検証は `lib/tag-format.ts` の `validateTagFormat()`） */
export type TagFormat = string & { readonly [tagFormatBrand]: never }
export function toTagFormat(s: string): TagFormat {
  return s as TagFormat
}

declare const gitLabUrlBrand: unique symbol
/** GitLab上のURL（インスタンスのホスト・プロジェクトのweb URL・パイプラインのURL等） */
export type GitLabUrl = string & { readonly [gitLabUrlBrand]: never }
/**
 * `GitLabUrl`の唯一の生成経路。http(s)のURLであることをここで検証するので、未検証の
 * 文字列が`GitLabUrl`になることはない
 */
export function toGitLabUrl(s: string, label = "URL"): GitLabUrl {
  if (!URL.canParse(s)) {
    throw new Error(`${label} が有効な URL ではありません: "${s}"`)
  }
  const { protocol } = new URL(s)
  if (protocol !== "https:" && protocol !== "http:") {
    throw new Error(`${label} は http:// または https:// で始まる必要があります: "${s}"`)
  }
  return s as GitLabUrl
}

declare const valuesPathBrand: unique symbol
/** chart内でのvalues.yamlの相対パス */
export type ValuesPath = string & { readonly [valuesPathBrand]: never }
export function toValuesPath(s: string): ValuesPath {
  return s as ValuesPath
}

declare const chartDirNameBrand: unique symbol
/** config/ 直下、1chart分の設定を束ねるディレクトリ名（例: "teamA-chart"） */
export type ChartDirName = string & { readonly [chartDirNameBrand]: never }
export function toChartDirName(s: string): ChartDirName {
  return s as ChartDirName
}

declare const tenantIdBrand: unique symbol
/** `config/<chartDir>/<tenantId>/`ディレクトリ名。MRを作成する単位の一部 */
export type TenantId = string & { readonly [tenantIdBrand]: never }
export function toTenantId(s: string): TenantId {
  return s as TenantId
}

declare const clientIdBrand: unique symbol
/** `config/<chartDir>/<tenantId>/<clientId>/`ディレクトリ名。MRを作成する単位の一部 */
export type ClientId = string & { readonly [clientIdBrand]: never }
export function toClientId(s: string): ClientId {
  return s as ClientId
}

declare const anchorNameBrand: unique symbol
/** values.yaml内のYAMLアンカー名（例: `&appsVersion`の`appsVersion`部分） */
export type AnchorName = string & { readonly [anchorNameBrand]: never }
export function toAnchorName(s: string): AnchorName {
  return s as AnchorName
}
