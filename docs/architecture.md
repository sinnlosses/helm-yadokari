# アーキテクチャ詳細

`CLAUDE.md`のアーキテクチャ概要節に書いた2つの原則（`steps/`はフラットに`process()`からしか
呼ばれない／`lib/`は技術・外部システム・ファイル形式への依存でのみ判断する）を前提に、
各ファイルの責務と、新しいコードを置く場所の判断基準をまとめる。

**各関数の詳しい振る舞い（引数・戻り値・分岐条件）はコード側のJSDocが正典。** このドキュメントは
1〜2行の責務の要約と、コードを読んでも分からないこと（なぜその置き場所なのか、なぜその案を
採らなかったのか）だけを書く。過去の設計変更の詳細な経緯は
[`docs/history/tasks-archive.md`](./history/tasks-archive.md) にタスクIDごとに残してある。

## 各ファイルの責務

### `src/steps/` — `process()` が直接呼ぶフラットな3ステップ

`lib/`・`utils/`・`steps/shared/` にのみ依存し、step同士は互いに呼ばない。
各stepは「並列処理1件分」を担う非公開関数を1つ持ち、`<動詞>+単数形の対象`で命名する
（`evaluateTarget()` / `planTarget()` / `applyUpdate()`）。`process` のような汎用名は
`main.ts` のオーケストレータやグローバルの `process` と紛らわしいため使わない。

| ファイル                           | 責務                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `filter-targets/filter-targets.ts` | 登録アプリ0件・固定ブランチにオープン中のMRがあるchartAndAppsを除外する |
| `build-plans/build-plans.ts`       | 残ったchartAndAppsごとに更新計画（差分）を並列に構築する                |
| `apply-updates/apply-updates.ts`   | 差分があるchartAndAppsにコミット・MR作成を並列実行する                  |
| `shared/step-outcome.ts`           | 3つのstepが共有する結果ログの識別情報とエラー方針                       |
| `build-plans/sub-steps/`           | `build-plans.ts` の内部実装専用（1アプリ・1箇所ごとの実処理）           |

`build-plans.ts` の階層は「全chartAndApps → 1つのchartAndApps → 1アプリ」の3段までに絞り、
それより下の「1箇所（target）」の処理は `build-plans/sub-steps/` 側の責務にしている。
`buildAppUpdatePlan()`（1アプリ分）はサブステップを順に呼ぶだけで、target配列をループする
`reduce`を自分では持たない。「ステップがステップを呼ばない」原則はサブステップにも適用し、
サブステップ同士も互いを呼ばない。

`build-plans/sub-steps/` の各ファイル:

| ファイル                       | 責務                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `resolve-latest-tag.ts`        | 追跡ブランチ由来の最新タグの判定。HEADに追いついていない場合と、追跡ブランチを切り替えた場合はタグを自動作成                         |
| `image-tag-target.ts`          | イメージタグの1箇所分の差分検出・書き換えと、`app.chart`全箇所のループ（反映済みタグの読み取り専用版`readCurrentImageTags()`も持つ） |
| `helm-target-branch-target.ts` | Helm向き先ブランチについて同じことを行う（値の自動判定はせず設定値と比較）                                                           |
| `values-yaml-draft.ts`         | 1つのchartAndAppsを処理する間の「values.yamlの下書き状態」（`ValuesYamlDraft`）と、その組み立て・`FileUpdate[]`化                    |
| `types.ts`                     | 上記と`build-plans.ts`の間で共有する型のみ                                                                                           |

### `src/lib/` — 特定の技術・外部システム・ファイル形式に依存する処理

| ファイル                         | 責務                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `gitlab/gitlab.ts`               | `@gitbeaker/rest` のラッパー（retry・404フォールバック）。外部I/Oはここだけ         |
| `gitlab/mr-content.ts`           | 固定ブランチ名・MRタイトル・MR本文（Markdown）の組み立て。外部I/Oを持たない         |
| `gitlab/tag.ts`                  | タグ命名規則（`docs/requirements.md` 4.1節）のパース・生成・`TAG_FORMAT`の検証      |
| `config/config.ts`               | 公開API `loadConfig()`。`config/` の2階層固定構成の走査と `ChartAndApps` の組み立て |
| `config/schema.ts`               | 3つの設定ファイルのZodスキーマと `anchors.yaml` の読み込み                          |
| `config/validate.ts`             | 2ファイル間の紐づけ・projectId重複・書き込み先重複の検証                            |
| `config/helm-target-branch.ts`   | `helm.branchToSync` と `helm.chart[]` をapp単位に振り分ける                         |
| `verify-config/verify-config.ts` | `config/`の値がGitLab上に実在するかの検証（`--remote`のlintから呼ぶ）               |
| `verify-config/remote-cache.ts`  | 上記の問い合わせ（project/branch/values.yaml）のキャッシュ層                        |
| `helm.ts`                        | `values.yaml` のYAMLアンカー位置の値の読み書き                                      |
| `env.ts`                         | 環境変数の読み込み・検証（環境変数に触れてよいのはこのファイルだけ）                |

