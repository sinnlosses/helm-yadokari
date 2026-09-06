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

| ファイル                                | 責務                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `filter-targets/filter-targets.ts`      | 登録アプリ0件・固定ブランチにオープン中のMRがあるchartAndAppsを除外する |
| `build-plans/build-plans.ts`            | 残ったchartAndAppsごとに更新計画（差分）を並列に構築する                |
| `apply-updates/apply-updates.ts`        | 差分があるchartAndAppsにコミット・MR作成を並列実行する                  |
| `shared/step-outcome.ts`                | 3つのstepが共有する結果ログの識別情報とエラー方針                       |
| `build-plans/sub-steps/`                | `build-plans.ts` の内部実装専用（1アプリ・1箇所ごとの実処理）           |
| `apply-updates/sub-steps/mr-content.ts` | MRタイトル・MR本文（Markdown）の組み立て。外部I/Oを持たない             |
| `shared/feature-branch.ts`              | 固定ブランチ名の組み立て（`filterTargets`と`applyUpdates`が使う）       |

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

| ファイル                       | 責務                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| `gitlab/gitlab.ts`             | `@gitbeaker/rest` のラッパー（retry・404フォールバック）。外部I/Oはここだけ         |
| `gitlab/web-url.ts`            | GitLabのページURL（タグ・比較）のパス組み立て。外部I/Oを持たない                    |
| `tag-format.ts`                | タグ命名規則（`docs/requirements.md` 4.1節）のパース・生成・`TAG_FORMAT`の検証      |
| `config/config.ts`             | 公開API `loadConfig()`。`config/` の2階層固定構成の走査と `ChartAndApps` の組み立て |
| `config/schema.ts`             | 3つの設定ファイルのZodスキーマと `anchors.yaml` の読み込み                          |
| `config/validate.ts`           | 2ファイル間の紐づけ・projectId重複・書き込み先重複の検証                            |
| `config/helm-target-branch.ts` | `helm.branchToSync` と `helm.chart[]` をapp単位に振り分ける                         |
| `helm.ts`                      | `values.yaml` のYAMLアンカー位置の値の読み書き                                      |
| `env.ts`                       | 環境変数の読み込み・検証（環境変数に触れてよいのはこのファイルだけ）                |

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

- 呼び出し元が`src/index.ts`→`main.ts`→`steps/`の本体パイプラインに繋がらず、CI・開発用の
  スクリプトからしか呼ばれない → `scripts/<用途>/`。`src/`は`pnpm build`で`dist/`に出る
  本体の配布物なので、本体が使わないコードは`src/`に置かない（`scripts/lint/verify-config/`が
  この形。テストは`test/scripts/`配下に`scripts/`と同じ構成で置く）
- 以下は`src/`配下の話。`process()` が直接呼ぶ、フラットなパイプラインの1段 → `steps/`。他のステップファイルを
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

型の置き場所も同じ基準で決める（**利用箇所の数では決めない**）。「型は`types/`にまとめる」
という運用にしないのは、`types/`が「ドメイン語彙の一覧」ではなく「型の物置」になると、
どの型がこのツールの語彙でどの型が実装の都合かが読み分けられなくなるため:

| 型の性質                                                                              | 置き場所                                       | 例                                                             |
| ------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| ドメイン語彙（`config/`の構造・更新計画・実行結果。目安は`docs/glossary.md`に載るか） | `src/types/types.ts`（ブランド型は`brand.ts`） | `ChartAndApps`・`AppUpdatePlan`・`ChartUpdateResult`・`Config` |
| 特定の技術・外部システムのインターフェースの一部                                      | その`lib/`ファイル                             | `GitlabClient`・`ConfigTarget`・`Anchors`                      |
| ドメイン知識を持たない汎用処理の型                                                    | その`utils/`ファイル                           | `Sorted`                                                       |
| 複数のstepが共有する、ドメイン型にだけ依存する型                                      | `steps/shared/`                                | `StepOutcome<T>`                                               |
| ステップ内部の作業用の型（アキュムレータ・処理中の文脈・そのstepの戻り値）            | **その型を生み出す関数と同じファイル**         | `BuildPlanContext`・`FilterTargetsResult`・`ValuesYamlDraft`   |
| 特定の1ファイルに帰属せず、複数のサブステップが共有する型                             | `steps/<step名>/sub-steps/types.ts`            | `LoadValuesYamlContent`・`BranchExists`・`ApplyTargetsAcc<U>`  |

`src/types/types.ts` に利用箇所が1ファイルしかない型（`Config`・`PipelineInfo`・`RunResult`）が
あるのは意図的で、上表の1行目に当たるため。逆に `sub-steps/types.ts` は「複数のサブステップが
共有する」という条件を満たす型だけに絞り、1ファイルからしか使われない型はそのファイルへ戻す。

