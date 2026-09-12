# CLAUDE.md

## 対話言語

ユーザーとの対話は常に日本語で行う。

## プロジェクト概要

Helm chart でバージョン管理されているアプリケーションのイメージタグを、GitLab のタグから
自動で最新に更新・メンテナンスするCLIツール。GitLab CI の pipeline schedules から定期実行し、
chart リポジトリ単位で1つの Merge Request を作成する。クラスタへの直接デプロイ（`helm upgrade`）は
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
npx vitest run test/domain/tag-format.test.ts # 単体テストファイルのみ実行
pnpm lint                             # oxlint + config/ のバリデーション（ローカルのみ）
pnpm lint:validate-config:remote      # config/ の値がGitLab上に実在するか検証（要 .env、読み取りのみ）
pnpm format                           # oxfmt で自動整形
pnpm dev                              # tsx でローカル実行（.env を読み込む）
pnpm build && pnpm start              # ビルドしてから実行
```

## アーキテクチャ概要

`src/main.ts` の `runProcess()` が全体のオーケストレーション（`src/steps/` を順に呼ぶだけの
薄いレイヤー）。実装は直接読めば分かるので、ここには**原則の見出しだけ**を置く。

- **原則1**: `src/steps/` 配下は `runProcess()` からしか呼ばれない。`steps/` 同士も
  `sub-steps/`直下のファイル同士も（型だけの参照も含めて）互いに import しない
- **原則2**: `src/lib/` に置くかどうかは「特定の技術・外部システム・ファイル形式に依存するか」
  だけで判断する。「複数箇所から呼ばれる」は `lib/` に置く理由にならない
- **原則3**: 本体パイプライン（`index.ts`→`main.ts`→`steps/`）から呼ばれず、CI・開発用
  スクリプトからしか呼ばれないコードは `src/` ではなく `scripts/<用途>/` に置く。原則2より先に
  こちらで `src/` かどうかを決める
- **原則4**: 同じディレクトリの中で1ファイルにまとめるか分けるかは、行数でも関数の数でもなく
  「ファイル名が概念になっているか」で決める。`helpers.ts`・`utils.ts`・`common.ts`のような
  **置き場所を名前にしたファイルは作らない**
- **原則5**: 型の置き場所も同じ判断基準で決める（**利用箇所の数では決めない**）

**新しいコードの置き場所の早見表、まとめる/分ける合図、型の置き場所、各ファイルの責務、
過去の設計判断は [`docs/architecture.md`](./docs/architecture.md) が正典。**
上の原則で迷ったら必ずそちらを開く（このファイルには判断材料を二重に書かない）。ただし
**通読しない**。冒頭の「節の索引」で節を1つ特定し、`sed -n '/^#### 見出し/,/^#\{1,4\} /p'`
でその節だけを読む。

## 設定・環境変数

`README.md`の「設定」章を参照（環境変数一覧・`config/`のスキーマ・ディレクトリ構成）。

## テスト方針

配置・モック・カバレッジの扱い・テストを消す/足すの判断は
[`docs/coding-standards.md`](./docs/coding-standards.md)「テスト」節が正典（ここには二重に
書かない）。TDD推奨（`/tdd` スキル参照）。

**IMPORTANT**: 変更後は必ず `pnpm check` を通してから完了を報告する。テスト件数・エラーなどの
根拠なしに「完了しました」と言わない。

## CI/CD

`.gitlab-ci.yml` 参照。`check`（型チェック・lint・test・build）→ `update-app-versions`
（pipeline schedule / 手動実行時のみ本体を実行）という構成。`validate-config-remote` は
`config/` の値がGitLab上に実在するかをMR時点で検証するジョブ（読み取りのみ。MR/push/手動実行で
必ず走る）。`renovate` ジョブはこのCLI自体の依存パッケージ更新用（別スケジュールで
`RENOVATE=true` を指定）。

CI/CD Variables に `ACCESS_TOKEN` を **Protected: OFF** で登録する（理由と手順は
[`README.md`](./README.md)「CI/CD」が正典）。

## コーディング規約・レビュー方針

**ルールの一覧**（理由・例外は [`docs/coding-standards.md`](./docs/coding-standards.md) が正典。
ただし**通読しない**。冒頭の「節の索引」で節を1つ特定して、その節だけを読む）:

- 関数はファイル内で「外から使うもの → その内部で使うもの」の順に並べる。テストのためだけの
  `export` はしない
- `as` キャストは極力使わない。ブランド型の生成は `toProjectId` のような factory 関数に封じ込める
- 変数は基本 `const`。コレクションも不変（`ReadonlyMap`・`readonly`）に保つ
- HTTP エラーの判定は `src/lib/gitlab/errors.ts` の既存ユーティリティ（`isFatalError` 等）を使う。
  gitbeakerのエラーの形を知ってよいのはこのファイルだけで、`src/utils/` には置かない（原則2）
- 401 / 5xx / ネットワーク障害は `FatalError` を投げて即時終了、それ以外は該当chartリポジトリを
  `ERROR` としてログ記録し処理継続する。`src/steps/` 配下に `try`/`catch` を書かない
- 環境変数はすべて `src/lib/env.ts` で管理し、読み取りは `loadEnvConfig()` を通す。モジュールの
  トップレベルでは `process.env` に触れない
- コメントは**コードから読み取れないことだけ**を書く。型名・関数名の言い換えは書かない。
  `/** */` は**その関数を呼ぶ人**向け、`//` は**実装を読む人**向けに書き分ける。残すかどうかは
  長さではなく種類で決める（今の挙動の制約・前提は残す、本体や呼び先の写しは消す、
  昔の経緯は正典へ）。正典は `docs/architecture.md` / `docs/glossary.md` / `docs/requirements.md`
