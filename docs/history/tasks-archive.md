# 完了タスクの詳細アーカイブ

`tasks.json` の `evidence` は「後から検証できる最小限の証跡」（コミットハッシュ・テスト件数・
生成物へのパス）に絞る運用にしたため（T-030）、それ以前に書かれていた詳細な経緯・設計判断・
撤回した案・実機検証の記録をこのファイルへそのまま移した。内容は当時の記述のままで、
後から書き換えていない（当時のファイル名・型名のままの箇所がある）。`done` になったタスクは
セッション開始時のアーカイブ運用（`docs/workflow.md`「肥大化したときのアーカイブ」参照）で
全件ここへ移す。節は `T-001` から昇順に並べる。

## T-001

**タスク**: プロジェクトの目的・スコープ・要件を定義する (docs/requirements.md を作成)

**evidence**: docs/requirements.md (確定版。タグ命名規則・config/ディレクトリ構成・MRのchart repo単位集約などすべて反映済み。検討経緯は docs/requirements-grilling.md)

## T-002

**タスク**: gitlab-watari-doriを参考に、同じ技術スタック（TypeScript/pnpm/vitest/oxlint/oxfmt/GitLab CI）でCLIの骨格を実装する

**dependencies**: T-001

**evidence**: commit 2cb9b97, e9127b5。pnpm check（tsc --noEmit + oxlint + oxfmt --check + vitest）が152テスト全てpassで通過。/code-review（Standards軸: 明文化標準への違反0件。Spec軸: engines未設定とアプリ単位no-opログ欠落を指摘、両方とも e9127b5 で修正済み）。実際の値をGITLAB_URLに設定してnode dist/src/index.jsを実行し、config/teamA-chart/を読み込んでエラーを構造化ログに正しく出力すること・非ゼロ終了することを確認

## T-003

**タスク**: アプリ単位の処理を並列化するか、意図的に逐次のままにするかを決める（現状はbuildChartUpdate()内でp-limit未適用、docs/requirements.md 4.3節の文言と完全には一致しない）

**dependencies**: T-002

**evidence**: ユーザー判断: 夜間のpipeline schedule実行が前提のため、アプリ単位の処理は現状の逐次のままでよいと決定。コード変更なし。docs/requirements.md 4.3節の「chartリポジトリ間はp-limitで並列」という記述と、アプリ単位（chartグループ内）は逐次という実装の差異は、意図的な設計判断として記録のみ行う

## T-004

**タスク**: 実際のGitLabインスタンスに対する統合テスト・動作確認（DRY_RUN=trueでの実運用リハーサルを含む）

**dependencies**: T-002

**evidence**: commit f0124d0。

**当時のevidence**: gitlab.com上の実リポジトリ（既存: sample-qa-sprint, sample-develop-client／新規作成: yadokari-smoke-test-chart）でエンドツーエンド検証（レポートはコミット前にディスクから消失したため、この記述を証跡とする）。タグ自動作成・DRY_RUN・values.yaml差分反映・chart単位MR集約・既存タグ再利用・オープン中MRスキップ・TARGET_CHART_DIR/TARGET_CLIENT絞り込みと誤指定時エラーをすべて実機で確認。副産物として実バグを1件発見（commit f0124d0: GitLabのGET /pipelines/latestはパイプライン0件のプロジェクトに404でなく403を返すため、CI未実行アプリを含むchartグループが全てERROR化していた）。作成したMRはクローズ済み、テスト用chartリポジトリ・タグは継続検証のため残置

## T-005

**タスク**: リポジトリで使われるドメイン固有の用語を整理する（docs/glossary.md を作成）

**evidence**: commit ae9a516。/grillingで9問の設計ツリーを確定（対象は業務ドメイン用語のみ、アーキテクチャ用語は除外／表記ゆれは統一せず注記のみ／カテゴリ別グルーピング）。docs/glossary.md 作成、CLAUDE.mdの関連リンク節に追加、oxfmt --check済み

## T-006

**タスク**: docs/glossary.mdで見つかった表記ゆれのうち、変数名・メソッド名レベルのものをリネームして明確化する

**dependencies**: T-005

**evidence**: commit 17f38c3, 1b62791。build-plans.ts: currentTag→previousTagRaw、content系→valuesYamlContent系。apply-updates.ts: title→mrTitle（+コミットメッセージにも流用する旨のコメント追加）。いずれも非公開ローカル変数のみで公開シグネチャ変更なし。pnpm check（204テスト）通過。/code-review（固定点5c2a90a）実施、Standardsはハード違反0件、Specの指摘（mrTitleの二重用途が名前だけでは伝わらない／JSDocの「反映」表記）を反映済み。「chartリポジトリ vs chartグループ」表記ゆれはdocs/requirements.mdという確定済み要件文書側の話であり、変数名・メソッド名の範囲外として今回は対応せず据え置き

## T-007

**タスク**: プリミティブ型（string等）のまま扱われているフィールドにドメイン固有のブランド型を付与し、不要なundefinedの可能性を減らす

**dependencies**: T-006

**evidence**: commit 6183f15。pnpm check（204テスト）通過。

**当時のevidence**: commit 6183f15, 43ee252。ValuesPath/DotPathブランド型を新設しAppConfig.chart.valuesPath/imageTagKey・FileUpdate.filePath・lib/helm.tsのdotPath引数・lib/gitlab/gitlab.tsのgetFileContentのfilePathに適用。PipelineInfo型をlib/gitlab/gitlab.tsからtypes.tsへ移動しwebUrlをGitLabUrl化。AppUpdatePlanのpipelineUrl/pipelineStatus（Data Clump）をpipeline: PipelineInfo|undefinedに統合し、片方だけundefinedという不正な状態を型的に排除。listTagNames/createTag/getLatestPipelineForRefのタグ名引数・戻り値をTagName化、getProjectWebUrlの戻り値をGitLabUrl化。pnpm check（204テスト）通過。/code-review（固定点1b62791）実施、Standards/Spec両軸が独立にgetFileContentのfilePath未対応を指摘→43ee252で反映。PipelineInfo.statusとChartGroup.chartDirは意図的に未ブランド化（前者はGitLab API由来の自由形式文字列で分岐ロジックなし、後者は外部システム境界を跨がないローカルなディレクトリ名）

## T-008

**タスク**: try/catchを削減できる箇所（エラーを値として扱える箇所）を洗い出して対応する

**dependencies**: T-007

**evidence**: commit 8289a13。pnpm check（204テスト）通過。

**当時のevidence**: commit 8289a13。src配下の全try/catch（7箇所）とscripts/lint/validate-config.tsを監査。lib/env.tsのvalidateGitlabUrl内のnew URL()例外捕捉をURL.canParse()（Node 22で使える非throwの真偽値判定API）に置き換え、try/catchとparseUrl()ヘルパーを削除。他6箇所（lib/gitlab/gitlab.tsのwithNotFoundFallback、utils/retry.tsのwithRetry、utils/parallel.tsのmapWithConcurrency、steps/3ファイルのFatalError判定）は@gitbeaker/restという例外ベースの外部ライブラリとの境界、またはFatalError（即時中断）/非fatal（ERRORとして値化して継続）を分岐する唯一の場所であり、いずれも意図的に維持（理由をユーザーに報告済み）。pnpm check（204テスト）通過

## T-009

**タスク**: ChartGroup→ChartAndApps改名・ChartDirName/PipelineStatusブランド型付与・steps配下のmutableなfor/push/Set.addをreduceベースの不変な組み立てに置き換えるリファクタ

**dependencies**: T-007

**evidence**: commit eb1344e。pnpm check（204テスト）通過。以前のセッションで未コミットのまま作業ツリーに残っていたものを、このセッションでTARGET_CHART_DIR/TARGET_CLIENT機能の変更と切り分けて単独コミットとして記録

## T-010

**タスク**: TARGET_CHART_DIR/TARGET_CLIENT環境変数で特定chart・特定tenant/clientに絞り込んで実行できるようにする

**dependencies**: T-002

**evidence**: commit e902f9c。loadConfig()にConfigTargetフィルタを追加、TARGET_CLIENTは"<tenantId>/<clientId>"をカンマ区切りで複数指定可能。指定対象がconfig/配下に見つからない場合は例外。.gitlab-ci.ymlのpipeline inputsにも追加。pnpm check（222テスト）通過。T-004のgitlab.com実機検証でも動作確認済み

## T-011

**タスク**: chart.imageTagKey（dotパス）に加え、YAMLアンカー名で値を指定するchart.imageTagAnchorを追加する（配列要素にアンカーで名前を付けたvalues.yaml構成に対応）。あわせてvalues.yaml/config読み込みのYAML処理をjs-yamlからyamlパッケージに統一する

**dependencies**: T-002

**evidence**: commit e59c410。pnpm check（236テスト）通過。

**当時のevidence**: commit e59c410。AnchorNameブランド型・ImageTagLocation（imageTagKey/imageTagAnchorの排他ユニオン）をtypes.tsに追加。src/lib/helm.tsにgetValueAtAnchor/setValueAtAnchor（yamlパッケージのvisit()でアンカー名を持つASTノードを検索・書き換え）を新設し、getImageTag/setImageTagで呼び出し側から方式の違いを隠蔽。src/lib/config.tsのapps.yamlスキーマを判別ユニオン化（両方指定・どちらも未指定はエラー）。getValueAtPath/setValueAtPathとsrc/utils/yaml.tsのparseYamlFileもjs-yamlからyaml（Document.getIn/setIn/hasIn、parse）に置き換え、js-yaml/@types/js-yamlをpackage.jsonから削除。副産物として書き換え対象以外のコメント・クォートスタイルが保持されるようになった。pnpm check（236テスト）通過。CLAUDE.md/README.md/docs/requirements.md/docs/glossary.mdを更新

## T-012

**タスク**: T-011で追加したchart.imageTagAnchorをconfig/の実例apps.yamlに反映し、gitlab.com実機で動作確認する

**dependencies**: T-011

**evidence**: pnpm check（237テスト）通過。

**当時のevidence**: gitlab.com上の既存smokeテスト用リソース（sinnlosses-group/yadokari-smoke-test-chart等）を使い再検証。imageTagAnchor指定アプリとimageTagKey指定アプリが同一chartグループ内に混在するケースを含め、アンカー値の書き換え・他要素（別アンカー含む）の保持を実機で確認。副産物として実バグを1件発見・修正（commit未定: commitFileUpdates()が「固定ブランチが既に存在する＝対象ファイルも全て存在する」と決め打ちしていたため、MRクローズ後に残った固定ブランチへ新規valuesPathを追加した際に action:update を送ってしまい400エラーになっていた。ファイルごとに参照先ブランチ上の存在有無を確認しaction: create/updateを判定するよう修正、テスト追加。pnpm check（237テスト）通過。config/teamA-chart/tenantId1/clientId1/apps.yamlにimageTagAnchor使用例（another-app, projectId 889）を追加。作成したMRはクローズ済み、テスト用GitLabリソースは継続検証のため残置

## T-013

**タスク**: 「Helmの向き先ブランチ」の追従・更新をこのツールのMR対象に含めるかどうか、/grillingで要件を詰める。ユーザー提示の出発点: Helm chartは(1)パラメータを定義するブランチ（values.yaml等を持つ、既存のmrTargetBranchに相当）と、(2)そのパラメータを受け取ってk8sリソースを実際に構築するブランチ（=「Helmの向き先ブランチ」）の2種類で構成される。向き先ブランチは1つのclient（tenantId/clientId）内のapps全体で共通の1つの値であり、タグではなくブランチ名そのもので指定する。この向き先ブランチ自体もバージョンによって変わることがあり、変わった場合はこのツールが検知してMRの変更対象に含めてほしい、という要望。未確定な論点（grillingで詰める）: この設定をどこに持たせるか（chart.yaml/apps.yaml/新設の設定ファイル）、「向き先ブランチが更新された」をどう判定するか（タグの命名規則のような仕組みが向き先ブランチ側にも要るのか、それとも人間が都度値を書き換える運用か）、既存のimageTagKey/imageTagAnchorの更新フロー・MR集約単位（chartグループ単位）とどう共存させるか、1client内で本当に常に1つに定まるのか（複数chartグループにまたがる場合の扱い）など

**evidence**: コード変更なし（判断・要件定義のみ）。

**当時のevidence**: /grillingを3ラウンド実施し要件を確定（実装はT-016に切り出し、本タスクは要件定義のみで完了）。確定事項: (1)向き先ブランチはchartリポジトリ内の別ブランチ（chart.yamlのprojectIdと同一プロジェクト）。(2)設定はapps.yamlの新しいトップレベルフィールド（apps:配列と同階層、例: helmTargetBranch: release/2026-q1）としてtenantId/clientId単位に1つ持たせる。値は人間が自己申告方式で直接書き換える運用とし、タグ命名規則のような自動生成・自動判定の仕組みは持たない（CLIは設定値とvalues.yaml内の現在値を単純比較するだけでよい）。(3)書き込み先は各appごとにそれぞれのapp用values.yaml内の1箇所（既存のimageTagAnchorと同様の方式でapp単位に書き込み位置を指定する新フィールドが必要）。(4)書き込み前に指定ブランチ名がchartリポジトリ上に実在するか検証し、存在しなければそのchartグループ全体をERRORにする（既存のオールオアナッシング方針を踏襲）。(5)既存の「1chartリポジトリ=1MR」に含め、image tag更新と同じMRにまとめる。(6)同じtenantId/clientIdが複数chartディレクトリにまたがる場合、各apps.yamlが独立して値を持つため理論上ズレうるリスクは許容し追加の整合性チェックは作らない。ユーザーに最終確認済み（「このままで問題なし」）

## T-014

**タスク**: 1つのsource project（app.projectId）に対して、WebAPI/バッチ/デーモンなど複数のアプリケーションを管理しており、同一の追跡タグを複数の書き換え箇所（複数のimageTagKey/imageTagAnchor）に反映したいケースに対応する。現状（T-011）はAppConfig.chartが1エントリにつきimageTagKey/imageTagAnchorのどちらか1つのみを持てる設計（ImageTagLocation、排他ユニオン）。apps.yamlのスキーマ（1app=1箇所 → 1app=複数箇所の配列、など）・AppConfig/AppUpdatePlan型・buildChartUpdate()やgetImageTag/setImageTagの実装・MR本文（1アプリで複数箇所を書き換えた場合の表示）を、複数箇所への反映に対応する形に見直す必要がある

