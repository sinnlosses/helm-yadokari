# アーキテクチャ詳細

責務: 各ファイルの責務・新しいコードの置き場所・既知の制約・ディレクトリ構成の勘所と、設計判断の一覧表を持つ、
全体構造の入口。設計判断の本文は `docs/architecture/adr/` に1件1ファイルで置いてある。
読む時: 新しいコードの置き場所に迷ったとき、各ファイルが何をするか知りたいとき、「なぜ今の形なのか」を確かめたいとき。
直す時: 置き場所の基準・ファイルの責務を変えたとき、設計判断を新しく記録する・ADR の一覧表を更新するとき。

## このドキュメントの読み方

| 知りたいこと                                     | 見る場所                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| 各関数の引数・戻り値・分岐条件                   | **コード側のJSDocが正典**（このドキュメントには書かない）                   |
| 新しいコードをどのディレクトリに置くか           | 「新しいコードを置く場所」（原則の要約だけCLAUDE.mdにある）                 |
| 各ファイルが何をするか                           | 「各ファイルの責務」                                                        |
| なぜ今の形なのか（別の形に直そうとする前に読む） | 「設計判断（なぜ今の形なのか）」の一覧表から `docs/architecture/adr/` の1件 |
| 踏みやすい落とし穴                               | 「既知の制約・注意点」                                                      |
| `config/`のスキーマ・検証ルールの仕様            | `docs/requirements.md` 4.4節が正典                                          |
| 過去の設計変更の詳細な経緯                       | [`docs/history/tasks.md`](./history/tasks.md)                               |

**各関数の詳しい振る舞いはコード側のJSDocが正典。** ここには1〜2行の責務の要約と、コードを
読んでも分からないこと（なぜその置き場所なのか、なぜその案を採らなかったのか）だけを書く。

### このファイルは通読しない

頭から全部読むとそれだけでコンテキストを大きく消費する。下の索引で節を1つ特定し、**その節だけ**を
次の形で読む（見出し名で切り出すので、行番号と違って編集で腐らない）:

```bash
sed -n '/^### 型の置き場所/,/^#\{2,3\} /p' docs/architecture.md
```

設計判断は本文が `docs/architecture/adr/` の1件1ファイルに分かれているので、「設計判断（なぜ今の形なのか）」
の一覧表で1件を選び、そのファイルだけを開く（`sed` は要らない）。

### 節の索引

**各ファイルの責務** — どのファイルが何をするかの表

| 節                | 中身                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| ### `src/steps/`  | 4ステップの責務表。`resolve-tags/sub-steps/`・`build-plans/sub-steps/`・`apply-updates/sub-steps/` の表もこの節の中 |
| ### `src/lib/`    | 外部システム・ファイル形式に依存するアダプタの責務表                                                                |
| ### `src/domain/` | このツールの語彙（型）と、語彙に閉じた規則の責務表                                                                  |
| ### `src/utils/`  | ドメイン知識を持たない汎用ユーティリティの責務表                                                                    |

**新しいコードを置く場所** — 置き場所に迷ったらここ（CLAUDE.mdの原則1〜5の判断材料）

| 節                                | 中身                                                 |
| --------------------------------- | ---------------------------------------------------- |
| （節の冒頭）                      | 置き場所の早見表と、`lib/`・`domain/`・`utils/`の2軸 |
| ### 1ファイルにまとめるか分けるか | まとめる/分ける合図                                  |
| ### 型の置き場所                  | 型の性質ごとの判断表（**利用箇所の数では決めない**） |

**設計判断（なぜ今の形なのか）** — 今の形を別の形に直そうとする前に、該当するADRを読む（本文は `docs/architecture/adr/` に1件1ファイル。この節は一覧表だけを持ち、5つの `###` 見出しで分けてある）

| 節                           | 中身                                                                |
| ---------------------------- | ------------------------------------------------------------------- |
| ### エラー処理と並列実行     | 2チャネルのエラー処理・HTTPエラーの経路・並列実行                   |
| ### データの受け渡し         | 引数の契約・キャッシュ・サブステップの分担                          |
| ### 型と命名                 | ブランド型・命名・ファイル名                                        |
| ### ディレクトリ配置         | `lib/`・`sub-steps/`・`scripts/lint/`・`PlatformAdapter` の置き場所 |
| ### 設定・環境変数・外部形式 | 環境変数・`config/`・`values.yaml`・MRの単位・トークン              |

**既知の制約・注意点** — 踏みやすい落とし穴

| 節                                                                     | 中身                       |
| ---------------------------------------------------------------------- | -------------------------- |
| ### `CONCURRENCY_LIMIT`はGitLab/GitHub APIへの同時接続数の上限ではない | 実際の同時接続数の見積もり |
| ### FatalErrorは後続ステップも止める                                   | 中断の伝播範囲             |
| ### その他                                                             | 上記に入らない細かい制約   |

**ディレクトリ構成の勘所**（末尾の節） — ツリー図と、並べ方の考え方

## 各ファイルの責務

### `src/steps/` — `runProcess()` が直接呼ぶフラットな4ステップ

`lib/`・`utils/`・`domain/`・`steps/shared/` にのみ依存し、step同士は互いに呼ばない。
各stepは「並列処理1件分」を担う非公開関数を1つ持ち、`<動詞>+単数形の対象`で命名する
（`process` のような汎用名は、オーケストレータやグローバルの `process` と紛らわしいため使わない）。

