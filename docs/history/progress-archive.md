# progress.md の過去ログ（〜T-063）

`progress.md` は「直近の状態・次にやること・未解決・注意」に絞る運用にしたため（T-030）、
それ以前に積み上がっていた「完了したこと」の記述をこのファイルへそのまま移した。
内容は当時の記述のままで、後から書き換えていない（当時のファイル名・型名のままの箇所がある）。
タスク単位の証跡は `tasks.json` と `docs/history/tasks-archive.md` を参照。

**このファイルは通読しない**（120KB超）。時系列の追記ログなので節の索引は持たない。
過去の経緯をたどりたいときだけ、`grep -n` でキーワードの行を見つけ、その周辺だけを
`sed -n '<行>,<行>p'` で読む。

## 完了したこと（アーカイブ）

### 2026-09-11 `src/lib/config/config.ts` の分割

- **T-197**: 4パスを実機実行し、`docs/smoke-test.md` の「期待する結果」を**実測値で確定**した。
  パス1 `{CREATED:4}`／パス2 `{SKIPPED:4}` mr_exists／**パス3 `{CREATED:3,ERROR:1}` 終了コード1**／
  パス4 `anchor-app`=no_diff・他3件=mr_exists。今回の主目的だった**部分失敗と終了コード1が
  実機で通った**（ERRORは `tenant2/client2` のみで、残り3ユニットにはMRができた＝処理継続）。
  **パス4の当初手順が誤りだと判明**: `reset` だけして `setup` を省く方法では `no_diff` にならない。
  このツールは `main` に書かず固定ブランチにコミットするため、`reset` すると `main` はシードに
  戻るため。**実装のバグではなくドキュメントの誤り**（T-193より前から書かれていた）で、
  MRを1件マージしてから再実行する手順に差し替えた。後片付け済み（両chartともオープンMR0件）。
  **MRの差分と本文も読み取りで確認した**（summary と終了コードだけでは「正常に動いた」と
  言うには足りないため）。書き換え先のアンカーだけが変わり、`helmVersion`（ツールが管理
  しないアンカー）・HEAD一致のapp・差分なしの向き先ブランチはいずれも無傷。`shared-app` の
  新タグが `develop-` 由来なことで、キャッシュキー `projectId:branchToSync` の分岐も確認できた

- **T-196**: `config/` に新シナリオを追加。`config/yadokari-smoke-test-chart2/` を新設（**2つ目の
  chartリポジトリ**。`sample-qa-sprint` を **`branchToSync: develop`** で追跡＝キャッシュキー
  `projectId:branchToSync` が分岐する経路）と、`tenant2/client1` に `values-extra.yaml` への
  2件目の書き込み先を追加（1appが複数valuesPathに書く）。3ユニット/5apps → **4ユニット/6apps**。
  `validate-config:remote` 通過。`test/main.e2e.test.ts` は実 `config/` を読むため追随が必要で、
  **別プロジェクト宛てMRと develop由来タグが選ばれることの検証**が新たに入った
  （テスト件数は385のまま。サブエージェントの「383→385」という報告は誤りで、受け入れ側で
  stash して実測し直した）

- **T-195**: GitLabにフィクスチャを実適用した（**このセッション唯一の外部書き込み**、承認済み）。
  chartリポジトリ2 `sinnlosses-group/yadokari-smoke-test-chart2`（**id 86354445**）をAPIで作成し、
  両chartに `reset --apply` / `setup --apply` を適用。前回の実行の残骸（MR !30〜!32 と
  固定ブランチ3本）もここで片付いた。**適用結果は読み取りで確認**している（宣言だけで
  合格にしない）。ソースリポジトリへの書き込みは発生していない（シードタグは2件とも既存）。
  読み取り中に `release/2026-q1` が見えない瞬間があったが、GitLab側の反映待ちで、
  再確認したら存在していた

- **T-194**: `scripts/smoke/smoke-fixture.ts` を4パス構成に合わせて拡張（184行→257行）。
  chartリポジトリ2向けのシード（`SMOKE_CHART2_PROJECT_ID` 未設定なら既存シナリオを壊さず
  スキップ）、`values-extra.yaml`、`setup --broken-anchor`（`t2c2QaSprintVersion` を抜いた版）。
  **GitLabへの書き込みは一切なし**（dry-runのみ、書き込みAPI5箇所が全て `if (apply)` の内側に
  あることを受け入れ側で確認）。受け入れで、**dry-runの出力が通常setupと `--broken-anchor` で
  区別できない穴**を塞いだ（「dry-runを見てから`--apply`」が安全設計なので、見分けが付かないと
  取り違えて書き込みうる）。`pnpm check` 通過: 385 Tests

- **T-193**: スモークテストを4パス構成に設計し直し、`docs/smoke-test.md` を書き換えた
  （141行→238行）。パス1=通常更新（複数chartリポジトリ・1appが複数ファイル・複数の追跡ブランチ）、
  パス2=再実行（`mr_exists`）、**パス3=部分失敗（`ERROR` 1件で他は継続、`PARTIAL_FAILURE`、
  終了コード1）**、パス4=差分なし（`no_diff`）。パス3が今回の主目的。
  **設計中に前提が1つ崩れた**: 当初「複数chartリポジトリは `tagFormat` 食い違い検証が効く
  唯一の経路」としていたが、食い違う設定は `pnpm lint` とCIで落ちるため `config/` に
  コミットできず、かつ単体テスト済みだった。2つ目のchartリポジトリの用途を
  「MRが2プロジェクトに分かれることの確認」に変えた。載せないと決めた4件は
  `docs/smoke-test.md`「載せていないシナリオ」に理由付きで残してある

- **T-192**: `buildChartAndApps()` の6位置引数を、値が決まる単位で2オブジェクトにまとめた
  （`ChartRepoScope` / `ConfigUnitScope`）。chartリポジトリ単位の側は `unitPaths.map()` の
  外で1回だけ組み立てる形になった。**受け入れで型名を直した**: サブエージェントは
  `ChartRepoUnit` / `ConfigUnit` と命名したが、`ConfigUnit` はドメイン用語「設定ユニット」
  （集約は `ChartAndApps`）と衝突し、`ChartRepoUnit` は同じファイルで使う `ChartUnits` および
  `ChartRepoConfig` と紛らわしかった。正典がこの軸を「スコープ」と呼んでいる
  （`docs/architecture.md`「`config/`は『スコープ』で2ファイルに分け」）のに合わせて改名した。
  `pnpm check` 通過: 385 Tests

- **T-191**: `resolveProjectLinkage()` と `LinkedApp` を `validate.ts` から
  `load-chart-and-apps.ts` へ移し、**両方とも非公開にした**（呼び出し元が同じファイル内に
  来たため）。名前に反して検証ではなく結合だったもので、`validate.ts` は 137行→**87行**に
  なり名前どおり検証だけのファイルになった。受け入れでは移した関数本体が移動前と
  完全一致することを `diff` で確認。`pnpm check` 通過: 385 Tests

- **T-190**: 判定手順を `src/domain/`・`src/types/`・`src/utils/`・`scripts/` に適用。
  **308行→305行（-3行）**で、この範囲は元から規約に沿っていた。消えた4件のうち1件は
  `types.ts` の `FileUpdate` の「1ファイル分の更新内容」で、**正典が禁止例として名指ししていた
  コメントそのもの**が残っていたもの。残り3件は呼び出し元ファイル名・内部関数名への言及と、
  `docs/architecture.md` に逐語で重複していた置き場所の説明。
  これでコメント規約の適用は完了（**合計 914行→867行、-47行**）。`pnpm check` 通過: 385 Tests

- **T-189**: 判定手順を `src/steps/` に適用。**257行→228行（-29行）**。削れたのは4ファイルで、
  中身は `docs/architecture.md` に既にある設計判断の写しと、本体の分岐の言い換え
  （`reason: "no_diff"` / `"dry_run"` がコードにそのまま書いてある箇所など）。
  受け入れでは、消した根拠として挙がった正典3箇所の実在を自分で確認し、書き換わった
  `withAppContext()` のJSDocが `rethrowWithAppContext()` の実装（`isFatalError()` で素通し）と
  一致することも確かめた。`pnpm check` 通過: 385 Tests

- **T-188**: T-187 の判定手順を `src/lib/` に適用。**349行→334行（-15行）**で、`loadConfig()` の
  13行→4行が大半を占める。削れたのは5ファイルだけで、`helm.ts`・`env.ts`・`gitlab/errors.ts`
  （率42%）などは受け入れ側で当て直しても削る箇所が無かった（呼ぶ人に要る Why か、
  外部システムの挙動記録）。**減り幅が小さいのは想定どおり**で、T-187 の診断（病気は長さでは
  なく写し。写しはコードを直した箇所に集中する）と一致している。`pnpm check` 通過: 385 Tests

- **T-187**: コメント規約を一次情報で調べ直し、`docs/coding-standards.md`「コメント」節を
  書き換えた（30行→69行）。**調べた結果、病気は「長すぎる」ではなく「他所の写し」だった。**
  `loadConfig()` のJSDoc13行のうち10行が、本体の行・呼び先のJSDoc・戻り値の型の写しで、
  `tagFormat` の食い違いの説明に至っては3箇所に同じものがあった。T-184/T-185 で本体が
  段の並びになった結果、それまで有用だったJSDocが写しに変わったもの。
  足したのは Google TypeScript Style Guide 由来の**読者の軸**（`/** */` は呼ぶ人向け、
  `//` は実装を読む人向け）と、種類の表への「写しは消す」の行、レビューの2問目。
  **行数上限は置かず「制約・前提は必要なだけ長くてよい」も撤回しなかった**（長さが原因では
  なかったため）。JSDocのブロックタグも導入しない（既存0件で、要望より大きな変更になる）。
  調査記録は `docs/research/comment-conventions.md`

- **T-186**: `src/lib/config/` の3ファイルを、何をするか分かる名前に改名した
  （`unit-scan.ts`→`find-config-units.ts` / `select-units.ts`→`limit-to-target.ts` /
  `chart-and-apps.ts`→`load-chart-and-apps.ts`）。`src/steps/` の「ファイル名＝公開関数名で
  動詞始まり」に揃えたもの。**改名だけで振る舞いは無変更**（使い捨てconfigでの実行で
  改名前後の一致を確認）。`docs/architecture.md` の「`chart-and-apps.ts` は変えない」の行は、
  当時の論点（YAMLファイル名への追随）は据え置いたまま別の論点で改名した旨を添えて書き換えた。
  受け入れで、`schema.ts` のJSDoc「`config.ts`から参照する」が **T-185 の時点で既に嘘に
  なっていた**（`config.ts` は `schema.ts` を import していない）のを見つけ、参照元の列挙自体を
  削除した（grepで分かることをコメントに書くと腐る実例）。`pnpm check` 通過: 385 Tests

- **T-185**: `config.ts` を **140行→36行**（`DEFAULT_CONFIG_DIR_PATH` と `loadConfig()` だけ）に
  した。`TARGET_*` の解釈（`ConfigTarget` / `NO_TARGET` 含む）を新設の `select-units.ts` へ、
  `scanChartDir()` と `ChartUnits` 型を `unit-scan.ts` へ移し、`findUnitPaths()` は非公開に降格。
  T-184 のタスク化時に「ファイルを増やしたくない」で `select-units.ts` の新設を見送ったのが
  判断ミスで、その結果 `config.ts` が138行→140行と増えていたのを直したもの。
  `pnpm check` 通過: 33 Test Files / 385 Tests

- **T-184**: `loadConfig()` を「名前の付いた段を順に呼ぶだけ」の入口（本体9行）に組み替え、
  `selectChartDirs` / `scanChartDir` / `selectTargetUnits` / `loadUnitChartAndApps` /
  `validateTagFormatConsistency` / `assertTargetMatched` の並びにした。`listUnitChartAndApps()` は
  `chart-and-apps.ts` へ移設し、`ChartUnits` 型もそちらへ。**ファイルは5のまま増やしていない**。
  受け入れでは、壊れた兄弟chartディレクトリを置いた使い捨て `config/` を作り、
  `TARGET_CHART` 指定時にそれを走査しないことを**変更前後の実行結果の一致**で確認した
  （既存テストでは検出できない不変条件のため）。`pnpm check` 通過: 33 Test Files / 385 Tests

- **T-183**: `config.ts`（207行）から設定ユニットの走査と階層の検証を
  `src/lib/config/unit-scan.ts`（77行、`export` は `findUnitPaths` のみ）へ切り出し、`config.ts` は
  138行になった。`docs/architecture.md`「1ファイルにまとめるか分けるか」の分ける合図①②③⑤に
  該当（④「依存が違う」は不成立。`loadConfig()` 自身も `listSubdirectories()`・`existsSync()` を使う）。
  **振る舞いは無変更**で、`test/` は1文字も触っていない（`git diff --stat test/` が空）。
  `pnpm check` 通過: 33 Test Files / 385 Tests（変更前と同数）

### 2026-09-10 指示メモのタスク化とトークンのマスク確認

`/plan-tasks` で T-175〜T-179 を登録し、`done` 9件を `docs/history/tasks-archive.md` へ
アーカイブした。**T-176（`outcome`→`result`）は指示のまま改名すると `StepResult` の中に
`result` が入り、`docs/architecture.md`「1つの語を2つの意味に使わない」と衝突する**ため、
方針決めを前段に切り出してユーザー判断待ちにしてある。

**T-175 完了**（`sonnet`、委譲）。アクセストークンがログに出うる経路を全件洗い、
**今の呼び出し方では漏れない**ことを確認したうえで、`SENSITIVE_KEYS` に `accesstoken` を
足す1件だけを対処した（`toLowerCase()` の完全一致では `EnvConfig` のキー名 `accessToken` が
素通りしていた）。gitbeaker はトークンをヘッダでのみ送り、`error.message` に混ぜないことを
ソースで確認済み。再帰的なマスクと値ベースの伏せ込みは**採らない判断**（後者は `src/utils/` が
環境を知ることになり原則2に反する）。方針は `docs/requirements.md` 5章に1箇所だけ追記した。

**T-176・T-177 は着手しない判断で閉じた**（`status: done` / `passes: false`）。理由は下の「未解決」。

**T-178 完了**（`opus`、方針決めはメイン・執筆は委譲）。HTTPエラー処理の資料は
**新規ファイルを作らず** `docs/architecture.md`「エラー処理と並列実行」に
`#### HTTPエラーの経路` を1節足す形にした（ユーザー判断）。理由の記述が既に同じ節グループに
あるため「1節読めば分かる」になり、正典を5箇所目にしなくて済む。**`README.md` の8行表は据え置き**で
ステータス別の挙動の正典を保ち、新設節には機構（どの関数がどの順で判定するか）だけを書いた。
埋めた穴は、判定の順序・`getLatestPipelineForRef()` だけが403を「パイプライン無し」に
読み替えること・9関数の登場人物表の3つ。

**T-172 完了**（`opus`、方針決めのためメインで実行）。**タスク登録時の前提が誤っていた**:
正典は「形」と「実在」の2段構成を定めているだけで、`validate`/`verify` という語の割り当ては
どこにも書かれていなかった。実測すると `validate` は21ファイルに散る**一般動詞**
（`validateGitlabUrl`・タグ形式・スキーマ・`.gitlab-ci.yml` の stage 名まで）で、狭い意味を
割り当て直せない。**例外は `verify` のほう**で `scripts/lint/verify-config/` 1箇所だけ。
そこで**例外側を一般動詞に寄せる**方針をユーザー承認のうえ決定し、`docs/architecture.md`
「型と命名」に対応表つきで新設した。**外部インターフェース（pnpmスクリプト名・CIジョブ名・
stage名）は一切変えない**ので、承認のコストが要る範囲は残っていない。

**T-180 を登録**（`opus`、`/loop` 不可）。会話の中で `config.yaml` の `helm` が
`optional` である理由を問われ、**chartリポジトリは常に2ブランチ構成（`apps` を定義する
ブランチと、それを流し込んで k8s リソースを構築する `helm` のブランチ）**という前提を
ユーザーが確定させたため、必須化をタスクにした。着手には**GitLab側のスモークフィクスチャに
受け皿アンカーを足すことが先に必要**（外部書き込み・要承認）。経緯は
`docs/history/direction.md`「2026-09-10（3回目・会話中の指示）」。

**T-173 完了**（`sonnet`、委譲）。T-172 の対応表どおりに `verify` → `validate` を改名し、
`scripts/lint/verify-config/` を `scripts/lint/remote-existence/` へ `git mv`（3件とも `R` で記録）。
**外部インターフェースは差分ゼロ**（`package.json`・`.gitlab-ci.yml`・`README.md`・`CLAUDE.md`）。
対応表に無かった追随が1件あり、`vitest.config.ts` の coverage の `include` パスを直した
（放置すると `scripts/` のカバレッジ対象が黙って外れる）。残った `verify` は gitbeaker の
エラー文言と正典の対応表本体だけ。

**T-179 完了**（`sonnet`、委譲）。索引を持たなかった3ファイルに追加した。`README.md` は
**リンク付き目次**（GitHub上で人が上から読むため）、`docs/workflow.md` と
`docs/smoke-test.md` は既存4ファイルと同じ**表形式**。ただし見出し名は `## 目次` とし、
既存の `### 節の索引` とは分けてある（あちらは「通読せず `sed` で節を切り出す」運用とセット）。
`docs/requirements-grilling.md`（完了済みの検討ログ）と `CLAUDE.md`（全文が読まれる前提）には
**付けない判断**。索引の各行が実在見出しと順序込みで一致することを突き合わせで確認済み。

**T-180 はコード側だけ完了**（`opus`、方針決めはメイン・実装は委譲）。`todo` のまま残してある。
`config.yaml` の `helm` を必須にし、`helmTargetBranch` から `| undefined` を消した。受け皿
アンカーは `smoke-fixture.ts` の `SEED_FILES` で用意する（ユーザー指示「自動で頼む」）。
**消えるはずだったスモークシナリオは維持できた** — `client2` と `anchor-app` のシード値を
`HELM_TARGET_BRANCH` と同値にすれば向き先ブランチが差分なしになり、「image tag更新のみ」の
検証がそのまま成立する。差分が出る側は `client1` だけ。

着手後にユーザーが実物を確認して**前提のズレが1つ見つかった**: `charts/anchor-app/values.yaml`
には既に `&smokeTestTargetBranch release/2025-q4` があり、`&helmVersion develop` という
このツールが読み書きしないアンカーも同居していた。当初案の「`anchorAppHelmTargetBranch` を
新規に作る」は**GitLab上に存在しないアンカーを指すので `validate-config-remote` が落ちる**うえ、
`SEED_FILES` の丸ごと上書きで既存2アンカーを消すところだった。既存の `smokeTestTargetBranch` を
使う形に変更し、`helmVersion` はシード内容に含めて保存する。**どちらもユーザー確認済み**
（2026-09-10）— 向き先ブランチの受け皿は `smokeTestTargetBranch` で正しく、`helmVersion` は
`SEED_FILES` に含めて `setup` のたびに `develop` に戻す扱いでよい。

**T-181 完了**（`sonnet`、委譲）と **T-182 を登録**。`src/lib/config/chart-and-apps.ts` の
`unitDirPath` が `unitPath` と見た目の双子で紛らわしい、というユーザー指摘から。
`unitDirPath` は `join()` のためだけに存在していた（使用箇所1つ）ので消し、
`configYamlPath` を直接受け取る形にした。**調査で型の穴が見つかった** —
ブランド型は `string` に代入可能なので、`ConfigUnitPath` を素の `string` 引数に渡しても
コンパイルが通る（最小再現で確認済み）。`unitPath` と `unitDirPath` の取り違えが型で
止まらない状態だった。これを塞ぐ `LocalPath` ブランド型を **T-182 で導入して完了**
（`TS2345` が出ることをメイン側でも独自に実証）。`ValuesPath`（GitLab上のパス）と
`LocalPath`（ローカル）が名前で対比されるようになり、`src/utils/` は原則2どおり
`string` のまま据え置いた。受け入れ時に `docs/architecture.md` の型の件数（53→54件）の
追随漏れも直した。

**GitLabへの反映まで完了**（ユーザー承認のうえ実行）。`smoke-fixture.ts setup --apply` が
3ファイルを update し、`anchor-app` の実変更は `smokeTestTargetBranch` の
`release/2025-q4` → `release/2026-q1` の1行だけだった（`helmVersion` と
`tenantId1client1AppsVersion` は現状と同値）。`pnpm lint:validate-config:remote` が
`config OK（実在チェック）: projectId・ブランチ・valuesPath・アンカーをすべて確認` を出し、
**T-180 の全完了条件を満たした**。

**未着手のタスクは0件になった。**

### 2026-09-08 定期メンテの棚卸し

**T-136 完了**（`4907dd8` の次のコミット）。廃止語彙 `client` / `chart groups` を
`src/`・`scripts/`・`docs/`・`README.md`・`.env.example`・`.gitlab-ci.yml`・テストから一掃し、
`validate-config.ts` の出力を数えている実体（設定ユニット数）と一致する表記に直した。
残った `client` は `"tenant1/client1"` 等のパス例と `config-test/` の実フィクスチャ名だけ。
振る舞いは不変で、テストは418件のまま。

**T-137 完了**。`resolveLatestTag()` の到達不能な二重ガードを undefined 判定1つに畳み、
`docs/coding-standards.md`「埋めないと決めた穴」の表を4件→3件に減らした。
`isFatalStatus` のときと同じく**テストではなくコード側を直す**という前例に沿った処理。
全体の branch カバレッジは 97.62% → 97.91%。

**T-138 完了**。同値を返す2連続 return を1条件に統合し、`compileTagPattern()` から `let` を全廃、
named import 2箇所を昇順に。**作業中に既存テストの穴が見つかった**: `escapeRegExp()` の呼び出しを
外しても既存テストが1件も落ちない（テンプレート・ブランチ名のフィクスチャに正規表現特殊文字が無い）。
`README`/`requirements.md` は区切り文字の自由を明記しているので実害のある穴として **T-143** に登録した。

**T-139 完了**。`collect-mr-entries.ts` の防御フィルタは**消す**判断（3案のうち(a)）。
非空タプル型で表す案(b)は実際に書いて検証し、TypeScript が `.length` チェックを
タプル型へ narrowing しないため `as` が要ると分かったので落とした。この検証結果は
`docs/architecture.md`「配列の非空を型で保証するより、生成経路を1つに保つ」に残した
（次に同じことを思いついた人が再検証しなくて済むように）。

**T-140 完了**。3候補とも「消す」ではなく `it.each` に畳む判断で、テスト件数は418件のまま。
`it.each` はこのリポジトリ初導入で、`it.each([...])("%s ...", (x) => {...})` の形に3箇所とも統一した。
受け入れ時に、追記コメントの `T-134` 参照が「タスク番号を書かない」規約違反だったので仕様参照に直した。

**T-141 完了**。`README.md` のログ例で `helmTargetBranchUpdates` が `apps[]` の中に入っていた誤りを直し、
`run_start` に `configDirPath` を足し、Quick Start の `mkdir` を深さ1の例にした。受け入れ時に、
委譲先が `run_start` に載せた `targetChart`/`targetUnits` が**続く行の2chart処理と矛盾**していたので
絞り込み無しの例に戻し、「指定したときだけ載る」注記を添えた。

**T-142 完了**。存在しない `runPipeline()`（5箇所）を `runProcess()` に、`BuildPlanContext` を
`BuildPlansResult` に、`formatClientRef`/`parseClientRef` を `getValueAtAnchor`/`setValueAtAnchor` に直した。
機械的な突き合わせで**追加の食い違い `resolveWebUrl()` を1件発見**（実体は `getProjectWebUrl()`）。
「型の置き場所は`src/`全件と突き合わせて確かめてある」節の件数も45→56件に更新し、メインで検算一致を確認。

**T-143 完了**。`escapeRegExp()` を守るテストを6件足した（3つの呼び出し箇所×「壊れる例」「回帰」）。
3箇所を個別に外すと狙った1件ずつが落ちることを確認済みで、**テストが本当に守り手になっている**。
テストは418→424件。これで棚卸しで洗い出した7件＋派生1件がすべて完了した。

**T-126 完了**（`opus`、判断タスク）。`config/` を空のまま運用する是非と既定パスを通す手段を決めた。
**調査で判明したのは「実機未検証なのはディレクトリ名が `config` かの1点だけ」**で、既定値の解決
（`test/lib/env.test.ts:199`）と `loadConfig()` への受け渡し（`test/main.test.ts:102`）は既にテスト済みだった。
一方で **CIの `validate-config-remote` は空の `config/` を検証して必ず通っていた**（位置引数なしのため）。
結論は「スモーク用の `yadokari-smoke-test-chart` を定期実行の対象にもする」＋
**「`config-test/` を `config/` に一本化する」**。二重登録は固定ブランチ名
`feature/yadokari/<unitPath>` を奪い合い、互いのMRを壊すため。0件を設定エラーにはしない
（登録前からCIが赤になるほうが害が大きい）。理由は `config/README.md` に記録し、
実作業は T-145（一本化）・T-146（実機投入）に分割した。

