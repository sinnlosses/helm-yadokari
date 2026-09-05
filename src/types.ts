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
 * values.yaml内の書き込み位置1箇所分（対象ファイル＋その中でのYAMLアンカー名）。
 * 「何を書くか」（イメージタグ／Helmの向き先ブランチ）は位置そのものには含まれないため、
 * 用途ごとの別名（`ImageTagTarget`/`HelmTargetBranchTarget`）はこの型のエイリアスにしている
 * （TypeScriptは構造的型付けなので、同じ形の型を2つ定義しても取り違えは防げない。
 * 別名は「どちらの用途か」を読み手に伝えるためのもの、T-024）
 */
export type AnchorTarget = {
  readonly valuesPath: ValuesPath
  readonly anchor: AnchorName
}

/**
 * values.yaml内でイメージタグを書き換える1箇所分。1つのソースリポジトリ（1つのタグ）に
 * 対して、WebAPI/バッチ/デーモンなど複数のデプロイ単位を管理しているケースでは、同じ
 * 最新タグを複数箇所に反映する必要があるため、`AppConfig.chart`はこの型の配列として持つ
 * （T-014）。値は`anchors.yaml`の`apps[].chart[]`から取得する（T-017）
 */
export type ImageTagTarget = AnchorTarget

/**
 * Helmの向き先ブランチ（values.yamlのパラメータを受け取ってk8sリソースを実際に構築する
 * ブランチ）の書き込み先1箇所分。`anchors.yaml`トップレベルの`helm.chart[]`の1要素に
 * 対応する（T-016、T-017）
 */
export type HelmTargetBranchTarget = AnchorTarget

/**
 * config.yaml/anchors.yaml内で「Helmの向き先ブランチ」を扱うための設定。`branch`は
 * config.yamlのトップレベルフィールド`helm.branchToSync`として1ファイル（tenantId/clientId単位）
 * につき1つ、人間が直接書き換える値。`targets`は、同じディレクトリのanchors.yamlが持つ
 * `helm.chart[]`の要素のうち、このアプリの`chart[].valuesPath`と一致するものすべてを指す
 * （`valuesPath`一致でapp単位に振り分ける）。タグの命名規則のような自動生成・自動判定の
 * 仕組みは持たず、単純に`branch`と各`targets`が指す現在値を比較する
 */
export type HelmTargetBranchConfig = {
  readonly branch: BranchName
  readonly targets: readonly HelmTargetBranchTarget[]
}

/**
 * ソースリポジトリ（タグが打たれるGitLabプロジェクト）に対応する1アプリの設定。
 * `projectId`/`projectName`/`branchToSync`はconfig.yamlの運用値、`chart`は同じディレクトリの
 * `anchors.yaml`（`apps[].chart[]`）から`projectId`で引いた書き込み先（T-017）
 */
export type AppConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly branchToSync: BranchName
  /** 同じ最新タグを反映する書き換え箇所の一覧（1件以上）。複数指定すると同一タグを複数箇所へ反映する */
  readonly chart: readonly ImageTagTarget[]
  /**
   * config.yamlの`helm.branchToSync`とanchors.yamlの`helm.chart`が両方指定され、
   * `chart`のいずれかのvaluesPathがそこでカバーされている場合のみ値を持つ
   */
  readonly helmTargetBranch: HelmTargetBranchConfig | undefined
}

/** chartリポジトリ共通の設定。chart.yamlに対応する */
export type ChartRepoConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly mrTargetBranch: BranchName
}

/**
 * `config/<chartリポジトリ>/<tenantId>/<clientId>/`1つ分。chart.yamlの情報＋その
 * tenantId/clientIdディレクトリのconfig.yaml（+同じディレクトリのanchors.yaml）から
 * 得たアプリ一覧の集約。MRを作成する単位（T-019）でもあり、`tenantId`/`clientId`が
 * 異なれば同じchartリポジトリでも別のChartAndApps（＝別ブランチ・別MR）になる
 */
export type ChartAndApps = {
  readonly chartDir: ChartDirName
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
  readonly branch: BranchName
  readonly builtAt: Date
}

/**
 * GitLab上のタグ1件分。名前だけでなく、そのタグが指すコミットのSHAも保持する。
 * 追跡ブランチ由来の最新タグが、追跡ブランチの現在のHEADコミットと一致するか
 * （＝タグがブランチの進行に追いついているか）を判定するために使う
 */
export type TagInfo = {
  readonly name: TagName
  readonly commitSha: string
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

/**
 * `AppConfig.chart`のうち1箇所分の更新内容。反映済みタグ（`previousTag`）は
 * 書き換え箇所ごとに独立して読み取るため、同一アプリ内でも箇所によって異なりうる
 */
export type ImageTagUpdate = {
  readonly target: ImageTagTarget
  readonly previousTag: TagName | undefined
}

/**
 * `AppConfig.helmTargetBranch.targets`のうち1箇所分の更新内容。反映済みブランチ名
 * （`previousBranch`）はvalues.yaml側から読み取った現在値、`newBranch`はconfig.yaml設定値
 * （`helmTargetBranch.branch`、`targets`内の全箇所で共通）
 */
export type HelmTargetBranchUpdate = {
  readonly target: HelmTargetBranchTarget
  readonly previousBranch: BranchName | undefined
  readonly newBranch: BranchName
}

/**
 * 1アプリの更新内容。`chart`の書き換え箇所のうち、最新タグと異なっていたものだけを
 * `updates`に含める。`helmTargetBranchUpdates`は`AppConfig.helmTargetBranch`の`targets`のうち、
 * values.yaml側の現在値と設定値が異なる箇所だけを含める。`updates`・`helmTargetBranchUpdates`が
 * いずれも空ならこのAppUpdatePlan自体を生成しない（＝そのアプリは全箇所が反映済み）
 */
export type AppUpdatePlan = {
  readonly app: AppConfig
  readonly latestTag: ParsedTag
  /**
   * `latestTag` を今回の実行でこのツール自身が作成したか（既存タグの再利用なら false）。
   * MR本文の「打刻日時」は、このツールが打刻したときだけ意味を持つ値なので、
   * false のときは表示しない（T-036）
   */
  readonly latestTagCreated: boolean
  readonly pipeline: PipelineInfo | undefined
  readonly updates: readonly ImageTagUpdate[]
  readonly helmTargetBranchUpdates: readonly HelmTargetBranchUpdate[]
}

export type ChartUpdateResult = "CREATED" | "SKIPPED" | "ERROR"

export type RunResult = "SUCCESS" | "PARTIAL_FAILURE"

/** GitLabへコミットする1ファイル分の更新内容 */
export type FileUpdate = {
  readonly filePath: ValuesPath
  readonly content: string
}

/** 差分が確定し、コミット・MR作成の対象になった1chartAndApps分の更新内容 */
export type ChartUpdateTarget = {
  readonly chartAndApps: ChartAndApps
  readonly plans: AppUpdatePlan[]
  readonly files: FileUpdate[]
}