**dependencies**: T-011

**evidence**: pnpm check（234テスト）通過。

**当時のevidence**: AppConfig.chartをImageTagTarget（valuesPath + imageTagKey/imageTagAnchor）の配列に変更（1件以上必須、src/lib/config.tsでzod検証）。AppUpdatePlanをapp単位のlatestTag/pipelineと、箇所ごとのImageTagUpdate（target + previousTag）配列に分離。src/steps/build-plans.tsにapplyImageTagTarget()/applyAppToChartUpdate()を追加し、app.chartを1箇所ずつreduceで処理して差分があった箇所だけをupdatesに積む（全箇所反映済みならそのアプリ自体を計画から除外）。src/lib/gitlab/gitlab.tsのbuildMrPlanSection()を、アプリ単位（打刻日時・パイプライン）と箇所単位（タグ・比較URL）の2階層表示に再構成。test/lib/config.test.ts・test/steps/build-plans.test.ts（1アプリ複数chart・一部のみ差分ありの2ケースを追加）・test/steps/apply-updates.test.ts・test/lib/gitlab/gitlab.test.tsを新スキーマに追従。pnpm check（249テスト）通過。gitlab.com実機（sinnlosses-group/yadokari-smoke-test-chart + sample-qa-sprint）でbuildPlans()を直接呼び出し、1アプリ2箇所（dotパス+アンカー）が同一latestTagに対しそれぞれ独立したpreviousTagを検出し、MR descriptionが箇所ごとに正しい行を生成することを確認（一時スクリプト・一時config-test-t014ディレクトリは検証後に削除、既存のテスト用GitLabリソース・MRは変更していない）。config/teamA-chart/tenantId1/clientId1/apps.yamlに複数chart指定の例（multi-service-app, projectId 890）を追加。README.md/docs/requirements.md/docs/architecture.md/docs/glossary.mdを新スキーマ・複数箇所対応の説明に更新。【追記】ユーザーからの明示的な指示により、imageTagKey（dotパス）方式を完全に削除しimageTagAnchor（YAMLアンカー）方式のみに一本化。src/types.ts（DotPath型・ImageTagLocationユニオン廃止、ImageTagTargetはvaluesPath+imageTagAnchorの単純な形に）、src/lib/config.ts（ImageTagLocationSchemaのunion廃止、単一スキーマに）、src/lib/helm.ts（getValueAtPath/setValueAtPath・getImageTag/setImageTagラッパーを削除、getValueAtAnchor/setValueAtAnchorのみ残す）、src/steps/build-plans.ts（getImageTag/setImageTag呼び出しをgetValueAtAnchor/setValueAtAnchor直接呼び出しに変更）、src/lib/gitlab/gitlab.ts（describeImageTagLocationの分岐削除）を修正。config/実例のmy-appエントリもimageTagAnchor化（アンカー名myAppVersion）。test/lib/helm.test.ts・test/lib/config.test.ts・test/steps/build-plans.test.ts・test/steps/apply-updates.test.ts・test/lib/gitlab/gitlab.test.ts・test/helpers.ts・test/main.test.tsのフィクスチャをすべてimageTagAnchorベースに書き換え、imageTagKey/imageTagAnchorの排他検証テストなど不要になったテストは削除。README.md/docs/requirements.md/docs/architecture.md/docs/glossary.mdからimageTagKeyの現行仕様としての記載を削除し、削除された経緯のみ補足として残す。pnpm check（234テスト）通過

## T-015

**タスク**: 更新ブランチ名の仕様を見直す。現状は`UPDATE_BRANCH`（"yadokari/update"）固定の1本で、chartリポジトリ単位にこのブランチへコミットを積みMRを作る。ユーザーの問題意識: 通常のpipeline schedulesによる定期実行に加えて、ユーザーが手動でこのCLIをトリガーしたい場合もありそうで、その際に定期実行分と同じ固定ブランチへ積んでしまうと意図せず混ざる（例: 定期実行のMRがまだレビュー中のところへ手動実行のコミットが追加されてしまう、手動実行のたたき台を定期実行が上書きする、など）。/grillingで要件を詰める。未確定な論点: 手動トリガーと定期実行をどう区別するか（環境変数・CLI引数・実行コンテキストの検知など）、ブランチ名をどう分けるか（固定2種類、都度ユニークな名前、ユーザー指定可能にする等）、既存の「固定ブランチにオープン中のMRがあればそのchartグループをスキップする」（filterTargetsの`openMergeRequestExists`）仕組みや「既存の固定ブランチを削除して作り直す」運用とどう整合させるか、ブランチが複数になった場合のstale化したブランチの掃除方針

**dependencies**: T-021

**evidence**: ユーザー判断によりクローズ（コード変更なし）。T-021のセッションでユーザーから「T-015はもはや問題ないんじゃないか。定期実行後に手動実行したくなったら、定期実行されて作られたMRを閉じればいいから」との指摘。T-021で「MRが存在せずブランチが存在する場合は削除する」仕様（`deleteBranch()`）を実装したことで、MRを閉じれば次回実行時に固定ブランチが自動的に削除・作り直されるようになり、定期実行と手動実行が同じブランチに混ざる懸念は「先に該当MRを閉じる」という運用でカバーできると判断。手動/定期実行を区別する仕組み自体は導入しないことで決着

## T-016

**タスク**: T-013で確定した「Helmの向き先ブランチ」要件を実装する。apps.yamlにtenantId/clientId単位の新しいトップレベルフィールド（例: helmTargetBranch、apps:配列と同階層）を追加し、値は人間が自己申告方式で直接書き換える運用とする。各appにはこの値の書き込み先（valuesPath + アンカー名、既存のimageTagAnchorと同様の方式）を指定する新フィールドを追加する。CLIは設定値とapp用values.yaml内の現在値を比較し、異なれば書き換え対象に含める（タグのような自動生成・resolveLatest相当の仕組みは不要、単純な値比較でよい）。書き込み前に、指定されたブランチ名がchartリポジトリ（chart.projectId）上に実在するか検証し、存在しなければそのchartグループ全体をERRORにする。この更新は既存の「1chartリポジトリ=1MR」に含め、image tag更新と同じMRにまとめる（MR本文にも向き先ブランチの変更内容を表示する）。同じtenantId/clientIdが複数chartディレクトリにまたがる場合のズレは許容し、追加の整合性チェックは作らない

**dependencies**: T-013

**evidence**: pnpm check（248テスト）通過。

**当時のevidence**: src/types.tsにHelmTargetBranchTarget（valuesPath+anchorName）・HelmTargetBranchConfig（branch+target）・HelmTargetBranchUpdate（target+previousBranch+newBranch）を追加し、AppConfig.helmTargetBranch: HelmTargetBranchConfig|undefined、AppUpdatePlan.helmTargetBranchUpdate: HelmTargetBranchUpdate|undefinedを追加。src/lib/config.tsのAppsYamlSchemaにトップレベルhelmTargetBranch（tenantId/clientId単位）、AppConfigSchemaにapp単位のhelmTargetBranchTarget（valuesPath+anchorName）を追加し、loadApps()内のresolveHelmTargetBranch()が両者を1つのHelmTargetBranchConfigにマージ（targetのみでbranchが無い場合は例外）。src/steps/build-plans.tsにapplyHelmTargetBranchTarget()を追加し、applyAppToChartUpdate()内でapp.chartの処理後に同じvaluesYamlCacheを共有して処理。値が現在のvalues.yamlと異なる場合のみbranchExists()（lib/gitlab/gitlab.ts、既存関数を流用）でchartリポジトリ上の実在を検証し、存在しなければ例外を投げてそのchartグループ全体をERRORにする（オールオアナッシング方針を踏襲）。ブランチ存在チェックはbranchExistsCacheで同一ブランチ名につき1回に共有。chart側の差分が無くhelmTargetBranchUpdateのみあるアプリも計画に含めるようスキップ条件を修正。src/lib/gitlab/gitlab.tsのbuildMrPlanSection()にbuildHelmTargetBranchUpdateLine()を追加しMR本文に「向き先ブランチ」の行を表示。test/lib/config.test.ts（4テスト）・test/steps/build-plans.test.ts（5テスト）・test/lib/gitlab/gitlab.test.ts（3テスト）を追加。pnpm check（246テスト）通過。gitlab.com実機（yadokari-smoke-test-chart + sample-qa-sprint）でbuildPlans()を直接呼び出し検証: (1)実在するブランチ（main）を指定した場合、charts/anchor-app/values.yamlに追加したsmokeTestTargetBranchアンカーの現在値（release/2025-q4）と設定値（main）の差分を正しく検出しhelmTargetBranchUpdateとMR description行を生成、(2)実在しないブランチ名を指定した場合はchartグループ全体がERRORになることを確認。検証用に追加したsmokeTestTargetBranchアンカー（charts/anchor-app/values.yaml、コミットc96614e1）はテスト用GitLabリソースとして残置。一時スクリプト・一時configディレクトリは検証後に削除。config/teamA-chart/tenantId1/clientId1/apps.yamlにhelmTargetBranch/helmTargetBranchTargetの使用例（my-app）を追加。README.md/docs/requirements.md/docs/architecture.md/docs/glossary.mdを更新。【追記】ユーザー指示によりapps.yamlのスキーマ形状を再設計。(1) トップレベルフィールドをスカラー`helmTargetBranch: <branch>`から拡張性を考慮した配列`helm:\n  - branchToSync: <branch>`に変更（現状1件のみサポート、2件以上はzodの.length(1)でエラー）。(2) app単位の独立オブジェクトフィールド`helmTargetBranchTarget: {valuesPath, anchorName}`を廃止し、既存の`chart[]`配列の各要素（`imageTagAnchor`と同じ場所）に任意の`helmBranchAnchor`フィールドとして統合、1アプリで複数のchart要素に指定すれば複数箇所へ反映できるようにした。型もHelmTargetBranchConfig.targetを配列targets（複数対応）に、AppUpdatePlan.helmTargetBranchUpdateを配列helmTargetBranchUpdatesに変更。src/types.ts・src/lib/config.ts（ImageTagTargetSchemaにhelmBranchAnchor追加、HelmConfigSchema新設、resolveHelmTargetBranchをchart[]から集約する形に書き換え）・src/steps/build-plans.ts（applyHelmTargetBranchTargetを単一target処理関数にしtargets配列をreduceで処理、ApplyHelmTargetsAcc型を新設）・src/lib/gitlab/gitlab.ts・src/steps/apply-updates.tsを修正。全テストファイルのフィクスチャを新スキーマに書き換え（ImageTagTarget型がhelmBranchAnchorを必須プロパティ（値はundefined許容）として持つようになったため、既存のchart要素リテラルすべてに追記）。config/実例・README.md/docs/requirements.md/docs/architecture.md/docs/glossary.mdを新スキーマに更新。pnpm check（248テスト）通過。gitlab.com実機で新スキーマでのbuildPlans()呼び出しを再検証し、既存のsmokeTestTargetBranchアンカーに対する差分検出・MR description生成が変更後も正しく動作することを確認。【追記2】ユーザー指摘（「helmBranchAnchorの記載のないprojectがapps.yamlにあるが、そこはバリデーションが効く必要がある」）を受けて欠けていた整合性検証を追加。Helmの向き先ブランチは「1client内のapps全体で共通」という前提（T-013）にもかかわらず、chart[].helmBranchAnchorをapp単位の完全な任意指定にしていたため、helmを指定したのに一部アプリだけhelmBranchAnchorが無い設定が黙って通ってしまっていた（実際、config/の実例でanother-app/multi-service-appがこの状態だった）。src/lib/config.tsのresolveHelmTargetBranch()に、helmが指定されているapps.yamlでtargets.length===0のアプリがあれば例外をスローする分岐を追加（app名を含むエラーメッセージ）。config/teamA-chart/tenantId1/clientId1/apps.yamlのanother-app/multi-service-appにhelmBranchAnchorを追加して修正。test/lib/config.test.tsの「一部のappだけhelmBranchAnchorを指定できる」テストを「例外をスローする」に更新し、「全appが指定していれば読み込める」テストを追加。README.md/docs/requirements.md/docs/architecture.md/docs/glossary.mdにこの制約を明記。pnpm check（249テスト）通過。【追記3】ユーザーがconfig/teamA-chart/tenantId1/clientId1/apps.yamlを手動で書き直し、helmBranchAnchor（app単位の任意フィールド）方式をやめ、トップレベルhelm配下に独立したchart[]（valuesPath+anchorの書き込み先一覧）を持つ設計に戻す形で「この構成で動くように実装を直してほしい」と明示指示。ユーザーに確認質問（helm.chart[]とapp.chart[]の対応付けはvaluesPathの一致で決め、appのvaluesPathがhelm.chart[]に無ければどうするか）を行い、「エラーにする」の回答を得て実装。変更点: (1) src/types.tsのImageTagTargetからhelmBranchAnchorフィールドを削除しimageTagAnchorをanchorにリネーム、HelmTargetBranchTarget.anchorNameもanchorにリネーム（apps[].chart[].anchorとhelm.chart[].anchorで同じフィールド名に統一）。(2) src/lib/config.tsのHelmConfigSchemaを配列から単一オブジェクト（branchToSync+chart[]、.transform()でHelmTargetBranchConfig型に変換）に戻し、resolveHelmTargetBranch()をapp単位のhelmBranchAnchor集約からvaluesPath一致によるマッチングに書き換え（appのchart[].valuesPathのいずれかがhelm.chart[]でカバーされていなければ、そのvaluesPathとapp名を含む例外をスロー）。(3) src/steps/build-plans.ts・src/lib/gitlab/gitlab.tsのフィールド参照をanchorに追従。(4) test/helpers.ts・test/lib/config.test.ts（helmTargetBranch関連のdescribeブロックを新設計に全面書き換え）・test/steps/build-plans.test.ts・test/steps/apply-updates.test.ts・test/lib/gitlab/gitlab.test.tsのフィクスチャを追従。(5) config-test/yadokari-smoke-test-chart/の手動検証用フィクスチャ、README.md/docs/requirements.md/docs/architecture.md/docs/glossary.mdを新設計に更新。config/teamA-chart/tenantId1/clientId1/apps.yaml自体はユーザーが既に新設計の内容で書いていたため変更不要（multi-service-app用のmultiServiceAppTargetBranchアンカーもユーザー自身が追記済み）。pnpm check（248テスト）通過

