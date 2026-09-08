# 現在の状態

最終更新: 2026-09-08（**タグ形式の仕様を `/grilling` で再検討**し、semver廃止・`{time}` 必須化・
`tagNaming`→`tagFormat`・用語統一を **T-144** として登録した。実装は未着手。
その前に実施した定期メンテの棚卸し（T-136〜T-143）は全件完了済み。あわせて **T-126・T-145 も完了**し、
`config/` の運用方針を決めて `config-test/` を `config/` に統合した（残るは T-146 のみ）。
前回までの流れは下の「完了したこと」を参照）

T-001〜T-146 のうち T-146 を除く全タスクが完了し、[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)
へ移した。過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

### 定期メンテの棚卸し（2026-09-08）

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

## 次にやること

- ~~**T-147（progress.md のアーカイブ基準とトリガーを定義、`opus`）**~~ **完了**。
  **`todo` を判定対象外にした**（ユーザー承認）。`tasks.json` は `done` の件数と `done` の
  サイズで判定する。全体サイズで測っていた頃は `todo` だけで30KBを超え、
  **本セッションだけで4回空振り**していた（基準は超えるのに移せるものが0件）。
  `progress.md` は「完了したこと」配下の小節を `### YYYY-MM-DD 〜` 形式に必須化し、
  最新の日付以外があればアーカイブ対象。2ファイルを**同じ検査点でまとめて判定**する。
  - 新基準の検証: 現状の `tasks.json` は「不要」（空振り解消）、`progress.md` は
    小節3件・日付混在で「アーカイブ対象」と正しく判定される
  - **実アーカイブは T-148**（このタスクは定義のみ）

- ~~**T-152（`values-yaml-draft.ts` の型と命名の見直し、`sonnet`）**~~ **完了**。
  `DraftValuesYaml`（`ValuesYamlDraft` と語順違いの紛らわしい名前）を削除してインライン型に、
  戻り値のフィールドを `content`→`valuesYamlContent` に改名（呼び出し側2箇所の分解時の
  改名が不要になった）。`ValuesYamlEntry` は非exportへ。

- **T-144・T-145 は完了**。残る `todo` は **T-146〜T-150**。
- ~~**T-153（`tagFormat` の置き場所を決め、正典を先に更新、`opus`）**~~ **完了**。
  ユーザーと詰めた結果、**ファイル分割の軸は「変更頻度」**で確定（`docs/requirements.md` 4.4節が
  「よく変更する/滅多に変更しない」と「運用値/chart構造」の**2つの軸を並べて書いており**、
  `tagFormat` について反対の答えを出していた。`docs/architecture.md` の旧判断は後者で
  判断していた誤り）。**`tagFormat` は chartリポジトリ単位の `config/<chart>/sources.yaml` へ。**
  - **`anchors.yaml` の改名は不要になった**（`tagFormat` が入らないため理由が消えた。
    当初見積もっていた106箇所の変更がまるごと不要）
  - `projectName` は `sources.yaml` を正典としつつ各ファイルにも残す（単体で読めることを優先）
  - `validateTagFormatConsistency()` は残す（chartリポジトリをまたぐ食い違いの検出に役割が変わる）
  - 実データの裏取り: ソースリポジトリ2件が3設定ユニットに5エントリ、`tagFormat` は5箇所とも同値
- ~~**T-155（`config/` を2ファイル構成に改める、`opus`、T-153依存）**~~ **完了**。
  T-153 の `sources.yaml` 案は**ファイル数を7→8、app追加時に触る数を2→3、`projectId`/`projectName`
  の重複を10→12組に増やしていた**（`tagFormat` の重複5→2だけが改善）。実測して比較し、
  **`chart.yaml` + `config.yaml` の2ファイル構成**に改めた（4ファイル・触る数2・重複7組で、
  **全指標が移行前より良い唯一の案**）。`anchors.yaml` は `config.yaml` に統合して廃止、
  `sources.yaml` は作らない。分割の軸は「変更頻度」→**「スコープ」**（chartリポジトリ単位 /
  設定ユニット単位）に変更。変更頻度で分けない理由3点は `docs/architecture.md` が正典。
- ~~**T-154（2ファイル構成へ移行、`sonnet`）**~~ **完了**。`anchors.yaml` を廃止して
  `config.yaml` へ統合、`tagFormat` を `chart.yaml` の `apps[]` へ。実 `config/` は
  **7→4ファイル**、テストは357→**359件**。
  - **受け入れ時に `docs/architecture.md` の更新漏れを修正した**（T-153・T-155 で正典を
    書き換えたとき、旧「3ファイル分割」節・節の索引・各ファイルの責務表・型の置き場所の
    `Anchors`/`AnchorsApp` を直し忘れていた。委譲先が指摘してくれた）。
    **正典を書き換えるときは、同じドキュメント内の索引・表・型名まで grep で洗うこと。**
