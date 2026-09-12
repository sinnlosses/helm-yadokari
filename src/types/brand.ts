/**
 * ドメイン固有のブランド型と、その生成に使う factory 関数。`src/` 内で `as` を使うのは
 * このファイルだけ。`src/types/types.ts` から再エクスポートしている。
 */

import { assertSafePath } from "../utils/fs.js"

declare const projectIdBrand: unique symbol
/**
 * GitLabのプロジェクトID（数値）またはGitHubの`owner/repo`。プラットフォーム中立に
 * 扱うため文字列で統一している（数値表記は`String()`した値になる）。形式の検証はしない
 */
export type ProjectId = string & { readonly [projectIdBrand]: never }
export function toProjectId(s: string): ProjectId {
  return s as ProjectId
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
/** タグ形式のテンプレート文字列（検証は `domain/tag-format.ts` の `validateTagFormat()`） */
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

declare const localPathBrand: unique symbol
/**
 * ローカルのファイルシステム上のパス（`config/`配下のディレクトリ・`registry.yaml`・
 * `config.yaml`など）。`readFileSync`・`existsSync`・`readdirSync`に渡る値が対象。
 * `ValuesPath`（GitLab上のchart内での相対パス）・`ConfigUnitPath`（識別子）とは別概念で、
 * これらが`join()`で同じ式に並ぶため取り違え防止でブランド型にしている。
 */
export type LocalPath = string & { readonly [localPathBrand]: never }
export function toLocalPath(s: string): LocalPath {
  return s as LocalPath
}

declare const configRootPathBrand: unique symbol
/**
 * `loadConfig()`が読む設定ディレクトリのルート（`CONFIG_ROOT_PATH`・コマンドライン引数由来）。
 * `LocalPath`の部分型なので`join()`や`listSubdirectories()`にはそのまま渡せる。
 */
export type ConfigRootPath = LocalPath & { readonly [configRootPathBrand]: never }
/**
 * `ConfigRootPath`の唯一の生成経路。cwd()配下に収まっていることをここで検証するので、
 * パストラバーサルを含むパスが`ConfigRootPath`になることはない。label はエラーメッセージ内で
 * そのパスを何と呼ぶか（既定は環境変数名の`CONFIG_ROOT_PATH`）。
 */
export function toConfigRootPath(s: string, label = "CONFIG_ROOT_PATH"): ConfigRootPath {
  assertSafePath(s, label)
  return s as ConfigRootPath
}

declare const chartDirNameBrand: unique symbol
/** config/ 直下、1chart分の設定を束ねるディレクトリ名（例: "teamA-chart"） */
export type ChartDirName = string & { readonly [chartDirNameBrand]: never }
export function toChartDirName(s: string): ChartDirName {
  return s as ChartDirName
}

declare const configUnitPathBrand: unique symbol
/**
 * `config/<chartDir>/`から設定ユニットのディレクトリまでの相対パス（深さ1〜2）。
 * `ChartDirName`・`BranchName`・`ValuesPath`と同じ`string`表現を持つ別概念であり、取り違えを
 * 防ぐためブランド型にしている。MRを作成する単位・固定ブランチ名の可変部になる。
 */
export type ConfigUnitPath = string & { readonly [configUnitPathBrand]: never }
export function toConfigUnitPath(s: string): ConfigUnitPath {
  return s as ConfigUnitPath
}

declare const anchorNameBrand: unique symbol
/** values.yaml内のYAMLアンカー名（例: `&appsVersion`の`appsVersion`部分） */
export type AnchorName = string & { readonly [anchorNameBrand]: never }
export function toAnchorName(s: string): AnchorName {
  return s as AnchorName
}

declare const accessTokenBrand: unique symbol
/**
 * GitLabのアクセストークン（`createClient`の認証情報）。`GitLabUrl`と同じ関数呼び出しに
 * 並ぶため、取り違え防止でブランド型にしている。空でないことは`loadEnv()`が既に保証している。
 * 接頭辞や長さでの形式検証はしない（Personal Access Tokenの`glpat-`は慣習であり、
 * Group Access TokenやCI変数経由の値では前提にできないため）
 */
export type AccessToken = string & { readonly [accessTokenBrand]: never }
export function toAccessToken(s: string): AccessToken {
  return s as AccessToken
}
