export * from "./brand.js"
import type {
  AccessTokenEnvName,
  AnchorName,
  BranchName,
  CommitSha,
  ChartDirName,
  ConfigUnitPath,
  GroupPath,
  PlatformUrl,
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
 * Helmの向き先ブランチを扱うための設定。
 *
 * `branchRef`はconfig.yamlの`helm.branchRef`由来、
 * `locations`は同じconfig.yamlの`helm.locations[]`のうち、
 * 設定ユニット内のいずれかのappが書き込むvaluesPathを指すもの。
 * 向き先ブランチは設定ユニット内のapps全体で共通なので設定ユニット単位で持つ
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

/**
 * 最新タグを解決する単位。どこから取るか（`projectId`/`projectName`/`branchToSync`/`tagFormat`）
 * だけを持ち、どこへ書くか（`imageTagLocations`）は持たない
 */
export type TagSource = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly branchToSync: BranchName
  readonly tagFormat: TagFormat
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
  /**
   * `registry.yaml`トップレベルの`accessTokenEnv`（同じchartリポジトリ配下の全設定ユニットで共通）。
   *
   * `chartRepo`に入れないのは、このトークンが`chartRepo`への書き込みと`apps`（ソースリポジトリ）
   * の読み取りの両方に効く、`registry.yaml`全体のスコープの値だから。
   */
  readonly accessTokenEnv: AccessTokenEnvName
  /**
   * `registry.yaml`トップレベルの`group`（同じchartリポジトリ配下の全設定ユニットで共通）。
   *
   * `chartRepo`・`apps`のプロジェクトがこのグループの内側にあるかを照合するための宣言で、
   * 本体パイプラインは使わない（`config/`の実在チェックだけが参照する）。
   */
  readonly groupPath: GroupPath
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
  readonly webUrl: PlatformUrl
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
 * タグの由来。
 *
 * `"created"`は今回の実行で新規に作った（`DRY_RUN=true`のときは実際の作成はせず、
 * 作成予定であることを意味する）。追跡ブランチのHEADに既存タグがあり、それを再利用した場合は
 * `"existing"`
 */

export type TagOrigin = "existing" | "created"

/**
 * 1アプリの更新内容。`updates`は差分がある箇所だけを含み、空ならこのAppUpdatePlan自体を
 * 生成しない（＝そのアプリは全箇所が反映済み）
 */
export type AppUpdatePlan = {
  readonly app: AppConfig
  readonly latestTag: ParsedTag
  readonly origin: TagOrigin
  readonly updates: readonly ImageTagUpdate[]
}

/**
 * 1アプリ分の「最新タグの判定結果」。
 *
 * `trackedHeadTagNames`は、「現在の追跡ブランチ由来（＝現在の`branchToSync`と`tagFormat`でパースで
 * きる）で、かつ追跡ブランチの現在のHEADコミットを指すタグ名」の集合。
 * values.yamlに書かれている現在値がこの集合に含まれるなら、
 * たとえより新しい名前のタグが存在してもデプロイされる中身は変わらないため更新しない。
 * 追跡ブランチを切り替えた直後は、切り替え前のタグ名がこの集合に含まれない（現在の追跡ブランチ由来
 * ではないため）ので、HEADと同じコミットを指していてもスキップされない。
 */

export type LatestTagResolution = {
  readonly tag: ParsedTag
  readonly trackedHeadTagNames: ReadonlySet<TagName>
  readonly origin: TagOrigin
}

/**
 * アプリと、そのアプリについて解決済みの最新タグの対。対にして渡すことで、後段はどのタグがどのアプリの
 * ものかを引き当て直さずに済む。
 */
export type AppWithLatestTag = {
  readonly app: AppConfig
  readonly latestTag: LatestTagResolution
}

/**
 * このツールが接続できるプラットフォーム。`PLATFORM`環境変数が選び、1回の実行では
 * 混在させないため実行全体で1つに決まる
 */
export type PlatformKind = "gitlab" | "github"

export type ConfigUnitUpdateResult = "CREATED" | "SKIPPED" | "ERROR"

/** 設定ユニットがSKIPPEDになった理由。実行ログの`reason`に出る値と同じ */
export type ConfigUnitSkipReason = "no_apps" | "mr_exists" | "no_diff" | "dry_run"

/**
 * 設定ユニット1件の処理結果と、その理由。
 *
 * `result`で判別する合併で、SKIPPEDの理由だけが閉じた集合になる。
 * ERRORの理由は捕捉した例外から組み立てるため任意の文字列で、CREATEDには理由が無い
 */
export type ConfigUnitUpdateOutcome =
  | { readonly result: "CREATED"; readonly reason: undefined }
  | { readonly result: "SKIPPED"; readonly reason: ConfigUnitSkipReason }
  | { readonly result: "ERROR"; readonly reason: string }

/**
 * 設定ユニット1件分の実行結果の記録。バッチ1回分のレポートの1行にあたる。
 * アプリ単位の内訳やMRのURLは持たない（レポートの粒度が設定ユニット単位のため）
 */
export type ConfigUnitReport = ConfigUnitUpdateOutcome & {
  readonly chartDirName: ChartDirName
  readonly unitPath: ConfigUnitPath
  readonly chartProjectName: ProjectName
}

export type RunResult = "SUCCESS" | "PARTIAL_FAILURE"

export type FileUpdate = {
  readonly valuesPath: ValuesPath
  readonly content: string
}

/**
 * 差分が確定し、コミット・MR作成の対象になった1設定ユニット分の更新内容。
 *
 * `helmBranchRefUpdates`がapp単位でなくここにあるのは、
 * 向き先ブランチが設定ユニット内のapps全体で共通だから（`plans`が空でもこちらに差分があればMRを作る）
 */

export type ConfigUnitUpdateTarget = {
  readonly configUnit: ConfigUnit
  readonly plans: readonly AppUpdatePlan[]
  readonly helmBranchRefUpdates: readonly HelmBranchRefUpdate[]
  readonly files: readonly FileUpdate[]
}
