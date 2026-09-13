# 現在の状態

最終更新: 2026-09-13（**`src/types/` を `src/domain/` に吸収し、`src/` を `steps/`・`lib/`・
`domain/`・`utils/` の4区分にした**（T-233・T-234）。`domain/` の定義は「ドメインを知っているか
×技術を知っているか」の2軸になった。**2026-09-12以前の「完了したこと」は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) へアーカイブ済み**）

**未着手のタスクは3件**（T-230〜T-232。T-229・T-233・T-234 は完了。`done` 10件は
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
  **注意: T-229 は別セッションと重複実装になった。** 同時刻に別のワークツリー
  （`../helm-yadokari-resolve-tags`、ブランチ `work/resolve-tags` の `3f3856d`）でも同じT-229が
  実装され、共有の `develop/tasks.json` 経由で `doing`→`done` が記録されていた。main側（`fe4824c`）は
  `docs/architecture.md` の型集計の再計算を含み、ブランチ側は `resolveTrackedHeadTagNames()` も
  `TagSource` を受ける形にしてキャッシュキーに `tagFormat` を含める理由をJSDocに明記している。
  **どちらを採るかはユーザー判断待ち**（ブランチ側の2点をmainへ取り込むのが素直）

## 次にやること

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
- **T-230**（`opus` / **`N`**）: `resolve-tags` step への切り出し本体。重複排除をキャッシュから集合演算にする
- **T-231**（`sonnet` / `Y`）: `LatestTagResolution` に `origin` を足し、新規作成予定のタグを計画のログに出す
- **T-232**（`opus` / `Y`）: 軸交差の規則を `docs/architecture.md` に書き、README・glossary を追随させる

**T-230 は `/loop` では拾われない**（`loopable: "N"`）。ユーザーの判断が要る論点を2つ含むため:
`CONCURRENCY_LIMIT` の意味が step ごとに変わることを許容するか、`create_tag` のログがバッチの
先頭に固まることが実機の運用で困らないか。指示メモは
[`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-13」。

**GitHub対応の8タスク（T-220〜T-228）はすべて完了。**
`PLATFORM=gitlab|github` で切り替わり、ドキュメントも追随済み。

**実機検証は未実施のまま**（GitLab側のスモークテストも未実施で、GitHub側は一度も実機に
当てていない）。新しい指示を出す場合は `develop/direction.md` に書いて `/plan-tasks` でタスク化する。

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
**実機スモークテストは未実施のまま**（下の記述を参照）。

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

**実機スモークテストは未実施。** `config.yaml` のキーが2つ変わっている
（`chart[]`→`locations[]`、`helm.branchToSync`→`helm.branchRef`）ので、一度
`docs/smoke-test.md` の手順を通しておくと、設定の読み込みが実機でも壊れていないことを
確かめられる。ローカルの `pnpm check` と `pnpm lint`（`config/` のスキーマ検証を含む）は通っている。

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
