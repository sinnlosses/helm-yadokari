# 実機スモークテスト手順

実際の GitLab に対して、CLIが期待どおり MR を作るかを確認するための手順。
`config/` のフィクスチャと `scripts/smoke/smoke-fixture.ts` を使って**何度でも同じ検証を
繰り返せる**ようにしてある。

> **書き込みが発生する**（タグ・ブランチ・コミット・MRの作成）。必ず検証用の
> スモークテスト用プロジェクトに対して実行すること。本番のchartリポジトリには向けない。

## 目次

| 節                            | 中身                                                  |
| ----------------------------- | ----------------------------------------------------- |
| ## 使うGitLabリソース         | projectIdと環境変数の対応表、フィクスチャに必要なもの |
| ## 検証シナリオ               | 4つのパスと、それぞれで確認すること                   |
| ## 手順                       | パスごとのコマンド列                                  |
| ## 期待する結果               | パスごとの終了コード・summary・MRの中身               |
| ## 繰り返し実行するときの注意 | `SKIPPED`になる条件と、タグ新規作成の挙動             |
| ## 載せていないシナリオ       | 意図的に実機では確認しないものと、その理由            |

## 使うGitLabリソース

| 役割                      | プロジェクト                                  | 環境変数                          |
| ------------------------- | --------------------------------------------- | --------------------------------- |
| chartリポジトリ 1         | `sinnlosses-group/yadokari-smoke-test-chart`  | `SMOKE_CHART_PROJECT_ID`          |
| chartリポジトリ 2         | `sinnlosses-group/yadokari-smoke-test-chart2` | `SMOKE_CHART2_PROJECT_ID`         |
| ソースリポジトリ（app 1） | `sinnlosses-group/sample-qa-sprint`           | `SMOKE_QA_SPRINT_PROJECT_ID`      |
| ソースリポジトリ（app 2） | `sinnlosses-group/sample-develop-client`      | `SMOKE_DEVELOP_CLIENT_PROJECT_ID` |

projectIdは別のGitLabインスタンス・別のフィクスチャで検証する場合に差し替えられるよう、
`smoke-fixture.ts` はすべてこれらの環境変数から読み取る（ハードコードなし、未設定なら
理由を出して終了する）。**chartリポジトリ2は `smoke-fixture.ts` の外で作る**（プロジェクト
作成機能はスクリプトに足さない。事故時の影響を「既存プロジェクトへの書き込み」に留めるため）。
chartリポジトリ1と同じ設定にしてある（`sinnlosses-group` 配下・private・デフォルトブランチ `main`）。

**`SMOKE_CHART2_PROJECT_ID` は省略できる。** 未設定ならchartリポジトリ2に関する処理をスキップ
するので、chartリポジトリ1だけでパス1〜4を流すこともできる。

### chartリポジトリ 1 に必要なもの

`smoke-fixture.ts setup` が用意する。

- ブランチ `release/2026-q1` … Helmの向き先ブランチの更新先。書き込み前に実在検証される
- ソースリポジトリのシードタグ … `values.yaml` の初期値には**実在する、かつ最新より古いタグ**を
  使う。架空の値だとMR本文の旧タグリンク・比較リンクが存在しないタグを指してしまうため。
  `sample-develop-client` はコミットが1つしかないので、同じコミットに古い日時のタグ
  （`main-build-at-20260101-000000`）を作って代用している（比較リンクは開けるが差分は空になる）
- `charts/smoke-tenant2/client1/values.yaml` … アンカー3つ
  （`t2c1QaSprintVersion` / `t2c1DevelopClientVersion` / `t2c1HelmTargetBranch`）
- `charts/smoke-tenant2/client1/values-extra.yaml` … アンカー2つ
  （`t2c1QaSprintVersionExtra` / `t2c1HelmTargetBranchExtra`）。**1つのappが複数の
  `valuesPath` に書き込む**シナリオ用。`apps[].locations[]` に2件目を足すと、その `valuesPath` は
  `helm.locations[]` にも必要になる（全appのvaluesPathがカバーされていないと設定エラー）ため、
  向き先ブランチのアンカーも同じファイルに置く