- 型をどのファイルに置くかは**構成**の規約（上の「アーキテクチャ概要」原則5）。性質ごとの
  判断表は `docs/architecture.md`「型の置き場所」が正典
- コード・ドキュメントにタスク番号（`T-` + 3桁）を書かない
- 「無いかもしれない」プロパティは `readonly x: T | undefined` で書き、`?:` は使わない
  （例外は丸ごと省略できるオプション引数の中身のみ）。`undefined` を許容するかどうかの
  基準も含め詳細は `docs/coding-standards.md`「`undefined`」参照

レビュー観点は `/code-review` スキルのStandards軸（上記＋`docs/coding-standards.md`）と
Spec軸（`docs/requirements.md`）を参照。

## 導入済みスキル

[mattpocock/skills](https://github.com/mattpocock/skills) 由来のコア開発スキルを日本語化して
`.claude/skills/` に導入済み（一覧は毎セッションのスキル案内を参照）。`code-review` のみ、
issueトラッカー連携を前提とする元の記述を未設定でも動くよう汎用化してある。

このプロジェクト独自のスキルとして次の3つもある。

- `next-task`: `develop/tasks.json` の未着手タスクを1件実行する。`/loop /next-task` で
  全件`done`になるまでの自動進行に使う
- `plan-tasks`: `develop/direction.md` の指示をタスクに分解して `develop/tasks.json` に登録し、
  指示メモを `docs/history/direction.md` へ移す。**分解は方針決めを含むので委譲せず、
  `/loop` にも載せない**
- `maintain-docs`: `docs/`（`history/` 以外）・`README.md`・`CLAUDE.md` を7つの検査にかけ、
  実物とのズレ・重複・読みにくい構造を直す。正典を書き換えたあとの追随漏れを洗うのにも使う

## Git運用

個人開発のため、**作業ブランチは切らず `main` に直接コミットする**。「デフォルトブランチに
いるならまずブランチを切る」という一般的な既定挙動より、このルールを優先する。レビューのために
差分を分けたいときなど、必要な場合だけ明示的に指示する。

## 進捗管理とHandoff

会話やセッションが切れても再開できるよう、状態はチャットではなく `develop/` 配下の
`tasks.json` / `progress.md` に記録する。ユーザーからの指示も同様に `direction.md` に書く。**各手順の詳細（フィールド定義・difficultyの基準と
委譲の書き方・evidenceの粒度・アーカイブのトリガーと手順）は
[`docs/workflow.md`](./docs/workflow.md) が正典。**

1. セッション開始時に `develop/progress.md` と `develop/tasks.json` を読み、アーカイブすべき
   タイミングなら作業前にアーカイブする（**両方が判定の対象**。基準は `docs/workflow.md`）。`develop/direction.md` に見出し以外の中身があれば
   未タスク化の指示が残っているので、他の作業より先に `/plan-tasks` でタスク化する
2. `tasks.json` から依存が完了済みの `todo` タスクを1つ選ぶ
3. 作業する。タスクは **`difficulty` と同じモデルを指定したサブエージェントに委譲**する
   （メインセッションのモデルは判断材料にしない）。想定より判断が必要だと分かったら、
   その場で押し切らず `difficulty` を上げてから再開する
4. 完了の判定はテスト結果・生成物・実行ログなど検証可能な証拠で行う（宣言だけで合格にしない）
5. `develop/tasks.json` の `status`/`passes`/`evidence` と `develop/progress.md` を更新する

**IMPORTANT**: 以下は必ず人間の承認を得てから行う — 外部への公開・送信、破壊的なgit操作、
本番/共有環境への反映、認証情報や権限の変更。

## 関連リンク

- アーキテクチャ詳細（各ファイルの責務、ディレクトリ構成の勘所、既知の制約）: `docs/architecture.md`
- コーディング規約の詳細（各ルールの理由・例外）: `docs/coding-standards.md`
- 進捗管理の詳細（`develop/` の tasks.json・progress.md・direction.md のフィールド定義・evidenceの粒度・アーカイブ運用）: `docs/workflow.md`
- 完了タスク・過去セッションの詳細な記録: `docs/history/tasks-archive.md` / `docs/history/progress-archive.md`
  （セッション開始時に読む必要はない。過去の判断の経緯をたどりたいときだけ、`grep`で
  該当する `## T-XXX` を見つけてその節だけ参照する。どちらも100KB超あるため通読しない）
- 要件定義: `docs/requirements.md`（30KB超。**通読しない**。冒頭の「節の索引」で節を1つ特定して読む。
  4.4節はYAMLの実例を含むため、sedの終端は `^#\{2,4\}` にする）
- 要件定義の検討経緯（Q&Aログ）: `docs/requirements-grilling.md`
- 用語集（ドメイン用語とコード上の識別子の対応、表記ゆれの注記）: `docs/glossary.md`
  （20KB超。**通読しない**。冒頭の「用語の索引」で用語を1つ特定し、その見出しだけを読む）
- 実機スモークテストの手順（フィクスチャ・シナリオ・繰り返し方）: `docs/smoke-test.md`
- 調査記録（一次情報の出典と、採らなかった案）: `docs/research/`
- Issueトラッカー・外部の設計ドキュメントは未設定（今後追加され次第ここに記載する）
