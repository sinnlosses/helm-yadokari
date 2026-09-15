# 実機スモークテスト手順

実際の GitLab に対して、CLIが期待どおり MR を作るかを確認するための手順。
`config/` のフィクスチャと `scripts/smoke/smoke-fixture.ts` を使って**何度でも同じ検証を
繰り返せる**ようにしてある。

> **書き込みが発生する**（タグ・ブランチ・コミット・MRの作成）。必ず検証用の
> スモークテスト用プロジェクトに対して実行すること。本番のchartリポジトリには向けない。

**この手順はGitLab専用**（`scripts/smoke/smoke-fixture.ts` がGitLab APIしか呼ばない）。
**GitHub（`PLATFORM=github`）での実機検証はまだ実施していない。** 単体テスト
（`test/lib/github/`）だけがGitHub側の挙動を検証している状態。

## 目次

| 節                            | 中身                                                  |
| ----------------------------- | ----------------------------------------------------- |
| ## 使うGitLabリソース         | projectIdと環境変数の対応表、フィクスチャに必要なもの |
| ## 検証シナリオ               | 5つのパスと、それぞれで確認すること                   |
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
理由を出して終了する）。**chartリポジトリ2は `smoke-fixture.ts` の外で作る**（`smoke-fixture.ts`
自体にはプロジェクト作成機能を足さない。事故時の影響を「既存プロジェクトへの書き込み」に
留めるため）。chartリポジトリ1と同じ設定にしてある（`sinnlosses-group` 配下・private・
デフォルトブランチ `main`）。プロジェクト作成が要る場面（パス5の2グループ目）は
`scripts/smoke/provision-group.ts` に隔離してあり、こちらは新規リソースしか作らない。

**`SMOKE_CHART2_PROJECT_ID` は省略できる。** 未設定ならchartリポジトリ2に関する処理をスキップ
するので、chartリポジトリ1だけでパス1〜4を流すこともできる。

**パス5（複数グループ）用の2グループ目は `smoke-fixture.ts` の対象外**で、
`scripts/smoke/provision-group.ts` で用意する（理由・手順は下の「2グループ目（パス5）に
必要なもの」）。

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
`release/2026-q1`（＝`helm.branchRef`と同じ値）をシードするので差分が出ない。

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
最新タグの解決の単位（`TagSource`）は `projectId` ＋追跡ブランチ＋タグ形式なので、
同じappを違うブランチで追う構成は単位が分かれる経路にあたる。

### パス3（部分失敗）用のシード

`charts/smoke-tenant2/client2/values.yaml` から **`t2c2QaSprintVersion` を抜いた版**を
シードできるようにする。`config/` 側は正しいまま、GitLab側だけが期待と違う状態になり、
`client2` だけが `ERROR` になる。

**`config/` を壊してERRORを作ることはできない。** 存在しないprojectIdやアンカーを `config/` に
置くと、CIの `validate-config-remote`（`.gitlab-ci.yml`）がMR時点で落ちる。これは意図した
設計なので、壊すのはGitLab側に限る。

### 2グループ目（パス5）に必要なもの

**`smoke-fixture.ts` では作れない。** 理由:

- 対象プロジェクトのprojectIdは固定の環境変数名（`SMOKE_CHART_PROJECT_ID` 等）でしか
  受け取らないため、1回の実行でグループA・グループB両方のprojectIdを同時に持てない
- 主スロット（`SMOKE_CHART_PROJECT_ID`・`SMOKE_QA_SPRINT_PROJECT_ID`・
  `SMOKE_DEVELOP_CLIENT_PROJECT_ID`）を使い回すには、グループBにも
  `tenant2/client1` と同じ形（3ファイル・複数アンカー・ソースリポジトリ2つ）を再現する必要があり、
  パス5が確かめたい「複数グループ・複数トークン」に対して過剰
- 予備スロット（`SMOKE_CHART2_PROJECT_ID`）を流用しようとしても、シード対象のタグは常に
  `SMOKE_QA_SPRINT_PROJECT_ID`（グループAのソースリポジトリ）から取る実装になっており、
  グループBのchartへ登録するappがグループAのソースリポジトリと同じprojectIdになってしまう。
  これは「1つのprojectIdは1つのトークンにしか結びつけられない」（`docs/requirements.md`
  4.4節）に反し、`accessTokenEnv`をグループAと分離できない

