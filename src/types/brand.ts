/**
 * ドメイン固有のブランド型と、その生成に使う factory 関数（T-047）。
 * CLAUDE.mdの規約「`as` キャストは factory 関数に封じ込め、それ以外で使わない」を機械的に
 * 検証できるよう、`src/` 内で `as` を使うのはこのファイルだけにしている。
 * `src/types.ts` から再エクスポートしているので、利用側は `types.js` を import すればよい。
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

declare const tagFormatBrand: unique symbol
/**
 * タグ命名規則のテンプレート文字列。`{branch}`/`{date}`/`{time}` プレースホルダを
 * ちょうど1回ずつ含む（検証は `lib/gitlab/tag.ts` の `validateTagFormat()` が行う）
 */
export type TagFormat = string & { readonly [tagFormatBrand]: never }
export function toTagFormat(s: string): TagFormat {
  return s as TagFormat
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

declare const chartDirNameBrand: unique symbol
/** config/ 直下、1chart分の設定を束ねるディレクトリ名（例: "teamA-chart"） */
export type ChartDirName = string & { readonly [chartDirNameBrand]: never }
export function toChartDirName(s: string): ChartDirName {
  return s as ChartDirName
}

declare const tenantIdBrand: unique symbol
/** `config/<chartDir>/<tenantId>/`ディレクトリ名。MRを作成する単位の一部（T-019） */
export type TenantId = string & { readonly [tenantIdBrand]: never }
export function toTenantId(s: string): TenantId {
  return s as TenantId
}

declare const clientIdBrand: unique symbol
/** `config/<chartDir>/<tenantId>/<clientId>/`ディレクトリ名。MRを作成する単位の一部（T-019） */
export type ClientId = string & { readonly [clientIdBrand]: never }
export function toClientId(s: string): ClientId {
  return s as ClientId
}

declare const anchorNameBrand: unique symbol
/**
 * values.yaml内のYAMLアンカー名（例: `&tenant1client1AppsVersion`の`tenant1client1AppsVersion`
 * 部分）。values.yamlはオブジェクトのネストではなく、配列要素にアンカーで名前を付けた構成
 * （例: `variables: [&tenant1client1AppsVersion main, ...]`）を前提とし、このアンカー名で
 * イメージタグの値の位置を指定する
 */
export type AnchorName = string & { readonly [anchorNameBrand]: never }
export function toAnchorName(s: string): AnchorName {
  return s as AnchorName
}