| ファイル                           | 責務                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `filter-targets/filter-targets.ts` | 登録アプリ0件・固定ブランチにオープン中のMRがある設定ユニットを除外する                                                 |
| `resolve-tags/resolve-tags.ts`     | 残った設定ユニットの全アプリを`TagSource`へ一意化し、単位ごとに1回だけ最新タグを解決する                                |
| `build-plans/build-plans.ts`       | 解決済みの最新タグを引き当て、設定ユニットごとに更新計画（差分）を並列に構築する                                        |
| `apply-updates/apply-updates.ts`   | 差分がある設定ユニットにコミット・MR作成を並列実行する                                                                  |
| `shared/step-outcome.ts`           | stepが共有する処理結果の型（設定ユニット単位の`StepOutcome`とアプリ単位の`AppOutcome`）・結果ログの識別情報・エラー方針 |
| `shared/describe-plan.ts`          | 更新計画1件をログ用のサマリに整形する（dryRun時とMR作成時で共有）                                                       |

#### `resolve-tags/sub-steps/`

| ファイル                | 責務                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `resolve-latest-tag.ts` | `TagSource`1件分の最新タグの判定。追跡ブランチのHEADを指すタグが1件も無ければ作成する（`dryRun`のときは名前の計算だけ） |

一意化した単位のループは親step（`resolve-tags.ts`）側にある。サブステップが1つしかないため
「サブステップがサブステップを呼ぶ」構造にならず、`buildPlan()`が避けている「呼び出しの粒度が
揃って見えなくなる」問題も起きない（`docs/architecture/adr/0022-substeps-no-cross-import.md`）。

#### `build-plans/sub-steps/`

親stepが持つ階層は「全設定ユニット → 1つの設定ユニット」の2段までに絞り、それより下の
「1アプリ」「1箇所（target）」のループは各サブステップの内側に置く。**サブステップは自分の
関心事について全スコープを引き受ける**ため、`buildPlan()`はサブステップを順に呼んで下書きを
受け渡すだけになる（アプリのループを親stepに持たせない理由は
`docs/architecture/adr/0022-substeps-no-cross-import.md`を参照）。

| ファイル                           | 責務                                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `look-up-latest-tags.ts`           | `resolveTags()`が解決済みの最新タグから、設定ユニット配下の全アプリぶんを引き当てる                                                                                       |
| `stage-image-tag-updates.ts`       | イメージタグの1箇所分の差分検出・書き換えと、`app.imageTagLocations`全箇所＋設定ユニット配下の全アプリのループ                                                            |
| `stage-helm-branch-ref-updates.ts` | Helm向き先ブランチについて同じことを行う（値の自動判定はせず設定値と比較）。設定ユニット単位なので全アプリのイメージタグを積んだ後に1回だけ呼ぶ                           |
| `shared/values-yaml-draft.ts`      | 1つの設定ユニットを処理する間の「values.yamlの下書き状態」（`ValuesYamlDraft`）の読み込み（下書き優先・無ければバッチキャッシュ経由でGitLab）・書き換え・`FileUpdate[]`化 |
| `shared/types.ts`                  | 複数のサブステップと`build-plans.ts`の間で共有する型のみ                                                                                                                  |

#### `apply-updates/sub-steps/`

`applyUpdate()`が呼ぶのはこの3つだけで、GitLab APIの呼び出し順はサブステップの内側にある
（理由は`docs/architecture/adr/0011-branch-rebuild-in-substep.md`）。

| ファイル                  | 責務                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `collect-mr-entries.ts`   | 計画からMRに載せる項目（`MrEntries`）を選ぶ。リンク用のweb URLと最新パイプラインの解決         |
| `build-mr-content.ts`     | `MrEntries`をMRのタイトルとMarkdown本文にする。外部I/Oを持たない同期の純粋関数                 |
| `submit-merge-request.ts` | 固定ブランチの作り直し（残っていれば削除）・コミット・MR作成というGitLab APIの呼び出し順を持つ |
| `shared/types.ts`         | 上記3つが受け渡す`MrEntries`・`ImageTagEntry`・`MrContent`                                     |

項目の選別（何をMRに載せるか）とMarkdownの組み立てを分けてあるのは、**タイトルの件数と本文の
テーブルの行を同じ配列から数えるため**（別々に数えると、件数と行数がずれても気づけない）。

### `src/lib/` — 特定の技術・外部システム・ファイル形式に依存する処理

