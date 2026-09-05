# 実機スモークテスト手順

実際の GitLab に対して、CLIが期待どおり MR を作るかを確認するための手順。
`config-test/` のフィクスチャと `scripts/smoke/smoke-fixture.ts` を使って**何度でも同じ検証を
繰り返せる**ようにしてある。

> **書き込みが発生する**（タグ・ブランチ・コミット・MRの作成）。必ず検証用の
> スモークテスト用プロジェクトに対して実行すること。本番のchartリポジトリには向けない。

## 使うGitLabリソース

| 役割                      | プロジェクト                                 | projectId  |
| ------------------------- | -------------------------------------------- | ---------- |
| chartリポジトリ           | `sinnlosses-group/yadokari-smoke-test-chart` | `86061211` |
| ソースリポジトリ（app 1） | `sinnlosses-group/sample-qa-sprint`          | `82861978` |
| ソースリポジトリ（app 2） | `sinnlosses-group/sample-develop-client`     | `82861977` |

chartリポジトリ側に必要なもの（`smoke-fixture.ts setup` が用意する）:

- ブランチ `release/2026-q1` … Helmの向き先ブランチの更新先。書き込み前に実在検証されるため、
  実際に存在している必要がある
- ソースリポジトリのシードタグ … `values.yaml` の初期値には**実在する、かつ最新より古いタグ**を
  使う（T-035）。架空の値（旧`placeholder`）だとMR本文の旧タグリンク・比較リンクが
  存在しないタグを指してしまうため。`sample-develop-client` はコミットが1つしかないので、
  同じコミットに古い日時のタグ（`main-build-at-20260101-000000`）を作って代用している
  （比較リンクは開けるが差分は空になる）
- `charts/smoke-tenant2/client1/values.yaml` … アンカー3つ
  （`t2c1QaSprintVersion` / `t2c1DevelopClientVersion` / `t2c1HelmTargetBranch`）
- `charts/smoke-tenant2/client2/values.yaml` … アンカー2つ
  （`t2c2QaSprintVersion` / `t2c2DevelopClientVersion`）

対応する設定は `config-test/yadokari-smoke-test-chart/tenant2/` に置いてある（gitで管理）。

## 検証シナリオ

1つのchartリポジトリ配下に2つのclientがあり、それぞれ2つのappを持つ状態で:

| client            | 期待する結果                                                                |
| ----------------- | --------------------------------------------------------------------------- |
| `tenant2/client1` | image tag更新 **＋ Helmの向き先ブランチ更新**（`main` → `release/2026-q1`） |
| `tenant2/client2` | image tag更新のみ                                                           |

各clientには2つのappを登録してあるが、`sample-develop-client` は反映済みタグが追跡ブランチの
HEADを指すため更新対象から外れる（T-037）。「複数app登録の状態で、更新が必要なappだけが
MRに載る」ことの確認も兼ねている。

それぞれ独立した固定ブランチ `feature/yadokari/tenant2/<clientId>` とMRになる。

## 手順

```bash
# 0. 認証情報（.env に GITLAB_URL / ACCESS_TOKEN）と対象プロジェクトを用意
export SMOKE_CHART_PROJECT_ID=86061211

# 1. 前回の検証結果を片付ける（MRクローズ＋固定ブランチ削除）。--apply なしは dry-run
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply

# 2. chartリポジトリ側のフィクスチャを初期状態に戻す（向き先ブランチとvalues.yaml）
npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts setup --apply

# 3. 設定が壊れていないか確認（CIの validate-config-remote と同じチェック）
pnpm lint:validate-config:remote config-test

# 4. 何が起きるかだけ見る（書き込みなし）
CONFIG_PATH=config-test TARGET_CLIENT=tenant2/client1,tenant2/client2 DRY_RUN=true pnpm dev

# 5. 実際にMRを作る
CONFIG_PATH=config-test TARGET_CLIENT=tenant2/client1,tenant2/client2 pnpm dev
```

`TARGET_CLIENT` を外すと `config-test/` 配下の全client（`tenant1/*` を含む）が対象になる。

## 期待する結果

- 終了コード 0、ログの `summary` が `{"CREATED":2,"SKIPPED":0,"ERROR":0}`
- `sample-develop-client` はシードタグと最新タグが同じコミットを指すため、T-037のルール
  （反映済みタグが追跡ブランチのHEADを指すなら更新しない）で更新対象から外れる。
  そのため各clientのMRに載るイメージタグは `sample-qa-sprint` の1件になる
- chartリポジトリに `feature/yadokari/tenant2/client1` と `.../client2` の2ブランチ、
  それぞれに対応するMRが2件
- `client1` の `values.yaml` は2アンカーが書き換わる（`t2c1QaSprintVersion` ＋ 向き先ブランチ。
  `t2c1DevelopClientVersion` は上記のとおり据え置き）
- `client2` の `values.yaml` は1アンカー（`t2c2QaSprintVersion`）が書き換わる
- MRタイトルは種別ごとの件数つき（T-034）:
  - client1: `Auto MR by yadokari: update tenant2/client1 (image tag 1, helm branch 1)`
  - client2: `Auto MR by yadokari: update tenant2/client2 (image tag 1)`
- MR本文は2セクションのテーブル（T-036）。「## イメージタグ」は
  `リポジトリ / 追跡ブランチ / ファイル / アンカー / 旧タグ / 新タグ / 比較 / パイプライン` の8列で、
  「## Helmの向き先ブランチ」は `旧ブランチ / 新ブランチ / ファイル / アンカー` の4列。
  旧タグ・新タグはタグ名をラベルにしたリンク、比較・パイプラインはURLをそのまま表示する。
  リンク先はすべて実在するタグ・パイプラインで、値が無いセルは `-` になる

## 繰り返し実行するときの注意

- 固定ブランチにオープン中のMRが残っていると、そのclientは `SKIPPED (mr_exists)` になる。
  必ず手順1でリセットする
- 手順2を省くと `values.yaml` が前回の実行結果のままなので「差分なし」で
  `SKIPPED (no_diff)` になる
- ソースリポジトリの追跡ブランチのHEADに一致するタグが無い場合、CLIがタグを新規作成する
  （＝ソースリポジトリへの書き込みが発生する）。現在のスモークテスト用リポジトリは
  HEADに一致するタグがあるため、通常は既存タグが再利用される
- `smoke-fixture.ts` は事故防止のため `SMOKE_CHART_PROJECT_ID` の明示を必須にしており、
  `--apply` を付けない限り何も変更しない
