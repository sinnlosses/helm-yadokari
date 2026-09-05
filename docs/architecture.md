# アーキテクチャ詳細

`CLAUDE.md`のアーキテクチャ概要節に書いた2つの原則（`steps/`はフラットに`process()`からしか
呼ばれない／`lib/`は技術・外部システム・ファイル形式への依存でのみ判断する）を前提に、
`src/steps/`・`src/lib/`・`src/utils/`配下の各ファイルの責務と、新しいコードを置く場所の
判断基準を詳しくまとめる。

## 各ファイルの責務

- `src/steps/`: `process()` が直接呼ぶ、フラットな3ステップのみを置く。それぞれ
  `lib/`・`utils/` にのみ依存する
  - `filter-targets.ts`: `filterTargets()`。登録アプリが0件、または固定ブランチに
    オープン中のMRが既にあるchartAndAppsを除外する
  - `build-plans.ts`: `buildPlans()`。このステップの処理単位は「1つのchartAndApps」であり、
    ファイル内の階層もそれに合わせて`chartAndApps → app`の2段だけに絞っている（`app`より
    下の「1箇所（target）」の処理は全て`sub-steps/build-plans/`側の責務）:
    - `buildPlans()`: 全chartAndAppsを並列に処理し、settled（SKIPPED/ERROR）とtoApplyに
      振り分ける
    - `process()`: 1つのchartAndApps分。`buildPlan()`の結果を見て
      SKIPPED（差分無し/dryRun）・ERROR・applyのどれにするかを判定する（try/catchもここ）
    - `buildPlan()`: 1つのchartAndApps配下の全アプリを、同ファイル内の非公開関数
      `buildAppUpdatePlan()`（1アプリ分の処理）に順番に渡すだけ。同じvalues.yamlを
      参照する複数アプリの変更が`valuesYamlCache`に正しく積み重なるよう、アプリ間は並列化
      しない
    - `buildAppUpdatePlan()`: **1アプリ分**の処理。手順は4つだけ:
      (1) `sub-steps/build-plans/resolve-latest-tag.ts`の`resolveLatestTag()`で最新タグを判定、
      (2) `sub-steps/build-plans/image-tag-target.ts`の`applyImageTagTargets()`で`app.chart`
      全箇所の差分をまとめてチェック、(3) `app.helmTargetBranch`があれば
      `sub-steps/build-plans/helm-target-branch-target.ts`の`applyHelmTargetBranchTargets()`で
      向き先ブランチの全箇所の差分をまとめてチェック、(4) 差分が1件も無ければSKIPPEDとして
      ログを出して終了、あれば最新パイプラインを取得して`AppUpdatePlan`を組み立てる。
      「ステップがステップを呼ばない」原則をサブステップにも適用し、この関数は
      `sub-steps/build-plans/`配下の3つのサブステップを直接呼ぶだけで、サブステップ同士が
      互いを呼ぶことはない（「1箇所（target）ごとの実処理」は下記3ファイルへ完全に委譲し、
      このファイルはtargetの配列をループする`reduce`を直接持たない）。以前は
      `sub-steps/build-plans/app-update-plan.ts`という独立ファイルに切り出していたが、
      それ自体が他のサブステップを呼ぶ「サブステップがサブステップを呼ぶ」構造になって
      しまうため、`build-plans.ts`の非公開関数に統合した
    - `buildFileUpdates()`: 書き換えのあったファイルだけを`FileUpdate[]`にする
    - `describePlan()`: ログ用サマリ組み立て
      （`sub-steps/`はどのstepにも属さない「フラットな3ステップ」には含めない、内部実装専用の
      置き場所。他のステップやprocess()からは参照されない。呼び出し元は依然として
      build-plans.ts1つだけなので、原則2「複数箇所から呼ばれない限りlib/には置かない」の
      考え方は変わらない）
    - `sub-steps/build-plans/image-tag-target.ts`: **1箇所（target）分**のイメージタグ処理。
      非公開の`applyImageTagTarget()`が1箇所分の値の読み取り・比較・書き換えを行い、
      公開している`applyImageTagTargets()`（複数形）が`app.chart`（1アプリが複数の書き換え
      箇所、WebAPI/バッチ/デーモンなどを持つ場合を含む）を`reduce`で先頭から処理する。
      「1箇所分の処理」と「複数箇所をループする責務」を同じファイルに閉じ込め、
      呼び出し元（`build-plans.ts`の`buildAppUpdatePlan()`）は複数形の関数を1回呼ぶだけでよい
    - `sub-steps/build-plans/helm-target-branch-target.ts`: **1箇所（target）分**のHelm
      向き先ブランチ処理。構造は`image-tag-target.ts`と同じで、非公開の
      `applyHelmTargetBranchTarget()`（1箇所分。差分があれば`lib/gitlab/gitlab.ts`の
      `branchExists()`でそのブランチがchartリポジトリ上に実在するかを検証してから書き換える。
      存在しなければ例外を投げてそのchartAndApps全体をERRORにする）と、公開している
      `applyHelmTargetBranchTargets()`（複数形。`helmTargetBranch.targets`を`reduce`で
      処理する）を持つ。タグ更新と異なり「最新値の自動判定」は行わず、config.yamlに人間が
      書いた値をそのまま比較対象にする。同じブランチ名の存在確認はchartAndApps内で
      1回だけになるよう`branchExistsCache`で共有する
    - `sub-steps/build-plans/resolve-latest-tag.ts`: `resolveLatestTag()`。追跡ブランチ由来の
      最新タグが、追跡ブランチの現在のHEADコミット（`getBranchHeadSha()`）と一致しない場合
      （1件も見つからない場合に加え、見つかった最新タグが追跡ブランチの進行にビハインド
      している場合を含む）はエラーにせず、`lib/gitlab/tag.ts` の `buildNewTag()` でタグ名を
      組み立て、`lib/gitlab/gitlab.ts` の `createTag()` で実際に作成してから続行する
      （`dryRun` のときは作成をスキップし、タグ名の計算だけ行う）
    - `sub-steps/build-plans/types.ts`: `LoadValuesYamlContent`型・`BuildChartUpdateAcc`型の
      みを持つ。どちらも特定の1ファイルには属さない共有インターフェース（前者は
      `build-plans.ts`・`image-tag-target.ts`・`helm-target-branch-target.ts`の3箇所、
      後者は`build-plans.ts`内の`buildPlan()`・`buildAppUpdatePlan()`の2箇所から
      参照される）なので、独立させている
  - `apply-updates.ts`: `applyUpdates()`。`toApply` の各chartAndAppsに対してコミット・
    MR作成を並列実行する。ログ用サマリ組み立て（`describePlan()`）はここでも非公開関数
    として個別に持つ（`build-plans.ts` のものとほぼ同じ形だが、共有するために `lib/` へ
    切り出すほどの技術依存はないため、あえて共有しない）