## T-017

**タスク**: apps.yamlのうち「chart構造（valuesPath+anchor）」を分離する対応を改めて依頼された。前回（同一セッション内）は projectId をキーとするマップ形式の chart-targets.yaml を実装したが、「projectIdキーだけで読み解くのは難しいかもしれない」という評価を受けて撤回していた。今回はユーザーから具体的なファイル名・スキーマ形状の指定があった: (1) tenantId/clientIdディレクトリに anchor-setting.yaml を新設し、helm: [{chart: [...]}]（配列） / apps: [{projectId, projectName, chart: [...]}] という、projectIdをマップキーにせず自己完結した配列要素で持つ構成にする。(2) apps.yaml を config.yaml にリネームする。(3) config.yaml と anchor-setting.yaml の整合性（projectの紐づけの有無）を検証する仕組みを作る

**dependencies**: T-016

**evidence**: pnpm check（254テスト）通過。

**当時のevidence**: src/lib/config.tsを全面改修。config.yaml（旧apps.yaml、AppOperationalSchema/HelmOperationalSchemaで運用値のみ）とanchor-setting.yaml（AnchorSettingYamlSchemaでchart構造のみ、apps[]の各要素はprojectId+projectName+chart[]を持つ自己完結した配列、helmは配列でhelm[0].chartを持つ）を分離。新設したvalidateProjectLinkage()が両ファイル間の紐づけを3方向で検証: (a) config.yamlの各appに対応するanchor-setting.yaml側エントリが無ければ例外、(b) 逆にanchor-setting.yamlにconfig.yaml側に存在しない孤児エントリがあれば例外、(c) 同じprojectIdなのにprojectNameが食い違っていれば例外。resolveHelmTargetBranch()はconfig.yamlのhelm.branchToSyncとanchor-setting.yamlのhelm[0].chartを別引数で受け取り、valuesPath一致でapp単位に振り分ける方式を維持（片方だけの指定は例外）。実ファイルはgit mvでapps.yaml→config.yamlにリネームしたうえで運用値のみに削減し、config/teamA-chart/tenantId1/clientId1/anchor-setting.yamlを新設（3app分のchart構造とhelmを移設）。config-test/yadokari-smoke-test-chart/tenant1/client1/にも同様に適用。test/lib/config.test.tsを全面書き換え（writeConfigYaml()/writeAnchorSettingYaml()ヘルパーを新設し、正常系・バリデーションエラー（孤児設定・projectName不一致を含む）・helmTargetBranch関連のテストケースを新スキーマに追従、37テスト）。src/types.tsのAppConfig/ChartAndApps/ImageTagTarget/HelmTargetBranchTarget/HelmTargetBranchConfig/HelmTargetBranchUpdateのdocコメントを新ファイル構成に更新。README.md（config/章）・docs/requirements.md（3節の用語表・4.4節）・docs/architecture.md（config.tsの責務説明）・docs/glossary.md（新規config.yaml /anchor-setting.yaml項目の追加、アプリ/テナント・クライアント/valuesPath/anchor/Helmの向き先ブランチ/helm[0].chart[].anchor項目の更新、前回chart-targets.yaml案を撤回した経緯も記録）を新構成に更新。pnpm check（tsc・oxlint・lint:validate-config「config OK: 1 chart groups, 3 apps」・format・テスト254件）通過。gitlab.com実機（yadokari-smoke-test-chart +sample-qa-sprint、config-test/配下）でCONFIG_PATH=config-test DRY_RUN=trueを実行し、新しいconfig.yaml/anchor-setting.yaml構成からloadConfig()が正しく読み込み・整合性検証を通過し、実際のGitLab APIへ到達することを確認（既存のオープン中MRによりSKIPPED。values.yamlへのanchor書き込みロジック自体は本タスクで変更していないため、直近のbuildPlans()直接検証結果がそのまま有効）。【追記】ユーザーがconfig/teamA-chart/tenantId1/clientId1/anchor-setting.yamlを手動で修正し、helmを[{chart: [...]}]という配列表記から{chart: [...]}という単純なオブジェクトに変更。実装をそれに追従させた。src/lib/config.tsのAnchorSettingYamlSchema.helmをz.array(AnchorSettingHelmSchema).length(1)からAnchorSettingHelmSchema.optional()に変更し、loadAnchorSetting()のparsed.helm?.[0]?.chartをparsed.helm?.chartに変更。resolveHelmTargetBranch()・エラーメッセージ・src/types.tsのdocコメントのhelm[0].chart表記をhelm.chartに統一。test/lib/config.test.tsのhelm関連テストのYAML文字列を配列表記からオブジェクト表記に修正し、配列であることが前提だった「helmが2件以上指定されると例外をスローする」テストは削除（オブジェクトなので複数指定という概念自体が無くなったため）。README.md/docs/requirements.md/docs/architecture.md/docs/glossary.mdのhelm[0].chart表記をhelm.chartに修正。pnpm check（253テスト）通過。pnpm lint:validate-configで実configが新スキーマで読み込めることを確認。CONFIG_PATH=config TARGET_CHART_DIR=teamA-chart DRY_RUN=trueで実行し、設定パース段階でエラーが出ず実際のGitLab APIまで到達することを確認（config/teamA-chart/はprojectId 888等の架空プロジェクトのため404 Project Not FoundでERRORになるが、これは想定通りでconfig解析の問題ではない）。【追記2】ユーザーから「命名候補を出してほしい」との依頼を受け、chart.yaml/config.yaml/anchor-setting.yamlの3ファイルの命名を見直す候補を4案提示（tracking.yaml+write-targets.yaml、sync.yaml+anchors.yaml、3ファイル全改名のchart-repo.yaml+apps-sync.yaml+values-targets.yaml、app-tracking.yaml+app-anchors.yaml）。ユーザーは「anchor-setting.yamlをanchors.yamlに変えるだけでいい」と、chart.yaml・config.yamlは据え置きで最小限の変更を選択。git mvでanchor-setting.yaml→anchors.yamlにリネーム（config/teamA-chart/tenantId1/clientId1/、config-test/yadokari-smoke-test-chart/tenant1/client1/の両方）。src/lib/config.tsの識別子もファイル名に合わせて統一: AnchorSettingYamlSchema→AnchorsYamlSchema、AnchorSettingAppSchema→AnchorsAppSchema、AnchorSettingHelmSchema→AnchorsHelmSchema、型AnchorSettingApp→AnchorsApp、型AnchorSetting→Anchors、loadAnchorSetting()→loadAnchors()、変数anchorSetting→anchors、anchorSettingPath→anchorsPath。test/lib/config.test.tsのwriteAnchorSettingYaml()ヘルパーをwriteAnchorsYaml()にリネームし、ファイルパス・テストタイトルの文字列も追従（36テスト）。README.md/docs/requirements.md/docs/architecture.md/docs/glossary.md/src/types.tsのanchor-setting.yaml表記をanchors.yamlに一括置換し、ディレクトリ構成図のコメント位置がずれた箇所（README.md/docs/requirements.md）のインデントを手動で整列。progress.md/tasks.jsonの過去の記述は当時の名前のまま残し、履歴として保持。pnpm check（253テスト）通過。pnpm lint:validate-configで実configが新ファイル名で読み込めることを確認。CONFIG_PATH=config-test DRY_RUN=trueで実行し、gitlab.com実機に対して設定パースからAPI呼び出しまで問題なく到達することを再確認

## T-018

**タスク**: 追跡ブランチ由来のタグの命名規則が固定フォーマット（`${branch}-build-at-${date}-${time}`）だったのを、環境変数で設定可能にしてほしいという依頼。/askで設定粒度（app単位のconfig.yaml vs 全体で1つの環境変数）と柔軟性のレベル（既存タグ解析専用の正規表現 vs 新規タグ作成にも使えるテンプレート文字列）を確認し、「全体で1つの環境変数」「テンプレート文字列でプレースホルダ差し替え」を選択

**dependencies**: T-002

**evidence**: コード変更なし（判断・要件定義のみ）。

**当時のevidence**: src/types.tsにTagFormatブランド型・toTagFormat()を追加。src/lib/gitlab/tag.tsを全面改修: DEFAULT_TAG_FORMAT（"{branch}-build-at-{date}-{time}"）・validateTagFormat()（{branch}/{date}/{time}をちょうど1回ずつ含むか検証、未知プレースホルダは拒否）を新設し、buildTagPrefix()を削除してbuildNewTag()/parseTag()/findLatestParsedTag()を第3引数format: TagFormatを取る形に変更（parseTagは名前付きキャプチャグループ(?<date>)/(?<time>)を使い、{branch}はテンプレート中の位置に関わらずリテラル一致させることでプレースホルダの並び替えに対応）。src/lib/env.tsにparseTagFormat()（未指定時はDEFAULT_TAG_FORMATを適用してvalidateTagFormat()に委譲）とTAG_FORMAT定数を追加。tagFormatをsrc/steps/sub-steps/build-plans/resolve-latest-tag.ts→src/steps/build-plans.ts（buildAppUpdatePlan/buildPlan/process/buildPlans）→src/main.tsまで明示的な引数として貫通（他の環境変数と同じ明示引数渡しのスタイルに統一、デフォルト引数は使わない）。test/lib/gitlab/tag.test.ts（validateTagFormatの正常系・異常系6件、カスタムフォーマットでのparseTag/buildNewTagのテストを追加、buildTagPrefixのテストは削除）・test/lib/env.test.ts（parseTagFormatの3テスト追加）・test/steps/build-plans.test.ts（tagFormatにカスタムフォーマットを渡すとcreateTag/latestTagがその形式になることを確認する1テストを追加、既存の全buildPlans()呼び出しにDEFAULT_TAG_FORMAT引数を追加）・test/main.test.tsのenv.jsモックにTAG_FORMATを追加。README.md（タグ命名規則節にTAG_FORMATの説明と運用注意点、環境変数表・CI/CD変数表に追加）・.env.example・.gitlab-ci.yml（spec.inputs.TAG_FORMATと variables.TAG_FORMAT）・docs/requirements.md（4.1節）・docs/requirements-grilling.md（新ラウンドとして設定粒度・柔軟性レベルの決定経緯を記録）・docs/glossary.md（タグ命名規則の定義更新）・docs/architecture.mdのtag.ts説明を更新。pnpm check（tsc/oxlint/oxfmt/vitest 264テスト）通過

## T-019

**タスク**: MRを出す単位を「chartリポジトリ単位」から「(chartリポジトリ, tenantId, clientId)単位（clientIdごと）」に変更する要件を/grillingで詰める。ユーザー提案「MRを出す単位をclientIdごとにしようと思うんだけどどうかな?」を受け、動機（マージしたいclientと保留したいclientがいそう＝クライアントごとに独立してマージ判断・保留できるようにしたい）を確認したうえで実施。実装は含まない、要件定義のみ（T-013→T-016と同じ進め方）

**dependencies**: T-002

**evidence**: コード変更なし（判断・要件定義のみ）。

**当時のevidence**: /grillingを3ラウンド実施し要件を確定。確定事項: (1)MRの粒度をchartリポジトリ単位→(chartディレクトリ,tenantId,clientId)単位に変更。1つのchartリポジトリに複数のtenantId/clientIdがある場合、クライアントごとに独立したブランチ・MRになる。(2)ブランチ名を固定値yadokari/update廃止→feature/yadokari/<tenantId>/<clientId>に変更。(3)tenantId/clientIdがGitLabブランチ名として不正な文字を含む場合の追加バリデーションは行わず、既存の非fatalエラー時ERROR方針に委ねる。(4)MRタイトルをAuto MR by yadokari: update ${tenantId}/${clientId} ${N} app image tag(s)に変更。(5)オールオアナッシングの範囲をchartリポジトリ全体→そのクライアント内の全アプリに縮小（本変更の主目的）。(6)既存MRオープン中のスキップ判定もクライアントの固定ブランチ単位に変更。(7)異なるclientが同じvalues.yamlを共有するケースは追加バリデーションせず既知の制限としてドキュメントに明記のみ。(8)CONCURRENCY_LIMITの意味を「chartリポジトリの同時処理数」→「(chartディレクトリ,tenantId,clientId)単位の同時処理数」に定義し直し、2段階の同時実行数制御は導入しない。(9)同じtenantId/clientIdが複数chartディレクトリにまたがるケースは従来からchartディレクトリ単位で別MRだったため影響なし。ユーザーに最終確認済み（「OK。お願い。」）。docs/requirements-grilling.mdに新ラウンド「MRの分割単位をtenantId/clientId単位に変更（T-019）」として記録。docs/requirements.md 2.1節（MRの単位の記述）・用語表（テナント/クライアント行）・4.2節（更新ワークフロー全面書き換え）・4.3節（オールオアナッシング範囲・並列実行数の定義）を更新。docs/glossary.md・docs/architecture.md・実際のコード（src/types.ts、src/lib/config.ts、src/lib/gitlab/gitlab.ts等）は未着手（実装は別タスクに切り出す）

## T-020

**タスク**: T-019で確定した「MRを(chartリポジトリ, tenantId, clientId)単位に分割する」要件を実装する。ChartAndApps型にtenantId/clientIdを追加し、config.tsのグルーピングをtenantId/clientIdごとの独立エントリに変更、ブランチ名をfeature/yadokari/<tenantId>/<clientId>に、MRタイトルをAuto MR by yadokari: update ${tenantId}/${clientId} ${N} app image tag(s)に変更する

**dependencies**: T-019

**evidence**: コード変更なし（判断・要件定義のみ）。【2026-09-05 実機確認】gitlab.com（yadokari-smoke-test-chart, projectId 86061211）で1chartディレクトリ配下の tenant1/client1・tenant1/client2 を定義して実行し、feature/yadokari/tenant1/client1 と .../client2 の2ブランチ＋MR !11/!12 が独立して作られること、client1にオープン中MRがあってもclient2はブロックされないこと、片方がERROR（存在しないアンカー）でも他方はCREATEDになり終了コードが1（PARTIAL_FAILURE）になることを確認