したがって `scripts/smoke/provision-group.ts` で用意する（新規リソースしか作らない設計・
安全策は同スクリプト冒頭のコメント参照）。`.env` の `ACCESS_TOKEN` を **`api` スコープの
個人PAT**にしておくこと（グループ・プロジェクトの作成やGroup Access Tokenの発行は
Group/Project Access Tokenでは行えないAPIのため）。

**gitlab.com では2点、この手順のまま動かない**（self-managedならそのまま動く）:

- **トップレベルグループをAPIから作れない**（`POST /groups` が403）。`<group-b>` は先に
  gitlab.comのUIでトップレベルグループとして作り、`provision`に`--use-existing-group`を
  付けて続ける。このオプションはグループの存在を確認したうえで、これから作る2プロジェクト
  （`yadokari-smoke-test-chart-b` / `sample-smoke-b-app`）と同じpathのプロジェクトがそのグループ
  直下に無いことを確認してから進む（衝突すれば中止する）。このスクリプトは既存プロジェクトに
  一切書き込まないため、**グループが空である必要はなく**、無関係な既存プロジェクトがあっても
  かまわない（新規作成時の「既に存在すれば中止」と対になる安全策）
- **Free プランでは Group Access Token / Project Access Token を発行できない**（Premium以上限定）。
  `provision`に`--skip-token`を付けてトークン発行を飛ばし、案内に従って`.env`の
  `ACCESS_TOKEN_SMOKE_B`には**手元の`api`スコープPAT**（グループA用と同じものでよい）を入れる。
  この場合、検証できるのは「別グループ・別トークン名の設定ユニットが独立してルーティングされ、
  片方の401が他方へ波及しない」ところまでで、**トークンの権限境界そのもの**（グループBのPATが
  グループA配下に書けないこと）はFreeでは検証できない。`--skip-token`を付けずに発行が
  400/403で失敗した場合も同じ案内が出て終了コード1になる。その時点までに作ったグループ内の
  リソース（プロジェクト・ブランチ・コミット・タグ）はそのまま残るため、
  `--skip-token`を付けて同じ`--group-path`・`--use-existing-group`で再実行すればよく、
  作り直す必要はない

```bash
# dry-run（既定）でまず何を作るか確認する
npx tsx --env-file=.env scripts/smoke/provision-group.ts provision --group-path <group-b>

# gitlab.com: 先にUIで<group-b>をトップレベルグループとして作ってから（空でなくてよい）、
# 既存グループを使う・トークン発行を飛ばす想定でdry-run確認する
npx tsx --env-file=.env scripts/smoke/provision-group.ts provision --group-path <group-b> \
  --use-existing-group --skip-token

# 問題なければ --apply を付けて実行する。最後に表示される内容を控える:
#   グループID・chartプロジェクトID・ソースプロジェクトID・
#   （--skip-tokenを付けない場合のみ）トークン値・.envに追記する行（ACCESS_TOKEN_SMOKE_B=...）・
#   config/yadokari-smoke-test-chart-b/ に置くregistry.yaml・smoke-b-app/config.yamlの中身
npx tsx --env-file=.env scripts/smoke/provision-group.ts provision --group-path <group-b> \
  --use-existing-group --skip-token --apply
```

作られるもの（`<group-b>` はトップレベルグループとして新規作成される）:

| 役割                      | プロジェクト                            | 備考                               |
| ------------------------- | --------------------------------------- | ---------------------------------- |
| chartリポジトリ B         | `<group-b>/yadokari-smoke-test-chart-b` | private・デフォルトブランチ `main` |
| ソースリポジトリ（app B） | `<group-b>/sample-smoke-b-app`          | **1つで足りる**（下記）            |

