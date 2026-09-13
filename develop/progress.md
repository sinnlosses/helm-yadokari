# 現在の状態

最終更新: 2026-09-13（**最新タグの解決を `resolve-tags` step に切り出し、パイプラインを
`filterTargets → resolveTags → buildPlans → applyUpdates` の4stepにした**（T-229〜T-231）。
`createResolveLatestTags()` のバッチ寿命キャッシュは消滅し、重複排除は集合演算になった。
前半は `src/types/` の `src/domain/` への吸収（T-233・T-234）。**2026-09-12以前の「完了したこと」は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) へアーカイブ済み**）

**未着手のタスクは3件**（T-235・T-236・T-237。`resolve-tags/` の不変化と構成の整理、README のツリー展開）。`done` 10件は
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md) へアーカイブ済み）。完了タスクは
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)、過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

### 2026-09-13 `src/types/` を `src/domain/` に吸収

- **T-233: `src/types/` を `src/domain/` に吸収し、import・テスト・ドキュメントのパスを追随させた**。
  `domain/` が「ドメイン」を名乗りながら語彙（型）は全部 `types/` にあり、規則3ファイルだけの
  区分になっていた分裂を解消。`src/` は `steps/`・`lib/`・`domain/`・`utils/` の4区分になった。
  `git mv` 3件＋import追随65ファイル、挙動不変。`pnpm check` 通過: 39 Test Files / 494 Tests（不変）。
  `docs/requirements-grilling.md`・`docs/research/github-support.md` に残る旧パスは過去の記録として
  据え置き。`docs/architecture.md` の区分の定義（2軸化）と集計表の既存ズレは T-234 へ
- **T-234: `docs/architecture.md` の `domain/` の定義を「ドメインを知っているか×技術を知っているか」の
  2軸に書き換えた**。「`lib/`でも`utils/`でもない区分」という消去法の定義を消し、`domain/`＝語彙
  （`types.ts`・`brand.ts`）＋その語彙に閉じた規則、`lib/`＝適応層、`utils/`＝ドメインを知らないもの
  （技術依存の `yaml.ts`・`fs.ts` もここ）と整理。`lib/config/validate.ts`・`steps/shared/describe-plan.ts`
  を `domain/` に動かさない理由を「概念のまとまりが優先」として規約化。集計表の既存ズレも再集計
  （合計 67→73）。CLAUDE.md の原則1〜5は無変更。`pnpm check` 通過: 39 Test Files / 494 Tests
- **T-229: `TagSource` を新設し、タグ解決まわりの型を `src/domain/types.ts` に集約した**。
  `resolveLatestTag()` が `AppConfig` を丸ごと受けて `imageTagLocations` を見ていなかったため、
  キャッシュキーが引数の部分集合になっていた問題を解消。引数を `TagSource` に絞って
  **キー＝入力の実質全体**（`projectId`+`branchToSync`+`tagFormat`、ヌル文字区切り）に戻した。
  `LatestTagResolution`・`AppWithLatestTag` は T-230 で step 間を流れるため `domain/types.ts` へ移動。
  型の集計も再計算（合計 73→74）。`pnpm check` 通過: 39 Test Files / 494 Tests（不変）
  **T-229 は別セッションと重複実装になり、ユーザー判断でブランチ側を正とした。**
  別ワークツリー（`../helm-yadokari-resolve-tags`、ブランチ `work/resolve-tags` の `3f3856d`）の実装を
  main へ取り込み、コード4ファイルは `3f3856d` と完全一致させた（`resolveTrackedHeadTagNames()` も
  `TagSource` を受ける形になり、キャッシュキーに `tagFormat` を含める理由がJSDocに残った）。
  `docs/architecture.md` の型集計の再計算は main 側の成果を残してある（型の件数は両版で同じ）

### 2026-09-13 最新タグの解決を step に切り出す

