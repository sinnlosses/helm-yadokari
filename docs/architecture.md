# アーキテクチャ詳細

`CLAUDE.md`のアーキテクチャ概要節に書いた2つの原則（`steps/`はフラットに`process()`からしか
呼ばれない／`lib/`は技術・外部システム・ファイル形式への依存でのみ判断する）を前提に、
`src/steps/`・`src/lib/`・`src/utils/`配下の各ファイルの責務と、新しいコードを置く場所の
判断基準を詳しくまとめる。

## 各ファイルの責務

- `src/steps/`: `process()` が直接呼ぶ、フラットな3ステップのみを置く。それぞれ
  `lib/`・`utils/` にのみ依存する
  - `filter-targets.ts`: `filterTargets()`。登録アプリが0件、または固定ブランチに
    オープン中のMRが既にあるchartグループを除外する
  - `build-plans.ts`: `buildPlans()`。chartグループごとの更新計画を並列に構築し、
    差分がないもの・dryRunのものは settled（SKIPPED）へ、反映が必要なものは
    `toApply` へ振り分ける。1つのchartグループ分の計算（`buildChartUpdate()`）・
    追跡ブランチ由来の最新タグ判定（`resolveLatestTag()`）・ログ用サマリ組み立て
    （`describePlan()`）は、このファイルの外からは呼ばれないため非公開関数としてここに書く。
    1アプリ（`AppConfig.chart`）が複数の書き換え箇所（WebAPI/バッチ/デーモンなど）を
    持つ場合は、`applyAppToChartUpdate()`が`app.chart`を`reduce`で1箇所ずつ処理し
    （`applyImageTagTarget()`）、同じ最新タグに対して差分があった箇所だけを
    `AppUpdatePlan.updates`に積む（全箇所が反映済みならそのアプリ自体を計画に含めない）
    - 追跡ブランチ由来の最新タグが、追跡ブランチの現在のHEADコミット（`getBranchHeadSha()`）と
      一致しない場合（1件も見つからない場合に加え、見つかった最新タグが追跡ブランチの進行に
      ビハインドしている場合を含む）はエラーにせず、`lib/gitlab/tag.ts` の `buildNewTag()` で
      タグ名を組み立て、`lib/gitlab/gitlab.ts` の `createTag()` で実際に作成してから続行する
      （`dryRun` のときは作成をスキップし、タグ名の計算だけ行う）
    - `app.helmTargetBranch`（Helmの向き先ブランチ。T-016）が設定されているアプリは、
      `applyHelmTargetBranchTarget()`が`app.chart`と同じ`valuesYamlCache`を共有しつつ、
      `helmTargetBranch.targets`（anchor-setting.yamlトップレベル`helm.chart[]`のうち
      `valuesPath`がこのappの`chart[].valuesPath`と一致する箇所すべて）を1箇所ずつ処理し、
      設定値（`helmTargetBranch.branch`）と`values.yaml`側の現在値を比較する。
      差分があれば書き込み前に`lib/gitlab/gitlab.ts`の`branchExists()`でそのブランチが
      chartリポジトリ上に実在するかを検証し（存在しなければ例外を投げてそのchartグループ全体を
      ERRORにする）、`AppUpdatePlan.helmTargetBranchUpdates`に積む。タグ更新と異なり
      「最新値の自動判定」は行わず、config.yamlに人間が書いた値をそのまま比較対象にする。
      同じブランチ名の存在確認はchartグループ内で1回だけになるよう`branchExistsCache`で共有する
  - `apply-updates.ts`: `applyUpdates()`。`toApply` の各chartグループに対してコミット・
    MR作成を並列実行する。ログ用サマリ組み立て（`describePlan()`）はここでも非公開関数
    として個別に持つ（`build-plans.ts` のものとほぼ同じ形だが、共有するために `lib/` へ
    切り出すほどの技術依存はないため、あえて共有しない）
