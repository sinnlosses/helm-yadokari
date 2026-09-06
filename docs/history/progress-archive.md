# progress.md の過去ログ（〜T-063）

`progress.md` は「直近の状態・次にやること・未解決・注意」に絞る運用にしたため（T-030）、
それ以前に積み上がっていた「完了したこと」の記述をこのファイルへそのまま移した。
内容は当時の記述のままで、後から書き換えていない（当時のファイル名・型名のままの箇所がある）。
タスク単位の証跡は `tasks.json` と `docs/history/tasks-archive.md` を参照。

## 完了したこと（アーカイブ）

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

- **T-019完了**: MRを出す単位を「chartリポジトリ単位」から「(chartリポジトリ, tenantId,
  clientId)単位（clientIdごと）」に変更する要件を`/grilling`3ラウンドで確定
  （実装は別タスクに切り出し、本タスクは要件定義のみで完了）
  - ユーザー提案「MRを出す単位をclientIdごとにしようと思うんだけどどうかな?」を受け、
    まず動機を確認: 「マージしたいclientと保留したいclientがいそう」＝クライアントごとに
    独立してマージ判断・保留できるようにしたい
  - 現状（`config/teamA-chart/tenantId1/clientId1/`等）はどのchartディレクトリも
    tenantId/clientIdが1組しかなく、この変更をしても既存の実例の挙動は変わらない
    （将来1つのchartリポジトリに複数クライアントが乗る運用への備え）
  - 確定事項: (1) MRの粒度を`(chartディレクトリ, tenantId, clientId)`単位に変更。
    (2) ブランチ名を`yadokari/update`固定から`feature/yadokari/<tenantId>/<clientId>`に変更。
    (3) tenantId/clientIdの文字種バリデーションは追加せず既存のERROR方針に委ねる。
    (4) MRタイトルを`Auto MR by yadokari: update ${tenantId}/${clientId} ${N} app image
tag(s)`に変更。(5) オールオアナッシングの範囲をchartリポジトリ全体→そのクライアント内の
    全アプリに縮小（本変更の主目的）。(6) 既存MRオープン中のスキップ判定もクライアント単位に。
    (7) 異なるclientが同じvalues.yamlを共有するケースは既知の制限としてドキュメントに明記の
    みで追加チェックはしない。(8) `CONCURRENCY_LIMIT`の意味を「chartリポジトリの同時処理数」
    →「`(chartディレクトリ, tenantId, clientId)`単位の同時処理数」に定義し直し、2段階の
    同時実行数制御は導入しない。(9) 同じtenantId/clientIdが複数chartディレクトリにまたがる
    ケースは従来から別MRだったため影響なし
  - `docs/requirements-grilling.md`に新ラウンド「MRの分割単位をtenantId/clientId単位に
    変更（T-019）」として記録。`docs/requirements.md`の2.1節・用語表（テナント/クライアント
    行）・4.2節（更新ワークフロー全面書き換え）・4.3節（オールオアナッシング範囲・並列実行数の
    定義）を更新
  - コード実装は未着手。`docs/glossary.md`・`docs/architecture.md`（現在のコードの実装を
    説明するドキュメントのため）も未更新のまま据え置き、実装タスクで一緒に更新する方針
    （T-013→T-016の進め方を踏襲）

- **T-020完了**: T-019で確定した要件を実装
  - `src/types.ts`: `TenantId`/`ClientId`ブランド型（`toTenantId`/`toClientId`）を新設し、
    `ChartAndApps`に`tenantId`/`clientId`フィールドを追加（JSDocも「MRを作成する単位」に更新）
  - `src/lib/config.ts`: `loadApps()`を`loadClientChartAndApps()`にリネーム・全面改修し、
    tenantId/clientIdごとに独立した`ChartAndApps`を1件返す形に変更（以前はchartDir配下の
    全tenantId/clientIdを1つの`apps`配列に集約していた）。`config.yaml`が存在しない
    tenant/clientディレクトリからは`ChartAndApps`自体を作らないようにした（以前は空`apps`の
    `ChartAndApps`を1件作っていた）。`loadConfig()`も`flatMap`ベースに書き換え
  - `src/lib/gitlab/gitlab.ts`: `UPDATE_BRANCH`定数（固定値`yadokari/update`）を削除し、
    `buildUpdateBranch(tenantId, clientId)`関数（`feature/yadokari/<tenantId>/<clientId>`）に
    置き換え。`buildMrTitle()`に`tenantId`/`clientId`引数を追加し、タイトルを
    `Auto MR by yadokari: update ${tenantId}/${clientId} ${N} app image tag(s)`に変更
  - `src/steps/filter-targets.ts`・`apply-updates.ts`・`build-plans.ts`: `logContext`に
    `tenantId`/`clientId`を追加。ブランチ名は`buildUpdateBranch()`経由で取得するよう変更
  - `test/helpers.ts`の`makeChartAndApps()`に`tenantId`/`clientId`（デフォルト`tenantId1`/
    `clientId1`）と`overrides`引数を追加
  - `test/lib/config.test.ts`: 複数tenant/clientの集約テストを「別々の`ChartAndApps`になる」
    に書き換え、target絞り込みテストを新しい粒度に合わせて修正、`config.yaml`不在テストを
    「`ChartAndApps`自体が作られない」ことの確認に変更（6テスト修正）
  - `test/lib/gitlab/gitlab.test.ts`: `UPDATE_BRANCH`→`buildUpdateBranch`のテストに置き換え、
    `buildMrTitle`のテストに`tenantId`/`clientId`引数を追加
  - `test/steps/apply-updates.test.ts`: `vi.mock`の自動モック化で`buildUpdateBranch`/
    `buildMrTitle`もモック関数になり戻り値が`undefined`になっていたのを、
    `vi.mocked().mockReturnValue()`で明示的にスタブして修正。ブランチ名アサーションを
    `feature/yadokari/tenantId1/clientId1`に更新
  - `test/steps/filter-targets.test.ts`: `buildUpdateBranch`のモック実装を追加し、
    tenantId/clientIdを含むブランチで判定することの確認テストと、「同じchartリポジトリでも
    異なるclientは独立して判定される（片方にオープン中MRがあっても他方はブロックしない）」
    ことを確認する新規テストを追加
  - `README.md`（Features・仕組みのmermaid図と説明文・実行ログ例・環境変数表・
    エラーハンドリング表）・`.gitlab-ci.yml`（`CONCURRENCY_LIMIT`の説明文言）・
    `docs/architecture.md`（`gitlab.ts`/`config.ts`の責務説明、`loadApps`→
    `loadClientChartAndApps`のリネーム反映、別セッションからの古い関数名参照
    `buildChartUpdate()`→`buildPlan()`も合わせて修正）・`docs/glossary.md`（「固定ブランチ」
    「テナント/クライアント」項目を新設計に更新）を更新
  - `pnpm check`（tsc/oxlint/oxfmt/vitest 266テスト）通過
  - 未実施: gitlab.com実機での動作確認。1つのchartディレクトリ配下に複数tenantId/clientIdを
    持つテスト用config構成が必要（現状の実例はどこも1chartDirにつき1組のみ）

