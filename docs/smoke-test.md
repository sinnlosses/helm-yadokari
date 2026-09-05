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
- `charts/smoke-tenant2/client1/values.yaml` … アンカー3つ
  （`t2c1QaSprintVersion` / `t2c1DevelopClientVersion` / `t2c1HelmTargetBranch`）
- `charts/smoke-tenant2/client2/values.yaml` … アンカー2つ
  （`t2c2QaSprintVersion` / `t2c2DevelopClientVersion`）

対応する設定は `config-test/yadokari-smoke-test-chart/tenant2/` に置いてある（gitで管理）。

## 検証シナリオ

1つのchartリポジトリ配下に2つのclientがあり、それぞれ2つのappを持つ状態で:

| client            | 期待する結果                                                                        |
| ----------------- | ----------------------------------------------------------------------------------- |
| `tenant2/client1` | 2app分のimage tag更新 **＋ Helmの向き先ブランチ更新**（`main` → `release/2026-q1`） |
| `tenant2/client2` | 2app分のimage tag更新のみ                                                           |

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
- chartリポジトリに `feature/yadokari/tenant2/client1` と `.../client2` の2ブランチ、
  それぞれに対応するMRが2件
- `client1` の `values.yaml` は3アンカーすべてが書き換わる（image tag 2つ ＋ 向き先ブランチ）
- `client2` の `values.yaml` は2アンカーが書き換わる
- MR本文にアプリごとの打刻日時・パイプラインリンク・旧タグ→新タグの比較リンクが並び、
  向き先ブランチの行は `（アンカー: …、向き先ブランチ）: main → release/2026-q1` の形で出る

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