| ファイル                           | 責務                                                                                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform/adapter.ts`              | `PlatformAdapter`型（GitLab/GitHubの15エントリを並べた関数テーブル。`steps/`はこれだけを受け取り、クライアントの型を知らない）。API呼び出しに加えエラー分類（`isFatalError`等）も持つ           |
| `platform/cached-reads.ts`         | `CachedReads`と`withCachedReads()`。バッチ1回を通して使い回す`PlatformAdapter`読み取りのキャッシュを`PlatformAdapterWithCachedReads.cached`として入れ子にする。キャッシュしてよい読み取りの一覧 |
| `platform/token-routed-adapter.ts` | `createTokenRoutedAdapter()`。`ProjectId`ごとに宣言されたトークンのアダプタへ振り分け、宣言トークンの401だけをそのchartリポジトリの設定ユニットの`ERROR`に読み替える                            |
| `gitlab/api.ts`                    | `@gitbeaker/rest` のラッパー（retry・404フォールバック）。外部I/Oはここだけ。**GitLab専用**                                                                                                     |
| `gitlab/adapter.ts`                | `createGitlabAdapter()`。`api.ts`の各関数をクライアントごと束ねて`PlatformAdapter`の形に組み立てる                                                                                              |
| `gitlab/web-url.ts`                | GitLabのページURL（タグ・比較）のパス組み立て。外部I/Oを持たない                                                                                                                                |
| `gitlab/errors.ts`                 | gitbeakerのエラーの形をこのツールのエラー方針に翻訳する（fatal判定・404判定・再試行可否）。**gitbeaker固有のエラー構造を知ってよい唯一の場所**                                                  |
| `github/api.ts`                    | `@octokit/rest` のラッパー（retry・404フォールバック）。外部I/Oはここだけ。**GitHub専用**                                                                                                       |
| `github/adapter.ts`                | `createGithubAdapter()`。`api.ts`の各関数をクライアントごと束ねて`PlatformAdapter`の形に組み立てる                                                                                              |
| `github/web-url.ts`                | GitHubのページURL（タグ→リリースページ・比較）のパス組み立て。外部I/Oを持たない                                                                                                                 |
| `github/errors.ts`                 | Octokitのエラーの形をこのツールのエラー方針に翻訳する（fatal判定・404判定・再試行可否・`retry-after`の読み取り）。**Octokit固有のエラー構造を知ってよい唯一の場所**                             |
| `config/config.ts`                 | 公開API `loadConfig()`。絞り込み（`limit-to-target.ts`）→設定ユニットの発見（`find-config-units.ts`）→読み込み・結合（`load-config-unit.ts`）の段を順に呼ぶだけの入口                           |
| `config/limit-to-target.ts`        | `TARGET_CHART`/`TARGET_UNITS`（`ConfigTarget`）の解釈。絞り込み（`selectChartDirs`/`selectTargetConfigUnits`）と絞り込み結果0件の検出（`assertTargetMatched`）                                  |
| `config/find-config-units.ts`      | 1つのchartディレクトリから設定ユニットを見つける（`findConfigUnits()`）。`registry.yaml`の有無を見て、階層の検証（深さ・入れ子）込みで`ChartDirUnits`にする                                     |
| `config/load-config-unit.ts`       | 走査で見つかった設定ユニットごとに `versions.yaml`・`locations.yaml` を読み、chartディレクトリの `registry.yaml` の `appSpecs[]` を `projectName` で引いて結合し `ConfigUnit` にする            |
| `config/schema.ts`                 | 3種の設定ファイル（`registry.yaml` / `versions.yaml` / `locations.yaml`）のZodスキーマ                                                                                                          |
| `config/validate.ts`               | projectId・projectName重複・書き込み先重複・chartリポジトリをまたぐtagFormat食い違いの検証                                                                                                      |
| `helm.ts`                          | `values.yaml` のYAMLアンカー位置の値の読み書き                                                                                                                                                  |
| `env.ts`                           | 環境変数の読み込み・検証（環境変数に触れてよいのはこのファイルだけ）。`loadEnvConfig()`に加え、`registry.yaml`が宣言したトークンを読む`loadAccessTokens()`を持つ                                |
| `report/format-report.ts`          | 設定ユニット単位のレコード配列をMarkdown1枚（ヘッダ＋表）に整形する。外部I/Oを持たない同期の純粋関数                                                                                            |
| `report/write-report.ts`           | `format-report.ts`が組み立てたMarkdownを`REPORT_OUTPUT_PATH`へ書き出す。親ディレクトリが無ければ作る                                                                                            |

### `src/domain/` — このツールの語彙（型）と、その語彙に閉じた規則

helm-yadokari が何を扱っているかを表す**語彙**（ドメイン型・ブランド型）と、その語彙だけで
書ける**規則**（どう名付け・どう表現するかの取り決め）を置く。技術（外部システム・
ファイル形式・ライブラリ）を知らず、複数の`lib/`・`steps/`にまたがって使われる
（→「新しいコードを置く場所」の2軸の表）。

| ファイル            | 責務                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`          | このツールのドメイン型（`ConfigUnit`・`AppUpdatePlan`・`ParsedTag`など）。`brand.ts`を再エクスポートするので、型のimportはこのファイル1つで足りる                             |
| `brand.ts`          | ドメインのブランド型と、その生成に使うfactory関数（`toProjectId`等）。**`src/`内で`as`を使ってよい唯一のファイル**                                                            |
| `tag-format.ts`     | タグ形式（`docs/requirements.md` 4.1節）のパース・生成・テンプレート文字列の検証                                                                                              |
| `tag-source.ts`     | 最新タグの解決単位（`TagSource`）の同一性を表す値キーの組み立て（`buildTagSourceKey()`）                                                                                      |
| `feature-branch.ts` | 固定ブランチ名 `feature/yadokari/<unitPath>` の組み立てと判定                                                                                                                 |
| `config-unit.ts`    | `TARGET_UNITS`の1エントリを`ConfigUnitPath`として受け入れられる形かどうかの検証。設定ユニットの位置表示（`<chartDirName>/<unitPath>`、`buildConfigUnitLocation()`）の組み立て |

### `src/utils/` — ドメイン知識を一切持たない汎用ユーティリティ