- **T-021完了**: 固定ブランチの再作成漏れバグを修正
  - ユーザー指摘: 「T-015はもはや問題ないんじゃないか。定期実行後に手動実行したくなったら
    定期実行されて作られたMRを閉じればいいから」。ただし「MRをクローズしてもブランチが
    残り続ける仕様になっているなら、MRは存在しないけどブランチが存在する場合は削除する
    仕様にしたい」という追加要望
  - 調査の結果、`docs/requirements.md`には元々「マージまたはクローズされた後の実行で、
    改めて固定ブランチを作り直しMRを作成する」と明記されていたが、実装
    （`commitFileUpdates()`）はブランチが存在する場合は削除せず追加コミットを積むだけに
    なっており、要件と実装が食い違っていた（T-012の頃からの積年のバグ）
  - `src/lib/gitlab/gitlab.ts`に`deleteBranch()`（`gitlab.Branches.remove()`のラッパー）を
    新設。`commitFileUpdates()`を全面改修し、呼び出し元（`filterTargets`）が「このブランチに
    オープン中のMRが無い」ことを確認済みという前提のもと、ブランチが存在すれば無条件で
    削除してから`baseBranch`を起点に作り直すよう変更
  - ファイルごとのaction（create/update）判定も、ブランチを必ず作り直す前提のため常に
    `baseBranch`基準に単純化（従来の`exists ? branch : baseBranch`という参照先ブランチの
    出し分けロジックを削除）。commit時の`startBranch`オプションも常に指定するよう単純化
  - `test/lib/gitlab/gitlab.test.ts`の`commitFileUpdates`テストを新仕様に書き換え（3テストに
    再編）、`deleteBranch`単体のテストを追加
  - `docs/requirements.md` 4.2節・`docs/requirements-grilling.md`（新ラウンド）・
    `docs/architecture.md`（`gitlab.ts`の責務説明。ついでに前セッションの編集でoxfmtの
    多段階整形により3階層ネストのリストが1階層に潰れて壊れていたのを修正）・
    `docs/glossary.md`（「固定ブランチ」項目）を更新
  - `pnpm check`（267テスト）通過。マージ済み・クローズ済みのどちらも同じ扱い（無条件で
    削除）でよいと判断：マージ済みなら変更は既に`mrTargetBranch`に取り込まれているため
    削除は無害、クローズ済みなら人間が明示的に却下した変更なので復元不要
- **T-015クローズ**: ユーザー判断によりコード変更なしでクローズ。「もはや問題ないんじゃ
  ないか。定期実行後に手動実行したくなったら、定期実行されて作られたMRを閉じればいいから」
  との指摘どおり、T-021で「MRが存在せずブランチが存在する場合は削除する」仕様を実装した
  ことで、MRを閉じれば次回実行時に固定ブランチが自動的に削除・作り直されるようになった。
  定期実行と手動実行が同じブランチに混ざる懸念は「先に該当MRを閉じる」という運用でカバー
  できると判断し、手動/定期実行を区別する仕組み自体は導入しないことで決着。`tasks.json`の
  T-015を`done`に更新

## 完了したこと（T-038〜T-053 のセッション）

**200行超ファイルの整理（3回目の監査で登録した4件）**