## コードからは読み取れない設計判断

なぜ今の形なのか（＝別の形に「直そう」としたときに踏みうる地雷）。詳細な経緯は
`docs/history/tasks-archive.md` の該当タスクを参照。

- **エラー方針は「fatalは例外・それ以外は戻り値」の2チャネルのままにし、`steps/`配下に
  `try`/`catch`を書かない**: 「401/5xx/ネットワーク障害なら実行全体を落とし、それ以外は
  該当chartAndAppsだけをERRORにして続行する」という判断は`steps/shared/step-outcome.ts`の
  `settleAsError()`1箇所にあるが、以前は3つのstepがそれぞれ
  `catch (err) { return settleAsError(err, logContext) }` と書いており、**fatalも
  ERRORとして計上して続行するように読めた**（実際は`settleAsError()`が`FatalError`を
  投げ直すので落ちる）。読み手が方針を誤読しないよう、catch節そのものを高階関数
  （`runSettled()`・`withAppContext()`）に吸収し、`grep -rn "try {" src/steps/` が
  **0件**であることで「stepはエラー方針を持たない」を機械的に確認できるようにした。
  - 2チャネルを1つの`Result`型に寄せる案は採らない。fatalは「実行全体の中止」という
    スコープの違う事象で、戻り値に混ぜると各stepに「fatalなら伝播させる」判断が戻り、
    いま消したいものが再び分散する。例外はスコープの広い事象、戻り値はchartAndApps
    単位の結果、という役割分担で固定する
  - `lib/gitlab/gitlab.ts`の404/403フォールバック・`utils/retry.ts`・
    `scripts/lint/verify-config/verify-config.ts`の`catch`はこの規約の対象外。前2つは
    「特定のHTTPステータスを正常系に変換する」処理でchartAndApps単位の結果とは無関係、
    verify-configは**問題を全件列挙して返すのが目的の別プログラム**（lintスクリプト）で、
    fatalで全体を落とす方針そのものを持たない

- **URLは`URL`オブジェクトではなく文字列のブランド型（`GitLabUrl`）で扱う**: 生成後の
  用途はMR本文（Markdown）とログへの埋め込みだけで、`URL`にすると`href`の正規化で
  出力文字列が変わりうる（`https://example.com` → `https://example.com/`）うえ、
  ミュータブルでテストの比較も煩雑になる。**型で縛るのは生成経路のほう**で、
  `toGitLabUrl()`をhttp(s)検証つきのファクトリにし、環境変数由来もGitLab APIの
  レスポンス由来（`project.web_url`・`pipeline.web_url`）も必ずここを通す
- **プロジェクト配下のURLは`new URL(path, base)`ではなく文字列連結で組み立てる**:
  `webUrl`はオリジンではなく**プロジェクトのパスまで含んだURL**
  （`https://host/group/proj`、サブパス設置なら`https://host/gitlab/group/proj`）なので、
  `new URL("/-/tags/x", webUrl)`はグループ/プロジェクト部分を捨てて壊れたURLになる。
  組み立てとエスケープは`lib/gitlab/web-url.ts`の`buildTagUrl()`/`buildCompareUrl()`に閉じ込め、
  呼び出し側が`encodeURIComponent`を書かなくて済むようにしている

- **型定義のフィールド名は、ブランド型が表している語（`Name`など）を落とさない**:
  `anchor: AnchorName` は「アンカーそのもの」を持っているように読めるが、実際に持っているのは
  名前だけで、この差が読み違いを生む（`src/lib/helm.ts` は引数名として既に
  `anchorName: AnchorName` を使っており、フィールド側だけが浮いていた）。
  - **適用するのは型定義のフィールドだけ**。関数の引数名（`branch: BranchName` など10ファイル
    以上に散在）は対象外とする。引数は型注釈が同じ行に見えるのに対し、フィールドは
    ドットアクセスで宣言から離れた場所で読まれる、という違いで線を引く
  - 修飾語が「どれか」を担っているフィールド（`branchToSync`・`mrTargetBranch`・
    `previousBranch`・`newBranch`）は対象外。`Name` を足しても曖昧さは減らず、名前が伸びるだけ
  - 包含する型が主語を与える `name`（`ParsedTag.name`・`TagInfo.name`）も対象外。
    `tag.name` で「タグの名前」と読める
  - 例外的に修飾語つきでもリネームしたのは `ImageTagUpdate.previousTag` → `previousTagName`。
    `plan.latestTag`（`ParsedTag`オブジェクト）と同じ式の中に並ぶため、文字列かオブジェクトかを
    名前で区別できるようにした
  - `CommitAction.filePath` は `gitlab.Commits.create()` にそのまま渡す gitbeaker の
    ペイロード形状なので変えない。一方 `FileUpdate.filePath` は内部の型なので、
    同じ概念を他の全箇所と同じ `valuesPath` に揃えた
  - YAMLのキー名（`anchors.yaml` の `anchor` など）は wire format なので変えない。
    内部表現への詰め替えは `lib/config/schema.ts` の `.transform()` が担う

