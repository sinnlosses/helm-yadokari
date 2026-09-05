# 現在の状態

最終更新: 2026-09-05（T-018: タグ命名規則の設定可能化セッション）

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
- **T-008完了**: try/catchの削減監査（commit `8289a13`）
  - `src/`配下の全try/catch（7箇所）と`scripts/lint/validate-config.ts`を監査
  - `lib/env.ts`の`validateGitlabUrl`内、`new URL()`の例外を捕まえて自前エラーに変換していた
    箇所を`URL.canParse()`（Node 22で使える非throwの真偽値判定API）に置き換え、try/catchと
    `parseUrl()`ヘルパーを削除
  - 残り6箇所（`lib/gitlab/gitlab.ts`の`withNotFoundFallback`、`utils/retry.ts`の`withRetry`、
    `utils/parallel.ts`の`mapWithConcurrency`、`steps/`3ファイルのFatalError判定）は
    `@gitbeaker/rest`という例外ベースの外部ライブラリとの境界、またはFatalError（即時中断）/
    非fatal（ERRORとして値化して継続）を分岐する唯一の場所であり、いずれも意図的に維持
  - `pnpm check`（204テスト）通過
- **T-009完了**: `ChartGroup→ChartAndApps`改名・`ChartDirName`/`PipelineStatus`ブランド型付与・
  `steps/`配下のmutableなfor/push/Set.addをreduceベースの不変な組み立てに置き換えるリファクタ（commit `eb1344e`）
  - 以前のセッションで未コミットのまま作業ツリーに残っていたものを本セッションで発見。
    `TARGET_CHART_DIR`/`TARGET_CLIENT`機能の変更と混ざっていたため、ユーザーに確認のうえ
    2つの独立したコミットに分離（本タスクと次のT-010）
  - `pnpm check`（204テスト）通過
- **T-010完了**: `TARGET_CHART_DIR`/`TARGET_CLIENT`環境変数による絞り込み実行機能を追加（commit `e902f9c`）
  - `loadConfig()`に`ConfigTarget`フィルタを追加。`TARGET_CHART_DIR`は単一chartディレクトリ名、
    `TARGET_CLIENT`は`"<tenantId>/<clientId>"`をカンマ区切りで複数指定可能
  - 指定した対象が`config/`配下に1件も見つからない場合はtypo対策として例外で即終了（`docs/requirements.md` 4.5節）
  - `.gitlab-ci.yml`の`spec:inputs`にも追加し、GitLab CIの手動web実行時に指定できるようにした
  - `pnpm check`（222テスト）通過
- **T-004完了**: gitlab.com上の実リポジトリでエンドツーエンド動作確認
  （まとめHTMLレポートを作成したが未コミットのままディスクから消失したため、
  この記述を証跡とする）
  - 既存リポジトリ`sample-qa-sprint`/`sample-develop-client`と、新規作成した
    `yadokari-smoke-test-chart`（chartリポジトリ役）を使用
  - タグ自動作成・DRY_RUN・values.yaml差分反映・chart単位MR集約・既存タグ再利用・
    オープン中MRスキップ・`TARGET_CHART_DIR`/`TARGET_CLIENT`絞り込みと誤指定時エラーを
    すべて実機で確認、いずれも成功
  - **実バグを1件発見・修正**（commit `f0124d0`）: GitLabの`GET /pipelines/latest`は
    パイプラインが1件も無いプロジェクトに対して404でなく403を返す（実機で複数プロジェクト
    確認済み）。`getLatestPipelineForRef()`がこれを再スローしていたため、CI未実行アプリを
    1つでも含むchartグループ全体がオールオアナッシングで`ERROR`になっていた。404と同様に
    「パイプライン無し」として扱うよう修正し、テスト追加（`pnpm check` 223テスト通過）
  - 作成した2件のMRはクローズ済み（マージなし）。テスト用chartリポジトリ・タグは継続検証の
    ためユーザーの意向で残置。アクセストークンも継続検証のため未失効（ユーザー管理）
- **T-011完了**: `chart.imageTagAnchor`の追加とYAML処理の`yaml`パッケージへの統一（commit `e59c410`）
  - values.yamlがオブジェクトのネストではなく配列要素にYAMLアンカーで名前を付けた構成
    （例: `variables: [&tenant1client1AppsVersion main, ...]`）向けに、既存の`imageTagKey`
    （dotパス）に加え`imageTagAnchor`（アンカー名）を指定できるようにした（1アプリにつき
    どちらか一方のみ、`apps.yaml`スキーマは判別ユニオンで両方・どちらも未指定を弾く）
  - `js-yaml`はパース時にアンカー名を保持できないため、`yaml`パッケージ（Document/AST、
    `visit()`でアンカー名を持つノードを検索）で`getValueAtAnchor`/`setValueAtAnchor`を新設。
    呼び出し側は`getImageTag`/`setImageTag`で方式の違いを意識しない
  - 既存の`getValueAtPath`/`setValueAtPath`（dotパス）と`config/`読み込み用の`parseYamlFile`
    も`js-yaml`から`yaml`パッケージ（`Document.getIn`/`setIn`/`hasIn`、`parse`）に置き換え、
    `js-yaml`/`@types/js-yaml`を依存から削除。副産物として書き換え対象以外のコメント・
    クォートスタイルが保持されるようになった
  - `pnpm check`（236テスト）通過。`CLAUDE.md`/`README.md`/`docs/requirements.md`/
    `docs/glossary.md`を更新
