export * from "./brand.js"
import type {
  AnchorName,
  BranchName,
  ChartDirName,
  ClientId,
  GitLabUrl,
  ProjectId,
  ProjectName,
  TagName,
  TenantId,
  ValuesPath,
} from "./brand.js"

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
 * 「何を書くか」（イメージタグ／Helmの向き先ブランチ）は位置そのものには含まれない。
 * TypeScriptは構造的型付けなので、用途ごとに別名の型を定義しても取り違えは防げないため、
 * 型は1つに統一し、用途の区別は利用側の変数名・フィールド名・JSDocで表す
 * （`AppConfig.chart`・`HelmTargetBranchConfig.targets`・`ImageTagUpdate.target`・
 * `HelmTargetBranchUpdate.target`のJSDoc参照）
 */
export type AnchorTarget = {
  readonly valuesPath: ValuesPath
  readonly anchor: AnchorName
}

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
  /**
   * Helmの向き先ブランチ（values.yamlのパラメータを受け取ってk8sリソースを実際に構築する
   * ブランチ）の書き込み先一覧。`anchors.yaml`トップレベルの`helm.chart[]`に対応する
   */
  readonly targets: readonly AnchorTarget[]
}

/**
 * ソースリポジトリ（タグが打たれるGitLabプロジェクト）に対応する1アプリの設定。
 * `projectId`/`projectName`/`branchToSync`はconfig.yamlの運用値、`chart`は同じディレクトリの
 * `anchors.yaml`（`apps[].chart[]`）から`projectId`で引いた書き込み先
 */
export type AppConfig = {
  readonly projectId: ProjectId
  readonly projectName: ProjectName
  readonly branchToSync: BranchName
  /**
   * values.yaml内でイメージタグを書き換える箇所の一覧（1件以上）。1つのソースリポジトリ
   * （1つのタグ）に対して、WebAPI/バッチ/デーモンなど複数のデプロイ単位を管理している
   * ケースでは、同じ最新タグを複数箇所に反映する必要があるため配列にしている。複数指定すると
   * 同一タグを複数箇所へ反映する。値は`anchors.yaml`の`apps[].chart[]`から取得する
   */
  readonly chart: readonly AnchorTarget[]
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
 * 得たアプリ一覧の集約。MRを作成する単位でもあり、`tenantId`/`clientId`が
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

/** タグに紐づく最新パイプラインの情報 */
export type PipelineInfo = {
  readonly webUrl: GitLabUrl
}

/**
 * `AppConfig.chart`のうち1箇所分の更新内容。反映済みタグ（`previousTag`）は
 * 書き換え箇所ごとに独立して読み取るため、同一アプリ内でも箇所によって異なりうる
 */
export type ImageTagUpdate = {
  /** values.yaml内でイメージタグを書き換える1箇所分（`AppConfig.chart`の要素） */
  readonly target: AnchorTarget
  readonly previousTag: TagName | undefined
}

/**
 * `AppConfig.helmTargetBranch.targets`のうち1箇所分の更新内容。反映済みブランチ名
 * （`previousBranch`）はvalues.yaml側から読み取った現在値、`newBranch`はconfig.yaml設定値
 * （`helmTargetBranch.branch`、`targets`内の全箇所で共通）
 */
export type HelmTargetBranchUpdate = {
  /** Helmの向き先ブランチの書き込み先1箇所分（`HelmTargetBranchConfig.targets`の要素） */
  readonly target: AnchorTarget
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
