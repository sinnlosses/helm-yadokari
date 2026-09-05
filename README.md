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
- **重複作成を防ぐチェック** — 固定ブランチに未マージMRがある間は、そのテナント/クライアントの更新をスキップ
- **並列実行による高速処理** — `CONCURRENCY_LIMIT`（`p-limit`）で同時処理数を制御
- **パイプライン状態を可視化** — MR本文にタグへのリンクと、そのタグに紐づく最新パイプラインへのリンクを記載（マージ判断はレビュアーに委ねる）
- **差分をワンクリックで確認** — MR本文に旧タグ→新タグ間のGitLab比較URLを記載
- **ドライランモード** — `DRY_RUN=true` でタグ作成・ブランチ作成・MR作成をスキップし、更新予定の内容だけログ出力
- **設定バリデーション** — 起動時に Zod でスキーマを検証し、設定ミスを早期に検出

## タグ命名規則

GitLab のタグ名から追跡ブランチとビルド日時を判定します。デフォルトのフォーマットは:

```
${追跡ブランチ名の "/" を "-" に置換した値}-build-at-${yyyymmdd}-${hhmmss}
```

例: 追跡ブランチが `release/foo` の場合 → `release-foo-build-at-20260902-123456`

`TAG_FORMAT` 環境変数でテンプレートをカスタマイズできます。`{branch}`（"/"を"-"に置換した
追跡ブランチ名）・`{date}`（`yyyymmdd`）・`{time}`（`hhmmss`）の3プレースホルダをちょうど
1回ずつ含める必要があり、順序や区切り文字は自由に変更できます（例: `{date}-{time}-{branch}`）。
このフォーマットは新規タグの作成（`buildNewTag`）と既存タグの判定（`parseTag`）の両方に
使われるため、運用途中で変更すると過去に作成済みのタグは追跡ブランチ由来のタグとして
認識されなくなる点に注意してください。

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
cp -r config/teamA-chart config/my-team-chart
# → projectId・valuesPath 等を自分の環境に合わせて編集

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
    F --> G{追跡ブランチ由来の最新タグは、追跡ブランチの現在のHEADと一致?}
    G -->|一致しない（見つからない場合を含む）| H[🏷 追跡ブランチの最新コミットに新しいタグを作成]
    H --> I
    G -->|一致する| I{values.yaml のタグと最新タグは一致?}
    I -->|全アプリ一致| E
    I -->|差分あり| J[✅ 差分のあるアプリだけ values.yaml を更新しMR作成]
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
| `TARGET_CHART_DIR`  |      | —                                 | 指定すると `config/` 配下の特定のchartディレクトリのみ処理対象にします（省略時は全chart）。存在しないディレクトリ名を指定するとエラー終了します                                                                   |
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

`config.yaml`（よく変更する）と `anchors.yaml`（滅多に変更しない）でファイルを
分けています。`config.yaml` は「どのプロジェクトのどのブランチを追跡するか」といった運用値
のみを持ち、`anchors.yaml` は「`values.yaml` のどこ（`valuesPath` + YAMLアンカー名）に
書き込むか」というchart構造を持ちます。両者は `projectId` で対応付け、`anchors.yaml`
側にも同じ `projectId`/`projectName` を重複して書くことで、`anchors.yaml` 単体を見ても
「どのappの設定か」が分かるようにしています。

```yaml
# config/teamA-chart/chart.yaml
chart:
  projectId: 888 # values.yamlを更新するGitLabプロジェクトID
  projectName: teamA-chart
  mrTargetBranch: develop # MR作成先のベースブランチ
```

```yaml
# config/teamA-chart/tenantId1/clientId1/config.yaml
apps:
  - projectId: 1 # タグを取得するGitLabプロジェクトID（ソースリポジトリ）
    projectName: my-app
    branchToSync: main # 追跡するブランチ
```

```yaml
# config/teamA-chart/tenantId1/clientId1/anchors.yaml
apps:
  - projectId: 1 # config.yaml と一致させる
    projectName: my-app # config.yaml と一致させる
    chart:
      - valuesPath: charts/my-app/values.yaml
        anchor: myAppVersion # values.yaml内のYAMLアンカー名
```

