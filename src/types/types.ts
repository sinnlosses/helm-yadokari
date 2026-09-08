export * from "./brand.js"
import type {
  AnchorName,
  BranchName,
  CommitSha,
  ChartDirName,
  ConfigUnitPath,
  GitLabUrl,
  ProjectId,
  ProjectName,
  TagFormat,
  TagName,
  ValuesPath,
} from "./brand.js"

/** values.yaml内の書き込み位置1箇所分 */
export type AnchorTarget = {
  readonly valuesPath: ValuesPath
  readonly anchorName: AnchorName
}

/**
 * タグ命名規則。`mode`を判別子にする判別共用体。ソースリポジトリ単位（`AppConfig`）の性質であり、
 * 設定ユニット単位・chartリポジトリ単位ではない（仕様は`docs/requirements.md` 4.1節・4.4節が正典）。
 * `semver`モードはタグ名から追跡ブランチを読み取れないため、追加のフィールドを持たない。
 */
export type TagNaming =
  | { readonly mode: "template"; readonly template: TagFormat }
  | { readonly mode: "semver" }

/**
 * Helmの向き先ブランチを扱うための設定。`branchName`はconfig.yamlの`helm.branchToSync`由来、
 * `targets`はanchors.yamlの`helm.chart[]`のうち、設定ユニット内のいずれかのappが書き込む
 * valuesPathを指すもの。向き先ブランチは設定ユニット内のapps全体で共通なので設定ユニット単位で持つ
 */
export type HelmTargetBranchConfig = {
  readonly branchName: BranchName
  readonly targets: readonly AnchorTarget[]
}

/**
 * `projectId`/`projectName`/`branchToSync`/`tagNaming`はconfig.yamlの運用値、
 * `imageTagTargets`は同じディレクトリの`anchors.yaml`から`projectId`で引いた書き込み先
 */
export type AppConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly branchToSync: BranchName
  readonly tagNaming: TagNaming
  /** 同じ最新タグを複数箇所へ反映するため配列。anchors.yamlの`apps[].chart[]`由来 */
  readonly imageTagTargets: readonly AnchorTarget[]
}

/** chartリポジトリ共通の設定。chart.yamlに対応する */
export type ChartRepoConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly mrTargetBranch: BranchName
}

/** `config/<chartリポジトリ>/<unitPath>/`1つ分。MRを作成する単位でもある */
export type ChartAndApps = {
  readonly chartDirName: ChartDirName
  readonly unitPath: ConfigUnitPath
  readonly chart: ChartRepoConfig
  readonly apps: readonly AppConfig[]
  /** config.yamlとanchors.yamlの両方でHelmの向き先ブランチが指定されている場合のみ値を持つ */
  readonly helmTargetBranch: HelmTargetBranchConfig | undefined
}

export type Config = {
  readonly chartAndAppsList: readonly ChartAndApps[]
}

/**
 * タグの順序づけに使う比較値（`docs/glossary.md`「順序キー」）。要素は左から順に比べ、
 * 数値同士は数値として、文字列同士はASCII順、数値と文字列では数値を小さいものとして扱う
 * （semverのプレリリース識別子の規則）。組み立ても比較も`domain/tag-format.ts`に閉じ込めて
 * あり、外から要素を読んで比べない。
 */
export type TagOrderKey = readonly (number | string)[]

/** タグ名から読み取れる情報。追跡ブランチと、命名規則ごとの順序キー */
export type ParsedTag = {
  readonly name: TagName
  readonly branchName: BranchName
  readonly orderKey: TagOrderKey
}

/** GitLab上のタグ1件分。名前とそのタグが指すコミットのSHA */
export type TagInfo = {
  readonly name: TagName
  readonly commitSha: CommitSha
}

/** タグに紐づく最新パイプラインの情報 */
export type PipelineInfo = {
  readonly webUrl: GitLabUrl
}

/** `AppConfig.imageTagTargets`のうち1箇所分の更新内容。`previousTagName`は書き換え箇所ごとに独立して読み取る */
export type ImageTagUpdate = {
  readonly target: AnchorTarget
  readonly previousTagName: TagName
}

/** `previousBranch`はvalues.yaml側の現在値、`newBranch`はconfig.yaml設定値 */
export type HelmTargetBranchUpdate = {
  readonly target: AnchorTarget
  readonly previousBranch: BranchName
  readonly newBranch: BranchName
}

/**
 * 1アプリの更新内容。`updates`は差分がある箇所だけを含み、空ならこのAppUpdatePlan自体を
 * 生成しない（＝そのアプリは全箇所が反映済み）
 */
export type AppUpdatePlan = {
  readonly app: AppConfig
  readonly latestTag: ParsedTag
  readonly updates: readonly ImageTagUpdate[]
}

export type ChartUpdateResult = "CREATED" | "SKIPPED" | "ERROR"

export type RunResult = "SUCCESS" | "PARTIAL_FAILURE"

/** GitLabへコミットする1ファイル分の更新内容 */
export type FileUpdate = {
  readonly valuesPath: ValuesPath
  readonly content: string
}

/**
 * 差分が確定し、コミット・MR作成の対象になった1chartAndApps分の更新内容。
 * `helmTargetBranchUpdates`がapp単位でなくここにあるのは、向き先ブランチが設定ユニット内の
 * apps全体で共通だから（`plans`が空でもこちらに差分があればMRを作る）
 */
export type ChartUpdateTarget = {
  readonly chartAndApps: ChartAndApps
  readonly plans: readonly AppUpdatePlan[]
  readonly helmTargetBranchUpdates: readonly HelmTargetBranchUpdate[]
  readonly files: readonly FileUpdate[]
}
