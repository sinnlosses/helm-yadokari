# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npx vitest run test/lib/tag.test.ts   # 単体テストファイルのみ実行
pnpm lint                             # oxlint + config/ のバリデーション
pnpm format                           # oxfmt で自動整形
pnpm dev                              # tsx でローカル実行（.env を読み込む）
pnpm build && pnpm start              # ビルドしてから実行
```

## アーキテクチャ概要

`src/main.ts` の `process()` が `config/` を読み込み、chart リポジトリ（`ChartGroup`）ごとに
`updateChartGroupIfNeeded()` を `p-limit` で並列実行する。1 chart リポジトリ = 1 MR。

- `updateChartGroupIfNeeded()`: 既存MRの有無を確認 → `buildChartUpdate()` で全アプリの更新計画を
  オールオアナッシングに構築 → 差分があればコミット・MR作成
- `buildChartUpdate()`: アプリごとに `lib/tag.ts` で追跡ブランチ由来の最新タグを判定し、
  `lib/values.ts` で `values.yaml` の現在値と比較。差分があるアプリだけを更新計画に含める。
  同じ `valuesPath` を参照する複数アプリの変更は1ファイルにまとめる
- `lib/gitlab.ts`: `@gitbeaker/rest` のラッパー。タグ一覧・ファイル取得・MR作成・
  タグに紐づく最新パイプライン取得など
- `lib/config.ts`: `config/<chart>/chart.yaml` + `config/<chart>/<tenantId>/<clientId>/apps.yaml`
  の2階層固定構成を再帰的に読み込み、Zodでバリデーション

## ディレクトリ構成の勘所

- `config/`: 手書きの設定（対象アプリ登録）。`docs/requirements.md` 4.4節のスキーマに従う
- `scripts/lint/validate-config.ts`: `config/` の文法チェック専用スクリプト（`pnpm lint:validate-config` から実行、`pnpm lint` に含まれる）
- `dist/`: `pnpm build` の生成物。gitignore対象、手で編集しない
- `docs/requirements.md`: 確定した要件。`docs/requirements-grilling.md`: 要件定義時のQ&Aログ（検討経緯の参照用、変更不要）

## 設定・環境変数

`README.md`の「設定」章を参照（環境変数一覧・`config/`のスキーマ・ディレクトリ構成）。

## テスト方針

- TDD推奨: 実装コードの前に失敗するテストを書く（`/tdd` スキル参照）
- テストは `test/` 以下、`src/` と同じディレクトリ構成で配置する
- GitLab API クライアント（`@gitbeaker/rest`）は `vi.mock` でモックする（`test/lib/gitlab.test.ts`, `test/main.test.ts` 参照）
- 変更後は必ず `pnpm test`（最終的には `pnpm check`）が通ることを確認してから完了と報告する

## CI/CD

`.gitlab-ci.yml` 参照。`check`（型チェック・lint・test・build）→ `update-app-versions`
（pipeline schedule / 手動実行時のみ本体を実行）という構成。`renovate` ジョブはこのCLI自体の
依存パッケージ更新用（別スケジュールで `RENOVATE=true` を指定）。

## コーディング規約・レビュー方針

- `as` キャストは極力使わない。ブランド型（`ProjectId`, `BranchName` 等）の生成は
  `toProjectId` のような factory 関数に封じ込め、それ以外で `as` を使わない
- HTTP エラーハンドリングは `src/utils/http.ts` の既存ユーティリティ（`isFatalError` 等）を使う
- 環境変数はすべて `src/lib/env.ts` で管理する
- 401 / 5xx / ネットワーク障害は `FatalError` を投げて即時終了、それ以外のエラーは該当
  chart リポジトリを `ERROR` としてログ記録し処理継続する（詳細は README「エラーハンドリング」参照）
- レビュー観点は `/code-review` スキルのStandards軸（この節）とSpec軸（`docs/requirements.md`）を参照

## 既知の制約・注意点

- `values.yaml` の書き換えは js-yaml でパース→オブジェクト変更→dumpする方式のため、
  コメントやクォートスタイルなどのフォーマットは保持されない
- タグに紐づくGitLabプロジェクトのURLは `Projects.show` で都度取得している（`config/`にnamespace
  slugを持たせていないため）
- Helm CLI（`helm lint` / `helm template` 等）は呼び出さない。`values.yaml`のテキスト更新のみ行う
- `FatalError`（401/5xx等）を検知すると、そのタスクだけでなく `p-limit` のキュー全体を
  `clearQueue()` でクリアし、他のchartリポジトリの処理も打ち切る（`src/main.ts` の `process()`）。
  `docs/requirements.md` 4.3節の「chartリポジトリ間は失敗しても他は継続する」という記述は
  一般的なエラーを指しており、GitLab側の認証切れ・障害のような全chart共通の致命的エラーに
  対しては、無駄なAPI呼び出しを避けるためこの例外を設けている（gitlab-watari-dori由来のパターン）
- 同一chartリポジトリ内の複数アプリの処理（タグ取得・パイプライン取得等）は `buildChartUpdate()`
  内で逐次実行している。`docs/requirements.md` 4.3節の並列実行制御（`p-limit`）は現状
  chartリポジトリ単位のみに適用しており、アプリ単位までは並列化していない

## 導入済みスキル

[mattpocock/skills](https://github.com/mattpocock/skills) の engineering カテゴリから、コア開発スキルを日本語化して `.claude/skills/` 配下に導入済み。

- `tdd`: テスト駆動開発（red-green-refactorループ）
- `code-review`: Standards軸とSpec軸の2軸で並列サブエージェントレビュー
- `diagnosing-bugs`: 難しいバグ・性能劣化の診断ループ
- `codebase-design`: 深いモジュール設計のための共通語彙
- `domain-modeling`: `CONTEXT.md`/ADRを使ったドメインモデルの構築
- `resolving-merge-conflicts`: git マージ/リベースのコンフリクト解消
- `research`: 一次情報源に基づく調査をバックグラウンドエージェントに委任
- `implement`: spec/チケットに基づく実装（`/tdd` → `/code-review` の流れを内包）
- `grilling`（productivityカテゴリ）: プラン・決定事項について、設計ツリーが尽きるまでユーザーを容赦なく問い詰める

`code-review` はissueトラッカー連携（`docs/agents/issue-tracker.md` 等）を前提とする元スキルの記述を、未設定でも動くよう汎用化してある。

## 進捗管理とHandoff

会話やセッションが切れても作業を再開できるよう、状態はチャットではなく以下の2ファイルに記録する。

- `tasks.json`: タスク一覧。各タスクは `id` / `task` / `status`（todo/doing/done）/ `passes`（完了条件を満たしたか）/ `evidence`（証拠となる成果物へのパス）/ `dependencies` を持つ。
- `progress.md`: 現在の状態。「完了したこと」「次にやること」「未解決」「注意」の4セクションで構成する。

### 作業の進め方

1. セッション開始時に `progress.md` と `tasks.json` を読む。
2. `tasks.json` から未完了(`todo`)のタスクを1つ選ぶ。依存(`dependencies`)が終わっていないタスクは選ばない。
3. 作業する。
4. AI自身の「完了しました」という発言だけを合格理由にしない。テスト結果・生成物・実行ログなど、タスクに応じた証拠で完了を判定する。
5. `tasks.json` の該当タスクの `status` / `passes` / `evidence` を更新する。新しいタスクが見つかったら追記する。
6. `progress.md` を更新する（完了したこと・変更したファイル・次にやること・未解決の問題）。

### 安全ルール

以下の操作は必ず人間の承認を得てから行う: 外部への公開・送信、破壊的なgit操作、本番/共有環境への反映、認証情報や権限の変更。

## 関連リンク

- 要件定義: `docs/requirements.md`
- 要件定義の検討経緯（Q&Aログ）: `docs/requirements-grilling.md`
- Issueトラッカー・外部の設計ドキュメントは未設定（今後追加され次第ここに記載する）