- **T-012完了**: `chart.imageTagAnchor`を`config/`の実例apps.yamlに反映し、gitlab.com実機で再検証
  - `config/teamA-chart/tenantId1/clientId1/apps.yaml`に`imageTagAnchor`使用例
    （`another-app`, projectId 889）を追加
  - T-004で使ったgitlab.com上のテスト用リソースを再利用し、`imageTagAnchor`指定アプリと
    `imageTagKey`指定アプリが同一chartグループに混在するケースを実機で検証。アンカー値の
    書き換え・他のアンカー（`helmVersion`）の保持を確認、いずれも成功
  - **実バグを1件発見・修正**: `commitFileUpdates()`が「固定ブランチが既に存在する ⇒
    対象ファイルも全て存在する」と決め打ちしていたため、MRをクローズ（マージせず）した後に
    残った固定ブランチへ、新しく`valuesPath`が増えたアプリを追加すると
    `action: update`を送ってしまい`400 A file with this name doesn't exist`になっていた。
    ファイルごとに参照先ブランチ（ブランチが存在すればそれ自身、無ければbaseBranch）上の
    存在有無を確認して`action: create`/`update`を判定するよう修正し、テストを追加
    （`pnpm check` 237テスト通過）
  - 作成したMRはクローズ済み（マージなし）。テスト用GitLabリソースは継続検証のため残置
- **T-014完了**: 1つのsource projectが複数アプリ（WebAPI/バッチ/デーモン等）を持ち、
  同一の追跡タグを複数の書き換え箇所に反映できるようにした
  - `AppConfig.chart`を単一の`ImageTagLocation`付きオブジェクトから、`ImageTagTarget`
    （`valuesPath` + `imageTagKey`/`imageTagAnchor`）の配列（1件以上必須）に変更。
    `apps.yaml`の`chart`フィールドも配列表記になる（既存の単一指定アプリも`chart: [...]`
    へ書き換えが必要な破壊的スキーマ変更）
  - `AppUpdatePlan`を、アプリ単位で1回だけ持つ`latestTag`/`pipeline`と、書き換え箇所ごとに
    独立した`previousTag`を持つ`updates: ImageTagUpdate[]`に分離。同一タグでも箇所によって
    現在の`values.yaml`の値が異なりうるため（一部だけ反映済み、等）、差分があった箇所だけを
    `updates`に積む（全箇所反映済みならそのアプリ自体を計画に含めない）
  - `src/steps/build-plans.ts`: `applyImageTagTarget()`（1箇所分の差分チェック・書き換え）と
    `applyAppToChartUpdate()`（`app.chart`をreduceで1箇所ずつ処理）を追加。既存の
    「同じvaluesPathを複数アプリで共有する場合は1ファイルにまとめる」仕組み
    （`valuesYamlCache`/`modifiedValuesPaths`）はそのまま複数箇所ケースにも対応
  - `src/lib/gitlab/gitlab.ts`の`buildMrPlanSection()`を、アプリ単位（`### projectName`・
    打刻日時・パイプライン）＋箇所単位（`valuesPath`・位置の説明・旧タグ→新タグ・比較URL）の
    2階層表示に再構成
  - `test/lib/config.test.ts`（配列構文への全面書き換え＋複数chart指定のテスト追加）、
    `test/steps/build-plans.test.ts`（「1アプリ複数chartで同じ最新タグを反映」「一部箇所だけ
    差分がある場合の絞り込み」の2テストを追加）、`test/steps/apply-updates.test.ts`、
    `test/lib/gitlab/gitlab.test.ts`（`makePlan()`を新しい`updates`構造に対応）を更新
  - `pnpm check`（249テスト）通過
  - gitlab.com実機（`yadokari-smoke-test-chart` + `sample-qa-sprint`）で検証。一時的に
    `buildPlans()`を直接呼び出すスクリプトと専用configディレクトリを用意し
    （固定ブランチに既存の検証用MRが残っているため、通常のCLI経由だと`filterTargets`で
    スキップされてしまうことを確認したうえでの代替手段）、1アプリ2箇所
    （`charts/sample-qa-sprint/values.yaml`のdotパス + `charts/anchor-app/values.yaml`の
    アンカー）が同一の`latestTag`に対しそれぞれ独立した`previousTag`（`placeholder`と
    旧タグ）を検出し、両ファイルへの書き換え内容・MR descriptionの箇所別表示が正しいことを
    確認。検証用スクリプト・configディレクトリは確認後に削除済み、既存のテスト用GitLab
    リソース・MRには一切変更を加えていない
  - `config/teamA-chart/tenantId1/clientId1/apps.yaml`に複数chart指定の例
    （`multi-service-app`, projectId 890, webapi/batch/daemonの3箇所）を追加
  - `README.md`/`docs/requirements.md`/`docs/architecture.md`/`docs/glossary.md`を
    配列スキーマ・複数箇所対応の説明に更新（`docs/glossary.md`の`imageTagAnchor`補足に
    残っていた`js-yaml`言及、`previousTag`表記ゆれ注記の`currentTag`という古い変数名も
    あわせて修正）
  - **【追記】ユーザー指示により`imageTagKey`（dotパス）方式を完全に削除、`imageTagAnchor`
    （YAMLアンカー）方式のみに一本化**。当初「multi-service-appの例だけアンカーに寄せる」と
    誤解して対応したが、ユーザーの意図は「ツール全体でdotパスをやめてアンカーのみ対応にする」
    ことだったため、`DotPath`型・`ImageTagLocation`ユニオン・`getValueAtPath`/`setValueAtPath`・
    `getImageTag`/`setImageTag`ラッパーを`src/types.ts`/`src/lib/config.ts`/`src/lib/helm.ts`/
    `src/steps/build-plans.ts`/`src/lib/gitlab/gitlab.ts`から削除。`ImageTagTarget`は
    `valuesPath` + `imageTagAnchor`のみを持つ単純な型になった
  - `config/`実例の`my-app`エントリも`imageTagAnchor`（アンカー名`myAppVersion`）に変更。
    全テストファイルのフィクスチャを`imageTagAnchor`ベースに書き換え、両方指定/どちらも
    未指定の排他検証テストなど不要になったテストを削除。`README.md`/`docs/requirements.md`/
    `docs/architecture.md`/`docs/glossary.md`から`imageTagKey`の現行仕様としての記載を削除し、
    削除された経緯のみ補足として残した
  - `pnpm check`（234テスト）通過

- **T-003完了**: アプリ単位の並列化要否をユーザーに確認し、逐次のままでよいと決定
  - 理由: 夜間のpipeline schedule実行が前提のため、アプリ単位の処理速度は問題にならない
  - コード変更なし。`docs/requirements.md` 4.3節の「並列」という記述とアプリ単位（chartグループ内）が
    逐次実行である実装との差異は、意図的な設計判断として`tasks.json`に記録のみ行う

