# 現在の状態

最終更新: 2026-09-15（T-242〜T-247 をすべて完了。`/plan-tasks` で T-242〜T-247 を登録。前回まで: **最新タグの解決を `resolve-tags` step に切り出し、パイプラインを
`filterTargets → resolveTags → buildPlans → applyUpdates` の4stepにした**（T-229〜T-231）。
`createResolveLatestTags()` のバッチ寿命キャッシュは消滅し、重複排除は集合演算になった。
前半は `src/types/` の `src/domain/` への吸収（T-233・T-234）。**2026-09-14以前の「完了したこと」は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) へアーカイブ済み**）

**未着手のタスクは0件**（T-242〜T-248 をすべて完了）。T-238〜T-241 は完了。
**T-229〜T-238 の `done` 10件は
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md) へアーカイブ済み**
（`develop/tasks.json` は 59,620B → 8,570B）。完了タスクは
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)、過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

### 2026-09-15 本物のグループ2つで検証する手順を書く

- **T-248: `docs/smoke-test.md` に「パス5: 複数グループ（宣言トークン）」を足した**（sonnet に委譲）。
  `smoke-fixture.ts` は環境変数名が固定で2グループ目を作れない（予備スロットを流用してもシードタグの
  取得元がグループAの `SMOKE_QA_SPRINT_PROJECT_ID` に固定され、projectId がグループAと重なる）ため、
  chart B・ソースリポジトリ1つ・向き先ブランチ・アンカー2つ・シードタグを手で用意する手順にした。
  `config/` への常設はしない（`config/README.md` に理由）。**実機は未実施**。ユーザーが2グループ目と
  Group Access Token 2本を用意してから流す
- `pnpm check` 通過: 45 Test Files / 555 Tests（不変）

### 2026-09-15 実機スモーク（GitLab、宣言トークン、読み取りのみ）

- `config/` の2 chart に一時的に `accessTokenEnv: ACCESS_TOKEN_SMOKE` を足し、`DRY_RUN=true pnpm dev` と
  `pnpm lint:validate-config:remote` を流した（書き込みなし。config は `git checkout` で戻した）:
  宣言なし → 実在チェック OK／chart1 だけ宣言 → ローカル検証で projectId 82861978 の衝突を検出／
  両方宣言＋`ACCESS_TOKEN` 空 → 実在チェック OK・DRY_RUN は SKIPPED:4（宣言トークンだけで動く）／
  宣言した変数が未設定 → 実在チェックは2 chart を列挙して失敗、DRY_RUN は組み立て時に即時終了
  （上記メッセージ修正のきっかけ）／宣言トークンが不正 → DRY_RUN は `fatal_error` なしで ERROR:4・exit 1、
  実在チェックは設定ユニットごとに `401 Unauthorized` を並べて exit 1／宣言なし＋既定トークン不正 →
  従来どおり `fatal_error` httpStatus 401
- **未実施**: 「宣言トークンの 401 が片方の chart だけ ERROR で、もう片方は続行」の実機確認。フィクスチャの
  2 chart が同じソースリポジトリ（projectId 82861978）を共有しており、別トークンに分けると設定エラーに
  なるため。単体テスト（`test/main.test.ts`）でのみ検証済み

### 2026-09-15 複数トークン化の追随漏れを洗う

- **T-247: `maintain-docs` の7検査をかけ、`CLAUDE.md`・`docs/coding-standards.md`・`docs/architecture.md` の
  「1回の実行＝1トークン」前提の記述を直した**（sonnet に委譲）。候補群の指摘（`coding-standards.md` が
  参照する `test/utils/{fs,partition,timer}.test.ts` の実在など）は今回と無関係の既存ドリフトなので据え置き
- `pnpm check` 通過: 45 Test Files / 554 Tests（不変）

### 2026-09-15 複数グループ運用の手順を README に書く

- **T-246: README「CI/CD」に「複数グループで運用する」小節を足し、CI/CD 変数表・環境変数表・`config/` 節・
  `.gitlab-ci.yml` 冒頭コメント・`config.example/README.md` を `accessTokenEnv` と `ACCESS_TOKEN_<GROUP>` の
  前提に揃えた**（sonnet に委譲）。正典（requirements 5章・4.4節、architecture）へのリンクで指し、手順と注意点だけを書く