`apps[].chart[].anchor` は、`values.yaml` 内のイメージタグの位置をYAMLアンカー名で指定する
フィールドです。`values.yaml` はオブジェクトのネストではなく、配列要素にYAMLアンカーで名前を
付けた構成（例: `variables: [&myAppVersion main, ...]`）を前提とし、指定したアンカー名を持つ
YAML上のスカラー値を、ネストの深さ・キー名に関わらず直接書き換えます。`chart` は1件以上の
配列なので、1つのソースリポジトリでWebAPI/バッチ/デーモンなど複数のデプロイ単位を管理して
いる場合は、複数要素を指定すれば同じ最新タグをまとめて反映できます。

ディレクトリ階層は常に `<chartリポジトリ>/<tenantId>/<clientId>/` の2階層で固定です。
テナント分けが不要な場合もダミーの1つの tenantId/clientId ディレクトリ配下に置いてください。

**Helmの向き先ブランチ**（values.yamlのパラメータを受け取ってk8sリソースを実際に構築する
ブランチ。`mrTargetBranch` ＝ 値定義ブランチとは別物）の追従・更新もMRの対象に含められます。
書き込む値は `config.yaml` の `helm.branchToSync`（tenantId/clientId単位に1件、人間が直接
書き換える運用）、書き込み先は `anchors.yaml` の `helm.chart[]`（`apps[].chart[]` とは独立した
リスト）で、両者は `valuesPath` の一致だけで各appに紐付きます:

```yaml
# config.yaml トップレベル。apps: 配列と同階層
helm:
  branchToSync: release/2026-q1
apps:
  - projectId: 1
    projectName: my-app
    branchToSync: main
```

```yaml
# anchors.yaml トップレベル（config.yaml の helm.branchToSync の値をどこに書くか）
apps:
  - projectId: 1
    projectName: my-app
    chart:
      - valuesPath: charts/my-app/values.yaml
        anchor: myAppVersion
helm:
  chart:
    # helm.branchToSync の値をこの valuesPath 内のこのアンカーに書き込む
    - valuesPath: charts/my-app/values.yaml
      anchor: myAppTargetBranch
```

設定エラー（実行前に例外で停止）になる主なケース:

- `config.yaml` と `anchors.yaml` の app の対応が取れない（片方にしかない、同じ `projectId`
  なのに `projectName` が食い違う）
- `helm.branchToSync` と `helm.chart[]` のどちらか片方だけが指定されている
- `helm.branchToSync` を指定しているのに、配下の**全アプリ**の**全 `chart[].valuesPath`** が
  `helm.chart[]` でカバーされていない（向き先ブランチはclient内で共通という前提のため）

各フィールドの完全な仕様・制約の一覧は [`docs/requirements.md`](./docs/requirements.md) の
「4.4 アプリの登録・設定」が正典です（このREADMEはセットアップに必要な範囲の要約です）。

設定ファイルの文法チェックのみ実行する場合:

```bash
pnpm lint:validate-config
```

## エラーハンドリング

| ケース                                                                   | 挙動                                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 401 認証エラー / 5xx サーバーエラー / ネットワーク障害                   | 即時 `exit(1)` でパイプライン失敗                                          |
| 429 / 502 / 503 / 504                                                    | 指数バックオフで最大3回リトライ後にエラー                                  |
| 追跡ブランチ由来の最新タグが無い、または追跡ブランチにビハインドしている | エラーにせず、そのブランチの最新コミットに新しいタグを作成して続行         |
| values.yaml不在                                                          | そのテナント/クライアントの更新全体を `ERROR` としてログ記録し次に持ち越す |
| 差分なし / 未マージMR既存                                                | `SKIPPED` としてログ記録                                                   |
| その他のAPIエラー（タグ作成失敗を含む）                                  | 該当テナント/クライアントを `ERROR` としてログ記録し処理継続               |

1件以上の `ERROR` があった場合は `exit(1)` でパイプライン失敗として終了します（致命的エラーを除く）。

## CI/CD

`.gitlab-ci.yml` にジョブが定義されています。GitLab の **スケジュールパイプライン** として設定することで定期実行できます。

### セットアップ手順

1. **Settings > CI/CD > Variables** に以下を登録する

   | 変数名         | Masked | Protected | 説明                                                                       |
   | -------------- | :----: | :-------: | -------------------------------------------------------------------------- |
   | `GITLAB_URL`   |        |           | GitLab インスタンスの URL                                                  |
   | `ACCESS_TOKEN` |   ✓    |     ✓     | Group/Project Access Token（`read_api` + `write_repository` + MR作成権限） |

