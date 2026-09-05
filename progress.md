# 現在の状態

最終更新: 2026-09-06（T-043: 追跡ブランチ切り替えの検知と、`refactor/repo-cleanup` のmainへのマージ）

T-001〜T-021（要件定義・CLI実装・GitLab実機検証・スキーマ再設計・MR分割単位の変更など）は
すべて完了済み。当時の詳細な記録は [`docs/history/progress-archive.md`](./docs/history/progress-archive.md)
に、タスク単位の詳細な証跡は [`docs/history/tasks-archive.md`](./docs/history/tasks-archive.md) に
退避してある（`tasks.json` の `evidence` はコミットハッシュ・テスト件数・アーカイブへの参照に絞る運用）。

## 完了したこと（このセッション）

- **リポジトリ全体のリファクタリング監査（2026-09-05）**: ユーザー依頼「ドキュメントやソース
  コードをリファクタリング、整理したい。改善点を見つけてタスク化して」を受けて `src/`・`test/`・
  `docs/`・ルート設定ファイルを一巡し、改善点を T-022〜T-031 として `tasks.json` に登録
  （コード変更なし。監査時点で `pnpm check` は 19ファイル・267テスト全passのクリーンな状態）
  - コード: steps/3ファイルの定型コード重複（T-022）、outcome振り分けreduceの重複（T-023）、
    イメージタグ／Helm向き先ブランチの型・スキーマ・Acc・ラッパー4重複（T-024）、
    dead code（`isPlainObject`）と到達不能コード（T-025）、`process()`の名前衝突を含む
    命名の不統一（T-026）、引数8個の`buildAppUpdatePlan()`（T-027）
  - ドキュメント: README「設定」章とrequirements.md 4.4節の二重管理（T-028）、
    プロジェクト構成ツリー・`config-test/`・`.env.example`のドリフト（T-029）、
    progress.md/tasks.jsonの肥大化（T-030）、architecture.mdのJSDoc二重管理と履歴混在（T-031）
  - Standardsのハード違反（`as`キャストの濫用、`let`の不適切な使用、環境変数のenv.ts外での参照、
    HTTPエラー処理の自前実装など）は0件

- **T-025完了**: dead codeと小さな品質の穴の掃除。`src/utils/object.ts`（`isPlainObject`、
  src/からの参照0件）とそのテストを削除／`utils/retry.ts`の`let lastError`+到達不能な
  `throw lastError`を再帰ヘルパー`runAttempt()`に置き換え／`utils/cache.ts`の`getOrFetch()`を
  `V extends {}`に制約してundefinedを値に持てない穴を型で封鎖／vitestのjunit reporterを
  CI時のみ有効化（ローカル実行でtest-results.xmlが生成されなくなった）。pnpm check（263テスト）通過
- **T-023完了**: `filterTargets()`/`buildPlans()`で重複していた振り分けreduceを
  `src/utils/partition.ts`の`partitionMap()`+`left()`/`right()`に共通化（テスト5件追加）。
  型設計を2回失敗（オブジェクトリテラルだとternary正規化で`undefined`が混入、`{side, value}`形式だと
  LとRを取り違えて推論）した末、プロパティ名で側を表す`{left: L} | {right: R}`に落ち着いた。
  pnpm check（268テスト）通過
- **T-026完了**: 各stepの「並列処理1件分」の関数の命名を`<動詞>+単数形の対象`に統一。
  `alreadyMrExists()`→`evaluateTarget()`、`process()`→`planTarget()`（`applyUpdate()`は据え置き）。
  src/から`process`という名前が消え、`main.ts`のオーケストレータ・グローバルの`process`との
  衝突も解消。docs/architecture.mdに命名規則を明記。pnpm check（268テスト）通過

- **T-027完了**: `buildAppUpdatePlan()`の引数8個を`BuildPlanContext`＋(acc, app)の3個に削減。
  あわせてhelm側のデータクランプ（gitlab + chartProjectId + branchExistsCache）を
  `BranchExists = (branch) => Promise<boolean>`関数に閉じ込め、`helm-target-branch-target.ts`が
  `lib/gitlab/`にも`utils/cache.ts`にも依存しない形になった（既存の`LoadValuesYamlContent`と
  同じ考え方）。pnpm check（268テスト）通過
- **T-029完了**: ドキュメント・設定サンプルの実態ドリフトを修正。READMEのプロジェクト構成に
  `sub-steps/`・`scripts/`・`config-test/`・`docs/`を追加、`config-test/`の位置づけを
  README・architecture.mdに明記、`.env.example`のCONCURRENCY_LIMIT/CONFIG_PATH/DRY_RUNの説明を
  現仕様に追従（TARGET_CHART_DIR/TARGET_CLIENTの例も追加）