- `pnpm check` 通過: 45 Test Files / 554 Tests（不変。ドキュメントのみ）

### 2026-09-15 `validate-config-remote` をトークンごとに分解

- **T-245: `scripts/lint/validate-config.ts --remote` を `accessTokenEnv` でグループ分けし、グループごとに
  `createClient()` + `validateRemoteExistence()` を呼ぶ形にした**（sonnet に委譲）。グループ分けと欠落判定は
  `scripts/lint/remote-existence/access-token-groups.ts`。本体と違い必要トークンが1本でも未設定なら
  全件並べて失敗（MR をマージしてよいかの判定なので、検証できない chart を成功にしない）
- `pnpm check` 通過: 45 Test Files / 554 Tests（548→554）。実機での `pnpm lint:validate-config:remote` は未実施

### 2026-09-15 `ProjectId` でトークンを振り分けるアダプタ

- **T-244: `src/lib/platform/routed-adapter.ts` の `createRoutedAdapter()` を足し、`runPipeline()` を
  `loadConfig()` → `loadAccessTokens()` → 名前ごとの `createPlatformAdapter(env, token)` →
  `withCachedReads(createRoutedAdapter(...))` に配線し直した**（sonnet に委譲）。`steps/` は無変更。
  宣言トークンの 401 は `cause` 付きの素の `Error` に読み替える。`extractHttpStatus()` は
  `cause.response.status` を1段しか見ないため、包み直した例外からは 401 が拾われず fatal にならない
  （`test/main.test.ts` で実際の `errors.ts` を通して ERROR:1 / CREATED:1 を確認）
- **全トークン欠落時のメッセージ**: 実行対象が「宣言はあるが未設定」の chart だけで既定 `ACCESS_TOKEN` も
  無いと、代表アダプタ不在で組み立て時に即時終了する。設計時は「起きにくい」と据え置いたが、実機の
  スモークで初期セットアップの変数付け忘れとして普通に踏むと分かり、`assertDeclaredAdapterAvailable()` で
  chart 名×環境変数名を全件並べたメッセージにした（タスクIDなし、2026-09-15）
- サブエージェントは正典の「`withAppContext()` より内側」を読み違えて疑問を報告したが、
  アダプタ関数の中で読み替える実装は `withAppContext()` が包む呼び出しの内側なので正典どおり
- `pnpm check` 通過: 44 Test Files / 548 Tests（538→548）

### 2026-09-15 `registry.yaml` のトークン宣言を読めるようにする

- **T-243: `accessTokenEnv` を `RegistryYamlSchema` → `ConfigUnit` に通し、`validateAccessTokenEnvConsistency()` と
  `LoadedConfig.accessTokenEnvNames`、`env.ts` の `loadAccessTokens()` を足した**（sonnet に委譲）。
  `EnvConfig.accessToken` は `| undefined` になり、`main.ts`・`validate-config.ts`・`smoke-fixture.ts` は
  未設定時に従来同等の例外を投げる最小対処だけ（振り分けは T-244）。既知の限界: どの `config.yaml` からも
  参照されない `appSpecs[]` の項目は整合性検証の対象外（`validateTagFormatConsistency()` と同じ前提）
- `pnpm check` 通過: 43 Test Files / 538 Tests（516→538）

## 次にやること

**本物のグループ2つでの実機検証手順を T-248 として登録した**（2026-09-15）。`docs/smoke-test.md` に
パス5を書くだけで、`config/` の実ファイルはユーザーが2グループ目を作ってから足す。

- ~~**T-248**~~（done）: パス5「複数グループ（宣言トークン）」の準備・手順・期待する結果

**複数グループ運用（chart 単位のアクセストークン宣言）を T-242〜T-247 として登録した**
（2026-09-14、`/plan-tasks`）。依存は直列で **T-242 → T-243 → T-244 → T-245 → T-246 → T-247**。
すべて `loopable: Y` なので `/loop /next-task` で回せる:

