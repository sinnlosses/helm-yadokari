# config.example/

`config/` に置く設定ファイルの**コピー用サンプル**。実行対象ではない（CLIも
`validate-config-remote` もこのディレクトリは見ない）。ただしスキーマを変えたときに古いまま
放置されないよう、文法・整合性チェックだけは `pnpm lint` で `config/` と同じようにかけている
（`pnpm lint:validate-config:example`）。

架空のプロジェクトIDを含むため `config/` には置けない。`config/` の中身は
CIの `validate-config-remote` がGitLab上の実在チェックにかけるので、架空の設定を混ぜると
全MRが必ず落ちる（[`../config/README.md`](../config/README.md)）。

## 使い方

```bash
cp -r config.example/my-team-chart config/<あなたのchartリポジトリ名>
# projectId / projectName / ブランチ名 / valuesPath / anchor を実物に書き換える
pnpm lint:validate-config          # 文法・整合性チェック（GitLab接続なし）
pnpm lint:validate-config:remote   # GitLab上の実在チェック（要 .env、読み取りのみ）
```

不要な設定ユニットのディレクトリはそのまま削除してよい。深さ1だけで足りるなら
`my-tenant/` を消し、テナント分けが要るなら `my-unit/` を消す。

## 何を例示しているか

| ファイル                                       | 例示している構成                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `my-team-chart/registry.yaml`                  | chartリポジトリ単位の設定と、ソースリポジトリのタグ形式の台帳        |
| `my-team-chart/my-unit/config.yaml`            | 深さ1の設定ユニット。1app・1箇所だけの最小構成                       |
| `my-team-chart/my-tenant/client-a/config.yaml` | 深さ2の設定ユニット。複数app・1appから複数 `valuesPath` への書き込み |

## chartリポジトリ側の `values.yaml`

`anchor` は `values.yaml` 内のYAMLアンカー名を指す。オブジェクトのネストではなく、
**配列要素にアンカーで名前を付けた**構成を前提とする（chartリポジトリ側のファイルなので、
このディレクトリには含めない）。

```yaml
# chartリポジトリの charts/my-app/values.yaml（イメージ）
variables:
  - &myAppTargetBranch release/2026-q1 # helm.branchRef の書き込み先
  - &myAppVersion main-build-at-20260101-000000 # apps[].locations[] の書き込み先
```

## 正典

- フィールドの完全な仕様・制約: [`../docs/requirements.md`](../docs/requirements.md) 4.4節
- セットアップ手順・環境変数: [`../README.md`](../README.md)「設定」章