- **T-022完了**: steps/3ファイルの定型コード重複を `src/steps/shared/step-outcome.ts` に集約
  （`buildLogContext()`・`describePlan()`・`settleAsError()`）。特に `settleAsError()` により
  「401/5xx/ネットワーク障害は即時終了、それ以外は該当chartAndAppsのみERRORで継続」という
  明文化済みのエラー方針の実装箇所が1つになった。置き場所は消去法で決定（ドメイン型に依存するので
  `utils/`不可、技術依存が無いので`lib/`不可、複数stepから呼ばれるので`sub-steps/`でもない）。
  CLAUDE.mdの「新しいコードを置く場所」に`steps/shared/`の基準を追記。pnpm check（268テスト）通過
- **T-024完了**: イメージタグ側とHelm向き先ブランチ側の4重複を整理。決め手は「TypeScriptは
  構造的型付けなので、同じ形の型を2つ定義しても取り違えを防げていなかった（＝分離のメリットが
  実在しなかった）」こと。`AnchorTarget`＋用途別エイリアス、zodスキーマ1本化、
  `ApplyTargetsAcc<U>`のジェネリック化、逐次reduceの`utils/sequential.ts`（`reduceAsync`）への
  共通化（3箇所で重複していた）。pnpm check（20ファイル272テスト）通過

- **T-028完了**: `config/`のスキーマの正典を docs/requirements.md 4.4節に定め（同節冒頭に明記）、
  README「設定 > config/」章は要約＋リンクに縮小（README 379→358行）。requirements.md側で
  ソースリポジトリとchartリポジトリのprojectIdが同じ888でドリフトしていた例も修正
- **T-030完了**: `docs/history/` を新設し、tasks.jsonの完了タスク21件の詳細evidence
  （→`tasks-archive.md`）と progress.md の過去セッション分638行（→`progress-archive.md`）を
  情報を捨てずに退避。tasks.json 49KB→28KB、progress.md 66KB→7.7KB（毎セッション読む量が約7割減）。
  docs/workflow.mdに「evidenceに書かないこと」とアーカイブ運用を追記、CLAUDE.mdの関連リンクも更新

- **T-031完了**: docs/architecture.md を227→153行に整理。冒頭に「各関数の詳しい振る舞いは
  コード側のJSDocが正典」と方針を明記し、JSDocを逐語で写していた箇所をファイルごとの
  責務テーブル（1行1ファイル）に置き換え。本文に散在していた変更履歴（「以前は〜」）は
  「コードからは読み取れない設計判断」節の8項目に集約し、詳細はアーカイブへのポインタにした

**T-022〜T-031（リファクタリング監査で洗い出した10件）はすべて完了。** 最終状態は
`pnpm check`（tsc・oxlint・config検証・oxfmt・vitest 20ファイル272テスト）通過、
`rm -rf dist && pnpm build` のクリーンビルドも成功。ブランチ `refactor/repo-cleanup` に
3コミット（コード / ドキュメント / 進捗管理）として記録済み（mainへは未マージ）。

- **T-019/T-020/T-021 のgitlab.com実機確認を実施（2026-09-05、ユーザー承認のうえ書き込みあり）**:
  `config-verify/`（一時。確認後に削除）に1つのchartディレクトリ配下の tenant1/client1 と
  tenant1/client2 を定義し、`sinnlosses-group/yadokari-smoke-test-chart`（projectId 86061211）
  に対して実行した。前提として旧命名の残骸（ブランチ`yadokari/update`とMR !10）はユーザー判断で
  クローズ・削除済み
  - T-020（失敗分離）: client2 のアンカーを存在しない名前にして実行 → client2 は
    `ERROR`（"values.yaml にアンカー ... が見つかりません"）、client1 は `CREATED`（MR !11）。
    プロセスの終了コードは1（PARTIAL_FAILURE）
  - T-019/T-020（クライアント独立）: client2 を正しいアンカー（`helmVersion`）に直して再実行 →
    client1 は既存MRがあるため `SKIPPED`（`mr_exists`）、client2 は独立して `CREATED`（MR !12）。
    ブランチは `feature/yadokari/tenant1/client1` と `.../client2` の2本が別々に作られ、
    それぞれ自分のアンカーだけを書き換えている（同じ`values.yaml`でも互いに影響なし）。
    MRタイトル・本文（タグリンク・比較リンク・パイプラインリンク）も期待どおり
  - T-021（固定ブランチの再作成）: MR !12 をクローズしブランチを残した状態で再実行 →
    client2 のブランチが `6226e559` → `97e2c7f1` に変わり、履歴が「main(c96614e1) + 新コミット1つ」
    のみ（＝削除して作り直されている。追加コミットなら旧コミットが残るはず）。新しいMR !13 が作成された
  - 検証で作成したブランチ2本・MR（!11、!13）はユーザーの意向で**残置**。片付ける場合は
    MRをクローズし `feature/yadokari/tenant1/client1` / `.../client2` を削除する

