# 現在の状態

最終更新: 2026-09-10（`/plan-tasks` で T-175〜T-179 を登録し、**T-175・T-172・T-178 を完了**、
**T-176・T-177 は着手しない判断で閉じた**。会話の中で出た指示から **T-180 を追加登録**した。
詳細は下の「完了したこと」を参照。2026-09-09以前の記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある）

**未着手のタスクは0件**。完了タスクは
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)、過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

### 2026-09-11 `src/lib/config/config.ts` の分割

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

## 次にやること

**未着手のタスクは0件**（T-172〜T-183 はすべて `done`）。T-176・T-177 は着手しない判断で
閉じたもので、理由は下の「未解決」にある。

`src/lib/config/` のリファクタリングでは、案2（`resolveProjectLinkage` を `validate.ts` から
`chart-and-apps.ts` へ移す）と案3（`loadChartAndApps()` の6引数をスコープ別の2オブジェクトに
まとめる）を**提案したうえで見送っている**（2026-09-11、ユーザー判断）。経緯は
`docs/history/direction.md` の 2026-09-11 にある。

- **次回の実機スモークは `docs/smoke-test.md` の手順1からやり直す。** `helm` 必須化で
  3つの設定ユニットすべてが `helm` を持つようになり、差分が出るのは `tenant2/client1` だけ
  （`client2` と `anchor-app` は向き先ブランチが `helm.branchToSync` と同値）。
  `smoke-fixture.ts setup --apply` は 2026-09-10 に実行済みで、フィクスチャは初期状態にある
- 新しい指示は `develop/direction.md` に書き、`/plan-tasks` でタスク化する

## 未解決

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