- **T-044完了**: `lib/gitlab/gitlab.ts`（364行）をAPIラッパー（214行）と
  `lib/gitlab/mr-content.ts`（165行、外部I/Oなし）に分割。`buildMrDescription()` は
  GitLabクライアントではなく `ResolveWebUrl = (projectId) => Promise<GitLabUrl>` を受け取り、
  `apply-updates.ts` が `getProjectWebUrl` を注入する（T-027と同じ関数型注入）
- **T-045完了**: `lib/config.ts`（380行）を `lib/config/` の4ファイルへ
  （config.ts 163 / schema.ts 93 / validate.ts 97 / helm-target-branch.ts 51）
- **T-046完了**: `lib/verify-config.ts`（227行）を `lib/verify-config/` へ。
  100行あった `verifyChartAndApps()` を約40行にし、app単位を `verifyApp()` に切り出した。
  キャッシュ層は `newRemoteCache(gitlab)` が `hasProject`/`hasBranch`/`loadValuesYaml` を返す形にし、
  `gitlab`・`caches` の引き回しを廃止（`verifyTarget` は8引数→3引数）
- **T-047完了**: `types.ts`（267行）からブランド型11個を `types/brand.ts` へ。
  `export * from "./types/brand.js"` の再エクスポートで25ファイルのimportは無変更
- **T-041完了**: テスト3ファイルを src/ の構成に合わせて分割。
  `test/lib/config.test.ts`（938行）→ `test/lib/config/` 4ファイル＋`fixture.ts`（`useConfigDir()`）、
  `gitlab.test.ts`（723行）→ gitlab 434行 + mr-content 299行、
  `build-plans.test.ts`（609行）→ 本体172行 + `test/steps/sub-steps/build-plans/` 3ファイル

**2回目の監査で登録した残り**

- **T-040完了**: T-036以降どこからも読まれていなかった `PipelineInfo.status` と
  `PipelineStatus` 型を削除（`PipelineInfo` は `webUrl` のみ）。`isFatalStatus()` を非公開にし、
  テストを `isFatalError()` 経由に寄せた
- **T-039完了**: T-034〜T-037の仕様変更に追従できていなかったドキュメントを同期
  （requirements.md 4.2節のパイプライン状態、README Features、READMEのmermaid図にT-037の分岐、
  glossary.mdの「反映済みタグ」、architecture.mdの`scripts/smoke/`）
- **T-042完了**: `verifyConfigExistence()` の chartAndApps 単位を `mapWithConcurrency()` で並列化
  （`concurrencyLimit` を引数に追加、出力順は入力順のまま）。**並列化で表面化する穴**として、
  `getOrFetch()` が解決済みの値だけをキャッシュするため同時呼び出しで二重fetchすることが分かり、
  Promiseを共有する `getOrFetchShared()`（失敗時はキャッシュから削除）を追加して
  `remote-cache.ts` で使うようにした。逐次のままの2箇所（build-plans・mr-content）は `getOrFetch` のまま
- **T-038完了（ユーザー判断）**: CIの `validate-config-remote` が架空の設定例で必ず失敗する問題を、
  「`config/` には実運用の登録だけを置く」方針で解消。`config/teamA-chart/` を削除し
  `config/README.md`（運用ルール）に置き換えた。記述例は `docs/requirements.md` 4.4節が正典なので
  情報の損失はない。実機で `pnpm lint:validate-config:remote` が終了コード0になることを確認

**build-plans の改善（T-048〜T-053、サブエージェント委譲運用の初適用）**

- **T-051(haiku)**: dryRun時に不要な `getLatestPipelineForRef()` を呼ばないようにした
- **T-052(haiku)**: 失敗ログにアプリ名が出ず原因アプリを特定できなかった問題を解消。
  `steps/shared/step-outcome.ts` に `rethrowWithAppContext()` を追加。**致命的エラーだけは
  包まずそのまま投げる**（`new Error(..., {cause})` で包むと `extractHttpStatus()` が
  ステータスを辿れず FatalError に昇格できなくなるため）
- **T-048(sonnet)**: `readCurrentImageTags()` が読んだ `previousTags` を
  `applyImageTagTargets()` にも渡し、同じアンカーの二重読み取りを解消
- **T-049(sonnet)**: `LatestTagResolution.pointsAtTrackedHead`（クロージャ）を
  `trackedHeadTagNames: ReadonlySet<TagName>`（データ）に置き換え
- **T-050(sonnet)**: `valuesYamlCache` + `modifiedValuesPaths` を `ValuesYamlDraft` 1本に統合。
  詰め替えが消え、`buildFileUpdates()` の internal error も型レベルで不要になった
- **T-053(opus)**: アプリ単位の逐次実行は**現状維持**と決定。読み取りだけの先行並列化は
  技術的には可能だが、削減幅（1アプリ2〜3往復）に対してタグ作成の副作用が並列・前倒しで
  走る代償が大きい。理由と再検討条件を docs/architecture.md に明記

**最終状態**: `pnpm check`（tsc・oxlint・config検証・oxfmt・vitest **28ファイル308テスト**）通過。
`tasks.json` の53タスクはすべて `done` / `passes: true`。

## 完了したこと（T-054〜T-063 のセッション）

### T-063: 追跡ブランチ切り替え時に無駄なタグを作らない（ユーザー指摘）