- `charts/smoke-tenant2/client2/values.yaml` … アンカー3つ
  （`t2c2QaSprintVersion` / `t2c2DevelopClientVersion` / `t2c2HelmTargetBranch`）
- `charts/anchor-app/values.yaml` … アンカー3つ
  （`helmVersion` / `tenantId1client1AppsVersion` / `smokeTestTargetBranch`）。深さ1の設定ユニット
  `anchor-app` 用。**`helmVersion` はこのツールが読み書きしないアンカー**だが、chartリポジトリ側の
  実物にあるものなので、`setup` の上書きで消さないようシード内容にも含めている

向き先ブランチのアンカーは全ユニットで必須（`config.yaml`の`helm`は必須フィールド）。
`t2c1HelmTargetBranch` と `t2c1HelmTargetBranchExtra` だけシード値が `main` で、残りは
`release/2026-q1`（＝`helm.branchToSync`と同じ値）をシードするので差分が出ない。

### chartリポジトリ 2 に必要なもの

- デフォルトブランチ `main`（`registry.yaml` の `mrTargetBranch` に使う）
- ブランチ `release/2026-q1`（向き先ブランチの更新先）
- `charts/shared-app/values.yaml` … アンカー2つ
  （`sharedQaSprintVersion` / `sharedHelmTargetBranch`）

chartリポジトリ2には `sample-qa-sprint` を登録する。**同じappが2つのchartリポジトリに
またがって登録された状態**になるが、`tagFormat` は両方の `registry.yaml` で同じ値にする
（食い違わせると設定エラーで即時終了し、他のシナリオが流せなくなる。理由は
「載せていないシナリオ」を参照）。

### ソースリポジトリに必要なもの（条件付き）

**`branchToSync` が複数種類**であることを確認するため、`sample-qa-sprint` に `main` 以外の
追跡ブランチ（例: `develop`）と、そのブランチ由来のタグが1件以上必要。
**無ければ作る**が、ソースリポジトリへの書き込みになるので個別に承認を得る。
`createResolveLatestTags()` のキャッシュキーが `projectId:branchToSync` なので、
同じappを違うブランチで追う構成はキーが分岐する経路にあたる。

### パス3（部分失敗）用のシード

`charts/smoke-tenant2/client2/values.yaml` から **`t2c2QaSprintVersion` を抜いた版**を
シードできるようにする。`config/` 側は正しいまま、GitLab側だけが期待と違う状態になり、
`client2` だけが `ERROR` になる。

**`config/` を壊してERRORを作ることはできない。** 存在しないprojectIdやアンカーを `config/` に
置くと、CIの `validate-config-remote`（`.gitlab-ci.yml`）がMR時点で落ちる。これは意図した
設計なので、壊すのはGitLab側に限る。

## 検証シナリオ

4つのパスを順に流す。パス1の結果をパス2〜4が利用するため、**この順序で実行する**。

| パス | 目的     | 確認すること                                                                    |
| ---- | -------- | ------------------------------------------------------------------------------- |
| 1    | 通常更新 | 複数chartリポジトリにMRが分かれる／1appが複数ファイルに書く／複数の追跡ブランチ |
| 2    | 再実行   | オープン中のMRがある設定ユニットは `SKIPPED (mr_exists)` になる                 |
| 3    | 部分失敗 | 1ユニットが `ERROR` でも他は継続し、`PARTIAL_FAILURE` で**終了コード1**         |
| 4    | 差分なし | `values.yaml` が更新後のままなら `SKIPPED (no_diff)` になる                     |

パス3が今回の主目的。**「該当chartリポジトリだけERRORとしてログ記録し処理継続する」**
（`docs/architecture.md`「エラーは『fatalは例外・それ以外は戻り値』の2チャネル」）が
実機で通る唯一の経路になる。

## 手順

