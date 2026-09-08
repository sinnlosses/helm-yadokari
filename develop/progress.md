# 現在の状態

最終更新: 2026-09-08（`/plan-tasks` で `develop/direction.md` の4項目を T-123〜T-127 の
5タスクとして登録し、続けて T-120・T-118・T-119・T-121・T-122・T-123・T-124・T-125・T-127 を完了した。
そのあと**要件変更の指示**を受けて `/plan-tasks` を再実行し、T-128〜T-131 を登録して**4件とも完了した**。
前回までの流れは下の「完了したこと」を参照）

T-001〜T-125・T-127〜T-131 はすべて完了し、[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)
へ移した。過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

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

- **`develop/direction.md` に未タスク化の指示が残っている**（タグフォーマットの設定化・semver対応・
  JST化）。他の作業より先に `/plan-tasks` でタスク化する。
- **T-126（`config/` の運用方針、`opus`）は `/loop /next-task` に載せない**
  （`config/` への登録が本番の pipeline schedule の対象を変えるため、ユーザー承認が要る）。
- **`config-test/` の構成が変わったので、次回の実機スモークは `docs/smoke-test.md` の手順1から
  やり直す。** 旧ブランチ `feature/yadokari/tenant1/client1` がGitLab上に残っていれば
  `smoke-fixture.ts reset --apply` が拾って片付ける（`isFeatureBranch()` は接頭辞判定のみ）。
  残っているのは**テスト用アクセストークンの失効**（ユーザー対応。下の「注意」参照）。
- `scripts/lint/validate-config.ts` はディレクトリを**位置引数**で受け取る
  （`pnpm lint:validate-config config-test`。`CONFIG_PATH` 環境変数では効かない）。
- 新しいGitLab読み取りをキャッシュ機構に載せる手順と「載せてよいかの判断」は
  `docs/architecture.md`「GitLabへの問い合わせのキャッシュは`lib/gitlab/`に列挙し、バッチ単位で
  1つ持ち回る」節にある。
- 「埋めない穴」「消さないと決めたもの」の正典は `docs/coding-standards.md`「テスト」節に
  移した（T-119）。判断を変えたくなったら、まずそちらの理由を更新する。

## 未解決

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

- `config/` には実運用の登録だけを置く（架空の設定例を置くとCIの `validate-config-remote` が
  必ず失敗する）。記述例は `docs/requirements.md` 4.4節、実物に近いサンプルは `config-test/`
- `<名前>/<名前>.ts` の形（`src/lib/` の gitlab / config、`scripts/lint/verify-config/`）で
  統一している。同名のファイルとディレクトリを並べない（T-092/T-094 の命名判断に効く）
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている
- `src/lib/config/config.ts` に oxlint の `no-shadow` 警告が2件あるが、分割前からある既存の警告
  （`loadClientChartAndApps` の引数 `target` と、内側の `.map((target) => ...)`）
- リモートは `origin` が `github.com/sinnlosses/helm-yadokari` と
  `gitlab.com/sinnlosses-group/helm-yadokari` の2つの push URL を持つ。
  `git push`/`git fetch` は両方に対して行われる
- gitlab.com 上に検証用の `sinnlosses-group/yadokari-smoke-test-chart` プロジェクトが存在する
  （削除せず残置）
- T-064以降の変更は2026-09-07の実機スモークテストで検証済み。**テスト用のGitLab
  アクセストークンの失効はまだ（ユーザー対応）**。gitlab.com 上には今回作ったMR !28/!29 と
  固定ブランチ2本が残っている（次回の `reset` で片付く）