| ファイル                                            | 責務                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parallel.ts`                                       | 並列実行＋`FatalError`検知時の未着手タスクのキャンセル                                                                                                  |
| `sequential.ts`                                     | 配列を順に処理する非同期reduce（`parallel.ts`の逐次版）                                                                                                 |
| `partition.ts`                                      | 判別可能ユニオンの配列を中身を取り出しつつ2つに振り分ける                                                                                               |
| `cache.ts`                                          | 並列向けに実行中のPromiseを共有するキャッシュ（`getOrFetchShared()`）と、引数からキーを組み立てて読み取り1つをキャッシュ付きの関数にする`cacheByArgs()` |
| `fs.ts`                                             | パストラバーサル検証・サブディレクトリ列挙                                                                                                              |
| `yaml.ts`                                           | YAMLファイル読み込み + Zodバリデーション                                                                                                                |
| `errors.ts` / `retry.ts` / `timer.ts` / `logger.ts` | カスタムエラーと例外→文字列の変換・指数バックオフ（再試行の可否は引数で受け取る）・実行時間計測・構造化ログ                                             |

## 新しいコードを置く場所

CLAUDE.mdに原則1〜3の要約があり、**判断材料はここが正典**。まず「呼び出し元は何か」を考える。

| 呼び出し元 / 性質                                                | 置き場所                                       |
| ---------------------------------------------------------------- | ---------------------------------------------- |
| CI・開発用スクリプトだけ（本体パイプラインから参照されない）     | `scripts/<用途>/`                              |
| `runProcess()` が直接呼ぶパイプラインの1段                       | `steps/`                                       |
| `steps/` の1ファイルだけ                                         | そのファイル内の非公開関数                     |
| 同上で、そのファイルが大きくなりすぎた                           | `steps/<step名>/sub-steps/`                    |
| 複数のサブステップが共有する                                     | `steps/<step名>/sub-steps/shared/`             |
| 複数箇所から呼ばれる（`steps/`の配線ではない）                   | `lib/`・`domain/`・`utils/`（下の2軸で決める） |
| 複数の`steps/`から呼ばれるstep処理の配線（結果ログ・エラー方針） | `steps/shared/`                                |

`lib/`・`domain/`・`utils/`の3つは呼び出し元では分かれない。この3つは**何を知っているか**の
2軸で決める:

|                      | 技術を知らない                              | 技術を知っている                                        |
| -------------------- | ------------------------------------------- | ------------------------------------------------------- |
| ドメインを知っている | `domain/` — 語彙（型）と、語彙に閉じた規則  | `lib/` — 語彙と技術をつなぐ適応層                       |
| ドメインを知らない   | `utils/` — 純粋な計算（`partition.ts`など） | `utils/` — 技術に特化した汎用処理（`yaml.ts`・`fs.ts`） |

ここでの「技術」は外部システム・外部ファイル形式・特定のライブラリを指す。`steps/`はこの表の
外にある（どれを呼ぶかを決めるパイプラインの配線）。

補足（表だけでは判断を間違えやすい点）:

- **原則3を原則2より先に適用する**。原則2は「`src/`のどこに置くか」の基準であって、「`src/`に
  置くか否か」は決めない。`src/`は`pnpm build`で`dist/`に出る本体の配布物なので、本体が
  使わないコードは条件を満たしても`src/`に入れない（→「実在チェックは`scripts/lint/`に置く」）
- **`sub-steps/`に分割しても`lib/`への昇格理由にはならない**。呼び出し元が引き続きその
  stepファイル1つだけである限り、原則2の判定は変わらない
- **技術に依存していても、ドメインを知らないものは`utils/`**（`yaml.ts`・`fs.ts`）。原則2の
  「技術・外部システム・ファイル形式に依存するかだけで判断する」の「だけ」は「呼ばれる回数では
  決めない」の意味で、技術依存は`lib/`の必要条件にすぎない。2軸の表の下段は`lib/`に上げない
- **概念のまとまりが`domain/`の基準に優先する**。2軸で上段左（ドメインを知っていて技術を
  知らない）に当たっても、既にある概念の仲間として読める場所があるならそちらに置く。
  `lib/config/validate.ts`（設定の整合性ルール。`config/`を読む人が開く場所）と
  `steps/shared/describe-plan.ts`（更新計画のログ表現。step配線の一部）が`domain/`に無いのは
  このため。`domain/`に置くのは**複数の`lib/`・`steps/`にまたがる語彙と規則**に限る
- **`steps/shared/`に入るのはstepオーケストレーションの共通部品だけ**。ドメインの取り決めその
  ものは`domain/`（→「`lib/gitlab/`にはGitLabを知っているものだけを置く」）
- **「stepsから呼ばれているから」「複数箇所で使うから」だけで`lib/`に置くのは誤り**。lib行きの
  判断基準は常に上の2軸（ドメインを知ったうえで技術に依存する）

### 1ファイルにまとめるか分けるか

置き場所が決まったあと、そこで1ファイルにまとめるか分けるかは**行数でも関数の数でもなく
「ファイル名が概念になっているか」で決める**。名前が関数名の言い換えではなく概念
（`describe-plan.ts`＝更新計画をログ用に説明する、`timer.ts`＝時間を測る）なら、その名前が
「次に何が入ってよいか」を決めてくれるので拡張できる。逆に`helpers.ts`・`utils.ts`・
`common.ts`のような**置き場所を名前にしたファイルは作らない**（何が入ってよいか決められず、
増えるほど誰も説明できなくなる）。

**まとめる合図**（1つでも当てはまれば同居させる）:

1. 同じ理由で一緒に書き換わる
2. 非公開ヘルパーを共有している（分けると非公開だったものを`export`に昇格させることになる。
   分割の最も見えにくいコスト）
3. 対になっていて片方だけでは意味が分からない（`lookupValueAtAnchor`/`setValueAtAnchor`）
4. 呼び出し側がほぼ必ずセットでimportする

**分ける合図**（1つでも当てはまれば分割する。①〜④が優先で、行数だけを理由には割らない）:

1. ファイルの責務を「〜と〜」でしか説明できない
2. 変更理由が違う（別々の用事で開くべきファイルが同じになっている）
3. 非公開ヘルパーが2グループに割れている
4. 依存が違う（片方だけが外部I/Oを持つ等）
5. 200行超、または公開関数が2語彙以上

適用例:

- **1公開関数だけのファイルは問題ない**。名前が概念なら「次に何が入ってよいか」を名前が
  決めてくれる。拡張しづらくなるのは関数が1つだからではなく、置き場所を名前にしたとき
- **合図⑤（200行超）に掛かっても分けなかったファイルが複数ある**。どれも「1つの理由で全関数が
  一緒に書き換わる」「非公開ヘルパーを全員が共有している」に当てはまり（まとめる合図①②）、
  行数だけを理由に割るとその共有が壊れる
- **合図⑤しか成り立たない実例が`lib/platform/token-routed-adapter.ts`**。
  ①責務は「`ProjectId`からトークンのアダプタを決めて委譲する」の一言、②委譲テーブルの変更は
  `platform/adapter.ts`・`gitlab/adapter.ts`・`github/adapter.ts`を必ず同時に開くので切り出しても
  開く枚数は減らない、③非公開の各関数は`Route`型とアダプタの表を共有して1グループ、
  ④依存は全員`domain/types.js`と`./adapter.js`だけ。加えて`firstAdapter()`の「到達しない
  防御的な分岐」というコメントは、同居する`assertAdapterAvailable()`が組み立て時に弾くことを
  根拠にしている。離すとこの根拠が読者から見えなくなり、`Route`・`buildRoutes()`・`lookupRoute()`・
  `callRoute()`が`export`に昇格して公開面が広がる
- **合図⑤に掛かって分けたファイルもある**。変更理由が別で、非公開ヘルパーも2グループに
  割れていた（分ける合図②③）。**行数は分けた理由ではない**
- **単発のヘルパーに1ファイルを与えない**。「役割で括れて複数を並べられる」単位が別ファイルに
  値する境目で（Zodスキーマ群、アサート関数群）、1関数だけのヘルパーはそこに達しない

### 型の置き場所

**利用箇所の数では決めない。** 型の性質だけで決める。

| 型の性質                                                                           | 置き場所                                         | 例                                                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| ドメイン語彙（`docs/glossary.md`に載る概念かどうかが目安）                         | `src/domain/types.ts`（ブランド型は`brand.ts`）  | `ConfigUnit`・`AppUpdatePlan`・`ConfigUnitUpdateResult`・`ParsedTag`       |
| 特定の技術・外部システム・外部ファイル形式のインターフェースの一部                 | その`lib/`ファイル                               | `GitlabClient`・`ConfigTarget`・`LoadedConfig`・`AppSpec`・`EnvConfig`     |
| ドメイン知識を持たない汎用処理の型                                                 | その`utils/`ファイル                             | `Sorted`                                                                   |
| 複数のstepが共有する、ドメイン型にだけ依存する型                                   | `steps/shared/`                                  | `StepOutcome<T>`・`AppOutcome<T>`・`ConfigUnitLogContext`                  |
| 関数の内部の作業用の型（アキュムレータ・処理中の文脈・その関数の戻り値・引数の形） | **その型を生み出す／受け取る関数と同じファイル** | `BuildPlansResult`・`ValuesYamlDraft`・`LabeledLocation`・`ChartRepoScope` |
| 特定の1ファイルに帰属せず、複数のサブステップが共有する型                          | `steps/<step名>/sub-steps/shared/types.ts`       | `MrEntries`・`ImageTagEntry`・`StageUpdatesAcc<U>`                         |

- **`domain/types.ts`は「ドメイン語彙の一覧」であって「型の物置」ではない。** 置き場所に困った型を
  ここへ集めると、どの型がこのツールの語彙でどの型が実装の都合かが読み分けられなくなる。
  `src/domain/types.ts` に利用箇所が1〜2ファイルしかない型（`RunResult`）が
  あるのは意図的で、上表の1行目に当たる
- `sub-steps/shared/types.ts`のような型だけのファイルは、**特定の1ファイルに帰属しない型**
  （複数のサブステップが共有する関数型インターフェースや共通のアキュムレータ基底）だけに使う。
  1ファイルからしか使われない型はそのファイルへ戻す
- **上表の5行目と6行目は競合しうる**（`MrEntries` は `collect-mr-entries.ts` が生み出す型
  だが `build-mr-content.ts` も import する）。そのときは **`shared/` 側を優先する** —
  サブステップ同士が互いをimportしないという原則の方が、型と生成関数の同居より優先度が高い
- **5行目は`steps/`だけの話ではない。** `lib/`のファイルの中にも、そのファイルの関数のためだけに
  ある作業用の型がある（`lib/config/load-config-unit.ts` の `ChartRepoScope`・`ConfigUnitScope`・
  `LinkedApp`、`lib/helm.ts` の `AnchorLookup`、`lib/gitlab/api.ts` の `CommitAction`）。
  **2行目と5行目の境目は「そのアダプタを外から呼ぶ人が見る形かどうか」**で、置き場所は
  どちらも同じファイルなので実務上の差は出ない。効くのは「`domain/types.ts`へ上げるべきか」を
  考えるときだけで、5行目のものは上げない
- **`steps/shared/` にあるからといって4行目とは限らない。** 4行目は複数のstepが型として共有するもの
  （`step-outcome.ts`）で、`describe-plan.ts` の `PlanLogSummary`・`HelmBranchRefLogSummary` は
  `describePlan()` の戻り値の形でしかないので5行目に当たる。共有されているのは関数であって型ではない
- **1行目と5行目も競合しうる**。`ParsedTag` は `domain/tag-format.ts` の関数が生み出す型だが、
  タグから読み取れる情報そのものというドメイン語彙なので `domain/types.ts` に置く。
  **語彙かどうかが先**で、どの関数が作るかは後。`domain/`の規則側のファイル
  （`tag-format.ts`・`feature-branch.ts`・`config-unit.ts`）に型定義が1件も無いのはこの順序の結果
- **関数が引数として受け取る形も5行目**（`LabeledLocation` は `validateNoDuplicateLocations()` の
  引数で、呼び出し側の `load-config-unit.ts` が組み立てる）。「生み出す」だけでなく
  「その関数のためだけに存在する」かで判断する
- **Zodスキーマから `z.infer` で導出した型はスキーマと同じファイル**（`AppSpec` は
  `lib/config/schema.ts`）。外部ファイル形式の写しなので2行目に当たる。内部表現への詰め替えは
  スキーマの `.transform()` が担うため、詰め替え後の型はドメイン語彙として1行目へ移る
- **中身を1つ包むだけの集約型は語彙ではなく2行目**（`LoadedConfig` は `lib/config/config.ts`）。
  `config/`を読む唯一の入口の戻り値の形なので、引数側の `ConfigTarget` と同じくそのアダプタの
  インターフェースの一部に当たる。1行目の目安は`docs/glossary.md`に載る概念かどうかで、
  既にある型を1つ包むだけの型はそこに載らない
- **型を動かすときは表を先に読む。** 表に当てはまらない型が出てきたら、その型を動かす前に
  表の側が足りていないことを疑う

## 設計判断（なぜ今の形なのか）

別の形に「直そう」としたときに踏みうる地雷。**ここに書くのは今後の判断を変えるものだけ**で、
適用済みのリネーム・移動の経緯は `docs/history/` 側が正典。

本文は `docs/architecture/adr/` に1件1ファイルで置いてある。別の形に直そうとする前に、該当するファイルを読む。

### エラー処理と並列実行

| ファイル                                                         | 判断                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `docs/architecture/adr/0001-two-channel-error-handling.md`       | エラーは「fatalは例外・それ以外は戻り値」の2チャネル。`steps/`に`try`/`catch`を書かない |
| `docs/architecture/adr/0002-http-error-path.md`                  | HTTPエラーの経路                                                                        |
| `docs/architecture/adr/0003-with-app-context-in-steps-shared.md` | アプリ名の付与は`steps/shared/`に置き、アプリ単位の処理を切り出した箇所すべてから呼ぶ   |
| `docs/architecture/adr/0004-no-dedup-of-parallel-dispatch.md`    | stepの入口にある「並列実行 → 振り分け」の重複は共通化しない                             |
| `docs/architecture/adr/0005-sequential-per-app.md`               | アプリ単位は逐次のまま（並列化しない）                                                  |
| `docs/architecture/adr/0006-dry-run-guarded-by-tests.md`         | dry-runは分岐を集約せず、書き込みに到達しないことをテストで守る                         |

### データの受け渡し

| ファイル                                                                 | 判断                                                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `docs/architecture/adr/0007-no-mutable-container-args.md`                | 引数として渡した入れ物が呼び出し先で書き変わる契約にしない                                  |
| `docs/architecture/adr/0008-cached-reads-for-read-only-axis-crossing.md` | 読み取りだけの軸交差は`CachedReads`で暗黙に、副作用を伴う軸交差はstepとして明示的に         |
| `docs/architecture/adr/0009-platform-cache-in-lib-platform.md`           | PlatformAdapterへの問い合わせのキャッシュは`lib/platform/`に列挙し、バッチ単位で1つ持ち回る |
| `docs/architecture/adr/0010-no-function-injection-in-substeps.md`        | サブステップに関数型を注入しない                                                            |
| `docs/architecture/adr/0011-branch-rebuild-in-substep.md`                | ブランチの作り直しはサブステップに置き、`lib/gitlab/`は薄いラッパーに保つ                   |

### 型と命名

| ファイル                                                | 判断                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `docs/architecture/adr/0012-brand-type-criteria.md`     | ブランド型にするのは「同じ`string`の別物と取り違えうる識別子」                      |
| `docs/architecture/adr/0013-brand-field-naming.md`      | ブランド型のフィールド名は、修飾語があれば型の語を落とし、無ければ持つ              |
| `docs/architecture/adr/0014-no-purpose-type-aliases.md` | 用途別の型エイリアスを作らない                                                      |
| `docs/architecture/adr/0015-no-non-empty-array-type.md` | 配列の非空を型で保証するより、生成経路を1つに保つ（`AppUpdatePlan.updates`）        |
| `docs/architecture/adr/0016-one-word-two-meanings.md`   | 1つの語を2つの意味に使ってよいのは、包含する型名・キー名が用途を与える場合だけ      |
| `docs/architecture/adr/0017-validate-not-verify.md`     | 検証の動詞は`validate`に統一し、`verify`は使わない                                  |
| `docs/architecture/adr/0018-steps-kebab-file-names.md`  | `steps/`配下はファイル名＝公開関数名のケバブケース                                  |
| `docs/architecture/adr/0019-lib-platform-api-ts.md`     | `lib/<プラットフォーム>/`はディレクトリ名と同じ名前のファイルを置かず`api.ts`にする |

### ディレクトリ配置

| ファイル                                                        | 判断                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `docs/architecture/adr/0020-lib-gitlab-scope.md`                | `lib/gitlab/` にはGitLabという外部システムを知っているものだけを置く  |
| `docs/architecture/adr/0021-url-as-branded-string.md`           | URLは`URL`オブジェクトではなく文字列のブランド型で扱う                |
| `docs/architecture/adr/0022-substeps-no-cross-import.md`        | サブステップ同士は互いをimportせず、共有物は`sub-steps/shared/`に置く |
| `docs/architecture/adr/0023-existence-check-in-scripts-lint.md` | 実在チェックは`src/lib/`ではなく`scripts/lint/`に置く                 |
| `docs/architecture/adr/0024-platform-adapter-function-table.md` | GitLab/GitHub の2実装は関数テーブル型`PlatformAdapter`で受け渡す      |

### 設定・環境変数・外部形式

| ファイル                                                             | 判断                                                                                |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `docs/architecture/adr/0025-env-loaded-by-load-env-config.md`        | 環境変数はモジュールのトップレベルではなく`loadEnvConfig()`で読む                   |
| `docs/architecture/adr/0026-config-check-shape-and-existence.md`     | 設定ミスの検知は「形」と「実在」で2段に分ける                                       |
| `docs/architecture/adr/0027-config-split-by-scope.md`                | `config/`は「スコープ」で2ファイルに分け、変更頻度では分けない（0034で置き換え）    |
| `docs/architecture/adr/0028-config-unit-scan-no-depth-cutoff.md`     | 設定ユニットの走査は深さで打ち切らず、絞り込みより先に階層を検証する                |
| `docs/architecture/adr/0029-values-yaml-anchor-only.md`              | `values.yaml` の位置指定はYAMLアンカーのみ、YAML処理は `yaml` パッケージ            |
| `docs/architecture/adr/0030-helm-branch-per-config-unit.md`          | Helmの向き先ブランチはapp単位に振り分けず設定ユニット単位で持つ                     |
| `docs/architecture/adr/0031-mr-per-config-unit.md`                   | MRの単位は `(chartリポジトリ, 設定ユニット)`                                        |
| `docs/architecture/adr/0032-platform-env-vars.md`                    | プラットフォームの選択は`PLATFORM`、URLは`GITLAB_URL`/`GITHUB_URL`のまま            |
| `docs/architecture/adr/0033-access-token-per-chart-repo.md`          | アクセストークンはchartリポジトリ単位に宣言し、`ProjectId`で振り分ける              |
| `docs/architecture/adr/0034-config-unit-split-versions-locations.md` | 設定ユニットは`versions.yaml`と`locations.yaml`に分け、appは`projectName`で参照する |

## 既知の制約・注意点

### `CONCURRENCY_LIMIT`はGitLab/GitHub APIへの同時接続数の上限ではない

これは設定ユニット単位の同時処理数であって、その内側に要素数ぶんの`Promise.all`が2箇所ある
（web URLの解決とファイルのコミット）。実効の同時接続数は`CONCURRENCY_LIMIT` × それらの件数。
**`resolveTags`だけは適用する単位が違い**、設定ユニットではなく一意化した最新タグの解決の単位
（`TagSource`）に当たる（1単位につき`getBranchHeadSha`のあとに`listTagsAtCommit`を引く。GitLabでは候補の照合にさらに数本）。
それでも同じ値を使うのは、単位が違っても同時接続数のオーダーは変わらず、運用側のつまみを
2つに増やす理由が無いため。
**現状は絞らない判断**:

- 絞ると`lib/gitlab/`・`lib/github/`に並列度を引き回すことになるが、この層はこのツールの並列度の
  方針を持たない（持たせると原則2の責務からはみ出す）
- レート制限に当たっても429は指数バックオフで再試行され、それでも駄目なら該当する設定ユニットが
  `ERROR`になって次回に持ち越されるだけで、実行全体は壊れない（429はfatal扱いではない）
- 既定値は3で、1設定ユニットあたりのアプリ数も現状は数件。最悪ケースは意図的に上限まで上げたうえで
  巨大な設定ユニットを作らないと起きない
- **再検討のトリガー**: 実行ログに429が継続的に出る、または1設定ユニットのアプリ数が数十になったとき
  （実測でボトルネックになってから動く、という前掲と同じ判断の仕方）

### FatalErrorは後続ステップも止める

`FatalError`（5xx / ネットワーク障害）を検知すると、`utils/parallel.ts`がその時点で並列実行のキューを
クリアし、同じステップ内の他の設定ユニットの未着手タスクを実行させずに reject する。
`runProcess()` はステップを順番に await しているため、あるステップでFatalErrorが起きると
**後続のステップは一切開始されない**。`docs/requirements.md` 4.3節の
「chartリポジトリ間は失敗しても他は継続する」という記述は一般的なエラーを指しており、GitLab側の
障害のような全chart共通の致命的エラーに対しては、無駄なAPI呼び出しを避けるため
この例外を設けている。

**401はもう「全chart共通」ではない。** `registry.yaml`の`accessTokenEnv`で宣言された
トークンの401は、そのchartリポジトリの設定ユニットの`ERROR`に読み替えられて実行は止まらない
（読み替える場所と理由は`docs/architecture/adr/0033-access-token-per-chart-repo.md`）。ここで言う即時終了に当たるのは、トークンに依らない5xx・ネットワーク障害・
タイムアウト。

### その他

- `values.yaml` の書き換えは `yaml` パッケージのDocument（AST）を直接操作する方式のため、
  書き換え対象以外のコメント・クォートスタイルは概ね保持される（完全な保持を保証するもの
  ではない）
- 書き換え対象のスカラーがクォートなしの数値・真偽値に見える値（例: ブランチ名が`2026`だけ）の
  場合、`setValueAtAnchor()`（`src/lib/helm.ts`）で書き戻すとクォートが付く。これは`yaml`
  パッケージが「文字列として代入した値がクォートなしだと再パース時に数値・真偽値へ化ける」
  ケースを検知して自動的にクォートを付ける挙動で、書き込む値は常にHelmが期待する文字列型
  として正しく保存される（誤動作ではない）。読み取り側（`lookupValueAtAnchor()`。
  `getRequiredValueAtAnchor()`もこれを通す）も`String(node.value)`で文字列化しているため、クォートの
  有無に関わらず読み取り値は一貫して文字列になり、読み取り→比較→書き戻しの往復は壊れない
- タグに紐づくGitLabプロジェクトのURLは `Projects.show` で取得している（`config/`が持つのは
  所属グループ（`group`）だけで、プロジェクト自身のpathを持たせていないためURLを組み立てられない。
  GitHubは`repos.get()`の`html_url`で同じ役割を果たす）。
  バッチ1回につきprojectIdごとに1回で、それ以降は`adapter.cached.getProjectWebUrl` が返す
- Helm CLI（`helm lint` / `helm template` 等）は呼び出さない。`values.yaml`のテキスト更新のみ行う
- オープンMRの確認は設定ユニットごとに1回（固定ブランチ名で1件引く）で、同じchartリポジトリを
  共有する設定ユニットの数だけAPIを呼ぶ。プロジェクト単位でオープンMRを1回引いてローカルで
  突き合わせればN→1にできるが、他人のMRが多いプロジェクトではページングのコストが乗るため、
  設定ユニットが増えるまでは割に合わないとして見送っている（ユーザー判断）
- 同じappを別の設定ユニットが**別の追跡ブランチ**で追うと、`TagSource`が分かれるため
  `getBranchHeadSha`と`listTagsAtCommit`を2回ずつ引く（GitHubでは`listTagsAtCommit`がプロジェクト全タグを読む）。影響が小さいので見送っている（ユーザー判断）
- `RENOVATE=true` を持つ pipeline schedule を作っていないため、`renovate` ジョブは一度も動いて
  いない（このCLI自体の依存パッケージ更新が止まっている）。現時点では対応しない（ユーザー判断）

## ディレクトリ構成の勘所

- `config/`: 手書きの設定（対象アプリ登録）。`docs/requirements.md` 4.4節のスキーマに従う。
  CIの`validate-config-remote`が実在チェックの対象にするため、**架空の設定例は置かない**。
  定期実行の登録と、実GitLabインスタンスへの手動スモークテスト用フィクスチャ
  （`docs/smoke-test.md`、`DRY_RUN=true`で使う）を同じディレクトリに同居させている
  （分けない理由は`config/README.md`参照）
- `scripts/lint/validate-config.ts`: `config/` の検証スクリプト。既定はローカルのYAMLのみ
  （`pnpm lint:validate-config`、認証不要なので`pnpm lint`に含まれる）、`--remote` を付けると
  GitLabへ問い合わせて projectId・ブランチ・valuesPath・アンカーの実在も検証する
  （`pnpm lint:validate-config:remote`、CIの`validate-config-remote`ジョブが実行）
- `scripts/lint/remote-existence/`: 上記`--remote`の実装本体。`remote-existence.ts`が実在チェック、
  `remote-cache.ts`がその問い合わせ（project/branch/values.yaml）のキャッシュ層、
  `access-token-groups.ts`が設定ユニットを`accessTokenEnv`でグループ分けする
  （グループごとにクライアントを1つ作って実在チェックするため）。
  ここだけは`scripts/`配下でテストを持つため、`vitest.config.ts`のcoverage対象に含めている
- `scripts/smoke/smoke-fixture.ts`: `config/` を使った実機スモークテストの前準備・後片付け
  （`setup`/`reset`。既定はdry-runで、`--apply`を付けたときだけGitLabに書き込む）。
  既存プロジェクトにしか書かない設計で、プロジェクト作成機能は持たない。
  手順とシナリオは `docs/smoke-test.md`
- `scripts/smoke/provision-group.ts`: パス5（複数グループ）用の2グループ目
  （グループ・chartリポジトリ・ソースリポジトリ・Group Access Token）を新規作成する
  スクリプト。`smoke-fixture.ts`は既存プロジェクトにしか書かない設計のため、グループ・
  プロジェクトの新規作成はここに隔離してあり、対象グループが既に存在すれば何もせず中止する
  （`provision`）。既存グループへのトークン追加発行だけを行う`token`サブコマンドも持つ。
  既定はdry-run。書き込む内容の組み立て（純粋関数）は`group-fixture-content.ts`に分離してあり、
  テストはそこだけ（`test/scripts/smoke/`）
- `dist/`: `pnpm build` の生成物。gitignore対象、手で編集しない
- `docs/requirements.md`: 確定した要件。`docs/history/requirements-grilling.md`: 要件定義時のQ&Aログ
  （検討経緯の参照用、変更不要）。`docs/history/`: 完了タスク・過去セッションのアーカイブと、
  タスク化済みの指示メモの追記ログ（`direction.md`）