- ~~**T-242**~~（done）: 設計を正典に書く。`registry.yaml` の新フィールド名・環境変数名の制約
  （`ACCESS_TOKEN_` 接頭辞を必須にする案）・既定 `ACCESS_TOKEN` との関係・振り分けアダプタの形・
  **401 の方針（chart 宣言トークンの 401 はその chart の ERROR、既定トークンの 401 は fatal のまま）**・
  `validate-config-remote` の分解。コードは書かない
- ~~**T-243**~~（done）: `RegistryYamlSchema` の新フィールド、`ConfigUnit` への搭載、`env.ts` の読み取り関数
- ~~**T-244**~~（done）: `src/lib/platform/` の振り分けアダプタ、`runPipeline()` の配線、401 方針。`steps/` は触らない
- ~~**T-245**~~（done）: `scripts/lint/validate-config.ts --remote` を chart ごとのトークンで検証
- ~~**T-246**~~（done）: README「CI/CD」に「複数グループで運用する」小節、環境変数表、`.gitlab-ci.yml` コメント、`config.example/`
- ~~**T-247**~~（done）: `maintain-docs` で追随漏れを洗う

**ユーザー決定済みの方針**（タスク化前にチャットで確定。詳細は
[`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-14（7回目）」）:

- 区分は「チーム」ではなく **GitLab のグループ**。グループごとに Group Access Token を1本
  （`read_api` + `write_repository`、Developer、短い期限）。最上位グループのトークン・横断 Service
  Account・個人 PAT は「1本漏れると全グループへ push できる」ため採らない
- トークンは **プロジェクトの CI/CD 変数 `ACCESS_TOKEN_<GROUP>`（Masked）**。schedule 変数は
  マスクできない（GitLab issue #35439 未解決）ので使わない
- **chart ごとのトークンを `registry.yaml` で宣言し、CLI が1回の実行で複数トークンを扱う**（案B）。
  CI 側の matrix で分解する案A（対応表が `.gitlab-ci.yml` と config に二重化しドリフトする）は採らない。
  既存の単一 `ACCESS_TOKEN` は宣言の無い chart の既定として残す（互換）
- 検証ジョブ `validate-config-remote` も chart ごとの宣言トークンで分解する（実装変更を許容）

---

**`lookUpLatestTags()` のサブステップ化を T-241 として登録した**（2026-09-13、`/plan-tasks`）。
他のタスクとは独立（T-240 とは触るファイルが重ならない）:

- ~~**T-241**~~（done）: `build-plans.ts:112` の非公開 `lookUpLatestTags()` を
  `build-plans/sub-steps/` へ移し、`buildPlan()` の中で「ローカル関数の呼び出し」と
  「サブステップの呼び出し」が同じ深さに並んでいる状態を解消する

`docs/architecture.md` の記述は**2箇所とも移動を支持する側**（`#### build-plans/sub-steps/` の
「サブステップは自分の関心事について全スコープを引き受ける」、「サブステップ同士は互いを
importせず〜」の「アプリのループを各サブステップの内側へ入れる」）。`lookUpLatestTags()` は
既に `apps.map(...)` で全アプリ分を引き受けているため、「1アプリ分の処理を独立した
サブステップにしない」という但し書きには抵触しない。

**ただし「単発のヘルパーに1ファイルを与えない」（同ドキュメント「1ファイルにまとめるか
分けるか」の適用例）とは正面から衝突する。** 「ヘルパー」と「サブステップ」を別の概念として
扱ってよいかを先に決める論点としてタスク本文に入れてある（前例は
`apply-updates/sub-steps/collect-mr-entries.ts`＝31行・公開関数1つ）。成り立たないと判断したら
移さずに閉じる逃げ道も書いてある。指示メモは
[`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-13（6回目）」。

**バッチ実行レポートのartifacts化を T-238〜T-240 として登録した**（2026-09-13、`/plan-tasks`）。
**方針はタスク化の前にチャットで確定済み**なので、各タスクに残る判断は局所的。
依存は直列で **T-238 → T-239 → T-240** の順に実行する:

- ~~**T-238**~~（done）: 設定ユニット単位のレポート用レコード型を作り、
  4stepの戻り値と `settle()` を通して `runProcess()` まで運ぶ。**挙動もログの出力も不変**。
  `StepOutcome<T>` の `settled` と `summarizeResults()` の `Record<ConfigUnitUpdateResult, number>` に
  触るのでここが一番重い
- ~~**T-239**~~（done）: Markdown 1枚に整形して `src/lib/` から書き出し、
  出力パスの環境変数を `src/lib/env.ts` に追加。`README.md` の環境変数表と
  `docs/architecture.md` の `lib/` 責務表も追随
- ~~**T-240**~~（done・実機未検証）: `.gitlab-ci.yml` に `artifacts`（**`when: always` が必須**）を
  足し、README・requirements を追随。**`/loop` に載せないのは、実際に回収されるかが
  ローカルで検証できずCIを回す必要があるため**

確定した方針（詳細は [`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-13（5回目）」）:

- 集約は `src/` 側（ログを `scripts/` で整形する案と、`logger` に蓄積させる案は採らない）
- 形式は Markdown 1枚、粒度は設定ユニット単位の1行、MRのURLは載せない
- `FatalError` のときは出さない（`runProcess()` を貫通するので末尾の書き出しに到達しない）
- `DRY_RUN=true` のときも出す（ヘッダに `dryRun` を明示）

**`README.md` のプロジェクト構成のツリー展開を T-237 として登録した**（2026-09-13、`/plan-tasks`）。
`src/` が1行にまとまっていて4区分がコメントの列挙でしか見えないため、`steps/`・`lib/`・
`domain/`・`utils/` を1階層だけ枝に出す。**2階層目（`src/steps/resolve-tags/` など）は出さない**:

- ~~**T-237**~~（done）: 区分ごとの一行コメントは `docs/architecture.md` の
  `###` 見出しの要約（T-234 で2軸に書き換えた定義）に沿わせる。責務の本体を README に
  書き写すと正典が二重になるので、名札の粒度を超えない

他のタスクとは独立で、T-235・T-236 とは触るファイルが重ならない。
指示メモは [`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-13（4回目）」。

**`resolve-tags/` まわりの2タスクを T-235・T-236 として登録した**（2026-09-13、`/plan-tasks`）。
依存は直列で、**T-235 → T-236** の順に実行する（同じファイルを触るため）:

- ~~**T-235**~~（done）: `resolve-tags.ts` の `groupByTagSource()` を可変Mapの
  組み立てから不変な生成に書き換える。`src/` で生成後に `set()` でループしているのはここだけで、
  前例は `lib/config/load-config-unit.ts:133` の `new Map(xs.map(...))`
- ~~**T-236**~~（done・現状維持で決着）: `resolve-tags/` のサブステップ構成（`sub-steps/` に1ファイルだけ）を
  `docs/architecture.md`「1ファイルにまとめるか分けるか」の合図に照らして評価し、
  現状維持 / `sub-steps/` を畳む / 複数サブステップに割る の3案を比較して提案する。
  **どの案を採るかはユーザーが決めるため `/loop` には載せない**

**import の `.js` 拡張子を lint で塞ぐ指示はタスクにしなかった。** 前提が逆で、`.js` は必須。
`tsc` は import 指定子を書き換えないため、`"type": "module"` の状態で `node dist/src/index.js` を
動かすには拡張子が要る（`pnpm build` 後の `dist/src/steps/resolve-tags/resolve-tags.js` が
`from "../../domain/tag-source.js"` のまま出ることを確認済み）。`tsconfig.json` の
`moduleResolution: "bundler"` は `.js` を**許す**だけで、省略を前提にしていない。
指示メモは [`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-13（3回目）」。

**`src/types/` を `src/domain/` に吸収する2タスクを T-233・T-234 として登録した**（2026-09-13、
`/plan-tasks`）。`domain/` が「ドメイン」を名乗りながら語彙（型）は全部 `types/` にあり、
規則3ファイルだけの区分になっている異物感を解消する。**T-229 より先に実行する**
（T-229 が T-233 に依存。T-232 は T-234 にも依存）:

- ~~**T-233**~~（done）: `src/types/` を `src/domain/` に吸収し、import・テスト・ドキュメントのパスを追随させる
- ~~**T-234**~~（done）: `docs/architecture.md` の `domain/` の定義を「ドメイン×技術」の2軸に書き換える

`lib/config/validate.ts`・`steps/shared/describe-plan.ts` は文面上「技術非依存＋ドメイン知識あり」
だが動かさない（概念のまとまりを優先。T-234 で規約に書く）。`lib/` → `adapters/` 改名は採らない。
指示メモは [`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-13（2回目）」。

**タグ解決の step 切り出しを T-229〜T-232 として登録した**（2026-09-13、`/plan-tasks`）。
`createResolveLatestTags()` のキャッシュを廃し、パイプラインを
`filterTargets → resolveTags → buildPlans → applyUpdates` にする。依存は直列:

- ~~**T-229**~~（done）: `TagSource` を新設し、タグ解決まわりの型を `src/domain/types.ts` に集約する
- ~~**T-230**~~（done）: `resolve-tags` step への切り出し本体。重複排除をキャッシュから集合演算にする
- ~~**T-231**~~（done）: `LatestTagResolution` に `origin` を足し、新規作成予定のタグを計画のログに出す
- ~~**T-232**~~（done）: 軸交差の規則を `docs/architecture.md` に書き、README・glossary を追随させる

**T-230 の未コミットWIPは解消済み**（ワークツリーの成果を main へマージし、ワークツリーと
ブランチは削除した。上の「並行セッションとの衝突と worktree」参照）。
T-232 の `loopable` は `Y`。T-230 の `loopable` は当初 `N` だったが、論点2件（`CONCURRENCY_LIMIT` の意味が step ごとに変わることの許容、
`create_tag` のログがバッチ先頭に固まること）の決定が本文に入ったため `Y` になっている（`7ae8e87`）。
指示メモは [`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-13」。

**GitHub対応の8タスク（T-220〜T-228）はすべて完了。**
`PLATFORM=gitlab|github` で切り替わり、ドキュメントも追随済み。

**GitLab側の実機スモークテストは2026-09-13に実施済み**（パス1〜3。上の「実機スモークテスト」参照）。
**GitHub側は一度も実機に当てていない**（`scripts/smoke/smoke-fixture.ts` がGitLab APIしか呼ばないため、
GitHub用のフィクスチャから作る必要がある）。新しい指示を出す場合は `develop/direction.md` に
書いて `/plan-tasks` でタスク化する。

前提（着手前にユーザーが決めた）:

- **GitLab と GitHub の両方に対応するが、1回の実行で混在はさせない。** forge の選択は
  環境変数1つで全体に効く（chartリポジトリ単位の指定にはしない）
- `config` の `projectId` はスキーマで**数値と文字列の両方を受ける**（既存の `config/` を
  書き換えない）
- 検証範囲は **`pnpm check` まで**。GitHub実機のスモークは別途

調査記録は [`docs/research/github-support.md`](../docs/research/github-support.md)、指示メモは
[`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-12（4回目・5回目）」。

T-212 の提案17件はすべて反映し終えた（T-214〜T-218。ユーザーが採否を決め、L-5はMIT・
D-4は「npm配布しないので正典を実装に合わせる」で確定。残り15件は全件採用）。
**README.md は clone 直後に Quick Start どおり動く状態になった。**
実機スモークテストは2026-09-13に実施済み（パス1〜3）。

T-213（`parseArgs` 化）は
**「導入して良くなるライブラリはあるか」の問いから出たタスク**で、結論は「外部パッケージは増やさない」——本体3,784行に対し実行時依存は
4つ（`@gitbeaker/rest`・`p-limit`・`yaml`・`zod`）で、手作りの `logger.ts` 35行・`retry.ts` 36行は
どれも置き換える利が無い（pino はログ形式が `README.md` の外部インターフェースとして固定されて
いるため、p-retry は `isRetryable` を注入する今の形が原則2に沿っているため、却下）。
**唯一の実益が Node 標準の `parseArgs`** だった（依存を増やさずに引数のtypoを弾ける）。

次にやることは、下の「未解決」に置いた **T-212 の提案17件の採否**がユーザー判断待ち。採ると決まった
ものを反映タスクとして登録する（指示メモは
[`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-12（3回目）」）。

設定まわりの命名（T-208・T-209・T-210）と、その過程で見つかった型の置き場所の裏付け直し
（T-211）は完了済み（指示メモは同ファイルの「2026-09-12（2回目）」）。

- **`AnchorValueLookup`（`lib/helm.ts`、公開）と `AnchorLookup`（同ファイル、内部）が1文字違いで、
  名前から公開・内部の区別が読めない。** T-211 の突き合わせ中に見つけたが、「型の置き場所」では
  なく命名の話なのでその場では手を付けていない。気になったら命名タスクとして起こす

**`ConfigUnit` の `unit` を外す案は検討して却下した**（ユーザー判断、2026-09-12）。`Config` が
ルートの型で埋まっている・`ConfigUnitPath` が `ConfigRootPath` と同語になる・`unit` が
「並列処理とMR発行の粒度」を表していて外すと `chartリポジトリ = config` と誤読される、の3点。
識別子は約831箇所/62ファイルで T-203 の一括改名の直後でもある。**`ConfigUnit` 系は現状維持。**

**実機スモークテストは2026-09-13に実施し、パス1〜3がすべて期待どおりだった**（上の
「実機スモークテスト」参照）。`config.yaml` のキー変更（`chart[]`→`locations[]`、
`helm.branchToSync`→`helm.branchRef`）が実機でも壊れていないことはこれで確認済み。
**残っているのはパス4（`no_diff`）とGitHub側の実機検証。**

## 未解決

- **GitHub側の実機検証が未実施**（2026-09-13）。`PLATFORM=github` の経路はユニットテストと
  型でしか確かめていない。特に次の3つはモックでは検証しきれない:
  - `commitFileUpdates` の4呼び出し（`repos.getBranch` → `createTree` → `createCommit` → `createRef`）が
    実際に1コミットのPRになるか
  - `getFileContent` の1MB制限と、`listTags` のページング（タグ31件以上のリポジトリ）
  - `retry-after` 付きの403/429が実際にどう返るか
    `scripts/smoke/` と `pnpm lint:validate-config:remote` は**GitLab専用のまま**なので、
    GitHub用の手順を作るところから必要（`docs/smoke-test.md` にその旨を明記済み）。

- ~~**GitHub対応をやるかどうかが未定**~~ **やると決定**（ユーザー判断、2026-09-12。T-220〜T-227 を登録）。T-219 の計測で「`ProjectId` の中立化は
  呼び出し側への波及という意味では障害にならない」ことは確かめた（`src/` の影響は
  `lib/config/schema.ts` の3箇所）。**残る判断は2つ**:
  - YAMLの `projectId: 100` を文字列に寄せるか（`config/` の破壊的変更）、スキーマで両方受けるか
  - 最大の実装差である「複数ファイルの1コミット化」（GitHubに等価APIが無く、Git Data APIで
    4呼び出しに分解が要る）を引き受けるか
    詳細は [`docs/research/github-support.md`](../docs/research/github-support.md)。

- ~~**T-212 で洗い出した `README.md` の提案17件は採否が未定**~~ **全件反映済み**
  （T-214〜T-218、2026-09-12）。以下は反映した内容の要約として残す:
  - **L-1（不足・高）**: `Quick Start`(113-122) に `.env` の作成手順が無い。`pnpm dev` は
    `tsx --env-file=.env`（`package.json:7`）なので、`.env` が無いと起動前に落ちる
    （`.env` は `.gitignore:11` で追跡外）。`cp .env.example .env` を手順に足す案
  - **L-2（不足・高）**: 同梱の `config/yadokari-smoke-test-chart`・`同2` は作者の GitLab 固有の
    `projectId`（86061211 等）なので、第三者環境では必ず `ERROR`＋`exit(1)`。手順2に
    「同梱設定を消すか `TARGET_CHART` で絞る」を足す案
  - **L-3（不足・高）**: `registry.yaml`/`config.yaml` の最小サンプルが README 本文に無い
    （`タグ形式` 節の `appSpecs` 断片のみ）。README 単体完結の前提では手順2を実行できない
  - **R-1（冗長・高）**: `環境変数` 表(168-176) と `手動実行時のオプション` 表(276-282) が
    5変数の説明を同文で持つ（173行と279行は完全一致）。後者の説明列を前者への参照に寄せる案
  - **R-2（冗長・高）**: 「Protected を OFF にする理由」が `設定ファイルの検証`(229-231) と
    `セットアップ手順`(263-266) の両方で本文展開されている
  - **D-1（ズレ・高）**: README:239 の「指数バックオフ（1秒→2秒→**4秒**）で**最大3回リトライ**」が
    実装と違う。`withRetry` の既定は `maxAttempts: 3`・`baseDelayMs: 1000`（`src/utils/retry.ts:11`）で
    `attempt === maxAttempts` で打ち切るため、**試行3回＝リトライ2回・待ちは1秒→2秒**。
    `docs/architecture.md:387` は正しく、README だけがズレている
  - **D-2（ズレ・中）**: README:311 の `src/ # steps/ → lib/ → utils/ の3層構成` が
    `domain/`・`types/` を落としている（実際は5ディレクトリ）
  - **D-4（ズレ・中）**: `docs/requirements.md` 5章が配布方法を「npmjs.com に公開して
    `npm install`」と定めているが、`package.json` に `version`/`bin`/`files` が無く CI も
    `pnpm start`。**正典側が実装から取り残されている**疑い。README ではなく要件側の要否確認が要る
  - **L-5（不足・中）**: `LICENSE` も `package.json` の `license` も無い。OSS公開体裁を維持する
    判断をしたので、**ライセンス選定はユーザー判断**が要る

- **`docs/architecture.md` の `src/steps/` 責務表（`resolve-latest-tags.ts` の行）が
  「追跡ブランチを切り替えた場合はタグを自動作成」と書いている**が、現在のコードと
  `docs/requirements.md` 4.1節は「切り替え先のHEADを指すタグがあれば再利用し、新しいタグは
  作らない」。T-198 の受け入れで見つかった範囲外の食い違い（2026-09-12）。`/maintain-docs` か
  次にその表を触るタスクで直す

- **T-176（`outcome` を `result` に改名する件）は着手しない判断**（ユーザー判断、2026-09-10）。
  `tasks.json` では `status: done` / `passes: false` で閉じてあり、**正典（`docs/architecture.md`）は
  無変更**。判断を変えたくなったときのために懸念だけ残す:
  - `result` のドメイン型が既に2つある（`ChartUpdateResult` = CREATED/SKIPPED/ERROR、
    `RunResult` = SUCCESS/PARTIAL_FAILURE。どちらも `docs/glossary.md` に掲載）のに対し、
    `StepOutcome` は**ドメインではなく制御フローの型**（`ok` = 続行 / `settled` = 打ち切り）で層が違う
  - `StepResult` にすると `{ status: "settled"; result: ChartUpdateResult }` が **`result.result`** になり、
    `docs/architecture.md`「1つの語を2つの意味に使わない」の本文（値の意味を語れないフィールド名は
    避ける）を自分で踏む
  - ログのフィールド名 `result` は `README.md`「実行ログの例」3箇所に出る**外部インターフェース**で、
    `ChartUpdateResult` の意味に固定したい
  - `src/main.ts:66` の reduce が既に `(counts, result)` を使っており、局所変数が衝突する
  - 再開するなら、型名を `StepResult` にしたうえで `settled` 側のフィールド名を
    `settledAs` などに変えて `result.result` を避ける案（波及は src 8ファイル・docs 2ファイルの約40箇所）
    から検討する。**T-177（反映タスク）も同時に閉じてある**ので、再開時は両方を起こし直す

- **T-151（`StepOutcome` の `settled` が SKIPPED と ERROR を混ぜている件）は着手しない判断**
  （ユーザー判断、2026-09-09）。`tasks.json` では `status: done` / `passes: false` で閉じてある。
  判断を変えたくなったときのために理由だけ残す: 指摘は事実だが、**消費側3箇所（`filter-targets.ts:28`・
  `build-plans.ts:42`・`apply-updates.ts:27`）は SKIPPED と ERROR を区別しておらず**、
  区別が要る最終集計（`main.ts:72`）には `result` の文字列として情報が残っているため、
  実害が出ていない。再開するときは `docs/architecture.md`「エラーは『fatalは例外・それ以外は
  戻り値』の2チャネル」の方針変更をユーザー承認するところから始める。

- ~~**`develop/tasks.json` のアーカイブ基準（30KB超）が、`todo` だけで超えたときに機能しない。**~~
  **解決済み**（T-147で `todo` を判定対象外にした）。2026-09-09の棚卸しで13タスクを登録した
  時点で**実測により確認**: ファイル全体は43.8KBだが、判定対象の `done` は3件・9.4KBで
  基準内。**`todo` 13件を足しても空振りのトリガーが鳴らない**ことを、新基準の2回目の適用で
  確かめた。

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

- **改名の確認 grep は単語境界 `\b` を使わない。** 日本語に挟まれた識別子
  （「1つのchartAndAppsを処理する」など）を単語境界として認識せず見逃す。T-204 で19件の
  取りこぼしを踏み、次のタスクの注意に書いたら取りこぼしが0件になった
- **ログの項目名と `config.yaml` のキー名が 2026-09-12 に変わっている。** 過去のログや古い
  `config.yaml` を読むときは `update_chart`→`update_unit`、`previousTagName`→`currentTag`、
  `chart[]`→`locations[]`、`helm.branchToSync`・`helm.branchName`→`helm.branchRef`、
  `helmTargetBranchUpdates`→`helmBranchRefUpdates` で読み替えること

- **コミット手順は「記録を書く → `pnpm format` → `pnpm check` → `git add` → `git commit`」の順に固定する。**
  `develop/tasks.json` は `oxfmt` の対象（`.prettierignore` の除外は `.claude/` と `config/` だけ）で、
  スクリプトで `json.dump(indent=2)` すると単一要素配列が展開されて `format:check` に落ちる。
  **`pnpm format` を記録より前に回すと必ず取りこぼす。** 2026-09-09 に T-159・T-168 で踏み、
  対策を書いたのに 2026-09-10 の T-169 で**同じ順序ミスを再発**させた（T-165〜T-167 は無事）。
  順序そのものを固定しないと再発する。
- **`git add` はパスを明示する。`git add -A` を使わない。** ユーザーが作業中に編集した
  ファイル（`develop/direction.md`・`src/main.ts` など）を無関係なコミットに巻き込むため。
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
- **`RENOVATE=true` を持つ pipeline schedule が存在しないため、`renovate` ジョブは一度も
  動いていない**（このCLI自体の依存パッケージ更新が止まっている状態）。`.gitlab-ci.yml` は
  そのスケジュールの作成を必須と書いているが、**現時点では対応しない判断**（ユーザー判断、
  2026-09-09。タスクにもしない）
- T-064以降の変更は2026-09-07の実機スモークテストで検証済み。**テスト用に発行したGitLab
  アクセストークンは失効させず、本番の定期実行用としてそのまま使い続ける**（2026-09-09に方針決定。
  宿題ではない）。2026-09-07のスモークが残していたMR !28/!29 と固定ブランチ2本は
  **`smoke-fixture.ts reset --apply` で片付け済み**
- **定期実行は手動スモークテストを置き換える**（ユーザー判断、2026-09-09。問題が出たら
  そのとき対応する）。同じchartリポジトリ・同じ設定ユニット・同じ固定ブランチを共有するため、
  次の2点が起こりうる。踏んだら対処を決める:
  - 作られたMRを誰もマージしないと、翌日以降は `mr_exists` で SKIPPED になり続ける
  - スモークテストを回すと手順1の `reset` が定期実行の作ったMRと固定ブランチを消す