**T-144 完了**（`opus`、委譲）。タグ形式からsemverと`{time}`任意化を撤回し、`apps[].tagNaming`
（`mode`判別共用体）を`apps[].tagFormat`（文字列・**必須**）にした。`ParsedTag.orderKey`は
`builtAt: Date`に戻り、`TagNaming`/`TagOrderKey`/`CreatableTagNaming`/`canCreateTag()`/
`compareTags()`(export)/`DEFAULT_TAG_TEMPLATE`が消滅。「最新タグが決まらない」undefined経路と
app単位スキップも無くなった。用語も「タグ命名規則」→「**タグ形式**」に統一。
**26ファイル +408/-1124行、テストは424→393件（-31）**。削る方向の変更なのでテストが減るのが正しい。
`git revert`は使わず手で削り、T-138/T-140/T-143の成果は温存した。
**受け入れ時にメインが1点修正**: `architecture.md`の「型定義56件」が削除した型3件ぶん古いままだったので
53件（`types.ts` 16・`brand.ts` 12・残り25）に更新した。

**T-145 完了**（`sonnet`、委譲）。`config-test/` を `config/` へ `git mv` で統合し、設定ディレクトリを
既定パス1つに一本化した。**`pnpm lint:validate-config` が位置引数なしで `3 設定ユニット, 5 apps` を
検証するようになり**、CIの `validate-config-remote` が空ディレクトリを検証して通っていた状態も解消。
`docs/smoke-test.md` から `CONFIG_PATH` が消え、`test/main.e2e.test.ts` は実ディレクトリとして
`config` を読む。委譲先が tasks.json に無かった `docs/coding-standards.md`・`docs/architecture.md` の
追随まで拾っていた（どちらも `config-test/` が別物である前提の記述だった）。テストは393件のまま。

ユーザーの指示は3軸: (1) コードの冗長・誤り・規約違反・分かりにくさ、(2) 不要な／もっと
シンプルにできるテスト、(3) `architecture.md`・`CLAUDE.md`・`README` 等のメンテ漏れ・冗長。
`src/`（35ファイル）・`scripts/`・`test/`（36ファイル418テスト）・`docs/`・`README.md`・
`.gitlab-ci.yml`・`.env.example` を読んで洗い出し、**修正はせずタスク化だけ**を行った
（T-136〜T-142）。着手前の基準値は `pnpm check` 通過・36ファイル418テスト・oxlint 無警告。

見つかった食い違いの性質は3つに分かれた:

- **廃止済みの語彙の取り残し**（T-136）。「設定ユニット」へ一本化したはずの `client` が
  `src/` のコメント12箇所・`loadAnchors()` の引数名・`docs/`・`README.md`・`.env.example`・
  `.gitlab-ci.yml` に残る。`scripts/lint/validate-config.ts` の出力 `N chart groups` は
  **廃止語彙であるうえに数えているのは設定ユニット数**で、表示として二重に誤っている
- **正典が指す識別子がコードに無い**（T-141・T-142）。`runPipeline()` は5箇所で使われて
  いるが実在しない（実体は `run()` / `runProcess()`）。`BuildPlanContext` 型も
  `formatClientRef`/`parseClientRef` も無い。`README.md` のログ例は
  `helmTargetBranchUpdates` を app の中に入れているが実装では兄弟フィールド
- **到達しない分岐・重ねて通しているテスト**（T-137〜T-140）。`resolve-latest-tags.ts` の
  未到達分岐は `docs/coding-standards.md` の「埋めない穴」に載っているが、
  `isFatalStatus` の前例に倣えば**テストではなくコード側を畳むべきもの**

`develop/progress.md` の「注意」にあった oxlint の no-shadow 警告2件は、
`oxlint src scripts test` が exit=0・無警告になっており、関数名 `loadClientChartAndApps` も
現存しない（`listUnitChartAndApps`）ため、この更新で削除した。