- 従来は切り替え時、切り替え先のHEADを指す既存タグがあっても**必ず新しいタグを作っていた**。
  根拠は「追跡先が変わったことを values.yaml 上で明示するため」だったが、タグ名には
  `{branch}` が必ず含まれるので、既存タグを書けば名前から読み取れる＝作る必要がなかった
- `branchChanged` ガードを外した結果、`hasTagFromOtherBranch()`・`resolveLatestTag()` の
  `previousTags` 引数・ログの `reason: "tracked_branch_changed"` が**連鎖的に不要**になり削除
- 要件「切り替え前後が同じコミットでも更新する」は、切り替え前のタグ名が現在の追跡ブランチで
  パースできず `trackedHeadTagNames` に入らないことで**自動的に成立**する
- README の図はさらに1ノード減り、「追跡ブランチ由来か」の判定は**設定タグを主語とする
  ノード側**に移した（主語が混ざらない形を維持）

### T-062: コード・ドキュメントからタスク番号を削除

- 33ファイルからタスク番号を削除。**番号が根拠のポインタになっている文は書き直した**
  （例:「T-003で意図的にこのままとする判断」→「意図的にこのままとする判断。理由は前掲の
  『アプリ単位は逐次のまま』参照」、workflow.md の difficulty 表の実タスク例→作業の性質が
  伝わる説明）
- CLAUDE.md のコーディング規約に「コード・ドキュメントにタスク番号を書かない」を追記
- 残存は `tasks.json` / `progress.md` / `docs/history/` の4ファイルのみ（＝番号が識別子として
  機能する対象外ファイル）
- サブエージェントがセッション上限で途中終了したため、残り1件の書き換えと、落ちる前に
  崩れていた3ファイルの整形をメイン側で仕上げた

### T-056: 最新タグ判定の実装（T-055 の決定を反映）

- `resolveLatestTag()` から「全タグの中から名前が最新のものを選んでHEADと比較する」判定
  （`existingTag`/`existingTagCommitSha`）を削除し、**`trackedHeadTagNames` が空でなければ
  その中から選ぶ**方式に変更
- 意図的な振る舞い変更: HEADにタグがあるのに別コミットにより新しい名前のタグがあると
  無駄な新規タグを作っていた問題が解消。この振る舞いを検証するテストを追加
- 決定2はコード変更不要のため回帰テストのみ（並び順違いフォーマット2種）。決定3は到達不能なので実装せず
- テスト4件追加（315→319）。README のmermaid図・Features・エラーハンドリング表、
  docs/glossary.md も新方式に同期

### T-055: タグ命名規則・最新タグ判定の要件を確定（実装は T-056）

調査で分かった事実（要件判断の根拠）:

- `ParsedTag.builtAt` は `findLatestParsedTag()` の比較にしか使われていない（MR本文もログも
  `.name` しか読まない）
- **GitLabの「タグの作成日時」は当てにできない**。`TagSchema.created_at` は optional で、
  軽量タグには付かない。このツールは `Tags.create()` を message 無しで呼ぶ＝軽量タグを作る
- `resolveLatestTag()` が並び順を必要としているのは「最新タグがHEADを指すか」の判定だけ

ユーザー判断:

1. **最新タグ判定を「追跡ブランチ由来でHEADを指すタグを直接探す」方式に変更**。複数該当時は
   タグ名から読んだ日時の降順（いずれも同じコミット＝中身は同じなので決定性のためだけの規則）
2. **TAG_FORMAT は緩めず現状維持**（`{branch}`/`{date}`/`{time}` を各1回必須）。ただし
   「**並び順・区切り文字は任意**」であることを要件とREADMEに明記した。これは実測で
   既に動くことを確認済み（`{date}-{time}-{branch}`・`v{time}_{branch}__{date}` で生成・
   再パース・最新判定が成功）＝**コード変更は不要**
3. 一意化要素が無い場合のタグ作成エラーは、date/time が常に必須である以上**到達不能**なので
   作らない（デッドコードを増やさない）

当初検討したコミット日時ソート案は、上記の事実2により却下。

### T-057: README の冗長な記述を削る

- 393行 → 268行（-125行、約32%）。削ったのは**正典と二重管理だった4ブロック**だけ:
  config/ の3つのYAML例と設定エラー5ケース → `docs/requirements.md` 4.4節、
  タグ命名規則の実装名・非互換の詳細 → 同4.1節、プロジェクト構成ツリーの `src/` 配下の
  責務コメント約35行 → `docs/architecture.md` の責務テーブル、`config-test/` の説明 → 同勘所
- いずれも削除ではなく**要約1〜2文＋正典へのリンク**に置換。正典側に無い情報（mermaid図・
  実行ログ例・CI/CDセットアップ手順・環境変数表・エラーハンドリング表）は残した

### T-061: `src/steps/` をステップ名ディレクトリ構成に変更

- `steps/<step名>/<step名>.ts` に統一し、サブステップは `steps/build-plans/sub-steps/` へ。
  「そのステップからしか呼ばれない」ことを構造で表せるようになった
- `steps/shared/step-outcome.ts` は複数ステップの共有なので据え置き
- test/ も同構成に追従。**テスト件数が315件のまま**であることを確認（移動でファイルが
  vitest の対象から外れる事故の検知）

### T-060: 型定義を `src/types/` に集約

