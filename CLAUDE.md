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
pnpm lint                             # oxlint + config/ のバリデーション
pnpm format                           # oxfmt で自動整形
pnpm dev                              # tsx でローカル実行（.env を読み込む）
pnpm build && pnpm start              # ビルドしてから実行
```

## アーキテクチャ概要

`src/main.ts` の `process()` は前準備（GitLabクライアント生成・`config/`読み込み）の後、
`src/steps/` の各ステップ関数を順番に1つずつ呼び出すだけの薄いオーケストレーションレイヤー。
各ステップは「全chartグループ分をまとめて」処理するフラットなパイプラインで、
chartグループごとのループやp-limitはstep関数の中に隠蔽され、`process()`自体には現れない:

```ts
export async function process() {
  const gitlab = createClient(GITLAB_URL, ACCESS_TOKEN)
  const { chartAndAppsList } = loadConfig(CONFIG_PATH)

  const { targets, settled: filtered } = await filterTargets(
    gitlab,
    chartAndAppsList,
    CONCURRENCY_LIMIT,
  )
  const { toApply, settled: planned } = await buildPlans(
    gitlab,
    targets,
    CONCURRENCY_LIMIT,
    DRY_RUN,
  )
  const applied = await applyUpdates(gitlab, toApply, CONCURRENCY_LIMIT)

  return summarizeResults([...filtered, ...planned, ...applied])
}
```

各ステップは「対象として残すchartグループ（`targets`/`toApply`）」と「その場で結果が
確定したもの（`settled`: SKIPPED/ERROR）」の2つを返す。後続ステップは前段の `targets`/
`toApply` だけを引き継いで処理し、`settled` はそのまま最後の集計に合流させる。

**原則1: `src/steps/` 配下のファイルは `main.ts` の `process()` からしか呼ばれない。
`steps/` 配下のファイルが `steps/` 配下の別ファイルを呼ぶことはない。**
**原則2: `src/lib/` は特定の技術・外部システム・ファイル形式に依存するものだけを置く**
（GitLab API、環境変数、このツールの `config/` ファイル形式、Helm chartの
`values.yaml` 形式など）。「複数のstepsから呼ばれているが技術には依存しない」という
理由だけで `lib/` に置くのは誤り。そのような処理は、呼び出し元が1つの `steps/` ファイル
だけなら**そのファイル内の非公開（exportしない）関数として書く**か、技術に依存しない
汎用処理なら `utils/` へ、GitLab MRの内容構築のようにその技術と不可分な処理なら
対応する `lib/` ファイル（例: `gitlab.ts`）に含める。

新しいコードを置くとき、まず「呼び出し元は何か」を考える:

- `process()` が直接呼ぶ、フラットなパイプラインの1段 → `steps/`。他のステップファイルを
  import しない
- 呼び出し元が `steps/` の1ファイルだけ → そのファイル内の非公開（exportしない）関数
- 複数の場所から呼ばれる、かつ特定の技術・外部システム・ファイル形式に依存する
  （GitLab API、Helm chart形式、`config/`のYAML形式、環境変数など）→ 対応する `lib/`
  ファイル。新しい技術/形式を扱うなら新しい `lib/` ファイルを作ってよい
- 複数の場所から呼ばれる、かつ技術に依存しない純粋な計算 → `utils/`
- 「stepsから呼ばれているから」「複数箇所で使うから」という理由だけで `lib/` に
  置くのは誤り。lib行きの判断基準は常に「技術・外部システム・ファイル形式への依存」

`src/steps/`・`src/lib/`・`src/utils/` 配下の各ファイルの詳しい責務、ディレクトリ構成の勘所、
既知の制約・注意点は [`docs/architecture.md`](./docs/architecture.md) を参照。

## 設定・環境変数

`README.md`の「設定」章を参照（環境変数一覧・`config/`のスキーマ・ディレクトリ構成）。

## テスト方針

- TDD推奨: 実装コードの前に失敗するテストを書く（`/tdd` スキル参照）
- テストは `test/` 以下、`src/` と同じディレクトリ構成で配置する
- GitLab API クライアント（`@gitbeaker/rest`）は `vi.mock` でモックする（`test/lib/gitlab/gitlab.test.ts` 参照）。各ステップのテスト（`test/steps/*.test.ts`）も `lib/gitlab/gitlab.js` をモックし、非公開関数（`buildChartUpdate()` 等）はエクスポートされたステップの振る舞いを通して間接的に検証する
- 変更後は必ず `pnpm test`（最終的には `pnpm check`）が通ることを確認してから完了と報告する

## CI/CD

`.gitlab-ci.yml` 参照。`check`（型チェック・lint・test・build）→ `update-app-versions`
（pipeline schedule / 手動実行時のみ本体を実行）という構成。`renovate` ジョブはこのCLI自体の
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

[mattpocock/skills](https://github.com/mattpocock/skills) の engineering カテゴリから、コア開発スキルを日本語化して `.claude/skills/` 配下に導入済み（`tdd`, `code-review`, `diagnosing-bugs`, `codebase-design`, `domain-modeling`, `resolving-merge-conflicts`, `research`, `implement`, `grilling`）。各スキルの詳細は `.claude/skills/` 配下、または利用可能なスキル一覧から確認する。

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

- アーキテクチャ詳細（各ファイルの責務、ディレクトリ構成の勘所、既知の制約）: `docs/architecture.md`
- 要件定義: `docs/requirements.md`
- 要件定義の検討経緯（Q&Aログ）: `docs/requirements-grilling.md`
- 用語集（ドメイン用語とコード上の識別子の対応、表記ゆれの注記）: `docs/glossary.md`
- Issueトラッカー・外部の設計ドキュメントは未設定（今後追加され次第ここに記載する）