- **T-013完了**: 「Helmの向き先ブランチ」要件を`/grilling`3ラウンドで確定（実装はT-016に切り出し）
  - 向き先ブランチはchartリポジトリ内の別ブランチ（`chart.yaml`の`projectId`と同一プロジェクト）
  - 設定は`apps.yaml`の新しいトップレベルフィールド（`apps:`配列と同階層、tenantId/clientId単位に1つ、
    例: `helmTargetBranch: release/2026-q1`）として持たせる。人間が自己申告方式で直接書き換える運用とし、
    タグ命名規則のような自動生成・自動判定の仕組みは持たない
  - 書き込み先は各appごとにそれぞれのapp用`values.yaml`内の1箇所（既存の`imageTagAnchor`と同様の方式で
    app単位に書き込み位置を指定する新フィールドが必要）
  - 書き込み前にブランチの実在をchartリポジトリ上で検証し、存在しなければそのchartグループ全体を`ERROR`にする
  - 既存の「1chartリポジトリ=1MR」に含め、image tag更新と同じMRにまとめる
  - 同じtenantId/clientIdが複数chartディレクトリにまたがる場合のズレ（値の更新し忘れ）リスクは許容し、
    追加の整合性チェックは作らない
  - コード変更なし（要件定義のみ）。ユーザーに最終確認済み

- **T-016完了**: T-013で確定した「Helmの向き先ブランチ」要件を実装
  - `src/types.ts`: `HelmTargetBranchTarget`（`valuesPath` + `anchorName`）・`HelmTargetBranchConfig`
    （`branch` + `target`）・`HelmTargetBranchUpdate`（`target` + `previousBranch` + `newBranch`）を追加。
    `AppConfig.helmTargetBranch`・`AppUpdatePlan.helmTargetBranchUpdate`はいずれも`| undefined`
  - `src/lib/config.ts`: `apps.yaml`のトップレベル`helmTargetBranch`（tenantId/clientId単位に1つ）と
    app単位の`helmTargetBranchTarget`を追加。`loadApps()`内の`resolveHelmTargetBranch()`が両者を
    1つの`HelmTargetBranchConfig`にマージし、`helmTargetBranchTarget`のみ指定され`helmTargetBranch`が
    無い場合は設定ミスとして例外をスロー
  - `src/steps/build-plans.ts`: `applyHelmTargetBranchTarget()`を追加し、`applyAppToChartUpdate()`内で
    `app.chart`の処理後に同じ`valuesYamlCache`を共有して処理。値が現在の`values.yaml`と異なる場合のみ
    `branchExists()`（既存関数を流用）でchartリポジトリ上の実在を検証し、存在しなければ例外を投げて
    そのchartグループ全体を`ERROR`にする（既存のオールオアナッシング方針を踏襲）。ブランチ存在チェックは
    `branchExistsCache`で同一ブランチ名につき1回に共有。chart側の差分が無く向き先ブランチの差分のみ
    あるアプリも計画に含めるようスキップ条件を修正
  - `src/lib/gitlab/gitlab.ts`: `buildMrPlanSection()`に`buildHelmTargetBranchUpdateLine()`を追加し、
    MR本文に「向き先ブランチ」の行（旧ブランチ→新ブランチ）を表示
  - `pnpm check`（246テスト）通過
  - gitlab.com実機（`yadokari-smoke-test-chart` + `sample-qa-sprint`）で`buildPlans()`を直接呼び出し検証:
    (1) 実在するブランチ（`main`）を指定した場合、`charts/anchor-app/values.yaml`に追加した
    `smokeTestTargetBranch`アンカーの現在値（`release/2025-q4`）と設定値（`main`）の差分を正しく検出し
    `helmTargetBranchUpdate`とMR description行を生成、(2) 実在しないブランチ名を指定した場合は
    chartグループ全体が`ERROR`になることを確認。検証用に追加した`smokeTestTargetBranch`アンカー
    （コミット`c96614e1`）はテスト用GitLabリソースとして残置。一時スクリプト・一時configディレクトリは
    検証後に削除
  - `config/teamA-chart/tenantId1/clientId1/apps.yaml`に`helmTargetBranch`/`helmTargetBranchTarget`の
    使用例（`my-app`）を追加。`README.md`/`docs/requirements.md`/`docs/architecture.md`/
    `docs/glossary.md`を更新
  - **【追記】ユーザー指示によりapps.yamlのスキーマ形状を再設計**:
    - トップレベルのスカラー`helmTargetBranch: <branch>`を、拡張性を考慮した配列
      `helm:\n  - branchToSync: <branch>`に変更（現状1件のみサポート、`.length(1)`で検証）
    - app単位の独立オブジェクトフィールド`helmTargetBranchTarget`を廃止し、既存の`chart[]`配列の
      各要素（`imageTagAnchor`と同じ場所）に任意の`helmBranchAnchor`フィールドとして統合。
      1アプリで複数の`chart`要素に指定すれば複数箇所へ反映できるようになった
    - 型も`HelmTargetBranchConfig.target`（単数）を`targets`（配列）に、
      `AppUpdatePlan.helmTargetBranchUpdate`を`helmTargetBranchUpdates`（配列）に変更し、
      T-014の複数箇所対応と同じ設計パターンに揃えた
    - 全テストファイルのフィクスチャを新スキーマに書き換え（`ImageTagTarget`型が
      `helmBranchAnchor`を必須プロパティ、値は`undefined`許容として持つようになったため、
      既存のchart要素リテラルすべてに追記が必要だった）
    - `pnpm check`（248テスト）通過。gitlab.com実機で新スキーマでの`buildPlans()`呼び出しを
      再検証し、既存の`smokeTestTargetBranch`アンカーに対する差分検出・MR description生成が
      変更後も正しく動作することを確認
    - `config/`実例・`README.md`/`docs/requirements.md`/`docs/architecture.md`/
      `docs/glossary.md`を新スキーマに更新
  - **【追記2】ユーザー指摘により欠けていた整合性検証を追加**:
    「helmBranchAnchorの記載のないprojectがapps.yamlにあるが、そこはバリデーションが効く必要が
    ある」という指摘。Helmの向き先ブランチは「1client内のapps全体で共通」という前提（T-013）
    にもかかわらず、`chart[].helmBranchAnchor`をapp単位の完全な任意指定にしていたため、`helm`を
    指定したのに一部アプリだけ`helmBranchAnchor`が無い設定が黙って通ってしまっていた
    （実際、`config/`の実例で`another-app`/`multi-service-app`がこの状態だった）
    - `src/lib/config.ts`の`resolveHelmTargetBranch()`に、`helm`が指定されているapps.yamlで
      `targets.length === 0`のアプリがあれば例外をスローする分岐を追加（app名を含む
      エラーメッセージ）
    - `config/teamA-chart/tenantId1/clientId1/apps.yaml`の`another-app`/`multi-service-app`に
      `helmBranchAnchor`を追加して修正
    - `test/lib/config.test.ts`の「一部のappだけhelmBranchAnchorを指定できる」テストを
      「例外をスローする」に更新し、「全appが指定していれば読み込める」テストを追加
    - `README.md`/`docs/requirements.md`/`docs/architecture.md`/`docs/glossary.md`にこの制約を明記
    - `pnpm check`（249テスト）通過
  - **【追記3】ユーザー指示によりhelm.chart[]を独立リスト化する形へ再設計**:
    ユーザーが`config/teamA-chart/tenantId1/clientId1/apps.yaml`を手動で書き直し、
    `helmBranchAnchor`（app単位の任意フィールド）方式をやめ、トップレベル`helm`配下に独立した
    `chart[]`（`valuesPath`+`anchor`の書き込み先一覧、`apps[].chart[]`とは別建て）を持つ設計に
    戻す形で「この構成で動くように実装を直してほしい」と指示。/askで「`helm.chart[]`と
    `app.chart[]`の対応付けは`valuesPath`の一致で決め、appの`valuesPath`が`helm.chart[]`に
    無ければエラーにする」方針を確認のうえ実装
    - `src/types.ts`: `ImageTagTarget`から`helmBranchAnchor`を削除し`imageTagAnchor`を
      `anchor`にリネーム。`HelmTargetBranchTarget.anchorName`も`anchor`にリネーム
      （`apps[].chart[].anchor`と`helm.chart[].anchor`で同じフィールド名に統一）
    - `src/lib/config.ts`: `HelmConfigSchema`を配列から単一オブジェクト（`branchToSync`+
      `chart[]`）に戻し、`resolveHelmTargetBranch()`を`valuesPath`一致によるマッチングに
      書き換え（appの`chart[].valuesPath`がすべて`helm.chart[]`でカバーされていない場合、
      未カバーのvaluesPathとapp名を含む例外をスロー）
    - `src/steps/build-plans.ts`・`src/lib/gitlab/gitlab.ts`のフィールド参照を`anchor`に追従
    - `test/helpers.ts`・`test/lib/config.test.ts`（helmTargetBranch関連のdescribeブロックを
      新設計に全面書き換え）・`test/steps/build-plans.test.ts`・`test/steps/apply-updates.test.ts`・
      `test/lib/gitlab/gitlab.test.ts`のフィクスチャを追従
    - `config-test/yadokari-smoke-test-chart/`の手動検証用フィクスチャ、`README.md`/
      `docs/requirements.md`/`docs/architecture.md`/`docs/glossary.md`を新設計に更新
    - `config/teamA-chart/tenantId1/clientId1/apps.yaml`自体はユーザーが既に新設計の内容で
      書いていたため変更不要（`multi-service-app`用の`multiServiceAppTargetBranch`アンカーも
      ユーザー自身が追記済み）
    - `pnpm check`（248テスト）通過