**当時のevidence**: src/types.tsにTenantId/ClientIdブランド型（toTenantId/toClientId）を追加し、ChartAndAppsにtenantId/clientIdフィールドを追加（JSDocも「MRを作成する単位」に更新）。src/lib/config.tsのloadApps()をloadClientChartAndApps()にリネーム・全面改修し、tenantId/clientIdごとに独立したChartAndAppsを1件返す形に変更（以前はchartDir配下の全tenantId/clientIdを1つのapps配列に集約していた）。config.yamlが存在しないtenant/clientディレクトリからはChartAndApps自体を作らない（before: 空appsのChartAndAppsを1件作っていた）。loadConfig()もflatMapベースに書き換え。src/lib/gitlab/gitlab.tsのUPDATE_BRANCH定数（固定値yadokari/update）を削除し、buildUpdateBranch(tenantId, clientId)関数（feature/yadokari/<tenantId>/<clientId>）に置き換え。buildMrTitle()にtenantId/clientId引数を追加しタイトルにAuto MR by yadokari: update ${tenantId}/${clientId} ${N} app image tag(s)を組み込み。src/steps/filter-targets.ts・apply-updates.ts・build-plans.tsのlogContextにtenantId/clientIdを追加、branchをbuildUpdateBranch()経由で取得するよう変更。test/helpers.tsのmakeChartAndApps()にtenantId/clientId（デフォルトtenantId1/clientId1）とoverrides引数を追加。test/lib/config.test.ts（複数tenant/clientの集約テストを「別々のChartAndAppsになる」に書き換え、target絞り込みテストを新しい粒度に合わせて修正、config.yaml不在テストをChartAndApps自体が作られないことの確認に変更、6テスト修正）・test/lib/gitlab/gitlab.test.ts（UPDATE_BRANCH→buildUpdateBranchのテストに置き換え、buildMrTitleのテストにtenantId/clientId引数を追加）・test/steps/apply-updates.test.ts（buildUpdateBranch/buildMrTitleの自動モックにvi.mocked().mockReturnValue()で戻り値を明示的にスタブ、ブランチ名アサーションをfeature/yadokari/tenantId1/clientId1に更新）・test/steps/filter-targets.test.ts（buildUpdateBranchのモック実装を追加、tenantId/clientIdを含むブランチで判定することの確認テストと、同じchartリポジトリでも異なるclientが独立して判定される（片方にオープン中MRがあっても他方はブロックしない）ことを確認する新規テストを追加）を更新。README.md（Features・仕組みのmermaid図と説明文・実行ログ例・環境変数表・エラーハンドリング表）・.gitlab-ci.yml（CONCURRENCY_LIMITの説明文言）・docs/architecture.md（gitlab.ts/config.tsの責務説明、loadApps→loadClientChartAndAppsのリネーム反映、buildChartUpdate()という別セッションからの古い関数名参照も合わせて修正）・docs/glossary.md（「固定ブランチ」「テナント/クライアント」項目を新設計に更新）を更新。pnpm check（tsc/oxlint/oxfmt/vitest 266テスト）通過。gitlab.com実機での動作確認は未実施（次回実施するなら、1つのchartディレクトリ配下に複数tenantId/clientIdを持つテスト用config構成が必要）

## T-021

**タスク**: ユーザー指摘（「T-015はもはや問題ないんじゃないか、定期実行後に手動実行したければMRを閉じればいい。ただしMRをクローズしてもブランチが残り続ける仕様になっているなら、MRが存在せずブランチが存在する場合は削除する仕様にしたい」）を受けて、既存の固定ブランチの再作成漏れバグを修正する。docs/requirements.mdには元々「マージまたはクローズされた後の実行で、改めて固定ブランチを作り直しMRを作成する」と明記されていたが、実装（commitFileUpdates()）はブランチが存在する場合は削除せず追加コミットを積むだけだった

**dependencies**: T-020

**evidence**: コード変更なし（判断・要件定義のみ）。【2026-09-05 実機確認】MR !12 をクローズしブランチを残した状態で再実行し、feature/yadokari/tenant1/client2 のHEADが 6226e559→97e2c7f1 に変わり履歴が「main(c96614e1)＋新コミット1つ」のみ（＝追加コミットではなく削除して作り直し）になること、新MR !13 が作成されることを確認

**当時のevidence**: src/lib/gitlab/gitlab.tsにdeleteBranch(gitlab, projectId, branch)（gitlab.Branches.remove()のラッパー）を新設。commitFileUpdates()を全面改修: 呼び出し元（filterTargets）が「このブランチにオープン中のMRが無い」ことを確認済みという前提を明文化し、branchExists()がtrueならdeleteBranch()で削除してからbaseBranchを起点に作り直すよう変更（以前はexists ? branch : baseBranchという参照先ブランチの出し分けで追加コミットしていた）。ファイルごとのaction（create/update）判定も、ブランチを必ず作り直す前提のため常にbaseBranch基準に単純化（従来のexists変数によるreferenceBranch分岐を削除）。commit時のstartBranchオプションも常に指定するよう単純化（以前はexists ? {} : {startBranch: baseBranch}だった）。test/lib/gitlab/gitlab.test.tsのcommitFileUpdatesテストを新仕様に書き換え（「ブランチが存在しないとき、削除せずbaseBranchから新規作成する」「ブランチが既に存在するとき、削除してからbaseBranchを起点に作り直す」「actionの判定は常にbaseBranch側のファイル存在有無で行う」の3テストに再編、makeClientヘルパーのBranches型にremoveを追加）、deleteBranch単体のテストを追加。docs/requirements.md 4.2節（削除してから作り直す旨とT-021参照を追記）・docs/requirements-grilling.md（新ラウンドとして経緯を記録）・docs/architecture.md（gitlab.tsの責務説明を更新、ついでに前セッションの編集でoxfmtの多段階整形により3階層ネストのリストが1階層に潰れて壊れていたのを修正）・docs/glossary.mdの「固定ブランチ」項目を更新。pnpm check（tsc/oxlint/oxfmt/vitest 267テスト）通過

## T-022

**タスク**: steps/3ファイルに散らばる定型コードの重複を解消するか、現状維持を設計判断として明文化して決着させる。現状: (a) `logContext`（event/chartDir/tenantId/clientId/chartProjectId/chartProjectName の6行）が filter-targets.ts・build-plans.ts・apply-updates.ts で完全に一致、(b) `describePlan()` が build-plans.ts:108-122 と apply-updates.ts:26-40 で1文字も違わず重複（docs/architecture.md には「共有するほどの技術依存がないためあえて共有しない」と記載済み）、(c) catch節の `isFatalError→FatalError再スロー / それ以外はlogger.errorしてERROR返却` が3箇所でほぼ同一。CLAUDE.md原則2では lib/ は技術依存のみ、utils/ はドメイン知識なしと定めているため、AppUpdatePlan/ChartAndApps というドメイン型に依存するこれらの置き場所がどちらにも当てはまらないのが論点。選択肢: steps/sub-steps/ に共有ファイルを作る / lib/ の判断基準を見直す / 現状維持を docs/architecture.md に理由付きで再確認する

**evidence**: コード変更なし（判断・要件定義のみ）。

**当時のevidence**: 判断: 3つとも共通化する。置き場所は `src/steps/shared/step-outcome.ts` を新設した（`utils/`は「ドメイン知識を一切持たない」場所なので`ChartAndApps`/`AppUpdatePlan`に依存するこれらは置けず、技術依存が無い以上`lib/`にも置けず、複数stepから呼ばれるため特定stepの`sub-steps/`でもない、という消去法。以前 lib/log-context.ts が原則2違反として削除された経緯があるため、`lib/`には戻さない形にした）。中身は3つ: `buildLogContext(chartAndApps)`（3ファイルで完全一致していた6行）、`describePlan(plan)`（build-plans.ts と apply-updates.ts で1文字も違わなかった15行）、`settleAsError(err, logContext)`（`isFatalError()`ならFatalErrorを投げ直し、それ以外はERRORとして記録して続行するエラー方針そのもの。3つのcatch節に重複していた8行が各1行になった）。特に3つ目は README/CLAUDE.md に明文化されている「401/5xx/ネットワーク障害は即時終了、それ以外は該当chartAndAppsのみERRORで継続」という方針の唯一の実装箇所になり、3箇所でズレる余地が無くなった。行数: filter-targets.ts 78→66、build-plans.ts 285→256、apply-updates.ts 88→60、新規 step-outcome.ts 60。CLAUDE.md の「新しいコードを置く場所」に`steps/shared/`の判断基準を追記、docs/architecture.md の各ファイルの責務・判断基準・apply-updates.ts の「あえて共有しない」という旧記述を更新、README.mdのツリーにも追加。テストは公開API経由のため変更不要（logger のモックもモジュール単位なのでそのまま有効）。pnpm check（19ファイル268テスト）通過。コミットは未実施（ユーザー承認待ち）

## T-023

**タスク**: filter-targets.ts の `filterTargets()` と build-plans.ts の `buildPlans()` が持つ、判別可能ユニオンの outcome 配列を2つのバケツに振り分ける reduce（`outcome.status === "target"/"apply"` で分岐し、片方を targets/toApply、もう片方を settled に積む）が同型の重複になっている。ドメイン知識を持たない純粋計算なので、CLAUDE.md の判断基準どおり utils/ に汎用の partition ユーティリティとして切り出せるか検討し、切り出すならテストも追加する

**evidence**: pnpm check（5テスト）通過。

**当時のevidence**: src/utils/partition.ts を新設し、`partitionMap(items, split)` と振り分け結果の組み立て関数 `left()`/`right()` を公開（`Sorted<L, R> = {left: L} | {right: R}`）。src/steps/filter-targets.ts・src/steps/build-plans.ts の8行のreduceを、それぞれ3行の `partitionMap()` 呼び出し＋分割代入に置き換え（振り分けの判定式と取り出す値だけが残る形になった）。実装過程で2つの型設計が失敗したため記録: (1) `split()` の戻り値をオブジェクトリテラルのまま `{left: L} | {right: R}` に渡すと、ternaryの正規化で `right?: undefined` が付きLが `T | undefined` に推論されてtscエラー、(2) `{side: "left", value: L} | {side: "right", value: R}` という判別子つきの形にすると、両arm共通の `value` からLとRを取り違えて推論する（`Sorted<ChartUpdateTarget, ChartUpdateTarget>` になった）。最終的にプロパティ名自体（left/right）で側を表す形にし、値の生成を `left()`/`right()` 関数経由にすることで正しく推論されるようになった。test/utils/partition.test.ts を新設（5テスト: 値の取り出し・入力順の保持・空配列・片側0件・入力配列を変更しない）。README.mdのプロジェクト構成ツリー・docs/architecture.mdのutils/節にも追記（型設計の理由も記録）。pnpm check（19ファイル268テスト）通過。コミットは未実施（ユーザー承認待ち）

## T-024

**タスク**: イメージタグ側とHelm向き先ブランチ側の構造的な4重複を整理するか、意図的な分離として明文化する。(a) `ImageTagTarget` と `HelmTargetBranchTarget`（src/types.ts）は valuesPath+anchor で構造が完全に同一、(b) src/lib/config.ts の `ImageTagTargetSchema` と `HelmTargetBranchTargetSchema` も transform 先の型名以外は同一、(c) `ApplyTargetsAcc`（image-tag-target.ts）と `ApplyHelmTargetsAcc`（helm-target-branch-target.ts）は updates の要素型だけが違う、(d) `applyImageTagTargets()` と `applyHelmTargetBranchTargets()` の複数形ラッパーも targets を reduce で回すだけの同型。ジェネリック化・共通型化する案と、意味の異なる2つの概念として型レベルで分けたままにする案（現状）のどちらを取るか決め、後者なら types.ts / docs/architecture.md にその理由を書く

**evidence**: pnpm check（4テスト）通過。

**当時のevidence**: 判断の決め手: TypeScriptは構造的型付けなので、同じ形の `ImageTagTarget` と `HelmTargetBranchTarget` を別々に定義しても取り違えは防げない（現状すでに相互代入可能で、安全性は1ミリも足されていなかった）。したがって「分けておけば安全」という理由は成立せず、共通化してもデメリットが無い、と結論して4つとも整理した。(a) src/types.ts に `AnchorTarget`（valuesPath+anchor）を定義し、`ImageTagTarget`/`HelmTargetBranchTarget` はそのエイリアスにした（名前は読み手への用途の説明として残す）。(b) src/lib/config.ts の同一だった2つのzodスキーマを `AnchorTargetSchema` 1つに統合し、`apps[].chart[]`・`helm.chart[]` の両方から使う。(c) sub-steps/build-plans/types.ts に `ApplyTargetsAcc<U>` を新設し、`ApplyImageTagAcc = ApplyTargetsAcc<ImageTagUpdate>`・`ApplyHelmTargetsAcc = ApplyTargetsAcc<HelmTargetBranchUpdate>` のエイリアスにした（`ApplyTargetsAcc`→`ApplyImageTagAcc`への改名で、どちらのAccか名前から分かるようにした）。(d) `accPromise.then(...)`で繋ぐ逐次reduceが image-tag-target.ts・helm-target-branch-target.ts・build-plans.ts のアプリ単位ループの3箇所に重複していたため、src/utils/sequential.ts の `reduceAsync(items, initial, fn)` に共通化（`parallel.ts` の `mapWithConcurrency()` の逐次版という位置づけ）。test/utils/sequential.test.ts を新設（4テスト: 積み上げ・逐次実行の順序・空配列・途中例外で以降を処理しない）。実装上の注意点として `Promise.resolve(initial)` はジェネリックな `Acc` に対し `Promise<Awaited<Acc>>` と推論されて代入できないため、`as` を使わずに async 関数の戻り値で初期Promiseを作っている（理由をコードコメントに記載）。docs/architecture.md（utils/sequential.ts・sub-steps types.ts の説明）・README.mdのツリー・docs/glossary.md（anchor 2項目に AnchorTarget エイリアスを注記）を更新。pnpm check（20ファイル272テスト）通過。コミットは未実施（ユーザー承認待ち）

