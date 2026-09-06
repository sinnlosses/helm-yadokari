<p align="center">
  <img src="assets/logo.png" alt="helm-yadokari" width="200"/>
</p>

<h1 align="center">helm-yadokari</h1>

<p align="center">
  ヤドカリが定期的に新しい殻へ引っ越すように、Helm chart が参照するアプリケーションの<br>
  バージョン（イメージタグ）を GitLab のタグから自動判定し、必要なときだけ更新の Merge Request を作成します。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/pnpm-11-f69220?logo=pnpm" alt="pnpm">
  <img src="https://img.shields.io/badge/Tested_with-Vitest-6e9f18?logo=vitest" alt="Vitest">
  <img src="https://img.shields.io/badge/GitLab_CI-Compatible-fc6d26?logo=gitlab" alt="GitLab CI">
</p>

---

複数チーム・複数アプリを Helm chart で運用していると、アプリの新バージョンが出るたびに
`values.yaml` のイメージタグを手で書き換えて MR を作るのが手間になりがちです。
**helm-yadokari** は GitLab CI のスケジュールパイプラインから定期実行することで、
chart リポジトリ単位に更新をまとめた MR 作成を自動化します。

要件・設計の詳細は [`docs/requirements.md`](./docs/requirements.md) を参照してください。

## Features

- **複数チーム・複数chart・複数GitLabプロジェクトに対応** — `config/` 配下にディレクトリで登録
- **テナント/クライアント単位でMRを1つに集約** — 同じテナント/クライアント内の複数アプリの更新をまとめて1MR（1つのchartリポジトリに複数テナント/クライアントがあれば、それぞれ独立したMRになる）
- **オールオアナッシングな更新** — テナント/クライアント内の1アプリでも処理に失敗したら、その更新を見送り次回に再試行（他のテナント/クライアントには影響しない）
- **タグ自動作成** — 追跡ブランチ由来の最新タグが無い場合、または既にあってもそのブランチの現在の最新コミットにビハインドしている場合は、最新コミットに命名規則通りの新しいタグを作成してから更新する
- **追跡ブランチの切り替えを検知** — `branchToSync` を変更したら、変更後のブランチの最新コミットに新しいタグを作成して反映する（変更前後のブランチが同じコミットを指していても更新する）
- **重複作成を防ぐチェック** — 固定ブランチに未マージMRがある間は、そのテナント/クライアントの更新をスキップ
- **並列実行による高速処理** — `CONCURRENCY_LIMIT`（`p-limit`）で同時処理数を制御
- **パイプラインへの導線** — MR本文にタグへのリンクと、そのタグに紐づく最新パイプラインのURLを記載（状態は表示せずリンクのみ。マージ判断はレビュアーに委ねる）
- **差分をワンクリックで確認** — MR本文に旧タグ→新タグ間のGitLab比較URLを記載
- **ドライランモード** — `DRY_RUN=true` でタグ作成・ブランチ作成・MR作成をスキップし、更新予定の内容だけログ出力
- **設定バリデーション** — 起動時に Zod でスキーマを検証し、設定ミスを早期に検出

## タグ命名規則

GitLab のタグ名から追跡ブランチとビルド日時を判定します。デフォルトのフォーマットは:

```
${追跡ブランチ名の "/" を "-" に置換した値}-build-at-${yyyymmdd}-${hhmmss}
```

例: 追跡ブランチが `release/foo` の場合 → `release-foo-build-at-20260902-123456`

`TAG_FORMAT` 環境変数でテンプレートをカスタマイズできます（`{branch}`/`{date}`/`{time}`を
ちょうど1回ずつ含む必要があります）。命名規則の詳細・運用途中で変更した場合の挙動は
[`docs/requirements.md`](./docs/requirements.md) の「4.1 バージョン判定」を参照してください。

## Quick Start

**前提条件**

- Node.js 22.x 以上
- pnpm 11.x 以上
- GitLab Group/Project Access Token（スコープ: `read_api` + `write_repository` + MR作成権限。最小権限で発行してください）

