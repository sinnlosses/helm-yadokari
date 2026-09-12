# 指示メモのアーカイブ

`develop/direction.md` に書かれたユーザーからの指示を、タスク化した時点でここへ日付見出し付きで
移す（新しいものを上に足す）。運用の正典は
[`docs/workflow.md`](../workflow.md)「指示メモ（`develop/direction.md`）」。
**当時の記述はそのまま残し、後から書き換えない。**

**このファイルは通読しない**（20KB超）。日付見出しの追記ログなので節の索引は持たない。
過去の指示をたどりたいときだけ、`grep -n '^## '` で日付を選び、その節だけを
`sed -n '/^## 2026-09-08（4回目）/,/^#\{2,4\} /p' docs/history/direction.md` の形で読む。

## 2026-09-12（3回目）

生成したタスク: **T-212**（`README.md` の冗長・不足の洗い出しと提案、`opus`、依存なし）。

指示は1項目で、そのまま1タスクにした。**「精査して提案を出す」までがタスクの範囲**で、
README.md の書き換えは提案の採否をユーザーが決めてから別タスクにする（指示の
「洗い出せたら提案とともに教えて」に合わせた）。タスクにしなかった項目は無し。

着手前の下調べで、指示の前提を崩す事実は見つからなかった（README.md の
`branchToSync`・`mrTargetBranch` はどちらも `src/lib/config/schema.ts` に現存し、
2026-09-12 の改名で古くなった記述ではない）。