- **`lib/gitlab/` にはGitLabという外部システムを知っているものだけを置く**: 以前はここに
  `tag.ts`（タグ命名規則）と`mr-content.ts`（固定ブランチ名・MRタイトル・MR本文）も
  同居していたが、これは「`gitlab.ts`が長くなったので切り出した」結果で、原則2の基準では
  説明できない配置だった。依存対象で見ると3種類の別物が混ざっていたため、次のように分けた:
  - `tag.ts` → `lib/tag-format.ts`。GitLab APIにもGitLab固有の形式にも依存せず、依存先は
    このツール自身が定義する`TAG_FORMAT`というテンプレート**形式**（`docs/requirements.md`
    4.1節。タグを作るのも読むのもこのツール自身）。原則2の「ファイル形式」に当たるものとして
    `lib/helm.ts`（`values.yaml`形式）・`lib/config/schema.ts`（`config/`形式）と同格に置く。
    `utils/`はドメイン知識を持たないものだけを置く場所なので入れられない
  - `buildFeatureBranch()` → `steps/shared/feature-branch.ts`。技術依存はゼロで、
    `TenantId`+`ClientId`→`BranchName`というドメイン型だけの変換。`filterTargets`と
    `applyUpdates`の2つのstepから呼ばれるため`steps/shared/`の条件をそのまま満たす
  - MRタイトル・本文 → `steps/apply-updates/sub-steps/mr-content.ts`。呼び出し元は
    `apply-updates.ts`の1ファイルだけなので、「呼び出し元がstepsの1ファイルだけ →
    そのstepの`sub-steps/`」という基準どおりの場所に移した
  - `buildTagUrl()`/`buildCompareUrl()` → `lib/gitlab/web-url.ts`。`/-/tags/`・`/-/compare/`
    というGitLab固有のURLパス形式に依存する唯一の部分なので`lib/gitlab/`に残す。
    「外部I/Oは`gitlab.ts`だけ」を保つため`gitlab.ts`には混ぜず別ファイルにしている
- **`lib/gitlab/gitlab.ts`の`commitFileUpdates()`だけはドメイン型`FileUpdate`を知っている**:
  「固定ブランチを消して`baseBranch`から作り直す」「create/updateの判定は常に`baseBranch`基準」
  という方針を持ち、`filterTargets`がオープン中のMRの不在を確認済みであることも前提にしている。
  方針をstep側へ引き上げる案は採らない。中身はブランチ確認・削除・ファイル取得・コミットという
  4種のAPI呼び出しの手順で、stepに移すとstep側にGitLab APIの呼び出し順が漏れるため
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
- **実在チェック（`verify-config/`）は`src/lib/`ではなく`scripts/lint/`に置く**: GitLab APIと
  `config/`形式に依存するので`lib/`の条件（原則2）は満たすが、原則2は「`src/`のどこに置くか」の
  基準であって「`src/`に置くか否か」を決めない。本体パイプラインからの参照は0で、唯一の
  呼び出し元は`scripts/lint/validate-config.ts`。`src/`に置くと`pnpm build`の`dist/`に
  本体が使わないコードが混ざり、「本体から呼ばれない」という一番効く事実が構成に現れない
- **設定ミスの検知は「形」と「実在」で2段に分けている**: ローカルのYAMLだけで分かること
  （型・対応関係・重複）は`config/validate.ts`が`loadConfig()`時に例外を投げ、GitLabに
  問い合わせないと分からないこと（projectId・ブランチ・valuesPath・アンカーの実在）は
  `scripts/lint/verify-config/`が
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
    下書きを並列共有すると、`scripts/lint/verify-config/remote-cache.ts`が問い合わせのPromiseを
    共有しているのと
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
- `scripts/lint/verify-config/`: 上記`--remote`の実装本体。`verify-config.ts`が実在チェック、
  `remote-cache.ts`がその問い合わせ（project/branch/values.yaml）のキャッシュ層。
  ここだけは`scripts/`配下でテストを持つため、`vitest.config.ts`のcoverage対象に含めている
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