## T-025

**タスク**: dead code と小さな品質の穴を掃除する。(a) `src/utils/object.ts` の `isPlainObject()` は src/ からの参照が0件で test/utils/object.test.ts からしか呼ばれていない（js-yaml 廃止前の名残と思われる）→ 実装・テスト・README のプロジェクト構成から削除する、(b) `src/utils/retry.ts` の `let lastError` と末尾の `throw lastError` はループが必ず return か throw で抜けるため到達不能。CLAUDE.mdの「基本constを使う」規約にも反するので削除する、(c) `src/utils/cache.ts` の `getOrFetch()` が `cached !== undefined` で判定しているため、値として undefined を持てるキャッシュでは毎回 fetch が走る（現状の利用箇所は string/boolean/GitLabUrl のみなので実害はないが、以前の監査でも潜在的な穴として指摘済み）→ `cache.has(key)` ベースに変えるか、型で undefined を排除する、(d) vitest.config.ts が junit reporter を常時有効にしているためローカルの `pnpm test` のたびに test-results.xml が生成される（gitignore済み）。CI のときだけ有効にできないか検討する

**evidence**: pnpm check（4テスト）通過。

**当時のevidence**: (a) src/utils/object.ts と test/utils/object.test.ts を削除（src/ からの参照0件をgrepで確認済み）、README.mdのプロジェクト構成ツリーからも object.ts の行を削除。(b) src/utils/retry.ts の `let lastError` + 到達不能な `throw lastError` を廃止し、再帰ヘルパー `runAttempt(fn, attempt, maxAttempts, baseDelayMs)` + `sleep()` に書き換え。`let`・for文が消え、CLAUDE.mdの「基本constを使う／値を返す関数に切り出す」規約に沿った形になった（既存のretryテスト7件は変更なしでpass＝挙動不変）。(c) src/utils/cache.ts の `getOrFetch()` の型引数を `V extends {}` に制約し、undefined/nullを値に持てないことを型で保証（`as`を使わずに穴を塞ぐ方法を選択。現利用箇所は string/boolean/GitLabUrl のみで影響なし）。(d) vitest.config.ts の reporters を `process.env["CI"] ? ["verbose","junit"] : ["verbose"]` に変更。ローカルの pnpm test では test-results.xml が生成されないこと、`CI=true npx vitest run` では従来どおり生成されることの両方を実行して確認（GitLab CIは CI=true を自動設定するため .gitlab-ci.yml の junit artifact 設定は変更不要）。pnpm check（tsc --noEmit + oxlint + lint:validate-config + oxfmt --check + vitest 18ファイル263テスト）通過（テスト件数267→263はisPlainObjectのテスト4件削除によるもの）。コミットは未実施（ユーザー承認待ち）

## T-026

**タスク**: 3ステップの「1件分を処理する関数」の命名を揃える。現状 filter-targets.ts は `alreadyMrExists()`、build-plans.ts は `process()`、apply-updates.ts は `applyUpdate()` とバラバラで、(a) `alreadyMrExists()` は述語のような名前なのに実際は `TargetOutcome`（target か settled か）を返す、(b) build-plans.ts の `process()` はグローバルの `process` と main.ts のオーケストレータ `process()` の両方と名前が衝突しており、実際に過去のセッションで意図しないリネームが紛れ込んだ事故が progress.md に記録されている。3ファイルで一貫した命名規則（例: `processChartAndApps()` / `evaluateTarget()` など）を決めて統一する

**evidence**: コード変更なし（判断・要件定義のみ）。

**当時のevidence**: 命名規則を「各stepの並列処理1件分を担う非公開関数は `<動詞>+単数形の対象`」と決め、filter-targets.ts の `alreadyMrExists()` → `evaluateTarget()`、build-plans.ts の `process()` → `planTarget()` にリネーム（apply-updates.ts の `applyUpdate()` は既にこの規則に沿っているため変更なし）。`process` という名前が src/ から消え、main.ts のオーケストレータ `process()` とグローバルの `process` との衝突も解消。あわせて両関数に「このstepの並列処理1件分」であることを明示するJSDocを追加（`alreadyMrExists` は述語のような名前なのに TargetOutcome を返し、かつ登録アプリ0件のケース＝MRと無関係の判定も担っていた点を解消）。docs/architecture.md の build-plans.ts 節の `process()` 表記を `planTarget()` に修正し、steps/ 節に命名規則そのものを追記。テストは公開API（filterTargets/buildPlans）経由でのみ検証しているため変更不要。pnpm check（19ファイル268テスト）通過。コミットは未実施（ユーザー承認待ち）

## T-027

**タスク**: src/steps/build-plans.ts の `buildAppUpdatePlan()` が位置引数を8個（gitlab, dryRun, tagFormat, loadValuesYamlContent, chartProjectId, branchExistsCache, acc, app）取っており、同じ並びを `buildPlan()` 側でも組み立てている。うち gitlab/dryRun/tagFormat/loadValuesYamlContent/chartProjectId/branchExistsCache は1つのchartAndApps処理中ずっと不変なので、コンテキストオブジェクト1つ＋（acc, app）にまとめられないか検討する。同様の引数の多さは `applyHelmTargetBranchTarget()`（7個）にもある

**evidence**: コード変更なし（判断・要件定義のみ）。

**当時のevidence**: build-plans.ts に非公開の `BuildPlanContext` 型（gitlab / dryRun / tagFormat / loadValuesYamlContent / branchExists）を新設し、`buildAppUpdatePlan(context, acc, app)` の3引数に削減（8→3）。あわせて helm 側のデータクランプ（gitlab + chartProjectId + branchExistsCache が常に一緒に渡されていた）を、既存の `LoadValuesYamlContent` と同じ「関数を渡す」やり方に統一: sub-steps/build-plans/types.ts に `BranchExists = (branch: BranchName) => Promise<boolean>` を追加し、build-plans.ts の `buildPlan()` 側で GitLabクライアント・chartのprojectId・`branchExistsCache` を閉じ込めた関数を組み立てて渡すようにした。この結果 helm-target-branch-target.ts は `lib/gitlab/` にも `utils/cache.ts` にも依存しなくなり（importが5→3）、`applyHelmTargetBranchTargets()` は6→4引数、非公開の `applyHelmTargetBranchTarget()` は7→5引数になった。キャッシュ共有の挙動は変わらない（chartAndApps単位で同じMapを使い回す）。テストは公開API経由のため変更不要で、既存のgitlabモック（branchExists）もそのまま有効。pnpm check（19ファイル268テスト）通過。docs/architecture.md の helm-target-branch-target.ts / types.ts の責務説明を更新し、ついでに types.ts のdocコメントにあった「`build-plans.ts`の`build-plans.ts`の」という重複表記も修正。コミットは未実施（ユーザー承認待ち）

## T-028

**タスク**: README.md「設定 > config/」章と docs/requirements.md 4.4節が、config.yaml/anchors.yaml のYAML例・helm.chart[] の制約説明・整合性検証の説明までほぼ同一内容で二重管理されている状態を解消する。既にドリフトも発生しており、apps[].projectId の例が README では 1、requirements.md では 888（同じファイルの chart.yaml の projectId 888 と同値で、ソースリポジトリとchartリポジトリの区別が付きにくい）になっている。どちらを正典にするか（要件はrequirements.md、利用者向け手順はREADME等）を決め、もう片方は要約＋リンクに寄せる

**evidence**: コード変更なし（判断・要件定義のみ）。

**当時のevidence**: 正典を docs/requirements.md 4.4節に決定し、同節の冒頭に「この節が正典。README『設定 > config/』章は要約で、フィールドを追加・変更したときはこの節を先に更新する」と明記。README側は「セットアップに必要な範囲の要約」に絞り込み、重複していた散文（`chart`複数指定の説明とmulti-service-appのYAML例13行、整合性検証3パターンの段落、Helm向き先ブランチの制約3段落）を削除して、代わりに設定エラーになる主なケースの3項目リスト＋requirements.mdへのリンクに置き換えた（ディレクトリ構成図・3ファイルの最小YAML例・helmの2例は実用上必要なのでREADMEに残した）。README.md 379→358行。ドリフトしていた例も修正: docs/requirements.md の config.yaml/anchors.yaml 例の `apps[].projectId` が chart.yaml と同じ 888 でソースリポジトリとchartリポジトリの区別が付かなかったため、READMEと同じ 1 に統一し「chart.yamlのprojectIdとは別物」というコメントも追加（helm の2例も同様に統一）。pnpm check 通過（20ファイル272テスト）。コミットは未実施（ユーザー承認待ち）

## T-029

**タスク**: ドキュメント・設定サンプルの実態ドリフトをまとめて修正する。(a) README.md「プロジェクト構成」のツリーが古く、`src/steps/sub-steps/build-plans/`（4ファイル）・`scripts/lint/validate-config.ts`・`docs/`・`config-test/` がどれも載っていない、(b) `config-test/`（gitlab.com実機スモークテスト用のフィクスチャ。`CONFIG_PATH=config-test` で使う）は README・docs・CLAUDE.md のいずれにも説明がなく tasks.json の evidence にしか登場しない → 位置づけを明記するか、不要なら削除する、(c) .env.example の CONCURRENCY_LIMIT の説明が「chartリポジトリの並列処理数」のままで T-019/T-020 の粒度変更（(chartリポジトリ, tenantId, clientId)単位）に追従していない、CONFIG_PATH も「ファイルまたはディレクトリのパス」と書かれているが実際はディレクトリのみ

**evidence**: コード変更なし（判断・要件定義のみ）。

**当時のevidence**: (a) README.mdのプロジェクト構成ツリーに `src/steps/sub-steps/build-plans/`（4ファイルそれぞれの役割つき）・`scripts/lint/validate-config.ts`・`config-test/`・`docs/` を追加し、`test/` の説明も「src/ と同じディレクトリ構成」に補足。(b) `config-test/` の位置づけ（実GitLabに対する手動スモークテスト用フィクスチャ、`CONFIG_PATH=config-test DRY_RUN=true` で使う、CIからは参照されない）をREADMEのツリー直後とdocs/architecture.mdの「ディレクトリ構成の勘所」の両方に明記。(c) .env.example を現仕様に追従: CONFIG_PATH「設定ファイルまたはディレクトリ」→「設定ディレクトリ」、CONCURRENCY_LIMIT「chartリポジトリの並列処理数」→「(chartリポジトリ, テナント/クライアント)単位の同時処理数（1〜20の整数）」、DRY_RUNの説明にタグ作成のスキップを追記。あわせてREADMEには載っていたのに .env.example に無かった TARGET_CHART_DIR / TARGET_CLIENT のコメント例も追加。pnpm check（19ファイル268テスト）通過。コミットは未実施（ユーザー承認待ち）

## T-030

**タスク**: progress.md（66KB/664行）と tasks.json（49KB、evidence 1件で数千文字）の肥大化・二重管理を解消する。docs/workflow.md は evidence を「コミットハッシュ・テスト件数・生成物へのパス」と定義しているが、実際には設計変更の経緯・撤回した案・実機検証の詳細まで全部入りになっており、同じ内容が progress.md の「完了したこと」にも重複して書かれている。毎セッション冒頭に両方読む運用（CLAUDE.md）のコストが上がり続けているため、完了済みタスクの詳細を docs/history/ 等へアーカイブし、progress.md は直近の状態＋次にやること＋未解決＋注意に絞る。あわせて docs/workflow.md に「evidenceに書くこと／書かないこと」の線引きを追記する

**evidence**: docs/history/ を新設し、情報を捨てずに退避した。(1) tasks.json: evidenceが400文字を超えていた完了タスク21件の全文を docs/history/tasks-archive.md にタスクIDごとの節として移し、tasks.json 側は「コミットハッシュ＋pnpm checkのテスト件数＋アーカイブへの参照」に置き換え（49KB→28KB）。(2) progress.md: 過去セッション分の「完了したこと」638行を docs/history/progress-archive.md へ移し、本体は冒頭のサマリ＋このセッションの完了分＋次にやること＋未解決＋注意だけにした（66KB/664行→7.7KB/85行）。アーカイブは当時の記述のまま（当時のファイル名・型名も書き換えない）。(3) docs/workflow.md に「evidenceに書かないこと」（設計変更の物語・撤回した案・実機検証手順の詳細・変更ファイルの列挙、目安3行以内）と、肥大化したときのアーカイブ運用を追記。(4) CLAUDE.mdの関連リンクにアーカイブ2ファイルを追加し「セッション開始時に読む必要はない」と明記。毎セッション冒頭に読むのは 7.7KB + 28KB になり、以前の 115KB から約7割削減。pnpm check（20ファイル272テスト）通過。コミットは未実施（ユーザー承認待ち）

## T-031

**タスク**: docs/architecture.md（195行）の整理。(a) 各ファイルの責務説明がコード側のJSDocをほぼ逐語で二重管理しており（例: build-plans.ts の4手順、gitlab.ts の commitFileUpdates の挙動、config.ts の検証3パターン）、片方だけ更新される事故が起きやすい、(b) 「以前は〜だったが〜に統合した」「T-021。以前は〜が実装されていなかった」といった変更履歴が責務説明の本文に混在していて、現在の設計を読み取る妨げになっている。責務は1〜2行の要約＋コードへのポインタに寄せ、履歴は docs/requirements-grilling.md かアーカイブ側へ移すことを検討する

**dependencies**: T-030

**evidence**: docs/architecture.md を227→153行に整理。(a) 冒頭に「各関数の詳しい振る舞いはコード側のJSDocが正典。このドキュメントは責務の要約と、コードを読んでも分からないことだけを書く」と方針を明記し、JSDocを逐語で写していた箇所（build-plans.tsの4手順、gitlab.tsのcommitFileUpdatesの挙動、config.tsの検証3パターンと絞り込みの仕様、helm.tsの実装詳細など）を、steps/lib/utils それぞれ1行1ファイルの責務テーブルに置き換えた。config/のスキーマ仕様は T-028 で正典と定めた docs/requirements.md 4.4節へのポインタに変更。(b) 本文に混在していた変更履歴（「以前は〜」「T-021。以前は〜」）を独立した「コードからは読み取れない設計判断」節に集約し、8項目の1〜3行エントリ（なぜtag.tsがlib/gitlab/にあるか、なぜjs-yamlでなくyamlか、なぜapp-update-plan.tsを廃したか、なぜサブステップがGitLabクライアントを受け取らないか等）＋詳細はT-030で作った docs/history/tasks-archive.md 参照、という形にした。「新しいコードを置く場所の判断基準」「既知の制約・注意点」は現役の判断材料なのでそのまま残し、逐次実行の理由（キャッシュ共有）とT-003の判断だけ補った。pnpm check（20ファイル272テスト）通過。コミットは未実施（ユーザー承認待ち）

