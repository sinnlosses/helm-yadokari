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
export type AnchorLocation = {
  readonly valuesPath: ValuesPath
  readonly anchorName: AnchorName
}

/**
 * Helmの向き先ブランチを扱うための設定。`branchRef`はconfig.yamlの`helm.branchRef`由来、
 * `locations`は同じconfig.yamlの`helm.locations[]`のうち、設定ユニット内のいずれかのappが書き込む
 * valuesPathを指すもの。向き先ブランチは設定ユニット内のapps全体で共通なので設定ユニット単位で持つ
 */
export type HelmConfig = {
  readonly branchRef: BranchName
  readonly locations: readonly AnchorLocation[]
}

/**
 * `projectId`/`projectName`/`branchToSync`/`imageTagLocations`はconfig.yamlの運用値、
 * `tagFormat`は同じchartリポジトリの`registry.yaml`の`appSpecs[]`から`projectId`で引いた値
 */
export type AppConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly branchToSync: BranchName
  readonly tagFormat: TagFormat
  /** 同じ最新タグを複数箇所へ反映するため配列。config.yamlの`apps[].locations[]`由来 */
  readonly imageTagLocations: readonly AnchorLocation[]
}

/** chartリポジトリ共通の設定。registry.yamlに対応する */
export type ChartRepoConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly mrTargetBranch: BranchName
}

/** `config/<chartリポジトリ>/<unitPath>/`1つ分。MRを作成する単位でもある */
export type ConfigUnit = {
  readonly chartDirName: ChartDirName
  readonly unitPath: ConfigUnitPath
  readonly chartRepo: ChartRepoConfig
  readonly apps: readonly AppConfig[]
  /** `locations`は`helm.locations[]`のうちapps側が実際に書き込むvaluesPathを指す要素だけになる（空もありうる） */
  readonly helm: HelmConfig
}

export type Config = {
  readonly configUnits: readonly ConfigUnit[]
}

/** タグ名から読み取れる情報。追跡ブランチと、タグ形式の`{date}`/`{time}`から読み取った打刻日時 */
export type ParsedTag = {
  readonly name: TagName
  readonly branchName: BranchName
  readonly taggedAt: Date
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

/** `AppConfig.imageTagLocations`のうち1箇所分の更新内容。`currentTag`は書き換え箇所ごとに独立して読み取る */
export type ImageTagUpdate = {
  readonly location: AnchorLocation
  readonly currentTag: TagName
}

/**
 * `HelmConfig.locations`のうち1箇所分の更新内容。`currentBranch`はvalues.yaml側の
 * 現在値。新しい値は設定ユニットに1つしかないので`ConfigUnit.helm.branchRef`から取る
 */
export type HelmBranchRefUpdate = {
  readonly location: AnchorLocation
  readonly currentBranch: BranchName
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

export type ConfigUnitUpdateResult = "CREATED" | "SKIPPED" | "ERROR"

export type RunResult = "SUCCESS" | "PARTIAL_FAILURE"

export type FileUpdate = {
  readonly valuesPath: ValuesPath
  readonly content: string
}

/**
 * 差分が確定し、コミット・MR作成の対象になった1設定ユニット分の更新内容。
 * `helmBranchRefUpdates`がapp単位でなくここにあるのは、向き先ブランチが設定ユニット内の
 * apps全体で共通だから（`plans`が空でもこちらに差分があればMRを作る）
 */
export type ConfigUnitUpdateTarget = {
  readonly configUnit: ConfigUnit
  readonly plans: readonly AppUpdatePlan[]
  readonly helmBranchRefUpdates: readonly HelmBranchRefUpdate[]
  readonly files: readonly FileUpdate[]
}