- `src/types.ts` → `src/types/types.ts`（`git mv`。同名のファイルとディレクトリが並ぶ状態を解消し、
  `src/lib/<名前>/<名前>.ts` と同じ形に揃えた）
- `export * from "./brand.js"` の再エクスポートは維持したので、利用側の import の形は不変
- src/test/scripts の35ファイルの相対パスを張り替え。`sub-steps/build-plans/types.ts` への
  ローカル参照（`"./types.js"`）は別ファイルなので据え置き

### T-059: values.yamlの書き込み位置の型を `AnchorTarget` 1つに統一

- `ImageTagTarget` / `HelmTargetBranchTarget`（どちらも `AnchorTarget` の単なるエイリアス）を
  削除。以前は「用途を読み手に伝えるため」意図的に残していたが、ユーザー判断で統一した
- 削除したエイリアスのJSDocは `AppConfig.chart`・`HelmTargetBranchConfig.targets`・
  `ImageTagUpdate.target`・`HelmTargetBranchUpdate.target` のフィールドJSDocへ移送（情報は不変）
- `applyImageTagTarget()` などの**関数名は変更しない**（型名ではなく「何を適用するか」を
  表す名前なので、用途の区別を担う側として残す）

### T-054: `TARGET_CHART_DIR` → `TARGET_CHART` 改名＋誤設定の検知強化

- 環境変数名だけを変更し、値の意味（`config/` 直下のディレクトリ名）と内部の型・フィールド名
  （`ChartDirName`・`ChartAndApps.chartDir`・`ConfigTarget.chartDir`）は据え置き
- **検知の穴を塞いだ**: 以前は「`config/` 直下に無い名前」だけがエラーで、ディレクトリは
  存在するが `chart.yaml` が無い場合や絞り込み結果0件は「0 chart groups」で正常終了していた。
  `loadConfig()` に `isExplicitlyTargeted()` を追加し、`TARGET_CHART`/`TARGET_CLIENT` を
  **明示指定したときに限り**対象0件をエラーにする（未指定時に0件でもエラーにしない既存仕様は
  回帰テストで固定した）
- エラーメッセージに `formatChartDirs()` で実在ディレクトリ名の一覧を添えた

### T-058: アーカイブ運用の整備

`tasks.json`（93KB、`done` 53件）と `progress.md` の肥大化が放置されていた（アーカイブの
移し先だけがあり、いつ移すかのトリガーが無かった）ため、トリガーを明文化し実際にアーカイブした。

- **トリガーの明文化**: `docs/workflow.md`「肥大化したときのアーカイブ」節に、(1)
  セッション開始時に `done` が10件以上ならアーカイブする、(2) 10件未満でも `tasks.json` が
  30KBを超えたら `done` を減らせないか検討する、という具体的な基準を追記。`dependencies` が
  アーカイブ済みタスクIDを指す場合は書き換えず残し、「`tasks.json` に存在しないIDはアーカイブ
  済み＝完了とみなす」ルールも明記した。`CLAUDE.md`「進捗管理とHandoff」の手順1にも、
  セッション開始時にこのトリガーを確認する旨を1〜2行で追記
- **tasks.json → tasks-archive.md**: `done` だった T-001〜T-053 の53件全件を
  `docs/history/tasks-archive.md` へ移した。既存21節（T-004等）は当時の `**タスク**`・
  `**当時のevidence**` を書き換えずに残し、`tasks.json` 側のevidenceを `**evidence**` 行として
  追記（節を循環参照させる「詳細な経緯は…この節を参照」という自己参照の文言のみ削除）。
  節が無かった32件は同じ書式で新設し、`difficulty`/`dependencies` を持つタスクはその行も追加。
  節はT-001から昇順に並べ直した（既存21節も含む）
- **tasks.json のサイズ削減**: 93,137バイト（62件、うちdone 53件）→ 14,211バイト（9件、
  T-054〜T-062のみ、すべて`status: todo`で内容は変更していない）。`docs/history/tasks-archive.md`
  は21節・61,168バイト → 53節・120,229バイトに増えた（情報は移しただけで消していない）
- **情報欠落の確認**: 移動前の `tasks.json` をスクラッチにコピーし、`done` 53件それぞれの
  `task` 本文冒頭20文字と（自己参照を除いた）`evidence` 冒頭20文字が
  `docs/history/tasks-archive.md` に含まれることをスクリプトで突き合わせ、欠落0件を確認
- **progress.md → progress-archive.md**: 旧「完了したこと（このセッション: T-038〜T-047の9件、
  実際の内容はT-038〜T-053）」ブロック（見出し〜「**最終状態**」段落まで）を、見出しを
  「## 完了したこと（T-038〜T-053 のセッション）」に付け替えたうえで内容はそのまま
  `docs/history/progress-archive.md` 末尾へ移した。同ファイルの1行目タイトルも
  「〜T-021」→「〜T-053」に更新。`progress.md` 冒頭のサマリ段落もT-053までアーカイブ済みの
  実態に合わせて書き換えた

**このセッションの最終状態**: `pnpm check`（tsc・oxlint・config検証・oxfmt・vitest
**28ファイル319テスト**）通過（セッション開始時は308テスト。T-054で+7、T-056で+4）。
`tasks.json` の9タスクはすべて `done` / `passes: true`。タスク1件＝1コミットで積み、
`main` に fast-forward マージして push 済み（`677e7d8..4f1caf7`）。