- `CLAUDE.md` を作成（プロジェクト状況とスキル一覧を記載）
- [mattpocock/skills](https://github.com/mattpocock/skills) からコア開発スキル（tdd, code-review, diagnosing-bugs, codebase-design, domain-modeling, resolving-merge-conflicts, research, implement, grilling）を日本語化して `.claude/skills/` に導入
- 進捗管理用に `tasks.json` / `progress.md` を作成
- **T-001完了**: `/grilling` を9ラウンド実施し、`docs/requirements.md` を確定（検討経緯は `docs/requirements-grilling.md`）
  - 目的: Helm chartでバージョン管理されているアプリのバージョンを自動更新・メンテナンスするシステム
  - タグ命名規則: `${branchの"/"を"-"に置換}-build-at-${yyyymmdd}-${hhmmss}`
  - 設定は `config/<chartリポジトリ>/chart.yaml` + `config/<chartリポジトリ>/<tenantId>/<clientId>/apps.yaml` の2階層構成（実物は `config/teamA-chart/` 配下）
  - MRは**chartリポジトリ単位**に集約（1 chart repo = 1 MR、固定ブランチ名、複数アプリの変更をまとめる）
  - 既存MRオープン中はそのchart repo全体をスキップ／chart repo内で一部アプリが失敗したらオールオアナッシングで見送る／chart repo間は失敗しても他は継続
  - MR本文にはタグへのリンクに加え、タグに紐づくパイプラインへのリンクも含める（状態によるフィルタリングはしない、判断はレビュアー）
  - 実行形態はCLI(TypeScript)、GitLab CI pipeline schedulesから公開npmレジストリ経由でinstallして定期実行
  - GitLab認証はGroup Access Token（read_api + write_repository + MR作成権限、最小権限）、アプリ登録は各チームがセルフサービスでMRを送る方式
  - `p-limit`で同時実行数を制御（デフォルト3〜5）、Dry-runモードあり
- **T-002完了**: `/implement` で `gitlab-watari-dori`（同じ作者の類似プロジェクト）を参考に、
  同じ技術スタックでCLIの骨格を実装（commit `2cb9b97`, `e9127b5`）
  - `src/lib/{env,tag,config,values,gitlab}.ts` + `src/utils/{errors,http,retry,timer,logger}.ts`
    - `src/main.ts`/`src/index.ts`。`config/`の再帰読み込み、タグ命名規則パース、
      `values.yaml`のdotパス読み書き、`@gitbeaker/rest`ラッパー、chartリポジトリ単位のオーケストレーション
  - TDD（tag.ts, config.ts, values.ts, gitlab.tsは先にテストを書いてRED確認後に実装）
  - `pnpm check`（tsc --noEmit + oxlint + oxfmt --check + vitest 152件）が全てpass
  - `/code-review`（固定点 `8c0c3b6`）を実施。Standards軸は明文化標準への違反0件（スメル2件はいずれもソフトな指摘）。
    Spec軸は「`package.json`にengines未設定」「アプリ単位のno-op時ログ欠落」を指摘 → `e9127b5` で修正済み。
    「FatalError時に他chartリポジトリの処理も打ち切る挙動」「アプリ単位処理が逐次実行」の2点は
    要件の文言と完全一致はしないが意図的な設計判断として `CLAUDE.md` に明記（T-003として要検討事項に記録）
  - 実際に `node dist/src/index.js` を実行し、`config/teamA-chart/` を読み込んでGitLab接続失敗を
    構造化ログで報告し非ゼロ終了することを確認（実GitLabインスタンスへの結合テストは未実施、T-004）
- **T-002追加リファクタリング**: ユーザーからの明示的な原則2件に基づき、`src/main.ts` を薄い`process()`（flat
  なステップ呼び出し）に整理し、`src/lib/`・`src/steps/`・`src/utils/` の責務境界を再定義（commit `9b9989f` ほか）
  - 原則1「`steps/`配下は`process()`からしか呼ばれず、`steps`同士は呼び合わない」を適用
  - 原則2「`lib/`は特定の技術・外部システム(config/env/gitlab/helm)に依存するものだけ」を適用し、
    steps専用ヘルパーだった `lib/constants.ts`・`lib/log-context.ts`・`lib/mr-content.ts`・`lib/update-plan.ts` を削除。
    GitLab固有の`UPDATE_BRANCH`/`buildMrTitle`/`buildMrDescription`は`lib/gitlab.ts`へ統合、
    純粋関数のタグ命名規則は`src/utils/tag.ts`へ移動、それ以外は各`steps/*.ts`内の非公開関数として複製
  - `pnpm check`（tsc --noEmit + oxlint + oxfmt + vitest 204件）が全てpass。`CLAUDE.md`/`README.md`の
    アーキテクチャ説明・ディレクトリ構成も現状に追随させた

- **T-005完了**: `/grilling` で9問の設計ツリーを確定し、`docs/glossary.md` を作成（commit `ae9a516`）
  - 業務ドメイン用語（chartグループ、追跡ブランチ、タグ命名規則など）のみを対象にし、`lib/steps/utils`の
    配置基準などアーキテクチャ用語は対象外（`CLAUDE.md`に一次情報があるため重複させない）
  - 「chartリポジトリ」vs「chartグループ」、`previousTag`vs`currentTag`、「反映」の多義性など
    複数の表記ゆれを発見。統一・リネームはせず、各用語エントリ内に事実として注記するのみに留めた
  - カテゴリ別グルーピング（設定・登録／タグ・バージョン管理／MR・GitLab操作／実行結果・処理単位／実行環境・運用）
  - `CLAUDE.md`の関連リンク節に`docs/glossary.md`への参照を追加
- **T-006完了**: `/implement` で `docs/glossary.md` の表記ゆれのうち変数名・メソッド名レベルのものを
  リネーム（commit `17f38c3`, `1b62791`）
  - `build-plans.ts`: `currentTag`→`previousTagRaw`（`AppUpdatePlan.previousTag`と対応）、
    `content`/`loadContent`/`contentCache`/`modifiedPaths`→`valuesYamlContent`系（values.yaml固有の
    概念であることを明示）
  - `apply-updates.ts`: `title`→`mrTitle`（+ コミットメッセージにも流用する旨のコメント追加）
  - 非公開ローカル変数・パラメータのみのリネームで公開シグネチャ・挙動は無変更。`pnpm check`
    （204テスト）通過
  - `/code-review`（固定点`5c2a90a`）実施。Standards軸: ハード違反0件（`previousTagRaw`の命名の
    重心についてソフトな指摘のみ）。Spec軸: 「mrTitleの二重用途が名前だけでは伝わらない」
    「JSDocの『反映』表記がtoApply/applyUpdatesの『適用』と揃っていない」を指摘 → `1b62791`で反映
  - 「chartリポジトリ vs chartグループ」の表記ゆれは`docs/requirements.md`という確定済み要件文書側の
    話であり、今回の依頼（変数名・メソッド名の明確化）の範囲外として意図的に対応せず据え置き
- **T-007完了**: プリミティブ型のフィールドへのブランド型付与・不要なundefinedの削減（commit `6183f15`, `43ee252`）
  - `ValuesPath`/`DotPath`ブランド型を新設し`AppConfig.chart.valuesPath`/`imageTagKey`・
    `FileUpdate.filePath`・`lib/helm.ts`のdotPath引数・`lib/gitlab/gitlab.ts`の`getFileContent`の
    `filePath`に適用
  - `PipelineInfo`型を`lib/gitlab/gitlab.ts`から`types.ts`へ移動（`FileUpdate`等と同じ理由で共有
    ドメイン型として集約）。`webUrl`は既存の`GitLabUrl`ブランド型を再利用
  - `AppUpdatePlan`の`pipelineUrl`/`pipelineStatus`（常に両方undefinedか両方値ありのData Clump）を
    `pipeline: PipelineInfo | undefined`に統合し、型として表現できていなかった不正な組み合わせ
    （片方だけundefined）を排除。`buildMrPlanSection`内の`?? "unknown"`フォールバックも型的に
    到達不能になったため削除
  - `listTagNames`/`createTag`/`getLatestPipelineForRef`のタグ名の型を`TagName`に統一、
    `getProjectWebUrl`/`getLatestPipelineForRef`の戻り値URLを`GitLabUrl`に統一
  - `pnpm check`（204テスト）通過。`/code-review`（固定点`1b62791`）実施、Standards/Spec両軸が
    独立に`getFileContent`の`filePath`未対応を指摘 → `43ee252`で反映
  - `PipelineInfo.status`と`ChartGroup.chartDir`は意図的に未ブランド化（前者はGitLab API由来の
    自由形式文字列で分岐ロジックがない、後者は外部システム境界を跨がないローカルなディレクトリ名）
- **T-008完了**: try/catchの削減監査（commit `8289a13`）
  - `src/`配下の全try/catch（7箇所）と`scripts/lint/validate-config.ts`を監査
  - `lib/env.ts`の`validateGitlabUrl`内、`new URL()`の例外を捕まえて自前エラーに変換していた
    箇所を`URL.canParse()`（Node 22で使える非throwの真偽値判定API）に置き換え、try/catchと
    `parseUrl()`ヘルパーを削除
  - 残り6箇所（`lib/gitlab/gitlab.ts`の`withNotFoundFallback`、`utils/retry.ts`の`withRetry`、
    `utils/parallel.ts`の`mapWithConcurrency`、`steps/`3ファイルのFatalError判定）は
    `@gitbeaker/rest`という例外ベースの外部ライブラリとの境界、またはFatalError（即時中断）/
    非fatal（ERRORとして値化して継続）を分岐する唯一の場所であり、いずれも意図的に維持
  - `pnpm check`（204テスト）通過
- **T-009完了**: `ChartGroup→ChartAndApps`改名・`ChartDirName`/`PipelineStatus`ブランド型付与・
  `steps/`配下のmutableなfor/push/Set.addをreduceベースの不変な組み立てに置き換えるリファクタ（commit `eb1344e`）
  - 以前のセッションで未コミットのまま作業ツリーに残っていたものを本セッションで発見。
    `TARGET_CHART_DIR`/`TARGET_CLIENT`機能の変更と混ざっていたため、ユーザーに確認のうえ
    2つの独立したコミットに分離（本タスクと次のT-010）
  - `pnpm check`（204テスト）通過
- **T-010完了**: `TARGET_CHART_DIR`/`TARGET_CLIENT`環境変数による絞り込み実行機能を追加（commit `e902f9c`）
  - `loadConfig()`に`ConfigTarget`フィルタを追加。`TARGET_CHART_DIR`は単一chartディレクトリ名、
    `TARGET_CLIENT`は`"<tenantId>/<clientId>"`をカンマ区切りで複数指定可能
  - 指定した対象が`config/`配下に1件も見つからない場合はtypo対策として例外で即終了（`docs/requirements.md` 4.5節）
  - `.gitlab-ci.yml`の`spec:inputs`にも追加し、GitLab CIの手動web実行時に指定できるようにした
  - `pnpm check`（222テスト）通過
- **T-004完了**: gitlab.com上の実リポジトリでエンドツーエンド動作確認
  （まとめHTMLレポートを作成したが未コミットのままディスクから消失したため、
  この記述を証跡とする）
  - 既存リポジトリ`sample-qa-sprint`/`sample-develop-client`と、新規作成した
    `yadokari-smoke-test-chart`（chartリポジトリ役）を使用
  - タグ自動作成・DRY_RUN・values.yaml差分反映・chart単位MR集約・既存タグ再利用・
    オープン中MRスキップ・`TARGET_CHART_DIR`/`TARGET_CLIENT`絞り込みと誤指定時エラーを
    すべて実機で確認、いずれも成功
  - **実バグを1件発見・修正**（commit `f0124d0`）: GitLabの`GET /pipelines/latest`は
    パイプラインが1件も無いプロジェクトに対して404でなく403を返す（実機で複数プロジェクト
    確認済み）。`getLatestPipelineForRef()`がこれを再スローしていたため、CI未実行アプリを
    1つでも含むchartグループ全体がオールオアナッシングで`ERROR`になっていた。404と同様に
    「パイプライン無し」として扱うよう修正し、テスト追加（`pnpm check` 223テスト通過）
  - 作成した2件のMRはクローズ済み（マージなし）。テスト用chartリポジトリ・タグは継続検証の
    ためユーザーの意向で残置。アクセストークンも継続検証のため未失効（ユーザー管理）
- **T-011完了**: `chart.imageTagAnchor`の追加とYAML処理の`yaml`パッケージへの統一（commit `e59c410`）
  - values.yamlがオブジェクトのネストではなく配列要素にYAMLアンカーで名前を付けた構成
    （例: `variables: [&tenant1client1AppsVersion main, ...]`）向けに、既存の`imageTagKey`
    （dotパス）に加え`imageTagAnchor`（アンカー名）を指定できるようにした（1アプリにつき
    どちらか一方のみ、`apps.yaml`スキーマは判別ユニオンで両方・どちらも未指定を弾く）
  - `js-yaml`はパース時にアンカー名を保持できないため、`yaml`パッケージ（Document/AST、
    `visit()`でアンカー名を持つノードを検索）で`getValueAtAnchor`/`setValueAtAnchor`を新設。
    呼び出し側は`getImageTag`/`setImageTag`で方式の違いを意識しない
  - 既存の`getValueAtPath`/`setValueAtPath`（dotパス）と`config/`読み込み用の`parseYamlFile`
    も`js-yaml`から`yaml`パッケージ（`Document.getIn`/`setIn`/`hasIn`、`parse`）に置き換え、
    `js-yaml`/`@types/js-yaml`を依存から削除。副産物として書き換え対象以外のコメント・
    クォートスタイルが保持されるようになった
  - `pnpm check`（236テスト）通過。`CLAUDE.md`/`README.md`/`docs/requirements.md`/
    `docs/glossary.md`を更新
- **T-012完了**: `chart.imageTagAnchor`を`config/`の実例apps.yamlに反映し、gitlab.com実機で再検証
  - `config/teamA-chart/tenantId1/clientId1/apps.yaml`に`imageTagAnchor`使用例
    （`another-app`, projectId 889）を追加
  - T-004で使ったgitlab.com上のテスト用リソースを再利用し、`imageTagAnchor`指定アプリと
    `imageTagKey`指定アプリが同一chartグループに混在するケースを実機で検証。アンカー値の
    書き換え・他のアンカー（`helmVersion`）の保持を確認、いずれも成功
  - **実バグを1件発見・修正**: `commitFileUpdates()`が「固定ブランチが既に存在する ⇒
    対象ファイルも全て存在する」と決め打ちしていたため、MRをクローズ（マージせず）した後に
    残った固定ブランチへ、新しく`valuesPath`が増えたアプリを追加すると
    `action: update`を送ってしまい`400 A file with this name doesn't exist`になっていた。
    ファイルごとに参照先ブランチ（ブランチが存在すればそれ自身、無ければbaseBranch）上の
    存在有無を確認して`action: create`/`update`を判定するよう修正し、テストを追加
    （`pnpm check` 237テスト通過）
  - 作成したMRはクローズ済み（マージなし）。テスト用GitLabリソースは継続検証のため残置
- **T-014完了**: 1つのsource projectが複数アプリ（WebAPI/バッチ/デーモン等）を持ち、
  同一の追跡タグを複数の書き換え箇所に反映できるようにした
  - `AppConfig.chart`を単一の`ImageTagLocation`付きオブジェクトから、`ImageTagTarget`
    （`valuesPath` + `imageTagKey`/`imageTagAnchor`）の配列（1件以上必須）に変更。
    `apps.yaml`の`chart`フィールドも配列表記になる（既存の単一指定アプリも`chart: [...]`
    へ書き換えが必要な破壊的スキーマ変更）
  - `AppUpdatePlan`を、アプリ単位で1回だけ持つ`latestTag`/`pipeline`と、書き換え箇所ごとに
    独立した`previousTag`を持つ`updates: ImageTagUpdate[]`に分離。同一タグでも箇所によって
    現在の`values.yaml`の値が異なりうるため（一部だけ反映済み、等）、差分があった箇所だけを
    `updates`に積む（全箇所反映済みならそのアプリ自体を計画に含めない）
  - `src/steps/build-plans.ts`: `applyImageTagTarget()`（1箇所分の差分チェック・書き換え）と
    `applyAppToChartUpdate()`（`app.chart`をreduceで1箇所ずつ処理）を追加。既存の
    「同じvaluesPathを複数アプリで共有する場合は1ファイルにまとめる」仕組み
    （`valuesYamlCache`/`modifiedValuesPaths`）はそのまま複数箇所ケースにも対応
  - `src/lib/gitlab/gitlab.ts`の`buildMrPlanSection()`を、アプリ単位（`### projectName`・
    打刻日時・パイプライン）＋箇所単位（`valuesPath`・位置の説明・旧タグ→新タグ・比較URL）の
    2階層表示に再構成
  - `test/lib/config.test.ts`（配列構文への全面書き換え＋複数chart指定のテスト追加）、
    `test/steps/build-plans.test.ts`（「1アプリ複数chartで同じ最新タグを反映」「一部箇所だけ
    差分がある場合の絞り込み」の2テストを追加）、`test/steps/apply-updates.test.ts`、
    `test/lib/gitlab/gitlab.test.ts`（`makePlan()`を新しい`updates`構造に対応）を更新
  - `pnpm check`（249テスト）通過
  - gitlab.com実機（`yadokari-smoke-test-chart` + `sample-qa-sprint`）で検証。一時的に
    `buildPlans()`を直接呼び出すスクリプトと専用configディレクトリを用意し
    （固定ブランチに既存の検証用MRが残っているため、通常のCLI経由だと`filterTargets`で
    スキップされてしまうことを確認したうえでの代替手段）、1アプリ2箇所
    （`charts/sample-qa-sprint/values.yaml`のdotパス + `charts/anchor-app/values.yaml`の
    アンカー）が同一の`latestTag`に対しそれぞれ独立した`previousTag`（`placeholder`と
    旧タグ）を検出し、両ファイルへの書き換え内容・MR descriptionの箇所別表示が正しいことを
    確認。検証用スクリプト・configディレクトリは確認後に削除済み、既存のテスト用GitLab
    リソース・MRには一切変更を加えていない
  - `config/teamA-chart/tenantId1/clientId1/apps.yaml`に複数chart指定の例
    （`multi-service-app`, projectId 890, webapi/batch/daemonの3箇所）を追加
  - `README.md`/`docs/requirements.md`/`docs/architecture.md`/`docs/glossary.md`を
    配列スキーマ・複数箇所対応の説明に更新（`docs/glossary.md`の`imageTagAnchor`補足に
    残っていた`js-yaml`言及、`previousTag`表記ゆれ注記の`currentTag`という古い変数名も
    あわせて修正）
  - **【追記】ユーザー指示により`imageTagKey`（dotパス）方式を完全に削除、`imageTagAnchor`
    （YAMLアンカー）方式のみに一本化**。当初「multi-service-appの例だけアンカーに寄せる」と
    誤解して対応したが、ユーザーの意図は「ツール全体でdotパスをやめてアンカーのみ対応にする」
    ことだったため、`DotPath`型・`ImageTagLocation`ユニオン・`getValueAtPath`/`setValueAtPath`・
    `getImageTag`/`setImageTag`ラッパーを`src/types.ts`/`src/lib/config.ts`/`src/lib/helm.ts`/
    `src/steps/build-plans.ts`/`src/lib/gitlab/gitlab.ts`から削除。`ImageTagTarget`は
    `valuesPath` + `imageTagAnchor`のみを持つ単純な型になった
  - `config/`実例の`my-app`エントリも`imageTagAnchor`（アンカー名`myAppVersion`）に変更。
    全テストファイルのフィクスチャを`imageTagAnchor`ベースに書き換え、両方指定/どちらも
    未指定の排他検証テストなど不要になったテストを削除。`README.md`/`docs/requirements.md`/
    `docs/architecture.md`/`docs/glossary.md`から`imageTagKey`の現行仕様としての記載を削除し、
    削除された経緯のみ補足として残した
  - `pnpm check`（234テスト）通過

- **T-003完了**: アプリ単位の並列化要否をユーザーに確認し、逐次のままでよいと決定
  - 理由: 夜間のpipeline schedule実行が前提のため、アプリ単位の処理速度は問題にならない
  - コード変更なし。`docs/requirements.md` 4.3節の「並列」という記述とアプリ単位（chartグループ内）が
    逐次実行である実装との差異は、意図的な設計判断として`tasks.json`に記録のみ行う

- **T-013完了**: 「Helmの向き先ブランチ」要件を`/grilling`3ラウンドで確定（実装はT-016に切り出し）
  - 向き先ブランチはchartリポジトリ内の別ブランチ（`chart.yaml`の`projectId`と同一プロジェクト）
  - 設定は`apps.yaml`の新しいトップレベルフィールド（`apps:`配列と同階層、tenantId/clientId単位に1つ、
    例: `helmTargetBranch: release/2026-q1`）として持たせる。人間が自己申告方式で直接書き換える運用とし、
    タグ命名規則のような自動生成・自動判定の仕組みは持たない
  - 書き込み先は各appごとにそれぞれのapp用`values.yaml`内の1箇所（既存の`imageTagAnchor`と同様の方式で
    app単位に書き込み位置を指定する新フィールドが必要）
  - 書き込み前にブランチの実在をchartリポジトリ上で検証し、存在しなければそのchartグループ全体を`ERROR`にする
  - 既存の「1chartリポジトリ=1MR」に含め、image tag更新と同じMRにまとめる
  - 同じtenantId/clientIdが複数chartディレクトリにまたがる場合のズレ（値の更新し忘れ）リスクは許容し、
    追加の整合性チェックは作らない
  - コード変更なし（要件定義のみ）。ユーザーに最終確認済み

- **T-016完了**: T-013で確定した「Helmの向き先ブランチ」要件を実装
  - `src/types.ts`: `HelmTargetBranchTarget`（`valuesPath` + `anchorName`）・`HelmTargetBranchConfig`
    （`branch` + `target`）・`HelmTargetBranchUpdate`（`target` + `previousBranch` + `newBranch`）を追加。
    `AppConfig.helmTargetBranch`・`AppUpdatePlan.helmTargetBranchUpdate`はいずれも`| undefined`
  - `src/lib/config.ts`: `apps.yaml`のトップレベル`helmTargetBranch`（tenantId/clientId単位に1つ）と
    app単位の`helmTargetBranchTarget`を追加。`loadApps()`内の`resolveHelmTargetBranch()`が両者を
    1つの`HelmTargetBranchConfig`にマージし、`helmTargetBranchTarget`のみ指定され`helmTargetBranch`が
    無い場合は設定ミスとして例外をスロー
  - `src/steps/build-plans.ts`: `applyHelmTargetBranchTarget()`を追加し、`applyAppToChartUpdate()`内で
    `app.chart`の処理後に同じ`valuesYamlCache`を共有して処理。値が現在の`values.yaml`と異なる場合のみ
    `branchExists()`（既存関数を流用）でchartリポジトリ上の実在を検証し、存在しなければ例外を投げて
    そのchartグループ全体を`ERROR`にする（既存のオールオアナッシング方針を踏襲）。ブランチ存在チェックは
    `branchExistsCache`で同一ブランチ名につき1回に共有。chart側の差分が無く向き先ブランチの差分のみ
    あるアプリも計画に含めるようスキップ条件を修正
  - `src/lib/gitlab/gitlab.ts`: `buildMrPlanSection()`に`buildHelmTargetBranchUpdateLine()`を追加し、
    MR本文に「向き先ブランチ」の行（旧ブランチ→新ブランチ）を表示
  - `pnpm check`（246テスト）通過
  - gitlab.com実機（`yadokari-smoke-test-chart` + `sample-qa-sprint`）で`buildPlans()`を直接呼び出し検証:
    (1) 実在するブランチ（`main`）を指定した場合、`charts/anchor-app/values.yaml`に追加した
    `smokeTestTargetBranch`アンカーの現在値（`release/2025-q4`）と設定値（`main`）の差分を正しく検出し
    `helmTargetBranchUpdate`とMR description行を生成、(2) 実在しないブランチ名を指定した場合は
    chartグループ全体が`ERROR`になることを確認。検証用に追加した`smokeTestTargetBranch`アンカー
    （コミット`c96614e1`）はテスト用GitLabリソースとして残置。一時スクリプト・一時configディレクトリは
    検証後に削除
  - `config/teamA-chart/tenantId1/clientId1/apps.yaml`に`helmTargetBranch`/`helmTargetBranchTarget`の
    使用例（`my-app`）を追加。`README.md`/`docs/requirements.md`/`docs/architecture.md`/
    `docs/glossary.md`を更新
  - **【追記】ユーザー指示によりapps.yamlのスキーマ形状を再設計**:
    - トップレベルのスカラー`helmTargetBranch: <branch>`を、拡張性を考慮した配列
      `helm:\n  - branchToSync: <branch>`に変更（現状1件のみサポート、`.length(1)`で検証）
    - app単位の独立オブジェクトフィールド`helmTargetBranchTarget`を廃止し、既存の`chart[]`配列の
      各要素（`imageTagAnchor`と同じ場所）に任意の`helmBranchAnchor`フィールドとして統合。
      1アプリで複数の`chart`要素に指定すれば複数箇所へ反映できるようになった
    - 型も`HelmTargetBranchConfig.target`（単数）を`targets`（配列）に、
      `AppUpdatePlan.helmTargetBranchUpdate`を`helmTargetBranchUpdates`（配列）に変更し、
      T-014の複数箇所対応と同じ設計パターンに揃えた
    - 全テストファイルのフィクスチャを新スキーマに書き換え（`ImageTagTarget`型が
      `helmBranchAnchor`を必須プロパティ、値は`undefined`許容として持つようになったため、
      既存のchart要素リテラルすべてに追記が必要だった）
    - `pnpm check`（248テスト）通過。gitlab.com実機で新スキーマでの`buildPlans()`呼び出しを
      再検証し、既存の`smokeTestTargetBranch`アンカーに対する差分検出・MR description生成が
      変更後も正しく動作することを確認
    - `config/`実例・`README.md`/`docs/requirements.md`/`docs/architecture.md`/
      `docs/glossary.md`を新スキーマに更新
  - **【追記2】ユーザー指摘により欠けていた整合性検証を追加**:
    「helmBranchAnchorの記載のないprojectがapps.yamlにあるが、そこはバリデーションが効く必要が
    ある」という指摘。Helmの向き先ブランチは「1client内のapps全体で共通」という前提（T-013）
    にもかかわらず、`chart[].helmBranchAnchor`をapp単位の完全な任意指定にしていたため、`helm`を
    指定したのに一部アプリだけ`helmBranchAnchor`が無い設定が黙って通ってしまっていた
    （実際、`config/`の実例で`another-app`/`multi-service-app`がこの状態だった）
    - `src/lib/config.ts`の`resolveHelmTargetBranch()`に、`helm`が指定されているapps.yamlで
      `targets.length === 0`のアプリがあれば例外をスローする分岐を追加（app名を含む
      エラーメッセージ）
    - `config/teamA-chart/tenantId1/clientId1/apps.yaml`の`another-app`/`multi-service-app`に
      `helmBranchAnchor`を追加して修正
    - `test/lib/config.test.ts`の「一部のappだけhelmBranchAnchorを指定できる」テストを
      「例外をスローする」に更新し、「全appが指定していれば読み込める」テストを追加
    - `README.md`/`docs/requirements.md`/`docs/architecture.md`/`docs/glossary.md`にこの制約を明記
    - `pnpm check`（249テスト）通過
  - **【追記3】ユーザー指示によりhelm.chart[]を独立リスト化する形へ再設計**:
    ユーザーが`config/teamA-chart/tenantId1/clientId1/apps.yaml`を手動で書き直し、
    `helmBranchAnchor`（app単位の任意フィールド）方式をやめ、トップレベル`helm`配下に独立した
    `chart[]`（`valuesPath`+`anchor`の書き込み先一覧、`apps[].chart[]`とは別建て）を持つ設計に
    戻す形で「この構成で動くように実装を直してほしい」と指示。/askで「`helm.chart[]`と
    `app.chart[]`の対応付けは`valuesPath`の一致で決め、appの`valuesPath`が`helm.chart[]`に
    無ければエラーにする」方針を確認のうえ実装
    - `src/types.ts`: `ImageTagTarget`から`helmBranchAnchor`を削除し`imageTagAnchor`を
      `anchor`にリネーム。`HelmTargetBranchTarget.anchorName`も`anchor`にリネーム
      （`apps[].chart[].anchor`と`helm.chart[].anchor`で同じフィールド名に統一）
    - `src/lib/config.ts`: `HelmConfigSchema`を配列から単一オブジェクト（`branchToSync`+
      `chart[]`）に戻し、`resolveHelmTargetBranch()`を`valuesPath`一致によるマッチングに
      書き換え（appの`chart[].valuesPath`がすべて`helm.chart[]`でカバーされていない場合、
      未カバーのvaluesPathとapp名を含む例外をスロー）
    - `src/steps/build-plans.ts`・`src/lib/gitlab/gitlab.ts`のフィールド参照を`anchor`に追従
    - `test/helpers.ts`・`test/lib/config.test.ts`（helmTargetBranch関連のdescribeブロックを
      新設計に全面書き換え）・`test/steps/build-plans.test.ts`・`test/steps/apply-updates.test.ts`・
      `test/lib/gitlab/gitlab.test.ts`のフィクスチャを追従
    - `config-test/yadokari-smoke-test-chart/`の手動検証用フィクスチャ、`README.md`/
      `docs/requirements.md`/`docs/architecture.md`/`docs/glossary.md`を新設計に更新
    - `config/teamA-chart/tenantId1/clientId1/apps.yaml`自体はユーザーが既に新設計の内容で
      書いていたため変更不要（`multi-service-app`用の`multiServiceAppTargetBranch`アンカーも
      ユーザー自身が追記済み）
    - `pnpm check`（248テスト）通過
- **T-017検討・撤回**: chart構造（`valuesPath`+`anchor`）を`apps.yaml`から新設の`chart-targets.yaml`
  （`<tenantId>/<clientId>`ディレクトリ配下、`projectId`をキーとするマップ）へ分離する設計を
  一度実装（`src/lib/config.ts`に`ChartTargetsYamlSchema`・`loadChartTargets()`・
  `resolveAppChart()`を追加、`apps.yaml`側を運用値のみに削減、`pnpm check`251テスト通過まで確認）
  したが、ユーザーへの評価報告で「`projectId`キーだけで読み解くのはやや難しいかもしれない」と
  指摘があり、直前の状態（T-016完了時点、`helm.chart[]`独立リスト＋`valuesPath`一致方式を
  apps.yaml内で完結させる設計）へ差し戻した。`src/lib/config.ts`・`src/types.ts`のdocコメント・
  `test/lib/config.test.ts`・`README.md`/`docs/requirements.md`/`docs/architecture.md`/
  `docs/glossary.md`・`config/teamA-chart/tenantId1/clientId1/apps.yaml`・
  `config-test/yadokari-smoke-test-chart/tenant1/client1/apps.yaml`をT-016完了時点の内容に復元し、
  新設した`chart-targets.yaml`（2ファイル）は削除。`tasks.json`のT-017エントリも削除し、
  このセッションの試行錯誤は`progress.md`のこの記述のみに残す
- **T-016（差し戻し後の状態）を実機で再検証**: 一時スクリプトから`buildPlans()`を直接呼び出し、
  gitlab.com上の`yadokari-smoke-test-chart`（`charts/anchor-app/values.yaml`）+
  `sample-qa-sprint`に対して`DRY_RUN`相当（`dryRun: true`）で検証。
  `chart[].anchor`（イメージタグ）は現在値`main-build-at-20260903-171213`から最新タグ
  `main-build-at-20260903-172148`への差分を正しく検出。`helm.chart[]`（独立リスト、
  `valuesPath`一致でapp単位に振り分け）は既存の`smokeTestTargetBranch`アンカーの現在値
  `release/2025-q4`と設定値`main`の差分を正しく検出。いずれも書き込みは発生していない
  （`dryRun: true`のため）。一時スクリプトは検証後に削除、テスト用GitLabリソースは変更なし
- **T-017完了**: 前回撤回した`chart-targets.yaml`案（`projectId`をマップキーにする形式）に
  代えて、ユーザーから具体的なファイル名・スキーマ形状の指定を受けて再実装
  - `apps.yaml`を`config.yaml`にリネーム（`git mv`）し、運用値のみに削減
  - `config.yaml`と同じ`<tenantId>/<clientId>`ディレクトリに`anchor-setting.yaml`を新設。
    `projectId`をマップキーにする代わりに、`apps: [{projectId, projectName, chart: [...]}]`
    という自己完結した配列要素の形式にした（`anchor-setting.yaml`単体を見てもどのappの
    設定か分かるようにするため）。`helm`は`helm: [{chart: [...]}]`という配列表記
  - `src/lib/config.ts`に`validateProjectLinkage()`を新設し、`config.yaml`と
    `anchor-setting.yaml`の紐づけを3方向で検証: (a) `config.yaml`の各appに対応する
    `anchor-setting.yaml`側エントリが無ければ例外、(b) 逆に`anchor-setting.yaml`に
    `config.yaml`側に存在しない孤児エントリがあれば例外、(c) 同じ`projectId`なのに
    `projectName`が食い違っていれば例外
  - `resolveHelmTargetBranch()`は`config.yaml`の`helm.branchToSync`と`anchor-setting.yaml`の
    `helm[0].chart`を別引数で受け取り、`valuesPath`一致でapp単位に振り分ける方式を維持
  - `config/teamA-chart/tenantId1/clientId1/`・`config-test/yadokari-smoke-test-chart/tenant1/client1/`
    双方を新構成に更新
  - `test/lib/config.test.ts`を全面書き換え（`writeConfigYaml()`/`writeAnchorSettingYaml()`
    ヘルパーを新設、孤児設定・`projectName`不一致の新規テストケースを追加、37テスト）
  - `src/types.ts`のdocコメント・`README.md`/`docs/requirements.md`/`docs/architecture.md`/
    `docs/glossary.md`を新構成に更新（`docs/glossary.md`には前回`chart-targets.yaml`案を
    撤回した経緯も記録）
  - `pnpm check`（254テスト）通過。gitlab.com実機（`CONFIG_PATH=config-test DRY_RUN=true`）で
    新しい`config.yaml`/`anchor-setting.yaml`構成から`loadConfig()`が正しく読み込み・
    整合性検証を通過し、実際のGitLab APIへ到達することを確認（既存のオープン中MRにより
    `SKIPPED`。values.yamlへのanchor書き込みロジック自体は本タスクで変更していないため、
    直近の`buildPlans()`直接検証結果がそのまま有効）
- **T-017追記**: ユーザーが`config/teamA-chart/tenantId1/clientId1/anchor-setting.yaml`を
  手動で修正し、`helm`を`[{chart: [...]}]`という配列表記から`{chart: [...]}`という単純な
  オブジェクトに変更。実装をそれに追従させた
  - `src/lib/config.ts`の`AnchorSettingYamlSchema.helm`を`z.array(AnchorSettingHelmSchema)
.length(1)`から`AnchorSettingHelmSchema.optional()`に変更し、`loadAnchorSetting()`の
    `parsed.helm?.[0]?.chart`を`parsed.helm?.chart`に変更
  - `resolveHelmTargetBranch()`・エラーメッセージ・`src/types.ts`のdocコメントの
    `helm[0].chart`表記を`helm.chart`に統一
  - `test/lib/config.test.ts`のhelm関連テストのYAML文字列を配列表記からオブジェクト表記に
    修正し、配列であることが前提だった「helmが2件以上指定されると例外をスローする」テストは
    削除（オブジェクトなので複数指定という概念自体が無くなったため、253テスト）
  - `README.md`/`docs/requirements.md`/`docs/architecture.md`/`docs/glossary.md`の
    `helm[0].chart`表記を`helm.chart`に修正
  - `pnpm check`（253テスト）通過。`pnpm lint:validate-config`で実configが新スキーマで
    読み込めることを確認。`CONFIG_PATH=config TARGET_CHART_DIR=teamA-chart DRY_RUN=true`で
    実行し、設定パース段階でエラーが出ず実際のGitLab APIまで到達することを確認
    （`config/teamA-chart/`はprojectId 888等の架空プロジェクトのため404 Project Not Foundで
    ERRORになるが、これは想定通りでconfig解析の問題ではない）
- **T-017追記2**: `chart.yaml`/`config.yaml`/`anchor-setting.yaml`という3ファイルの命名が
  紛らわしいという指摘を受け、命名候補を4案提示（`tracking.yaml`+`write-targets.yaml`案、
  `sync.yaml`+`anchors.yaml`案、3ファイル全改名の体系的な案、`app-`プレフィックスで揃える案）。
  ユーザーは「`anchor-setting.yaml`を`anchors.yaml`に変えるだけでいい」と、`chart.yaml`・
  `config.yaml`は据え置きの最小変更を選択
  - `git mv`で`anchor-setting.yaml`→`anchors.yaml`にリネーム（`config/teamA-chart/tenantId1/clientId1/`・
    `config-test/yadokari-smoke-test-chart/tenant1/client1/`の両方）
  - `src/lib/config.ts`の識別子もファイル名に合わせて統一: `AnchorSettingYamlSchema`→
    `AnchorsYamlSchema`、`AnchorSettingAppSchema`→`AnchorsAppSchema`、`AnchorSettingHelmSchema`→
    `AnchorsHelmSchema`、型`AnchorSettingApp`→`AnchorsApp`、型`AnchorSetting`→`Anchors`、
    `loadAnchorSetting()`→`loadAnchors()`、変数`anchorSetting`→`anchors`、`anchorSettingPath`→
    `anchorsPath`
  - `test/lib/config.test.ts`の`writeAnchorSettingYaml()`ヘルパーを`writeAnchorsYaml()`に
    リネームし、ファイルパス・テストタイトルの文字列も追従（36テスト）
  - `README.md`/`docs/requirements.md`/`docs/architecture.md`/`docs/glossary.md`/`src/types.ts`の
    `anchor-setting.yaml`表記を`anchors.yaml`に一括置換し、ディレクトリ構成図のコメント位置が
    ずれた箇所（README.md/docs/requirements.md）のインデントを手動で整列
  - `progress.md`/`tasks.json`の過去の記述は当時の名前のまま残し、履歴として保持（このエントリ
    自体は新しい名前で記述）
  - `pnpm check`（253テスト）通過。`pnpm lint:validate-config`で実configが新ファイル名で
    読み込めることを確認。`CONFIG_PATH=config-test DRY_RUN=true`で実行し、gitlab.com実機に
    対して設定パースからAPI呼び出しまで問題なく到達することを再確認
- **表記ゆれ監査＋「chartグループ」の撤廃**: ユーザーから「リポジトリ全体を見渡してリファクタ
  リング・表記ゆれの課題を洗い出してほしい」との依頼を受け、forkでCLAUDE.mdの規約を基準に
  `src/`・`test/`・`docs/`・ルート設定ファイルを監査。Standards違反は0件、ソフトな指摘2件
  （`utils/cache.ts`の`getOrFetch()`が`undefined`を正当な値に持つ型だと機能しない潜在的な穴、
  `validateProjectLinkage()`の引数型インライン重複）のみで、直近3回のconfig.yaml/anchors.yaml
  まわりの設計変更にコード・テスト・ドキュメント間の更新漏れは無いことを確認
  - 監査を踏まえてユーザーから「chartグループという単語はなくしてもらいたい。chartAndApps
    になったし」と指摘。型`ChartAndApps`への改名後も日本語プロースでは「chartグループ」が
    `CLAUDE.md`・コードコメント・ドキュメント全般で使われ続けていた表記ゆれ
  - 置き換え先候補（`chart単位`/`chartAndApps`型名そのまま/`chartリポジトリ`に統合）を提示し、
    ユーザーは型名をそのまま使う`chartAndApps`を選択
  - `chartグループ`の生きている用例41箇所（`README.md`・`docs/requirements.md`・
    `docs/architecture.md`・`docs/glossary.md`・`src/main.ts`・`src/types.ts`・
    `src/steps/{filter-targets,build-plans,apply-updates}.ts`・
    `test/steps/{build-plans,filter-targets}.test.ts`）を`chartAndApps`に一括置換。
    `tasks.json`/`progress.md`の過去のエントリは履歴としてそのまま残した（`CLAUDE.md`・
    `docs/requirements-grilling.md`は元々この語を使っていないため対象外）
  - `docs/glossary.md`の「chartリポジトリ / chartグループ」表記ゆれエントリ（この語の使い分け
    自体を解説する箇所）は機械置換だけでは自己言及的に不自然になるため手動で書き直し、
    「表記ゆれ（解消済み）」として今回の撤廃の経緯を記録。`ChartUpdateTarget`の定義文にあった
    `chartAndApps`の二重表記（`1chartAndApps分の更新内容（chartAndApps＋...)`）も
    「対象を表す`chartAndApps`フィールド」と言い換えて解消
  - `pnpm check`（253テスト）通過
- **`src/steps/build-plans.ts`の分割**: ユーザーから「395行と長いので、stepを分割して
  ファイルを分けたりlib/utilsに移せるか検討してほしい」と依頼された
  - `lib/`/`utils/`への移動は該当なし: 中の非公開関数（`resolveLatestTag()`・
    `applyImageTagTarget()`・`applyHelmTargetBranchTarget()`・`buildFileUpdates()`・
    `buildChartUpdate()`）はいずれも呼び出し元がbuild-plans.ts（またはその内部）1箇所だけで、
    CLAUDE.md原則2「複数箇所から呼ばれない限りlib/には置かない」に照らすと昇格理由が無い
  - ファイル分割は実施。`steps/build-plans/`ディレクトリを新設し、非公開関数を関心ごとに
    4ファイルへ分離: `resolve-latest-tag.ts`（最新タグ判定・タグ自動作成）・
    `image-tag-target.ts`（イメージタグの差分検出・書き換え）・
    `helm-target-branch-target.ts`（Helm向き先ブランチの差分検出・書き換え）・
    `chart-update.ts`（上記3つを束ねてchartAndApps単位の更新計画を組み立てる
    `buildChartUpdate()`）。`build-plans.ts`本体は395行→97行に縮小し、`buildPlans()`・
    `describePlan()`・`buildPlanForChartAndApps()`のみを残した
  - この分割は「呼び出し元がsteps/の1ファイルだけ→そのファイル内の非公開関数」という
    既存原則をファイル単位からディレクトリ単位に広げる新パターンのため、`CLAUDE.md`
    （原則2の注記）・`docs/architecture.md`（各ファイルの責務・新しいコードを置く場所の
    判断基準の両方）を更新し、今後同様に長くなったstepがあれば同じ手法を使えるようにした
  - 型の受け渡しは`import type`で解決（`LoadValuesYamlContent`型を`chart-update.ts`から
    `image-tag-target.ts`/`helm-target-branch-target.ts`へ型のみインポートし、実行時の
    循環参照は発生しない）
  - `test/steps/build-plans.test.ts`は元々`buildPlans()`という公開APIのみをテストしており
    （CLAUDE.mdのテスト方針どおり）、内部ファイル分割の影響を受けないため変更不要
  - `pnpm check`（253テスト）通過。`pnpm build`でdist/への出力も確認。
    `CONFIG_PATH=config-test DRY_RUN=true`でgitlab.com実機に対しても再確認
- **`steps/build-plans/`を`steps/sub-steps/build-plans/`へ改称**: `steps/build-plans/`が
  `steps/build-plans.ts`と隣接していて紛らわしく、「サブステップ感のある名前にできないか」と
  指摘された。候補（`build-plans-substeps/`等）を提示する前にユーザーから直接
  「sub-steps/build-plans かな」と指定があり、`steps/sub-steps/<step名>/`という汎用パターンを
  採用（将来他のstepが同様に肥大化した場合も同じ場所に置ける）
  - 4ファイル（`resolve-latest-tag.ts`・`image-tag-target.ts`・`helm-target-branch-target.ts`・
    `chart-update.ts`）を`steps/build-plans/`から`steps/sub-steps/build-plans/`へ移動
    （未コミットの新規ファイルだったため`git mv`ではなく`mv`）。1階層深くなった分、
    各ファイル内の相対import（`../../lib/...`等）を`../../../lib/...`等に修正。
    `build-plans.ts`側のimportも`./build-plans/chart-update.js`→
    `./sub-steps/build-plans/chart-update.js`に修正
  - `CLAUDE.md`・`docs/architecture.md`の該当箇所（新しいコードを置く場所の判断基準、
    各ファイルの責務）を新パスに追従
  - `dist/`に前回ビルドの`build-plans/`ディレクトリが残っていたため`rm -rf dist && pnpm build`
    でクリーンビルドし直し、`dist/src/steps/sub-steps/build-plans/`のみになることを確認
  - `pnpm check`（253テスト）通過。`CONFIG_PATH=config-test DRY_RUN=true`で実機再確認
- **`build-plans.ts`のオーケストレーションを可視化**: 3ステップ構成は維持でいいか、それとも
  stepsを増やして再構築すべきかを相談したところ、ユーザーからは「3ステップ維持でいいが、
  build-plansがまだ複雑。build-plansが各サブステップを呼ぶ構成にして流れがパッと理解できる
  ものにしてほしい」と指摘された
  - それまでは`build-plans.ts`→`sub-steps/build-plans/chart-update.ts`（隠れた
    オーケストレーター、`buildChartUpdate()`/`applyAppToChartUpdate()`/`buildFileUpdates()`を
    保持）→3つのサブステップ、という2段の間接参照になっており、`build-plans.ts`を読むだけでは
    実際の処理の流れが追えなかった
  - `chart-update.ts`を削除し、その中身（`buildChartUpdate()`・`applyAppToChartUpdate()`・
    `buildFileUpdates()`・`BuildChartUpdateAcc`型）を`build-plans.ts`本体へ統合。
    `build-plans.ts`が`resolveLatestTag()`・`applyImageTagTarget()`・
    `applyHelmTargetBranchTarget()`の3サブステップを直接importして呼ぶ構成にし、
    「どういう順番で何を呼ぶか」が1ファイルを読むだけで分かるようにした
  - サブステップ間で共有していた`LoadValuesYamlContent`型は、どちらのサブステップにも
    属さない共有インターフェースとして`sub-steps/build-plans/types.ts`に切り出した
    （`chart-update.ts`が無くなったことで置き場所が必要になったため）
  - `build-plans.ts`は97行→269行に増えたが（`chart-update.ts`の171行を吸収したため）、
    隠れた中間層が無くなり流れが1ファイルで完結するようになった。`sub-steps/build-plans/`
    配下は`resolve-latest-tag.ts`・`image-tag-target.ts`・`helm-target-branch-target.ts`・
    `types.ts`の4ファイル（純粋な「1箇所分の差分チェック・書き換え」ワーカーのみ）に整理された
  - `CLAUDE.md`・`docs/architecture.md`を新しい役割分担（オーケストレーションは
    build-plans.ts側、実処理はsub-steps側）に合わせて更新
  - `pnpm check`（253テスト）通過。`rm -rf dist && pnpm build`でクリーンビルドし
    `dist/src/steps/sub-steps/build-plans/`の中身を確認。`CONFIG_PATH=config-test
DRY_RUN=true`で実機再確認

- **`build-plans.ts`をさらに「処理単位」で分割**: 「3ステップ維持でよいが、build-plansが
  まだ複雑」の対応後も、ユーザーから「もっと処理の単位を意識したstep/sub-stepに整理して、
  塊ごとに処理が行われていることが10秒でわかるようにしたい」と再度指摘された
  - `Config → ChartAndApps[] → AppConfig[] → ImageTagTarget[]/HelmTargetBranchTarget[]`という
    ドメイン階層に合わせ、「全chartAndApps」「1つのchartAndApps」「1つのapp」「1箇所（target）」
    という4段の処理単位をファイル境界にも反映させる方針にした。従来は`build-plans.ts`が
    「chartAndApps・app・target」の3段すべてを1ファイルで抱えていた
  - `build-plans.ts`は「全chartAndApps・1つのchartAndApps」の2段だけに絞り、`buildPlans()`
    （並列振り分け）・`buildPlanForChartAndApps()`（SKIPPED/ERROR/apply判定）・
    `buildChartUpdate()`（1chartAndApps配下の全appを順に処理）・`buildFileUpdates()`・
    `describePlan()`のみを残した
  - 新設した`sub-steps/build-plans/app-update-plan.ts`の`buildAppUpdatePlan()`が「1アプリ分」
    の処理単位を担当。手順を(1)`resolveLatestTag()`(2)`applyImageTagTargets()`
    (3)`applyHelmTargetBranchTargets()`(4)差分0件ならSKIPPED、あれば`AppUpdatePlan`化、
    という4行だけで追えるようにした
  - `image-tag-target.ts`/`helm-target-branch-target.ts`は「1箇所（target）分」の非公開関数
    （`applyImageTagTarget`/`applyHelmTargetBranchTarget`）はそのまま維持しつつ、新たに公開の
    複数形ラッパー（`applyImageTagTargets`/`applyHelmTargetBranchTargets`）を追加し、targetの
    配列を`reduce`で回す責務も同じファイルに閉じ込めた。呼び出し元（`app-update-plan.ts`）は
    複数形の関数を1回呼ぶだけでよくなり、target配列をループするコードは`app-update-plan.ts`から
    完全に消えた
  - `BuildChartUpdateAcc`型は`build-plans.ts`・`app-update-plan.ts`の2箇所から参照される
    共有インターフェースのため`sub-steps/build-plans/types.ts`へ移動（既存の
    `LoadValuesYamlContent`型と同居）
  - 作業中、`build-plans.ts`が意図せずディスク上でセミコロン付きスタイルに変わり、かつ
    `buildPlanForChartAndApps()`が`process()`（`main.ts`の実際のオーケストレーター関数と
    衝突する名前）にリネームされている状態を検出。自分の変更ではなかったためユーザーに確認し、
    「意図した変更ではない、破棄していい」との回答を得てから上書きした
  - `CLAUDE.md`は変更なし（原則の記述は元々ファイル単位ではなく抽象的なため据え置きで正確）。
    `docs/architecture.md`の`build-plans.ts`節を新しい4段構成の説明に書き換え
  - `pnpm check`（253テスト）通過。`rm -rf dist && pnpm build`でクリーンビルドし
    `dist/src/steps/sub-steps/build-plans/`に`app-update-plan.js`含む5ファイルが
    生成されることを確認。`CONFIG_PATH=config-test DRY_RUN=true`で実機再確認
    （既存のオープン中MRにより`filterTargets`で`SKIPPED`。設定読み込み〜GitLab API疎通までは
    到達を確認、`buildPlans()`内部の新構成自体は253テストで担保）

- **T-018完了**: タグ命名規則を`TAG_FORMAT`環境変数で設定可能にした（元は固定フォーマット、
  `docs/requirements-grilling.md`7ラウンド目で確定していたものを再検討）
  - ユーザーからの依頼「ブランチ由来のタグの形式を決め打ちではなく設定可能にできるか」を受けて
    /askで2点を確認: (1) 設定の粒度はapp単位（config.yaml）か全体で1つ（環境変数）か →
    「全体で1つの環境変数」を選択（branchToSyncのようなapp単位設定にはしない）。
    (2) 柔軟性のレベルは既存タグ解析専用の正規表現か、新規タグ作成にも使えるテンプレート
    文字列か → 「テンプレート文字列でプレースホルダ差し替え」を選択
  - `src/types.ts`に`TagFormat`ブランド型・`toTagFormat()`を追加
  - `src/lib/gitlab/tag.ts`を全面改修: `DEFAULT_TAG_FORMAT`（`"{branch}-build-at-{date}-{time}"`）・
    `validateTagFormat()`（`{branch}`/`{date}`/`{time}`をちょうど1回ずつ含むか検証、未知の
    プレースホルダは拒否）を新設。`buildTagPrefix()`を削除し、`buildNewTag()`/`parseTag()`/
    `findLatestParsedTag()`は第3引数`format: TagFormat`を取る形に変更。`parseTag()`は
    名前付きキャプチャグループ（`(?<date>...)`/`(?<time>...)`）でプレースホルダの並び替えに
    対応し、`{branch}`はテンプレート中の位置に関わらずリテラル一致させる
  - `src/lib/env.ts`に`parseTagFormat()`（未指定時は`DEFAULT_TAG_FORMAT`を適用して
    `validateTagFormat()`に委譲）と`TAG_FORMAT`定数を追加。タグ命名規則の検証ロジック自体は
    `lib/gitlab/tag.ts`側の責務として保ち、`env.ts`は未指定時のデフォルト適用のみ担当
    （`lib/`同士の依存は原則2の対象外）
  - `tagFormat`を`resolve-latest-tag.ts`→`build-plans.ts`（`buildAppUpdatePlan`/`buildPlan`/
    `process`/`buildPlans`）→`main.ts`まで明示的な引数として貫通（他の環境変数と同じ
    明示引数渡しのスタイルに統一し、デフォルト引数は使わない）
  - `test/lib/gitlab/tag.test.ts`（`validateTagFormat`の正常系・異常系6件、カスタム
    フォーマットでの`parseTag`/`buildNewTag`のテストを追加、`buildTagPrefix`のテストは削除）・
    `test/lib/env.test.ts`（`parseTagFormat`の3テスト追加）・`test/steps/build-plans.test.ts`
    （カスタムフォーマットを渡すと`createTag`/`latestTag`がその形式になることを確認する
    1テストを追加、既存の全`buildPlans()`呼び出しに`DEFAULT_TAG_FORMAT`引数を追加）・
    `test/main.test.ts`の`env.js`モックに`TAG_FORMAT`を追加
  - `README.md`（タグ命名規則節に説明と運用注意点、環境変数表・CI/CD変数表）・`.env.example`・
    `.gitlab-ci.yml`（`spec.inputs.TAG_FORMAT`・`variables.TAG_FORMAT`）・
    `docs/requirements.md`（4.1節）・`docs/requirements-grilling.md`（新ラウンドとして
    設定粒度・柔軟性レベルの決定経緯を記録）・`docs/glossary.md`・`docs/architecture.md`
    （`tag.ts`の説明）を更新
  - `pnpm check`（264テスト）通過。運用注意点として、フォーマットを運用途中で変更すると
    過去に作成済みのタグが追跡ブランチ由来のタグとして認識されなくなる旨をREADMEに明記
  - 未実施: gitlab.com実機での動作確認（コード変更のみでこのセッションは完了、次回以降に
    やるなら`TAG_FORMAT`にカスタム値を指定した`DRY_RUN=true`実行で確認するとよい）

- **T-019完了**: MRを出す単位を「chartリポジトリ単位」から「(chartリポジトリ, tenantId,
  clientId)単位（clientIdごと）」に変更する要件を`/grilling`3ラウンドで確定
  （実装は別タスクに切り出し、本タスクは要件定義のみで完了）
  - ユーザー提案「MRを出す単位をclientIdごとにしようと思うんだけどどうかな?」を受け、
    まず動機を確認: 「マージしたいclientと保留したいclientがいそう」＝クライアントごとに
    独立してマージ判断・保留できるようにしたい
  - 現状（`config/teamA-chart/tenantId1/clientId1/`等）はどのchartディレクトリも
    tenantId/clientIdが1組しかなく、この変更をしても既存の実例の挙動は変わらない
    （将来1つのchartリポジトリに複数クライアントが乗る運用への備え）
  - 確定事項: (1) MRの粒度を`(chartディレクトリ, tenantId, clientId)`単位に変更。
    (2) ブランチ名を`yadokari/update`固定から`feature/yadokari/<tenantId>/<clientId>`に変更。
    (3) tenantId/clientIdの文字種バリデーションは追加せず既存のERROR方針に委ねる。
    (4) MRタイトルを`Auto MR by yadokari: update ${tenantId}/${clientId} ${N} app image
tag(s)`に変更。(5) オールオアナッシングの範囲をchartリポジトリ全体→そのクライアント内の
    全アプリに縮小（本変更の主目的）。(6) 既存MRオープン中のスキップ判定もクライアント単位に。
    (7) 異なるclientが同じvalues.yamlを共有するケースは既知の制限としてドキュメントに明記の
    みで追加チェックはしない。(8) `CONCURRENCY_LIMIT`の意味を「chartリポジトリの同時処理数」
    →「`(chartディレクトリ, tenantId, clientId)`単位の同時処理数」に定義し直し、2段階の
    同時実行数制御は導入しない。(9) 同じtenantId/clientIdが複数chartディレクトリにまたがる
    ケースは従来から別MRだったため影響なし
  - `docs/requirements-grilling.md`に新ラウンド「MRの分割単位をtenantId/clientId単位に
    変更（T-019）」として記録。`docs/requirements.md`の2.1節・用語表（テナント/クライアント
    行）・4.2節（更新ワークフロー全面書き換え）・4.3節（オールオアナッシング範囲・並列実行数の
    定義）を更新
  - コード実装は未着手。`docs/glossary.md`・`docs/architecture.md`（現在のコードの実装を
    説明するドキュメントのため）も未更新のまま据え置き、実装タスクで一緒に更新する方針
    （T-013→T-016の進め方を踏襲）

- **T-020完了**: T-019で確定した要件を実装
  - `src/types.ts`: `TenantId`/`ClientId`ブランド型（`toTenantId`/`toClientId`）を新設し、
    `ChartAndApps`に`tenantId`/`clientId`フィールドを追加（JSDocも「MRを作成する単位」に更新）
  - `src/lib/config.ts`: `loadApps()`を`loadClientChartAndApps()`にリネーム・全面改修し、
    tenantId/clientIdごとに独立した`ChartAndApps`を1件返す形に変更（以前はchartDir配下の
    全tenantId/clientIdを1つの`apps`配列に集約していた）。`config.yaml`が存在しない
    tenant/clientディレクトリからは`ChartAndApps`自体を作らないようにした（以前は空`apps`の
    `ChartAndApps`を1件作っていた）。`loadConfig()`も`flatMap`ベースに書き換え
  - `src/lib/gitlab/gitlab.ts`: `UPDATE_BRANCH`定数（固定値`yadokari/update`）を削除し、
    `buildUpdateBranch(tenantId, clientId)`関数（`feature/yadokari/<tenantId>/<clientId>`）に
    置き換え。`buildMrTitle()`に`tenantId`/`clientId`引数を追加し、タイトルを
    `Auto MR by yadokari: update ${tenantId}/${clientId} ${N} app image tag(s)`に変更
  - `src/steps/filter-targets.ts`・`apply-updates.ts`・`build-plans.ts`: `logContext`に
    `tenantId`/`clientId`を追加。ブランチ名は`buildUpdateBranch()`経由で取得するよう変更
  - `test/helpers.ts`の`makeChartAndApps()`に`tenantId`/`clientId`（デフォルト`tenantId1`/
    `clientId1`）と`overrides`引数を追加
  - `test/lib/config.test.ts`: 複数tenant/clientの集約テストを「別々の`ChartAndApps`になる」
    に書き換え、target絞り込みテストを新しい粒度に合わせて修正、`config.yaml`不在テストを
    「`ChartAndApps`自体が作られない」ことの確認に変更（6テスト修正）
  - `test/lib/gitlab/gitlab.test.ts`: `UPDATE_BRANCH`→`buildUpdateBranch`のテストに置き換え、
    `buildMrTitle`のテストに`tenantId`/`clientId`引数を追加
  - `test/steps/apply-updates.test.ts`: `vi.mock`の自動モック化で`buildUpdateBranch`/
    `buildMrTitle`もモック関数になり戻り値が`undefined`になっていたのを、
    `vi.mocked().mockReturnValue()`で明示的にスタブして修正。ブランチ名アサーションを
    `feature/yadokari/tenantId1/clientId1`に更新
  - `test/steps/filter-targets.test.ts`: `buildUpdateBranch`のモック実装を追加し、
    tenantId/clientIdを含むブランチで判定することの確認テストと、「同じchartリポジトリでも
    異なるclientは独立して判定される（片方にオープン中MRがあっても他方はブロックしない）」
    ことを確認する新規テストを追加
  - `README.md`（Features・仕組みのmermaid図と説明文・実行ログ例・環境変数表・
    エラーハンドリング表）・`.gitlab-ci.yml`（`CONCURRENCY_LIMIT`の説明文言）・
    `docs/architecture.md`（`gitlab.ts`/`config.ts`の責務説明、`loadApps`→
    `loadClientChartAndApps`のリネーム反映、別セッションからの古い関数名参照
    `buildChartUpdate()`→`buildPlan()`も合わせて修正）・`docs/glossary.md`（「固定ブランチ」
    「テナント/クライアント」項目を新設計に更新）を更新
  - `pnpm check`（tsc/oxlint/oxfmt/vitest 266テスト）通過
  - 未実施: gitlab.com実機での動作確認。1つのchartディレクトリ配下に複数tenantId/clientIdを
    持つテスト用config構成が必要（現状の実例はどこも1chartDirにつき1組のみ）

- **T-021完了**: 固定ブランチの再作成漏れバグを修正
  - ユーザー指摘: 「T-015はもはや問題ないんじゃないか。定期実行後に手動実行したくなったら
    定期実行されて作られたMRを閉じればいいから」。ただし「MRをクローズしてもブランチが
    残り続ける仕様になっているなら、MRは存在しないけどブランチが存在する場合は削除する
    仕様にしたい」という追加要望
  - 調査の結果、`docs/requirements.md`には元々「マージまたはクローズされた後の実行で、
    改めて固定ブランチを作り直しMRを作成する」と明記されていたが、実装
    （`commitFileUpdates()`）はブランチが存在する場合は削除せず追加コミットを積むだけに
    なっており、要件と実装が食い違っていた（T-012の頃からの積年のバグ）
  - `src/lib/gitlab/gitlab.ts`に`deleteBranch()`（`gitlab.Branches.remove()`のラッパー）を
    新設。`commitFileUpdates()`を全面改修し、呼び出し元（`filterTargets`）が「このブランチに
    オープン中のMRが無い」ことを確認済みという前提のもと、ブランチが存在すれば無条件で
    削除してから`baseBranch`を起点に作り直すよう変更
  - ファイルごとのaction（create/update）判定も、ブランチを必ず作り直す前提のため常に
    `baseBranch`基準に単純化（従来の`exists ? branch : baseBranch`という参照先ブランチの
    出し分けロジックを削除）。commit時の`startBranch`オプションも常に指定するよう単純化
  - `test/lib/gitlab/gitlab.test.ts`の`commitFileUpdates`テストを新仕様に書き換え（3テストに
    再編）、`deleteBranch`単体のテストを追加
  - `docs/requirements.md` 4.2節・`docs/requirements-grilling.md`（新ラウンド）・
    `docs/architecture.md`（`gitlab.ts`の責務説明。ついでに前セッションの編集でoxfmtの
    多段階整形により3階層ネストのリストが1階層に潰れて壊れていたのを修正）・
    `docs/glossary.md`（「固定ブランチ」項目）を更新
  - `pnpm check`（267テスト）通過。マージ済み・クローズ済みのどちらも同じ扱い（無条件で
    削除）でよいと判断：マージ済みなら変更は既に`mrTargetBranch`に取り込まれているため
    削除は無害、クローズ済みなら人間が明示的に却下した変更なので復元不要
- **T-015クローズ**: ユーザー判断によりコード変更なしでクローズ。「もはや問題ないんじゃ
  ないか。定期実行後に手動実行したくなったら、定期実行されて作られたMRを閉じればいいから」
  との指摘どおり、T-021で「MRが存在せずブランチが存在する場合は削除する」仕様を実装した
  ことで、MRを閉じれば次回実行時に固定ブランチが自動的に削除・作り直されるようになった。
  定期実行と手動実行が同じブランチに混ざる懸念は「先に該当MRを閉じる」という運用でカバー
  できると判断し、手動/定期実行を区別する仕組み自体は導入しないことで決着。`tasks.json`の
  T-015を`done`に更新

## 完了したこと（T-038〜T-053 のセッション）

**200行超ファイルの整理（3回目の監査で登録した4件）**

- **T-044完了**: `lib/gitlab/gitlab.ts`（364行）をAPIラッパー（214行）と
  `lib/gitlab/mr-content.ts`（165行、外部I/Oなし）に分割。`buildMrDescription()` は
  GitLabクライアントではなく `ResolveWebUrl = (projectId) => Promise<GitLabUrl>` を受け取り、
  `apply-updates.ts` が `getProjectWebUrl` を注入する（T-027と同じ関数型注入）
- **T-045完了**: `lib/config.ts`（380行）を `lib/config/` の4ファイルへ
  （config.ts 163 / schema.ts 93 / validate.ts 97 / helm-target-branch.ts 51）
- **T-046完了**: `lib/verify-config.ts`（227行）を `lib/verify-config/` へ。
  100行あった `verifyChartAndApps()` を約40行にし、app単位を `verifyApp()` に切り出した。
  キャッシュ層は `newRemoteCache(gitlab)` が `hasProject`/`hasBranch`/`loadValuesYaml` を返す形にし、
  `gitlab`・`caches` の引き回しを廃止（`verifyTarget` は8引数→3引数）
- **T-047完了**: `types.ts`（267行）からブランド型11個を `types/brand.ts` へ。
  `export * from "./types/brand.js"` の再エクスポートで25ファイルのimportは無変更
- **T-041完了**: テスト3ファイルを src/ の構成に合わせて分割。
  `test/lib/config.test.ts`（938行）→ `test/lib/config/` 4ファイル＋`fixture.ts`（`useConfigDir()`）、
  `gitlab.test.ts`（723行）→ gitlab 434行 + mr-content 299行、
  `build-plans.test.ts`（609行）→ 本体172行 + `test/steps/sub-steps/build-plans/` 3ファイル

**2回目の監査で登録した残り**

- **T-040完了**: T-036以降どこからも読まれていなかった `PipelineInfo.status` と
  `PipelineStatus` 型を削除（`PipelineInfo` は `webUrl` のみ）。`isFatalStatus()` を非公開にし、
  テストを `isFatalError()` 経由に寄せた
- **T-039完了**: T-034〜T-037の仕様変更に追従できていなかったドキュメントを同期
  （requirements.md 4.2節のパイプライン状態、README Features、READMEのmermaid図にT-037の分岐、
  glossary.mdの「反映済みタグ」、architecture.mdの`scripts/smoke/`）
- **T-042完了**: `verifyConfigExistence()` の chartAndApps 単位を `mapWithConcurrency()` で並列化
  （`concurrencyLimit` を引数に追加、出力順は入力順のまま）。**並列化で表面化する穴**として、
  `getOrFetch()` が解決済みの値だけをキャッシュするため同時呼び出しで二重fetchすることが分かり、
  Promiseを共有する `getOrFetchShared()`（失敗時はキャッシュから削除）を追加して
  `remote-cache.ts` で使うようにした。逐次のままの2箇所（build-plans・mr-content）は `getOrFetch` のまま
- **T-038完了（ユーザー判断）**: CIの `validate-config-remote` が架空の設定例で必ず失敗する問題を、
  「`config/` には実運用の登録だけを置く」方針で解消。`config/teamA-chart/` を削除し
  `config/README.md`（運用ルール）に置き換えた。記述例は `docs/requirements.md` 4.4節が正典なので
  情報の損失はない。実機で `pnpm lint:validate-config:remote` が終了コード0になることを確認

**build-plans の改善（T-048〜T-053、サブエージェント委譲運用の初適用）**

- **T-051(haiku)**: dryRun時に不要な `getLatestPipelineForRef()` を呼ばないようにした
- **T-052(haiku)**: 失敗ログにアプリ名が出ず原因アプリを特定できなかった問題を解消。
  `steps/shared/step-outcome.ts` に `rethrowWithAppContext()` を追加。**致命的エラーだけは
  包まずそのまま投げる**（`new Error(..., {cause})` で包むと `extractHttpStatus()` が
  ステータスを辿れず FatalError に昇格できなくなるため）
- **T-048(sonnet)**: `readCurrentImageTags()` が読んだ `previousTags` を
  `applyImageTagTargets()` にも渡し、同じアンカーの二重読み取りを解消
- **T-049(sonnet)**: `LatestTagResolution.pointsAtTrackedHead`（クロージャ）を
  `trackedHeadTagNames: ReadonlySet<TagName>`（データ）に置き換え
- **T-050(sonnet)**: `valuesYamlCache` + `modifiedValuesPaths` を `ValuesYamlDraft` 1本に統合。
  詰め替えが消え、`buildFileUpdates()` の internal error も型レベルで不要になった
- **T-053(opus)**: アプリ単位の逐次実行は**現状維持**と決定。読み取りだけの先行並列化は
  技術的には可能だが、削減幅（1アプリ2〜3往復）に対してタグ作成の副作用が並列・前倒しで
  走る代償が大きい。理由と再検討条件を docs/architecture.md に明記

**最終状態**: `pnpm check`（tsc・oxlint・config検証・oxfmt・vitest **28ファイル308テスト**）通過。
`tasks.json` の53タスクはすべて `done` / `passes: true`。

## 完了したこと（T-054〜T-063 のセッション）

### T-063: 追跡ブランチ切り替え時に無駄なタグを作らない（ユーザー指摘）

- 従来は切り替え時、切り替え先のHEADを指す既存タグがあっても**必ず新しいタグを作っていた**。
  根拠は「追跡先が変わったことを values.yaml 上で明示するため」だったが、タグ名には
  `{branch}` が必ず含まれるので、既存タグを書けば名前から読み取れる＝作る必要がなかった
- `branchChanged` ガードを外した結果、`hasTagFromOtherBranch()`・`resolveLatestTag()` の
  `previousTags` 引数・ログの `reason: "tracked_branch_changed"` が**連鎖的に不要**になり削除
- 要件「切り替え前後が同じコミットでも更新する」は、切り替え前のタグ名が現在の追跡ブランチで
  パースできず `trackedHeadTagNames` に入らないことで**自動的に成立**する
- README の図はさらに1ノード減り、「追跡ブランチ由来か」の判定は**設定タグを主語とする
  ノード側**に移した（主語が混ざらない形を維持）

### T-062: コード・ドキュメントからタスク番号を削除

- 33ファイルからタスク番号を削除。**番号が根拠のポインタになっている文は書き直した**
  （例:「T-003で意図的にこのままとする判断」→「意図的にこのままとする判断。理由は前掲の
  『アプリ単位は逐次のまま』参照」、workflow.md の difficulty 表の実タスク例→作業の性質が
  伝わる説明）
- CLAUDE.md のコーディング規約に「コード・ドキュメントにタスク番号を書かない」を追記
- 残存は `tasks.json` / `progress.md` / `docs/history/` の4ファイルのみ（＝番号が識別子として
  機能する対象外ファイル）
- サブエージェントがセッション上限で途中終了したため、残り1件の書き換えと、落ちる前に
  崩れていた3ファイルの整形をメイン側で仕上げた

### T-056: 最新タグ判定の実装（T-055 の決定を反映）

- `resolveLatestTag()` から「全タグの中から名前が最新のものを選んでHEADと比較する」判定
  （`existingTag`/`existingTagCommitSha`）を削除し、**`trackedHeadTagNames` が空でなければ
  その中から選ぶ**方式に変更
- 意図的な振る舞い変更: HEADにタグがあるのに別コミットにより新しい名前のタグがあると
  無駄な新規タグを作っていた問題が解消。この振る舞いを検証するテストを追加
- 決定2はコード変更不要のため回帰テストのみ（並び順違いフォーマット2種）。決定3は到達不能なので実装せず
- テスト4件追加（315→319）。README のmermaid図・Features・エラーハンドリング表、
  docs/glossary.md も新方式に同期

### T-055: タグ命名規則・最新タグ判定の要件を確定（実装は T-056）

調査で分かった事実（要件判断の根拠）:

- `ParsedTag.builtAt` は `findLatestParsedTag()` の比較にしか使われていない（MR本文もログも
  `.name` しか読まない）
- **GitLabの「タグの作成日時」は当てにできない**。`TagSchema.created_at` は optional で、
  軽量タグには付かない。このツールは `Tags.create()` を message 無しで呼ぶ＝軽量タグを作る
- `resolveLatestTag()` が並び順を必要としているのは「最新タグがHEADを指すか」の判定だけ

ユーザー判断:

1. **最新タグ判定を「追跡ブランチ由来でHEADを指すタグを直接探す」方式に変更**。複数該当時は
   タグ名から読んだ日時の降順（いずれも同じコミット＝中身は同じなので決定性のためだけの規則）
2. **TAG_FORMAT は緩めず現状維持**（`{branch}`/`{date}`/`{time}` を各1回必須）。ただし
   「**並び順・区切り文字は任意**」であることを要件とREADMEに明記した。これは実測で
   既に動くことを確認済み（`{date}-{time}-{branch}`・`v{time}_{branch}__{date}` で生成・
   再パース・最新判定が成功）＝**コード変更は不要**
3. 一意化要素が無い場合のタグ作成エラーは、date/time が常に必須である以上**到達不能**なので
   作らない（デッドコードを増やさない）

当初検討したコミット日時ソート案は、上記の事実2により却下。

### T-057: README の冗長な記述を削る

- 393行 → 268行（-125行、約32%）。削ったのは**正典と二重管理だった4ブロック**だけ:
  config/ の3つのYAML例と設定エラー5ケース → `docs/requirements.md` 4.4節、
  タグ命名規則の実装名・非互換の詳細 → 同4.1節、プロジェクト構成ツリーの `src/` 配下の
  責務コメント約35行 → `docs/architecture.md` の責務テーブル、`config-test/` の説明 → 同勘所
- いずれも削除ではなく**要約1〜2文＋正典へのリンク**に置換。正典側に無い情報（mermaid図・
  実行ログ例・CI/CDセットアップ手順・環境変数表・エラーハンドリング表）は残した

### T-061: `src/steps/` をステップ名ディレクトリ構成に変更

- `steps/<step名>/<step名>.ts` に統一し、サブステップは `steps/build-plans/sub-steps/` へ。
  「そのステップからしか呼ばれない」ことを構造で表せるようになった
- `steps/shared/step-outcome.ts` は複数ステップの共有なので据え置き
- test/ も同構成に追従。**テスト件数が315件のまま**であることを確認（移動でファイルが
  vitest の対象から外れる事故の検知）

### T-060: 型定義を `src/types/` に集約

- `src/types.ts` → `src/types/types.ts`（`git mv`。同名のファイルとディレクトリが並ぶ状態を解消し、
  `src/lib/<名前>/<名前>.ts` と同じ形に揃えた）
- `export * from "./brand.js"` の再エクスポートは維持したので、利用側の import の形は不変
- src/test/scripts の35ファイルの相対パスを張り替え。`sub-steps/build-plans/types.ts` への
  ローカル参照（`"./types.js"`）は別ファイルなので据え置き

### T-059: values.yamlの書き込み位置の型を `AnchorTarget` 1つに統一

- `ImageTagTarget` / `HelmTargetBranchTarget`（どちらも `AnchorTarget` の単なるエイリアス）を
  削除。以前は「用途を読み手に伝えるため」意図的に残していたが、ユーザー判断で統一した
- 削除したエイリアスのJSDocは `AppConfig.chart`・`HelmTargetBranchConfig.targets`・
  `ImageTagUpdate.target`・`HelmTargetBranchUpdate.target` のフィールドJSDocへ移送（情報は不変）
- `applyImageTagTarget()` などの**関数名は変更しない**（型名ではなく「何を適用するか」を
  表す名前なので、用途の区別を担う側として残す）

### T-054: `TARGET_CHART_DIR` → `TARGET_CHART` 改名＋誤設定の検知強化

- 環境変数名だけを変更し、値の意味（`config/` 直下のディレクトリ名）と内部の型・フィールド名
  （`ChartDirName`・`ChartAndApps.chartDir`・`ConfigTarget.chartDir`）は据え置き
- **検知の穴を塞いだ**: 以前は「`config/` 直下に無い名前」だけがエラーで、ディレクトリは
  存在するが `chart.yaml` が無い場合や絞り込み結果0件は「0 chart groups」で正常終了していた。
  `loadConfig()` に `isExplicitlyTargeted()` を追加し、`TARGET_CHART`/`TARGET_CLIENT` を
  **明示指定したときに限り**対象0件をエラーにする（未指定時に0件でもエラーにしない既存仕様は
  回帰テストで固定した）
- エラーメッセージに `formatChartDirs()` で実在ディレクトリ名の一覧を添えた

### T-058: アーカイブ運用の整備

`tasks.json`（93KB、`done` 53件）と `progress.md` の肥大化が放置されていた（アーカイブの
移し先だけがあり、いつ移すかのトリガーが無かった）ため、トリガーを明文化し実際にアーカイブした。

- **トリガーの明文化**: `docs/workflow.md`「肥大化したときのアーカイブ」節に、(1)
  セッション開始時に `done` が10件以上ならアーカイブする、(2) 10件未満でも `tasks.json` が
  30KBを超えたら `done` を減らせないか検討する、という具体的な基準を追記。`dependencies` が
  アーカイブ済みタスクIDを指す場合は書き換えず残し、「`tasks.json` に存在しないIDはアーカイブ
  済み＝完了とみなす」ルールも明記した。`CLAUDE.md`「進捗管理とHandoff」の手順1にも、
  セッション開始時にこのトリガーを確認する旨を1〜2行で追記
- **tasks.json → tasks-archive.md**: `done` だった T-001〜T-053 の53件全件を
  `docs/history/tasks-archive.md` へ移した。既存21節（T-004等）は当時の `**タスク**`・
  `**当時のevidence**` を書き換えずに残し、`tasks.json` 側のevidenceを `**evidence**` 行として
  追記（節を循環参照させる「詳細な経緯は…この節を参照」という自己参照の文言のみ削除）。
  節が無かった32件は同じ書式で新設し、`difficulty`/`dependencies` を持つタスクはその行も追加。
  節はT-001から昇順に並べ直した（既存21節も含む）
- **tasks.json のサイズ削減**: 93,137バイト（62件、うちdone 53件）→ 14,211バイト（9件、
  T-054〜T-062のみ、すべて`status: todo`で内容は変更していない）。`docs/history/tasks-archive.md`
  は21節・61,168バイト → 53節・120,229バイトに増えた（情報は移しただけで消していない）
- **情報欠落の確認**: 移動前の `tasks.json` をスクラッチにコピーし、`done` 53件それぞれの
  `task` 本文冒頭20文字と（自己参照を除いた）`evidence` 冒頭20文字が
  `docs/history/tasks-archive.md` に含まれることをスクリプトで突き合わせ、欠落0件を確認
- **progress.md → progress-archive.md**: 旧「完了したこと（このセッション: T-038〜T-047の9件、
  実際の内容はT-038〜T-053）」ブロック（見出し〜「**最終状態**」段落まで）を、見出しを
  「## 完了したこと（T-038〜T-053 のセッション）」に付け替えたうえで内容はそのまま
  `docs/history/progress-archive.md` 末尾へ移した。同ファイルの1行目タイトルも
  「〜T-021」→「〜T-053」に更新。`progress.md` 冒頭のサマリ段落もT-053までアーカイブ済みの
  実態に合わせて書き換えた

**このセッションの最終状態**: `pnpm check`（tsc・oxlint・config検証・oxfmt・vitest
**28ファイル319テスト**）通過（セッション開始時は308テスト。T-054で+7、T-056で+4）。
`tasks.json` の9タスクはすべて `done` / `passes: true`。タスク1件＝1コミットで積み、
`main` に fast-forward マージして push 済み（`677e7d8..4f1caf7`）。

### 実機スモークテスト（2026-09-06、`docs/smoke-test.md` の手順どおり）

`summary {"CREATED":2,"SKIPPED":0,"ERROR":0}`・終了コード0。MR !26（`tenant2/client1`、
`image tag 1, helm branch 1`）と !27（`tenant2/client2`、`image tag 1`）が作られ、
タイトル・本文の2セクション構成・8列/4列のテーブルとも手順書の期待どおり。
再実行が `SKIPPED (mr_exists)` になることも確認。

**最新タグ判定の方式変更（HEADを指すタグの直接探索）が実機で意図どおり動くことを確認した**:

- `sample-qa-sprint` はHEADを指すタグ（`main-build-at-20260903-172148`）を再利用し、
  **新規タグを作っていない**（両リポジトリとも当日日付のタグは0件）
- `sample-develop-client` は**HEADを指すタグが2本ある**（`main-build-at-20260101-000000` と
  `main-build-at-20260903-143646` が同一コミット `9b81a971` を指す）。
  「複数該当時はタグ名の日時降順」というタイブレーク規則が実際に発火し、
  新しい方（`...143646`）が選ばれた

---

## 過去セッション: T-064〜T-076（2026-09-06、`develop/progress.md` から移動）

## 完了したこと（前セッション: T-064〜T-070）

`chore/register-direction-tasks` ブランチで7タスクを実施し、`main`へfast-forwardマージ・
github/gitlab両リモートへpush済み（`860717a..92eb5f0`）。`tasks.json` が30KBを超えたため
この7件は [`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md) へ移し、
`tasks.json` は 35,440→13,838バイト（T-071以降の6件のみ）になった。

## 完了したこと（このセッション）

- `src/types/types.ts`を見たユーザーからの新規指摘3件をタスク化した（コード変更なし）:
  1. `TargetClient.tenantId`/`clientId` を `string` ではなく `TenantId`/`ClientId` 型で
     扱う（T-071、機械的なのでsonnet）
  2. `AnchorTarget.anchor: AnchorName` のようにフィールド名と型名がズレている箇所の横展開
     （T-072で対象範囲・命名を決定 → T-073で実装。全型を調査し、`branch`/`chartDir`など
     他にも同じズレがあること、`branchToSync`等の修飾語付きは事情が異なることを整理した）
  3. コメントを簡潔にする方針（T-074で基準を決定 → T-075で`types.ts`/`brand.ts`に適用）
- `mr-content.ts`の`buildMrDescription()`が`ResolveWebUrl`（関数）を受け取っている件を追加調査し、
  T-076として登録した。冒頭コメントが「純粋な文字列組み立てだけ」と言いつつ実際は非同期＋
  キャッシュ管理をしていて宣言とズレていること、必要な`projectId`集合は呼び出し前に全部
  分かるため呼び出し元で事前解決できることまで確認済み（`build-plans/sub-steps`の
  `LoadValuesYamlContent`/`BranchExists`とは事情が異なり、横展開の対象ではない）

### T-071: TargetClient をブランド型で扱う

- `TargetClient.tenantId`/`clientId` を `TenantId`/`ClientId` に変更（`ChartAndApps` 側と対称になった）。
  `config.ts` の比較・パス結合3箇所は**ブランド型が `string` のサブタイプなので変更不要**だった

### T-072: フィールド名と型名のズレの方針

- 規則は「**型定義のフィールド名は、ブランド型が表している語（`Name`など）を落とさない**」。
  `anchor: AnchorName` は「アンカーそのもの」を持っているように読めるのがズレの正体
- **関数の引数名は対象外**（型注釈が同じ行に見える／フィールドはドットアクセスで宣言から
  離れて読まれる、という違いで線を引いた）。修飾語が「どれか」を担うもの（`branchToSync`・
  `mrTargetBranch`など）と、包含型が主語を与える `name` も対象外
- リネーム対象は6件に確定（`anchor`・`HelmTargetBranchConfig.branch`・`ParsedTag.branch`・
  `chartDir`・`previousTag`・`FileUpdate.filePath`）。実装は T-073

### T-073: リネームの実施

- 6件を実施（`anchorName`・`branchName`×2・`chartDirName`・`previousTagName`・
  `FileUpdate.valuesPath`）。28ファイル・約160行の差分だが、テスト件数は322のまま
- **wire format は不変**: `anchors.yaml` のキー `anchor` と、gitbeakerに渡す
  `CommitAction.filePath` はそのまま。詰め替えは `schema.ts` の `.transform()` と
  `commitFileUpdates()` が担う
- ログのキー（`chartDir`→`chartDirName`、`previousTag`→`previousTagName`）も追従させた

### T-074: コメント方針

- 基準は「**コードから読み取れないことだけを書く／原則1〜2文／それを超える背景は正典（docs/）へ**」。
  残す価値があるのは「外部との対応関係（どのYAMLキー由来か等）」と「非自明な前提・制約」。
  `CLAUDE.md`「コーディング規約・レビュー方針」に追記した
- `types.ts`/`brand.ts` の長いJSDocの中身は**既に正典側にある**ことを確認（アンカー方式→
  `glossary.md`、`chart`を配列にする理由→`requirements.md`、`GitLabUrl`の理由→`architecture.md`）。
  そのため T-075 は移設不要で、削除・圧縮だけで済む

### T-075: コメントの圧縮

- `types.ts` 169→128行、`brand.ts` 104→88行。**コメントのみの変更**（型定義・実装・
  エクスポートは無変更であることを `git diff` で確認）
- 長い説明は正典にあるので移設せず削除。`ImageTagUpdate` のJSDocに残っていた旧名
  `previousTag` も修正した

### T-076: 関数注入を値渡しに

- `buildMrDescription()` を **同期関数**にし、`ResolveWebUrl`・`webUrlCache`・`getOrFetch()` の
  reduceを削除。冒頭コメントの「外部I/Oを持たない純粋な文字列組み立て」と実装が一致した
- URLの解決とキャッシュは `gitlab.ts` の `getProjectWebUrls()`（重複`projectId`は1回だけ解決）に
  移し、`apply-updates.ts` が事前に呼ぶ。必要な`projectId`は `webUrlProjectIds()` が返すので、
  **イメージタグの行を持たないplanのURLは取りに行かない**（素朴に全plan分を渡すと無駄が増える）
- サブエージェントがsonnetのセッション上限で途中終了したため、残りのテスト修正と
  重複排除テストの `gitlab.test.ts` への移設、上記の無駄取りはメイン側で仕上げた

## 過去セッション: build-plans/apply-updates/lib-gitlab の再編（2026-09-06、`develop/progress.md` から移動）

- **`build-plans` の流れを他stepと同じ形に整理した**（ユーザー指摘: 「手順が5つコメントに
  記載があるのにsub-stepsが3つ」「buildPlans→planTarget→buildPlan→buildAppUpdatePlan が
  わかりづらい」）。
  - **`readCurrentImageTags()` を廃止**し、`applyImageTagTarget()` が下書きから自分で
    反映済みタグを読む形に戻した。この関数は元々`resolveLatestTag()`の追跡ブランチ切り替え
    判定に値を渡すためのものだったが、判定が`trackedHeadTagNames`方式になった時点で
    その役目は終わっており、残っていたのは`previousTags`を添字で引き回す配線だけだった。
    「同じアンカーが1アプリ内に2回現れない」という壊れやすい前提も不要になった
    （下書きの現在値を読むため、重複しても2件目は差分なしと判定される）
  - **副作用の順序が変わる**: 「values.yamlを読む→タグ作成」から「タグ作成→values.yamlを読む」に
    なるため、**values.yaml不在の設定ミス時に`ERROR`の前にタグが1つ作られる**。作られるタグは
    追跡ブランチのHEADを指すので再実行時に再利用され、増え続けることはない。READMEのフロー図
    （タグ存在確認→無ければ作成→helm設定値と比較）にはむしろ忠実になった。アンカー不在の
    ケースは変更前からタグ作成後にエラーだったため挙動は不変
  - **`planTarget()`を`buildPlan()`に統合**し、階層を `buildPlans → buildPlan →
buildAppUpdatePlan` の3段に。`filterTargets → evaluateTarget` /
    `applyUpdates → applyUpdate` と同じ「並列処理1件分の関数を読めば全体が分かる」形に揃った
  - GitLabアクセスのクロージャ組み立ては`createChartAccess()`（非公開関数）に切り出し、
    `ChartAccess`型として束ねた
  - 結果、`buildAppUpdatePlan()`の手順が5→4になり、`sub-steps/`の3ファイルと1対1で対応する
    （31ファイル330テスト、件数不変）
- **サブステップ同士のimportを `sub-steps/shared/` に追い出した**（ユーザー指摘:
  「サブステップ同士は関わってはいけない」）。`docs/architecture.md`には以前からその原則が
  書いてあったが、`values-yaml-draft.ts`が`image-tag-target.ts`・`helm-target-branch-target.ts`
  から呼ばれ、`LatestTagResolution`が`resolve-latest-tag.ts`から参照されていた。原因は
  `sub-steps/`直下に「親stepが呼ぶステップ本体」と「それらが共有する型・データ操作」が
  混在していたこと。`{types,values-yaml-draft}.ts`を`sub-steps/shared/`へ移し、
  `LatestTagResolution`も`shared/types.ts`へ移した。型の置き場所の基準「その型を生み出す
  関数と同じファイル」と競合する場合は`shared/`を優先すると`docs/architecture.md`に明記。
  `grep 'from "./[^s]' src/steps/*/sub-steps/*.ts` が0件であることで機械的に確認できる
- **`apply-updates`のMR組み立てを2つのサブステップに分けた**（ユーザー指摘:
  「1度しか使わない1行の関数が乱立している」）。`build-mr-content.ts`が「MRに載せる項目の
  選別」と「Markdownの組み立て」の2つの仕事を持ち、`plansWithImageTagRows()`・
  `webUrlProjectIds()`・`resolveWebUrl()`という1行関数と、タイトル/本文で2回呼ばれる
  `uniqueHelmTargetBranchUpdates()`に分裂していた。
  - `collect-mr-entries.ts`（新規）: `plans`→`MrEntries { imageTags, helmBranches }`。
    web URLの解決と向き先ブランチの重複排除をここに集約。1行関数3つは1パスに吸収されて消えた
  - `build-mr-content.ts`: `MrEntries`→`{ title, description }`の**同期・純粋関数**になった
    （GitLab依存と`async`が消え、テストから`vi.mock`が不要になった）
  - **タイトルの件数と本文のテーブルの行が同じ配列から数えられるようになった**。以前は
    タイトルが`plans.reduce()`、本文が`plans`の絞り込みと別ロジックで、ずれても気づけなかった
  - サブステップ同士は呼ばず、`applyUpdate()`が2つを順に呼ぶ。共有する型（`MrEntries`・
    `ImageTagEntry`）は`apply-updates/sub-steps/shared/types.ts`
  - テストも2ファイルに分割し、`makePlan()`は`test/helpers.ts`へ移した
    （31ファイル330テスト、326→330）

- **`lib/gitlab/` の分割基準を「ファイル長」から「依存対象」へ見直した**（ユーザー指摘:
  「ファイルの長さを考慮して分割しただけでキレイと感じない」）。`gitlab.ts`から切り出された
  `tag.ts`・`mr-content.ts`は、原則2（技術・外部システム・ファイル形式への依存）では
  説明できない配置だった。中身を1シンボルずつ判定して4つに分けた:
  - `lib/gitlab/tag.ts` → `lib/tag-format.ts`。GitLab APIにもGitLab固有形式にも依存せず、
    依存先はこのツール自身が定義する`TAG_FORMAT`という**形式**（タグを作るのも読むのも自分）。
    `lib/helm.ts`・`lib/config/schema.ts`と同格に置いた
  - `buildFeatureBranch()` → `steps/shared/feature-branch.ts`。技術依存ゼロ＋2つのstepが使う
  - MRタイトル・本文 → `steps/apply-updates/sub-steps/build-mr-content.ts`。呼び出し元は
    `apply-updates.ts`1ファイルだけ。**サブステップは1ファイル＝親stepが呼ぶ1ステップ**
    （ユーザー指摘）なので、`buildMrTitle()`/`buildMrDescription()`を並べて公開せず
    `buildMrContent()`1つが`{ title, description }`を返す形にした。web URLの解決は
    `resolve-latest-tag.ts`と同じく`GitlabClient`を受け取って自分で行う（一度
    `ResolveWebUrls`関数型で注入する形にしたが、隠すべきキャッシュもprojectIdの引き回しも
    無く間接層が増えるだけだったのでユーザー指摘で戻した。`docs/architecture.md`の
    「サブステップはGitLabクライアントを受け取らない」も実態に合わせて書き直した）
  - `buildTagUrl()`/`buildCompareUrl()` → `lib/gitlab/web-url.ts`（新規）。`/-/tags/`・
    `/-/compare/`というGitLab固有のURLパス形式に依存する唯一の部分。「外部I/Oは`gitlab.ts`
    だけ」を保つため`gitlab.ts`には混ぜず別ファイルにした
  - 結果 `lib/gitlab/` は `gitlab.ts`（API本体）と `web-url.ts`（URL形式）の2つだけになった
  - `docs/architecture.md` の「**`gitlab/tag.ts` は外部I/Oを持たないのに `lib/gitlab/` にある**」
    という但し書き（＝原則2で説明できていなかったサイン）を削除し、今回の判断理由に差し替えた。
    あわせて `commitFileUpdates()` がドメイン型 `FileUpdate` を知っている件を、**現状維持の
    判断とその理由**（stepに移すとGitLab APIの呼び出し順がstep側に漏れる）として明文化
  - `buildTagUrl()`/`buildCompareUrl()` は非公開で本文経由でしか検証されていなかったため、
    export化に伴い `test/lib/gitlab/web-url.test.ts` を新設（サブパス設置のインスタンスで
    グループ/プロジェクト部分を落とさないこと・タグ名の`/`エスケープを直接検証）
  - `pnpm check`（**30ファイル326テスト**）通過。322 + web-url の新規4件

- **`verify-config` を `src/lib/` から `scripts/lint/` へ移した**（ユーザー指摘）。本体
  パイプライン（`index.ts`→`main.ts`→`steps/`）からの参照は0で、唯一の呼び出し元が
  `scripts/lint/validate-config.ts` だったため。`pnpm build` の `dist/` から lint専用コードが
  消えたことを実測で確認（`find dist -name "*verify*"` が0件）。
  - `src/lib/verify-config/` → `scripts/lint/verify-config/`、
    `test/lib/verify-config/` → `test/scripts/lint/verify-config/`（いずれも `git mv`）
  - あわせて: `pnpm lint` を `oxlint src scripts` に拡張（移動先が lint 対象から外れるため）、
    `vitest.config.ts` の coverage対象に `scripts/lint/verify-config/**` を追加、
    `CLAUDE.md` にテスト配置ルール（`scripts/` 配下は `test/scripts/`）を追記
  - この判断の根拠は `CLAUDE.md` の**原則3**と `docs/architecture.md`「コードからは読み取れない
    設計判断」に記録した（原則2は「`src/`のどこに置くか」の基準であって「`src/`に置くか否か」を
    決めない、という切り分け）
  - `pnpm check`（28ファイル**322テスト**）通過＝移動前と同数。`--remote` の実機実行は未実施

## 過去セッション: T-077〜T-091（2026-09-06、リポジトリ全体レビューのfollow-up。`develop/progress.md` から移動）

## 完了したこと（このセッション）

**コードは1行も変えていない。** `src/` `scripts/` `test/` の全ファイル・全ドキュメント・
CI設定を読み、改善点を洗い出して `tasks.json` に15件登録しただけ。着手前の状態は
`pnpm check`（31ファイル330テスト）通過・カバレッジ 97.31%（stmts）。

洗い出した改善点は5系統:

- **ドキュメントの実装との乖離**（T-077 / T-078）。README の実行ログ例が実際の出力と違う
  （`chartDir` は `chartDirName`、`apps[]` に `previousTag` というキーは存在しない）、
  `CLAUDE.md` のテスト方針が現存しない関数 `buildChartUpdate()` を例示、
  `docs/glossary.md` が `loadApps()`・`ImageTagTarget`・`chartDir` という削除済み/改名済みの
  識別子を現役として書いている、`src/utils/partition.ts` のJSDocのコード例が実際の
  `StepOutcome` と合っていない、`.gitlab-ci.yml` の inputs 説明だけ「1以上」で実際の1〜20と不一致
- **命名の一貫性**（T-080/T-081 / T-082 / T-083）。最大のものは `AppConfig.chart`
  （書き込み位置の配列）と `ChartAndApps.chart`（chartリポジトリの情報）が**同名で別物**な件で、
  `build-plans.ts` の中で数十行の距離に同居している。ほかにブランド型の取りこぼし2件
  （`ConfigTarget.chartDirName` と `resolveHelmTargetBranch()` の `projectName` が素の `string`）と、
  `commitSha` にブランド型を入れるかの判断
- **不変性**（T-084 / T-088）。ドメイン型はほぼ全て `readonly` なのに、ステップ境界を跨ぐ型
  （`ChartUpdateTarget.plans`/`files`、各ステップの戻り値、`partitionMap()` の戻り値）だけが
  可変配列で、そのせいで `buildPlan()` に `[...plans]` というコピー専用の spread が要る。
  `LoadValuesYamlContent` の「呼び出し側が `new Map(acc.draft)` を渡し実装が破壊的に埋める」
  契約も、周囲の不変な作りから浮いている
- **設計の再検討**（T-085 / T-086 / T-087 / T-090）。`src/lib/env.ts` のトップレベル副作用が
  3つの迂回（`validate-config.ts` の動的import、`vitest.config.ts` の全テストへのenv注入、
  `main.test.ts` のenvモック）を生んでいる件、`main.ts` の `process()` がグローバル `process` を
  覆っている件（`docs/architecture.md` 自身が「その名前は使わない」と書いている）、
  `filter-targets` と `build-plans` の入口の完全重複、`CONCURRENCY_LIMIT` の外側で
  無制限に並列化している `Promise.all` 3箇所
- **スクリプト・リポジトリ衛生**（T-079 / T-089 / T-091）。対応済みの指示メモ `direction.md` が
  リポジトリ直下に残っている、スモークテスト用スクリプトにソースリポジトリの projectId が
  直書き＋タグの新旧を辞書順比較している（`TAG_FORMAT` を変えると誤判定）、
  `pnpm lint` が `test/` を対象にしていない

**T-077 完了**（`chore/review-followups` ブランチ）。ドキュメント・コメントの実装との乖離4箇所を
修正（README実行ログ例・`CLAUDE.md`のテスト方針・`partition.ts`のJSDoc例・`.gitlab-ci.yml`の
`CONCURRENCY_LIMIT`説明）。haikuに委譲したが、受け入れ時に2点直した ——
`valuesPath` の例が削除済みのdotパス形式（`applications.my-app.image.tag`）になっていたのを
ファイルパスに、`run_start` の未設定な環境変数は `JSON.stringify` がキーごと落とすため
空文字列ではなく非表示に。タスク本文の記述誤りで見落としていた `variables` 側の
「1以上の整数」も併せて修正した。

**T-078 完了**。`docs/glossary.md` の識別子を現在のコードに合わせた（`loadApps()`→
`loadClientChartAndApps()`、`chartDir`→`chartDirName`、削除済み型 `ImageTagTarget`/
`HelmTargetBranchTarget` への言及→`AnchorTarget`、YAMLキー名 `anchor` と内部フィールド名
`anchorName` の対応を `AnchorTargetSchema` の `.transform()` 込みで明記）。sonnetに委譲し、
受け入れ時に「反映済みタグ」項の `previousTag`→`previousTagName` を追加修正。
用語集に残る実在しない識別子は `ChartGroup`・`UPDATE_BRANCH` の2つだけで、どちらも
「旧〜」として意図的に残している歴史記述。

**T-079 完了**。対応済みの指示メモ `direction.md` を `git mv` でリポジトリ直下から
`docs/history/` へ退避し、冒頭に「全項目対応済み・対応先は `tasks-archive.md` と
`docs/architecture.md`」の注記を付けた（本文6項目は無変更）。

**T-080 完了**（方針決めのみ、コード変更なし）。`AppConfig.chart` → `imageTagTargets` に
改名すると決めた。決め手は、`targets` という候補が**既にこのコードベースで「処理対象の
chartAndApps」の意味に使われている**こと（`FilterTargetsResult.targets`・`buildPlans()`/
`applyUpdates()` の引数）で、3つ目の意味を足すのを避けた。`HelmTargetBranchConfig.targets`
（包含する型名が用途を与える）と `ChartAndApps.chart`（`.chart` と `.apps` で対）は据え置き、
`anchors.yaml` のキー `apps[].chart[]` も不変。判断は `docs/architecture.md` に記録し、
置換リストは T-081 の本文に確定させた。

**T-081 完了**。`AppConfig.chart` → `imageTagTargets` の置換を12ファイルに適用（テスト件数不変）。
wire format（`anchors.yaml` のキー `chart`、`AnchorsAppSchema`、エラーメッセージのラベル
`chart[]`、`docs/requirements.md` 4.4節）はすべて無変更であることを `git diff --name-only` で確認。

**T-082 完了**。`ConfigTarget.chartDirName` を `ChartDirName` に、`resolveHelmTargetBranch()` の
`projectName` を `ProjectName` にした。変換は `env.ts` の `parseTargetChart()` で行う
（`parseTargetClients()` と同じ形）。`loadConfig()` 内の比較・`join()` はブランド型が
`string` のサブタイプなので**無変更で通った**（無理な変換を挿入していない）。
テストは330→332（`parseTargetChart()` の分を追加）。

**T-083 完了**。`CommitSha` ブランド型を導入した。決め手は「TypeScriptは `string` と
ブランド型の比較は許すが、**ブランド型どうしの比較は `TS2367` で弾く**」ことを実地で
確認したこと。これで中核判定 `tag.commitSha === headSha` のすぐ近くにある
`tag.name`（`TagName`）との取り違えが型で防げる。あわせて「何をブランド型にするか」の
基準（別の識別子と同じ型の式に並ぶか）を `docs/architecture.md` に明文化した。

**T-084 完了**。ステップ境界を跨ぐ配列（`ChartUpdateTarget.plans`/`files`、各ステップの
戻り値、`partitionMap()`・`toFileUpdates()` の戻り値）を `readonly T[]` に揃えた。
狙いどおり `buildPlan()` の `plans: [...plans]`（可変配列に合わせるためだけのコピー）が消えた。
残る spread は全件確認して genuine な用途のみ。`as` は1件も増えていない。

**T-085 完了**。`lib/env.ts` のトップレベル副作用をやめ、`loadEnvConfig(): EnvConfig` に
した。`run()`/`process()` は `EnvConfig` を引数で受け取り、生成するのは `src/index.ts` だけ。
狙いどおり**3つの迂回が全部消えた**（`validate-config.ts` の動的import、`vitest.config.ts` の
全テストへの env 注入、`main.test.ts` の `vi.mock(env)`）。挙動不変は実測で確認
（環境変数なしで既定モードは exit 0、`--remote` は理由付きメッセージで exit 1）。
副次的に、環境変数エラーが `index.ts` の `catch` に載って構造化ログに出るようになった
（以前はモジュール読み込み中に投げるため素のスタックトレースだった）。

**T-086 完了**。`main.ts` の `process()` を `runPipeline()` に改名（グローバルの `process` を
モジュールスコープで覆っていた）。`test/main.test.ts` の別名輸入 `process as processFn` が
不要になった。`CLAUDE.md` 3箇所・`docs/architecture.md` 6箇所も追従。受け入れ時に、
`docs/architecture.md` の表に残っていた `app.chart`（T-081の取りこぼし）も直した。

**T-087 完了**（判断のみ、コード変更なし）。stepの入口の「並列実行 → 振り分け」の重複は
**共通化しない**と決めた。決め手は3点 —— `applyUpdates()` だけ `partitionMap` ではなく
`outcomes.map()` で潰すので3つ揃わない／3つを1つに寄せるには「要素から `ChartAndApps` を
取り出す関数」という差を隠すためだけの引数が要る／重複しているのは配線であって方針ではない
（危険なエラー方針は既に `withHandling()`・`settleAsError()` に集約済み）。理由は
`docs/architecture.md` に記録したので、次に読む人が同じ検討をやり直さなくて済む。

**T-088 完了**。`LoadValuesYamlContent` の「呼び出し側が `new Map(acc.draft)` で複製して渡し、
実装が破壊的に埋める」契約をやめ、`Promise<{ content, draft }>` を返す形にした。
サブステップ側は `ReadonlyMap` だけを扱うようになり、`new Map(acc.draft)` は0件に。
**コピー回数はむしろ減った**（以前はtargetごとに無条件で複製、今は下書きミス時と書き込み時のみ）。
読み込み用 `cacheValuesYamlDraft()` と書き込み用 `writeValuesYamlDraft()` で入口を分け、
「`modified` は書き込み経由でしか生まれない」という `toFileUpdates()` の前提を関数名で保つ形にした。

**T-089 完了**。スモークテスト用スクリプトのソースリポジトリ projectId を環境変数
（`SMOKE_QA_SPRINT_PROJECT_ID` / `SMOKE_DEVELOP_CLIENT_PROJECT_ID`）へ外出しし、
タグの新旧判定を辞書順比較から `lib/tag-format.ts` の `parseTag()`/`findLatestParsedTag()`
による `builtAt` 比較に直した（`TAG_FORMAT` を変えても誤判定しない）。受け入れ時に回帰を1件修正 ——
`SEED_TAGS` がモジュール直下で projectId を要求していたため、chartリポジトリしか触らない
`reset` まで新しい環境変数を必須にしてしまっていた。環境変数名だけを持たせ、値の要求は
`ensureSeedTags()`（`setup` のみが呼ぶ）へ移した。

**T-091 完了**。`pnpm lint` の対象に `test/` を追加。入れた途端に**死んだimportが5件**
（`validateTagFormat`×3・`makeHttpError`×2）出てきたので削除した。`.oxlintrc.json` の
`overrides` は不要だった（`vi.mock` のホイスティングやモック用キャストは現行ルールに
引っかからない）。`test/` が実際に対象になったことは、未使用importをわざと入れて
検出されるかで確認した。

**検討したが登録しなかったもの**（次に同じ調査をしないための記録）:

- `src/utils/logger.ts` の `redact()` がトップレベルのキーしか伏せない件 —— 現状ネストした
  オブジェクトに認証情報を入れて出力する経路が無く、予防的すぎるため見送り
- `partitionMap()` / `reduceAsync()` が `[...acc, x]` で配列を積む O(n²) の書き方 ——
  n が chartAndApps 数・アプリ数（数十）なので実害が無く、不変性を優先した現在の書き方が方針どおり
- `image-tag-target.ts` と `helm-target-branch-target.ts` の構造的な相似 —— 共通化すると
  サブステップ同士が型を共有する形になり、`sub-steps/shared/` を太らせるだけで得が無い

## 過去セッション: T-092〜T-094（配置・命名の再検討）

**コードは変えていない。** 以下の2つだけ:

- **アーカイブ**: `develop/tasks.json` の `done` が15件・48KB とアーカイブ基準
  （`docs/workflow.md`「肥大化したときのアーカイブ」）に達していたため、T-077〜T-091 を
  `docs/history/tasks-archive.md`（`## T-077`〜`## T-091` を追記）と
  `docs/history/progress-archive.md`（`## 過去セッション: T-077〜T-091` を追記）へ全件移した。
  `tasks.json` は新規3件だけの状態に戻した。
- **タスク登録（T-092〜T-094）**: いずれもユーザー指摘による「置き場所・命名の再検討」。
  3件とも `opus`（既存の設計判断の文書と噛み合わせつつ方針を決める必要があるため）。
  - **T-092**: `src/lib/config/helm-target-branch.ts`（`resolveHelmTargetBranch()` 1関数だけ、
    呼び出し元は `config.ts` のみ）を独立ファイルのまま置くのが妥当か。`config.ts` の
    非公開関数に畳むか、残すなら `schema.ts`/`validate.ts` と粒度の揃った名前にするか。
  - **T-093**: `src/lib/tag-format.ts` が `lib/` にあるべきか。`TAG_FORMAT` はこのツール自身の
    取り決めで、`values.yaml`/`config/` のような外部ファイル形式とは種類が違う。ドメイン固有の
    定数・関数を置く新区分（`src/domain/` 等）を新設するかまで含めて再検討する。一度
    `lib/gitlab/tag.ts` から意図的にここへ動かした経緯あり（`tasks-archive.md`）。
  - **T-094**: `helm-target-branch-target.ts` の公開関数 `applyHelmTargetBranchTargets()` と
    ファイル名が揃っていない。`apply-updates.ts`↔`applyUpdates()` のようにファイル名＝公開
    関数名に揃える。姉妹 `image-tag-target.ts`/`applyImageTagTargets()` が同じズレを持つため、
    両方揃えるか helm のみかの判断が主な論点。

- **T-092 完了**（ブランチ `chore/reconsider-placement-naming`）。**ユーザー指示で方針変更** ——
  一時は `resolve-helm-target-branch.ts` に切り出したが撤回し、`resolveHelmTargetBranch()` を
  `config.ts` の非公開関数に畳んだ（1関数・呼び出し元1つ）。テスト8件は `loadConfig` 経由なので
  `test/lib/config/config.test.ts` に統合。`docs/architecture.md` の設計判断ノートは「役割で
  括れて複数並べられる単位（`schema.ts`/`validate.ts`）が別ファイルの境目で、単発ヘルパーは
  そこに達しない」に置き換え。`pnpm check`（30ファイル333テスト、統合でファイル数 31→30）。
- **T-093 完了**。**ユーザー指示で方針変更**（当初は「`lib/` のまま据え置き」で終えていた）。
  `src/domain/` を新設し、`tag-format.ts`（← `src/lib/`）と `feature-branch.ts`
  （← `src/steps/shared/`）を移した。`domain/` の定義: 「tech非依存で、このツールの取り決め
  （タグ命名規則・固定ブランチ名の付け方）を体現する純粋な関数・定数」。副次的に境界が明確化 ——
  `lib/` は外部アダプタだけ、`steps/shared/` は `step-outcome.ts`（step処理の配線）だけになった。
  import 15ファイル・テスト2件を追従、`docs/architecture.md`（新セクション＋判断基準リスト＋
  `lib/gitlab/` 分割ノート）と `CLAUDE.md`（判断基準リスト＋テストコマンド例）も更新。
  `types/` は据え置き（scope 判断: import が全域・CLAUDE.md ルールも書き直しで churn 大）。
  `pnpm check`（30ファイル333テスト）。
- **T-094 完了**。`build-plans/sub-steps/` の2ファイルをリネーム（`git mv`、テストも同名）:
  `image-tag-target.ts` → `apply-image-tag-targets.ts`、`helm-target-branch-target.ts` →
  `apply-helm-target-branch-targets.ts`。`steps/` ツリーは全ファイルがファイル名＝公開関数名の
  ケバブケースで、この2つだけが概念名で崩れていた。姉妹の同型2ファイルなので両方揃えた。
  公開関数名は不変、内部型エイリアスのみ関数名に合わせた（`ApplyImageTagTargetsAcc`・
  `ApplyHelmTargetBranchTargetsAcc`）。`build-plans.ts` import・`docs/architecture.md`・
  `docs/glossary.md` も追従。判断を `docs/architecture.md` に記録。
  `pnpm check`（31ファイル333テスト、変化なし）。

## 過去セッション: T-095〜T-101（2026-09-07、`undefined` の棚卸しとその実装。`develop/progress.md` から移動）

**コードは変えていない。** `undefined` の棚卸しと、その結果のタスク登録:

- **`src/` 全体の `undefined` を調査**し、(A)外部の「無い」を写しているだけで消せないもの、
  (B)要件を変えれば消せるもの、(C)表現が揃っていないもの、に分類した。**一番の発見は
  `previousTagName` / `previousBranch` の `undefined` が実行時に到達不可能**なこと
  （`getValueAtAnchor()` が `undefined` を返すのはアンカー不在時だけで、その直後の
  `setValueAtAnchor()` が必ず例外を投げる）。あり得ない分岐が型・MR本文の表示・テストの
  3箇所で維持されていた。
- **T-095〜T-100 を登録**（commit `5e2a6c3`）。B1〜B4・C・「穴」（`branchToSync` 不在の
  落ち方）と、B3（向き先ブランチを `ChartAndApps` へ移す）。B3は「向き先ブランチはclient内の
  apps全体で共通」という要件が今後も変わらないことをユーザーに確認したうえで案を確定した。
- **T-101 を登録**（commit `18cfffd` → `a86f5ba`）。型の置き場所の基準。調査の結果
  **基準は既に `docs/architecture.md` に6行の表として存在**し、`coding-standards.md` は
  そこへ明示的に委譲していた（問題はたどり着けないこと）。正典は `architecture.md` のまま
  拡充し、規約側からは導線を張るだけ、とユーザー合意のうえ本文を書き直した。
- **T-095 完了**。values.yaml のアンカー不在を読み取り時の例外に寄せ、`previousTagName` /
  `previousBranch` から `| undefined` を消した（実行時に到達不能な分岐だった）。MR本文の
  「(未設定)」表示は到達不能なので削除。`lib/helm.ts` の `getValueAtAnchor()` は
  `verify-config.ts` が全問題を集める用途で残置。`pnpm check`（31ファイル335テスト、
  ベースラインと同数）。
- **T-096 完了**。パイプライン取得を `build-plans` から `apply-updates`
  （`collect-mr-entries.ts`）へ移し、`AppUpdatePlan.pipeline` を削除した。dryRun由来の
  `undefined` が消え、`ImageTagEntry.pipeline` に残る `undefined` は「GitLab上に本当に
  無い/403」の意味だけになった。受け入れ時に projectId+タグ名の重複排除を落とした
  （1 chartAndApps 内で projectId は一意なので、その重複は起こり得ない）。
  `pnpm check`（31ファイル334テスト、-1件）。
- **T-097 完了**。`EnvConfig.configPath` を `string` にし、デフォルト `"config"` を
  `DEFAULT_CONFIG_PATH` 定数1箇所に寄せた。`loadConfig()` は省略可能引数をやめて必須引数に
  変え、CLIから呼ぶ `validate-config.ts` 側でデフォルトを当てる。`pnpm check`
  （31ファイル334テスト、不変）。**haiku への委譲がセッションのレート制限（429）で落ちた**
  ため、メインセッションが実行した。
- **T-098 完了**。`ConfigTarget` の `?:` を `| undefined` に統一（`loadConfig` の既定値
  `{}` は `NO_TARGET` 定数に置換）。あわせて **`docs/coding-standards.md` に「undefined」節**
  を新設し、許容する `undefined`（外部の「無い」）／避ける `undefined`（到達しない・意味が
  複数乗っている・デフォルトが確定しているのに運ばれる）／「消すことを目的にせず、なぜ
  生まれるかを先に問う」を明文化した。`CLAUDE.md` のルール一覧にも1行。
  `pnpm check`（31ファイル334テスト、不変）。
- **T-099 完了**。追跡ブランチが実在しないとき、存在しないブランチへタグを作りにいって
  GitLabの404で落ちる代わりに、`resolveLatestTag()` がその場で分かりやすい例外を投げる
  ようにした（Helm向き先ブランチ側の事前検証と扱いが揃った）。`resolveTrackedHeadTagNames()`
  の引数から `| undefined` も落ちた。`gitlab.ts` 側の `| undefined` は「GitLabに無い」を
  表す層なので残置（規約の「許容する」に当たる）。`pnpm check`（31ファイル336テスト、+2）。
- **T-100 完了**。Helmの向き先ブランチを `AppConfig`（app単位）から `ChartAndApps`
  （client単位）へ移した。**共通の値をapp単位に振り分けてから重複排除で戻す往復が消えた**
  （`resolveHelmTargetBranch()` の振り分けと `uniqueHelmTargetBranchUpdates()` の両方）。
  副次的に `verify-config.ts` が向き先ブランチの問題をアプリ数だけ重複報告していたのも解消。
  MR本文は不変（テストの期待値を書き換えずに通した）。`pnpm check`（31ファイル336テスト、不変）。
- **T-101 完了**。型の置き場所の基準を実態に追いつかせた。**基準は既に存在していて**
  （`docs/architecture.md`「型の置き場所」の6行の表）、問題は規約からたどり着けないことと
  表の穴だった。`ParsedTag`・`LabeledTarget`・`AnchorsApp`・`EnvConfig` の4つで穴を埋め、
  `CLAUDE.md` のコーディング規約一覧には**基準を書かず参照だけ**の1行を足した（原則5と
  二重になるため）。`src/` の型45件を全件突き合わせて**違反0件**。`pnpm check`（336テスト）。
- **アーカイブ**: `develop/tasks.json` が44KBと基準（30KB）を超えたため、`done` の
  T-092〜T-094 を `docs/history/` へ移した。

## 過去セッション: T-102〜T-109（2026-09-07、品質の棚卸しとスモークテストの準備確認。`develop/progress.md` から移動）

- **T-109 完了**: 実機スモークテストの準備確認（実行はしていない）。5点すべて揃っていた。
  - 認証情報: `.env` に `GITLAB_URL` / `ACCESS_TOKEN` あり。`SMOKE_*` は手順の中で
    `export` する設計なので `.env`/`.env.example` に無いのは想定どおり
  - 対象プロジェクト: `pnpm lint:validate-config:remote config-test` が**読み取りのみ**で通過
    （3 chart groups / 5 apps。projectId・ブランチ・valuesPath・アンカーの実在を確認）
  - 手順のコマンド: `smoke-fixture.ts` の `setup`/`reset`/`--apply`、`validate-config.ts` の
    位置引数、`pnpm dev` はいずれも実在
  - フィクスチャ: `config-test/` の projectId・アンカー名が手順の期待と一致
  - 期待する結果: MRタイトル書式・本文の8列/4列・`summary` の3キー・終了コードの写像は
    いずれも今の実装と一致（T-108 で変えた起動経路も含めてズレなし）

- **T-108 完了**: `src/index.ts` の `loadEnvConfig()` の失敗が `.catch` に載っていなかった件を
  修正（`Promise.resolve().then(() => run(loadEnvConfig()))`）。冒頭コメントも実装に合わせ、
  テストを1件追加した。

- **T-107 完了**: `isFatalStatus` の引数を `number` に狭め、到達しない `undefined` 判定を削除
  （`src/utils/http.ts` はカバレッジ100%に）。

- **T-106 完了**: `test/` 配下のコメントをコメント基準に追従（経緯1件を削除、src側JSDocの
  丸写し1件を圧縮、言い換え1件を削除）。テストの件数・内容は変えていない。

- **T-105 完了**: 発見リストに沿ってテストを削除9件・集約2件・追加7件。カバレッジは
  97.19% → 99.37%（Lines 99.82%）。追加テストの過程で `src/index.ts` の `loadEnvConfig()` の
  失敗が `.catch` に載らないことが分かり、T-108 として登録した。

- **T-104 完了**: テストの取捨選択の基準を `docs/coding-standards.md`「テスト」節として正典化し、
  カバレッジ計測に基づく発見リストを `develop/test-inventory.md` に残した。実作業は
  T-105（削除・集約・追加）・T-106（`test/` のコメント追従）・T-107（`isFatalStatus` の型を狭める）
  として登録済み。

- **T-103 完了**: コメントの基準を「長さ」から「種類」に置き換え（`docs/coding-standards.md`）、
  `src/`+`scripts/` を全件見て経緯5箇所を `docs/architecture.md` の既存4節へ移した。

- **T-102 完了**: `withAppContext()` の適用漏れを解消。`apply-updates/sub-steps/collect-mr-entries.ts`
  のplan単位の解決（web URL・最新パイプライン）も同じくアプリ名が要ると判断して包み、置き場所は
  `steps/shared/` に据え置いた（理由は `docs/architecture.md`「アプリ名の付与は〜」節）。

- **アーカイブ**: `develop/tasks.json` が33KBと基準（30KB）を超え、かつ全7件が `done` に
  なっていたため、T-095〜T-101 を `docs/history/` へ移した（`tasks.json` は `[]`）。
- **既定モデルを Sonnet に変更し、委譲の向きを反転**: `~/.claude/settings.json` の `model` を
  `opus` → `sonnet` に変更（ユーザー指示、全プロジェクトに適用）。これに伴い `difficulty` の
  振り分けを「`sonnet` はメインが自分で実行、`haiku`/`opus` はサブエージェントに委譲」へ
  反転させ、`docs/workflow.md`・`CLAUDE.md`・`.claude/skills/next-task/SKILL.md` を更新した。
- **`docs/architecture.md` に導線を追加**: 41KBあり、開くだけでコンテキストを大きく使うため、
  冒頭に節見出しの索引を置き、必要な節だけを読めるようにした。

## 過去セッション: T-110〜T-127（2026-09-07〜08、実機スモークテスト・GitLabキャッシュ整備・difficulty運用の確定・config-test/ e2e追加。`develop/progress.md` から移動）

### 実機スモークテスト（2026-09-07、`docs/smoke-test.md` の手順どおり）

`summary {"CREATED":2,"SKIPPED":0,"ERROR":0}`。MR !28（`tenant2/client2`、`image tag 1`）と
!29（`tenant2/client1`、`image tag 1, helm branch 1`）が作られ、タイトル・本文の2セクション
構成・8列/4列のテーブル・旧タグ/新タグのリンクと比較/パイプラインの生URLとも手順書の期待どおり。
再実行が `SKIPPED (mr_exists)` になることも確認。固定ブランチ上の `values.yaml` は
`t2c1QaSprintVersion` が新タグに、`t2c1HelmTargetBranch` が `release/2026-q1` に書き換わり、
`t2c1DevelopClientVersion` は据え置き。

**T-064以降の未検証分（URL検証の追加・MR本文のURL解決の作り替え・`loadEnvConfig()`化・
values.yaml下書きの受け渡しの作り替え・スモークスクリプトの環境変数追加）と、このセッションで
変えた `src/index.ts` の起動経路が実機で問題なく動くことを確認した。**

- `sample-develop-client` は `SKIPPED (already_up_to_date)`。HEADを指すタグが2本ある状態での
  タイブレーク（タグ名の日時降順で `main-build-at-20260903-143646`）も前回と同じ結果
- `sample-qa-sprint` は既存タグ（`main-build-at-20260903-172148`）を再利用し、**新規タグを
  作っていない**。`setup` のシードタグも両リポジトリとも「既に存在」で新規作成なし
- 手順1〜2（`--apply`）と手順5（本番実行）はハーネスの自動承認でブロックされるため、
  ユーザーがターミナルから直接実行した。手順3（実在チェック）・手順4（dry-run）と
  MR本文の確認はセッション側で実行

- **T-110 完了**: コミットメッセージにタスクIDを振る運用にした。既存の「タスク番号を書かない」
  規約とは衝突しない（対象がコード・ドキュメントであること、IDはアーカイブ後も
  `docs/history/` に残ること、機械的確認の grep がコミットメッセージを見ないことの3点）。
  書式は件名の先頭に `T-XXX: `。正典は `docs/workflow.md`「コミットメッセージ」節。

- **`build-plans` のサブステップ粒度を揃えた**（タスクID無し・会話由来）。親stepに
  アプリのループと非公開の中間層（`buildAppUpdatePlan()`）があり、`buildPlan()` の中で
  「1段下へ降りる呼び出し」と「同じ段のサブステップ呼び出し」が同じ深さに並んでいた。
  **サブステップは自分の関心事について全スコープを引き受ける**（ループを内側に持つ）方針に
  統一し、`buildPlan()` を `resolveLatestTags()` → `stageImageTagUpdates()` →
  `stageHelmTargetBranchUpdates()` の3呼び出しだけにした。`resolve-latest-tag.ts` →
  `resolve-latest-tags.ts` にリネームし、単数版は非公開に。アプリと最新タグの対
  （`AppWithLatestTag`）を `sub-steps/shared/types.ts` に追加。
  **振る舞いは不変**（`pnpm check` exit=0、32ファイル338テストで件数・内容とも変化なし）。
  唯一の実挙動の差は、全アプリの最新タグ解決が差分判定より前にまとまること（逐次のままなので
  タグ作成の順序と集合は不変。途中でFatalErrorが出たときにどこまでタグが作られているかだけ変わる）。
  `docs/architecture.md` は `build-plans/sub-steps/` 節・`withAppContext()` の呼び出し元・
  「アプリ単位は逐次のまま」節・「サブステップ同士は互いをimportせず」節を更新した
  （CLAUDE.md の原則1〜5は変更なし）。

- **同じappを複数clientに登録したときのタグ重複作成を直した**（タスクID無し・会話由来）。
  `config-test` のように**同じappが複数のclientに登録される**構成では、chartAndAppsごとに
  最新タグの解決が走り、HEADを指すタグが無いときは `createTag` がclient数だけ実行されていた
  （実測で3client＝3回）。タグ名は秒精度なので、同名になれば2件目以降が4xxで当該clientが
  ERROR（MRが作られない）、秒をまたげば同じコミットに冗長なタグが並びclientごとに違うタグ名が
  values.yamlに書かれる。`createResolveLatestTags()`（`resolve-latest-tags.ts`）で
  projectId+追跡ブランチ単位のバッチキャッシュを持つ形にし、1回に収束させた。キャッシュを
  サブステップ内に閉じた工場関数にしたのは、親stepで組み立てると単数版を公開することになり
  「1ファイル＝1公開関数」（`docs/architecture.md`）に反するため。方針は340節に追記済み。
  テスト2件追加（キャッシュを壊すと落ちることを確認済み）。

- **`stageImageTagUpdates()` の `draft` 引数を削除**（タスクID無し・会話由来）。サブステップの
  粒度を揃えた結果、この関数が下書きを最初に作る段になり、唯一の呼び出し元が常に空の Map を
  渡していたため。下書きは関数の内側で作る。

- **アーカイブ**: `develop/tasks.json` が32KBと基準（30KB）を超えたため、`done` の
  T-102〜T-109 の8件を `docs/history/` へ移した（残りは `todo` の T-110 のみ、3KB）。

- **T-111 完了**: GitLabへの問い合わせをバッチ全体で使い回すキャッシュ機構を導入した。
  `src/lib/gitlab/batch-cache.ts` に `GitlabBatchCache` を新設し、`runProcess()` が
  バッチ1回につき1つ作って `buildPlans()` へ引数で渡す（案(b)の「`createClient()` の戻り値に
  含めるキャッシュ付きクライアント」は、生とキャッシュ付きの区別が `.client`/`.cache` という
  アクセス経路に化けてstepの引数から見えなくなるため不採用）。**キャッシュしてよいのは
  「このツール自身の書き込みでバッチ中に値が変わらない読み取り」だけの明示的オプトイン**で、
  キーは引数から機械的に組み立てる（テンプレート文字列の手書きは廃止）。既存2箇所のうち
  `createCachedBranchExists()` は機構へ移して廃止、`createResolveLatestTags()` は複数API＋
  ドメイン判定にまたがる解決結果なので据え置き。`getOrFetchShared()` は残し、`V extends {}` の
  制約は値を箱に包んで回避したので、`undefined` を返す読み取り（T-113/T-115）もそのまま載る。
  正典は `docs/architecture.md`「GitLabへの問い合わせのキャッシュは`lib/gitlab/`に列挙し、
  バッチ単位で1つ持ち回る」節。テスト5件追加、`pnpm check` exit=0（33ファイル345テスト）。

- **T-112 完了**: `commitFileUpdates()` がコミット前にファイルごとに引いていた
  `getFileContent()` を取り除き、action を `update` 固定にした。`files` は
  `toFileUpdates()` 経由でしか作られず、`modified` が付くのは `readValuesYamlDraft()` が
  成功した後だけなので、判定結果は常に `update` でMRごとにファイル数ぶんの問い合わせが
  無駄になっていた。根拠は `lib/gitlab/` からは見えないため `commitFileUpdates()` の
  JSDocに残した。テストは create 側を検証していた1件を削除し、混在ケースの1件は
  「複数ファイルを1回のコミットにまとめる」テストに書き換えて残した。

- **T-113 完了**: `getLatestPipelineForRef()` をバッチキャッシュに載せ、同じappが複数clientに
  登録されているときの重複問い合わせをなくした。キャッシュは `runProcess()` の1つを
  `applyUpdates()` 経由で `collectMrEntries()` まで渡している。`undefined`（パイプライン無し）も
  機構が箱に包むのでキャッシュ対象に含めた。厳密には自作タグに後からパイプラインが現れうるが、
  MR本文の参考情報でしかなく同じタグにclientごとに違う答えを載せるほうが困るため載せる判断。

- **T-114 完了**: プロジェクトのweb URL解決をバッチキャッシュに載せた。あわせて
  `getProjectWebUrls()`（`new Set` の重複排除が1回の呼び出しの中だけに閉じていた）を廃止し、
  単数の `getProjectWebUrl()` に一本化。重複排除をキャッシュの外にも二重に持たない形にした。
  Mapを経由しなくなったので `resolveWebUrl()` と「依頼したprojectIdはすべて解決済み」の
  前提チェックも消え、web URL解決の失敗にもアプリ名が付くようになった。

- **T-115 完了**: values.yaml の**GitLabからの読み込み**をバッチキャッシュに載せた。同じ
  `values.yaml` を異なるテナント/クライアントが共有する構成は `docs/requirements.md` 4.2節の
  既知の制限として明記されており（client間の書き込み先重複は検証もしていない）、起こり得ると
  確認したうえで実装した。下書き（`ValuesYamlDraft`）は chartAndApps 単位のままで、キャッシュが
  返すのは常にGitLab上の元の内容。書き換え後の内容は `writeValuesYamlDraft()` が下書きにしか
  積まないため漏れは構造的に起きない。**これでキャッシュの取りこぼし（T-111〜T-115）は完了。**

- **指示のタスク化を `/plan-tasks` スキルにした**（タスクID無し・会話由来）。`develop/direction.md`
  に指示を書く → タスク化して `develop/tasks.json` に登録 → 指示メモは `docs/history/direction.md`
  へ日付見出し付きで移す、という流れ。**タスク化した時点で `develop/direction.md` を空にする**
  （タスクが全部doneになるまで残すと正典が `tasks.json` と二重になるため）。`/next-task` には
  「`develop/direction.md` に中身があればタスク化が先」というガードを足した。正典は
  `docs/workflow.md`「指示メモ（`develop/direction.md`）」節。

- **`/plan-tasks` の初回運用で T-116〜T-119 を登録**。`develop/direction.md` の3項目を現物の
  コードで裏取りしたうえで4タスクに分解し、指示メモを `docs/history/direction.md`「2026-09-07」へ
  移した。あわせて `develop/tasks.json` が44KBと基準（30KB）を超えたため、`done` の
  T-110〜T-115 の6件を `docs/history/tasks-archive.md` へアーカイブした（18KBに縮小）。

- **T-116 完了（分離しない判断）**: dry-run の分岐は2箇所だけで、`resolve-latest-tags.ts` は
  純粋な書き込み抑止、`buildPlan()` は dry-run の成果物そのもの（更新予定のログ＋SKIPPED計上）と
  **関心事が違う**ため集約しない。no-op層の案は summary が「作っていないものを作った」と
  報告してしまうことと、「書き込み関数に到達しない」現状より事故の余地が大きいことで不採用。
  代わりに `test/main.dry-run.test.ts` を追加し、**gitbeakerの境界**でモックして
  `DRY_RUN=true` のとき書き込みAPIが0回であることを固定した（新しい書き込みを足して
  dry-run を考え忘れても落ちる）。`if (!dryRun)` を外す変異でテストが落ちることも実測済み。
  正典は `docs/architecture.md`「dry-runは分岐を集約せず、書き込みに到達しないことをテストで守る」節。

- **T-117 完了（方針確定・コード変更なし）**: 「`async`/`await` を既定とし、`.then()`/`.catch()` は
  **その Promise の結果を待たず Promise 自体を値として扱う**（保持する・畳む・変換して返す）
  ときだけ」に確定。機械的なサインは「同じ式に `await` と `.then()` が並んだら `await` で書き直す」。
  **既存6箇所すべてがこの1条件で説明できる**ことを確認し、外れるのは `src/index.ts` と
  `scripts/smoke/smoke-fixture.ts:128` の2件だけ。`src/index.ts` が `.then` なのは
  「TLAが使えないから」ではなかった（`type: module` + `module: ESNext` + Node22 で使える。
  try/catch 版で `tsc` と `test/index.test.ts` 5件が通ることを実測して元に戻した）。
  正典は `docs/coding-standards.md`「`async`/`await` と `.then()`/`.catch()`」節。
  T-118 の本文を修正対象の一覧に更新済み。

- **`/plan-tasks` で T-120 を登録**。「タスクは `difficulty` によらず必ずサブエージェントに
  委譲する」というユーザー指示をタスク化した。指摘は現物で裏が取れている（このセッションは
  メインが Opus 5 の状態で `difficulty: sonnet` の T-112〜T-115 を「メインがそのまま実行」して
  おり、**ラベルと実行モデルが一致していなかった**）。指示メモは
  `docs/history/direction.md`「2026-09-07（2回目）」へ移した。`develop/tasks.json` は
  29.7KB・`done` 2件でアーカイブのトリガーには未達（次に足すと30KBを超える見込み）。

- **`/plan-tasks` で T-121・T-122 を登録**。`EnvConfig` の指摘2点をタスク化した。裏取りの結果、
  8フィールドのうち `gitlabUrl`/`targetChart`/`tagFormat` はブランド型なのに **`accessToken` と
  `configPath` だけ素の `string`** で型の付き方が揃っておらず、`configPath` のパストラバーサル
  検証も `env.ts` ではなく後段の `loadConfig()` にあることを確認した。指示メモは
  `docs/history/direction.md`「2026-09-07（3回目）」へ移した。登録で `develop/tasks.json` が
  37.6KBになり基準（30KB）を超えたため、`done` の T-116・T-117 をアーカイブ（23.5KBに縮小）。

- **`/plan-tasks` で T-123〜T-127 を登録**。`develop/direction.md` の4項目を現物のコードで
  裏取りして5タスクに分解した。**3項目めの後半（実機テスト環境の構築）はタスクにしていない**
  （2026-09-07に構築・実施済みで、残っているのは `config/` 側だけ → T-126）。
  4項目めの後半（`gitlab.ts` を薄いラッパーに戻す）は `docs/architecture.md`「コミット処理だけは
  `lib/gitlab/`がドメイン型を知っている」節の**既存の設計判断を覆す**ので、覆すか否かを
  T-127 の第一の論点にした。指示メモは `docs/history/direction.md`「2026-09-08」へ移した。
  `develop/tasks.json` は 24KB → 42KB になり基準（30KB）を超えたが、**`done` が0件なので
  移せるタスクが無い**（アーカイブは `done` を移す運用）。T-118〜T-127 のどれかが完了し次第、
  次の登録/セッション開始時の判定でアーカイブする。

- **T-120 完了**: タスクの実行モデルの決め方から「メインセッションのモデル」への従属を外した。
  正典（`docs/workflow.md`「difficulty に応じたモデルの切り替え方」）を
  **「`difficulty` と同じモデルを指定したサブエージェントに必ず委譲する。メインのモデルは
  判断材料にしない」**に書き換え、`.claude/skills/next-task/SKILL.md` 手順4と
  `CLAUDE.md` 手順3を追随させた。コールドスタート分の損は「`difficulty` と実行モデルが常に
  一致すること」を優先して受け入れる、と判断として残してある。**「委譲しないケース」
  （ユーザー確認が要る・会話の文脈に依存する）はモデル選択とは別の軸**なので内容は変えず、
  そこだけメインが実行し実行モデルが `difficulty` と一致しないことを明記した。
  **T-121以降はこの新ルールで実行する。**

- **T-118 完了（T-117の適用）**: `src/index.ts` の `Promise.resolve().then().then().catch()` を
  **top-level await + `try`/`catch`** に書き換え、不要になった冒頭コメント2行も削除した
  （`try` が引数の同期評価も覆うため、コメントの前提が消えた）。
  `scripts/smoke/smoke-fixture.ts` の `await ....then(() => true, () => false)` は
  名前付きヘルパ `fileExists()` の `try`/`catch` にした（サブエージェントは即時実行関数で
  書いてきたが、`withNotFoundFallback()` に揃えるという指示に沿って**メイン側で名前付き関数へ
  直してから受け入れ**た）。残る `.then`/`.catch` は方針に適合する3ファイル4箇所のみ。
  **T-118 は新ルール（`difficulty` と同じモデルのサブエージェントへ委譲）での実行1件目。**

- **T-119 完了**: `develop/test-inventory.md` は**廃止**した（案(b)）。生きていた内容は
  `docs/coding-standards.md`「テスト」節へ統合し、**「埋めないと決めた穴」の正典は
  「足すかどうか」の表（4件）1つだけ**になった。「消さないと決めたもの」は「消すかどうか」の
  「個別の判断（実施済み）」へ。`src/utils/http.ts` の1件はコード側の修正で解決済みのため落とした。
  当時の発見リスト（削除候補・集約候補・追加候補・実施結果）は `git mv` で
  `docs/history/test-inventory.md` に無編集のまま残してある。表に載る識別子4つは実在を確認済み。

- **T-121 完了**: `EnvConfig.accessToken` をブランド型 `AccessToken` にした
  （`src/types/brand.ts` に `toAccessToken()` を追加し、`createClient()` 第2引数の型も変更）。
  基準は `docs/architecture.md`「ブランド型にするのは『同じ`string`の別物と取り違えうる識別子』」で、
  `createClient(host, token)` に `GitLabUrl` と並ぶのが該当。**取り違えが型で止まることを
  メイン側でも実測**（`createClient(env.gitlabUrl, env.gitlabUrl)` が TS2345 で落ちる。確認後復元済み）。
  **形式検証は入れない**判断（`glpat-` はPATの慣習で、Group Access Token / CI変数経由の値では
  前提にできない）。理由は factory のJSDocに残した。呼び出し3箇所はコード変更不要だった。

- **T-122 完了**: `EnvConfig.configPath` を **`configDirPath`** にリネームし（`DEFAULT_CONFIG_DIR_PATH`・
  `loadConfig()` の引数名も追随）、`env.ts` に `parseConfigDirPath()` を新設して
  **パストラバーサル検証＋ディレクトリ実在チェック**を `loadEnvConfig()` の時点で行うようにした。
  `CONFIG_PATH` 環境変数名は変えていない（外部インターフェース）。`loadConfig()` 側の
  `assertSafePath()` はCLI直呼び出し経路のため残し、**二重に走るのを承知で** 「環境変数由来は
  `env.ts`、それ以外の入口は `loadConfig()`」と役割を分けた。これで `env.ts` が初めて
  ファイルシステムに触れるが、`loadEnvConfig()` を呼んだ瞬間だけという性質は変わらない。
  テスト4件追加（348→352）。**`run_start` ログのキーが `configPath`→`configDirPath` に変わり、
  ログの後方互換を壊す**（人が読むCIログのみなので影響は限定的）。

- **アーカイブ**: `develop/tasks.json` が45KBと基準（30KB）を超えたため、`done` の
  T-118〜T-122 の5件を `docs/history/tasks-archive.md` へ移した（18KBに縮小）。
  残るのは `todo` の T-123〜T-127 の5件。

- **T-123 完了（方針決定・コード変更なし）**: e2eテストは**足す**。ただし
  **要件の節ごとのシナリオテストは作らず、対応表も正典として持たない**（二重化と更新コストのため）。
  要件4.1〜4.5の項目はすべてどこかの単体テストが通しており、**穴は項目ではなく連結1箇所**
  （`config/`の実ファイル → `loadConfig()` → 3ステップ → コミット内容・MRタイトル・MR本文）。
  今そこは `test/helpers.ts` の `makeChartAndApps()` の手組みデータでつながっていて、
  食い違っても落ちるテストが1つも無い。正典は `docs/coding-standards.md`「テスト」節の
  「通し（e2e）で守るのは『実ファイル → MRの中身』の連結だけ」（境界=gitbeaker、
  入口=`config-test/` の実ファイル、実GitLabは使わず**スモーク手順も1つも減らさない**）。
  突き合わせ表は `docs/history/test-inventory.md` に日付つきで追記。**T-124 の本文を
  実装指示（3本立て）に更新済み**で、`config-test/` の projectId・valuesPath・アンカー名は
  メイン側で実値と照合した。

- **T-124 完了（T-123の実装）**: `test/main.e2e.test.ts` を新設（3件）。`config.js` をモックせず
  **`config-test/` の実ファイルを読んで** gitbeaker境界のfakeで `run()` を通し、
  ①client単位に3件のMR（sourceBranch・targetBranch・タイトル・本文に実ファイル由来の値）、
  ②コミットされる `values.yaml` の中身（image tag更新・`helm.branchToSync` 反映・HEAD一致は据え置き）、
  ③`targetClients` 絞り込みでMRが1件に減ること、を固定した。
  **素通りでないことをメイン側で変異により実測**: `configDirPath` を `config` に変えると3件とも落ち、
  `stageHelmTargetBranchUpdates()` を no-op にすると②だけ落ちる（どちらも復元済み）。
  fakeは `test/helpers.ts` へ寄せない判断（projectId・パスで応答を分岐させる必要があり形が違う。
  理由はテストファイル冒頭のコメント）。**実バグの発見なし**＝実装は既存の単体テストが記述する
  契約どおりだった。34→35ファイル、352→355テスト。

- **T-125 完了（洗い出しのみ・コード変更なし）**: `develop/parameterization-candidates.md` に
  9項目を「現在値／位置／変えたくなる場面／env・configどちらが妥当か／副作用／推奨」で列挙した。
  **結論は「パラメータ化を積極的に勧める材料は薄い」**——明確に推す項目は0件で、中立寄りは
  #1 固定ブランチ接頭辞 `feature/yadokari/` のみ（他チームのCIルールとの衝突はありうるが、
  `docs/requirements.md` 4.2節がブランチ名を仕様として明記しており、`isFeatureBranch()` 経由で
  `scripts/smoke/` にも波及する）。#2 retry と #4 `CONCURRENCY_LIMIT` の範囲は
  `docs/architecture.md`「既知の制約・注意点」に検討済み・再検討トリガーが既にある。
  **足すかどうかはユーザーの判断待ち**。判断が済んだらこのファイルは役目を終える。

- **T-127 完了（既存の設計判断を覆した）**: `src/steps/apply-updates/sub-steps/submit-merge-request.ts`
  を新設し、「固定ブランチが残っていれば削除 → `mrTargetBranch` から作り直し → 1コミット →
  MR作成」というGitLab APIの呼び出し順を**サブステップの内側**に置いた。`applyUpdate()` は
  サブステップ3呼び出し＋ログだけになり、`gitlab/gitlab.js` からのimportは型のみ。
  `commitFileUpdates()` からブランチ削除を外し、`deleteBranch()` を公開した
  （`Branches.remove` 1本ぶんの薄いラッパーなので `lib/gitlab/` の役割からはみ出さない）。
  **当時の「stepにGitLab APIの呼び出し順が漏れる」という懸念への答えは「漏れる先は
  `sub-steps/` の内側であって `steps/` 直下ではない」**（`buildPlan()` と同じ形）。
  `MrContent` は2つのサブステップが受け渡すので `sub-steps/shared/types.ts` へ移動（原則1）。
  `docs/architecture.md` は「コミット処理だけは〜」節を見出しごと
  **「ブランチの作り直しはサブステップに置き、`lib/gitlab/`は薄いラッパーに保つ」**へ差し替え、
  索引行と `apply-updates/sub-steps/` の表も更新済み。
  **振る舞い不変をメイン側で変異により実測**（ブランチ削除の除去・コミットメッセージの差し替え、
  どちらも該当1件が落ちる／復元済み）。35→36ファイル、355→360テスト。

## 過去セッション: T-128〜T-131（2026-09-08、要件変更: テナント/クライアント2階層固定 → 設定ユニット（深さ1〜2）。`develop/progress.md` から移動）

### 要件変更: テナント/クライアント2階層固定 → 設定ユニット（深さ1〜2）

`config/` のディレクトリ階層が `<chartリポジトリ>/<tenantId>/<clientId>/` の2階層固定で、
テナント分けが不要なchartでもダミーのtenantId/clientIdを作らされていた。これを
`<chartリポジトリ>/<unitPath>/`（深さ1〜2）へ広げた。**T-128〜T-131 の4コミットで完了**
（`4ab3398` → `686df5e` → `04cabe0` → `6345e59`）。

設計判断はユーザーとの対話で確定させた（原文と選択の経緯は
[`docs/history/direction.md`](../docs/history/direction.md) の2026-09-08（2回目））:

- **深さ1〜2に限定**。深さ0と深さ3以上は設定エラー
- **入れ子は設定エラーで即時終了**。固定ブランチ名がプレフィックス関係になるとGitのrefが
  directory/file conflict を起こして共存できないため。D/F conflict はプレフィックス関係の
  ときだけ起きるので、入れ子禁止でこの制約は完全にカバーされる
- **後方互換は取らない**（ログのキーと環境変数名を変えた）
- **語彙は「設定ユニット」**（`ConfigUnitPath` / `unitPath` / `TARGET_UNITS`）

分割の方針は「正典を先に確定（T-128）→ 振る舞い不変の語彙置換（T-129）→ 振る舞いを変える
階層拡張（T-130）→ 実ファイルのフィクスチャ（T-131）」。**振る舞い不変のリファクタと
振る舞いの変更を別コミットに分けた**ので、T-129 は既存360テストが全部通ることだけで守られた。

要点として残しておくこと:

- **ブランチ名は文字列として変わっていない**。`feature/yadokari/<unitPath>` に
  `"tenant1/client1"` を入れると従来と同一なので、GitLab上の既存のオープンMR・固定ブランチは
  迷子にならない（`test/domain/feature-branch.test.ts` で固定）
- **走査は深さで打ち切らない**。打ち切ると深さ3以上に置かれた `config.yaml` が設定エラーでなく
  「対象0件」として黙って無視される。理由は `docs/architecture.md`「設定ユニットの走査は
  深さで打ち切らず、絞り込みより先に階層を検証する」節
- **階層の検証は `TARGET_UNITS` の絞り込みより前**に対象外ユニットも含めて行うが、YAMLの
  読み込みは絞り込み後のみ（無関係なチームの設定ミスで緊急の限定実行を止めないため）
- テストは360 → 373件。e2eが空振りでないことは変異（深さ1を無視するよう壊すと1本目が落ちる）で実測済み

### 2026-09-09 ドキュメント整備のスキル化

**T-146 完了**。本番の定期実行を開始した。CIの手動実行（web、`DRY_RUN=true`）で
`run_start` に `configDirPath: "config"` が出ることを確認し、**CI/CD Variables の
`ACCESS_TOKEN` が `Protected: OFF` で参照できて既定パスが通る**ことを実証した。

- 着手前に2026-09-07のスモークが残していた**MR !28/!29 と固定ブランチ2本を `reset --apply` で除去**。
  これを消すまで2ユニットが `mr_exists` で SKIPPED になり、定期実行の検証にならなかった
- **スケジュールの実設定をAPIで実測**したところ、合意の「平日 JST 9:00」ではなく
  `0 9 * * *` / `UTC`（＝毎日18:00 JST）だった。**ユーザー判断でこのまま採用**。
  「作った」という申告を実値で検証しなければ気づけなかった食い違い
- ユーザー指摘により `update-app-versions` の `web` ルールから **`when: manual` を削除**した
  （理由が正典のどこにも記録されていない既定値だった）。受け入れたトレードオフは
  `.gitlab-ci.yml` のコメントに残してある

**T-151 は着手しない判断で閉じた**（`status: done` / `passes: false`）。理由は下の「未解決」。

**T-157 完了**（`sonnet`、委譲）。改名を実装・テスト・実`config/`・`README.md` へ反映し、
**T-156で先行更新した正典の名前が全てコード側に実在する状態になった**（`AppSpec` 3件・
`RegistryYamlSchema` 4件・`registryYamlPath` 9件・`appSpecs` 28件）。16ファイル +199/-194行、
テストは359件のまま（改名のみなので増減しないのが正しい）。

- 実 `config/` は `git mv` で `RM`（rename）として記録され、`projectId`等の値は不変
- **テストフィクスチャの `appsField()` → `listField(key, ...)` はスコープ増ではなく必然**。
  元はキー名 `"apps"` をリテラルで埋め込んで registry 側と config 側で共用していたため、
  片側だけ `appSpecs` になった時点でキーを引数に取る以外に選択肢がない
- 受け入れで確認: 可否表の据え置き対象4種が残存、旧名5種が0件、`steps/` の try 0件・
  新規の `as`/`?:`/タスク番号 0件、`/maintain-docs` の指摘は既存12件のまま増えず

**T-156 完了**（`opus`、委譲）。`config/` の改名（`chart.yaml`→`registry.yaml`、
`chart:`→`chartToUpdate:`、`apps:`→`appSpecs:`）を正典3ファイルに先行反映した。実装・テスト・
実`config/`は未変更（T-157）。**コード識別子の追随は「外部ファイル形式の写しかどうか」で決める**
という基準を立て、7件の可否表を `docs/architecture.md` に追記した（`ChartRepoConfig` と
`ChartAndApps.chart` はドメイン語彙なので据え置き）。

- **委譲先が既存の矛盾を1件発見**: `docs/requirements.md` 4.1節が「タグ形式は `config.yaml` の
  `apps[].tagFormat`」と書いており、正典である4.4節（chartリポジトリ単位のファイル側）と
  食い違っていた。今回の改名に合わせて修正済み
- **受け入れ時にメインが1点修正**: 「`config.yaml` は各チームが日常的に編集する側」という
  理由づけが、同じ節が退けた「変更頻度・編集者による分割」の軸を連れ戻していたので、
  「設定ユニットの数だけ存在するので改名の手数がその数に比例する」に直した

**T-150 完了**（`opus`、判断タスクのため委譲せず実施）。ドキュメント整備を
`.claude/skills/maintain-docs/` としてスキル化した。**論点1（「冗長・重複・読みにくい」を
検査可能にする）の答えは「機械的検査は候補の抽出までにして、正否は既存正典の1問に委ねる」**。
プロトタイプで実測したところ、実在しない `getProjectWebUrls()` や `test/utils/*.test.ts` は
**廃止・削除の記録として正当**で、機械判定だけでは正否が決まらないと分かった。この切り分けは
`docs/coding-standards.md`「コメント」の「今の挙動の説明か、昔の話か」と同型なので、
新しい基準を作らずそちらを参照している（あの節も同じ判定を「機械化しない」と明記している）。

- 検査は7項目。**確定群**（通読ガード・タスク番号・リンク切れ・索引→本文）は直せば必ず正しくなる。
  **候補群**（本文→索引・実在しない識別子/パス・見出しの重複）は上の1問で正否が決まる
- ユーザーと決めたこと: 実行単位は「全検査 → 指摘一覧 → 選んで修正 → 1コミット」、
  **委譲可・`/loop` 可**、対象は8ファイル（`docs/history/` と `requirements-grilling.md` は
  当時の記述を残す性質のため対象外）、検査1は `README.md`/`CLAUDE.md` を除外（通読される入口のため）
- 「委譲可・`/loop` 可」と「ユーザーが選んで修正」の噛み合わせは、**選択者がいない実行では
  確定群だけを直し候補群は報告に留める**という既定で両立させた
- 実測で拾った落とし穴2つをスキル本文に明記した: **zsh は変数の単語分割をしない**ので `sh` で
  実行する、**BSD sed は `\|` の交替を解釈しない**ので `sed -n -E` を使う。
  どちらも最初のプロトタイプが全件NGや無検出になって気づいたもの

### 2026-09-09 ソースコード全体の棚卸し

`src/` と `scripts/` の全44ファイル（3,377行）を読み、**アーカイブ・保守性・拡張性・可読性・
型安全**の観点で洗い出して **T-158〜T-170 の13タスク**を登録した（正典の修正も検討対象に含めた）。
ユーザーの希望で**1項目=1タスク**に分けている。

- **思いつきは全件コマンドで裏を取ってから残した。** 最大の収穫は **T-158**で、
  gitbeaker 経由で存在しないホストを叩いて `isFatalError()` が `false` を返すことを実測した。
  **正典3箇所が約束している挙動が実装されていない**のに、テストが実在しないエラーの形
  （平たい `code`）を検証しているため気づけない状態だった
- **T-160 は `git log -S` で撤回の取り残しと特定できた**。`logger.warn` は T-134 で新設され
  T-144 の撤回で呼び出し元が消えたが、関数とJSDocだけが残っていた。**T-161 で
  `noUnusedLocals` を入れれば、この種の残骸は次から自動で見つかる**
- tsconfig の追加フラグは `npx tsc --noEmit --<flag>` で1つずつ実測し、**7フラグがエラー0件**、
  `noImplicitReturns` が1件と分かったうえで T-161 に落とした（見積もりではなく実測値）
- **正典に既に判断があるものは蒸し返さなかった**（stepの入口の重複共通化・`StepOutcome` の
  分離・`env.ts` のテスト専用export・スプレッド蓄積・未到達行3件の5件）。
  出さなかった理由も `docs/history/direction.md` に残してある

### 2026-09-09 承認が要る3件の実行

**T-159 完了**（`opus`、承認が要るためメインで実施）。**下調べで前提が誤りだと分かった**のが最大の収穫で、
gitbeakerは既定 `queryTimeout=300000`ms を `@gitbeaker/core` が全リクエストの `AbortSignal.timeout()` に
配線済みだった（＝タイムアウトは元から存在した）。ユーザー判断で**値を明示＋タイムアウトも fatal 化**を採用。

- **「タイムアウトが無い」という洗い出し時の指摘は誤りだった。** 実測（永久に応答しないローカルサーバに
  `queryTimeout:300` で接続）で307msの発火と `GitbeakerTimeoutError` を確認してから選択肢を組み直した
- `GitbeakerTimeoutError` はHTTPステータスも `code` も持たないため、`isFatalError()` は**エラー名**で
  判定する。`instanceof` にしないのは、パッケージの実体が二重に解決されると偽になるため
- **変異で守れていない範囲も記録した**: `createClient` の `queryTimeout` を消してもテストは落ちない
  （gitbeakerの既定値と同値のため）。テストが守るのは「実効値が5分であること」
- gitbeakerが429/502に行う**内部リトライ（最大10回）も同じsignalを共有**するので、5分はリトライ込みの総予算
- **この調査の副産物として T-171 を登録した**。gitbeakerの内部リトライはバックオフの単位が
  ミリ秒で合計255.75msしかなく、しかも使い切ると `cause` の無い `GitbeakerRetryError` を投げるため、
  自前の指数バックオフが429/502で一度も動いていない

**T-168 完了**（`sonnet`、承認が要るためメインで実施）。ユーザー判断で **`durationMs` への統一**を採用し、
ログキーの命名の例外が消えた。`timed()` の戻り値のフィールド名ごと変えて7箇所を置換。

- **`docs/history/` の3件は対象外**（当時の記述をそのまま残す規約）。完了条件に書いた
  `grep` はこの除外を含んでいなかったので、evidence に明記した
- 変異確認: ログキーだけ `duration_ms` に戻すと `main.test.ts` が落ちる

**T-161 完了**（`sonnet`、委譲）。エラー0件の7フラグ＋`noImplicitReturns` の計8つを `tsconfig.json` に
追加した。`erasableSyntaxOnly` は見送り（`tsc`/`tsx` のどちらも parameter property を扱えるため）。

- **受け入れ時にメインが独立に変異検証した**（委譲先の報告を鵜呑みにしない）: `?:` に `undefined` を
  渡すと TS2375、未使用の `const` で TS6133、`helm.ts` の `return undefined` を戻すと TS7030
- **`noUnusedLocals` が入ったので、T-160 の `logger.warn` のような撤回残骸は次から型チェックで落ちる**
- `docs/coding-standards.md`「`undefined`」節に、`?:` 規約が型でも強制される旨を2行追記

**この3コミットでメイン側の手順ミスを1つ踏んだ。** T-159・T-168 の記録で `develop/tasks.json` を
Pythonで書き換えたあと `pnpm format` を回さずコミットしたため、**その2コミットは `format:check` に
落ちる状態で入っている**（単一要素配列が1行に畳まれるかどうかの差のみ。コード・テストへの影響は無い）。
T-161 のコミットで整形し直した。手順は下の「注意」に追加してある。

**T-162 完了**（`opus`、承認が要るためメインで実施）。ユーザー承認は**中間案**で、`logContext` と
`describePlan()` の戻り値に型を与え、`logger` の引数は `Record<string, unknown>` のまま残した
（ログを1行足すのに型を触らなくてよい自由度を優先）。`Record<string, unknown>` は **13件→6件**。

- **出力JSONが1文字も変わっていないことを、`test/` に差分ゼロのまま `main.test.ts`・
  `main.e2e.test.ts` が通ることで担保した**（ログは `README.md` に例が載る外部インターフェース）
- 変異確認: `describePlan` のキー名を打ち間違えると TS2561、`logContext` に無い項目を読むと TS2551。
  **どちらも変更前は黙って通っていた**
- `noPropertyAccessFromIndexSignature` は入れていない。`logger` の引数を `Record` のまま残す案を
  採ったので、テスト側の4件（`.reason` の index signature 越しの読み取り）が解消しないため
- 型の置き場所は `docs/architecture.md` の表の4行目・5行目に対応。表の例示に
  `ChartUpdateLogContext` を追記した

### 2026-09-09 `/loop /next-task` による自動進行

**T-158 完了**（`opus`、委譲）。棚卸しで見つけた**本物のバグ**の修正。undici の `fetch` が
`TypeError: fetch failed` を投げ `code` を `cause` に入れるため、`isFatalError()` が
DNS障害・接続拒否を検出できていなかった。正典3箇所（`README.md`・`CLAUDE.md`・
`docs/coding-standards.md`）が約束していた「ネットワーク障害は即時終了」が効いていなかった。

- **正典は無修正**。元から正しい方針を書いており、ズレていたのはコード側だけだった
- `cause` は**1段だけ**辿る。際限なく辿ると無関係な内側エラーの `code` で実行全体を止める危険が
  あり、1段で足りる根拠は `rethrowWithAppContext()` が「致命的エラーは包み直さない」ことを
  保証していること（既存の不変条件が設計判断の裏づけになった）
- **受け入れ時にメインが独立に実測**: 連鎖は `TypeError -> Error(code=ENOTFOUND)` の1段で、
  DNS失敗・接続拒否とも `isFatalError: true`（着手前は false）
- 変異確認: `cause` を辿るのをやめると3件、`ETIMEDOUT` を消すと2件が落ちる

**T-160 完了**（`sonnet`、委譲）。T-134 で新設され T-144 の撤回で呼び出し元が消えた `logger.warn` を、
JSDocごと削除した。2ファイル・26行の削除のみで、`redact()`/`SENSITIVE_KEYS` と `info`/`error` は無傷。

- 正典に warn レベルを要求する記述が無いことを**メイン側でも独立に grep して確認**した
  （あれば「呼び出し元が無いほうが欠陥」になり、結論が逆になる分岐だった）
- テストは 367→**365**で、削除した2件とちょうど一致

**T-163 完了**（`sonnet`、委譲）。`cacheByArgs()` を `lib/gitlab/` から `src/utils/cache.ts` へ上げ、
`remote-cache.ts` の手書きキャッシュ（`#` 連結キー）を置き換えた。`RemoteCache` の公開型と
`verify-config.ts` は無変更。

- **受け入れ時にメインがテストを1件足した**。委譲先の実装自体は正しかったが、区切りを
  `\0`→`#` に戻す変異で**365テスト全部が通ってしまい**、このタスクの主目的である
  キー衝突の回避が1件も守られていなかった。`test/utils/cache.test.ts` を新設して
  `("a#b","c")` と `("a","b#c")` が別キーになることを検証する（追加後は同じ変異で1件落ちる）
- **委譲先の報告を実行して確かめないと見つからない穴だった**。完了条件の `grep` は全て
  満たしており、報告だけ読むと問題が無いように見える

**T-164 完了**（`haiku`、委譲）。`verify-config.ts` の `[] as string[]` 2箇所を型注釈付きの
`const` に置き換えた。これで **`src`+`scripts` 全体で `brand.ts` 以外の `as` キャストが0件**になった。

**ここで `/loop /next-task` を停止した。** `develop/direction.md` にユーザーが新しい指示を
書いていたため（`/next-task` 手順1の「未タスク化の指示が残っていればタスク化が先」）。

- **メイン側の手順ミス**: T-163 のコミットで `git add -A` を使ったため、ユーザーが書いた
  `direction.md` の指示メモ2行を**T-163のコミットに巻き込んで**いた（内容は失われていない）。
  履歴は書き換えない。**記録コミットではパスを明示して `git add` する**

**T-171 完了**（`opus`、承認が要るためメインで実施）。**実測が指摘より重い欠陥を掘り当てた**。
429/502 は gitbeaker が内部で10回リトライして `cause` を持たない `GitbeakerRetryError` に化けるため、
**502 が fatal 判定から漏れていた**（正典3箇所が「5xxは即時終了」と約束しているのに、
ゲートウェイ障害でも各設定ユニットを1件ずつ ERROR にして進んでしまう）。

- 実測値: 429=10回/280ms、502=10回/282ms、503=3回/3015ms、504=3回/3013ms、500=1回/8ms。
  **503/504 は自前のリトライが設計どおり効いている**（gitbeakerのretryCodesに入っていないため）
- ユーザー承認は「status を **fatal 判定にだけ**使う」。`isRetryable()` には渡さないので
  **追加リクエストはゼロ**（gitbeakerが既に10回試したあとに、こちらから叩く相手ではない）
- 修正後の実測で 502 が `fatal=true` になり、**リクエスト回数は10回のまま**であることを確認
- メッセージが読めないときは `undefined` を返して fatal に昇格させない（ライブラリが書式を
  変えたときに、黙って実行全体を止めないため）

**ユーザー指摘により `src/utils/http.ts` を `src/lib/gitlab/errors.ts` へ移した**（タスクIDなし）。
`src/utils/` は正典が「**ドメイン知識を一切持たない**汎用ユーティリティ」と定義しているのに、
gitbeakerのクラス名とメッセージ書式を持つ状態になっていた。

- **原因の大半はこのセッションのメイン**。構造依存（`cause.response.status`）はセッション前から
  あったが、`GitbeakerTimeoutError`（T-159）と `GitbeakerRetryError` + `/last status code: (\d+)/`
  （T-171）を足したのはメイン側。**ライブラリのクラス名を文字列で持ち英語メッセージを
  正規表現でパースする**のは構造依存とは質が違い、原則2に照らせば最初から `lib/gitlab/` だった
- ユーザー判断で **`utils/retry.ts` は汎用のまま残した**。再試行の可否を引数
  （`isRetryable`）で受け取る形にし、429/502/503/504 という選定は
  `lib/gitlab/errors.ts` の `isRetryableError()` が持つ。両者は `gitlab.ts` の非公開
  `withGitlabRetry()` が束ねる（13箇所の呼び出しはこれ1つに集約）
- 汎用な `toErrorMessage()` だけ `utils/errors.ts`（`FatalError` の隣）へ移し、
  **`utils/http.ts` はファイルごと消えた**。`git mv` で履歴を残している
- 正典も追随: `CLAUDE.md`・`docs/coding-standards.md` の「HTTPエラーの判定は〜を使う」の
  名指し、`docs/architecture.md` の `src/utils/`・`src/lib/` の責務表、
  「`lib/gitlab/` にはGitLabという外部システムを知っているものだけを置く」節に判断の根拠を追記
- **判断の軸として書き残したこと**: 「ライブラリを差し替えたときに書き換える範囲が
  `lib/gitlab/` に収まるか」。利用者が1ファイルしかないことは `utils/` から出す理由にならない

**T-165 完了**（`sonnet`、委譲）。設定ユニットの位置表示（`<chartDirName>/<unitPath>`）の手書き3箇所を
`domain/config-unit.ts` の `buildConfigUnitLocation()` に集約した。

- **受け入れでまた「完了条件は満たすが守られていない」を拾った**（T-163 と同型）。委譲先は
  「テストが無改変で通ったことが文言不変の証拠」と報告したが、**区切りを `::` に変える変異でも
  375テスト全部が通った**——この文言を assert しているテストが1件も無かった。
  `test/domain/config-unit.test.ts` に書式を固定するテストを2件足して塞いだ
- **教訓**: 「既存テストが通る＝振る舞いが変わっていない」は、そのテストが対象を実際に
  検証しているときにしか成り立たない。**受け入れでは変異を当てて確かめる**

**T-166 完了**（`sonnet`、委譲）。`registry.yaml` / `config.yaml` のファイル名リテラルを
`schema.ts` の2定数に集約した。`join()` の6件だけでなくエラーメッセージ本文も含めたので、
`grep -n '"registry.yaml"|"config.yaml"' src/lib/config/*.ts` は定義2行のみになった。

- **置き場所は `schema.ts` が必然**。`config.ts` に置くと `config.ts` → `chart-and-apps.ts` →
  `config.ts` の**循環import**になる（受け入れ時にメインが確認。委譲先の理由づけより強い根拠）
- **委譲プロンプトに「主張は変異で確かめること」を足した効果が出た初回**。委譲先が自分で
  変異（`config-x.yaml`）を当てて26件落ちることを確認して報告し、メインの独立検証とも一致した。
  T-163・T-165 で2回続いた「完了条件は満たすが守られていない」は今回は発生していない

**T-167 完了**（`haiku`、委譲）。タグ名の中でのブランチ名表現（`/`→`-`）を
`toBranchLiteralInTag()` に一本化した。置換をやめる変異で6件落ちることを双方で確認。

- **受け入れでJSDocの事実誤認を2箇所直した**。`fillTagFormat()` の説明が「`{branch}`は
  **呼び出し元が渡した**`branch`（"/"を"-"に置換済み）」となっていたが、実際は自分で変換して
  いる。**このタスク以前からの誤り**で、関数に名前が付いた今なら両方の JSDoc を同じ関数へ
  向けられるため、パース側と生成側の対称性がコメントからも読めるようにした
- 委譲先の変異検証は正確だった（6件・落ちたテスト名も一致）。往復テストが既存で3箇所ある
  ことも確認済みで、追加は不要だった

**T-169 完了**（`sonnet`、委譲）。数値に見えるスカラーのクォート化は **`yaml` パッケージの
正しい挙動**と結論し、実装は変えず `docs/architecture.md`「その他」に制約として書いて閉じた。

- **メインが独立に実測して委譲先の結論と一致を確認**。`&b 2026`→`"2027"`・`&b 007`→`"008"`・
  `&b true`→`"false"` はクォートが付き、`&b no`→`yes`（YAML1.2で `no` は文字列）と
  `&b main`→`develop` には付かない。**型を保つために必要なときだけ最小限に付く**
- `docs/requirements.md` は変更なし。`helm.branchToSync` は `z.string()` が数値を弾くので、
  「数字だけのブランチ名を使うな」を運用の禁止事項として書くのは的外れという判断
- 足したテストは素の `yaml.parse()` でも型を確認しており、`String()` 変換に依存していない

**T-170 完了**（`sonnet`、委譲）。`findAnchorNode()` の戻り値を判別可能ユニオンにして、
「アンカーが無い」と「アンカーはあるがスカラーでない」を区別できるようにした。論点2
（2関数が同じ不変条件を投げる件）は**統合しない**結論（到達不能な防御的分岐は残してよい規約）。

- 直す判断の根拠は `docs/requirements.md` 4.4節の明文（アンカーは**スカラー値**に付ける構成が前提）。
  規定があるので「規定違反を検知するメッセージ」に価値がある
- **残した制約**: `verify-config.ts` は `getValueAtAnchor()`（`string | undefined`）経由なので
  実在チェックでは両者を区別できない。戻り値契約を変えない制約とのトレードオフで意図的

**メイン側の手順ミスが再発した。** T-169 のコミット（`a450a13`）に整形前の `develop/tasks.json`
が入っていた（`pnpm format` を記録の**前**に回してしまった）。T-165〜T-167 は無事。
T-170 のコミットで整形し直し、**手順を「記録を書く → `pnpm format` → `pnpm check` → コミット」に
固定**した（下の「注意」を更新）。

**T-174 完了**（`opus`、承認が要るためメインで実施）。`stageHelmTargetBranchUpdates()` への
`BranchExists` の注入をやめ、`source`（`ValuesYamlSource`＝`gitlabCache`+`chart`）から直接
呼ぶ形にした。引数が4→3、`BranchExists` 型は消滅。

- **指摘のとおり注入は情報を隠せていなかった**。同じ関数が `source` を別の引数で受け取っており、
  JSDoc の「サブステップ側はキャッシュの存在を知らずに」は事実と違っていた
- **この変更で関数型の注入が0件になったので、正典の節を見出しごと書き換えた**（索引も追随）。
  「注入するのはキャッシュを隠すときだけ」→「注入しない。キャッシュを持つ側が工場関数を公開する」。
  `ReadDraftValuesYaml`（過去に廃止）と `BranchExists` を**同じ理由でやめた2例**として並べてある
- **テストは無改変で通った**（`test/` の差分0行）。既存テストが `buildPlans()` 経由で
  `lib/gitlab/gitlab.js` をモックする作りで、注入の有無に依存していなかったため
- 変異2件で確認: 実在確認を消すと4件、別のprojectIdを見ると3件落ちる

**`develop/tasks.json` の `done` 9件をアーカイブした**（T-146・T-151・T-157・T-158・T-159・
T-160・T-161・T-162・T-168）。`done` が9件・30,240バイトで基準（10件 or 30KB超）にかかったため、
`/next-task` 手順1の検査点でその場で実施。**86.7KB → 34.6KB**、`done` は0件になった。

- 移した内容が `docs/history/tasks-archive.md` に一字一句存在することを全件照合し、**欠落ゼロ**を確認
- `progress.md` 側は小節が全て最新日付（2026-09-09）なのでアーカイブ対象外
- **`docs/history/tasks-archive.md` の冒頭は「節は `T-001` から昇順に並べる」と書いているが、
  実態は完了順の追記**（末尾は T-145 → T-149 → T-153 → T-155 → T-154 → …）。既存の実践に
  合わせて末尾に追記した。記述と実態のズレは `/maintain-docs` の検査対象