- **T-230: 最新タグの解決を `resolve-tags` step に切り出し、重複排除をキャッシュから集合演算にした**。
  `createResolveLatestTags()` が兼ねていた4つの「唯一」（`steps/`唯一の工場関数DI、唯一の手書き
  キャッシュキー、サブステップが唯一バッチ寿命の状態を持つ場所、唯一「書き込み」を重複排除する
  キャッシュ）がすべて消えた。`resolveTags()` は解決結果のマップだけを返す純粋な生産者で、
  設定ユニットへの引き当てとERROR判定は `buildPlans()` の既存の `withHandling()` に残したため
  **ERRORログの位置は変わっていない**。アプリ単位の失敗を値で持ち回る `settleApp()`／`AppOutcome` を
  `steps/shared/step-outcome.ts` に追加（`withHandling()` と対。**ログは出さない**）。
  1アプリの失敗は**そのアプリを含む全設定ユニットのERROR**になり、`getOrFetchShared()` 由来の
  実行順依存の再試行は消えた（本命の再試行は `withRetry()` がクライアント層に持つ）。
  `pnpm check` 通過: 40 Test Files / 493 Tests（494から-1。「アンカーが無いときタグを作らずERROR」の
  1件のみ削除。前半の主張が新構造では build-plans から検証できないため）。
  commit `b21a801` + `6201f14`、mainへは `f782774` でマージ
- **引き当てを値キーにし、`buildTagSourceKey()` を `src/domain/tag-source.ts` に出した**
  （タスクIDなし）。切り出し直後は `resolveTags()` の戻り値が `ReadonlyMap<AppConfig, ...>`
  （オブジェクト参照キー）で、「`resolveTags()` と `buildPlans()` に同じ `targets` を渡すこと」が
  JSDoc頼みの暗黙契約になっていた。**この改修の中心概念である「解決の単位の同一性」が
  `groupByTagSource()` の中の匿名の式だった**のも問題で、`domain/` に名前付きで出した
  （2軸で上段左＋複数stepにまたがる規則）。ブランド生成の `toTagSourceKey()`（`brand.ts`）と
  同名衝突してエイリアスimportが必要になっていたので、合成する側を
  `buildFeatureBranch`／`buildConfigUnitLocation`／`buildNewTag` に倣って `build` 始まりに改名。
  commit `3892c7a` + `00bc5be`
- **T-231: `LatestTagResolution` に `origin` を足し、新規作成予定のタグを計画のログに出した**。
  `origin: "existing" | "created"`（dryRunの `"created"` は「作成予定」の意味）。それまで
  `trackedHeadTagNames.size === 0` から導出できるだけで読む人には見えなかった。`AppUpdatePlan` にも
  持たせ、`describePlan()` 経由で dry_run の SKIPPED ログと CREATED ログの両方に出る。
  `pnpm check` 通過: 40 Test Files / 495 Tests。commit `346e122`

- **T-232: 軸交差の規則を `docs/architecture.md` に書き、README・glossary を追随させた**。
  新設した節は「読み取りだけの軸交差は`CachedReads`で暗黙に、副作用を伴う軸交差はstepとして
  明示的に」。交差3箇所（web URL解決／values.yaml読み込み／最新タグ解決）の表と、
  「**読みのキャッシュは速度の約束であって正しさの約束ではない**」という分かれ目を置いた。
  既存の3件は消さずに位置づけ直した——判断3は根拠を差し替え、「重複排除をキャッシュの外にも
  置かない」は「**単一の読み取りの**重複排除は〜」に書き分け、「唯一の例外」は例外が消えた経緯に
  書き換え。`README.md` のフロー図はタグ解決を設定ユニットの並列処理の外に出した3段構成に。
  `docs/glossary.md` に `TagSource` と `タグの由来（TagOrigin）` を追加。波及で
  `docs/coding-standards.md`・`docs/smoke-test.md` も追随。`pnpm check` 通過: 40 Test Files /
  495 Tests。commit `ad71d0b`（節の索引の追随漏れ1件は `82db4bd` で修正。過去のコミット由来のズレ）
- **`docs/research/github-support.md` の旧ファイル名は据え置いた**。時点を明記した調査記録で、
  T-233 でも同じ判断（旧パスを過去の記録として据え置く）をしているため揃えた

### 2026-09-13 並行セッションとの衝突と worktree

- **T-229 が2セッションで重複実装になった。** こちらのセッションが `develop/tasks.json` の
  `status` を `doing` にする前にサブエージェントへ投げたのが原因。ユーザー判断でワークツリー側
  （`3f3856d`）を正とし、main 側のコード4ファイルをそれと完全一致させて決着した