```bash
# 1. インストール
git clone <this-repo>
cd helm-yadokari
pnpm install

# 2. 設定ファイルを作成（config/ 配下の構成は下記「設定」を参照）
mkdir -p config/my-team-chart/my-tenant/my-client
# → chart.yaml / config.yaml / anchors.yaml を作成する
#   （記述例は docs/requirements.md 4.4節。config-test/ の実物も参考になる）

# 3. 動作確認（ブランチ作成・MR作成なし・安全）
GITLAB_URL=https://gitlab.example.com \
ACCESS_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
DRY_RUN=true \
pnpm dev

# 4. 実行
GITLAB_URL=https://gitlab.example.com \
ACCESS_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
pnpm dev
```

## 仕組み

`config/` に定義された `(chartリポジトリ, テナント/クライアント)` の組ごとに、配下の
全アプリを処理し、以下の条件をすべて満たす場合のみその単位で1つの MR を作成します（T-019）。
1つの chart リポジトリに複数のテナント/クライアントがあれば、同じプロジェクトに対して
それぞれ独立したブランチ・MR が作られます。

```mermaid
flowchart TD
    A[⏰ スケジュールパイプライン起動] --> B[config/ を再帰的に読み込む]
    B --> C[["(chartリポジトリ, テナント/クライアント)単位で並列処理"]]
    C --> D{固定ブランチにオープン中のMRあり?}
    D -->|あり| E[⏭ SKIPPED]
    D -->|なし| F[[配下の全アプリを処理]]
    F --> G{values.yaml の反映済みタグは追跡ブランチ由来? かつ<br/>追跡ブランチ由来の最新タグは現在のHEADと一致?}
    G -->|いずれかがNo（タグが見つからない場合を含む）| H[🏷 追跡ブランチの最新コミットに新しいタグを作成]
    H --> I
    G -->|どちらもYes| I{values.yaml のタグと最新タグは一致?}
    I -->|全アプリ一致| E
    I -->|差分あり| K{反映済みタグが追跡ブランチのHEADを指している?}
    K -->|Yes（中身が同じなので更新しない）| E
    K -->|No| J[✅ 差分のあるアプリだけ values.yaml を更新しMR作成]
```

同じテナント/クライアント内で一部アプリの処理が失敗した場合、成功した分だけを反映することは
せず、そのテナント/クライアントの更新全体を `ERROR` として次回実行に持ち越します
（オールオアナッシング）。同じ chart リポジトリ内の他のテナント/クライアントには影響しません。

### 実行ログの例

```json
{"level":"info","timestamp":"2026-09-02T00:00:00.000Z","event":"run_start","dryRun":false,"concurrencyLimit":3}
{"level":"info","timestamp":"2026-09-02T00:00:00.123Z","event":"update_chart","chartDir":"teamA-chart","tenantId":"tenantId1","clientId":"clientId1","chartProjectId":888,"chartProjectName":"teamA-chart","result":"CREATED","apps":[{"projectName":"my-app","previousTag":"main-build-at-20260901-090000","latestTag":"main-build-at-20260902-090000"}]}
{"level":"info","timestamp":"2026-09-02T00:00:00.456Z","event":"update_chart","chartDir":"teamB-chart","tenantId":"tenantId1","clientId":"clientId1","chartProjectId":999,"chartProjectName":"teamB-chart","result":"SKIPPED","reason":"no_diff"}
{"level":"info","timestamp":"2026-09-02T00:00:00.500Z","event":"summary","CREATED":1,"SKIPPED":1,"ERROR":0}
{"level":"info","timestamp":"2026-09-02T00:00:00.520Z","event":"run_end","duration_ms":520}
```

## 設定

### 環境変数