- `src/lib/`: 特定の技術・外部システム・ファイル形式に依存する処理のみを置く
  - `gitlab/`: GitLabという技術に依存する処理をまとめたディレクトリ
    - `gitlab.ts`: `@gitbeaker/rest` のラッパー。タグ一覧取得・作成・ファイル取得・MR作成・
      タグに紐づく最新パイプライン取得など。404を特定の戻り値（`false`/`undefined`）に変換する
      箇所は `withNotFoundFallback()` に共通化している。固定ブランチ名を組み立てる
      `buildUpdateBranch(tenantId, clientId)`（T-019、`feature/yadokari/<tenantId>/<clientId>`
      形式）、MRのタイトル・本文組み立て（`buildMrTitle(tenantId, clientId, plans)`/
      `buildMrDescription()`。タグへのリンク（`-/tags/...`）・旧タグ→新タグの比較リンク
      （`-/compare/...`）がGitLabのURL構造に依存するため、GitLab固有の関心事としてここに
      置く）もこのファイルが持つ
    - `deleteBranch()`もこのファイルが持つ。`commitFileUpdates()`は呼び出し元
      （`filterTargets`）が「このブランチにオープン中のMRが無い」ことを確認済みという前提で、
      既存ブランチがあれば削除してから`baseBranch`（`mrTargetBranch`）を起点に作り直す
      （T-021。以前は既存ブランチへ追加コミットを積むだけで、要件定義に明記されていた
      「改めてブランチを作り直す」が実装されていなかった）。ファイルごとのaction
      （create/update）判定も、ブランチを必ず作り直す前提のため常に`baseBranch`基準にした
    - `tag.ts`: このツールのタグ命名規則（`docs/requirements.md` 4.1節）のパース・最新タグ判定・
      新規タグ名の組み立てに加え、`TAG_FORMAT`環境変数のテンプレート文字列（`{branch}`/`{date}`/
      `{time}`プレースホルダ）を検証する`validateTagFormat()`も持つ。外部システム・ファイルへの
      I/Oを一切持たない純粋な文字列/日付処理だが、「GitLabのタグ」という概念に強く紐づく命名規則
      のため、`utils/`ではなく`gitlab/`配下に置く。`validateTagFormat()`/`DEFAULT_TAG_FORMAT`は
      `lib/env.ts`の`parseTagFormat()`から、`buildNewTag()`/`parseTag()`/`findLatestParsedTag()`は
      `sub-steps/build-plans/resolve-latest-tag.ts`から呼ばれる（`lib/`同士の依存は原則2の対象外
      なので問題ない）
  - `config.ts`: `config/<chart>/chart.yaml`・`config/<chart>/<tenantId>/<clientId>/config.yaml`・
    同じディレクトリの`anchors.yaml`という2階層固定構成を再帰的に読み込み、Zodで
    バリデーション（ファイル探索・YAML読み込みの汎用部分は `utils/fs.ts` / `utils/yaml.ts` に
    委譲）。`config.yaml`は運用値（`projectId`/`projectName`/`branchToSync`、Helmの向き先
    ブランチの値`helm.branchToSync`）のみを持ち、`anchors.yaml`はchart構造
    （`valuesPath`+`anchor`の書き込み先一覧。app単位の`projectId`/`projectName`も重複して
    持つ）のみを持つ（T-017、あまり変更されないchart構造と、頻繁に変更される運用値を
    別ファイルに分離する狙い）。両者は`loadClientChartAndApps()`内の`validateProjectLinkage()`が
    `projectId`をキーに突き合わせ、(1) `config.yaml`の各appに対応する`anchors.yaml`側の
    エントリが無い、(2) 逆に`anchors.yaml`に`config.yaml`側に存在しない孤児エントリが
    ある、(3) 同じ`projectId`なのに`projectName`が一致しない、の3パターンを設定ミスとして
    例外をスローする。`loadClientChartAndApps()`はtenantId/clientIdごとに独立した
    `ChartAndApps`を1件返す（T-019、MRを作成する単位に対応。以前はchartディレクトリ配下の
    全tenantId/clientIdを1つの`ChartAndApps`に集約していた）。`config.yaml`が存在しない
    tenant/clientディレクトリからは`ChartAndApps`自体を作らない。`loadConfig()` は
    第2引数に`ConfigTarget`（`TARGET_CHART_DIR`由来の
    chartDir、`TARGET_CLIENT`由来の`TargetClient`（tenantId/clientIdの組）配列）を受け取り、
    指定があればそのchart・tenant/clientの組のみに絞り込む。`TARGET_CLIENT`はカンマ区切りで
    複数のtenant/client組を指定できる。config/のディレクトリ構成に対するフィルタなので
    このファイルの責務とし、指定した組のいずれか1件でも見つからない場合は例外をスローする
    （`docs/requirements.md` 4.5節）。`config.yaml`のトップレベル`helm.branchToSync`
    （tenantId/clientId単位に1件）と`anchors.yaml`のトップレベル`helm.chart[]`
    （書き込み先一覧）は、`loadClientChartAndApps()`内の`resolveHelmTargetBranch()`が
    `valuesPath`の一致で
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
- 呼び出し元が `steps/` の1ファイルだけ → そのファイル内の非公開（exportしない）関数。
  1ファイルが大きくなりすぎた場合は、`steps/sub-steps/<step名>/`（例:
  `steps/sub-steps/build-plans/`）へ非公開関数を複数ファイルに分割してよい（`steps/`直下は
  「process()が直接呼ぶフラットな3ステップ」だけに保ち、`sub-steps/`配下は各stepの内部実装
  専用と分かるようにする）。呼び出し元が引き続きそのstepファイル1つだけである限り、
  ファイルを分けても`lib/`への昇格理由にはならない（原則2は変わらない）
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
  その時点で `p-limit` のキューを `clearQueue()` でクリアし、同じステップ内の他chartAndAppsの
  未着手タスクを実行させずに reject する。`process()` はステップを順番に await しているため、
  あるステップでFatalErrorが起きると後続のステップは一切開始されない（例:
  `buildPlans` でFatalErrorが起きたら `applyUpdates` は1件も呼ばれない）。
  `docs/requirements.md` 4.3節の「chartリポジトリ間は失敗しても他は継続する」という記述は
  一般的なエラーを指しており、GitLab側の認証切れ・障害のような全chart共通の致命的エラーに
  対しては、無駄なAPI呼び出しを避けるためこの例外を設けている（gitlab-watari-dori由来のパターン）
- 同一`(chartリポジトリ, tenantId, clientId)`内の複数アプリの処理（タグ取得・パイプライン
  取得等）は `buildPlan()`（`src/steps/build-plans.ts` の非公開関数）内で逐次実行している。
  `docs/requirements.md` 4.3節の並列実行制御（`p-limit`）は現状chartAndApps単位
  （`filterTargets`/`buildPlans`/`applyUpdates`それぞれ）のみに適用しており、
  1chartAndApps内のアプリ単位までは並列化していない