- **T-151（`StepOutcome` の settled が SKIPPED と ERROR を混ぜている点を解く、`opus`、依存なし）**。
  指摘は事実。`settle("SKIPPED")` が4箇所、`settleAsError()` の `"ERROR"` が同じ枝に入る。
  加えて `settle()` の引数が `ChartUpdateResult` で **`"CREATED"` も型上は渡せる**（実際は
  `apply-updates` が `ok("CREATED")` で返すため渡されない）。消費側3箇所は両者を区別していない。
  3枝に分けるか型を狭めるだけにするかが論点。**`docs/architecture.md` のエラー方針に関わるので
  承認が要る＝`/loop` に載せない。**
- **T-152（`values-yaml-draft.ts` の型と命名の見直し、`sonnet`、依存なし）**。
  `ValuesYamlEntry` と `DraftValuesYaml` はファイル外で**0件**。`ValuesYamlDraft`（下書き本体）と
  `DraftValuesYaml`（読み込み結果）が**語順を入れ替えただけの名前**で隣り合っている。
  `docs/architecture.md`「下書きは受け取って返す」の3つの不変条件は維持する。`/loop` 可。
- ~~**T-149（TARGET_UNITS の説明文から実在しない具体名を外す、`opus`）**~~ **完了**。
  承認された方針は「メタ変数のみ（`<ユニット名>` / `<第1セグメント>/<第2セグメント>`）＋
  深さの詳細は `docs/requirements.md` 4.4節に集約」。8ファイル21箇所を置換した。
  **判断の根拠**: `README.md` の構成図と `docs/requirements.md` 216行目が既に
  「メタ変数が本体、具体名は『例:』の括弧内」という書き方をしており、設定ユニットの階層だけが
  そこから漏れていた（新しい規約ではなく既存規約の適用漏れ）。
  - `docs/smoke-test.md` は**対象外のまま残した**。`TARGET_UNITS=tenant2/client1,...` は
    実際に走らせるコマンドで、`config/` の実フィクスチャを指しているため。
  - `README.md:91` の `mkdir` とログ出力例2件はリテラルが要るのでメタ変数化せず、
    `my-unit` / `my-group/my-unit` に置き換えた。
- **T-150（ドキュメント整備の定型作業をスキル化、`opus`、依存なし）**。対象は `docs/` の
  `history/` 以外・`README.md`・`CLAUDE.md`。145タスク中10件（T-028・T-029・T-031・T-039・
  T-057・T-077・T-078・T-128・T-141・T-142）が同じ形だったことが根拠。
  **最大の論点は「冗長・重複・読みにくい」を検査可能な形に落とすこと。**
  `/loop` には載せない。
- **T-147（progress.md のアーカイブ基準とトリガーを定義、`opus`、依存なし）**。この
  `progress.md` が455行・42.7KB まで肥大化し、うち376行が「完了したこと」になっている。
  規約（`docs/workflow.md`「progress.md の構成」の「このセッション分のみ」）はあるのに、
  アーカイブのトリガー判定が `tasks.json` の数値（`done` 10件／30KB超）にしか無く、
  `/next-task` 手順6 は progress.md へ**追記するだけ**で減らす手順を持たないため再肥大化した。
  トリガー・境界の判定方法を決めて `docs/workflow.md` と両スキルに組み込む。
- **T-148（定めた基準で実際にアーカイブ、`sonnet`、T-147依存）**。T-147 で決めた基準の初適用。
  「次にやること」「未解決」「注意」は残す（**「注意」は T-146 の完了条件が参照している**）。
- **T-146（既定パスで定期実行を開始、`sonnet`、T-145依存）**。`DRY_RUN=true` の手動実行 →
  ログ確認 → pipeline schedule 作成（**平日 JST 9:00・`DRY_RUN` は載せない**）。
  **GitLab UI操作はユーザーが行う**ので `/loop` には載せない。CI/CD Variables は登録済みだが
  **schedule は未作成**（2026-09-08時点）。
  - テスト用アクセストークンは**失効させず本番用として継続利用する**方針に決まった。
    下の「注意」の記述を更新して宿題を閉じるのは T-146 の完了条件に含めてある。
- **定期メンテで登録した T-136〜T-143 は全件完了**（洗い出しの中身は上の「完了したこと」）。
  残る `todo` は **T-126 と T-144** で、T-126 はユーザー承認が要るのでループには載せない。
  - ~~**T-136（`sonnet`）**~~ **完了**。残った `client` はパス例と実フィクスチャ名のみ。
  - ~~**T-137（`sonnet`）**~~ **完了**。「埋めない穴」は3件に減った。
  - ~~**T-138（`sonnet`）**~~ **完了**。ここで見つかった穴が **T-143（`sonnet`、T-138依存）**。
    `escapeRegExp()` を守るテストが1件も無い（外しても全テストが通る）ので、テンプレートの
    区切り文字に `.` 等を使うと静かに誤マッチする
  - ~~**T-139（`sonnet`）**~~ **完了**。(a) 消す を採用。理由は architecture.md の新節。
  - ~~**T-140（`sonnet`）**~~ **完了**。3候補とも畳むだけで削除なし。`it.each` を初導入した。
  - ~~**T-141（`haiku`）**~~ **完了**。ログ例が実装と1対1で対応するようになった。
  - ~~**T-142（`sonnet`）**~~ **完了**。
  - ~~**T-143（`sonnet`）**~~ **完了**。棚卸し由来のタスクはこれで全件done。