| 変数名              | 必須 | デフォルト                        | 説明                                                                                                                                                                                                              |
| ------------------- | :--: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GITLAB_URL`        |  ✓   | —                                 | GitLab インスタンスの URL（`http://` または `https://` で始まる形式）                                                                                                                                             |
| `ACCESS_TOKEN`      |  ✓   | —                                 | `read_api` + `write_repository` + MR作成権限を持つ Group/Project Access Token（最小権限で発行してください）                                                                                                       |
| `CONFIG_PATH`       |      | `config/`                         | 設定ファイル（ディレクトリ）のパス（作業ディレクトリ外のパスは拒否されます）                                                                                                                                      |
| `CONCURRENCY_LIMIT` |      | `3`                               | `(chartリポジトリ, テナント/クライアント)`単位の同時処理数（1〜20の整数）                                                                                                                                         |
| `DRY_RUN`           |      | `false`                           | `"true"` のときタグ作成・ブランチ作成・MR作成をスキップし、更新予定の内容のみログ出力します                                                                                                                       |
| `TARGET_CHART`      |      | —                                 | 指定すると `config/` 配下の特定のchartディレクトリのみ処理対象にします（省略時は全chart）。存在しないディレクトリ名を指定した場合、または絞り込み結果が0件の場合はエラー終了します                                |
| `TARGET_CLIENT`     |      | —                                 | 指定すると特定のtenant/clientのみ処理対象にします。`"<tenantId>/<clientId>"` 形式で、カンマ区切りで複数指定可（例: `"t1/c1,t2/c2"`。省略時は全client）。該当するtenant/clientが見つからない場合はエラー終了します |
| `TAG_FORMAT`        |      | `{branch}-build-at-{date}-{time}` | タグ命名規則のテンプレート（詳細は「[タグ命名規則](#タグ命名規則)」参照）。`{branch}`/`{date}`/`{time}` をちょうど1回ずつ含まない場合はエラー終了します                                                           |

### config/

対象アプリを chart リポジトリ・テナント・クライアント単位のディレクトリ構成で定義します。

```
config/
  <chartリポジトリ名>/            # 例: teamA-chart（ディレクトリ名は人間向けのラベル）
    chart.yaml                     # そのchartリポジトリ共通の情報
    <tenantId>/
      <clientId>/
        config.yaml         # 運用値（どのプロジェクトのどのブランチを追跡するか等）
        anchors.yaml        # chart構造（values.yaml内のどこに書き込むか）
```

`config.yaml`（よく変更する）と `anchors.yaml`（滅多に変更しない）でファイルを分けています。
`config.yaml` は「どのプロジェクトのどのブランチを追跡するか」といった運用値のみを、
`anchors.yaml` は「`values.yaml` のどこ（`valuesPath` + YAMLアンカー名）に書き込むか」という
chart構造のみを持ち、両者は `projectId` で対応付けます。Helmの向き先ブランチ（values.yamlの
パラメータを受け取ってk8sリソースを実際に構築するブランチ。`mrTargetBranch` ＝ 値定義ブランチ
とは別物）の追従・更新も、この設定でMRの対象に含められます。

ディレクトリ階層は常に `<chartリポジトリ>/<tenantId>/<clientId>/` の2階層で固定です。
テナント分けが不要な場合もダミーの1つの tenantId/clientId ディレクトリ配下に置いてください。

各ファイルの記述例・フィールドの完全な仕様・制約（`config.yaml`/`anchors.yaml` 間の対応チェック、
重複禁止など、設定ミスは実行前に例外で停止します）は [`docs/requirements.md`](./docs/requirements.md)
の「4.4 アプリの登録・設定」が正典です（`config-test/` にも実物の記述例があります）。

### 設定ファイルの検証

```bash
# 文法・整合性のチェック（GitLabへの接続不要。pnpm check にも含まれる）
pnpm lint:validate-config

# 上記に加えて、projectId・ブランチ・valuesPath・アンカーが GitLab 上に実在するかを検証
# （読み取りのみ。タグ・ブランチ・MR は作りません。GITLAB_URL / ACCESS_TOKEN が必要）
pnpm lint:validate-config:remote
```

存在しないアンカーやブランチを指定した設定は、実行時に該当clientが `ERROR` になるまで
気づけません。これをMRの時点で止めるために、`--remote` 版をCIの `validate-config-remote`
ジョブとして**必ず実行**しています（MR・push・手動実行時）。`GITLAB_URL` / `ACCESS_TOKEN` が
参照できない場合もスキップせずエラーで停止するため、CI/CD Variables の Protected は
OFF にしてください（詳細は下記「CI/CD」章と `.gitlab-ci.yml` のコメント参照）。

## エラーハンドリング

| ケース                                                                                             | 挙動                                                                       |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 401 認証エラー / 5xx サーバーエラー / ネットワーク障害                                             | 即時 `exit(1)` でパイプライン失敗                                          |
| 429 / 502 / 503 / 504                                                                              | 指数バックオフで最大3回リトライ後にエラー                                  |
| 追跡ブランチ由来の最新タグが無い、追跡ブランチにビハインドしている、または追跡ブランチを切り替えた | エラーにせず、そのブランチの最新コミットに新しいタグを作成して続行         |
| values.yaml不在                                                                                    | そのテナント/クライアントの更新全体を `ERROR` としてログ記録し次に持ち越す |
| 差分なし / 未マージMR既存                                                                          | `SKIPPED` としてログ記録                                                   |
| その他のAPIエラー（タグ作成失敗を含む）                                                            | 該当テナント/クライアントを `ERROR` としてログ記録し処理継続               |

1件以上の `ERROR` があった場合は `exit(1)` でパイプライン失敗として終了します（致命的エラーを除く）。

## CI/CD

`.gitlab-ci.yml` にジョブが定義されています。GitLab の **スケジュールパイプライン** として設定することで定期実行できます。

### セットアップ手順

1. **Settings > CI/CD > Variables** に以下を登録する

   | 変数名         | Masked | Protected | 説明                                                                       |
   | -------------- | :----: | :-------: | -------------------------------------------------------------------------- |
   | `GITLAB_URL`   |        |     —     | GitLab インスタンスの URL                                                  |
   | `ACCESS_TOKEN` |   ✓    |     —     | Group/Project Access Token（`read_api` + `write_repository` + MR作成権限） |

   **Protected は OFF にしてください。** ON にすると保護ブランチ以外のパイプラインで変数が
   空になり、MR時に設定の実在チェック（`validate-config-remote` ジョブ）が実行できずに
   失敗します。設定ミスをMRで確実に止める運用を優先しているため、このジョブは変数が
   無いときにスキップせずエラーで停止します。

2. **CI/CD > Schedules** でスケジュールを作成する

### 手動実行時のオプション（Pipeline inputs）

| input               | 型      | デフォルト | 説明                                                                                                                   |
| ------------------- | ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DRY_RUN`           | boolean | `false`    | `true` のとき更新をスキップしログのみ出力                                                                              |
| `CONCURRENCY_LIMIT` | string  | `3`        | `(chartリポジトリ, テナント/クライアント)`単位の同時処理数（1〜20の整数）                                              |
| `CONFIG_PATH`       | string  | `""`       | 設定ファイルのパス（省略時は `config/`）                                                                               |
| `TARGET_CHART`      | string  | `""`       | 特定のchartディレクトリのみ対象にする場合に指定（省略時は全chart）                                                     |
| `TARGET_CLIENT`     | string  | `""`       | 特定のtenant/clientのみ対象にする場合に `"<tenantId>/<clientId>"` 形式で指定、カンマ区切りで複数可（省略時は全client） |
| `TAG_FORMAT`        | string  | `""`       | タグ命名規則のテンプレート（省略時は `{branch}-build-at-{date}-{time}`）                                               |

## 開発

```bash
# 依存インストール
pnpm install

# 型チェック・リント・フォーマット・テストをまとめて実行
pnpm check

# 個別実行
pnpm lint             # リント + 設定ファイルバリデーション
pnpm format           # フォーマット
pnpm test             # テスト
pnpm test:coverage    # カバレッジ付きテスト

# ローカル実行（TypeScript 直接）
GITLAB_URL=https://gitlab.example.com ACCESS_TOKEN=<token> pnpm dev

# 本番ビルド後に実行
pnpm build
GITLAB_URL=https://gitlab.example.com ACCESS_TOKEN=<token> pnpm start
```

### プロジェクト構成

```
.
├── src/                    # steps/ → lib/ → utils/ の3層構成
├── test/                   # テスト（src/ と同じディレクトリ構成）
├── scripts/                # config/ の検証・スモークテスト用スクリプト
├── config/                 # 対象アプリ設定（実運用の登録のみ。記述例は docs/requirements.md 4.4節）
├── config-test/            # 実GitLabに対する手動スモークテスト用の設定（CONFIG_PATH=config-test。CIからは参照されない）
├── docs/                   # 要件定義・アーキテクチャ・用語集など
├── .gitlab-ci.yml          # CI ジョブ定義
└── package.json
```

`src/` 配下の各ファイルの責務・ディレクトリ構成の勘所（`config-test/`・`scripts/` の使い方を
含む）・既知の制約は [`docs/architecture.md`](./docs/architecture.md) を参照してください。