- ソースリポジトリは**1つで足りる**。`apps[]`・`appSpecs[]`の重複禁止は1ファイル内の重複
  （`validateNoDuplicateProjectIds()`）を指すだけで、グループBに複数appを揃える理由にならない。
  パス5が確かめたいのは「別グループ・別トークンの設定ユニットが独立して成功/失敗する」ことで、
  1app・1設定ユニットで示せる
- ブランチ `release/2026-q1`（向き先ブランチの更新先）
- `charts/smoke-b-app/values.yaml` … アンカー2つ（`smokeBAppVersion` / `smokeBHelmTargetBranch`）
- ソースリポジトリのシードタグ1件 … 実在する、かつ最新より古いタグ（理由は上の
  「chartリポジトリ1に必要なもの」と同じ）。タグ形式はグループAと同じ
  `{branch}-build-at-{date}-{time}` で揃える（appごとに違えてよいが、揃えない理由が無いため）

表示された `config/yadokari-smoke-test-chart-b/registry.yaml` と
`config/yadokari-smoke-test-chart-b/smoke-b-app/config.yaml` の中身をそのままそのパスに置く。

**トークン**は Group Access Token をグループA用・グループB用に1本ずつ発行する（スコープ・
ロール・有効期限の考え方はREADME
「[複数グループで運用する](../README.md#複数グループで運用する)」参照。
`provision-group.ts` はこの手順どおりの条件で発行する）。グループB用は上の`provision`が
発行済みなので、**グループA用だけ`token`サブコマンドで追加発行**する。
**gitlab.com Free ではこの`token`サブコマンドも400で失敗する**ため、その場合はグループA用にも
手元の`api`スコープPATを`ACCESS_TOKEN_SMOKE_A`にそのまま使う:

```bash
npx tsx --env-file=.env scripts/smoke/provision-group.ts token --group-path sinnlosses-group --apply
```

`.env` には次の名前で置く:

- `ACCESS_TOKEN_SMOKE_A` … グループA（chartリポジトリ1・chartリポジトリ2が使う）
- `ACCESS_TOKEN_SMOKE_B` … グループB（chartリポジトリBが使う）

パス5の最終形ではchartリポジトリ1・2・Bのすべてが`accessTokenEnv`を宣言するため、**CLI本体は
既定の`ACCESS_TOKEN`を要求しなくなる**（宣言の無いchartが1つも無ければ既定トークンを要求しない
実装 `assertFallbackAvailable()` の帰結。(d)で確かめる）。ただし **`smoke-fixture.ts` は既定の
`ACCESS_TOKEN`でGitLabに書く**ので、`.env`から消すなら `setup`/`reset` は
`ACCESS_TOKEN="$ACCESS_TOKEN_SMOKE_A" npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts …`
のようにグループAのトークンを既定名で渡す。

## 検証シナリオ

5つのパスがある。パス1〜4はパス1の結果をパス2〜4が利用するため**この順序で実行する**。
パス5は2グループ目という独立したフィクスチャを使うため、この順序と無関係に単独で実行できる。

| パス | 目的                         | 確認すること                                                                                   |
| ---- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| 1    | 通常更新                     | 複数chartリポジトリにMRが分かれる／1appが複数ファイルに書く／複数の追跡ブランチ                |
| 2    | 再実行                       | オープン中のMRがある設定ユニットは `SKIPPED (mr_exists)` になる                                |
| 3    | 部分失敗                     | 1ユニットが `ERROR` でも他は継続し、`PARTIAL_FAILURE` で**終了コード1**                        |
| 4    | 差分なし                     | `values.yaml` が更新後のままなら `SKIPPED (no_diff)` になる                                    |
| 5    | 複数グループ（宣言トークン） | 別グループ・別トークンの設定ユニットが独立して成功/失敗し、片方の401・未設定が他方へ波及しない |

パス3が単体では今回の主目的だったが、**「該当chartリポジトリだけERRORとしてログ記録し
処理継続する」**（`docs/architecture.md`「エラーは『fatalは例外・それ以外は戻り値』の
2チャネル」）は複数グループ構成で初めて「別グループには波及しない」ところまで実機で確かめられる
（パス5）。

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

### パス5: 複数グループ（宣言トークン）

**前提**: 「2グループ目（パス5）に必要なもの」のとおりchartリポジトリB・ソースリポジトリB・
シードタグ・`.env`の`ACCESS_TOKEN_SMOKE_A` / `ACCESS_TOKEN_SMOKE_B`を用意済みであること。
その上で `config/` に一時的に以下を置く（実ファイルを置くかどうか＝常設するかの判断は
[`config/README.md`](../config/README.md) 参照。ここでは検証のためだけに置く前提で書く）:

- `config/yadokari-smoke-test-chart/registry.yaml` … トップレベルに
  `accessTokenEnv: ACCESS_TOKEN_SMOKE_A` を追記
- `config/yadokari-smoke-test-chart2/registry.yaml` … 同じく
  `accessTokenEnv: ACCESS_TOKEN_SMOKE_A` を追記。**chart1とchart2は`sample-qa-sprint`を
  共有しているため、片方だけ宣言する／別の名前を宣言すると「1つのprojectIdは1つのトークンにしか
  結びつけられない」で設定エラーになり即時終了する。必ず同じ名前を宣言する**
- `config/yadokari-smoke-test-chart-b/registry.yaml` … 新規。`chartToUpdate`にchartリポジトリB、
  `appSpecs[]`にソースリポジトリB、トップレベルに `accessTokenEnv: ACCESS_TOKEN_SMOKE_B`
- `config/yadokari-smoke-test-chart-b/smoke-b-app/config.yaml` … 新規。`helm.locations[]`と
  `apps[].locations[]`に`smokeBHelmTargetBranch` / `smokeBAppVersion`を登録

トークンを不正にする操作は`.env`を書き換えず**コマンド行で上書き**する
（`tsx --env-file`は既に設定済みの環境変数を上書きしないため）。

```bash
# (a) 両グループ正常: 両方にMRができる
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply   # グループA分のみ
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts setup --apply   # グループA分のみ
# グループB分（手動シード）が初期状態であることを確認する
DRY_RUN=true pnpm dev
pnpm dev; echo "exit=$?"
```

```bash
# (b) グループBのトークンを不正な値にする
DRY_RUN=true ACCESS_TOKEN_SMOKE_B=glpat-bogus pnpm dev
ACCESS_TOKEN_SMOKE_B=glpat-bogus pnpm dev; echo "exit=$?"
```

```bash
# (c) グループBの環境変数を消す（空文字は未設定扱い）
ACCESS_TOKEN_SMOKE_B= pnpm lint:validate-config:remote; echo "exit=$?"
ACCESS_TOKEN_SMOKE_B= DRY_RUN=true pnpm dev
ACCESS_TOKEN_SMOKE_B= pnpm dev; echo "exit=$?"
```

```bash
# (d) 既定 ACCESS_TOKEN を消しても動く（全chartがaccessTokenEnvを宣言済みのため不要になる）
ACCESS_TOKEN= DRY_RUN=true pnpm dev
ACCESS_TOKEN= pnpm dev; echo "exit=$?"
```

**CIで確かめる**場合は、このリポジトリのSettings > CI/CD > Variablesに
`ACCESS_TOKEN_SMOKE_A` / `ACCESS_TOKEN_SMOKE_B` をMasked and hidden・Protected OFFで登録した上で、
上記の`config/`変更（`accessTokenEnv`3件の追記・`yadokari-smoke-test-chart-b/`新設）をMRにして
`validate-config-remote`が通ること、そのMRからRun pipeline（`DRY_RUN=true`）を実行して
`update-app-versions`が(a)相当の結果（`ERROR`無し）で終わることを見る。

**CI での実測（2026-09-15、GitLab プロジェクト `sinnlosses-group/helm-yadokari`）**:

- MR !2（ブランチ `smoke/pass5-ci`）の MR パイプライン: `validate-config-remote` が「5 設定ユニット」で成功
  （ジョブ 16509706597）。変数 `ACCESS_TOKEN_SMOKE_B` を消して再実行すると
  `[chart: yadokari-smoke-test-chart-b] 環境変数 ACCESS_TOKEN_SMOKE_B が未設定です` で失敗（ジョブ 16509780248）
- **`config/` を変えると `test/main.e2e.test.ts` も追随が要る。** このテストは実物の `config/` を読み、fake の
  GitLab 応答を projectId ごとに持つため、chart を足すと `check` が落ちる（初回の MR パイプラインで
  `expected 'PARTIAL_FAILURE' to be 'SUCCESS'`）。宣言した環境変数もテスト内で設定する必要がある
- **オープン中の MR があるブランチでは schedule 起動のパイプラインが作られない**（`.gitlab-ci.yml` の
  `workflow.rules` が「ブランチにオープン中の MR があれば never」を先に評価するため）。`update-app-versions` を
  試すときは MR をクローズしてから schedule を作って play する
- **API で作った schedule に変数を足す `POST /pipeline_schedules/:id/variables` は 403 になった**ため、`DRY_RUN=true` が
  効かず本番モードで走った（パイプライン 2850572787、ジョブ 16509821024）。全ユニットが `mr_exists` で `SKIPPED:5` だったので
  書き込みは起きなかったが、**手で試すときは UI の Run pipeline で `DRY_RUN` を true にするか、schedule の変数を UI で
  付けてから play する**。artifacts の `report/report.md` はこのジョブで回収できた（5行の表）

### 後片付け

```bash
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts setup --apply
```

グループB分は`smoke-fixture.ts`の対象外なので手動で片付ける: chartリポジトリBの
オープン中MRをクローズし、固定ブランチ `feature/yadokari/smoke-b-app` を削除する
（`main`の`values.yaml`はこのツールが書き換えないので戻す必要はない）。パス5専用に
`config/`へ追記した`accessTokenEnv`・新設した`yadokari-smoke-test-chart-b/`は、常設しない
と決めた場合は検証後に削除する（[`config/README.md`](../config/README.md)参照）。

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

### パス5: 複数グループ（宣言トークン）

**2026-09-15 に gitlab.com で実施済み**（グループB＝`sinnlosses-other-group`、chart B projectId 86489420・
ソースB projectId 86489421。Free プランのため `ACCESS_TOKEN_SMOKE_A` / `_B` は同じ `api` PAT）。以下は
その実測で、(a) は `CREATED:5`（グループA 4件＋`smoke-b-app`。ソースB には `main-build-at-20260915-203949` が
自動作成され、chart B に MR !1 ができた）、(b)・(c) は `SKIPPED:4 / ERROR:1` で終了コード 1、(d) は
`SKIPPED:5` で終了コード 0。`fatal_error` はどのケースでも出なかった。

- (a) 両グループ正常: 終了コード **0**。`summary`の`ERROR`は**0**。グループA側4ユニットと
  `smoke-b-app`の両方にMRができる（初回。パス1〜4を経た直後の再実行なら、グループA側は
  `SKIPPED`混じりになる）
- (b) グループBのトークンを不正な値にする: 終了コード **1**。`ERROR`は`smoke-b-app`のみで
  `reason`が
  `httpStatus: undefined, message: [chart: yadokari-smoke-test-chart-b] 環境変数 ACCESS_TOKEN_SMOKE_B のトークンで HTTP 401 が返りました`。
  グループA側4ユニットは`CREATED`または`SKIPPED`のまま変わらず、`fatal_error`にはならない
- (c) グループBの環境変数を消す: `pnpm lint:validate-config:remote`が
  `[chart: yadokari-smoke-test-chart-b] 環境変数 ACCESS_TOKEN_SMOKE_B が未設定です`を出して
  終了コード**1**。`pnpm dev`も終了コード**1**で、`ERROR`は`smoke-b-app`のみ、`reason`は
  `httpStatus: undefined, message: [chart: yadokari-smoke-test-chart-b] 環境変数 ACCESS_TOKEN_SMOKE_B が未設定です`。
  グループA側4ユニットは変わらず継続する
- (d) 既定`ACCESS_TOKEN`を消す: 終了コード **0**。全chartが`accessTokenEnv`を宣言しているため
  既定トークンの不在は`assertFallbackAvailable()`に検知されず、通常どおり動く

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