### 実機スモークテスト（2026-09-06、`docs/smoke-test.md` の手順どおり）

`summary {"CREATED":2,"SKIPPED":0,"ERROR":0}`・終了コード0。MR !26（`tenant2/client1`、
`image tag 1, helm branch 1`）と !27（`tenant2/client2`、`image tag 1`）が作られ、
タイトル・本文の2セクション構成・8列/4列のテーブルとも手順書の期待どおり。
再実行が `SKIPPED (mr_exists)` になることも確認。

**最新タグ判定の方式変更（HEADを指すタグの直接探索）が実機で意図どおり動くことを確認した**:

- `sample-qa-sprint` はHEADを指すタグ（`main-build-at-20260903-172148`）を再利用し、
  **新規タグを作っていない**（両リポジトリとも当日日付のタグは0件）
- `sample-develop-client` は**HEADを指すタグが2本ある**（`main-build-at-20260101-000000` と
  `main-build-at-20260903-143646` が同一コミット `9b81a971` を指す）。
  「複数該当時はタグ名の日時降順」というタイブレーク規則が実際に発火し、
  新しい方（`...143646`）が選ばれた

---

## 過去セッション: T-064〜T-076（2026-09-06、`develop/progress.md` から移動）

## 完了したこと（前セッション: T-064〜T-070）