- **T-032完了**: 設定ミスの検知をCIで2段構えにした。(1) 認証不要のローカル検証を強化
  （projectId重複・同じ`valuesPath`+`anchor`の奪い合いを`loadConfig()`で例外に。既存の
  `check`ジョブでそのまま効く）、(2) `src/lib/verify-config.ts` を新設し
  `pnpm lint:validate-config:remote`（`--remote`）でprojectId・ブランチ・valuesPath・
  アンカーの実在をGitLabに問い合わせて検証、`.gitlab-ci.yml`に`validate-config-remote`
  ジョブを追加（MR/push/web）。ユーザー判断で`ACCESS_TOKEN`は**Protected: OFF**とし、
  ジョブは条件付きスキップにせず必ず実行する（認証情報が無ければ理由を表示して失敗）。
  実機でわざと壊した設定を4件同時に検出できること・終了コード1になること、認証情報が
  無い場合に「実在チェックを実行できません」で停止することを確認。
  pnpm check（21ファイル288テスト）通過

- **T-033完了（実機テスト）**: 「複数clientの複数appのimage tag更新＋いずれかのclientの
  Helm向き先ブランチ更新」を gitlab.com で実施。`tenant2/client1`（app2件＋向き先ブランチ、MR !14）と
  `tenant2/client2`（app2件、MR !15）が独立したブランチ・MRとして作られ、
  summary は `{CREATED:2, SKIPPED:0, ERROR:0}`・終了コード0。向き先ブランチ用に
  chartリポジトリへ `release/2026-q1` を新規作成し、書き込み前の実在検証を通ることも確認。
  再現手順は `docs/smoke-test.md`、フィクスチャ操作は `scripts/smoke/smoke-fixture.ts`
  （`setup`/`reset`、既定dry-run）に記録した

- **T-034完了**: MRのタイトルと本文を再設計（方針はユーザーと合意）。タイトルは
  `update tenant2/client1 (image tag 2, helm branch 1)` のように**種別ごとの件数**を出し、
  件数の単位はアプリ数ではなく**書き換え箇所数**（T-014の1アプリ複数箇所も正しく数える）。
  本文は「## イメージタグ」「## Helmの向き先ブランチ」の2セクションにし、向き先ブランチを
  client単位の情報としてアプリの節から独立させた（同じvaluesPathを共有する複数アプリでの
  重複表示・重複計上も `uniqueHelmTargetBranchUpdates()` で解消）。イメージタグに差分が
  無いアプリの節は出さない。テスト10件追加
- **T-035完了**: スモークテストのシード値を実タグに変更（`placeholder` → 実在する古いタグ）。
  `sample-develop-client` はコミットが1つしかないため、同じコミットに
  `main-build-at-20260101-000000` を作成して代用。`smoke-fixture.ts setup` が
  シードタグの実在を保証するようにし、docs/smoke-test.md に制約を明記
- **実機で再検証**: reset→setup→実行のループを回し、MR !16（image tag 2＋向き先ブランチ1）と
  !17（image tag 2）で新しいタイトル・2セクション構成・実在するタグリンクを確認。
  この過程で古いMR（!11・!13・!14・!15）はリセット手順によりクローズ済み

- **T-036完了**: ユーザー指定に沿ってMR本文をテーブル化。「## イメージタグ」は
  `リポジトリ / ファイル / アンカー / 旧タグ / 新タグ / 比較 / パイプライン` の7列
  （T-037で「追跡ブランチ」列を足して8列になった）、
  「## Helmの向き先ブランチ」は `旧ブランチ / 新ブランチ / ファイル / アンカー` の4列。
  パイプラインは状態を出さず、比較とあわせてURLをそのまま表示する（GitLabが自動リンクする）。
  値が無いセルは `-`。1アプリが複数箇所を更新する場合はファイル・アンカーの列で行を区別できる。
  打刻日時列は「実運用ではCI側がタグを打つため常に `-` になり困らない」というユーザー判断で
  不採用にし、そのために一度入れた `latestTagCreated`・`formatJst()` は撤去した。
  実機のMR !22/!23 で確認

