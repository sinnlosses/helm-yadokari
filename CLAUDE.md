# CLAUDE.md

## 対話言語

ユーザーとの対話は常に日本語で行う。

## プロジェクト概要

Helm chart でバージョン管理されているアプリケーションのイメージタグを、GitLab のタグから
自動で最新に更新・メンテナンスするCLIツール。GitLab CI の pipeline schedules から定期実行し、
chart リポジトリ単位で1つの Merge Request を作成する。クラスタへの直接反映（`helm upgrade`）は
行わない。詳細な要件・検討経緯は [`docs/requirements.md`](./docs/requirements.md) と
[`docs/requirements-grilling.md`](./docs/requirements-grilling.md) を参照。

対象ユーザーはチーム内限定。スコープ外のことは `docs/requirements.md` の「2.2 対象外とすること」参照。

## セットアップ / 環境構築

- Node.js 22.x, pnpm 11.x
- `pnpm install` で依存関係をインストール
- ローカル実行には `.env`（`.env.example` を参照）に `GITLAB_URL` / `ACCESS_TOKEN` を設定

## よく使うコマンド

```bash
pnpm check                            # tsc --noEmit + lint + format:check + test をまとめて実行（変更後は必ずこれを通す）
pnpm test                             # テスト全体
npx vitest run test/lib/gitlab/tag.test.ts # 単体テストファイルのみ実行
pnpm lint                             # oxlint + config/ のバリデーション（ローカルのみ）
pnpm lint:validate-config:remote      # config/ の値がGitLab上に実在するか検証（要 .env、読み取りのみ）
pnpm format                           # oxfmt で自動整形
pnpm dev                              # tsx でローカル実行（.env を読み込む）
pnpm build && pnpm start              # ビルドしてから実行
```

## アーキテクチャ概要

`src/main.ts` の `process()` が全体のオーケストレーション（`src/steps/` を順に呼ぶだけの
薄いレイヤー）。実装は直接読めば分かるので、ここには**コードから読み取れない設計原則**だけ書く。

- **原則1**: `src/steps/` 配下は `process()` からしか呼ばれない。`steps/` 同士は互いに呼ばない
- **原則2**: `src/lib/` に置くかどうかは「特定の技術・外部システム・ファイル形式（GitLab API、
  `config/`形式、`values.yaml`形式など）に依存するか」だけで判断する。「複数箇所から呼ばれる」
  は `lib/` に置く理由にならない
- 新しいコードを置く場所:
  - `process()`が直接呼ぶパイプラインの1段 → `steps/`
  - 呼び出し元が`steps/`の1ファイルだけ → そのファイル内の非公開関数（大きくなったら
    `steps/sub-steps/<step名>/`、例: `steps/sub-steps/build-plans/`、に分割してもよい。
    原則2は変わらない）
  - 複数箇所から呼ばれ、技術/外部システム/ファイル形式に依存する → 対応する`lib/`ファイル
  - 複数箇所から呼ばれ、技術に依存しない純粋な計算 → `utils/`
  - 複数の`steps/`から呼ばれるが、技術ではなくこのツールのドメイン型（`ChartAndApps`・
    `AppUpdatePlan`など）にだけ依存する → `steps/shared/`（結果ログの識別情報・エラー方針など。
    `lib/`でも`utils/`でもないためT-022で新設）

各ファイルの詳しい責務・ディレクトリ構成の勘所・既知の制約は
[`docs/architecture.md`](./docs/architecture.md) を参照。

## 設定・環境変数

`README.md`の「設定」章を参照（環境変数一覧・`config/`のスキーマ・ディレクトリ構成）。

## テスト方針

- TDD推奨: 実装コードの前に失敗するテストを書く（`/tdd` スキル参照）
- テストは `test/` 以下、`src/` と同じディレクトリ構成で配置する
- GitLab API クライアント（`@gitbeaker/rest`）は `vi.mock` でモックする（`test/lib/gitlab/gitlab.test.ts` 参照）。各ステップのテスト（`test/steps/*.test.ts`）も `lib/gitlab/gitlab.js` をモックし、非公開関数（`buildChartUpdate()` 等）はエクスポートされたステップの振る舞いを通して間接的に検証する

**IMPORTANT**: 変更後は必ず `pnpm check` を通してから完了を報告する。テスト件数・エラーなどの
根拠なしに「完了しました」と言わない。

## CI/CD