- `src/lib/`: 特定の技術・外部システム・ファイル形式に依存する処理のみを置く
  - `gitlab/`: GitLabという技術に依存する処理をまとめたディレクトリ
    - `gitlab.ts`: `@gitbeaker/rest` のラッパー。タグ一覧取得・作成・ファイル取得・MR作成・
      タグに紐づく最新パイプライン取得など。404を特定の戻り値（`false`/`undefined`）に変換する
      箇所は `withNotFoundFallback()` に共通化している。全ステップ共通の固定ブランチ名
      `UPDATE_BRANCH`、MRのタイトル・本文組み立て（`buildMrTitle()`/`buildMrDescription()`。
      タグへのリンク（`-/tags/...`）・旧タグ→新タグの比較リンク（`-/compare/...`）が
      GitLabのURL構造に依存するため、GitLab固有の関心事としてここに置く）もこのファイルが持つ
    - `tag.ts`: このツールのタグ命名規則（`docs/requirements.md` 4.1節）のパース・最新タグ判定・
      新規タグ名の組み立て。外部システム・ファイルへのI/Oを一切持たない純粋な文字列/日付処理だが、
      「GitLabのタグ」という概念に強く紐づく命名規則のため、`utils/`ではなく`gitlab/`配下に置く
      （呼び出し元は `steps/build-plans.ts` のみ）
  - `config.ts`: `config/<chart>/chart.yaml`・`config/<chart>/<tenantId>/<clientId>/config.yaml`・
    同じディレクトリの`anchor-setting.yaml`という2階層固定構成を再帰的に読み込み、Zodで
    バリデーション（ファイル探索・YAML読み込みの汎用部分は `utils/fs.ts` / `utils/yaml.ts` に
    委譲）。`config.yaml`は運用値（`projectId`/`projectName`/`branchToSync`、Helmの向き先
    ブランチの値`helm.branchToSync`）のみを持ち、`anchor-setting.yaml`はchart構造
    （`valuesPath`+`anchor`の書き込み先一覧。app単位の`projectId`/`projectName`も重複して
    持つ）のみを持つ（T-017、あまり変更されないchart構造と、頻繁に変更される運用値を
    別ファイルに分離する狙い）。両者は`loadApps()`内の`validateProjectLinkage()`が
    `projectId`をキーに突き合わせ、(1) `config.yaml`の各appに対応する`anchor-setting.yaml`側の
    エントリが無い、(2) 逆に`anchor-setting.yaml`に`config.yaml`側に存在しない孤児エントリが
    ある、(3) 同じ`projectId`なのに`projectName`が一致しない、の3パターンを設定ミスとして
    例外をスローする。`loadConfig()` は第2引数に`ConfigTarget`（`TARGET_CHART_DIR`由来の
    chartDir、`TARGET_CLIENT`由来の`TargetClient`（tenantId/clientIdの組）配列）を受け取り、
    指定があればそのchart・tenant/clientの組のみに絞り込む。`TARGET_CLIENT`はカンマ区切りで
    複数のtenant/client組を指定できる。config/のディレクトリ構成に対するフィルタなので
    このファイルの責務とし、指定した組のいずれか1件でも見つからない場合は例外をスローする
    （`docs/requirements.md` 4.5節）。`config.yaml`のトップレベル`helm.branchToSync`
    （tenantId/clientId単位に1件）と`anchor-setting.yaml`のトップレベル`helm.chart[]`
    （書き込み先一覧）は、`loadApps()`内の`resolveHelmTargetBranch()`が`valuesPath`の一致で
    app単位の`AppConfig.helmTargetBranch`に振り分ける（app側には専用フィールドを持たせず、
    `helm.chart[].valuesPath`とapp自身の`chart[].valuesPath`が一致する要素だけを`targets`
    として集約）。Helmの向き先ブランチは「1client内のapps全体で共通」という前提のため、
    `helm.branchToSync`が指定されているconfig.yamlは配下の全アプリの全`chart[].valuesPath`が
    `helm.chart[]`でカバーされていることを要求し（1つでも漏れていると例外）、`branchToSync`と
    `helm.chart[]`は片方だけの指定も例外（T-016、T-017）
  - `helm.ts`: Helm chart の `values.yaml` を操作する処理。イメージタグの値の位置指定は
    `chart[].anchor`（YAMLアンカー名）のみに対応し、`getValueAtAnchor`/`setValueAtAnchor`が
    `yaml`パッケージのDocument（AST）を`visit()`で走査してアンカー名を持つノードを直接
    操作する（`js-yaml`はオブジェクトとしてしか読み書きできずアンカー名を保持できないため
    不採用。`config/`側のYAML読み込み`utils/yaml.ts`も含め、リポジトリ全体で`yaml`パッケージに
    統一している）。オブジェクトのネストをdotパスで辿る`imageTagKey`方式も過去に存在したが、
    実運用ではYAMLアンカー方式のみで十分なため削除した。
    Helm chart固有の処理を今後追加する場合もここに置く
  - `env.ts`: 環境変数の読み込み・検証
