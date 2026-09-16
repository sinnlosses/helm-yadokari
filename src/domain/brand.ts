/**
 * ドメイン固有のブランド型と、その生成に使う factory 関数。`src/` 内で `as` を使うのは
 * このファイルだけ。`./types.ts` から再エクスポートしている。
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
/** タグ形式のテンプレート文字列（検証は同じディレクトリの `tag-format.ts` の `validateTagFormat()`） */
export type TagFormat = string & { readonly [tagFormatBrand]: never }
export function toTagFormat(s: string): TagFormat {
  return s as TagFormat
}

declare const platformUrlBrand: unique symbol
/** GitLab/GitHub上のURL（インスタンスのホスト・プロジェクトのweb URL・パイプラインのURL等） */
export type PlatformUrl = string & { readonly [platformUrlBrand]: never }
/**
 * `PlatformUrl`の唯一の生成経路。http(s)のURLであることをここで検証するので、未検証の
 * 文字列が`PlatformUrl`になることはない
 */
export function toPlatformUrl(s: string, label = "URL"): PlatformUrl {
  if (!URL.canParse(s)) {
    throw new Error(`${label} が有効な URL ではありません: "${s}"`)
  }
  const { protocol } = new URL(s)
  if (protocol !== "https:" && protocol !== "http:") {
    throw new Error(`${label} は http:// または https:// で始まる必要があります: "${s}"`)
  }
  return s as PlatformUrl
}

declare const valuesPathBrand: unique symbol
/** chart内でのvalues.yamlの相対パス */
export type ValuesPath = string & { readonly [valuesPathBrand]: never }
export function toValuesPath(s: string): ValuesPath {
  return s as ValuesPath
}

declare const localPathBrand: unique symbol
/**
 * ローカルのファイルシステム上のパス。
 *
 * `config/`配下のディレクトリ・`registry.yaml`・`config.yaml`など、`readFileSync`・`existsSync`・
 * `readdirSync`に渡る値が対象。`ValuesPath`（GitLab上のchart内での相対パス）・
 * `ConfigUnitPath`（識別子）とは別概念で、これらが`join()`で同じ式に並ぶため取り違え防止でブランド
 * 型にしている。
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
 * `ConfigRootPath`の唯一の生成経路。
 *
 * cwd()配下に収まっていることをここで検証するので、
 * パストラバーサルを含むパスが`ConfigRootPath`になることはない。
 * label はエラーメッセージ内でそのパスを何と呼ぶか（既定は環境変数名の`CONFIG_ROOT_PATH`）。
 */

export function toConfigRootPath(s: string, label = "CONFIG_ROOT_PATH"): ConfigRootPath {
  assertSafePath(s, label)
  return s as ConfigRootPath
}

declare const reportOutputPathBrand: unique symbol
/**
 * 実行の末尾に書き出すレポートの出力先（`REPORT_OUTPUT_PATH`由来）。
 *
 * `LocalPath`の部分型なので`writeFileSync`等にそのまま渡せる。`ConfigRootPath`と違い、
 * これから作るファイルを指すため実在チェックはしない（パストラバーサル検証のみ）。
 */
export type ReportOutputPath = LocalPath & { readonly [reportOutputPathBrand]: never }
/** `ReportOutputPath`の唯一の生成経路。label はエラーメッセージ内でそのパスを何と呼ぶか（既定は環境変数名の`REPORT_OUTPUT_PATH`） */
export function toReportOutputPath(s: string, label = "REPORT_OUTPUT_PATH"): ReportOutputPath {
  assertSafePath(s, label)
  return s as ReportOutputPath
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
 *
 * `ChartDirName`・`BranchName`・`ValuesPath`と同じ`string`表現を持つ別概念であり、
 * 取り違えを防ぐためブランド型にしている。MRを作成する単位・固定ブランチ名の可変部になる。
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

declare const tagSourceKeyBrand: unique symbol
/** `TagSource`の同一性を表す値キー。組み立ては`domain/tag-source.ts`の`buildTagSourceKey()`が行う */
export type TagSourceKey = string & { readonly [tagSourceKeyBrand]: never }
export function toTagSourceKey(s: string): TagSourceKey {
  return s as TagSourceKey
}

declare const accessTokenEnvNameBrand: unique symbol
const ACCESS_TOKEN_ENV_NAME_PATTERN = /^ACCESS_TOKEN_[A-Z0-9_]+$/
/**
 * `registry.yaml`トップレベルの`accessTokenEnv`（アクセストークンが入っている環境変数名。
 *
 * 値そのものではない）。`^ACCESS_TOKEN_[A-Z0-9_]+$`のみを許し、
 * 接尾辞なしの`ACCESS_TOKEN`も含めて任意の名前は許さない。
 * `config/`は各チームがMRを送るセルフサービス方式なので、
 * 任意の環境変数名を書けると無関係な秘密をCLIに読み出させる経路になるため
 */

export type AccessTokenEnvName = string & { readonly [accessTokenEnvNameBrand]: never }
export function toAccessTokenEnvName(s: string): AccessTokenEnvName {
  if (!ACCESS_TOKEN_ENV_NAME_PATTERN.test(s)) {
    throw new Error(
      `accessTokenEnv は "ACCESS_TOKEN_" に続けて英大文字・数字・アンダースコアを ` +
        `1文字以上書いた名前である必要があります: "${s}"`,
    )
  }
  return s as AccessTokenEnvName
}

declare const accessTokenBrand: unique symbol
/**
 * GitLab/GitHubのアクセストークン（`createClient`の認証情報。
 *
 * GitLabはGroup/Project AccessToken、GitHubはPersonal Access Token）。
 * `PlatformUrl`と同じ関数呼び出しに並ぶため、取り違え防止でブランド型にしている。空でないことは
 * `loadEnv()`が既に保証している。接頭辞や長さでの形式検証はしない（GitLabの`glpat-`・
 * GitHubの`ghp_`はいずれも慣習であり、Group Access TokenやCI変数経由の値では前提にできないため）
 */

export type AccessToken = string & { readonly [accessTokenBrand]: never }
export function toAccessToken(s: string): AccessToken {
  return s as AccessToken
}