- **以降は「着手マークを先に置いてから委譲する」運用にした。** `tasks.json` の `status` が
  セッション間の唯一の調整手段になる（メッセージでは届かない相手だった）
- T-230・T-231 はワークツリー `../helm-yadokari-resolve-tags`（ブランチ `work/resolve-tags`）で
  進めてから main へマージし、**ワークツリーとブランチは削除済み**。マージ時に
  `src/domain/types.ts` と `resolve-latest-tags.ts`（削除 vs 変更）で衝突したが、
  main の `src`/`test` がマージ前に `3f3856d` と完全一致していることを確認したうえで
  全てブランチ側を採用した（`f782774`）

### 2026-09-13 実機スモークテスト（GitLab、パス1〜3）

- **`docs/smoke-test.md` のパス1〜3を gitlab.com の実機で通した**（パス4はMRの手動マージが
  要るため今回は実施せず）。結果はすべて手順書の「期待する結果」と一致:
  - パス1（通常更新）: 終了コード0、`{"CREATED":4,"SKIPPED":0,"ERROR":0}`。chart1に3件・
    chart2に1件とプロジェクトをまたいでMRが分かれ、`tenant2/client1` だけ2ファイル＋
    向き先ブランチ2件になった
  - パス2（再実行）: 終了コード0、`{"CREATED":0,"SKIPPED":4,"ERROR":0}`。全件 `mr_exists`
  - パス3（部分失敗）: **終了コード1**、`{"CREATED":3,"SKIPPED":0,"ERROR":1}`。ERRORは
    `tenant2/client2` のみで、メッセージも期待値どおり
    （`[アプリ: sample-qa-sprint] values.yaml にアンカー "t2c2QaSprintVersion" が見つかりません`）。
    **残り3ユニットにはMRができており、「該当chartリポジトリだけERRORで処理継続」が実機で通った**
- **今セッションの改修（T-229〜T-232）が実機で壊れていないことを確認できた。** 4stepの
  パイプライン・`resolveTags` の一意化・`settleApp()` 経由のERROR伝播がすべて実データで動いた
- **T-231 の `origin` が実機のログに出た**（今回は全件 `existing`）。`create_tag` は発生せず、
  既存タグが再利用された（`docs/smoke-test.md`「2回目以降は作られたタグが再利用される」のとおり）
- `pnpm lint:validate-config:remote` も通過（4設定ユニット / 6 apps、実在チェック済み）
- 後片付け済み（`reset --apply` → `setup --apply`。オープンMR 0件、フィクスチャは初期状態）

## 次にやること

**`README.md` のプロジェクト構成のツリー展開を T-237 として登録した**（2026-09-13、`/plan-tasks`）。
`src/` が1行にまとまっていて4区分がコメントの列挙でしか見えないため、`steps/`・`lib/`・
`domain/`・`utils/` を1階層だけ枝に出す。**2階層目（`src/steps/resolve-tags/` など）は出さない**:

- **T-237**（sonnet・loopable `Y`）: 区分ごとの一行コメントは `docs/architecture.md` の
  `###` 見出しの要約（T-234 で2軸に書き換えた定義）に沿わせる。責務の本体を README に
  書き写すと正典が二重になるので、名札の粒度を超えない

他のタスクとは独立で、T-235・T-236 とは触るファイルが重ならない。
指示メモは [`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-13（4回目）」。

**`resolve-tags/` まわりの2タスクを T-235・T-236 として登録した**（2026-09-13、`/plan-tasks`）。
依存は直列で、**T-235 → T-236** の順に実行する（同じファイルを触るため）:

- **T-235**（sonnet・loopable `Y`）: `resolve-tags.ts` の `groupByTagSource()` を可変Mapの
  組み立てから不変な生成に書き換える。`src/` で生成後に `set()` でループしているのはここだけで、
  前例は `lib/config/load-config-unit.ts:133` の `new Map(xs.map(...))`
- **T-236**（opus・loopable `N`）: `resolve-tags/` のサブステップ構成（`sub-steps/` に1ファイルだけ）を
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