2. **CI/CD > Schedules** でスケジュールを作成する

### 手動実行時のオプション（Pipeline inputs）

| input               | 型      | デフォルト | 説明                                                                                                                   |
| ------------------- | ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DRY_RUN`           | boolean | `false`    | `true` のとき更新をスキップしログのみ出力                                                                              |
| `CONCURRENCY_LIMIT` | string  | `3`        | `(chartリポジトリ, テナント/クライアント)`単位の同時処理数（1〜20の整数）                                              |
| `CONFIG_PATH`       | string  | `""`       | 設定ファイルのパス（省略時は `config/`）                                                                               |
| `TARGET_CHART_DIR`  | string  | `""`       | 特定のchartディレクトリのみ対象にする場合に指定（省略時は全chart）                                                     |
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
├── src/
│   ├── index.ts             # エントリポイント
│   ├── main.ts               # run()/process()。config読み込み→ステップ呼び出し→集計
│   ├── types.ts              # 型定義
│   ├── steps/                 # process()が直接呼ぶ3ステップのみ（steps同士は互いに呼ばない）
│   │   ├── filter-targets.ts  # 対象chartAndAppsの絞り込み（登録0件・既存MRを除外）
│   │   ├── build-plans.ts     # 全chartAndApps分の更新計画を並列構築
│   │   ├── apply-updates.ts   # コミット・MR作成を並列実行
│   │   ├── shared/            # 複数stepが共有する結果ログ・エラー方針
│   │   │   └── step-outcome.ts
│   │   └── sub-steps/         # 各stepの内部実装専用（step本体からのみ呼ばれる）
│   │       └── build-plans/   # 1アプリ・1箇所(target)単位の処理
│   │           ├── resolve-latest-tag.ts          # 最新タグの判定・不足時のタグ自動作成
│   │           ├── image-tag-target.ts            # イメージタグの差分検出・書き換え
│   │           ├── helm-target-branch-target.ts   # Helm向き先ブランチの差分検出・書き換え
│   │           └── types.ts                       # サブステップ間で共有する型
│   ├── lib/                   # 特定の技術・外部システムに依存する処理のみ
│   │   ├── gitlab/
│   │   │   ├── gitlab.ts      # GitLab API クライアント操作（タグ作成、MRタイトル・本文組み立て含む）
│   │   │   └── tag.ts         # タグ命名規則のパース・最新タグ判定・新規タグ組み立て（純粋関数）
│   │   ├── config.ts          # config/ の再帰読み込み・パース
│   │   ├── helm.ts            # Helm chart の values.yaml 操作（YAMLアンカー読み書き）
│   │   └── env.ts             # 環境変数ユーティリティ
│   └── utils/                 # ドメイン知識を持たない、または純粋な汎用ユーティリティ
│       ├── errors.ts          # カスタムエラー
│       ├── http.ts            # HTTP ユーティリティ
│       ├── retry.ts           # 指数バックオフリトライ
│       ├── timer.ts           # 実行時間計測
│       ├── logger.ts          # 構造化 JSON ロガー
│       ├── parallel.ts        # mapWithConcurrency（p-limit + FatalError時の即時中断）
│       ├── fs.ts              # パストラバーサル検証・サブディレクトリ列挙
│       ├── yaml.ts            # YAMLファイル読み込み + Zodバリデーション
│       ├── partition.ts       # partitionMap（判別可能ユニオンの配列を2つに振り分け）
│       ├── sequential.ts      # reduceAsync（配列を順に処理する非同期reduce）
│       └── cache.ts           # getOrFetch（Mapベースの非同期メモ化）
├── test/                   # テスト（src/ と同じディレクトリ構成）
├── scripts/
│   └── lint/validate-config.ts  # config/ の文法チェック（pnpm lint:validate-config）
├── config/                 # 対象アプリ設定
├── config-test/            # 実GitLabに対する手動スモークテスト用の設定（CONFIG_PATH=config-test）
├── docs/                   # 要件定義・アーキテクチャ・用語集など
├── .gitlab-ci.yml          # CI ジョブ定義
└── package.json
```

`config-test/` は本番の対象アプリ設定ではなく、実際の GitLab インスタンスに対して
`CONFIG_PATH=config-test DRY_RUN=true` で疎通・動作確認するための手動検証用フィクスチャです
（CIからは参照されません）。