```bash
# 0. 認証情報（.env に GITLAB_URL / ACCESS_TOKEN）と対象プロジェクトを用意
export SMOKE_CHART_PROJECT_ID=86061211
export SMOKE_CHART2_PROJECT_ID=86354445
export SMOKE_QA_SPRINT_PROJECT_ID=82861978
export SMOKE_DEVELOP_CLIENT_PROJECT_ID=82861977
```

### パス1: 通常更新

```bash
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply   # 前回の後片付け
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts setup --apply   # 初期状態に戻す
pnpm lint:validate-config:remote                                       # 設定の実在確認（読み取りのみ）
DRY_RUN=true pnpm dev                                                  # 何が起きるかだけ見る
pnpm dev                                                               # 実際にMRを作る
```

### パス2: 再実行（`mr_exists`）

パス1の直後に、後片付けをせずそのまま流す。

```bash
pnpm dev
```

### パス3: 部分失敗（`ERROR` / `PARTIAL_FAILURE`）

MRとブランチだけ片付け、`client2` のアンカーを抜いた状態でシードし直す。

```bash
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts setup --broken-anchor --apply
pnpm dev; echo "exit=$?"
```

### パス4: 差分なし（`no_diff`）

**`reset` だけして `setup` を省く方法では `no_diff` にならない。** このツールは `main` に書かず、
固定ブランチ `feature/yadokari/<unitPath>` を `mrTargetBranch` から作ってそこにコミットするため、
`reset` で固定ブランチを消すと `main` の `values.yaml` はシードのままに戻る。
現実に `no_diff` が起きるのは **MRがマージされた後の次回実行**だけ。

パス1の直後に、MRを1件だけマージして再実行する。

```bash
# パス1で作られた anchor-app のMRをGitLab上でマージする（他の3件は開いたままにする）
pnpm dev
```

マージしたユニットが `no_diff`、残りが `mr_exists` という**混在した SKIPPED** になる。

### 後片付け

```bash
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts setup --apply
```

## 期待する結果

**以下は 2026-09-11 に実機で測った値**（設計時の推測ではない）。4設定ユニット
（`anchor-app` / `tenant2/client1` / `tenant2/client2` / `shared-app`）構成での実測。

### パス1: 通常更新

- 終了コード **0**、`summary` が `{"CREATED":4,"SKIPPED":0,"ERROR":0}`
- **ソースリポジトリにタグが1件自動作成される**。`shared-app` が `sample-qa-sprint` の
  `develop` を追跡するが develop 由来のタグが無いため:
  `{"event":"create_tag","projectName":"sample-qa-sprint","branch":"develop",`
  `"tag":"develop-build-at-<日付>-<時刻>","reason":"no_tag_at_branch_head"}`。
  2回目以降は作られたタグが再利用される
- MRは4件。**chartリポジトリ1に3件、chartリポジトリ2に1件**と、プロジェクトをまたいで分かれる:

| chart | MRタイトル                                                                 |
| ----- | -------------------------------------------------------------------------- |
| 1     | `Auto MR by yadokari: update anchor-app (image tag 1)`                     |
| 1     | `Auto MR by yadokari: update tenant2/client1 (image tag 2, helm branch 2)` |
| 1     | `Auto MR by yadokari: update tenant2/client2 (image tag 1)`                |
| 2     | `Auto MR by yadokari: update shared-app (image tag 1)`                     |

`tenant2/client1` だけ `image tag 2, helm branch 2` になるのが、**1つのappが複数の
`valuesPath` に書き込む**シナリオが効いている証拠（`values.yaml` と `values-extra.yaml`）

- `sample-develop-client` は `already_up_to_date` で更新対象から外れる
- MR本文は2セクションのテーブル。「## イメージタグ」は
  `リポジトリ / 追跡ブランチ / ファイル / アンカー / 旧タグ / 新タグ / 比較 / パイプライン` の8列、
  「## Helmの向き先ブランチ」は `旧ブランチ / 新ブランチ / ファイル / アンカー` の4列

### パス2: 再実行

