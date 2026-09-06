export * from "./brand.js"
import type {
  AnchorName,
  BranchName,
  CommitSha,
  ChartDirName,
  ClientId,
  GitLabUrl,
  ProjectId,
  ProjectName,
  TagName,
  TenantId,
  ValuesPath,
} from "./brand.js"

/** TARGET_CLIENTS環境変数由来の絞り込み条件1件分 */
export type TargetClient = {
  readonly tenantId: TenantId
  readonly clientId: ClientId
}

/** values.yaml内の書き込み位置1箇所分 */
export type AnchorTarget = {
  readonly valuesPath: ValuesPath
  readonly anchorName: AnchorName
}

/**
 * Helmの向き先ブランチを扱うための設定。`branchName`はconfig.yamlの`helm.branchToSync`由来、
 * `targets`はanchors.yamlの`helm.chart[]`のうちvaluesPathが一致するもの
 */
export type HelmTargetBranchConfig = {
  readonly branchName: BranchName
  readonly targets: readonly AnchorTarget[]
}

/**
 * `projectId`/`projectName`/`branchToSync`はconfig.yamlの運用値、`imageTagTargets`は同じ
 * ディレクトリの`anchors.yaml`から`projectId`で引いた書き込み先
 */
export type AppConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly branchToSync: BranchName
  /** 同じ最新タグを複数箇所へ反映するため配列。anchors.yamlの`apps[].chart[]`由来 */
  readonly imageTagTargets: readonly AnchorTarget[]
  /** config.yamlとanchors.yamlの両方でHelmの向き先ブランチが指定されている場合のみ値を持つ */
  readonly helmTargetBranch: HelmTargetBranchConfig | undefined
}

/** chartリポジトリ共通の設定。chart.yamlに対応する */
export type ChartRepoConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly mrTargetBranch: BranchName
}

/** `config/<chartリポジトリ>/<tenantId>/<clientId>/`1つ分。MRを作成する単位でもある */
export type ChartAndApps = {
  readonly chartDirName: ChartDirName
  readonly tenantId: TenantId
  readonly clientId: ClientId
  readonly chart: ChartRepoConfig
  readonly apps: readonly AppConfig[]
}

export type Config = {
  readonly chartAndAppsList: readonly ChartAndApps[]
}

/** タグ名から読み取れる情報。追跡ブランチとビルド日時 */
export type ParsedTag = {
  readonly name: TagName
  readonly branchName: BranchName
  readonly builtAt: Date
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
  readonly previousTagName: TagName | undefined
}

/** `previousBranch`はvalues.yaml側の現在値、`newBranch`はconfig.yaml設定値 */
export type HelmTargetBranchUpdate = {
  readonly target: AnchorTarget
  readonly previousBranch: BranchName | undefined
  readonly newBranch: BranchName
}

/**
 * 1アプリの更新内容。`updates`・`helmTargetBranchUpdates`はそれぞれ差分がある箇所だけを含み、
 * 両方とも空ならこのAppUpdatePlan自体を生成しない（＝そのアプリは全箇所が反映済み）
 */
export type AppUpdatePlan = {
  readonly app: AppConfig
  readonly latestTag: ParsedTag
  readonly pipeline: PipelineInfo | undefined
  readonly updates: readonly ImageTagUpdate[]
  readonly helmTargetBranchUpdates: readonly HelmTargetBranchUpdate[]
}

export type ChartUpdateResult = "CREATED" | "SKIPPED" | "ERROR"

export type RunResult = "SUCCESS" | "PARTIAL_FAILURE"

/** GitLabへコミットする1ファイル分の更新内容 */
export type FileUpdate = {
  readonly valuesPath: ValuesPath
  readonly content: string
}

/** 差分が確定し、コミット・MR作成の対象になった1chartAndApps分の更新内容 */
export type ChartUpdateTarget = {
  readonly chartAndApps: ChartAndApps
  readonly plans: readonly AppUpdatePlan[]
  readonly files: readonly FileUpdate[]
}