- **T-017検討・撤回**: chart構造（`valuesPath`+`anchor`）を`apps.yaml`から新設の`chart-targets.yaml`
  （`<tenantId>/<clientId>`ディレクトリ配下、`projectId`をキーとするマップ）へ分離する設計を
  一度実装（`src/lib/config.ts`に`ChartTargetsYamlSchema`・`loadChartTargets()`・
  `resolveAppChart()`を追加、`apps.yaml`側を運用値のみに削減、`pnpm check`251テスト通過まで確認）
  したが、ユーザーへの評価報告で「`projectId`キーだけで読み解くのはやや難しいかもしれない」と
  指摘があり、直前の状態（T-016完了時点、`helm.chart[]`独立リスト＋`valuesPath`一致方式を
  apps.yaml内で完結させる設計）へ差し戻した。`src/lib/config.ts`・`src/types.ts`のdocコメント・
  `test/lib/config.test.ts`・`README.md`/`docs/requirements.md`/`docs/architecture.md`/
  `docs/glossary.md`・`config/teamA-chart/tenantId1/clientId1/apps.yaml`・
  `config-test/yadokari-smoke-test-chart/tenant1/client1/apps.yaml`をT-016完了時点の内容に復元し、
  新設した`chart-targets.yaml`（2ファイル）は削除。`tasks.json`のT-017エントリも削除し、
  このセッションの試行錯誤は`progress.md`のこの記述のみに残す
- **T-016（差し戻し後の状態）を実機で再検証**: 一時スクリプトから`buildPlans()`を直接呼び出し、
  gitlab.com上の`yadokari-smoke-test-chart`（`charts/anchor-app/values.yaml`）+
  `sample-qa-sprint`に対して`DRY_RUN`相当（`dryRun: true`）で検証。
  `chart[].anchor`（イメージタグ）は現在値`main-build-at-20260903-171213`から最新タグ
  `main-build-at-20260903-172148`への差分を正しく検出。`helm.chart[]`（独立リスト、
  `valuesPath`一致でapp単位に振り分け）は既存の`smokeTestTargetBranch`アンカーの現在値
  `release/2025-q4`と設定値`main`の差分を正しく検出。いずれも書き込みは発生していない
  （`dryRun: true`のため）。一時スクリプトは検証後に削除、テスト用GitLabリソースは変更なし