- **T-037完了**: (1) 反映済みタグが追跡ブランチの現在のHEADコミットを指している場合は、
  より新しい名前のタグがあっても更新しないようにした（中身が同じなのに差分だけが出るMRを
  作らないため）。`resolveLatestTag()` が `pointsAtTrackedHead` を返し、イメージタグの
  1箇所分の判定で使う（API呼び出しは増えない）。docs/requirements.md 4.1節にも仕様を追記。
  (2) MR本文のイメージタグ表に「追跡ブランチ」列を追加。実機で sample-develop-client が
  新ルールで更新対象から外れること（MR !24 は image tag 1件のみ）を確認

- **2回目のリファクタリング監査（T-032〜T-037の実施後）**: 新しい改善点を T-038〜T-042 として
  登録（コード変更なし）。最優先は T-038 で、T-032で追加したCIジョブ `validate-config-remote` は
  既定の `config/` を検証するが、`config/teamA-chart/` が架空の設定例（projectId 888等）のため
  **実行すると必ず失敗する**（トークン付きで実行し4件の問題検出・exit 1 を確認済み）。
  他は仕様とドキュメントの不整合（T-039）、未使用になった `PipelineInfo.status`（T-040）、
  肥大化したテストファイル（T-041）、実在チェックの逐次実行（T-042）

- **T-043完了（2026-09-06）**: 追跡ブランチ（`branchToSync`）を切り替えたとき、切り替え前後の
  ブランチが同じコミットを指していても新しいタグを作成して反映するようにした。タグ名には
  `{branch}` が必ず含まれるため、「反映済みタグが現在の追跡ブランチ名でパースできるか」だけで
  切り替えを検知できる（GitLabへの問い合わせは増えない）。**T-037（中身が同じなら更新しない）と
  このケースでのみ衝突する**ため、`pointsAtTrackedHead()` に「現在の追跡ブランチ由来のタグで
  あること」を条件に足し、切り替え時はスキップされないようにした（この例外は
  docs/requirements.md 4.1節にも明記）

- **`refactor/repo-cleanup` を main へマージ（2026-09-06）**: main側にT-043があったため
  `--ff-only` ではなくマージコミットになった。衝突3ファイル（build-plans.ts /
  resolve-latest-tag.ts / architecture.md）はT-037とT-043の両方の意図を残す形で解消。
  architecture.md はリファクタ側の表形式を採用し、T-043分を追記し直した。
  pnpm check（21ファイル304テスト）通過

## 次にやること

- **T-038（優先）**: CIの `validate-config-remote` が架空の設定例で必ず失敗する問題。
  「`config/` に何を置く運用にするか」の方針決めが先
- T-039（ドキュメント同期）、T-040（未使用コード）、T-041（テスト分割）、T-042（並列化）

- マージで main に入った以下の方針変更を確認してほしい（未確認のまま取り込んである）:
  - `steps/shared/` という置き場所の新設（CLAUDE.mdの「新しいコードを置く場所」に追記済み）
  - evidenceを3行以内に絞る運用とアーカイブ（docs/workflow.mdに追記済み）
  - README「設定 > config/」章を要約に縮小し、正典を docs/requirements.md 4.4節にしたこと
- T-043は実機未検証（追跡ブランチを切り替えるスモークテストは未実施）
- 実機検証で残置したMR（!24、!25）とブランチ2本の後片付け（不要になったら
  `SMOKE_CHART_PROJECT_ID=86061211 npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply`）
- 検証が完全に終わったら、テスト用のGitLabアクセストークンを失効させる（ユーザー対応）

## 未解決

- なし

## 注意

- `config/teamA-chart/` はユーザーが提示した設定ファイルの実例。`docs/requirements.md` のディレクトリ構成説明と対応している
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている（導入済みスキル・ユーザー管理データを誤って自動整形しないため）
- リモートは`origin`が`github.com/sinnlosses/helm-yadokari`と`gitlab.com/sinnlosses-group/helm-yadokari`の
  2つの push URL を持つ（GitHubからのリダイレクトをgitが追従し自動追加したもの）。`git push`/`git fetch`は
  両方に対して行われる
- gitlab.com上に検証用の`sinnlosses-group/yadokari-smoke-test-chart`プロジェクトが存在する（削除せず残置）