- 終了コード **0**、`summary` が `{"CREATED":0,"SKIPPED":4,"ERROR":0}`
- 4ユニットとも `reason` が `mr_exists`。新しいMRもコミットも増えない

### パス3: 部分失敗

- 終了コード **1**、`summary` が `{"CREATED":3,"SKIPPED":0,"ERROR":1}`
- `ERROR` は `tenant2/client2` のみ。メッセージは
  `[アプリ: sample-qa-sprint] values.yaml にアンカー "t2c2QaSprintVersion" が見つかりません`
  `(valuesPath: charts/smoke-tenant2/client2/values.yaml)`
- **残り3ユニットにはMRができている**（1件の失敗で全体が止まっていない）。
  これが「該当chartリポジトリだけERRORで処理継続」を実機で確かめられる唯一の経路

### パス4: 差分なし

- 終了コード **0**、`summary` が `{"CREATED":0,"SKIPPED":4,"ERROR":0}`
- マージしたユニット（`anchor-app`）だけ `reason` が **`no_diff`**、残り3件は `mr_exists`

## 繰り返し実行するときの注意

- 固定ブランチにオープン中のMRが残っていると、その設定ユニットは `SKIPPED (mr_exists)` になる。
  パス1をやり直すときは必ず `reset` する
- **`setup` を省いても `no_diff` にはならない。** このツールは `main` に書かず固定ブランチに
  コミットするため、`reset` で固定ブランチを消すと `main` はシードのままに戻る。
  `no_diff` を踏むにはMRをマージする（パス4）
- `setup --broken-anchor` の後は**必ず `setup`（オプションなし）で戻す**。壊れた状態を
  残すと次の検証が成立しない
- ソースリポジトリの追跡ブランチのHEADに一致するタグが無い場合、CLIがタグを新規作成する
  （＝ソースリポジトリへの書き込みが発生する）。`main` を追跡するappはHEADに一致するタグが
  あるため既存タグが再利用されるが、**`shared-app` が追跡する `develop` にはタグが無いので
  初回実行時に1件作られる**（2回目以降は再利用）
- **`--apply` の直後にGitLabを読むと、まだ反映されていない古い結果が返ることがある。**
  ブランチの作成・削除で実際に2回遭遇した。「消えていない」「作られていない」と判断する前に
  数秒おいて引き直す
- `smoke-fixture.ts` は事故防止のため projectId の明示を必須にしており、`--apply` を
  付けない限り何も変更しない。`reset` はchartリポジトリしか触らないので
  `SMOKE_CHART_PROJECT_ID`（と `SMOKE_CHART2_PROJECT_ID`）だけで実行できる

## 載せていないシナリオ

実機で確認しないと決めたもの。**再検討する前にここを読む。**

- **`tagFormat` の食い違い（複数chartリポジトリ間）**。3つの理由で載せない。
  ① `validateTagFormatConsistency()` は `loadConfig()` の中で走り、
  `scripts/lint/validate-config.ts` も同じ `loadConfig()` を呼ぶため、**食い違う設定は
  `pnpm lint` とCIで落ちて `config/` にコミットできない**
  ② 既に単体テストがある（`test/lib/config/validate.test.ts`）
  ③ 実機で守るのは「実ファイル → MRの中身」の連結だけ
  （`docs/coding-standards.md`「通し（e2e）で守るのは…」）
- **`tagFormat` がappごとに違う構成**。同じappのtagFormatはchartリポジトリ間で揃える必要が
  あるため、appごとに変えるにはソースリポジトリを増やすか既存リポジトリに別形式のタグを
  打ち直すことになる。タグ形式のパース自体は `test/domain/tag-format.test.ts` が
  カバーしており、費用が効果を上回る
- **タグの自動作成**。確認するにはソースリポジトリの追跡ブランチHEADからタグを消す必要があり、
  他のパスのシード前提を壊す。副作用が効果を上回る
- **`FatalError`（401 / 5xx）による即時終了**。トークンを壊せば再現できるが、確かめられるのは
  「止まること」だけで、実ファイルからMRへの連結を通らない