- **T-017完了**: 前回撤回した`chart-targets.yaml`案（`projectId`をマップキーにする形式）に
  代えて、ユーザーから具体的なファイル名・スキーマ形状の指定を受けて再実装
  - `apps.yaml`を`config.yaml`にリネーム（`git mv`）し、運用値のみに削減
  - `config.yaml`と同じ`<tenantId>/<clientId>`ディレクトリに`anchor-setting.yaml`を新設。
    `projectId`をマップキーにする代わりに、`apps: [{projectId, projectName, chart: [...]}]`
    という自己完結した配列要素の形式にした（`anchor-setting.yaml`単体を見てもどのappの
    設定か分かるようにするため）。`helm`は`helm: [{chart: [...]}]`という配列表記
  - `src/lib/config.ts`に`validateProjectLinkage()`を新設し、`config.yaml`と
    `anchor-setting.yaml`の紐づけを3方向で検証: (a) `config.yaml`の各appに対応する
    `anchor-setting.yaml`側エントリが無ければ例外、(b) 逆に`anchor-setting.yaml`に
    `config.yaml`側に存在しない孤児エントリがあれば例外、(c) 同じ`projectId`なのに
    `projectName`が食い違っていれば例外
  - `resolveHelmTargetBranch()`は`config.yaml`の`helm.branchToSync`と`anchor-setting.yaml`の
    `helm[0].chart`を別引数で受け取り、`valuesPath`一致でapp単位に振り分ける方式を維持
  - `config/teamA-chart/tenantId1/clientId1/`・`config-test/yadokari-smoke-test-chart/tenant1/client1/`
    双方を新構成に更新
  - `test/lib/config.test.ts`を全面書き換え（`writeConfigYaml()`/`writeAnchorSettingYaml()`
    ヘルパーを新設、孤児設定・`projectName`不一致の新規テストケースを追加、37テスト）
  - `src/types.ts`のdocコメント・`README.md`/`docs/requirements.md`/`docs/architecture.md`/
    `docs/glossary.md`を新構成に更新（`docs/glossary.md`には前回`chart-targets.yaml`案を
    撤回した経緯も記録）
  - `pnpm check`（254テスト）通過。gitlab.com実機（`CONFIG_PATH=config-test DRY_RUN=true`）で
    新しい`config.yaml`/`anchor-setting.yaml`構成から`loadConfig()`が正しく読み込み・
    整合性検証を通過し、実際のGitLab APIへ到達することを確認（既存のオープン中MRにより
    `SKIPPED`。values.yamlへのanchor書き込みロジック自体は本タスクで変更していないため、
    直近の`buildPlans()`直接検証結果がそのまま有効）
- **T-017追記**: ユーザーが`config/teamA-chart/tenantId1/clientId1/anchor-setting.yaml`を
  手動で修正し、`helm`を`[{chart: [...]}]`という配列表記から`{chart: [...]}`という単純な
  オブジェクトに変更。実装をそれに追従させた
  - `src/lib/config.ts`の`AnchorSettingYamlSchema.helm`を`z.array(AnchorSettingHelmSchema)
.length(1)`から`AnchorSettingHelmSchema.optional()`に変更し、`loadAnchorSetting()`の
    `parsed.helm?.[0]?.chart`を`parsed.helm?.chart`に変更
  - `resolveHelmTargetBranch()`・エラーメッセージ・`src/types.ts`のdocコメントの
    `helm[0].chart`表記を`helm.chart`に統一
  - `test/lib/config.test.ts`のhelm関連テストのYAML文字列を配列表記からオブジェクト表記に
    修正し、配列であることが前提だった「helmが2件以上指定されると例外をスローする」テストは
    削除（オブジェクトなので複数指定という概念自体が無くなったため、253テスト）
  - `README.md`/`docs/requirements.md`/`docs/architecture.md`/`docs/glossary.md`の
    `helm[0].chart`表記を`helm.chart`に修正
  - `pnpm check`（253テスト）通過。`pnpm lint:validate-config`で実configが新スキーマで
    読み込めることを確認。`CONFIG_PATH=config TARGET_CHART_DIR=teamA-chart DRY_RUN=true`で
    実行し、設定パース段階でエラーが出ず実際のGitLab APIまで到達することを確認
    （`config/teamA-chart/`はprojectId 888等の架空プロジェクトのため404 Project Not Foundで
    ERRORになるが、これは想定通りでconfig解析の問題ではない）
- **T-017追記2**: `chart.yaml`/`config.yaml`/`anchor-setting.yaml`という3ファイルの命名が
  紛らわしいという指摘を受け、命名候補を4案提示（`tracking.yaml`+`write-targets.yaml`案、
  `sync.yaml`+`anchors.yaml`案、3ファイル全改名の体系的な案、`app-`プレフィックスで揃える案）。
  ユーザーは「`anchor-setting.yaml`を`anchors.yaml`に変えるだけでいい」と、`chart.yaml`・
  `config.yaml`は据え置きの最小変更を選択
  - `git mv`で`anchor-setting.yaml`→`anchors.yaml`にリネーム（`config/teamA-chart/tenantId1/clientId1/`・
    `config-test/yadokari-smoke-test-chart/tenant1/client1/`の両方）
  - `src/lib/config.ts`の識別子もファイル名に合わせて統一: `AnchorSettingYamlSchema`→
    `AnchorsYamlSchema`、`AnchorSettingAppSchema`→`AnchorsAppSchema`、`AnchorSettingHelmSchema`→
    `AnchorsHelmSchema`、型`AnchorSettingApp`→`AnchorsApp`、型`AnchorSetting`→`Anchors`、
    `loadAnchorSetting()`→`loadAnchors()`、変数`anchorSetting`→`anchors`、`anchorSettingPath`→
    `anchorsPath`
  - `test/lib/config.test.ts`の`writeAnchorSettingYaml()`ヘルパーを`writeAnchorsYaml()`に
    リネームし、ファイルパス・テストタイトルの文字列も追従（36テスト）
  - `README.md`/`docs/requirements.md`/`docs/architecture.md`/`docs/glossary.md`/`src/types.ts`の
    `anchor-setting.yaml`表記を`anchors.yaml`に一括置換し、ディレクトリ構成図のコメント位置が
    ずれた箇所（README.md/docs/requirements.md）のインデントを手動で整列
  - `progress.md`/`tasks.json`の過去の記述は当時の名前のまま残し、履歴として保持（このエントリ
    自体は新しい名前で記述）
  - `pnpm check`（253テスト）通過。`pnpm lint:validate-config`で実configが新ファイル名で
    読み込めることを確認。`CONFIG_PATH=config-test DRY_RUN=true`で実行し、gitlab.com実機に
    対して設定パースからAPI呼び出しまで問題なく到達することを再確認