`config/` のスキーマと検証ルールの仕様は `docs/requirements.md` 4.4節が正典（このファイルには
書かない）。

### `src/utils/` — ドメイン知識を一切持たない汎用ユーティリティ

| ファイル                                                        | 責務                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `parallel.ts`                                                   | `mapWithConcurrency()`。並列実行＋`FatalError`検知時の未着手タスクのキャンセル     |
| `sequential.ts`                                                 | `reduceAsync()`。配列を順に処理する非同期reduce（`parallel.ts`の逐次版）           |
| `partition.ts`                                                  | `partitionMap()`。判別可能ユニオンの配列を中身を取り出しつつ2つに振り分ける        |
| `cache.ts`                                                      | `getOrFetch()`（値をキャッシュ）と `getOrFetchShared()`（並列向けにPromiseを共有） |
| `fs.ts`                                                         | パストラバーサル検証・サブディレクトリ列挙                                         |
| `yaml.ts`                                                       | YAMLファイル読み込み + Zodバリデーション                                           |
| `errors.ts` / `http.ts` / `retry.ts` / `timer.ts` / `logger.ts` | カスタムエラー・HTTPステータス判定・リトライ・実行時間計測・構造化ログ             |

## 新しいコードを置く場所の判断基準

新しいコードを置くとき、まず「呼び出し元は何か」を考える:

- `process()` が直接呼ぶ、フラットなパイプラインの1段 → `steps/`。他のステップファイルを
  import しない
- 呼び出し元が `steps/` の1ファイルだけ → そのファイル内の非公開（exportしない）関数。
  1ファイルが大きくなりすぎた場合は、`steps/<step名>/sub-steps/`（例:
  `steps/build-plans/sub-steps/`）へ非公開関数を複数ファイルに分割してよい（`steps/`直下は
  「process()が直接呼ぶフラットな3ステップ」だけに保ち、`sub-steps/`配下は各stepの内部実装
  専用と分かるようにする）。呼び出し元が引き続きそのstepファイル1つだけである限り、
  ファイルを分けても`lib/`への昇格理由にはならない（原則2は変わらない）
- 複数の場所から呼ばれる、かつ特定の技術・外部システム・ファイル形式に依存する
  （GitLab API、Helm chart形式、`config/`のYAML形式、環境変数など）→ 対応する `lib/`
  ファイル。新しい技術/形式を扱うなら新しい `lib/` ファイルを作ってよい
- 複数の場所から呼ばれる、かつ技術に依存しない純粋な計算 → `utils/`
- 複数の `steps/` から呼ばれる、かつ技術ではなくこのツールのドメイン型（`ChartAndApps`・
  `AppUpdatePlan`など）にだけ依存する → `steps/shared/`。`utils/`は「ドメイン知識を
  一切持たない」ものだけを置く場所なのでここには入れられず、技術依存が無い以上`lib/`にも
  置けない。特定stepの内部実装ではないため各stepの`sub-steps/`とも別にする
- 「stepsから呼ばれているから」「複数箇所で使うから」という理由だけで `lib/` に
  置くのは誤り。lib行きの判断基準は常に「技術・外部システム・ファイル形式への依存」

## コードからは読み取れない設計判断

なぜ今の形なのか（＝別の形に「直そう」としたときに踏みうる地雷）。詳細な経緯は
`docs/history/tasks-archive.md` の該当タスクを参照。

- **`gitlab/tag.ts` は外部I/Oを持たないのに `utils/` ではなく `lib/gitlab/` にある**:
  純粋な文字列/日付処理だが「GitLabのタグ」という命名規則に強く紐づくため。`utils/`は
  ドメイン知識を持たないものだけを置く
- **YAML処理は `yaml` パッケージに統一（`js-yaml` 不採用）**: `js-yaml`はオブジェクトとして
  しか読み書きできずアンカー名を保持できない。値の位置指定にYAMLアンカーを使う以上、
  Document（AST）を直接操作できる必要がある
- **`values.yaml` の位置指定はYAMLアンカーのみ**: オブジェクトのネストをdotパスで辿る
  `imageTagKey`方式も実装していたが、実運用ではアンカー方式で十分なため削除した
- **1アプリ分の処理を独立したサブステップファイルにしていない**: 以前
  `build-plans/sub-steps/app-update-plan.ts` に切り出していたが、それ自体が他のサブステップを
  呼ぶ「サブステップがサブステップを呼ぶ」構造になるため、`build-plans.ts`の非公開関数に戻した
- **サブステップはGitLabクライアントを受け取らない**: `LoadValuesYamlContent`・`BranchExists`
  という関数型で受け取り、GitLabクライアント・projectId・キャッシュは`build-plans.ts`側に
  閉じ込める
- **values.yamlの書き込み位置は `AnchorTarget` 1つに統一し、用途別の別名は置かない**:
  以前はイメージタグ用・Helm向き先ブランチ用に`ImageTagTarget`/`HelmTargetBranchTarget`という
  別名を用意していたが、TypeScriptは構造的型付けなので同じ形の型を別々に定義しても
  取り違えは防げず、別名は用途を読み手に伝える以上の効果が無かった。用途の区別は型名では
  なく、利用側の変数名・フィールド名・JSDoc（`AppConfig.chart`・`HelmTargetBranchConfig.targets`
  など）で表す