- **T-126（`config/` の運用方針、`opus`）は `/loop /next-task` に載せない**
  （`config/` への登録が本番の pipeline schedule の対象を変えるため、ユーザー承認が要る）。
- **設定の構成が変わったので、次回の実機スモークは `docs/smoke-test.md` の手順1から
  やり直す。** 旧ブランチ `feature/yadokari/tenant1/client1` がGitLab上に残っていれば
  `smoke-fixture.ts reset --apply` が拾って片付ける（`isFeatureBranch()` は接頭辞判定のみ）。
  **統合後はスモークも定期実行も同じ `config/` を見るため、`CONFIG_PATH` の指定は不要**。
  同じ固定ブランチを使うので、スモークと定期実行を同時に走らせないこと。
- `scripts/lint/validate-config.ts` はディレクトリを**位置引数**で受け取る（`CONFIG_PATH`
  環境変数では効かない）。統合後は既定の `config/` を見るので `pnpm lint:validate-config` だけでよい。
- 新しいGitLab読み取りをキャッシュ機構に載せる手順と「載せてよいかの判断」は
  `docs/architecture.md`「GitLabへの問い合わせのキャッシュは`lib/gitlab/`に列挙し、バッチ単位で
  1つ持ち回る」節にある。
- 「埋めない穴」「消さないと決めたもの」の正典は `docs/coding-standards.md`「テスト」節に
  移した（T-119）。判断を変えたくなったら、まずそちらの理由を更新する。

## 未解決

- **`develop/tasks.json` のアーカイブ基準（30KB超）が、`todo` だけで超えたときに機能しない。**
  T-151・T-152 を登録した時点で39.5KBに達し、`done` の T-149 を
  `docs/history/tasks-archive.md` へ移したが、**残り6件の `todo` だけで32.9KB**あり基準内に
  戻らなかった。`docs/workflow.md`「肥大化したときのアーカイブ」が定める対処は
  「`done` を減らす」だけなので、`done` が0件のこの状態では打つ手が無い。
  **T-147（アーカイブ基準とトリガーの定義）で一緒に扱う。**

- 上の棚卸しで見つかったうち、**次の2件は着手しない判断**（ユーザー判断、2026-09-07）。
  判断を変えたくなったときのために理由だけ残す:
  - `filterTargets` のオープンMR確認（`src/steps/filter-targets/filter-targets.ts`）は
    chartAndApps ごとに1回で、同じ `chart.projectId` を共有する client の数だけ走る。
    プロジェクト単位で `state: "opened"` を1回引いてローカルで `sourceBranch` を突き合わせれば
    N→1 にできるが、他人が立てたMRが多いプロジェクトではページングのコストが乗るため、
    client数が増えるまでは割に合わない
  - `createResolveLatestTags()` のキャッシュキーが `projectId:branchToSync` なので、
    同じappを別clientが**別ブランチ**で追跡していると `listTags`（プロジェクト全タグ）を
    2回引く。影響が小さいので見送り

## 注意

- `config/` には実在の登録だけを置く（架空の設定例を置くとCIの `validate-config-remote` が
  必ず失敗する）。定期実行の登録とスモーク用フィクスチャは**同居させる**（理由は
  `config/README.md`）。記述例は `docs/requirements.md` 4.4節、実物は
  `config/yadokari-smoke-test-chart/`
- `<名前>/<名前>.ts` の形（`src/lib/` の gitlab / config、`scripts/lint/verify-config/`）で
  統一している。同名のファイルとディレクトリを並べない（T-092/T-094 の命名判断に効く）
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている
- リモートは `origin` が `github.com/sinnlosses/helm-yadokari` と
  `gitlab.com/sinnlosses-group/helm-yadokari` の2つの push URL を持つ。
  `git push`/`git fetch` は両方に対して行われる
- gitlab.com 上に検証用の `sinnlosses-group/yadokari-smoke-test-chart` プロジェクトが存在する
  （削除せず残置）
- T-064以降の変更は2026-09-07の実機スモークテストで検証済み。**テスト用のGitLab
  アクセストークンの失効はまだ（ユーザー対応）**。gitlab.com 上には今回作ったMR !28/!29 と
  固定ブランチ2本が残っている（次回の `reset` で片付く）