`chore/register-direction-tasks` ブランチで7タスクを実施し、`main`へfast-forwardマージ・
github/gitlab両リモートへpush済み（`860717a..92eb5f0`）。`tasks.json` が30KBを超えたため
この7件は [`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md) へ移し、
`tasks.json` は 35,440→13,838バイト（T-071以降の6件のみ）になった。

## 完了したこと（このセッション）

- `src/types/types.ts`を見たユーザーからの新規指摘3件をタスク化した（コード変更なし）:
  1. `TargetClient.tenantId`/`clientId` を `string` ではなく `TenantId`/`ClientId` 型で
     扱う（T-071、機械的なのでsonnet）
  2. `AnchorTarget.anchor: AnchorName` のようにフィールド名と型名がズレている箇所の横展開
     （T-072で対象範囲・命名を決定 → T-073で実装。全型を調査し、`branch`/`chartDir`など
     他にも同じズレがあること、`branchToSync`等の修飾語付きは事情が異なることを整理した）
  3. コメントを簡潔にする方針（T-074で基準を決定 → T-075で`types.ts`/`brand.ts`に適用）
- `mr-content.ts`の`buildMrDescription()`が`ResolveWebUrl`（関数）を受け取っている件を追加調査し、
  T-076として登録した。冒頭コメントが「純粋な文字列組み立てだけ」と言いつつ実際は非同期＋
  キャッシュ管理をしていて宣言とズレていること、必要な`projectId`集合は呼び出し前に全部
  分かるため呼び出し元で事前解決できることまで確認済み（`build-plans/sub-steps`の
  `LoadValuesYamlContent`/`BranchExists`とは事情が異なり、横展開の対象ではない）

### T-071: TargetClient をブランド型で扱う

- `TargetClient.tenantId`/`clientId` を `TenantId`/`ClientId` に変更（`ChartAndApps` 側と対称になった）。
  `config.ts` の比較・パス結合3箇所は**ブランド型が `string` のサブタイプなので変更不要**だった

### T-072: フィールド名と型名のズレの方針

- 規則は「**型定義のフィールド名は、ブランド型が表している語（`Name`など）を落とさない**」。
  `anchor: AnchorName` は「アンカーそのもの」を持っているように読めるのがズレの正体
- **関数の引数名は対象外**（型注釈が同じ行に見える／フィールドはドットアクセスで宣言から
  離れて読まれる、という違いで線を引いた）。修飾語が「どれか」を担うもの（`branchToSync`・
  `mrTargetBranch`など）と、包含型が主語を与える `name` も対象外
- リネーム対象は6件に確定（`anchor`・`HelmTargetBranchConfig.branch`・`ParsedTag.branch`・
  `chartDir`・`previousTag`・`FileUpdate.filePath`）。実装は T-073

### T-073: リネームの実施

- 6件を実施（`anchorName`・`branchName`×2・`chartDirName`・`previousTagName`・
  `FileUpdate.valuesPath`）。28ファイル・約160行の差分だが、テスト件数は322のまま
- **wire format は不変**: `anchors.yaml` のキー `anchor` と、gitbeakerに渡す
  `CommitAction.filePath` はそのまま。詰め替えは `schema.ts` の `.transform()` と
  `commitFileUpdates()` が担う
- ログのキー（`chartDir`→`chartDirName`、`previousTag`→`previousTagName`）も追従させた

### T-074: コメント方針

- 基準は「**コードから読み取れないことだけを書く／原則1〜2文／それを超える背景は正典（docs/）へ**」。
  残す価値があるのは「外部との対応関係（どのYAMLキー由来か等）」と「非自明な前提・制約」。
  `CLAUDE.md`「コーディング規約・レビュー方針」に追記した
- `types.ts`/`brand.ts` の長いJSDocの中身は**既に正典側にある**ことを確認（アンカー方式→
  `glossary.md`、`chart`を配列にする理由→`requirements.md`、`GitLabUrl`の理由→`architecture.md`）。
  そのため T-075 は移設不要で、削除・圧縮だけで済む

### T-075: コメントの圧縮

- `types.ts` 169→128行、`brand.ts` 104→88行。**コメントのみの変更**（型定義・実装・
  エクスポートは無変更であることを `git diff` で確認）
- 長い説明は正典にあるので移設せず削除。`ImageTagUpdate` のJSDocに残っていた旧名
  `previousTag` も修正した

### T-076: 関数注入を値渡しに

- `buildMrDescription()` を **同期関数**にし、`ResolveWebUrl`・`webUrlCache`・`getOrFetch()` の
  reduceを削除。冒頭コメントの「外部I/Oを持たない純粋な文字列組み立て」と実装が一致した
- URLの解決とキャッシュは `gitlab.ts` の `getProjectWebUrls()`（重複`projectId`は1回だけ解決）に
  移し、`apply-updates.ts` が事前に呼ぶ。必要な`projectId`は `webUrlProjectIds()` が返すので、
  **イメージタグの行を持たないplanのURLは取りに行かない**（素朴に全plan分を渡すと無駄が増える）
- サブエージェントがsonnetのセッション上限で途中終了したため、残りのテスト修正と
  重複排除テストの `gitlab.test.ts` への移設、上記の無駄取りはメイン側で仕上げた

## 過去セッション: build-plans/apply-updates/lib-gitlab の再編（2026-09-06、`develop/progress.md` から移動）

- **`build-plans` の流れを他stepと同じ形に整理した**（ユーザー指摘: 「手順が5つコメントに
  記載があるのにsub-stepsが3つ」「buildPlans→planTarget→buildPlan→buildAppUpdatePlan が
  わかりづらい」）。
  - **`readCurrentImageTags()` を廃止**し、`applyImageTagTarget()` が下書きから自分で
    反映済みタグを読む形に戻した。この関数は元々`resolveLatestTag()`の追跡ブランチ切り替え
    判定に値を渡すためのものだったが、判定が`trackedHeadTagNames`方式になった時点で
    その役目は終わっており、残っていたのは`previousTags`を添字で引き回す配線だけだった。
    「同じアンカーが1アプリ内に2回現れない」という壊れやすい前提も不要になった
    （下書きの現在値を読むため、重複しても2件目は差分なしと判定される）
  - **副作用の順序が変わる**: 「values.yamlを読む→タグ作成」から「タグ作成→values.yamlを読む」に
    なるため、**values.yaml不在の設定ミス時に`ERROR`の前にタグが1つ作られる**。作られるタグは
    追跡ブランチのHEADを指すので再実行時に再利用され、増え続けることはない。READMEのフロー図
    （タグ存在確認→無ければ作成→helm設定値と比較）にはむしろ忠実になった。アンカー不在の
    ケースは変更前からタグ作成後にエラーだったため挙動は不変
  - **`planTarget()`を`buildPlan()`に統合**し、階層を `buildPlans → buildPlan →
buildAppUpdatePlan` の3段に。`filterTargets → evaluateTarget` /
    `applyUpdates → applyUpdate` と同じ「並列処理1件分の関数を読めば全体が分かる」形に揃った
  - GitLabアクセスのクロージャ組み立ては`createChartAccess()`（非公開関数）に切り出し、
    `ChartAccess`型として束ねた
  - 結果、`buildAppUpdatePlan()`の手順が5→4になり、`sub-steps/`の3ファイルと1対1で対応する
    （31ファイル330テスト、件数不変）
- **サブステップ同士のimportを `sub-steps/shared/` に追い出した**（ユーザー指摘:
  「サブステップ同士は関わってはいけない」）。`docs/architecture.md`には以前からその原則が
  書いてあったが、`values-yaml-draft.ts`が`image-tag-target.ts`・`helm-target-branch-target.ts`
  から呼ばれ、`LatestTagResolution`が`resolve-latest-tag.ts`から参照されていた。原因は
  `sub-steps/`直下に「親stepが呼ぶステップ本体」と「それらが共有する型・データ操作」が
  混在していたこと。`{types,values-yaml-draft}.ts`を`sub-steps/shared/`へ移し、
  `LatestTagResolution`も`shared/types.ts`へ移した。型の置き場所の基準「その型を生み出す
  関数と同じファイル」と競合する場合は`shared/`を優先すると`docs/architecture.md`に明記。
  `grep 'from "./[^s]' src/steps/*/sub-steps/*.ts` が0件であることで機械的に確認できる
- **`apply-updates`のMR組み立てを2つのサブステップに分けた**（ユーザー指摘:
  「1度しか使わない1行の関数が乱立している」）。`build-mr-content.ts`が「MRに載せる項目の
  選別」と「Markdownの組み立て」の2つの仕事を持ち、`plansWithImageTagRows()`・
  `webUrlProjectIds()`・`resolveWebUrl()`という1行関数と、タイトル/本文で2回呼ばれる
  `uniqueHelmTargetBranchUpdates()`に分裂していた。
  - `collect-mr-entries.ts`（新規）: `plans`→`MrEntries { imageTags, helmBranches }`。
    web URLの解決と向き先ブランチの重複排除をここに集約。1行関数3つは1パスに吸収されて消えた
  - `build-mr-content.ts`: `MrEntries`→`{ title, description }`の**同期・純粋関数**になった
    （GitLab依存と`async`が消え、テストから`vi.mock`が不要になった）
  - **タイトルの件数と本文のテーブルの行が同じ配列から数えられるようになった**。以前は
    タイトルが`plans.reduce()`、本文が`plans`の絞り込みと別ロジックで、ずれても気づけなかった
  - サブステップ同士は呼ばず、`applyUpdate()`が2つを順に呼ぶ。共有する型（`MrEntries`・
    `ImageTagEntry`）は`apply-updates/sub-steps/shared/types.ts`
  - テストも2ファイルに分割し、`makePlan()`は`test/helpers.ts`へ移した
    （31ファイル330テスト、326→330）

- **`lib/gitlab/` の分割基準を「ファイル長」から「依存対象」へ見直した**（ユーザー指摘:
  「ファイルの長さを考慮して分割しただけでキレイと感じない」）。`gitlab.ts`から切り出された
  `tag.ts`・`mr-content.ts`は、原則2（技術・外部システム・ファイル形式への依存）では
  説明できない配置だった。中身を1シンボルずつ判定して4つに分けた:
  - `lib/gitlab/tag.ts` → `lib/tag-format.ts`。GitLab APIにもGitLab固有形式にも依存せず、
    依存先はこのツール自身が定義する`TAG_FORMAT`という**形式**（タグを作るのも読むのも自分）。
    `lib/helm.ts`・`lib/config/schema.ts`と同格に置いた
  - `buildFeatureBranch()` → `steps/shared/feature-branch.ts`。技術依存ゼロ＋2つのstepが使う
  - MRタイトル・本文 → `steps/apply-updates/sub-steps/build-mr-content.ts`。呼び出し元は
    `apply-updates.ts`1ファイルだけ。**サブステップは1ファイル＝親stepが呼ぶ1ステップ**
    （ユーザー指摘）なので、`buildMrTitle()`/`buildMrDescription()`を並べて公開せず
    `buildMrContent()`1つが`{ title, description }`を返す形にした。web URLの解決は
    `resolve-latest-tag.ts`と同じく`GitlabClient`を受け取って自分で行う（一度
    `ResolveWebUrls`関数型で注入する形にしたが、隠すべきキャッシュもprojectIdの引き回しも
    無く間接層が増えるだけだったのでユーザー指摘で戻した。`docs/architecture.md`の
    「サブステップはGitLabクライアントを受け取らない」も実態に合わせて書き直した）
  - `buildTagUrl()`/`buildCompareUrl()` → `lib/gitlab/web-url.ts`（新規）。`/-/tags/`・
    `/-/compare/`というGitLab固有のURLパス形式に依存する唯一の部分。「外部I/Oは`gitlab.ts`
    だけ」を保つため`gitlab.ts`には混ぜず別ファイルにした
  - 結果 `lib/gitlab/` は `gitlab.ts`（API本体）と `web-url.ts`（URL形式）の2つだけになった
  - `docs/architecture.md` の「**`gitlab/tag.ts` は外部I/Oを持たないのに `lib/gitlab/` にある**」
    という但し書き（＝原則2で説明できていなかったサイン）を削除し、今回の判断理由に差し替えた。
    あわせて `commitFileUpdates()` がドメイン型 `FileUpdate` を知っている件を、**現状維持の
    判断とその理由**（stepに移すとGitLab APIの呼び出し順がstep側に漏れる）として明文化
  - `buildTagUrl()`/`buildCompareUrl()` は非公開で本文経由でしか検証されていなかったため、
    export化に伴い `test/lib/gitlab/web-url.test.ts` を新設（サブパス設置のインスタンスで
    グループ/プロジェクト部分を落とさないこと・タグ名の`/`エスケープを直接検証）
  - `pnpm check`（**30ファイル326テスト**）通過。322 + web-url の新規4件

- **`verify-config` を `src/lib/` から `scripts/lint/` へ移した**（ユーザー指摘）。本体
  パイプライン（`index.ts`→`main.ts`→`steps/`）からの参照は0で、唯一の呼び出し元が
  `scripts/lint/validate-config.ts` だったため。`pnpm build` の `dist/` から lint専用コードが
  消えたことを実測で確認（`find dist -name "*verify*"` が0件）。
  - `src/lib/verify-config/` → `scripts/lint/verify-config/`、
    `test/lib/verify-config/` → `test/scripts/lint/verify-config/`（いずれも `git mv`）
  - あわせて: `pnpm lint` を `oxlint src scripts` に拡張（移動先が lint 対象から外れるため）、
    `vitest.config.ts` の coverage対象に `scripts/lint/verify-config/**` を追加、
    `CLAUDE.md` にテスト配置ルール（`scripts/` 配下は `test/scripts/`）を追記
  - この判断の根拠は `CLAUDE.md` の**原則3**と `docs/architecture.md`「コードからは読み取れない
    設計判断」に記録した（原則2は「`src/`のどこに置くか」の基準であって「`src/`に置くか否か」を
    決めない、という切り分け）
  - `pnpm check`（28ファイル**322テスト**）通過＝移動前と同数。`--remote` の実機実行は未実施