- **`chart.yaml`/`config.yaml`/`anchors.yaml` の3ファイル分割**: あまり変更されないchart構造
  （`anchors.yaml`）と、頻繁に変更される運用値（`config.yaml`）を分けるため。両者は
  `projectId` で突き合わせて整合性を検証する
- **設定ミスの検知は「形」と「実在」で2段に分けている**: ローカルのYAMLだけで分かること
  （型・対応関係・重複）は`config/validate.ts`が`loadConfig()`時に例外を投げ、GitLabに
  問い合わせないと分からないこと（projectId・ブランチ・valuesPath・アンカーの実在）は`verify-config/`が
  問題の一覧を返す。前者は認証不要なので全パイプラインで、後者はトークンがある
  パイプラインでのみ実行する
- **MRの単位は `(chartリポジトリ, tenantId, clientId)`**: クライアントごとに独立して
  マージ判断・保留できるようにするため。オールオアナッシングの範囲もこの単位
- **アプリ単位は逐次のまま（並列化しない）**: `buildPlan()`は`reduceAsync`でアプリを1つずつ
  処理する。直接の理由は、同じ`values.yaml`への複数アプリ・複数箇所の書き換えを1つの
  `ValuesYamlDraft`に積み上げる必要があるため。**読み取りだけを先に並列化する案も
  検討したうえで採らなかった**:
  - 技術的には可能。1アプリの読み取り（`listTags`・`getBranchHeadSha`・`values.yaml`）は
    他アプリの書き換え結果に依存しない。同じ`valuesPath`を共有していても、同じ
    `valuesPath`+`anchor`の重複は`loadConfig()`で設定エラーになるため、
    あるアンカーの読み取りが別のアンカーへの書き込みに影響されることはない
  - 採らない理由: 1アプリあたりのAPI往復は実質2〜3回（`listTags`と`getBranchHeadSha`は
    すでに`Promise.all`）で削減幅が小さい一方、`resolveLatestTag()`は**タグ作成という副作用**を
    持つため、読み取りフェーズへ移すとタグ作成が並列かつ前倒しで走ることになる。さらに
    下書きを並列共有すると、`verify-config/remote-cache.ts`が問い合わせのPromiseを共有しているのと
    同様の二重fetch対策（`getOrFetchShared()`）が要る。夜間の
    定期実行という前提で、MR内容とGitLabへの書き込みに関わる経路を複雑にする価値は無い
  - 遅い場合にまず動かすのは`CONCURRENCY_LIMIT`（chartAndApps単位の並列数、1〜20）。
    1つのclientに数十アプリが登録され、そこが実測でボトルネックになったときに再検討する

## ディレクトリ構成の勘所

- `config/`: 手書きの設定（対象アプリ登録）。`docs/requirements.md` 4.4節のスキーマに従う。
  CIの`validate-config-remote`が実在チェックの対象にするため、**架空の設定例は置かない**
- `config-test/`: 実GitLabインスタンスへの手動スモークテスト用フィクスチャ
  （`CONFIG_PATH=config-test DRY_RUN=true` で使う）。`config/`と同じスキーマだが本番の登録対象
  ではなく、CIからも参照されない
- `scripts/lint/validate-config.ts`: `config/` の検証スクリプト。既定はローカルのYAMLのみ
  （`pnpm lint:validate-config`、認証不要なので`pnpm lint`に含まれる）、`--remote` を付けると
  GitLabへ問い合わせて projectId・ブランチ・valuesPath・アンカーの実在も検証する
  （`pnpm lint:validate-config:remote`、CIの`validate-config-remote`ジョブが実行）
- `scripts/smoke/smoke-fixture.ts`: `config-test/` を使った実機スモークテストの前準備・後片付け
  （`setup`/`reset`。既定はdry-runで、`--apply`を付けたときだけGitLabに書き込む）。
  手順とシナリオは `docs/smoke-test.md`
- `dist/`: `pnpm build` の生成物。gitignore対象、手で編集しない
- `docs/requirements.md`: 確定した要件。`docs/requirements-grilling.md`: 要件定義時のQ&Aログ
  （検討経緯の参照用、変更不要）。`docs/history/`: 完了タスク・過去セッションのアーカイブ

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
  取得等）は `buildPlan()`（`src/steps/build-plans/build-plans.ts` の非公開関数）内で逐次実行している。
  同じ`values.yaml`への複数アプリの変更を1つのキャッシュに積み重ねる必要があるため。
  `docs/requirements.md` 4.3節の並列実行制御（`p-limit`）は現状chartAndApps単位
  （`filterTargets`/`buildPlans`/`applyUpdates`それぞれ）のみに適用しており、
  1chartAndApps内のアプリ単位までは並列化していない（意図的にこのままとする判断。理由は
  本ファイル前掲の「アプリ単位は逐次のまま（並列化しない）」参照）