`.gitlab-ci.yml` 参照。`check`（型チェック・lint・test・build）→ `update-app-versions`
（pipeline schedule / 手動実行時のみ本体を実行）という構成。`validate-config-remote` は
`config/` の値がGitLab上に実在するかをMR時点で検証するジョブ（読み取りのみ。MR/push/手動実行で
必ず走り、`ACCESS_TOKEN`が参照できないときはスキップせず失敗する。そのため同変数は
Protected: OFF で登録する、T-032）。`renovate` ジョブはこのCLI自体の
依存パッケージ更新用（別スケジュールで `RENOVATE=true` を指定）。

## コーディング規約・レビュー方針

- `as` キャストは極力使わない。ブランド型（`ProjectId`, `BranchName` 等）の生成は
  `toProjectId` のような factory 関数に封じ込め、それ以外で `as` を使わない
- 変数は基本 `const` を使う。再代入が必要に見える場合はまず、値を返す関数に切り出せないか
  （`reduce`、早期return付きのヘルパー関数など）を検討する。ループカウンタや、`try`/`catch`
  で外側のスコープに結果を持ち出す必要があるなど `let` が自然な場合はその限りではない
- HTTP エラーハンドリングは `src/utils/http.ts` の既存ユーティリティ（`isFatalError` 等）を使う
- 環境変数はすべて `src/lib/env.ts` で管理する
- 401 / 5xx / ネットワーク障害は `FatalError` を投げて即時終了、それ以外のエラーは該当
  chart リポジトリを `ERROR` としてログ記録し処理継続する（詳細は README「エラーハンドリング」参照）
- レビュー観点は `/code-review` スキルのStandards軸（この節）とSpec軸（`docs/requirements.md`）を参照

## 導入済みスキル

[mattpocock/skills](https://github.com/mattpocock/skills) 由来のコア開発スキルを日本語化して
`.claude/skills/` に導入済み（一覧は毎セッションのスキル案内を参照）。`code-review` のみ、
issueトラッカー連携を前提とする元の記述を未設定でも動くよう汎用化してある。

## 進捗管理とHandoff

会話やセッションが切れても再開できるよう、状態はチャットではなく `tasks.json` / `progress.md`
に記録する（フィールド定義・書き方は [`docs/workflow.md`](./docs/workflow.md) 参照）。

1. セッション開始時に `progress.md` と `tasks.json` を読む。アーカイブすべきタイミングかどうか
   （`done` の件数・`tasks.json` のサイズ）を確認し、該当すれば作業前にアーカイブする
   （トリガー・手順は `docs/workflow.md`「肥大化したときのアーカイブ」参照）
2. `tasks.json` から依存が完了済みの `todo` タスクを1つ選ぶ
3. 作業する。タスクの `difficulty`（`haiku`/`sonnet`/`opus`）は必要な判断の重さを表す。
   `haiku`/`sonnet` のタスクは**そのモデルを指定したサブエージェントに委譲**し、`opus` の
   タスクはメインセッションが自分で実行する（セッション自身のモデルは変えられないため。
   委譲しない例外・委譲時の書き方は `docs/workflow.md` の「difficulty に応じたモデルの
   切り替え方」参照）。着手して想定より判断が必要だと分かったら、その場で押し切らず
   `difficulty` を上げてから再開する（基準は `docs/workflow.md`）
4. 完了の判定はテスト結果・生成物・実行ログなど検証可能な証拠で行う（宣言だけで合格にしない）
5. `tasks.json` の `status`/`passes`/`evidence` と `progress.md` を更新する

**IMPORTANT**: 以下は必ず人間の承認を得てから行う — 外部への公開・送信、破壊的なgit操作、
本番/共有環境への反映、認証情報や権限の変更。

## 関連リンク

- アーキテクチャ詳細（各ファイルの責務、ディレクトリ構成の勘所、既知の制約）: `docs/architecture.md`
- 進捗管理の詳細（tasks.json/progress.mdのフィールド定義・evidenceの粒度・アーカイブ運用）: `docs/workflow.md`
- 完了タスク・過去セッションの詳細な記録: `docs/history/tasks-archive.md` / `docs/history/progress-archive.md`
  （セッション開始時に読む必要はない。過去の判断の経緯をたどりたいときだけ参照する）
- 要件定義: `docs/requirements.md`
- 要件定義の検討経緯（Q&Aログ）: `docs/requirements-grilling.md`
- 用語集（ドメイン用語とコード上の識別子の対応、表記ゆれの注記）: `docs/glossary.md`
- 実機スモークテストの手順（フィクスチャ・シナリオ・繰り返し方）: `docs/smoke-test.md`
- Issueトラッカー・外部の設計ドキュメントは未設定（今後追加され次第ここに記載する）