## T-032

**タスク**: 存在しないアンカー・存在しないブランチ・架空のprojectIdといった「YAMLの形は正しいが実体が無い」設定ミスを、本番実行時のERRORではなくCIで事前に検知できるようにする。監査時点では pnpm lint:validate-config（＝CIのcheckジョブ）がローカルのYAMLしか見ておらず、これらは素通りしていた。あわせて、config.yaml内のprojectId重複や同じvaluesPath+anchorの奪い合いのように、実機を見なくても分かるのに検知できていなかった設定ミスも塞ぐ

**dependencies**: T-020, T-021

**evidence**: 認証不要のローカル検証（config.ts に validateNoDuplicateProjectIds / validateNoDuplicateTargets を追加、テスト6件）と、GitLabへ問い合わせる実在チェック（src/lib/verify-config.ts の verifyConfigExistence、テスト10件）の2段構成にした。後者は scripts/lint/validate-config.ts の --remote（pnpm lint:validate-config:remote）から呼び、.gitlab-ci.yml に validate-config-remote ジョブ（MR/push/web）を追加。ユーザー判断で ACCESS_TOKEN は Protected: OFF とし、ジョブは条件付きスキップにせず必ず実行する（認証情報が無い場合は「実在チェックを実行できません（環境変数 ... が未設定です）」と表示して exit 1）。実機確認: 正しい config-test/ は OK、わざと壊した設定で「branchToSync/アンカー/helm.branchToSync/projectId」の4件を同時に検出し終了コード1、mrTargetBranch不在時も従来の誤解を招くメッセージ（values.yamlが見つかりません）ではなく原因1件のみを報告することを確認。pnpm check（21ファイル288テスト）通過

## T-033

**タスク**: 「複数clientの複数appのimage tagが更新され、いずれかのclientではHelmの向き先ブランチも更新される」というシナリオを実機で検証する。あわせて、同じ検証を何度でも繰り返せるように手順とフィクスチャを記録に残す

**dependencies**: T-032

**evidence**: docs/smoke-test.md（手順・期待結果・繰り返し時の注意）と scripts/smoke/smoke-fixture.ts（setup/reset、既定dry-run、SMOKE_CHART_PROJECT_ID必須）、config-test/yadokari-smoke-test-chart/tenant2/{client1,client2} を追加。実機結果: summary {CREATED:2, SKIPPED:0, ERROR:0}・終了コード0で、client1 はMR !14（sample-qa-sprint と sample-develop-client のタグ2件＋向き先ブランチ main→release/2026-q1 の計3アンカー）、client2 はMR !15（タグ2件）を独立したブランチに作成。向き先ブランチ用に chartリポジトリへ release/2026-q1 を新規作成し、書き込み前の実在検証を通ることも確認。MRを残したまま再実行すると両clientが SKIPPED(mr_exists) になることも確認（手順書の注意書きの裏取り）

## T-034

**タスク**: MRのタイトルと本文（description）が「実際に何が変わったか」を正しく表せていないため、表現を再考して直す。T-033の実機検証で見つかった具体的な問題: (1) タイトルは `buildMrTitle()` が `Auto MR by yadokari: update <tenantId>/<clientId> ${plans.length} app image tag(s)` を返すが、`plans` にはHelmの向き先ブランチだけが変わったアプリも含まれる（build-plans.ts の判定は `updates.length === 0 && helmTargetBranchUpdates.length === 0` のときだけ除外する）。そのため image tag が1件も変わっていないのに「N app image tag(s)」と表示されうるし、実際にT-033のMR !14（image tag 2件＋向き先ブランチ1件）も「2 app image tag(s)」としか読めない。(2) 数える単位がアプリ数なので、T-014の「1アプリが複数箇所に同じタグを反映する」ケースでは3箇所書き換えても「1 app」と出る。アプリ数・箇所数・種別（image tag / 向き先ブランチ）のどれをタイトルに載せるか決める必要がある。(3) 本文はアプリ単位のセクション（### projectName、打刻日時、パイプライン）の中に向き先ブランチの行を並べているが、向き先ブランチはclient単位で共通の概念なので所属が分かりにくい。さらに、同じvaluesPathを複数アプリが共有していると、先に処理したアプリが書き換えた時点で差分が消えるため、向き先ブランチの行は最初のアプリのセクションにだけ出る（T-033のMR !14が実際にこの状態）。(4) 打刻日時・パイプラインはタグ由来の情報なので、向き先ブランチだけが変わったアプリのセクションでは無関係な情報として並ぶ。あわせて、タイトルは apply-updates.ts でコミットメッセージにも流用している点を踏まえて決めること

**dependencies**: T-033

**evidence**: 決定（ユーザーと合意）: タイトルは種別ごとの件数を出し件数の単位は書き換え箇所数、本文は「## イメージタグ」「## Helmの向き先ブランチ」の2セクション、イメージタグに差分が無いアプリの節は出さない。src/lib/gitlab/gitlab.ts の buildMrTitle()/buildMrDescription() を書き換え、向き先ブランチの更新を valuesPath+anchor で一意化する uniqueHelmTargetBranchUpdates() を追加（複数アプリへの割り当てによる重複計上・重複表示を解消）。test/lib/gitlab/gitlab.test.ts に10テスト追加（箇所数カウント・種別出し分け・0件時の括弧なし・セクション構成・差分なしアプリの除外・重複まとめ）。pnpm check（21ファイル296テスト）通過。実機のMR !16/!17 で `(image tag 2, helm branch 1)` / `(image tag 2)` と2セクション構成を確認

## T-035

**タスク**: スモークテスト用フィクスチャのシード値を、実在しない `placeholder` ではなく実際のタグ名にする。T-033の実機検証で、初回実行時のMR本文が旧値を `[placeholder](…/-/tags/placeholder)` とタグURLでリンクし、存在しないタグへのリンク（404）と壊れた比較URL（`/-/compare/placeholder...main-build-at-…`）を生成することが分かった。実タグをシードすれば初回から本番同様の表示になり、比較リンクも実際に機能する。実装上の制約: シード値は「最新タグより古い実在のタグ」である必要がある（同じだと差分なしで SKIPPED になりシナリオが成立しない）。sample-qa-sprint（82861978）には `main-build-at-20260903-171213` という古いタグがあるが、sample-develop-client（82861977）はHEADを指す `main-build-at-20260903-143646` の1件しか持たないため、古いコミットに追加でタグを打つ等の準備が要る。対象は scripts/smoke/smoke-fixture.ts の SEED_FILES と docs/smoke-test.md の記述。あわせて、values.yaml にタグ名でない値（初期構築時や手編集）が入っている場合にCLI側がタグURLを組み立ててしまう点（src/lib/gitlab/gitlab.ts の buildImageTagUpdateLine）を、リンクにせずプレーン表示にするなど緩和すべきかも検討する

**dependencies**: T-033

**evidence**: scripts/smoke/smoke-fixture.ts の SEED_FILES を実タグ（sample-qa-sprint は既存の main-build-at-20260903-171213、sample-develop-client は同リポジトリのコミットが1つしかないため同じコミットに作成した main-build-at-20260101-000000）に変更し、setup が ensureSeedTags() でシードタグの実在を保証するようにした（シードタグより新しいタグが無い場合は警告）。docs/smoke-test.md に前提と制約（develop-client の比較リンクは差分が空になる）を追記。実機で reset→setup→実行のループを回し、MR !16/!17 の旧タグリンク・比較リンクがすべて実在タグを指すことを確認

## T-036

**タスク**: MR本文（description）の見せ方をユーザー指定に合わせて改善する。最終的な指定内容: (1) イメージタグの更新は箇条書きではなくテーブルにする、(2) 列は リポジトリ / ファイル / アンカー / 旧タグ / 新タグ / 比較 / パイプライン、(3) パイプラインは状態（success等）を出さずリンクだけにする、(4) 比較とパイプラインはリンクテキストを付けずURLをそのまま表示する。途中の変遷: 当初案には打刻日時(JST)列があったが、実運用ではCI側がタグを打つため常に「-」になり不要と判断して削除。書き込み先は1列（`ファイル`（アンカー: 名前）の複合表示）から、ファイルとアンカーの2列に分割した

**dependencies**: T-034

**evidence**: src/lib/gitlab/gitlab.ts に buildImageTagRow() を新設し、イメージタグ節を「リポジトリ / ファイル / アンカー / 旧タグ / 新タグ / 比較 / パイプライン」の7列テーブルに、向き先ブランチ節も「旧ブランチ / 新ブランチ / ファイル / アンカー」の4列テーブルに変更。比較・パイプラインはURLをそのまま置き（GitLabが自動リンクする）、値が無いセル（パイプライン無し・旧タグ未設定で比較不可）は「-」に統一。旧タグ・新タグはタグ名をラベルにしたリンクのまま。打刻日時列を出し分けるために一度追加した AppUpdatePlan.latestTagCreated・resolveLatestTag() の {tag, created} 戻り値・formatJst() は、列が不採用になった時点で撤去した（未使用コードを残さないため）。test/lib/gitlab/gitlab.test.ts のdescription系テストを全面書き換え（14テスト。列構成・ファイル/アンカーの分割・URL直書き・打刻日時を出さないこと・重複まとめを含む）。pnpm check（21ファイル295テスト）通過。実機のMR !22/!23 で表示を確認

## T-037

**タスク**: (1) 反映済みタグが追跡ブランチの現在のHEADコミットを指している場合は、より新しい名前のタグが存在しても更新しないようにする。T-035のスモークテストで、sample-develop-client の反映済みタグ（main-build-at-20260101-000000）と最新タグ（main-build-at-20260903-143646）が同じコミットを指しているのに更新MRが作られ、デプロイされる中身が変わらないのに差分だけが出る状態になっていた。(2) MR本文に各アプリの設定（追跡ブランチなど）も出して、なぜそのタグが選ばれたのかをレビュアーが追えるようにする

**dependencies**: T-036

**evidence**: (1) sub-steps/build-plans/types.ts に LatestTagResolution 型（tag ＋ pointsAtTrackedHead）を追加し、resolveLatestTag() が「values.yamlの現在値が追跡ブランチのHEADを指すタグか」を判定する関数を返すようにした（タグ一覧とHEAD SHAは既に取得済みなのでAPI呼び出しは増えない）。image-tag-target.ts の1箇所分の判定に、現在値がHEADを指すタグなら更新しない分岐を追加。test/steps/build-plans.test.ts に3テスト追加（HEADを指す旧タグはより新しいタグがあってもSKIPPED／古いコミットを指す旧タグは従来どおり更新／タグ名でない値も従来どおり更新）。docs/requirements.md 4.1節に仕様として追記。(2) MR本文のイメージタグ表に「追跡ブランチ」列を追加（列は リポジトリ / 追跡ブランチ / ファイル / アンカー / 旧タグ / 新タグ / 比較 / パイプライン）。pnpm check（21ファイル299テスト）通過。実機で再検証し、tenant2/client1 の sample-develop-client が新ルールで更新対象から外れ（MR !24 は image tag 1 件のみ）、values.yaml の該当アンカーが据え置かれることを確認

## T-038

**タスク**: CIの `validate-config-remote` ジョブが、現状のリポジトリでは必ず失敗する状態になっているのを解消する。このジョブは引数なしで `pnpm lint:validate-config:remote` を実行するため既定の `config/` を検証するが、`config/teamA-chart/` はドキュメント用の**架空の設定例**（projectId 888/889/890）なので、実行すると「chart.yaml の projectId 888 が見つかりません」など4件の問題を検出して exit 1 になる（実際にトークン付きで実行して確認済み）。T-032でこのジョブを「条件付きスキップにせず必ず実行する」と決めたため、このままCIを有効化すると全MRがブロックされる。取りうる選択肢: (a) `config/` を実運用の設定だけにして架空の例は `docs/` かREADMEの記載に移す、(b) 例を `config-example/` のような別ディレクトリに追い出す、(c) 実在チェックの対象ディレクトリをCI変数で明示する（例: `CONFIG_PATH` を使う）、(d) 架空エントリを実在するプロジェクトIDに置き換える。どれを取るかは「config/ に何を置く運用にするか」次第なので、方針を決めてから直す

**difficulty**: opus

**dependencies**: T-032

**evidence**: ユーザー判断で選択肢(a)を採用: config/ には実運用の登録だけを置き、架空の設定例は置かない。config/teamA-chart/（chart.yaml・config.yaml・anchors.yaml）を削除し、代わりに config/README.md に運用ルール（正典は docs/requirements.md 4.4節／架空の例を置くと validate-config-remote が必ず落ちる／登録0件のあいだは検証対象なしでパスする）を置いた。削除した内容は requirements.md 4.4節に同等のYAML例が既にあるため情報の損失なし（削除ファイルにあった "anchor-setting.yaml" という古い名前のコメントも消えた）。README の Quick Start 手順（cp -r config/teamA-chart …）・プロジェクト構成ツリー、docs/architecture.md も更新。実機確認: pnpm lint:validate-config → 「0 chart groups, 0 apps」でOK、pnpm lint:validate-config:remote → 実トークンで「config OK（実在チェック）」・終了コード0。pnpm check（28ファイル302テスト）通過

## T-039