- [README.md](http://README.md) で、読む人にとって冗長なものがないか、不足がないか精査して。洗い出せたら提案とともに教えて。

## 2026-09-12（2回目）

生成したタスク: **T-208**（`ConfigDirPath` → `ConfigRootPath` 系5件の改名、`sonnet`、依存なし）、
**T-209**（ルートの `Config` → `LoadedConfig` と型の置き場所の見直し、`opus`、T-208依存）。

「1. `ConfigDirPath` → `ConfigRootPath`」を T-208、「2. ルートの `Config` → `LoadedConfig`」を
T-209 に、指示の項目どおり1対1で割った。両方が `src/lib/config/config.ts` と
`docs/architecture.md:624`（型の件数の行）を触るため、統合はせず `dependencies` で直列にした。
**冒頭の「`ConfigUnit` は現状維持」はタスクにしていない** — 検討の結論（やらない判断）であって
作業ではないため。判断を覆したくなったときの根拠として指示メモ本文に残す。

タスク化にあたっての事実確認:

- **`configRootPath` は T-122 の論点2で候補に挙がり、落とされていた**
  （`docs/history/tasks-archive.md:2162`）。ただし **`configDirPath` を選んだ理由は
  `evidence` に記録されていない**。むしろ T-122 の背景自身が実体を「設定ディレクトリの
  **ルートパス**」と書いており、今回の指摘（`config.yaml` があるディレクトリと読める）は
  T-122 が検討していない論点。据え置きの根拠として効く記録は無いと確認した
- **`docs/architecture.md` の `Config` の扱いは実際に矛盾していた**。272行目は型の置き場所の
  1行目「ドメイン語彙（glossaryに載るかが目安）」の例に挙げ、281行目も意図的に1行目だと
  書いているのに、T-199（`tasks-archive.md:7277`）は技術的な入れ物として
  glossaryに足さないと判断済み。T-209 の論点2に落とした
- **`ConfigDirPath` は `docs/architecture.md` のブランド型の節（613-615行目）で「不変条件を
  型で表す唯一の例外」として名指しされている**。改名は名前の差し替えだけでは済まず、
  この節の記述の確認が要る。T-208 の論点2に落とした
- **改名の規模を実測**: `ConfigDirPath` 系は `src/` 32行・`test/`+`scripts/` 34行・
  `docs/`+`README.md`（history除く）4行。ルートの `Config` は3箇所
- `ConfigUnit` 系の識別子は約831箇所/62ファイルで、直前の T-203 で一括改名した直後。
  現状維持の判断はこの規模も根拠にしている

## 設定まわりの命名を直す（2026-09-12のチャットで合意）

発端: 「`ConfigUnit` の `unit` を外して単に `Config` にできないか」を検討した。結論は
**やらない**。`Config` はルートの型で既に埋まっており、`ConfigUnitPath` → `ConfigPath` は
既存の `ConfigDirPath` とほぼ同語になる。さらに `unit` は「並列処理・MR発行・エラー
ハンドリングの粒度」を表していて、外すと `chartリポジトリ = config` と誤読される。
識別子の出現は約831箇所/62ファイルで、直前のT-203で `ChartAndApps` → `ConfigUnit` に
一括改名したばかりでもある。**`ConfigUnit` は現状維持。**

代わりに、検討の過程で見つかった2件を直す。

### 1. `ConfigDirPath` → `ConfigRootPath`（こちらが本題）

`configDirPath` は「`config/` の最上位」を指しているが、`config.yaml` は設定ユニットの
ディレクトリの中にあるため、**「`config.yaml` があるディレクトリ」とも読めてしまう**。
`ConfigUnit` という語彙に馴染みのない人には区別がつかない。T-122 で `configPath` →
`configDirPath` に改名済みだが、あれは「ファイルかディレクトリか」を解決しただけで、
**「どの階層のディレクトリか」は解決していない**。

| 現在                                                       | 案                         |
| ---------------------------------------------------------- | -------------------------- |
| `ConfigDirPath`（`src/types/brand.ts:88`）                 | `ConfigRootPath`           |
| `toConfigDirPath()`                                        | `toConfigRootPath()`       |
| `configDirPath`（変数・フィールド）                        | `configRootPath`           |
| `DEFAULT_CONFIG_DIR_PATH`（`src/lib/config/config.ts:12`） | `DEFAULT_CONFIG_ROOT_PATH` |
| `parseConfigDirPath()`（`src/lib/env.ts:41`）              | `parseConfigRootPath()`    |

- `Root` はファイルシステムの文脈では階層の頂点＝ディレクトリと読めるので、T-122 が守りたかった
  「ファイルじゃない」も保てる。`Path` 接尾辞は `LocalPath`・`ValuesPath`・`ConfigUnitPath` に揃う
- 環境変数 `CONFIG_PATH` は外部インターフェースなので**変えない**（`src/lib/env.ts` の既存方針どおり）
- **`run_start` のJSONログのフィールド名も `configRootPath` に変える**（`src/main.ts:18`、
  `README.md:154` のサンプル）。ユーザー承認済み
- `src/lib/env.ts:29-35` のJSDocは**理由が変わるので書き直す**。「ディレクトリだと分かる名前」
  ではなく「`config/` の最上位だと分かる名前」が今の理由。T-122 の経緯は `docs/architecture.md` へ
- 規模: `src/` 32行、`test/`+`scripts/` 34行、`docs/`+`README.md`（history除く）4行。
  ドキュメント側は `docs/architecture.md:613,615,624` と `README.md:154`

### 2. ルートの `Config` → `LoadedConfig`

`src/types/types.ts:62` の `Config`（`{ configUnits }` を束ねるだけの型）は名前が漠然としすぎ。
`AppConfig`・`HelmConfig`・`ChartRepoConfig` と並ぶと、総称なのか同列の1つなのか読めない。

- `ConfigRoot` は**採らない**。「ルート」の語はデータ型よりパス側（上記1）が必要としており、
  同じツリーの根を2つの型が名乗ると「パスのほう？データのほう？」が毎回発生する
- `LoadedConfig` なら `loadConfig()` の戻り値だと名前で確定する
- 改名は実質3箇所（`src/types/types.ts:62` の定義、`scripts/lint/validate-config.ts` の
  import と `loadLocally()` の戻り値）。呼び出し側は `src/main.ts:41` も含めて全部その場で
  `{ configUnits }` に分解しているので伝播しない
- **置き場所も見直す**。`docs/architecture.md:272` は型の置き場所の1行目「ドメイン語彙
  （glossaryに載る概念かどうかが目安）」の例に `Config` を挙げているが、
  `docs/history/tasks-archive.md:7277` では「`chartAndAppsList`を束ねるだけ」の技術的な
  入れ物としてglossaryに**足さないと判断済み**。矛盾しているので、`src/types/types.ts` から
  `src/lib/config/config.ts`（`loadConfig()` と同居）へ移し、`docs/architecture.md` の
  272行目・281行目も直す

## 2026-09-12

生成したタスク: **T-198**（用語集から解消済みの経緯を切り離す、`opus`、依存なし）、
**T-199**（`src/types/` と設定スキーマから用語を洗い出し不足を埋める、`sonnet`、T-198依存）、
**T-200**（命名の見直しと改名の要否をユーザーと確定する、`opus`、T-199依存、
**委譲しない・実装はしない**）。

1項目目（整理）を T-198、2項目目を「洗い出し・不足の確認」（T-199）と「命名の再考」（T-200）に
分けた。命名の判断はコード全体に波及しユーザーの採否が要るため、T-132（タグ命名規則の設計）と
同じく「決めるだけで実装しない」タスクにし、採用された改名は T-200 の中で個別タスクとして
登録する形にした。タスクにしなかった項目は無い。

タスク化にあたっての事実確認:

- **経緯を持つ項は7つ**（`registry.yaml / config.yaml`・`設定ユニット`・`chartAndApps`・
  `anchor`・`helm.chart[].anchor`・`固定ブランチ`・`タグ自動作成`）。正典の分担は
  `docs/coding-standards.md` の表で「経緯 → `docs/architecture.md`、用語 → `docs/glossary.md`」
  なので、用語集から経緯を抜く方向は既存の規約と一致する
- **既に事実と違う記述が3つ**。`previousTagRaw`（コードに無い）、`gitlab-watari-dori` の
  「`CLAUDE.md` で言及」（今は `docs/architecture.md` のみ）、「旧 `ChartGroup`」
- **`docs/architecture.md` が「用語集は経緯を長く持つ」と明記している**ため、消すとそこも直す
- **用語集に無いドメイン型が10件、ブランド型が10件**（`ParsedTag`・`TagInfo`・`AnchorTarget`・
  `ImageTagUpdate` など）。用語集の方針「識別子が無い用語は省略」は実態（`ソースリポジトリ`・
  `MR` 等が載っている）と食い違っている
- **命名の論点は6つ**先に見えている。`target` の5義、`branchToSync` の2義、日本語と識別子の
  不一致、`Name` 接尾辞の不揃い、「反映/適用/更新」の混在、`chart` の多義

- glossary.md を整理したい。解消済みの過去のものはキレイに削除して、今の状態をシンプルに見ることができるファイルにしたい。
  - あと、リポジトリ内のドメイン用語を洗い出して不足ないか確認し、本当にその命名でいいか考え直したい

## 2026-09-11（7回目）

生成したタスク: **T-193**（シナリオ設計と `docs/smoke-test.md` の書き換え、`opus`、依存なし、
**委譲しない**）、**T-194**（`smoke-fixture.ts` の拡張、`sonnet`、T-193依存）、
**T-195**（GitLabフィクスチャの実適用、`opus`、T-194依存、**委譲しない・外部書き込み**）、
**T-196**（`config/` への設定追加、`sonnet`、T-195依存）、**T-197**（実機スモーク実行と
期待結果の確定、`opus`、T-196依存、**委譲しない・外部書き込み**）。

方針決め（T-193）を前段に切り出し、**外部書き込みを伴う2件（T-195・T-197）を独立した
タスクに分けて委譲しない扱い**にした。順序は「GitLab側のフィクスチャが先、`config/` への
追加が後」という制約（`config/` に足すと `validate-config-remote` が実在を検証するため）から
決まっており、`dependencies` が一直線に並ぶ。

タスク化にあたっての事実確認:

- **既にカバーされている範囲が思ったより広い。** 同じapp（`sample-qa-sprint`）が3ユニット
  全部に登録されており、キャッシュの収束は既に通っている。深さ1・2の混在、複数app、
  更新不要なappの除外も済み。追加はこれらを避けた
- **ERRORシナリオは `config/` を壊しては作れない。** CIの `validate-config-remote` が
  MR時点で落ちるため、GitLab側を壊す方向に倒した
- **2つ目のchartプロジェクトは手で作る前提**にした。`smoke-fixture.ts` にプロジェクト作成機能を
  足すと、事故時の影響が「既存プロジェクトへの書き込み」より大きくなるため

## スモークテストを包括的なシナリオに拡張する

「スモークテストを複雑にしたバージョンがほしい。よくあるパターンを網羅したい」という指示。
ユーザーは複数chartリポジトリ構成のためのGitLabプロジェクト新規作成も含めて了承している
（ただし**外部への実書き込みは実行直前に改めて確認する**）。

### 既にカバーされているもの（二重投資しない）

`docs/smoke-test.md` と `config/yadokari-smoke-test-chart/` を読んだ結果:

- 深さ1・深さ2の設定ユニット混在、1chartリポジトリに3ユニット
- 1ユニットに複数app、うち更新不要なapp（反映済みタグが追跡ブランチのHEADを指す）がMRから外れる
- image tag更新 ＋ Helm向き先ブランチ更新 / image tagのみ
- **同じapp（`sample-qa-sprint`）が3ユニット全部に登録**されており、
  `createResolveLatestTags()` のキャッシュ収束は既に通っている
- `TARGET_UNITS` 絞り込み、dry-run

### 抜けているパターン（優先度順）

1. **ERROR / PARTIAL_FAILURE**。今のシナリオは正常系だけで、期待する `summary` も
   `{"CREATED":2,"SKIPPED":0,"ERROR":0}` のみ。「該当chartリポジトリだけERRORで処理継続」
   「`RunResult` が `PARTIAL_FAILURE`」「**終了コード1**」（`src/index.ts:8`）が一度も
   実機で通っていない。本番で実際に起きるのはこちら
2. **複数chartリポジトリ**。`tagFormat` の食い違い検証は**chartリポジトリをまたぐときしか
   働かない**（同一chart配下では `registry.yaml` 1つに集約されるため）ので、この経路が実機で
   未実行。MRが別プロジェクトに分かれることの確認も兼ねる
3. **設定の幅**: 1つのappが複数の `valuesPath` に書き込む（今は全部1件）／`branchToSync` が
   複数種類（今は全部 `main`。キャッシュキーが `projectId:branchToSync` なので分岐する経路）／
   `tagFormat` がappごとに違う
4. **SKIPPED を明示的に踏む**。`no_diff` と `mr_exists` は今「繰り返し実行するときの注意」に
   書いてあるだけで、期待結果として通していない
5. **タグ自動作成**（HEADに一致するタグが無いときCLIが作る＝ソースリポジトリへの書き込み）も
   注意書きどまり

### 制約: ERROR シナリオは `config/` を壊して作れない

`config/` に存在しない projectId やアンカーを置くと、**CIの `validate-config-remote` が
MR時点で落ちる**（`.gitlab-ci.yml:132`）。これは意図した設計なので、壊れた設定を
コミットする方向は取らない。代わりに **GitLab側を壊す**（`smoke-fixture.ts` に、
`values.yaml` からアンカーを1つ抜いた状態をシードするモードを足す）。`config/` は正しいまま、
実行時だけ失敗する形にする。`CONFIG_PATH` で別のスクラッチ設定を使う案は、
「実物の `config/` で確かめる」というスモークテストの意味が薄れるため採らない。

### 順序の制約（重要）

**GitLab側のフィクスチャが先、`config/` への追加が後。** `config/` に新しい設定ユニットを
足すと `pnpm lint:validate-config:remote` と CI がその実在を検証するため、
アンカー・ブランチ・プロジェクトがGitLab上に無い状態で設定だけ先にコミットすると落ちる
（T-180 のときと同じ制約）。

### 2つ目のchartリポジトリの用意

`smoke-fixture.ts` にプロジェクト作成機能は足さない（既存のスクリプトは実在プロジェクトへの
ブランチ・ファイル・タグの書き込みだけを行う）。**2つ目のchartプロジェクトは手で作り**、
その projectId を `SMOKE_CHART2_PROJECT_ID` として渡す形にする。既存の
「projectIdは環境変数から読む、ハードコードなし」という方針に揃う。

## 2026-09-11（6回目）

生成したタスク: **T-191**（案2: `resolveProjectLinkage` を `validate.ts` から
`load-chart-and-apps.ts` へ移す、`sonnet`、依存なし）、**T-192**（案3: `buildChartAndApps()` の
6引数をスコープ別の2オブジェクトにまとめる、`sonnet`、T-191依存）。どちらも
`load-chart-and-apps.ts` を触るため、順に実施するよう依存を張った。

タスク化にあたっての事実確認: **案3は当初の根拠が弱くなっていた。** 対象の関数は T-186 で
`loadChartAndApps()` → `buildChartAndApps()` に改名され**非公開になった**ため、
「隣接する同じ `LocalPath` を取り違えても型エラーにならない」の被害範囲は1ファイルに
閉じている。代わりに「呼び出し側が `ChartUnits` を受け取っているのに、それをバラして
6引数に並べ直している」という別の根拠が見つかったので、そちらを主たる理由として本文に書いた。
案2の前提（呼び出し元が1箇所だけ）は変わらず成立していた。

## `src/lib/config/` の積み残し2件（案2・案3）をやる

`src/lib/config/` のリファクタリング相談（2026-09-11の1回目）で提案したが見送っていた2案を、
ユーザー判断で着手する。**どちらも T-184〜T-186 より前の提案なので、現物と突き合わせて
前提を確認した**結果は以下。

### 案2: `resolveProjectLinkage` を `validate.ts` → `load-chart-and-apps.ts` へ移す

**前提は生きている。** `resolveProjectLinkage()` と型 `LinkedApp` は `src/lib/config/validate.ts`
にあり、呼び出し元は `src/lib/config/load-chart-and-apps.ts:67` の**1箇所だけ**。

移す理由は、この関数が名前に反して**検証ではなく結合**だから（JSDocにも「検証だけして捨てるの
ではなく組を返すのは、呼び出し元が同じ突き合わせをもう一度やらずに済ませるため」と書いてある）。
`load-chart-and-apps.ts` はまさに「2つのYAMLを読んで `projectId` で結合する」担当なので、
そこへ移せば `validate.ts` が「設定ミスの検知」だけになり、ファイル名と中身が一致する。
`LinkedApp` の `export` も落とせる。

### 案3: `buildChartAndApps()` の6引数をスコープ別の2オブジェクトにまとめる

**前提が1つ弱くなっている。** 当初は公開関数 `loadChartAndApps()` の6引数を対象にしていたが、
T-186 で **`buildChartAndApps()` へ改名され、非公開になった**（呼び出し元は同じファイル内の
1箇所だけ）。当初の理由「`configYamlPath` と `registryYamlPath` が隣接する同じ `LocalPath` で、
取り違えても型エラーにならない」は今も成り立つが、**被害範囲は1ファイル内に閉じている**。

代わりに**新しい根拠**が見つかった。呼び出し側 `loadChartAndApps(chartUnits)` は構造体
`ChartUnits` を受け取っているのに、それをバラして6つの引数に並べ直して渡している
（`chartUnits.chartDirName` と `chartUnits.chartDirPath` を展開している）。
まとめ直す理由としてはこちらのほうが強い。

まとめ方は、このリポジトリの正典にある「値が何の単位で決まるかで分ける」軸に合わせる:

```ts
buildChartAndApps(
  { chartDirName, chart, appSpecs, registryYamlPath }, // chartリポジトリ単位
  { unitPath, configYamlPath }, // 設定ユニット単位
)
```

### 制約（両案共通）

- **振る舞いは一切変えない。エラーメッセージの文言も変えない**
  （`test/lib/config/config.test.ts` に `toThrow` が23件ある）
- `test/` からこの2ファイルへの直接の参照はゼロ（`loadConfig()` 経由のみ）なので、
  テストの書き換えは発生しない見込み
- 2案は独立しているが**どちらも `load-chart-and-apps.ts` を触る**ため、順に実施する

## 2026-09-11（5回目）

生成したタスク: **T-187**（コメント規約の調査と正典の書き換え、`opus`、依存なし、**委譲しない**）、
**T-188**（`src/lib/` へ適用、`sonnet`、T-187依存）、**T-189**（`src/steps/` へ適用、`sonnet`、
T-187依存）、**T-190**（`src/domain/`・`src/types/`・`src/utils/`・`scripts/` へ適用、`sonnet`、
T-187依存）。方針決めを前段に切り出し、適用3件を `dependencies` で後ろに置いた。

タスク化にあたっての事実確認:

- **ルールが無いのではない。** `docs/coding-standards.md`「コメント」節が既に
  「コードから読み取れないことだけを書く」「型名・関数名の言い換えは書かない」
  「長さではなく種類で決める」と定めている。守られていないか、ルールが足りないかのどちらか。
  この節は「制約・前提は**必要なだけ長くてよい**」とも明示しており、今回の要望と衝突しうるため
  T-187 の論点に入れた
- **実測**: `src/` のコメントは 824/3194行 = 26%（`scripts/` 20%、`test/` 3%）。
  `test/` は問題になっていないため T-190 の対象外とした
- **名指しされた `loadConfig()` は本体9行に対しJSDoc 13行**。T-184/T-185 で本体が段の並びに
  なった結果、JSDocの一部が本体の写しになっている
- **腐った実例**: T-186 の受け入れで見つかった `schema.ts` の「`config.ts`から参照する」は、
  T-185 の時点で既に事実と違っていた

- リポジトリ全域についてコメントが詳細な実装を書きすぎてメンテコストが大きいんじゃないかな?例えば config.ts の loadConfig とか。本当にその情報がないとわからない?概要と Why、Why Not を書くのは必要だと思うけど、プロフェッショナルなコメントの書き方を調べてリファクタリングしてくれる?

## 2026-09-11（4回目）

生成したタスク: **T-186**（`src/lib/config/` の3ファイルを、何をするか分かる名前に改名する、
`sonnet`、依存なし）。

命名の検討は会話の中で2度差し戻されている。1度目は `scan-chart-dir.ts` / `config-target.ts` /
`load-chart-and-apps.ts` を提案したが、**`config-target` は名詞で何をするか言えていない**、
**「走査」は機構であって結果を言っていない**というユーザー指摘を受けて取り下げ、
`find-config-units.ts` / `limit-to-target.ts` に改めた。下のメモは差し戻し後の最終案。

## `src/lib/config/` の3ファイルを、何をするか分かる名前に改名する

「`chart-and-apps` / `select-units` / `unit-scan` はファイル名から何をするのか分かりづらい」という
指摘。実物と突き合わせたところ、**3つとも名前が中身を説明できていなかった**:

- `unit-scan.ts` — 公開関数は `scanChartDir()`。**ファイル名は「unit」、関数名は「chartDir」**で
  語が食い違い、名前から関数にたどり着けない。加えて「走査」は木を降りる**やり方**の話で、
  欲しい結果（設定ユニットがどこにあるか）を言っていない
- `select-units.ts` — 公開は `selectChartDirs` / `selectTargetUnits` / `assertTargetMatched` の3つ。
  **名前は「units を select」だが、実際は chartDirs も select し、0件検出もする**。中身の
  3分の1しか説明していない
- `chart-and-apps.ts` — **動詞がない**。名詞対でデータの入れ物のように読めるが、実際は
  「2つのYAMLを読んで `projectId` で結合する」という動作

**改名の指針は「機構ではなく、何が手に入るか」**。`src/steps/` が既に
「ファイル名＝公開関数名のケバブケースで動詞始まり」（`filter-targets.ts`→`filterTargets()`、
`build-plans.ts`、`resolve-latest-tags.ts` 等）で統一されている前例に合わせる。

改名:

| 現在                | 新                       | 関数の改名                                                                                       |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------ |
| `unit-scan.ts`      | `find-config-units.ts`   | `scanChartDir()` → `findConfigUnits()`                                                           |
| `select-units.ts`   | `limit-to-target.ts`     | 関数名はそのまま                                                                                 |
| `chart-and-apps.ts` | `load-chart-and-apps.ts` | 公開 `loadUnitChartAndApps()` → `loadChartAndApps()`、今その名前の非公開 → `buildChartAndApps()` |

補足:

- `find-config-units.ts` の「設定ユニット」は `docs/glossary.md` の確立した語彙
  （`ConfigUnitPath` / `src/domain/config-unit.ts`）に合わせたもの
- `limit-to-target.ts` は公開関数が3つあるが**動詞名でよい**。`config/validate.ts` が既に
  「動詞名で複数の検証関数を持つ」形の前例になっている。当初 `config-target.ts` を検討したが、
  **名詞では何をするか言えない**というユーザー指摘で取り下げた
- **`filter-targets` は使えない**。`src/steps/filter-targets/` が「GitLab上で更新対象のchartを
  絞る」という別の意味で既に取っており、1つの語を2つの意味に使うことになる

改名後の `ls src/lib/config/`（上から `loadConfig()` のパイプライン順）:

```
config.ts               入口
limit-to-target.ts      TARGET_* で処理対象を限定する
find-config-units.ts    設定ユニットを見つける
load-chart-and-apps.ts  2つのYAMLを読んで結合する
schema.ts               スキーマ
validate.ts             設定ミスを検証する
```

正典側の対応:

- `docs/architecture.md` の**「`lib/config/chart-and-apps.ts`（ファイル名）→ 変えない」の行を
  書き換える**（812行目付近）。当時の理由は「YAMLのファイル名が `registry.yaml` に変わっても
  コード側は追随しない」で、今回の「動詞が無くて何をするか読めない」とは別の論点。
  **矛盾を残さないよう、新しい理由で書き換える**
- 旧ファイル名の参照は `docs/` に8箇所（`architecture.md` 6・`coding-standards.md` 1 ほか）。
  `docs/history/` の48箇所は**当時の記述として書き換えない**
- コード側の参照は `src/lib/config/` 内のみ。`test/` と `scripts/` からの参照は**ゼロ**なので、
  テストの書き換えは発生しない見込み

## 2026-09-11（3回目）

生成したタスク: **T-185**（`scanChartDir()` を `unit-scan.ts` へ、`TARGET_*` の解釈を
`select-units.ts` へ移して `config.ts` を入口だけにする、`sonnet`、依存なし）。

実装時の論点として残していた `ConfigTarget` / `NO_TARGET` の置き場所は、**`select-units.ts` へ
移す**方に決めてタスク本文に書いた（`ConfigTarget` が表しているのは `TARGET_*` そのもので、
型の置き場所は構成で決める＝CLAUDE.md 原則5）。これにより `config.ts` に残るのは
`DEFAULT_CONFIG_DIR_PATH` と `loadConfig()` だけになる。

## `config.ts` を本当に入口だけにする（前回見送った案Bの採用）

「`config.ts` が入口なのに大きすぎる」という指摘。T-184 の結果、`loadConfig()` の本体は9行に
なったが、**ファイル自体は138行→140行と増えていた**。数えると中身は3グループ:

- 公開APIの表面（`DEFAULT_CONFIG_DIR_PATH` / `ConfigTarget` / `NO_TARGET` / `loadConfig`）— 約40行
- **`TARGET_*` の解釈**（`selectChartDirs` / `selectTargetUnits` / `assertTargetMatched` /
  `isExplicitlyTargeted` / `formatChartDirs`）— **非公開ヘルパー6つ中5つ、約65行**
- 走査の呼び出し（`scanChartDir`）— 約11行

つまり入口を名乗るファイルの約7割が `TARGET_*` の解釈だった。

**これは T-184 をタスク化した時点の判断ミス。** 案B（`select-units.ts` の新設）を
「ファイルを増やしたくない」という理由で見送るよう勧めたが、`TARGET_*` の解釈は入口の都合では
なくそれ自体が1つの塊で、ファイル数を守った代償が140行の入口では割に合わない。案Bを採用する。

やること:

1. **`scanChartDir()` を `unit-scan.ts` へ移す**。`registry.yaml` の有無を見て `findUnitPaths()` を
   呼び `ChartUnits` を作る、走査そのもの。**`ChartUnits` 型も生産側であるこちらへ移す**
   （T-184 で消費側の `chart-and-apps.ts` に置いたが、`scanChartDir` が来るならこちらが生産側）
2. **`TARGET_*` の解釈5つを `select-units.ts`（新設）へ移す**

想定する結果: `config.ts` 約45行 / `select-units.ts` 約75行 / `unit-scan.ts` 約92行。
`chart-and-apps.ts` / `schema.ts` / `validate.ts` は据え置き。ファイルは5→6に増えるが、
**6つ全部が「パイプラインのどの段か」で説明できる**状態になる。

根拠は `docs/architecture.md`「1ファイルにまとめるか分けるか」の**分ける合図**①（責務を
「入口と `TARGET_*` の解釈と走査の呼び出し」でしか説明できない）と③（非公開ヘルパーが
2グループに割れている）。**⑤（200行超）は該当しない**（140行）ので、行数は分ける理由ではない。

**相談中に出た提案の撤回**: 「`ConfigTarget` の `export` が誰にも使われていない（`main.ts` も
`scripts/lint/validate-config.ts` もオブジェクトリテラルを直接渡している）ので `export` を
外せる」と提案したが、**この分割とは両立しない**。`select-units.ts` が `ConfigTarget` を引数の
型に使うため、`export` は必要になる。代わりに **`ConfigTarget` と `NO_TARGET` ごと
`select-units.ts` へ移す**ほうが筋が良い（型の置き場所は構成で決める＝原則5。`ConfigTarget` が
表しているのは `TARGET_*` そのもの）。そうすると `config.ts` はさらに薄くなる。
最終的にどちらを採るかは実装時の論点として残す。

## 2026-09-11（2回目）

生成したタスク: **T-184**（`loadConfig()` を段の並びに組み替え、`listUnitChartAndApps()` を
`chart-and-apps.ts` へ移す、`sonnet`、依存なし）。見送った案Bはタスク化していない。

タスク化にあたって、`docs/architecture.md`「設定ユニットの走査は深さで打ち切らず、絞り込みより
先に階層を検証する」を確認し、**走査の順序を変えないこと**（`TARGET_CHART` で絞り込んだ
chartディレクトリだけを走査する現在の挙動）を T-184 の最重要の落とし穴として本文に明記した。
既存テストでは検出できない違反のため。

## src/lib/config の入口を薄くする（案A: `loadConfig()` を段の並びにする）

「入口を狭くして塊ごとにステップを作りたい。やりたいことに対してファイルが多く感じる
（`schema`・`validate` はまだ分かる）」という相談に対し、2案を提示して**案Aを採用**。

**前提の確認: ファイル数は減らない。** ステップ化しても `src/lib/config/` は5ファイルのまま
（案Bなら6に増える）。「多く感じる」原因はファイル数ではなく、**入口を読んでも全体の流れが
見えないこと**だと整理した。実際、いまの `config.ts` は:

- `TARGET_CHART` / `TARGET_UNITS` の扱いが**4箇所に散っている** — chart絞り込み（`config.ts:56-62`）、
  `TARGET_UNITS` の不一致検証（`:79-86`）、実際のunit絞り込み（`:122`。しかも
  `listUnitChartAndApps()` の中）、0件エラー（`:92`）
- 主役の「YAMLを読んで結合する」が `loadConfig` → `listUnitChartAndApps` → `loadChartAndApps` と
  **2段潜った先**にある
- chartDir → unit → app の3重ループに、読み込みと検証が交互に挟まっている

採用した案A（**新ファイルを作らない**）:

1. `TARGET_*` の解釈を名前の付いた段にまとめ、`loadConfig()` の本体を「段を順に呼ぶだけ」にする
2. `listUnitChartAndApps()` を `config.ts` から `chart-and-apps.ts` へ移す（読み込みと結合は
   そのファイルの責務のため）
3. 0件エラーも絞り込みの一部として段に寄せる

目標の形（名前は実装時に詰める）:

```ts
export function loadConfig(configDirPath: LocalPath, target: ConfigTarget = NO_TARGET): Config {
  assertSafePath(configDirPath, "CONFIG_PATH")
  const chartDirs = selectChartDirs(listSubdirectories(configDirPath), target) // TARGET_CHART
  const chartUnitsList = chartDirs.flatMap((dir) => scanChartDir(configDirPath, dir)) // 走査＋階層検証
  const selected = selectTargetUnits(chartUnitsList, target) // TARGET_UNITS
  const chartAndAppsList = selected.flatMap(loadUnitChartAndApps) // 読み込み＋結合
  validateTagFormatConsistency(chartAndAppsList) // 横断検証
  assertTargetMatched(target, chartAndAppsList) // 0件エラー
  return { chartAndAppsList }
}
```

**相談中に判明した制約（当初案の訂正）**: 当初は「`TARGET_*` の解釈を `selectTargetUnits()`
**1関数**に集約する」と書いたが、これは成立しない。`docs/architecture.md`「設定ユニットの走査は
深さで打ち切らず、絞り込みより先に階層を検証する」が、階層の検証は `TARGET_UNITS` の絞り込み
**より前**・`config.yaml` の読み込みは**より後**と意図的に分けており、`TARGET_CHART` は走査
そのものより前に効いている（無関係なchartの設定ミスで限定実行を止めないため）。よって
`TARGET_CHART`（走査前）と `TARGET_UNITS`（走査後）は**2つの段に分かれるのが正しい**。
集約先が1つから2つになるだけで、案Aの狙い（入口が流れを語る・ファイルは5のまま）は変わらない。

制約:

- **振る舞いは一切変えない。エラーメッセージの文言も変えない**（`test/lib/config/config.test.ts` に
  `toThrow` が23件ある）。特に、`TARGET_CHART` 指定時に対象外のchartディレクトリを走査しない
  現在の挙動を変えない（走査してから絞り込む形にすると、無関係なchartの階層エラーで
  限定実行が落ちるようになる）
- `test/` は無変更で通るはず。書き換えが要るなら分け方を疑う
- `unit-scan.ts`（T-183で切り出した走査）はパイプラインの1段目としてそのまま残す。ただし
  `TARGET_*` 側を入口に寄せ直す動きなので、T-183で引いた線の引き直しにはなる

見送った案B: `select-units.ts` を新設して `TARGET_*` を丸ごと別ファイルにする。`config.ts` は
30行ほどになるが**ファイルが6に増える**。`TARGET_*` の解釈は入口の都合そのものなので、入口
ファイルに残るほうが自然と判断した。

## 2026-09-11

生成したタスク: **T-183**（`src/lib/config/config.ts` から走査を `unit-scan.ts` へ切り出す、
`sonnet`、依存なし）。見送った案2・案3はタスク化していない（ユーザーが案1のみを選択したため。
必要になった時点で改めて提案する）。`loadConfig()` のエラーメッセージが環境変数名を直書きしている
件も、既存の `assertSafePath(configDirPath, "CONFIG_PATH")` と同じ作法のためタスク化していない。

タスク化にあたっての事実確認で1点訂正が出た: 下記メモの分ける合図 **④「依存が違う（走査側だけが
`node:fs` と再帰I/Oを持つ）」は成立しない**。`loadConfig()` 自身も `listSubdirectories()`（58行目）と
`existsSync()`（71行目）を使っており、fs依存は両側にある。該当するのは①②③⑤の4つで、
分割の根拠としてはこれで足りるため案1の採否は変わらない。

## src/lib/config のリファクタリング（案1: `config.ts` を走査と入口＋絞り込みに分ける）

`src/lib/config/` をわかりやすくしたい、という相談に対して3案を提示し、**案1を採用**（案2・案3は
今回は見送り。必要になった時点で改めて提案する）。

採用した案1: `src/lib/config/config.ts`（207行）から**設定ユニットの走査と階層の検証**を
`src/lib/config/unit-scan.ts`（仮名。公開は `findUnitPaths()` 1つ）へ切り出し、`config.ts` は
「公開API `loadConfig()` ＋ `ConfigTarget` による絞り込み」だけにする。

根拠（`docs/architecture.md`「1ファイルにまとめるか分けるか」の**分ける合図**が5つとも該当）:

1. 責務を「走査**と**絞り込み」でしか説明できない（`docs/architecture.md` の責務表の記述自体が
   その形になっている）
2. 変更理由が別（階層ルールの変更 vs `TARGET_CHART`/`TARGET_UNITS` の仕様変更）
3. 非公開ヘルパーが2グループに割れている — 走査側は `findUnitPaths` / `collectUnitSegments` /
   `findNestedPair` / `isPrefixOf`、絞り込み側は `formatChartDirs` / `isExplicitlyTargeted`
4. 依存が違う（走査側だけが `node:fs` と再帰I/Oを持つ）
5. 200行超

前提・制約:

- `listUnitChartAndApps()` は走査ではなく「絞り込み＋`registry.yaml`の読み込み」なので `config.ts` 側に残す
- 分割後の行数の目安は `config.ts` 約120行・`unit-scan.ts` 約70行
- テストは4ファイルとも `loadConfig()` 経由でしか触っていない（`validate.test.ts` すら
  `loadConfig` しか import していない）ため、**テストの書き換えは発生しない見込み**。
  発生するなら分割の仕方を疑う
- 併せて `docs/architecture.md`「各ファイルの責務」の `src/lib/` の表に `config/unit-scan.ts` の
  行を足し、`config/config.ts` の行から走査の記述を外す

見送った案（今回はやらない）:

- 案2: `resolveProjectLinkage` を `validate.ts` → `chart-and-apps.ts` へ移す（結合であって検証ではない）
- 案3: `loadChartAndApps()` の6引数をスコープ別の2オブジェクトにまとめる（`configYamlPath` と
  `registryYamlPath` が同じ `LocalPath` で隣接しており取り違えても型エラーにならない）

会話中に気づいた別件（未タスク化）: `loadConfig()` のエラーメッセージが `TARGET_CHART` /
`TARGET_UNITS` という環境変数名を直書きしていて、`lib/config` が `lib/env` の語彙を知っている。
ただし `assertSafePath(configDirPath, "CONFIG_PATH")` も同じ形で既存の作法になっているため、
直すかどうかは別途相談。

## 2026-09-10（3回目・会話中の指示）

`develop/direction.md` を経由せず、会話の中で出た指示。**生成したタスク: T-180**
（`config.yaml` の `helm` を必須にする、`opus`、依存なし）。

発端は「なぜ `ConfigYamlSchema` の `helm` は optional なの? 設定値はだいたいすべて必須だと
思うけど」という問い。当初は「`helm` は機能のオン/オフのスイッチで、オフを表す値が存在しない
から optional」と回答したが、ユーザーから**前提そのものの確認**があった:

> 2ブランチ構成なのは前提で、chart は apps というパラメータを定義するブランチと
> helm という apps を流し込んで k8s のリソースを構築するブランチで構成されます。
> なのでunitごとにアンカーを2つ指定するのは当然だよ。

この前提が確定したことで「省略できる」設計の根拠が消えたため、必須化をタスクにした。
**着手にはGitLab側のフィクスチャ（`yadokari-smoke-test-chart` の2つの values.yaml）への
アンカー追加が先に要る**（外部書き込みなのでユーザー承認が必要）。

会話の中で判明した事実の訂正も記録しておく: 「実 `config/` の3件中1件しか `helm` を
使っていない」ことを optional の根拠として挙げたが、**`config/` に登録されているのは
スモークテスト用フィクスチャだけで本番のchartリポジトリは0件**であり、この数字は
運用実態の裏付けにならなかった。

## 2026-09-10（2回目）

生成したタスク: **T-175**（アクセストークンがログに出うる経路の確認とマスクの隙間塞ぎ、`sonnet`、依存なし）、
**T-176**（`outcome`/`result` の使い分けを決めて正典に反映、`opus`、依存なし）、
**T-177**（決めた命名を実装・ドキュメントへ反映、`sonnet`、T-176依存）、
**T-178**（HTTPエラー処理の実装を1つの資料にまとめる、`opus`、依存なし）、
**T-179**（索引が無いドキュメントへの索引付与、`sonnet`、T-178依存）。
タスクにしなかった項目は無い（4項目すべてをタスクにした）。

2件目の「outcome ではなく result を使う」は、裏取りの結果 **`result` が既に3つの意味で
使われている**ことが分かった（`ChartUpdateResult` = CREATED/SKIPPED/ERROR、JSONログの
フィールド名 `result`、`StepOutcome` の `settled` 側のフィールド名）。そのまま改名すると
`StepResult` の中に `result` が入り、`docs/architecture.md`「1つの語を2つの意味に使わない」と
衝突するため、**衝突の解き方を決める T-176 を前段に置き、機械的な反映を T-177 に分けた**
（T-172/T-173 と同じ形）。

1件目のマスクは、`src/utils/logger.ts` に `redact()` が既にあり大半は塞がれていたが、
キー名の完全一致判定のため **`accessToken`（camelCase）だけが素通りする**。現時点の
呼び出し元は誰もトークンを渡していないので、「今は漏れない」と確認して閉じる逃げ道を
タスクに明記した。

3件目の資料は、`README.md`・`docs/architecture.md`・`docs/coding-standards.md`・
コード内コメントの4箇所に分散していることを確認。集約先を決める判断を含むため `opus`。
4件目の索引は、既に4ファイルが「節の索引」形式を持っており、それに揃える形にした
（新設ドキュメントも対象にするため T-178 依存）。

- アクセストークンはシークレットなので文字列として出力されないようにマスクされているか確認し、必要であればマスクするタスクを積むこと
- step-outcome.ts を見てて思ったこととして、outcome よりは result のほうが馴染みがあるんだけどどうかな?step-result、その他 outcome ではなく result を使う
- http 周りのエラーが複雑になってきたけど今の実装がまとまった資料ある?なければ作ってほしいな
- 各ドキュメントに目次とかあると見やすいんだけどな。ないドキュメントに付与してくれる?

## 2026-09-10

生成したタスク: **T-172**（`validate`/`verify` の使い分けを決めて正典に反映、`opus`、依存なし）、
**T-173**（決めた命名を実装・CI・ドキュメントへ反映、`sonnet`、T-172依存）、
**T-174**（`stageHelmTargetBranchUpdates()` への `BranchExists` 注入の要否、`opus`、依存なし）。
タスクにしなかった項目は無い。

1件目は「改名するか、正典への導線を足すだけにするか」から判断が要り、改名すると
`package.json` のスクリプト名と `.gitlab-ci.yml` のジョブ名という外部インターフェースに
波及するため、決定（T-172）と追随（T-173）に分けた。2件目は指摘が事実であることを
確認済みで、**正典（`BranchExists` のJSDocと `docs/architecture.md` の該当節）が
「キャッシュを隠す」と説明しているのに、同じ関数が `source` 経由でキャッシュを受け取っている**
という食い違いも見つかったため、実装を変えない結論でも正典の修正は必須にしてある。

なお指示メモの `lib/config.validate.ts` は実際には `src/lib/config/validate.ts`（表記ゆれ）。

- verify-config.ts と validate-config.ts があって違いがわからない。lib/config.validate.ts もあって何がなんだか...改善してくれるかな。
- stageHelmTargetBranchUpdates に branchExists を渡していますが、source に gitlabCache も渡してるよね? branchExists を渡す必要ある?あまりキレイに見えず。

## 2026-09-09（3回目）

生成したタスク: **T-171**（429/502 のリトライが二重にかかっている件、`opus`、依存なし）。
タスクにしなかった項目は無い。ユーザーは提示した3案（実装＋正典の修正 / 正典だけ / 何もしない）の
うち1番目を選んだため、**実装の変更まで含めて検討するタスク**にしてある（ただしタスク側には
「実測の結果、実装は変えず正典だけ直す」で閉じる逃げ道を残した）。

## 429/502 のリトライが二重になっていて、効くほうが動いていない

T-159〜T-162 の作業中に gitbeaker のソースを読んで見つけた。**タスク1件として起こす**
（ユーザー判断、2026-09-09。選択肢は「実装＋正典の修正」「正典だけ」「何もしない」の3つで、
1番目を選択）。

- `@gitbeaker/rest` の `defaultRequestHandler` は `retryCodes = [429, 502]` を**内部で最大10回**
  リトライする。バックオフは `await delay(2 ** i * 0.25)` で、`function delay(ms)` は
  **ミリ秒**なので合計 255.75ms。つまり0.26秒のあいだに10連射しているだけで、
  レート制限（`Retry-After` は秒〜分単位）に対しては意味がない
- 使い切ると `GitbeakerRetryError` を投げる。このエラーは message だけで `cause` を持たないため、
  `src/utils/retry.ts` の `isRetryable()` は `extractHttpStatus()` から `undefined` を受け取り
  **false** を返す。結果、**本物の指数バックオフ（1s→2s→4s）を持つ自前のリトライが
  429/502 で一度も動かない**
- 503/504 は gitbeaker の `retryCodes` に入っておらず `throwFailedRequestError()` が
  `cause.response.status` を立てるので、自前のリトライが設計どおり効く
- `isFatalError(GitbeakerRetryError)` は false なので、該当設定ユニットが ERROR になり処理継続
- **`README.md` の「429 / 502 / 503 / 504 → 指数バックオフで最大3回リトライ」は
  429と502について事実と違う**

実害の大きさ: 毎日1回・3設定ユニットの定期実行なので429を踏む頻度は低い。「実装は変えず
正典だけ直す」も正当な結論になりうる。

補足: 当初「5分のタイムアウト（T-159）に当たるのでは」と述べたが**誤り**。合計0.26秒しか
待たないので当たらない。

## 2026-09-09（2回目）

生成したタスク: **T-158**（`isFatalError()` がネットワーク障害を検出できない件、`opus`）、
**T-159**（HTTPタイムアウト方針の決定、`opus`）、**T-160**（未使用の `logger.warn` の存否、`sonnet`）、
**T-161**（tsconfig のフラグ追加、`sonnet`）、**T-162**（ログのフィールドの型付け、`opus`、T-161依存）、
**T-163**（`cacheByArgs()` を `utils/` へ、`sonnet`）、**T-164**（`[] as string[]` の除去、`haiku`）、
**T-165**（設定ユニットの位置表示の一本化、`sonnet`）、**T-166**（config/ のファイル名リテラルの定数化、`sonnet`）、
**T-167**（タグ名内のブランチ名表現の一本化、`haiku`）、**T-168**（`duration_ms` の命名、`sonnet`）、
**T-169**（数値スカラーのクォート化、`sonnet`）、**T-170**（`helm.ts` のアンカー不在まわりのエラー表現、`sonnet`）。
E2 と E3 は同じ `src/lib/helm.ts` の同じ不変条件を扱うため T-170 に統合した。それ以外は
ユーザーの「1つ1つ判断しながら解きたい」という希望に沿って A1〜E1 を1項目=1タスクで分けている。
「調べたうえで『出さない』と決めたもの」の6項目は、正典に既に判断があるためタスクにしていない。

## ソースコード全体の棚卸し（アーキテクチャ・保守性・拡張性・可読性・型安全）

`src/` と `scripts/` の全44ファイル（3,377行）を読んで改善点を洗い出した。**正典の修正も
検討対象に含める。** ユーザーの希望は「1つ1つ判断しながら解きたい」ので、**項目ごとに
個別のタスクへ分ける**（まとめて1タスクにしない）。

各項目は洗い出し時にコマンドで裏を取ってある。ベースラインは `pnpm check` 通過・
32ファイル359テスト。

### A. 実装が正典の約束を守れていない

- **A1. `isFatalError()` がネットワーク障害を検出できていない。** `src/utils/http.ts:26` は
  エラー自身の `code` を見ているが、gitbeaker が使う undici の `fetch` は
  `TypeError: fetch failed` を投げ、`ECONNREFUSED`/`ENOTFOUND` は `cause.code` に入る。
  実測（gitbeaker 経由で存在しないホストへ `Projects.show`）で `isFatalError: false` を確認。
  `README.md`「エラーハンドリング」表・`CLAUDE.md`・`docs/coding-standards.md`
  「エラーハンドリング」の3箇所が「ネットワーク障害は即時終了」と書いているのに効いていない。
  `test/utils/http.test.ts:80` が実在しない平たい形（`Object.assign(new Error, {code})`）を
  検証しているためテストは緑のまま。
- **A2. HTTPリクエストにタイムアウトが無い。** `ETIMEDOUT` を fatal に数える設計なのに、
  `fetch` に既定タイムアウトは無く gitbeaker にも渡していない。`docs/requirements.md`・
  `docs/architecture.md`・`README.md` にタイムアウトの記述は0件で、方針そのものが未定。

### B. 撤回作業の取り残し

- **B1. `logger.warn` が本番コードから0回も呼ばれていない。** `git log -S` で追跡した結果、
  T-134（semver対応）で新設され、T-144 の撤回で唯一の呼び出し元が消えた（T-144 のコミット
  メッセージ自身が「『最新タグが決まらない』undefined 経路と app 単位スキップも消滅した」と
  書いている）。JSDoc の「例: 最新タグが決まらずappを見送った」は今は存在しない挙動の説明で、
  `docs/coding-standards.md`「コメント」に反する。生かしているのは `logger.test.ts` の2件だけ。

### C. 型安全

- **C1. tsconfig に足せるフラグがある。** `npx tsc --noEmit --<flag>` で1つずつ実測した:
  `noUnusedLocals` / `noUnusedParameters` / `exactOptionalPropertyTypes` / `noImplicitOverride` /
  `noFallthroughCasesInSwitch` / `isolatedModules` / `useUnknownInCatchVariables` は
  **エラー0件**。`noImplicitReturns` は1件（`src/lib/helm.ts:64`）。`erasableSyntaxOnly` は
  1件（`errors.ts` の parameter property）で、入れる価値は薄い。
  `exactOptionalPropertyTypes` は「`?:` を使わない」規約を型で機械的に固定でき、
  `noUnusedLocals` は B1 のような撤回残骸を次から自動検出する。
- **C2. ログのフィールドに型が無い。** `Record<string, unknown>` が6ファイル13箇所。`event` 名も、
  3つのstepの引数を貫通する `logContext` も、`describePlan()` の戻り値も全部これ。
  `noPropertyAccessFromIndexSignature` を入れるとテスト側で4件エラーになる（index signature
  越しにログを読んでいる証拠）。`docs/architecture.md`「型の置き場所」の表4行目
  （複数のstepが共有する、ドメイン型にだけ依存する型 → `steps/shared/`）に当てはまる。

### D. 重複・一貫性（片側だけ既に解けている系）

- **D1. `scripts/lint/verify-config/remote-cache.ts` が `batch-cache.ts` の `cacheByArgs()`
  相当を手書きしている。** キー3本を `#` 連結し、箱詰めも手書き。`#` はGitのブランチ名に
  使える文字なので `files` のキーは理屈上衝突しうる（`ref="a#b",path="c"` と
  `ref="a",path="b#c"`）。`batch-cache.ts` は `\0` 区切りで既に解いてある。`cacheByArgs` は
  技術非依存なので `utils/cache.ts` へ上げれば原則2に合うし、`docs/architecture.md` 自身が
  「`utils/cache.ts`に残るのは技術非依存のメモ化」と書いている。
- **D2. `scripts/lint/verify-config/verify-config.ts:98,169` に `[] as string[]` が2箇所。**
  `src` 側の同じ形（`resolve-latest-tags.ts:44`）は
  `const initial: readonly AppWithLatestTag[] = []` で `as` を避けている。同じ手が使えるのに
  片方だけキャストしていて、ついでに `readonly` も落ちている。
- **D3. `${chartDirName}/${unitPath}` の組み立てが3箇所**（`src/lib/config/validate.ts:55`、
  `scripts/lint/verify-config/verify-config.ts:56,76`）。設定ユニットの位置表示という
  ドメイン語彙なので `src/domain/config-unit.ts` に1本置ける。
- **D4. `"registry.yaml"` / `"config.yaml"` のリテラルが散っている**（`src/lib/config/config.ts`
  に5箇所、`chart-and-apps.ts` に1箇所、ほかエラーメッセージ内）。直近の T-157 がまさに
  この改名で25箇所を触った実績がある。
- **D5. `branch.replaceAll("/", "-")` が `src/domain/tag-format.ts` に2箇所**
  （`compileTagPattern` と `fillTagFormat`）。タグ名内でのブランチ名表現という同じ規則で、
  パースと生成の対称性を1関数で担保できる。
- **D6. ログキーで `duration_ms` だけ snake_case**（他は `httpStatus`・`chartDirName`）。
  `README.md:139` に出力例が載っているので、直すなら正典も同時に。

### E. 細かい挙動の穴

- **E1. `setValueAtAnchor()` が数値に見えるスカラーをクォート付きで書き戻す。** 実測で
  `- &ver 20260101` に書き込むと `- &ver "20260102"` になった。イメージタグは `{branch}` 必須
  なので該当しないが、`helm.branchToSync` の向き先ブランチ名が数字だけ（例 `2026`）だと
  values.yaml の差分にクォートが混じる。`docs/architecture.md`「その他」の
  「クォートスタイルは概ね保持」に、この条件が書かれていない。
- **E2. `findAnchorNode` は Scalar しか見ない**ので、アンカーがマップ/シーケンスに付いていると
  「アンカーが見つかりません」と報告する。原因が読み取れないメッセージになる。
- **E3. 「アンカーが無い」という同じ不変条件を `getRequiredValueAtAnchor` と
  `setValueAtAnchor` が別々に投げている**（呼び出し順が固定なので後者は到達しない）。

### 調べたうえで「出さない」と決めたもの（タスクにしない）

正典に既に判断があるものは蒸し返さない。念のため記録だけ残す:

- stepの入口の「並列実行 → 振り分け」の共通化 → `docs/architecture.md` が理由3点つきで却下済み
- `StepOutcome.settled` の SKIPPED/ERROR 分離 → T-151 でユーザー判断により着手しない決定済み
- `env.ts` のテスト専用 export → `docs/coding-standards.md` が例外として明記済み
- `reduceAsync`/`partitionMap` のスプレッド蓄積（O(n^2)）→ 不変性を核の規約にしている方針との
  トレードオフになるので、性能問題が出るまで触らない
- 未到達行3件 → 「埋めない穴」として理由つきで記録済み
- `coverage/` は `.gitignore` 済み（git追跡0件）で問題なし

## 2026-09-09

生成したタスク: **T-156**（正典の先行更新＋コード側識別子の追随範囲の決定、`opus`）、
**T-157**（実装・テスト・実`config/`・残りドキュメントの移行、`sonnet`、T-156依存）。
タスクにしなかった項目は無い。

## config/ のファイル名とキー名を実態に合わせる

`chart.yaml` は「chartだけの設定」ではなくなっており、更新対象のchartの設定と各appの設定の
両方を持っている。加えて `chart.yaml` が `chart:` + `apps:`、`config.yaml` が
`apps[].chart[]` という形で、**同じ2語が入れ子違いで両方のファイルに現れる**ため、
別々のことを定義しているのに鏡写しに見える。ここを解消する。

ユーザーと合意した変更（この3点はもう決まっているので、タスク側で論点にしない）:

- ファイル名 `chart.yaml` → `registry.yaml`
- キー `chart:` → `chartToUpdate:`（更新対象のchartであることを明示。`branchToSync` と同じ
  `XToY` の語形に揃える）
- キー `apps:` → `appSpecs:`（appの変わりにくい設定であることを明示。中身は
  `projectId` / `projectName` / `tagFormat`）

**`config.yaml` は変更しない**（ファイル名・キー名とも据え置き）。`apps[].chart[]` と
`helm.chart[]` も今回は触らない。

選定の過程で落とした案と理由（同じ案を再検討しないため）:

- `targetChart:` は使えない。`envConfig.targetChart`（環境変数 `TARGET_CHART`）が
  「chartディレクトリ名での絞り込み」という別の意味で既に存在する
- `updateTargetChart:` は型 `ChartUpdateTarget`（差分確定後の更新内容）と紛らわしい
- `chart-repo.yaml` / `chart-settings.yaml` は「chartだけの設定」と読めてしまい、
  元の不満がそのまま残る
- `chart-and-apps.yaml` は型 `ChartAndApps` と同名で範囲が違うため、別の混乱を生む
- `appDefaults:` / `appPresets:` は「上書き可能な既定値」と誤読される（実際は必須・上書き不可）

タスク化で決めること:

- コード側の識別子（`ChartYamlSchema`・`ChartApp`・`ChartRepoConfig` など）を
  YAMLキーに追随させるかどうか、させるならどこまで
- 正典（`docs/requirements.md` 4.4節・`docs/architecture.md`・`docs/glossary.md`）を
  先に更新してから移行するか（`tagFormat` の置き場所を変えたときの前例に倣うか）
- 実 `config/` の `chart.yaml` 1ファイルと、`docs/smoke-test.md` の手順の追随

## 2026-09-08（8回目）

生成したタスク: T-153（tagFormat の置き場所と anchors.yaml の新しいファイル名を決め、docs/requirements.md 4.4節を先に更新する）、T-154（決まった形へコード・実config・テスト・ドキュメントを移行する。T-153 に依存）。
**タスクにしなかった項目は無い。** 1指示を「正典の更新」と「実装への反映」の2つに割ったのは、
`docs/requirements.md` 4.4節が自ら「フィールドを追加・変更したときはこの節を先に更新する」と定めているため（既存の手順に沿った分割）。
裏取りで分かったこと3点: (1) この指示は `docs/architecture.md:621`「タグ形式はapp単位に config.yaml へ置く」という既存の設計判断を覆す、
(2) `anchors.yaml` も `config.yaml` と同じ設定ユニット単位のファイルなので、移しても `validateTagFormatConsistency()` が扱うスコープ不一致
（tagFormat はソースリポジトリ単位の性質）は解決しない、(3) 文字列 `anchors.yaml` は history/・dist/・coverage/ を除いて16ファイル106箇所、実ファイルは3つ。

- config.yaml の tagFormat は anchors.yaml に移したい(あまり変更されないから)。あと、tagFormatが加わることで anchors.yaml の名前が実態に合わなくなるから変えてほしいな

## 2026-09-08（7回目）

生成したタスク: T-151（StepOutcome の settled が SKIPPED と ERROR を混ぜている点を解く）、T-152（values-yaml-draft.ts の型と命名の見直し）。
**タスクにしなかった項目は無い。** 1件目は裏取りの結果、指摘どおり `settled` に SKIPPED（settle("SKIPPED") が4箇所）と ERROR（settleAsError() の戻り値）が同居していた。
加えて `settle()` の引数型が `ChartUpdateResult` で `"CREATED"` も受け取れる（実際には渡されない）実態より広い型であることも判明した。
消費側3箇所は両者を区別していないため、3枝に分けるか型を狭めるだけにするかを論点として残した。
2件目は4つのexport型のうち `ValuesYamlEntry` と `DraftValuesYaml` がファイル外で0件、
かつ `ValuesYamlDraft`（下書き本体）と `DraftValuesYaml`（読み込み結果）が語順を入れ替えただけの名前で隣り合っていることを確認した。

- StepOutcome が ok と settled の2種類だけど settled がスキップとエラーの2種あるように見えた。これは本当?本当だとするとそこを分けたほうが結果がわかりやすいんじゃないかと思ったんだけどどうかな
- values-yaml-draft.ts の型がなぜそういう型でまとめたのか、引数がなぜそういう命名なのかなど疑問に思う程度にはわかりづらい印象だった。型をなくす、型にまとめる単位の見直し、命名の見直しで見通しを良くして

## 2026-09-08（6回目）

生成したタスク: T-149（TARGET_UNITS / unitPath の説明文から実在しない具体名を外す）、T-150（ドキュメント整備の定型作業をスキル化する）。
1件目の progress.md の指示は**5回目で T-147・T-148 として登録済み**のため、新規タスクを作らず既存タスクに委ねた（同じ指示が再度書かれていた）。
**タスクにしなかった項目は無い。** 2件目は裏取りの結果 `central`・`tenant1/client1` がどちらも実在せず（実物は `anchor-app`・`tenant2/client1`・`tenant2/client2`）、
`README.md` と `.gitlab-ci.yml` の中で既に `t1/c1` 系の抽象形と混在していることを確認した。3件目は145タスク中10件（T-028・T-029・T-031・T-039・T-057・T-077・T-078・T-128・T-141・T-142）が
同じ形のドキュメント整備であることを確認し、定型化の裏付けとした。

- progress.md がメンテされてなく400行以上ある。タスクのtasks.jsonと一緒にメンテされるような仕組みにしてほしい
- TARGET_UNITS に central とか tenant1/client1 とか、特定の表現はないほうがいい
- docs/ ディレクトリ配下の history/ ディレクトリ配下以外のドキュメントとREADME.mdとCLAUDE.mdをメンテナンスし、冗長な表現、重複、人間にとって読みにくい構造を改善する、という タスクが定型化されつつあるから skills 化してほしい

## 2026-09-08（5回目）

生成したタスク: T-147（progress.md のアーカイブ基準とトリガーを定義し、tasks.json と同じ検査点に組み込む）、T-148（定めた基準で実際にアーカイブする。T-147 に依存）。
**タスクにしなかった項目は無い。** 「400行以上ある」は事実で（455行・42.7KB、うち376行が「完了したこと」）、
規約自体は既に `docs/workflow.md`「progress.md の構成」にあるが実行させる仕組みが tasks.json 側にしか無い、
という切り分けをしたうえで、方針決め（T-147）と適用（T-148）に分けた。

- progress.md がメンテされてなく400行以上ある。タスクのtasks.jsonと一緒にメンテされるような仕組みにしてほしい

## 2026-09-08（4回目）

生成したタスク: T-144（タグ形式の仕様を単純化する。semver廃止・`{time}`必須化・`tagNaming`→`tagFormat`・用語統一を1タスクにまとめた）。
**タスクにしなかった項目は無い。** 指示は `/grilling` セッションで合意した設計そのもので、
決定事項10件と進め方4件を T-144 の1タスクに統合した（分けると正典とコードが食い違う中間状態が
コミットされるため）。

## タグ形式の仕様を見直す（2026-09-08 のgrillingで合意）

タグの仕様を変えたあと、不必要にソースコードが複雑になったと感じている。再度検討したい。

grillingで確定した事実:

- 実物のタグは `{branch}-build-at-{date}-{time}` と `{date}-{time}-{branch}` の2パターン。
  **どちらも3プレースホルダ全部入り**。semverのリポジトリも `{time}` なしのリポジトリも予定にすら無い
- 形式が2種類ある以上、app単位で設定可能にすること自体は正しい（ここは削らない）

決めたこと:

1. `config.yaml` の `apps[].tagNaming`（`mode` 判別共用体）を **`apps[].tagFormat`（文字列・必須）** にする。
   既定値は持たせず、必ず書かせる
2. **semverモードを廃止する**。`mode` 判別共用体ごと畳む
3. **`{time}` を必須に戻す**（`{branch}`/`{date}`/`{time}` の3つとも各1回必須）。
   並び順・区切り文字が自由な自由記述テンプレートは**維持する**（実物2形式が並び順違いのため）
4. タグ自動作成は常に可能に戻る。「最新タグが決まらない」状態とapp単位スキップは消滅する
5. タイブレーク（順序キー同値ならタグ名の降順）は削除。テンプレートがapp単位で固定なら同値は原理的に起きない
6. `ParsedTag.orderKey`（`TagOrderKey`）を **`builtAt: Date`** に戻す。`compareTags()` のexportは消し、
   smokeは `builtAt` の直接比較に戻す。※`builtAt` 自体は残す必要がある。並び順が自由なので
   `v{time}_{branch}__{date}` のような形が書け、タグ名の辞書順と日時順は一致しないため
7. 正典から semver の記述は**完全に消す**（「検討して撤回した」という判断記録も残さない。
   経緯は `docs/history/tasks-archive.md` の T-132・T-134 の evidence に残るのでそこで足りる）
8. 廃止済み環境変数 `TAG_FORMAT` の記述は、**理由は残して識別子名は消す**。
   新キー `tagFormat` と1文字違いで紛らわしいため。「環境変数だとCIの `check` で検証できない」という
   理由自体は今も `config/` に置く根拠なので、識別子名を使わずに残す
9. 用語を「タグ命名規則」→ **「タグ形式」** に統一する。識別子（`tagFormat`/`TagFormat`/
   `tag-format.ts`/`validateTagFormat()`）と1:1に揃える。**コストより正確さを取る**。
   アーカイブ（`docs/history/`・`docs/requirements-grilling.md`）は触らない
10. `config-test/` の5appすべてに `tagFormat` を明示する。**2形式目は入れない**
    （スモークの期待値を同時に動かすとリスク軸が増えるため。並び順違いが動くことは単体テストで固定済み）

進め方:

- **1タスクにまとめる**（コード削除・テスト削除・正典追随・README追随を1コミットで整合させる）。
  分けると正典とコードが食い違う中間状態がコミットされるため
- **`git revert` は使わない**。`882ebec`(T-134) の後に T-138・T-140・T-143 が同じファイルを触っており、
  revertすると残すべきそれらまで巻き戻る
- `validateTagNamingConsistency()` は**残す**（キャッシュ誤共有の防止。比較は文字列比較に単純化）。
  `compileTagPattern()`・`escapeRegExp()` と T-143 の守りテスト6件も**維持**
- `DEFAULT_TAG_TEMPLATE` は既定値でなくなるので `src/` から消す。`test/helpers.ts` と
  `scripts/smoke/smoke-fixture.ts` は自前のリテラルを持つ（テストのためだけのexportをしない規約）

## 2026-09-08（3回目）

生成したタスク: T-132（`{date}`/`{time}` を外したときとsemverの設計を決める。実装しない）/
T-133（タグ命名規則を `config/` で設定できるようにする）/ T-134（semver対応）/ T-135（タグ名の日時をJSTに）。
**タスクにしなかった項目は無い。** ただし1項目め「`{date}`、`{time}`は不要にしよう」は**既存機能と正面衝突する**ため、
そのまま実装するタスクにはせず T-132 の第一の論点にした。`{date}`/`{time}` は (A) HEADを指すタグが複数あるときの
タイブレーク（`findLatestParsedTag()`）(B) **新しいタグ名の一意性**（`buildNewTag()`。`{branch}`だけだと生成名が常に
`main` になり既存タグと衝突して作成できない）(C) スモークのシード判定、の3つの役目を持っており、外すと
「タグ自動作成」（`docs/requirements.md` に明記された機能）が成立しない。semverも同様に、`v1.2.3` には
ブランチ名が入らないため `resolveTrackedHeadTagNames()` の「追跡ブランチ由来」の判定方法そのものが成立しない。
そのため「方針決め（T-132、実装なし）→ 設定の置き場所（T-133）→ semver（T-134）」の直列にした。
4項目め「サポートされていない設定パターンだったらCIで落とす」は**独立したタスクにしていない**。フォーマットを
`config/` に移すと `pnpm lint:validate-config` が `pnpm lint` → `pnpm check` 経由でCIの `check` ジョブに載っており
MR時点でZodスキーマと `validateTagFormat()` が走るため、T-133 の完了条件に畳み込んだ。
JST化（T-135）は他と独立して着手できるので `dependencies` を空にした。

- tag のフォーマットをユーザーが設定できるようにしたい。リポジトリごとにフォーマットが異なりそうなので。
  - 必要なのは一旦追跡ブランチを特定するために必要な情報({branch})だけにして、{date}、{time}は不要にしよう
  - タグは今の仕様に加えて semver に対応できるといいね
  - フォーマットはリポジトリのconfigに設定できるといいかな
  - サポートされていない設定パターンだったらCIで落とすようにしたいな
- tag の日時はJSTがいいな。今はUTCだと思うけど

## 2026-09-08（2回目）

生成したタスク: T-128（要件・用語の正典を「設定ユニット（深さ1〜2）」へ書き換え）/ T-129（コードの語彙を `unitPath` 1本に置換。振る舞い不変）/
T-130（走査を深さ1〜2に拡張し、入れ子を設定エラーに）/ T-131（`config-test/` に深さ1のユニットを作り e2e で混在を守る）。
**タスクにしなかった項目は無い**（1項目の指示で、設計判断4点はセッション内の対話で確定させたうえで4タスクに分割した）。
分割の方針は「正典を先に確定 → 振る舞いを変えない語彙置換 → 振る舞いを変える階層拡張 → 実ファイルのフィクスチャ」で、
**振る舞い不変のリファクタ（T-129）と振る舞いの変更（T-130）を分けてある**（前者は既存テストが全部通ることで守られるため）。

## テナント/クライアント2階層固定の廃止 → 「設定ユニット」への抽象化

ユーザーの原文:

> 1つ重要な要件変更をお願いしたい。README.md に「ディレクトリ階層は常に
> `<chartリポジトリ>/<tenantId>/<clientId>/` の2階層で固定です。テナント分けが不要な場合も
> ダミーの1つの tenantId/clientId ディレクトリ配下に置いてください。」とあるけど、これを
> 抽象化してテナント分けが不要なもの(例えば `<chartリポジトリ>/central/apps.yaml`) など
> chartリポジトリ配下すべてに対応することはできるかな? 変更範囲はかなり広いと思う。

### 確定した設計判断（このセッションでユーザーが選択）

1. **深さは1〜2に限定**。`<chart>/central/config.yaml`（深さ1）と
   `<chart>/tenant1/client1/config.yaml`（深さ2）の両方を許す。深さ0（`chart.yaml` と同階層に
   `config.yaml`）は不可、深さ3以上も不可
2. **入れ子は設定エラーで停止**。走査は `config.yaml` を見つけた時点でそれ以上降りるのを
   やめ、その配下にさらに `config.yaml` があれば起動時に例外を投げる
   （理由: Git の ref は D/F conflict を起こすため、`feature/yadokari/central` と
   `feature/yadokari/central/sub` は同一リポジトリに共存できない。入れ子禁止がこの制約を
   完全にカバーする ─ D/F conflict はパスがプレフィックス関係のときしか起きないため）
3. **後方互換は取らない**（新名称に統一）。ログの `tenantId`/`clientId` は廃止して1本化、
   環境変数 `TARGET_CLIENTS` も改名する。チーム内限定ツールなので破壊的変更を許容し、
   コードに条件分岐を残さないことを優先する
4. **新しい語彙は「設定ユニット」/ `configUnit`**（`updateUnit`・`scope` 案は不採用。
   前者は既存の `ChartUpdateTarget`/`ChartUpdateResult`/`AppUpdatePlan` の "Update" と
   衝突し、後者は `ACCESS_TOKEN` のスコープと衝突するため）
   - 型: `ConfigUnitPath`（ブランド型。値は `"central"` も `"tenant1/client1"` も取る）
   - フィールド: `ChartAndApps.unitPath`（`tenantId`/`clientId` を置き換える）
   - ログ: `{"chartDirName":"teamA-chart","unitPath":"central",...}`
   - 環境変数: `TARGET_UNITS="central,tenant2/client1"`
   - ブランチ: `feature/yadokari/<unitPath>`（深さ2のとき既存の文字列と完全一致するため、
     既存のオープンMR・ブランチは迷子にならない）
   - ファイル: `src/domain/client-ref.ts` → `src/domain/config-unit.ts` に改名。
     `formatClientRef`/`parseClientRef` は「相対パスの検証・正規化」に役割が変わる
     （深さ1〜2チェック、空セグメント拒否、`..` 拒否）
   - 日本語プロース: 「テナント/クライアント」→「設定ユニット」

### 影響範囲（このセッションで調査済み）

コア（2階層に依存しているのはこの6箇所だけ。パイプライン本体 build-plans / apply-updates /
helm.ts / gitlab.ts は tenant/client を一切見ておらず `ChartAndApps` を透過的に運ぶだけ）:

- `src/lib/config/config.ts:104-134` `listClientChartAndApps()` が `listSubdirectories()` を
  2回ネストする決め打ち走査。ここを深さ1〜2の再帰＋入れ子検出に置き換える。
  `clientDirExists()`（92-100行）も相対パス版に
- `src/domain/feature-branch.ts:12` `buildFeatureBranch(tenantId, clientId)` → `unitPath` 1引数
- `src/steps/apply-updates/sub-steps/build-mr-content.ts:10-30` MRタイトル
- `src/steps/shared/step-outcome.ts:99-100` `buildLogContext()` のログフィールド
- `src/lib/env.ts:80-127` `parseTargetClients()` / `parseTargetClientEntry()` → `TARGET_UNITS`
- `scripts/lint/verify-config/verify-config.ts:57,77` エラーの位置表示
- 型: `src/types/brand.ts` の `TenantId`/`ClientId` を削除し `ConfigUnitPath` を追加、
  `src/types/types.ts` の `TargetClient` を廃止（`ConfigUnitPath` 単体で足りる）、
  `ChartAndApps` のフィールド差し替え
- `src/lib/config/chart-and-apps.ts:24-35,74-75` シグネチャと戻り値

ドキュメント（作業量の大半はここ。「テナント/クライアント」がドメイン語彙として全体に浸透）:

- `docs/glossary.md`(15箇所) ─ 「テナント / クライアント」エントリを「設定ユニット」に
  差し替え、表記ゆれ注記として今回の経緯を書く。**正典なのでここを最初に直す**
- `docs/requirements.md`(41箇所) ─ 「4.4 アプリの登録・設定」が config/ 構成の正典
- `README.md`(24箇所) ─ 特に「設定」章の階層説明（162-163行）と環境変数表
- `docs/architecture.md`(23箇所) / `docs/smoke-test.md`(22箇所) /
  `docs/coding-standards.md`(2箇所)
- `docs/requirements-grilling.md`(27箇所) は**過去のQ&Aログなので書き換えない**（アーカイブ扱い）
- `.gitlab-ci.yml` の pipeline inputs（`TARGET_CLIENTS`）

テスト・フィクスチャ:

- `test/` 17ファイルが `tenantId`/`clientId` を参照（`test/helpers.ts`・
  `test/lib/config/fixture.ts` が土台）
- `config-test/` は深さ2のまま残しつつ、**深さ1のケースを1つ足して e2e で守る**
  （深さ1と深さ2が同じ chart 配下に共存できることの回帰テストになる）
- `scripts/smoke/smoke-fixture.ts`

## 2026-09-08

生成したタスク: T-123・T-124（要件シナリオに対するe2eテストの方針決めと実装）/ T-125（パラメータ化候補の洗い出し）/
T-126（`config/` の運用方針と既定パスの通し方）/ T-127（`apply-updates` のサブステップ粒度と `gitlab.ts` の薄いラッパー化）。
**3項目めの後半「必要ならGitLab上で実機テストするための環境を構築してほしい」はタスクにしなかった。すでに構築済みのため**
（`sinnlosses-group/yadokari-smoke-test-chart` + ソースリポジトリ2つ + `scripts/smoke/smoke-fixture.ts` の setup/reset +
`docs/smoke-test.md`。2026-09-07に実施して `{"CREATED":2,"SKIPPED":0,"ERROR":0}`）。残っている `config/` 側だけを T-126 にした。
4項目めの後半（`gitlab.ts` を薄いラッパーに戻す）は `docs/architecture.md`「コミット処理だけは`lib/gitlab/`がドメイン型を
知っている」節の**既存の設計判断を覆すもの**なので、覆すかどうかを T-127 の第一の論点にした。

- スモークテストはあるけど要件に沿った体系的なシナリオテストというか、e2eがなさそうだけど検討してもらえるかな
- このリポジトリで環境変数にすでに設定されている部分以外でパラメータ化できる部分を洗い出してほしい。パラメータ化して使う人が設定できるようにすべきか考えたいので。
- configディレクトリに実際に設定ファイルを置いて通してみたい。必要なら GitLab 上で実際に実機テストするための環境を構築してほしい。
- apply-updates.ts がサブステップの呼び出しの連鎖で成り立っていない部分があるのでリファクタしたい。現状は collectMrEntries -> buildMrContent -> commitFileUpdates -> createMergeRequest の流れだけど、commitFileUpdates と createMergeRequest はステップになってない。ステップになっていない2つを1つのステップとしてまとめると良さそう? あと、 gitlab.ts の commitFileUpdates はブランチのdeleteもやっていてgitlabの薄いラッパーと呼べないくらいの処理になっている。上記で作ったステップでそういった手順は組み、gitlab.tsでは薄いラッパーである役割を貫こう。

## 2026-09-07（3回目）

生成したタスク: T-121（`accessToken` をブランド型にする）/ T-122（`configPath` のリネームと検証）。
タスクにしなかった項目は無し。2点とも現物で裏が取れた（`EnvConfig` 8フィールドのうち
`gitlabUrl`/`targetChart`/`tagFormat` はブランド型なのに `accessToken` と `configPath` だけ素の
`string`。`configPath` のパストラバーサル検証は `env.ts` ではなく後段の `loadConfig()` にある）。

- env.ts の EnvConfig がよくわからない印象
  - accessToken は string のまま使っているけど型をつけたいな
  - configPath が具体的に何のconfigのpathかわからず、わかりやすい名前にしたいし、値の形式にvalidationもなさそうだね。形式が決まっているならvalidateしたいな

## 2026-09-07（2回目）

生成したタスク: T-120（タスクの実行モデルの決め方から「メインセッションのモデル」への従属を外し、
`difficulty` に沿ったモデルのサブエージェントへ依頼する運用に統一する）。タスクにしなかった項目は無し。
指摘は現物で裏が取れた（同日のセッションはメインがOpus 5の状態で `difficulty: sonnet` の
T-112〜T-115 を「メインがそのまま実行」しており、ラベルと実行モデルが一致していなかった）。

- tasks を処理する方法としてサブエージェントに必ず投げるようにする。現状はメインが担当することがあるがメインのモデルの切り替えを普通に行うことがあるので、一貫してサブエージェントに投げることで統一感を出す

## 2026-09-07

生成したタスク: T-116（dry-runの分岐の再考）/ T-117・T-118（async/awaitとthen/catchの方針確定と適用）/
T-119（`develop/test-inventory.md` の要否判断）。
タスクにしなかった項目は無し。3項目とも現物のコードで裏を取ったうえでタスク化した。

- dry_run の仕組みの再考。処理の途中で dry_run であるかどうかの分岐がところどころにある。これはキレイに分離できるならしたいけどアイデアがない。検討してほしい。
- async/await と then/catch の混在をどうするか(許容、使い分け、統一)を設計思想として確定させ、迷いがないように記録したい。その後、決められた方針に従い既存のコードの修正も行いたい。
- develop/test-inventory.md はまだ必要なファイル?不要なら削除をお願い

## 2026-09-06

**全項目が対応済み**。対応内容の詳細は同じディレクトリの
[`tasks-archive.md`](./tasks-archive.md) と
[`docs/architecture.md`](../architecture.md)「設計判断（なぜ今の形なのか）」を参照。
このメモはタスク化の運用（`/plan-tasks`）を決める前に書かれたものなので、
「各項目 → 生成したタスクID」の対応表は残っていない。

- 環境変数 TARGET_CLIENT は複数指定できる認識なので TARGET_CLIENTS に修正したほうが良さそう
- filter-targets で fatal なエラーが settled になってしまいそう。fatalなものは処理全体を落としてしまいたい
- try catch を少なく、あるいはどこで try catch を入れるかを決め打ちできないかを検討してほしい
  - fatal なものは処理を落とす、そうでないものは復帰してエラーとして計上する、これをいたるところで書くのを避けられるか、という課題
- 型の定義配置をリポジトリで統一感持たせたい。types/ディレクトリにあったり、filter-targetsのようにファイル内にあったり、build-plans/sub-steps/types.ts にあったりと一貫した設計方針がないのでブレている印象
- URLをstringで扱っている箇所があるように見え、URLインターフェースを使うなど型で縛ることを検討してください
- tasks.json と progress.mdをdevelop/ディレクトリを新しく作ってそこに配置してください(機能に関係ないファイルなので)