- **表記ゆれ監査＋「chartグループ」の撤廃**: ユーザーから「リポジトリ全体を見渡してリファクタ
  リング・表記ゆれの課題を洗い出してほしい」との依頼を受け、forkでCLAUDE.mdの規約を基準に
  `src/`・`test/`・`docs/`・ルート設定ファイルを監査。Standards違反は0件、ソフトな指摘2件
  （`utils/cache.ts`の`getOrFetch()`が`undefined`を正当な値に持つ型だと機能しない潜在的な穴、
  `validateProjectLinkage()`の引数型インライン重複）のみで、直近3回のconfig.yaml/anchors.yaml
  まわりの設計変更にコード・テスト・ドキュメント間の更新漏れは無いことを確認
  - 監査を踏まえてユーザーから「chartグループという単語はなくしてもらいたい。chartAndApps
    になったし」と指摘。型`ChartAndApps`への改名後も日本語プロースでは「chartグループ」が
    `CLAUDE.md`・コードコメント・ドキュメント全般で使われ続けていた表記ゆれ
  - 置き換え先候補（`chart単位`/`chartAndApps`型名そのまま/`chartリポジトリ`に統合）を提示し、
    ユーザーは型名をそのまま使う`chartAndApps`を選択
  - `chartグループ`の生きている用例41箇所（`README.md`・`docs/requirements.md`・
    `docs/architecture.md`・`docs/glossary.md`・`src/main.ts`・`src/types.ts`・
    `src/steps/{filter-targets,build-plans,apply-updates}.ts`・
    `test/steps/{build-plans,filter-targets}.test.ts`）を`chartAndApps`に一括置換。
    `tasks.json`/`progress.md`の過去のエントリは履歴としてそのまま残した（`CLAUDE.md`・
    `docs/requirements-grilling.md`は元々この語を使っていないため対象外）
  - `docs/glossary.md`の「chartリポジトリ / chartグループ」表記ゆれエントリ（この語の使い分け
    自体を解説する箇所）は機械置換だけでは自己言及的に不自然になるため手動で書き直し、
    「表記ゆれ（解消済み）」として今回の撤廃の経緯を記録。`ChartUpdateTarget`の定義文にあった
    `chartAndApps`の二重表記（`1chartAndApps分の更新内容（chartAndApps＋...)`）も
    「対象を表す`chartAndApps`フィールド」と言い換えて解消
  - `pnpm check`（253テスト）通過
- **`src/steps/build-plans.ts`の分割**: ユーザーから「395行と長いので、stepを分割して
  ファイルを分けたりlib/utilsに移せるか検討してほしい」と依頼された
  - `lib/`/`utils/`への移動は該当なし: 中の非公開関数（`resolveLatestTag()`・
    `applyImageTagTarget()`・`applyHelmTargetBranchTarget()`・`buildFileUpdates()`・
    `buildChartUpdate()`）はいずれも呼び出し元がbuild-plans.ts（またはその内部）1箇所だけで、
    CLAUDE.md原則2「複数箇所から呼ばれない限りlib/には置かない」に照らすと昇格理由が無い
  - ファイル分割は実施。`steps/build-plans/`ディレクトリを新設し、非公開関数を関心ごとに
    4ファイルへ分離: `resolve-latest-tag.ts`（最新タグ判定・タグ自動作成）・
    `image-tag-target.ts`（イメージタグの差分検出・書き換え）・
    `helm-target-branch-target.ts`（Helm向き先ブランチの差分検出・書き換え）・
    `chart-update.ts`（上記3つを束ねてchartAndApps単位の更新計画を組み立てる
    `buildChartUpdate()`）。`build-plans.ts`本体は395行→97行に縮小し、`buildPlans()`・
    `describePlan()`・`buildPlanForChartAndApps()`のみを残した
  - この分割は「呼び出し元がsteps/の1ファイルだけ→そのファイル内の非公開関数」という
    既存原則をファイル単位からディレクトリ単位に広げる新パターンのため、`CLAUDE.md`
    （原則2の注記）・`docs/architecture.md`（各ファイルの責務・新しいコードを置く場所の
    判断基準の両方）を更新し、今後同様に長くなったstepがあれば同じ手法を使えるようにした
  - 型の受け渡しは`import type`で解決（`LoadValuesYamlContent`型を`chart-update.ts`から
    `image-tag-target.ts`/`helm-target-branch-target.ts`へ型のみインポートし、実行時の
    循環参照は発生しない）
  - `test/steps/build-plans.test.ts`は元々`buildPlans()`という公開APIのみをテストしており
    （CLAUDE.mdのテスト方針どおり）、内部ファイル分割の影響を受けないため変更不要
  - `pnpm check`（253テスト）通過。`pnpm build`でdist/への出力も確認。
    `CONFIG_PATH=config-test DRY_RUN=true`でgitlab.com実機に対しても再確認