**タスク**: T-034〜T-037でMRの出力仕様を変えた結果、ドキュメント側に残った不整合を同期する。(1) docs/requirements.md 4.2節が「パイプラインの状態（成功/失敗/実行中）を…状態はMR本文に記載する情報提供に留め」と書いているが、T-036で状態表示をやめてリンクだけにしたため、正典（T-028で requirements.md をconfig/仕様の正典と定めた流れと同じく、MRの仕様もここに書かれている）と実装が食い違っている。(2) README の Features「パイプライン状態を可視化」も同様に状態表示前提の説明のまま。(3) README「仕組み」のmermaid図が `values.yaml のタグと最新タグは一致?` の分岐しか持たず、T-037で追加した「反映済みタグが追跡ブランチのHEADを指すなら更新しない」条件が反映されていない。(4) docs/glossary.md の「反映済みタグ」項目にもT-037のルールが無い。(5) docs/architecture.md の「ディレクトリ構成の勘所」に T-033 で追加した `scripts/smoke/` が載っていない。(6) progress.md の最終更新行が「T-022〜T-031のセッション」のままで、その後のT-032〜T-037を含んでいない

**difficulty**: sonnet

**dependencies**: T-037

**evidence**: (1) docs/requirements.md 4.2節を「状態は記載せずリンクのみ（T-036）」に修正、(2) README Featuresの「パイプライン状態を可視化」を「パイプラインへの導線」に書き換え、(3) READMEのmermaid図にT-037の分岐（反映済みタグが追跡ブランチのHEADを指すならSKIPPED）を追加、(4) docs/glossary.md「反映済みタグ」にT-037の例外とT-043の再例外を追記、(5) docs/architecture.md「ディレクトリ構成の勘所」に scripts/smoke/smoke-fixture.ts を追加、(6) progress.md をこのセッションの内容に更新。あわせてT-045・T-046のファイル移動に伴う architecture.md 内のファイル名参照も直した

## T-040

**タスク**: 直近の変更で使われなくなったコードを片付ける。(1) `PipelineInfo.status` は T-036 でMR本文から状態表示を外して以降どこからも読まれていない（`getLatestPipelineForRef()` が値を詰めているだけで、ログにも出していない）。あわせて、そのためだけに存在する `PipelineStatus` 型（GitLabの既知の状態値をリテラル列挙しつつ未知の文字列も許容する凝った型）も宙に浮いている。状態をログに出す価値があるなら残す、無ければ型ごと削って `PipelineInfo` を webUrl だけにする、のどちらかを決める。(2) `src/lib/gitlab/gitlab.ts` の `getProjectWebUrl()` と `src/utils/http.ts` の `isFatalStatus()` は、同じファイル内からしか呼ばれていないのに export されている（テストが直接importしているだけ）。CLAUDE.mdのテスト方針「非公開関数はエクスポートされた関数の振る舞いを通して間接的に検証する」と揃えるなら、非公開にしてテストを公開API経由に寄せる

**difficulty**: sonnet

**dependencies**: T-036

**evidence**: (1) T-036以降どこからも読まれていなかった PipelineInfo.status と、そのためだけにあった PipelineStatus 型（11リテラル＋string）を削除し、PipelineInfo を webUrl だけにした。ログに出す価値も無いと判断（MR本文はリンクだけを出す仕様、T-036）。(2) isFatalStatus() を非公開にし、直接呼んでいた7テストは isFatalError() 経由に寄せた（401/403/404/500は既存テストと重複するため、未カバーだった502/503/200/402の4ケースを2テストとして追加）。getProjectWebUrl() はT-044で apply-updates.ts が注入するようになったため公開のまま据え置き。pnpm check（21ファイル299テスト。304 − isFatalStatus 7件 + 2件）通過

## T-041

**タスク**: 肥大化したテストファイルを関心ごとに分割する。`test/lib/config.test.ts` が938行、`test/lib/gitlab/gitlab.test.ts` が724行あり、1ファイルで「パストラバーサル・スキーマ検証・2ファイル間の整合性・重複検出・target絞り込み」（config）や「APIラッパー・コミット/MR作成・MRタイトル/本文の組み立て」（gitlab）を扱っていて、目的のテストを探しにくい。src/ 側は既に責務ごとに分かれているので、テストも `test/lib/gitlab/mr-content.test.ts` のように分けられる。テスト対象の実装を変えずに移動するだけなので、分割前後でテスト件数が変わらないことを確認する。あわせて `test/steps/build-plans.test.ts`（609行、`describe`が実質1つでその中に27個の`it`がフラットに並んでいる）も分割する。分割先は `src/steps/sub-steps/build-plans/` のファイル名に対応させる（基本の振り分け／タグ解決（T-037・T-043）／複数chart箇所（T-014）／helm向き先ブランチ）。src側をT-044・T-045で `lib/gitlab/mr-content.ts`・`lib/config/` に分けた後に着手すると、テストの分割先が1:1で決まる

**difficulty**: sonnet

**dependencies**: T-036, T-044, T-045

**evidence**: 3ファイルを src/ の構成に合わせて分割。(1) test/lib/config.test.ts（938行）→ test/lib/config/{config,schema,validate,helm-target-branch}.test.ts（347/98/288/190行）＋ 使い捨てconfigディレクトリを作る fixture.ts（useConfigDir()。beforeEach/afterEachの登録込み）。(2) test/lib/gitlab/gitlab.test.ts（723行）→ gitlab.test.ts 434行 ＋ mr-content.test.ts 299行。(3) test/steps/build-plans.test.ts（609行、フラットな29テスト）→ build-plans.test.ts 172行（振り分け・オールオアナッシング・エラー方針）＋ test/steps/sub-steps/build-plans/{resolve-latest-tag,image-tag-target,helm-target-branch-target}.test.ts（244/128/173行）。実装は変更しておらず、pnpm check は分割前と同じ 299テスト（28ファイル）でpass

## T-042

**タスク**: `src/lib/verify-config.ts` の実在チェックが chartAndApps 単位でも app 単位でも完全に逐次実行になっているため、登録clientやappが増えるとCIの `validate-config-remote` ジョブが線形に遅くなる（現状の`config-test`は3件なので問題ないが、実運用の規模では効いてくる。ジョブのtimeoutは10分）。`utils/parallel.ts` の `mapWithConcurrency()` を使って chartAndApps 単位を並列化できるか検討する。問題の出力順が設定の並び順と一致する読みやすさは維持したい（`mapWithConcurrency` は入力順を保った配列を返すので両立できるはず）。あわせて、同じプロジェクト・ブランチ・values.yaml への問い合わせを共有しているキャッシュが並列化しても壊れないか（同時に同じキーをfetchして二重に呼ばないか）も確認する

**difficulty**: opus

**dependencies**: T-032, T-046

**evidence**: verifyConfigExistence() の chartAndApps 単位を mapWithConcurrency() で並列化し、concurrencyLimit を引数に追加（scripts/lint/validate-config.ts が env の CONCURRENCY_LIMIT を渡す）。結果は入力順を保った配列を flat() するだけなので、問題の出力順は config/ の並び順のまま。app単位はキャッシュのヒット率を保つため逐次のまま。キャッシュは並列だと二重fetchする穴（getOrFetch は解決済みの値だけをキャッシュするため、1件目の解決前に始まった2件目が未キャッシュと判定される）があったので、Promiseを共有する getOrFetchShared() を utils/cache.ts に追加し remote-cache.ts で使う（失敗したPromiseはキャッシュから削除して再試行可能にする）。逐次側の既存2箇所（build-plans・mr-content）は同時アクセスが無いため getOrFetch のまま。テスト3件追加（同時呼び出しでfetchは1回／失敗はキャッシュしない／並列でも問題は入力順）。pnpm check（28ファイル302テスト）通過。実機での再計測は未実施

## T-043

**タスク**: 追跡ブランチ（`branchToSync`）を切り替えたとき、切り替え前後のブランチが同じコミットを指していても新しいタグを作成し、`values.yaml` に反映する。ユーザー依頼「追従するブランチが変わった場合は仮に旧タグと追従ブランチに差分がなくてもタグを更新したい」。T-037（中身が同じコミットなら更新しない）とこのケースでのみ衝突するため、T-037のスキップの例外として扱う

**dependencies**: T-037

**evidence**: image-tag-target.ts に読み取り専用の readCurrentImageTags() を追加し、resolveLatestTag() に反映済みタグを渡して「現在の branchToSync でパースできない反映済みタグがあるか」で切り替えを検知（タグ名には {branch} が必ず含まれるため名前のパースだけで判定でき、GitLabへの問い合わせは増えない）。切り替え時はHEADと一致する既存タグがあっても再利用せず新規作成する。T-037 の pointsAtTrackedHead() には「現在の追跡ブランチ由来のタグであること」を条件に追加し、切り替え時は同じコミットを指していてもスキップされないようにした。アンカーが見つからない箇所（反映済みタグ無し）は書き込み時にERRORになるため強制作成の対象外。create_tag ログに reason（tracked_branch_changed / no_tag_at_branch_head）を追加。test/steps/build-plans.test.ts に5テスト追加（切り替え時の新規作成／旧タグが新ブランチHEADを指す場合も更新＝T-037の例外／dryRunでは作成しない／同一ブランチなら既存タグ再利用／アンカー無しはタグを作らずERROR）。docs/requirements.md 4.1節・architecture.md・README を更新。refactor/repo-cleanup を main にマージして pnpm check（21ファイル304テスト）通過。実機未検証

## T-044

**タスク**: `src/lib/gitlab/gitlab.ts`（364行）を責務ごとに2ファイルへ分割する。1〜270行目は `@gitbeaker/rest` のAPIラッパー（retry・404フォールバック）、271行目以降は外部I/Oを一切持たないMarkdownテーブルの組み立てで、別種の責務が同居している。`lib/gitlab/mr-content.ts` を新設して `buildUpdateBranch()`・`buildMrTitle()`・`buildMrDescription()` と非公開の行組み立て関数（`uniqueHelmTargetBranchUpdates()`・`buildTagUrl()`・`buildImageTagRow()`・`buildHelmTargetBranchSection()`）を移す（残り約215行／新規約150行）。`buildMrDescription()` だけが `getProjectWebUrl()` に依存するが、T-027でサブステップに適用したのと同じ関数型注入（`resolveWebUrl: (projectId) => Promise<GitLabUrl>`）で外し、`mr-content.ts` を `vi.mock` 不要の純粋関数に保つ（呼び出し元は `apply-updates.ts` の1箇所のみ）。T-041が想定しているテストの分割先 `test/lib/gitlab/mr-content.test.ts` と1:1で対応するため、T-041より先に行う。振る舞いは変えないので `pnpm check` のテスト件数が変わらないことを合格条件にする

**difficulty**: sonnet

**evidence**: src/lib/gitlab/mr-content.ts を新設（165行）し、gitlab.ts は364→214行のAPIラッパーだけになった。buildMrDescription() は GitlabClient ではなく ResolveWebUrl = (projectId) => Promise<GitLabUrl> を受け取り、apply-updates.ts が getProjectWebUrl を注入する（T-040の「getProjectWebUrlを非公開にする」案はこれで不成立になった）。filter-targets.test.ts は buildUpdateBranch のモックをやめ実関数を使う形に変更。pnpm check（21ファイル304テスト）通過＝分割前と同数。README・docs/architecture.md のファイル一覧も更新

## T-045

**タスク**: `src/lib/config.ts`（380行）を、既存の `lib/gitlab/` と同じ形の `src/lib/config/` ディレクトリへ分割する。現状1ファイルに「Zodスキーマ」「2ファイル間の整合性検証」「ディレクトリ走査と `ChartAndApps` の組み立て」「helm向き先ブランチの振り分け」の4つが混在していて、目的のルール（例: 重複検出）を探すのに全体をスクロールすることになる。内訳は `config/config.ts`（公開API `loadConfig()`・`ConfigTarget`・2階層固定の走査・`clientDirExists()`、約150行）／`config/schema.ts`（Zodスキーマ群と `loadAnchors()`、約80行）／`config/validate.ts`（`validateProjectLinkage()`・`validateNoDuplicateProjectIds()`・`validateNoDuplicateTargets()`、約95行）／`config/helm-target-branch.ts`（`resolveHelmTargetBranch()`、約55行）。importの変更は5箇所（`src/main.ts`・`scripts/lint/validate-config.ts`・`test/main.test.ts`の`vi.mock`とimport・`test/lib/config.test.ts`）。振る舞いは変えないので `pnpm check` のテスト件数が変わらないことを合格条件にする

**difficulty**: sonnet

**evidence**: src/lib/config.ts（380行）を src/lib/config/ の4ファイルに分割（config.ts 163行 / schema.ts 93行 / validate.ts 97行 / helm-target-branch.ts 51行）。importの変更は src/main.ts・scripts/lint/validate-config.ts・test/main.test.ts（vi.mockとimport）・test/lib/config.test.ts の5箇所で、パスは lib/config.js → lib/config/config.js。pnpm check（21ファイル304テスト）通過＝分割前と同数。README・docs/architecture.md のファイル一覧も更新

## T-046

**タスク**: `src/lib/verify-config.ts`（227行）の可読性を上げる。行数そのものより、`verifyChartAndApps()` が1関数で100行あり、その中の `reduceAsync(apps, ...)` のコールバック60行にapp単位の検証（projectId・branchToSync・chart[]・helm.chart[]）が丸ごと押し込まれていることが問題。(1) そのコールバックを `verifyApp()` として名前付き関数に切り出す（`verifyChartAndApps()` が約40行、`verifyApp()` が約60行になる）。(2) キャッシュ層（`Caches`・`newCaches()`・`checkProject()`・`checkBranch()`・`loadValuesYaml()`）を `lib/verify-config/remote-cache.ts` へ移す。本体は約170行になる。T-042（同ファイルの並列化）はこの切り出しを先に済ませてから着手すると、並列化の単位がすでに `verifyApp()` という関数になっていて手戻りが少ない

**difficulty**: sonnet

**evidence**: src/lib/verify-config/ に分割（verify-config.ts 179行 / remote-cache.ts 42行）。100行あった verifyChartAndApps() を約40行に縮め、app単位の検証を verifyApp()（約45行）へ切り出した。キャッシュ層は newRemoteCache(gitlab) が hasProject/hasBranch/loadValuesYaml を持つオブジェクトを返す形にして、gitlab・caches の引き回しを廃止（verifyTarget は8引数→3引数）。T-046の指示は lib/verify-config.ts を残す前提だったが、直前のT-044・T-045で作った lib/<名前>/<名前>.ts の形に揃えた（同名のファイルとディレクトリが並ぶのを避けるため）。test/lib/verify-config.test.ts も test/lib/verify-config/ へ移動。pnpm check（21ファイル304テスト）通過＝分割前と同数

