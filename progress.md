# 現在の状態

最終更新: 2026-09-02

## 完了したこと

- `CLAUDE.md` を作成（プロジェクト状況とスキル一覧を記載）
- [mattpocock/skills](https://github.com/mattpocock/skills) からコア開発スキル（tdd, code-review, diagnosing-bugs, codebase-design, domain-modeling, resolving-merge-conflicts, research, implement, grilling）を日本語化して `.claude/skills/` に導入
- 進捗管理用に `tasks.json` / `progress.md` を作成
- **T-001完了**: `/grilling` を9ラウンド実施し、`docs/requirements.md` を確定（検討経緯は `docs/requirements-grilling.md`）
  - 目的: Helm chartでバージョン管理されているアプリのバージョンを自動更新・メンテナンスするシステム
  - タグ命名規則: `${branchの"/"を"-"に置換}-build-at-${yyyymmdd}-${hhmmss}`
  - 設定は `config/<chartリポジトリ>/chart.yaml` + `config/<chartリポジトリ>/<tenantId>/<clientId>/apps.yaml` の2階層構成（実物は `config/teamA-chart/` 配下）
  - MRは**chartリポジトリ単位**に集約（1 chart repo = 1 MR、固定ブランチ名、複数アプリの変更をまとめる）
  - 既存MRオープン中はそのchart repo全体をスキップ／chart repo内で一部アプリが失敗したらオールオアナッシングで見送る／chart repo間は失敗しても他は継続
  - MR本文にはタグへのリンクに加え、タグに紐づくパイプラインへのリンクも含める（状態によるフィルタリングはしない、判断はレビュアー）
  - 実行形態はCLI(TypeScript)、GitLab CI pipeline schedulesから公開npmレジストリ経由でinstallして定期実行
  - GitLab認証はGroup Access Token（read_api + write_repository + MR作成権限、最小権限）、アプリ登録は各チームがセルフサービスでMRを送る方式
  - `p-limit`で同時実行数を制御（デフォルト3〜5）、Dry-runモードあり

## 次にやること

- 実装タスク（T-002以降）を `tasks.json` に追加し、実装フェーズに着手する（`/tdd` や `/implement` スキルの利用を想定）

## 未解決

- なし（T-001の範囲では解消済み。実装を進める中で新たな疑問が出れば都度 `/grilling` を再開する）

## 注意

- リポジトリはまだ実装コードを持たない（README.md と `docs/`, `config/` のみ）
- `config/teamA-chart/` はユーザーが提示した設定ファイルの実例。`docs/requirements.md` のディレクトリ構成説明と対応している