- **`steps/build-plans/`を`steps/sub-steps/build-plans/`へ改称**: `steps/build-plans/`が
  `steps/build-plans.ts`と隣接していて紛らわしく、「サブステップ感のある名前にできないか」と
  指摘された。候補（`build-plans-substeps/`等）を提示する前にユーザーから直接
  「sub-steps/build-plans かな」と指定があり、`steps/sub-steps/<step名>/`という汎用パターンを
  採用（将来他のstepが同様に肥大化した場合も同じ場所に置ける）
  - 4ファイル（`resolve-latest-tag.ts`・`image-tag-target.ts`・`helm-target-branch-target.ts`・
    `chart-update.ts`）を`steps/build-plans/`から`steps/sub-steps/build-plans/`へ移動
    （未コミットの新規ファイルだったため`git mv`ではなく`mv`）。1階層深くなった分、
    各ファイル内の相対import（`../../lib/...`等）を`../../../lib/...`等に修正。
    `build-plans.ts`側のimportも`./build-plans/chart-update.js`→
    `./sub-steps/build-plans/chart-update.js`に修正
  - `CLAUDE.md`・`docs/architecture.md`の該当箇所（新しいコードを置く場所の判断基準、
    各ファイルの責務）を新パスに追従
  - `dist/`に前回ビルドの`build-plans/`ディレクトリが残っていたため`rm -rf dist && pnpm build`
    でクリーンビルドし直し、`dist/src/steps/sub-steps/build-plans/`のみになることを確認
  - `pnpm check`（253テスト）通過。`CONFIG_PATH=config-test DRY_RUN=true`で実機再確認
- **`build-plans.ts`のオーケストレーションを可視化**: 3ステップ構成は維持でいいか、それとも
  stepsを増やして再構築すべきかを相談したところ、ユーザーからは「3ステップ維持でいいが、
  build-plansがまだ複雑。build-plansが各サブステップを呼ぶ構成にして流れがパッと理解できる
  ものにしてほしい」と指摘された
  - それまでは`build-plans.ts`→`sub-steps/build-plans/chart-update.ts`（隠れた
    オーケストレーター、`buildChartUpdate()`/`applyAppToChartUpdate()`/`buildFileUpdates()`を
    保持）→3つのサブステップ、という2段の間接参照になっており、`build-plans.ts`を読むだけでは
    実際の処理の流れが追えなかった
  - `chart-update.ts`を削除し、その中身（`buildChartUpdate()`・`applyAppToChartUpdate()`・
    `buildFileUpdates()`・`BuildChartUpdateAcc`型）を`build-plans.ts`本体へ統合。
    `build-plans.ts`が`resolveLatestTag()`・`applyImageTagTarget()`・
    `applyHelmTargetBranchTarget()`の3サブステップを直接importして呼ぶ構成にし、
    「どういう順番で何を呼ぶか」が1ファイルを読むだけで分かるようにした
  - サブステップ間で共有していた`LoadValuesYamlContent`型は、どちらのサブステップにも
    属さない共有インターフェースとして`sub-steps/build-plans/types.ts`に切り出した
    （`chart-update.ts`が無くなったことで置き場所が必要になったため）
  - `build-plans.ts`は97行→269行に増えたが（`chart-update.ts`の171行を吸収したため）、
    隠れた中間層が無くなり流れが1ファイルで完結するようになった。`sub-steps/build-plans/`
    配下は`resolve-latest-tag.ts`・`image-tag-target.ts`・`helm-target-branch-target.ts`・
    `types.ts`の4ファイル（純粋な「1箇所分の差分チェック・書き換え」ワーカーのみ）に整理された
  - `CLAUDE.md`・`docs/architecture.md`を新しい役割分担（オーケストレーションは
    build-plans.ts側、実処理はsub-steps側）に合わせて更新
  - `pnpm check`（253テスト）通過。`rm -rf dist && pnpm build`でクリーンビルドし
    `dist/src/steps/sub-steps/build-plans/`の中身を確認。`CONFIG_PATH=config-test
DRY_RUN=true`で実機再確認

- **`build-plans.ts`をさらに「処理単位」で分割**: 「3ステップ維持でよいが、build-plansが
  まだ複雑」の対応後も、ユーザーから「もっと処理の単位を意識したstep/sub-stepに整理して、
  塊ごとに処理が行われていることが10秒でわかるようにしたい」と再度指摘された
  - `Config → ChartAndApps[] → AppConfig[] → ImageTagTarget[]/HelmTargetBranchTarget[]`という
    ドメイン階層に合わせ、「全chartAndApps」「1つのchartAndApps」「1つのapp」「1箇所（target）」
    という4段の処理単位をファイル境界にも反映させる方針にした。従来は`build-plans.ts`が
    「chartAndApps・app・target」の3段すべてを1ファイルで抱えていた
  - `build-plans.ts`は「全chartAndApps・1つのchartAndApps」の2段だけに絞り、`buildPlans()`
    （並列振り分け）・`buildPlanForChartAndApps()`（SKIPPED/ERROR/apply判定）・
    `buildChartUpdate()`（1chartAndApps配下の全appを順に処理）・`buildFileUpdates()`・
    `describePlan()`のみを残した
  - 新設した`sub-steps/build-plans/app-update-plan.ts`の`buildAppUpdatePlan()`が「1アプリ分」
    の処理単位を担当。手順を(1)`resolveLatestTag()`(2)`applyImageTagTargets()`
    (3)`applyHelmTargetBranchTargets()`(4)差分0件ならSKIPPED、あれば`AppUpdatePlan`化、
    という4行だけで追えるようにした
  - `image-tag-target.ts`/`helm-target-branch-target.ts`は「1箇所（target）分」の非公開関数
    （`applyImageTagTarget`/`applyHelmTargetBranchTarget`）はそのまま維持しつつ、新たに公開の
    複数形ラッパー（`applyImageTagTargets`/`applyHelmTargetBranchTargets`）を追加し、targetの
    配列を`reduce`で回す責務も同じファイルに閉じ込めた。呼び出し元（`app-update-plan.ts`）は
    複数形の関数を1回呼ぶだけでよくなり、target配列をループするコードは`app-update-plan.ts`から
    完全に消えた
  - `BuildChartUpdateAcc`型は`build-plans.ts`・`app-update-plan.ts`の2箇所から参照される
    共有インターフェースのため`sub-steps/build-plans/types.ts`へ移動（既存の
    `LoadValuesYamlContent`型と同居）
  - 作業中、`build-plans.ts`が意図せずディスク上でセミコロン付きスタイルに変わり、かつ
    `buildPlanForChartAndApps()`が`process()`（`main.ts`の実際のオーケストレーター関数と
    衝突する名前）にリネームされている状態を検出。自分の変更ではなかったためユーザーに確認し、
    「意図した変更ではない、破棄していい」との回答を得てから上書きした
  - `CLAUDE.md`は変更なし（原則の記述は元々ファイル単位ではなく抽象的なため据え置きで正確）。
    `docs/architecture.md`の`build-plans.ts`節を新しい4段構成の説明に書き換え
  - `pnpm check`（253テスト）通過。`rm -rf dist && pnpm build`でクリーンビルドし
    `dist/src/steps/sub-steps/build-plans/`に`app-update-plan.js`含む5ファイルが
    生成されることを確認。`CONFIG_PATH=config-test DRY_RUN=true`で実機再確認
    （既存のオープン中MRにより`filterTargets`で`SKIPPED`。設定読み込み〜GitLab API疎通までは
    到達を確認、`buildPlans()`内部の新構成自体は253テストで担保）

