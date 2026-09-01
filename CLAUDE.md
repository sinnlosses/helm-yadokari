# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is currently empty aside from this file and a README. There is no source code, build tooling, or tests yet.

Update this file once the project takes shape, filling in the sections below as they become established. Delete any section that ends up not applying to this project.

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

## 目次（今後書くべき項目）

- **プロジェクト概要**
  - 何を解決するプロジェクトか、対象ユーザー、スコープ外のこと
- **セットアップ / 環境構築**
  - 必要なランタイム・バージョン（Go, Node, Helm など）、依存関係のインストール方法
- **よく使うコマンド**
  - ビルド、Lint、フォーマット、テスト（全体/単体1件）、ローカル実行、デバッグ方法
- **アーキテクチャ概要**
  - 全体構成、主要コンポーネントとその責務、データ/制御フロー（複数ファイルを読まないと分からない大枠のみ）
- **ディレクトリ構成の勘所**
  - 自明でない配置ルール、生成物と手書きファイルの区別
- **設定・環境変数**
  - 設定ファイルの場所と役割、環境ごとの差分（dev/stg/prod）
- **Helm / Kubernetes 関連**
  - チャート構成、values の使い分け、テンプレートのレンダリング・検証方法（helm lint / helm template 等）
- **テスト方針**
  - テストの種類（unit/integration/e2e）と置き場所、CI で何を実行しているか
- **CI/CD**
  - パイプラインの概要、リリース手順、バージョニングルール
- **コーディング規約・レビュー方針**
  - このリポジトリ特有の規約やレビューで重視する観点（一般的な作法は書かない）
- **既知の制約・注意点**
  - ハマりどころ、意図的な仕様、将来変更予定の暫定実装
- **関連リンク**
  - Issue管理、設計ドキュメント、外部システムなど参照先
