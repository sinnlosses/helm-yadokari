# 現在の状態

最終更新: 2026-09-03（型付け強化セッション）

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
- **T-002完了**: `/implement` で `gitlab-watari-dori`（同じ作者の類似プロジェクト）を参考に、
  同じ技術スタックでCLIの骨格を実装（commit `2cb9b97`, `e9127b5`）
  - `src/lib/{env,tag,config,values,gitlab}.ts` + `src/utils/{errors,http,retry,timer,logger}.ts`
    - `src/main.ts`/`src/index.ts`。`config/`の再帰読み込み、タグ命名規則パース、
      `values.yaml`のdotパス読み書き、`@gitbeaker/rest`ラッパー、chartリポジトリ単位のオーケストレーション
  - TDD（tag.ts, config.ts, values.ts, gitlab.tsは先にテストを書いてRED確認後に実装）
  - `pnpm check`（tsc --noEmit + oxlint + oxfmt --check + vitest 152件）が全てpass
  - `/code-review`（固定点 `8c0c3b6`）を実施。Standards軸は明文化標準への違反0件（スメル2件はいずれもソフトな指摘）。
    Spec軸は「`package.json`にengines未設定」「アプリ単位のno-op時ログ欠落」を指摘 → `e9127b5` で修正済み。
    「FatalError時に他chartリポジトリの処理も打ち切る挙動」「アプリ単位処理が逐次実行」の2点は
    要件の文言と完全一致はしないが意図的な設計判断として `CLAUDE.md` に明記（T-003として要検討事項に記録）
  - 実際に `node dist/src/index.js` を実行し、`config/teamA-chart/` を読み込んでGitLab接続失敗を
    構造化ログで報告し非ゼロ終了することを確認（実GitLabインスタンスへの結合テストは未実施、T-004）
- **T-002追加リファクタリング**: ユーザーからの明示的な原則2件に基づき、`src/main.ts` を薄い`process()`（flat
  なステップ呼び出し）に整理し、`src/lib/`・`src/steps/`・`src/utils/` の責務境界を再定義（commit `9b9989f` ほか）
  - 原則1「`steps/`配下は`process()`からしか呼ばれず、`steps`同士は呼び合わない」を適用
  - 原則2「`lib/`は特定の技術・外部システム(config/env/gitlab/helm)に依存するものだけ」を適用し、
    steps専用ヘルパーだった `lib/constants.ts`・`lib/log-context.ts`・`lib/mr-content.ts`・`lib/update-plan.ts` を削除。
    GitLab固有の`UPDATE_BRANCH`/`buildMrTitle`/`buildMrDescription`は`lib/gitlab.ts`へ統合、
    純粋関数のタグ命名規則は`src/utils/tag.ts`へ移動、それ以外は各`steps/*.ts`内の非公開関数として複製
  - `pnpm check`（tsc --noEmit + oxlint + oxfmt + vitest 204件）が全てpass。`CLAUDE.md`/`README.md`の
    アーキテクチャ説明・ディレクトリ構成も現状に追随させた

- **T-005完了**: `/grilling` で9問の設計ツリーを確定し、`docs/glossary.md` を作成（commit `ae9a516`）
  - 業務ドメイン用語（chartグループ、追跡ブランチ、タグ命名規則など）のみを対象にし、`lib/steps/utils`の
    配置基準などアーキテクチャ用語は対象外（`CLAUDE.md`に一次情報があるため重複させない）
  - 「chartリポジトリ」vs「chartグループ」、`previousTag`vs`currentTag`、「反映」の多義性など
    複数の表記ゆれを発見。統一・リネームはせず、各用語エントリ内に事実として注記するのみに留めた
  - カテゴリ別グルーピング（設定・登録／タグ・バージョン管理／MR・GitLab操作／実行結果・処理単位／実行環境・運用）
  - `CLAUDE.md`の関連リンク節に`docs/glossary.md`への参照を追加
- **T-006完了**: `/implement` で `docs/glossary.md` の表記ゆれのうち変数名・メソッド名レベルのものを
  リネーム（commit `17f38c3`, `1b62791`）
  - `build-plans.ts`: `currentTag`→`previousTagRaw`（`AppUpdatePlan.previousTag`と対応）、
    `content`/`loadContent`/`contentCache`/`modifiedPaths`→`valuesYamlContent`系（values.yaml固有の
    概念であることを明示）
  - `apply-updates.ts`: `title`→`mrTitle`（+ コミットメッセージにも流用する旨のコメント追加）
  - 非公開ローカル変数・パラメータのみのリネームで公開シグネチャ・挙動は無変更。`pnpm check`
    （204テスト）通過
  - `/code-review`（固定点`5c2a90a`）実施。Standards軸: ハード違反0件（`previousTagRaw`の命名の
    重心についてソフトな指摘のみ）。Spec軸: 「mrTitleの二重用途が名前だけでは伝わらない」
    「JSDocの『反映』表記がtoApply/applyUpdatesの『適用』と揃っていない」を指摘 → `1b62791`で反映
  - 「chartリポジトリ vs chartグループ」の表記ゆれは`docs/requirements.md`という確定済み要件文書側の
    話であり、今回の依頼（変数名・メソッド名の明確化）の範囲外として意図的に対応せず据え置き
- **T-007完了**: プリミティブ型のフィールドへのブランド型付与・不要なundefinedの削減（commit `6183f15`, `43ee252`）
  - `ValuesPath`/`DotPath`ブランド型を新設し`AppConfig.chart.valuesPath`/`imageTagKey`・
    `FileUpdate.filePath`・`lib/helm.ts`のdotPath引数・`lib/gitlab/gitlab.ts`の`getFileContent`の
    `filePath`に適用
  - `PipelineInfo`型を`lib/gitlab/gitlab.ts`から`types.ts`へ移動（`FileUpdate`等と同じ理由で共有
    ドメイン型として集約）。`webUrl`は既存の`GitLabUrl`ブランド型を再利用
  - `AppUpdatePlan`の`pipelineUrl`/`pipelineStatus`（常に両方undefinedか両方値ありのData Clump）を
    `pipeline: PipelineInfo | undefined`に統合し、型として表現できていなかった不正な組み合わせ
    （片方だけundefined）を排除。`buildMrPlanSection`内の`?? "unknown"`フォールバックも型的に
    到達不能になったため削除
  - `listTagNames`/`createTag`/`getLatestPipelineForRef`のタグ名の型を`TagName`に統一、
    `getProjectWebUrl`/`getLatestPipelineForRef`の戻り値URLを`GitLabUrl`に統一
  - `pnpm check`（204テスト）通過。`/code-review`（固定点`1b62791`）実施、Standards/Spec両軸が
    独立に`getFileContent`の`filePath`未対応を指摘 → `43ee252`で反映
  - `PipelineInfo.status`と`ChartGroup.chartDir`は意図的に未ブランド化（前者はGitLab API由来の
    自由形式文字列で分岐ロジックがない、後者は外部システム境界を跨がないローカルなディレクトリ名）

## 次にやること

- T-003: アプリ単位の並列化要否を判断する（現状は意図的に逐次処理）
- T-004: 実GitLabインスタンスに対する動作確認（`DRY_RUN=true`でのリハーサルを含む）

## 未解決

- T-003, T-004（`tasks.json`参照）

## 注意

- `config/teamA-chart/` はユーザーが提示した設定ファイルの実例。`docs/requirements.md` のディレクトリ構成説明と対応している
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている（導入済みスキル・ユーザー管理データを誤って自動整形しないため）