- **T-018完了**: タグ命名規則を`TAG_FORMAT`環境変数で設定可能にした（元は固定フォーマット、
  `docs/requirements-grilling.md`7ラウンド目で確定していたものを再検討）
  - ユーザーからの依頼「ブランチ由来のタグの形式を決め打ちではなく設定可能にできるか」を受けて
    /askで2点を確認: (1) 設定の粒度はapp単位（config.yaml）か全体で1つ（環境変数）か →
    「全体で1つの環境変数」を選択（branchToSyncのようなapp単位設定にはしない）。
    (2) 柔軟性のレベルは既存タグ解析専用の正規表現か、新規タグ作成にも使えるテンプレート
    文字列か → 「テンプレート文字列でプレースホルダ差し替え」を選択
  - `src/types.ts`に`TagFormat`ブランド型・`toTagFormat()`を追加
  - `src/lib/gitlab/tag.ts`を全面改修: `DEFAULT_TAG_FORMAT`（`"{branch}-build-at-{date}-{time}"`）・
    `validateTagFormat()`（`{branch}`/`{date}`/`{time}`をちょうど1回ずつ含むか検証、未知の
    プレースホルダは拒否）を新設。`buildTagPrefix()`を削除し、`buildNewTag()`/`parseTag()`/
    `findLatestParsedTag()`は第3引数`format: TagFormat`を取る形に変更。`parseTag()`は
    名前付きキャプチャグループ（`(?<date>...)`/`(?<time>...)`）でプレースホルダの並び替えに
    対応し、`{branch}`はテンプレート中の位置に関わらずリテラル一致させる
  - `src/lib/env.ts`に`parseTagFormat()`（未指定時は`DEFAULT_TAG_FORMAT`を適用して
    `validateTagFormat()`に委譲）と`TAG_FORMAT`定数を追加。タグ命名規則の検証ロジック自体は
    `lib/gitlab/tag.ts`側の責務として保ち、`env.ts`は未指定時のデフォルト適用のみ担当
    （`lib/`同士の依存は原則2の対象外）
  - `tagFormat`を`resolve-latest-tag.ts`→`build-plans.ts`（`buildAppUpdatePlan`/`buildPlan`/
    `process`/`buildPlans`）→`main.ts`まで明示的な引数として貫通（他の環境変数と同じ
    明示引数渡しのスタイルに統一し、デフォルト引数は使わない）
  - `test/lib/gitlab/tag.test.ts`（`validateTagFormat`の正常系・異常系6件、カスタム
    フォーマットでの`parseTag`/`buildNewTag`のテストを追加、`buildTagPrefix`のテストは削除）・
    `test/lib/env.test.ts`（`parseTagFormat`の3テスト追加）・`test/steps/build-plans.test.ts`
    （カスタムフォーマットを渡すと`createTag`/`latestTag`がその形式になることを確認する
    1テストを追加、既存の全`buildPlans()`呼び出しに`DEFAULT_TAG_FORMAT`引数を追加）・
    `test/main.test.ts`の`env.js`モックに`TAG_FORMAT`を追加
  - `README.md`（タグ命名規則節に説明と運用注意点、環境変数表・CI/CD変数表）・`.env.example`・
    `.gitlab-ci.yml`（`spec.inputs.TAG_FORMAT`・`variables.TAG_FORMAT`）・
    `docs/requirements.md`（4.1節）・`docs/requirements-grilling.md`（新ラウンドとして
    設定粒度・柔軟性レベルの決定経緯を記録）・`docs/glossary.md`・`docs/architecture.md`
    （`tag.ts`の説明）を更新
  - `pnpm check`（264テスト）通過。運用注意点として、フォーマットを運用途中で変更すると
    過去に作成済みのタグが追跡ブランチ由来のタグとして認識されなくなる旨をREADMEに明記
  - 未実施: gitlab.com実機での動作確認（コード変更のみでこのセッションは完了、次回以降に
    やるなら`TAG_FORMAT`にカスタム値を指定した`DRY_RUN=true`実行で確認するとよい）

## 次にやること

- T-015: 更新ブランチ名（現状`UPDATE_BRANCH`固定1本）の仕様見直し。pipeline schedulesに
  よる定期実行と、ユーザーによる手動トリガー実行とでブランチを分けたいという問題意識、
  `/grilling`で要件を詰める
- 検証が完全に終わったら、テスト用のGitLabアクセストークンを失効させる（ユーザー対応）

## 未解決

- T-015（`tasks.json`参照）

## 注意

- `config/teamA-chart/` はユーザーが提示した設定ファイルの実例。`docs/requirements.md` のディレクトリ構成説明と対応している
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている（導入済みスキル・ユーザー管理データを誤って自動整形しないため）
- リモートは`origin`が`github.com/sinnlosses/helm-yadokari`と`gitlab.com/sinnlosses-group/helm-yadokari`の
  2つの push URL を持つ（GitHubからのリダイレクトをgitが追従し自動追加したもの）。`git push`/`git fetch`は
  両方に対して行われる
- gitlab.com上に検証用の`sinnlosses-group/yadokari-smoke-test-chart`プロジェクトが存在する（削除せず残置）