## T-047

**タスク**: `src/types.ts`（267行）から、ブランド型11個とその `to*` factory関数（1〜79行）を `src/types/brand.ts` へ移す。`src/types.ts` には `export * from "./types/brand.js"` を1行足すだけにして、`types.js` を参照している25ファイルのimportは変更しない。残る `types.ts` は実質のドメインモデル約190行になり、1枚で見渡せる分量に収まる。副次効果として `as` キャストが `types/brand.ts` 1ファイルに完全に閉じ、CLAUDE.mdの「ブランド型の生成は factory 関数に封じ込め、それ以外で `as` を使わない」という規約を機械的に検証できるようになる。config系／plan系までの3分割は、25ファイルのimport書き換えに見合う効果が無い（ドメインモデルは1枚で見渡せるほうが読みやすい）ため行わない

**difficulty**: haiku

**evidence**: src/types/brand.ts（86行）にブランド型11個とfactory関数を移し、src/types.ts（189行）は先頭で `export * from "./types/brand.js"` するだけにした（25ファイルのimportは無変更）。再エクスポートだけでは types.ts 自身のスコープに名前が入らないため、`import type { ... } from "./types/brand.js"` も併記している。ブランド型生成の `as` は brand.ts に閉じたが、`[] as string[]`（reduceの初期値の型注釈）は他ファイルにも残るため「src全体でasが1ファイルだけ」にはならない。pnpm check（21ファイル304テスト）通過

## T-048

**タスク**: `src/steps/sub-steps/build-plans/` で、values.yamlの同じアンカーの値を2回読んでいる重複を解消する。現状 `buildAppUpdatePlan()`（src/steps/build-plans.ts）は (1) `readCurrentImageTags()` で `app.chart` の全箇所の反映済みタグを読み（image-tag-target.ts:20-36）、その結果を `resolveLatestTag()` の追跡ブランチ切り替え判定に渡し、続いて (2) `applyImageTagTargets()` の中の `applyImageTagTarget()` が同じ `valuesPath`+`anchor` を `getValueAtAnchor()` でもう一度読んでいる（image-tag-target.ts:55）。values.yamlの取得自体はキャッシュされるためGitLabへの問い合わせは増えないが、「反映済みタグを読む」ロジックが2箇所にあり、片方だけ直す事故が起きやすい。T-032で同じclient内の `valuesPath`+`anchor` の重複は設定エラーにしてあるため、1アプリの処理中に同じアンカーが2回書き換わることはなく、(1)で読んだ値と(2)で読む値は必ず一致する（この前提はコメントに明記すること）。`readCurrentImageTags()` が返す `previousTags` を `applyImageTagTargets()` にも渡して読み取りを1回にするか、両者を1つの関数に統合するかは実装者の判断でよい。完了条件: 振る舞いを変えないこと（`pnpm check` のテスト件数が減らないこと）と、前提が崩れたときに気づけるテストを1件足すこと

**difficulty**: sonnet

**evidence**: readCurrentImageTags() が読んだ previousTags を applyImageTagTargets() にも渡し、applyImageTagTarget() 内の getValueAtAnchor() による再読み取りをやめた（読み取り専用と書き換えで責務が違うため関数統合はしない判断）。差分が無い箇所は values.yaml のロード自体も行わなくなった（readCurrentImageTags() が全valuesPathをキャッシュ済みのため挙動は不変）。T-032の重複防止が壊れたときに気づく回帰テストを1件追加。pnpm check（28ファイル306テスト、305→306）通過。T-037・T-043の既存テストも変更なしでパス。sonnetのサブエージェントに委譲し、メイン側で差分と pnpm check を確認して受け入れた（previousTags と targets を添字で対応付ける形はT-050の型統合で解消予定）

## T-049

**タスク**: `LatestTagResolution.pointsAtTrackedHead`（src/steps/sub-steps/build-plans/types.ts:24-27）が関数（クロージャ）なのをデータに置き換える。現状 `resolveLatestTag()` は `(currentValue: string) => boolean` を返し、その中で `headSha`・`tags`・`app.branchToSync`・`tagFormat` を閉じ込めている（resolve-latest-tag.ts:56-59）。呼び出し側（image-tag-target.ts:57）は関数を呼ぶだけなので動くが、(a) 判定結果をログに出せない・スナップショットできない、(b) `resolveLatestTag()` の単体テストで判定条件を直接検証できない、(c) 「タグ解決」の結果に振る舞いが混ざっていて型から意図が読めない、という難点がある。代わりに「追跡ブランチのHEADコミットを指す、現在の追跡ブランチ由来のタグ名の集合」（例: `trackedHeadTagNames: ReadonlySet<TagName>`）のような純粋なデータを返し、呼び出し側は集合に含まれるかを見るだけにする。T-037（中身が同じなら更新しない）とT-043（追跡ブランチ切り替え時は例外的に更新する）の両方の振る舞いが変わらないことを、既存テスト（test/steps/sub-steps/build-plans/resolve-latest-tag.test.ts）で確認する。完了条件: `pnpm check` のテスト件数が減らないこと

**difficulty**: sonnet

**dependencies**: T-048

**evidence**: LatestTagResolution を { tag, trackedHeadTagNames: ReadonlySet<TagName> } に変更し、クロージャ pointsAtTrackedHead を廃止。集合の組み立ては非公開関数 resolveTrackedHeadTagNames(tags, headSha, branch, tagFormat) に切り出し、閉じ込めていた値を引数として明示化した。呼び出し側は trackedHeadTagNames.has(previousTag) を見るだけ。データ化により書けるようになった検証（集合の中身の直接assert）を2件追加。pnpm check（28ファイル308テスト、306→308）通過。T-037・T-043の既存テストは変更なしでパス。sonnetのサブエージェントに委譲し、メイン側で等価性（headSha未定義時・タグ未登録時も従来どおりfalse相当）と pnpm check を確認して受け入れた

## T-050

**タスク**: 1つのchartAndAppsを処理する間の「values.yamlの下書き状態」を1つの型にまとめ、アキュムレータの詰め替えを無くす。現状は `valuesYamlCache`（ReadonlyMap<ValuesPath, string>）と `modifiedValuesPaths`（ReadonlySet<ValuesPath>）が常にセットで持ち回られ、`BuildChartUpdateAcc` / `ApplyTargetsAcc<U>` の3つの型に同じ2フィールドが現れる。そのため `buildAppUpdatePlan()`（src/steps/build-plans.ts:203-232）が `initialTargetsAcc` → `afterChartTargets` → `initialHelmTargetsAcc` → `afterHelmTargets` と手作業でフィールドを詰め替えており、どの段階の状態を見ているのか追いにくい。あわせて `buildFileUpdates()`（build-plans.ts:261-272）が「modifiedValuesPaths に入っているのに valuesYamlCache に無い」ケースを internal error として実行時に投げているが、これは2つのフィールドが別々に持ち回られているせいで型では防げていない。改善案: `ValuesYamlDraft`（内容と「書き換えたか」を1つのMapに持つ）のような型を作り、サブステップは `(draft, ...) => { draft, updates }` を返す形に統一する。これにより詰め替えが消え、`buildFileUpdates()` の internal error も型レベルで不要になる。完了条件: 振る舞いを変えない（`pnpm check` のテスト件数が減らない）こと

**difficulty**: sonnet

**dependencies**: T-048, T-049

**evidence**: sub-steps/build-plans/values-yaml-draft.ts を新設し、ValuesYamlEntry {content, modified} を値とする ValuesYamlDraft 1本に統合（BuildChartUpdateAcc・ApplyTargetsAcc<U> から valuesYamlCache/modifiedValuesPaths の2フィールドが消えた）。buildAppUpdatePlan() の initialTargetsAcc/initialHelmTargetsAcc という詰め替え用オブジェクトが不要になり、draftWithCurrentTags → draftAfterChartTargets → draft と段階が変数名で読める形になった。buildFileUpdates() の internal error は toFileUpdates() で型レベルに解消（modified なエントリは writeValuesYamlDraft() 経由でしか作られず必ず content を伴う）。build-plans.ts は272→259行。pnpm check（28ファイル308テスト）通過＝件数不変。sonnetのサブエージェントに委譲し、メイン側で「同じvalues.yamlを共有する次のアプリが前のアプリの書き換え結果を読むこと」を確認し、未使用だった export（EMPTY_VALUES_YAML_DRAFT）を削って受け入れた

## T-051

**タスク**: `DRY_RUN=true` のときに不要なGitLab API呼び出し（パイプライン取得）をやめる。`buildAppUpdatePlan()`（src/steps/build-plans.ts:245）は差分があったアプリごとに `getLatestPipelineForRef()` を呼ぶが、この結果を使うのはMR本文の組み立て（lib/gitlab/mr-content.ts の `buildImageTagRow()`）だけで、dryRun時は `planTarget()` が SKIPPED を返してMRを作らない。dryRunのログに使う `describePlan()`（src/steps/shared/step-outcome.ts:27-41）もパイプラインを見ていないため、dryRun時のこの呼び出しは完全に無駄（差分があるアプリの数だけAPIを叩いている）。dryRunのときは `pipeline: undefined` にしてAPI呼び出しをスキップする。完了条件: dryRun時に `getLatestPipelineForRef` が呼ばれないことを検証するテストを1件足し、`pnpm check` を通すこと

**difficulty**: haiku

**evidence**: buildAppUpdatePlan() で dryRun のとき getLatestPipelineForRef() を呼ばず pipeline: undefined にした（差分があるアプリの数だけ無駄なAPIを叩いていた）。test/steps/build-plans.test.ts に検証テスト1件追加。pnpm check（28ファイル303テスト、302→303）通過。haikuのサブエージェントに委譲し、メイン側で差分と pnpm check を確認して受け入れた（difficultyに応じた委譲運用の初回適用）

## T-052

**タスク**: build-plans の失敗ログから「どのアプリで失敗したか」が分からない問題を直す。`buildPlan()` が投げるエラー（build-plans.ts:141 の「values.yaml が見つかりません: <valuesPath>」、helm-target-branch-target.ts:33 の「向き先ブランチ "<branch>" がchartリポジトリに見つかりません」）は、`planTarget()` の catch で `settleAsError()` に渡り、chartAndApps単位のログコンテキスト（chartDir/tenantId/clientId/chartProjectId/chartProjectName）と一緒に出力される。しかしアプリ名は含まれないため、1つのclientに複数アプリがあると、どのアプリの設定が原因かがログから特定できない（オールオアナッシングでclient全体がERRORになるぶん、原因の特定はより重要）。エラーメッセージにアプリの識別情報（`app.projectName`、可能なら該当の `valuesPath`/`anchor`）を含める。`settleAsError()` のシグネチャや共通のエラー方針は変えず、投げる側でメッセージを組み立てる方針とする。完了条件: 失敗時のメッセージにアプリ名が含まれることを検証するテストを1件足し、`pnpm check` を通すこと

**difficulty**: haiku

**evidence**: buildAppUpdatePlan() 全体を try/catch で囲み、steps/shared/step-outcome.ts に追加した rethrowWithAppContext() で「[アプリ: <projectName>] <元のメッセージ>」に包んで投げ直す。向き先ブランチのエラーには valuesPath・anchor も追加。致命的エラー（401/5xx/ネットワーク障害）は包まずそのまま投げる（new Error(..., {cause}) で包むと extractHttpStatus() が status を辿れず FatalError に昇格できなくなるため）。テスト2件追加。pnpm check（28ファイル305テスト、303→305）通過。haikuのサブエージェントに委譲したが、初回実装は isFatalError の判定を build-plans.ts に直接置いておりT-022で集約したエラー方針が分散するため、メイン側で step-outcome.ts への集約に直してから受け入れた

## T-053

**タスク**: アプリ単位を逐次実行している設計（T-003で意図的に据え置いた判断）を、実行時間の観点から見直すか、改めて現状維持と決めて明文化する。`buildPlan()`（src/steps/build-plans.ts:166-170）は `reduceAsync` で1アプリずつ処理する。理由は values.yaml の書き換えを同じキャッシュに積み上げる必要があるためで、これは正当。一方、1アプリあたり `listTags` + `getBranchHeadSha`（resolve-latest-tag.ts:50-53、この2つは既にPromise.allで並列）と `getLatestPipelineForRef` という**ソースリポジトリ側への読み取り**が含まれ、これらは values.yaml のキャッシュとは無関係なので先に全アプリ分をまとめて解決できる余地がある。検討すること: (a) 読み取りフェーズ（タグ一覧・HEAD SHA）を `mapWithConcurrency` で先に並列解決し、書き換えフェーズだけを逐次にする案の是非、(b) その場合 `resolveLatestTag()` が持つタグ作成（副作用）をどちらのフェーズに置くか、(c) 1clientあたりのアプリ数が実運用でどのくらいかを踏まえた費用対効果、(d) T-042で `verify-config` に入れた並列化（キャッシュはPromise共有の `getOrFetchShared()` を使う）との一貫性。現状維持と決めた場合は、その理由を docs/architecture.md の「コードからは読み取れない設計判断」に追記して決着させる（T-003・T-022と同じ扱い）

**difficulty**: opus

**dependencies**: T-050

**evidence**: コード変更なし（判断のみ）。現状維持（アプリ単位は逐次）と決め、理由を docs/architecture.md の「コードからは読み取れない設計判断」に追記した。要点: 読み取りだけの先行並列化は技術的には可能（T-032の重複防止により、あるアンカーの読み取りは別アンカーへの書き込みに影響されない）が、1アプリあたりのAPI往復が実質2〜3回で削減幅が小さい一方、resolveLatestTag() のタグ作成という副作用が並列・前倒しで走ることになり、下書きの並列共有にはT-042と同じ getOrFetchShared() が要る。夜間の定期実行という前提では割に合わない。遅い場合はまず CONCURRENCY_LIMIT を上げる。再検討の条件（1clientに数十アプリが登録され実測でボトルネックになったとき）も明記した