- `src/utils/`: このツールのドメイン知識を一切持たない、技術的に汎用的なユーティリティ
  - `parallel.ts`: `mapWithConcurrency()`。指定した同時実行数で配列を並列処理し、
    `FatalError` を検知したら未着手のタスクをキャンセルして即reject する（各ステップの
    並列化はすべてこれ経由。以前は複数ファイルにほぼ同じp-limitロジックが重複していたのを
    ここに統合した）
  - `fs.ts`: パストラバーサル検証・サブディレクトリ列挙、`yaml.ts`: YAMLファイル読み込み+Zod
    バリデーション、`object.ts`: `isPlainObject`、`cache.ts`: `getOrFetch`（Mapベースの
    非同期メモ化。`build-plans.ts`と`gitlab.ts`のbuildMrDescriptionで同じcache-or-fetch
    パターンが必要になったため共通化）
  - 既存の `errors.ts` / `http.ts` / `retry.ts` / `timer.ts` / `logger.ts` も同様に汎用

## 新しいコードを置く場所の判断基準

新しいコードを置くとき、まず「呼び出し元は何か」を考える:

- `process()` が直接呼ぶ、フラットなパイプラインの1段 → `steps/`。他のステップファイルを
  import しない
- 呼び出し元が `steps/` の1ファイルだけ → そのファイル内の非公開（exportしない）関数
- 複数の場所から呼ばれる、かつ特定の技術・外部システム・ファイル形式に依存する
  （GitLab API、Helm chart形式、`config/`のYAML形式、環境変数など）→ 対応する `lib/`
  ファイル。新しい技術/形式を扱うなら新しい `lib/` ファイルを作ってよい
- 複数の場所から呼ばれる、かつ技術に依存しない純粋な計算 → `utils/`
- 「stepsから呼ばれているから」「複数箇所で使うから」という理由だけで `lib/` に
  置くのは誤り。lib行きの判断基準は常に「技術・外部システム・ファイル形式への依存」

## ディレクトリ構成の勘所

- `config/`: 手書きの設定（対象アプリ登録）。`docs/requirements.md` 4.4節のスキーマに従う
- `scripts/lint/validate-config.ts`: `config/` の文法チェック専用スクリプト（`pnpm lint:validate-config` から実行、`pnpm lint` に含まれる）
- `dist/`: `pnpm build` の生成物。gitignore対象、手で編集しない
- `docs/requirements.md`: 確定した要件。`docs/requirements-grilling.md`: 要件定義時のQ&Aログ（検討経緯の参照用、変更不要）

## 既知の制約・注意点

- `values.yaml` の書き換えは `yaml` パッケージのDocument（AST）を直接操作する方式のため、
  書き換え対象以外のコメント・クォートスタイルは概ね保持される（完全な保持を保証するもの
  ではない）
- タグに紐づくGitLabプロジェクトのURLは `Projects.show` で都度取得している（`config/`にnamespace
  slugを持たせていないため）
- Helm CLI（`helm lint` / `helm template` 等）は呼び出さない。`values.yaml`のテキスト更新のみ行う
- `FatalError`（401/5xx等）を検知すると、`utils/parallel.ts` の `mapWithConcurrency()` が
  その時点で `p-limit` のキューを `clearQueue()` でクリアし、同じステップ内の他chartグループの
  未着手タスクを実行させずに reject する。`process()` はステップを順番に await しているため、
  あるステップでFatalErrorが起きると後続のステップは一切開始されない（例:
  `buildPlans` でFatalErrorが起きたら `applyUpdates` は1件も呼ばれない）。
  `docs/requirements.md` 4.3節の「chartリポジトリ間は失敗しても他は継続する」という記述は
  一般的なエラーを指しており、GitLab側の認証切れ・障害のような全chart共通の致命的エラーに
  対しては、無駄なAPI呼び出しを避けるためこの例外を設けている（gitlab-watari-dori由来のパターン）
- 同一chartリポジトリ内の複数アプリの処理（タグ取得・パイプライン取得等）は `buildChartUpdate()`
  （`src/steps/build-plans.ts` の非公開関数）内で逐次実行している。`docs/requirements.md` 4.3節の並列実行制御
  （`p-limit`）は現状chartグループ単位（`filterTargets`/`buildPlans`/`applyUpdates`それぞれ）
  のみに適用しており、1chartグループ内のアプリ単位までは並列化していない
