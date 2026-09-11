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

## T-054

**タスク**: 環境変数 `TARGET_CHART_DIR` を `TARGET_CHART` にリネームし、あわせて誤った値を指定したときに検知できるようにする。値の意味は現状のまま（`config/` 直下のディレクトリ名。例: `teamA-chart`）とユーザーが決定済み（2026-09-06）。(1) リネーム対象: src/lib/env.ts のエクスポート、src/main.ts の参照、src/lib/config/config.ts のエラーメッセージ文言（config.ts:139-142）、.env.example、README.md「環境変数」表、.gitlab-ci.yml の pipeline inputs、docs/requirements.md、test/（main.test.ts・helpers.ts・steps/filter-targets.test.ts・lib/config/ 配下）。内部の型・フィールド名（`ChartDirName`・`ChartAndApps.chartDir`・`ConfigTarget.chartDir`）は「config/ 直下のディレクトリ名」という意味のままなので変更しない。(2) 検知の穴を塞ぐ: 現状 `loadConfig()` は `config/` 直下に存在しない名前を指定したときだけエラーにする（config.ts:139）。ディレクトリは存在するが `chart.yaml` が無い場合は config.ts:157-158 で黙って無視され、絞り込み結果が0件でも「0 chart groups」で正常終了してしまう。`TARGET_CHART` / `TARGET_CLIENT` を明示指定したときに限り、対象0件をエラーにする（未指定時は素通しで0件でもエラーにしない現状の仕様は変えない。config.ts:128-133 のJSDoc参照）。(3) エラーメッセージに「`config/` 直下のディレクトリ名を指定する」ことと実在するディレクトリ名の一覧を添え、何を指定すればよいかがメッセージだけで分かるようにする。完了条件: (2)(3) を検証するテストを追加し、`pnpm check` を通すこと

**difficulty**: sonnet

**evidence**: 環境変数を TARGET_CHART にリネーム（値の意味・内部フィールド名 chartDir は据え置き）。loadConfig() に isExplicitlyTargeted() を追加し、TARGET_CHART/TARGET_CLIENT を明示指定したときに限り絞り込み結果0件を例外にした（chart.yaml が無いディレクトリを指定して黙って0件で正常終了する穴を塞いだ）。エラーメッセージには formatChartDirs() で実在ディレクトリ名の一覧を添える。test/lib/config/config.test.ts に7テスト追加（0件検知4件・メッセージ2件・未指定時に0件でもエラーにしない回帰1件）。pnpm check（28ファイル315テスト、308→315）通過。sonnetのサブエージェントに委譲し、メイン側で pnpm check と差分を確認して受け入れた

## T-055

**タスク**: `TAG_FORMAT`（タグ命名規則）の制約を緩める要件を詰める。ユーザーの問題意識（2026-09-06）:「命名規則がやや厳しい印象。branch名さえ分かれば、タグの作成日時でソートすることでこのリポジトリの目的は達成できそう」。現状は `{branch}`/`{date}`/`{time}` をちょうど1回ずつ含むテンプレートが必須で（src/lib/gitlab/tag.ts の `validateTagFormat()`）、最新タグの判定はタグ名から抽出した日時（`ParsedTag.builtAt`）の比較で行っている（`findLatestParsedTag()`）。代替案は GitLab API が返すタグのコミット日時（`Tags.all()` の `tag.commit.created_at`。現状 `listTags()` は name と commit.id しか拾っていない、gitlab.ts:36-39）でソートする方式。詰める論点: (a)「どのブランチ由来のタグか」の判定を何で行うか（タグ名に branch を含める規則は残すのか、APIでブランチ到達可能性を見るのか）、(b) 同じコミットに複数タグがある場合・作成日時が同一の場合のタイブレーク、(c) 追跡ブランチ切り替えの検知（resolve-latest-tag.ts の `hasTagFromOtherBranch()` は「現在のブランチ名でパースできない」ことを根拠にしている）を新方式でどう表現するか、(d) このツール自身がタグを作るとき（`buildNewTag()`）の名前をどう決めるか（名前から日時が消える場合の一意性）、(e) `TAG_FORMAT` 環境変数を残すか・残すならデフォルト値と検証をどこまで緩めるか、(f) 既に values.yaml に反映済みの旧形式タグとの互換。必要ならタグ命名規則そのものを修正してよい（ユーザー明言）。決めた要件は docs/requirements.md（4.1節）と README「タグ命名規則」章に反映する。実装は T-056 で行う

**difficulty**: opus

**evidence**: コード変更なし（要件確定のみ）。ユーザー判断3点: (1) 最新タグ判定を「追跡ブランチ由来でHEADを指すタグを直接探す」方式に変更し、複数該当時はタグ名から読んだ日時の降順で選ぶ。(2) TAG*FORMAT の命名規則は緩めず現状維持（{branch}/{date}/{time} を各1回必須）。並び順・区切り文字が異なるフォーマットは既に実装が対応済みであることを実測で確認（{date}-{time}-{branch}・v{time}*{branch}\_\_{date} で生成・再パース・最新判定が動く）ため、要件とREADMEに明記するだけでよい。(3) 一意化要素が無い場合のタグ作成エラーは、date/time が常に必須である以上到達不能なので作らない。当初検討したコミット日時ソート案は却下（TagSchema.created_at は optional で、このツールが作る軽量タグには付かないことも実測で判明）。docs/requirements.md 4.1節と README「タグ命名規則」章に反映済み。実装は T-056

## T-056

**タスク**: T-055 で確定したタグ命名規則・最新タグ判定の仕様を実装する。影響範囲の見込み: src/lib/gitlab/tag.ts（`validateTagFormat`/`parseTag`/`compileTagPattern`/`findLatestParsedTag`/`buildNewTag`）、src/lib/gitlab/gitlab.ts の `listTags()`（作成日時を使うなら `TagInfo` に項目追加）、src/types.ts の `ParsedTag`/`TagInfo`、src/steps/sub-steps/build-plans/resolve-latest-tag.ts（`hasTagFromOtherBranch`・`resolveTrackedHeadTagNames`）、src/lib/env.ts の `parseTagFormat()`、src/lib/gitlab/mr-content.ts（MR本文の列）、.env.example・README・docs。テストは test/lib/gitlab/tag.test.ts・test/lib/env.test.ts・test/steps/sub-steps/build-plans/resolve-latest-tag.test.ts が主対象。完了条件: T-055 で決めた仕様どおりに動くことをテストで示し、`pnpm check` を通すこと。実機での確認が要る場合は docs/smoke-test.md の手順を使う

**difficulty**: sonnet

**dependencies**: T-055

**evidence**: resolveLatestTag() を「HEADを指すタグを直接探す」方式に変更（全タグから最新を選ぶ existingTag / existingTagCommitSha の判定を削除し、trackedHeadTagNames が空でなければその中から findLatestParsedTag() で選ぶ）。決定2はコード変更不要のため回帰テストのみ追加。決定3は到達不能なので実装せず。テスト4件追加（HEADにタグがあれば別コミットの新しい名前のタグがあっても新規作成しない／HEADを指すタグが複数のとき日時降順で決定的に選ぶ／並び順違いフォーマット2種の生成・再パース・最新判定）。既存テストの修正は不要だった。README のmermaid図・Features・エラーハンドリング表、docs/glossary.md の「最新タグ」「タグ自動作成」も新方式に同期（Featuresとエラー表の取りこぼしはメイン側で修正）。pnpm check（28ファイル319テスト、315→319）通過

## T-057

**タスク**: README.md（390行）から冗長な記述を削る。判断基準は「READMEは使う人が最初に読む導線に絞り、詳細は正典ドキュメントへのリンクに寄せる」。主な候補: (a)「設定 > config/」章（145-246行）が chart.yaml / config.yaml / anchors.yaml のYAML例を長々と載せているが、T-028 で正典は docs/requirements.md 4.4節と決めており二重管理になっている、(b)「タグ命名規則」章（43-60行）も requirements.md と重複、(c)「プロジェクト構成」のツリー（331行以降）は docs/architecture.md のディレクトリ構成と二重管理でドリフトしやすい、(d)「仕組み」のmermaid図・「実行ログの例」・「CI/CD セットアップ手順」に重複や不要な冗長さが無いか確認する。削除ではなく要約＋リンクに置き換えるのが基本で、リンク先に無い情報は消さないこと。完了条件: 削った各ブロックについて「同じ内容が requirements.md / architecture.md / glossary.md のどこにあるか」を対応付けて示し、`pnpm check`（format:check を含む）を通すこと

**difficulty**: sonnet

**evidence**: README を 393→268行（-125行、約32%）に削減。削ったのは正典と二重管理だった4ブロック（config/ の3つのYAML例と設定エラー5ケース→requirements.md 4.4節、タグ命名規則の実装名・非互換の詳細→同4.1節、プロジェクト構成ツリーのsrc/配下の責務コメント約35行→architecture.md の責務テーブル、config-test/ の説明→同ディレクトリ構成の勘所）。いずれも削除ではなく要約1〜2文＋正典へのリンクに置換し、正典側に無い情報（mermaid図・実行ログ例・CI/CDセットアップ手順・環境変数表）は残した。参照先の節（4.1・4.4）が実在することとアンカーリンクの生存を確認。pnpm check（28ファイル315テスト）通過。sonnetのサブエージェントに委譲し、メイン側で正典側に実際に情報があるかを裏取りして受け入れた

## T-058

**タスク**: `tasks.json`（79KB / 53タスク全件done）と `progress.md` が肥大化してきたので、history へ移す運用を回せるようにし、今回分を実際にアーカイブする。docs/workflow.md「肥大化したときのアーカイブ」節には移し先（docs/history/tasks-archive.md・docs/history/progress-archive.md）と「当時の記述のまま移す」ルールだけがあり、**いつ移すか**のトリガーが無いため運用されずに溜まる。(1) 具体的なトリガーを決めて docs/workflow.md と CLAUDE.md「進捗管理とHandoff」に明記する（例: セッション開始時に `done` のタスクが N 件以上、または tasks.json が N KB を超えていたら、作業を始める前にアーカイブする）。(2) その基準に従って完了済みタスク（T-001〜T-053）を docs/history/tasks-archive.md へ移し、tasks.json は未完了タスク＋直近の完了分だけにする。既存アーカイブと同じ形式（タスクIDごとの節）で、当時の記述のまま移すこと。**アーカイブ後も `dependencies` がアーカイブ済みタスクのIDを指す**ため、その扱い（IDを残す／完了済みとみなして削る）も決めて workflow.md に書く。(3) progress.md も同様に、直近セッションより古い記述を progress-archive.md へ移す。完了条件: アーカイブ後の tasks.json が JSON として妥当で `pnpm check` が通り、移動の前後で情報が失われていないこと（移動元の件数と移動先の節数を突き合わせる）

**difficulty**: sonnet

**evidence**: docs/workflow.md にトリガー（セッション開始時に done が10件以上／30KB超なら検討）・移す対象（done は全件）・dependencies の扱い（tasks.json に無いIDは完了とみなす）を明記し、CLAUDE.md の手順1にも判定ステップを追記。done 53件（T-001〜T-053）を docs/history/tasks-archive.md へ移し（21節→53節、昇順。既存節は書き換えず tasks.json 側の evidence を **evidence** 行として統合）、tasks.json は 93,137→14,211バイト・62→9件になった。progress.md の旧セッション記録は progress-archive.md へ。移動前の tasks.json と突き合わせて53件すべての task 本文・evidence がアーカイブに存在することを確認（欠落0件）。pnpm check（28ファイル308テスト、作業前と同数）通過。sonnetのサブエージェントに委譲し、メイン側で方針決定・受け入れ判定・evidence 記述を行った

## T-059

**タスク**: `src/types.ts` の同義の型エイリアスを1つに寄せる。`ImageTagTarget` と `HelmTargetBranchTarget` はどちらも `AnchorTarget`（`valuesPath` + `anchor`）のエイリアスで、TypeScriptは構造的型付けなので別名にしても取り違えは防げない。T-024 では「どちらの用途か読み手に伝えるため」意図的に別名を残す判断をしたが、ユーザー判断（2026-09-06）で `AnchorTarget` 1つに統一する。対象は src/ の9ファイル計49箇所（src/types.ts、steps/build-plans.ts、steps/sub-steps/build-plans/{image-tag-target,values-yaml-draft,helm-target-branch-target}.ts、lib/verify-config/verify-config.ts、lib/config/{schema,helm-target-branch,validate}.ts）と test/。用途の区別は型名ではなく変数名・フィールド名・JSDocで表す。あわせて types.ts 全体を見直し、他にも実体が同じ別名が無いか確認して同様に寄せる。T-024 の判断を記録している docs/architecture.md「コードからは読み取れない設計判断」の該当項目も、現在の判断に書き換える。完了条件: `pnpm check` を通すこと

**difficulty**: sonnet

**evidence**: ImageTagTarget / HelmTargetBranchTarget を削除し AnchorTarget 1つに統一（型としての参照は0件。applyImageTagTarget() などの関数名は用途を表す既存の名前なので変更しない）。削除したエイリアスのJSDocは AppConfig.chart・HelmTargetBranchConfig.targets・ImageTagUpdate.target・HelmTargetBranchUpdate.target のフィールドJSDocへ移し、情報を落としていない。docs/architecture.md の設計判断も「別名を残す」から「1つに統一し用途は変数名・JSDocで表す」に書き換えた。types.ts 内に他の同義エイリアスは無し。schema.ts は元から AnchorTargetSchema 1つでスキーマ名の変更は不要だった。pnpm check（28ファイル315テスト、変化なし）通過。sonnetのサブエージェントに委譲し、メイン側で差分と pnpm check を確認して受け入れた

## T-060

**タスク**: `src/types.ts`（ファイル）と `src/types/brand.ts`（ディレクトリ）が同名で並んでいる違和感を解消し、`src/types/` ディレクトリにまとめる。ファイル名は既存の規約（progress.md の注意「`src/lib/<名前>/<名前>.ts` の形で統一している。同名のファイルとディレクトリを並べない」）に合わせて `src/types/types.ts` + `src/types/brand.ts` とし、`src/types.ts` は削除する。`export * from "./brand.js"` の再エクスポートは維持し、利用側が types だけを import すれば済む形は変えない。import しているのは25ファイル以上あり、相対パスの階層が1つ深くなる点に注意する（例: src/lib/gitlab/tag.ts の `"../../types.js"` → `"../../types/types.js"`）。docs/architecture.md のディレクトリ構成、README のプロジェクト構成ツリーも更新する。完了条件: `pnpm check` を通すこと

**difficulty**: sonnet

**dependencies**: T-059

**evidence**: git mv で src/types.ts → src/types/types.ts に移動し、src/types/ に集約（既存の src/lib/<名前>/<名前>.ts と同じ形）。export \* from "./brand.js" の再エクスポートは維持したので、利用側は従来どおり types だけを import すればよい。src/test/scripts の35ファイルの相対パスを張り替え（sub-steps/build-plans/types.ts への "./types.js" ローカル参照は別ファイルなので据え置き）。README のプロジェクト構成ツリーも更新（architecture.md には src/types.ts への言及が無く更新箇所なし）。pnpm check（28ファイル315テスト、変化なし）通過。sonnetのサブエージェントに委譲し、メイン側で stray import 0件・rename 認識・pnpm check を確認して受け入れた

## T-061

**タスク**: `src/steps/` の各ステップを「ステップ名のディレクトリ + 同名の .ts」に置き換える（ユーザー指定の構成、2026-09-06）。before: steps/{filter-targets,build-plans,apply-updates}.ts + steps/sub-steps/build-plans/{helm-target-branch-target,image-tag-target,resolve-latest-tag,types,values-yaml-draft}.ts + steps/shared/step-outcome.ts。after: steps/filter-targets/filter-targets.ts、steps/build-plans/build-plans.ts + steps/build-plans/sub-steps/（上記5ファイル）、steps/apply-updates/apply-updates.ts、steps/shared/step-outcome.ts（複数ステップの共有なのでそのまま）。sub-steps をステップ配下に入れることで「そのステップからしか呼ばれない」ことを構造で表せる。test/ も同じ構成に合わせて移す（test/steps/build-plans.test.ts → test/steps/build-plans/build-plans.test.ts、test/steps/sub-steps/build-plans/_.test.ts → test/steps/build-plans/sub-steps/_.test.ts など）。CLAUDE.md「新しいコードを置く場所」の `steps/sub-steps/<step名>/` という記述、docs/architecture.md のディレクトリ構成、README のプロジェクト構成ツリーも新構成に更新する。完了条件: `pnpm check` を通し、移動でテスト件数が減っていないこと（移動前の件数と突き合わせる）

**difficulty**: sonnet

**evidence**: git mv でステップ名ディレクトリ構成に変更（steps/{filter-targets,build-plans,apply-updates}/<同名>.ts、sub-steps は steps/build-plans/sub-steps/ へ移動、steps/shared/ は複数ステップ共有なので据え置き）。test/ も同じ構成に追従。CLAUDE.md「新しいコードを置く場所」・docs/architecture.md・README のツリーを新構成に更新。pnpm check（28ファイル315テスト、移動前と同数＝テストファイルの取りこぼしなし）通過。git は14件すべて rename として認識、空ディレクトリの残骸なし。sonnetのサブエージェントに委譲し、メイン側でツリー・テスト件数・rename認識を確認して受け入れた

## T-062

**タスク**: コードとドキュメントからタスク番号（`T-001` のような参照）を削除する。ユーザー判断（2026-09-06）で範囲は「進捗管理の仕組みそのもの以外すべて」。対象: src/ の16ファイル（lib/gitlab/mr-content.ts 10件、types.ts 7件、steps/sub-steps/build-plans/{image-tag-target,types,resolve-latest-tag,values-yaml-draft}.ts、steps/build-plans.ts、steps/shared/step-outcome.ts、lib/config/{config,schema,validate,helm-target-branch}.ts、lib/verify-config/{verify-config,remote-cache}.ts、lib/gitlab/gitlab.ts、types/brand.ts）、test/ の5ファイル、scripts/smoke/smoke-fixture.ts、README.md、config/README.md、CLAUDE.md、docs/{architecture.md 21件, glossary.md 14件, requirements.md 13件, workflow.md 8件, requirements-grilling.md 9件, smoke-test.md 5件}。**対象外**（タスク番号が識別子として機能しているファイル）: tasks.json、progress.md、docs/history/tasks-archive.md、docs/history/progress-archive.md。単に番号を消すのではなく、番号が根拠へのポインタになっている文（例:「〜は T-024 で意図的に残した」「T-049でクロージャからデータに置き換えた」）は、番号なしで意味が通るように書き直す（理由そのものを残す／履歴の記述自体が不要なら文ごと削る）。docs/workflow.md の difficulty 表にある実タスク例も、番号を出さない説明に置き換える。あわせて CLAUDE.md の「コーディング規約」に「コード・ドキュメントにタスク番号を書かない（経緯は tasks.json / docs/history/ 側に持つ）」を追記する。完了条件: 対象ファイルに `T-[0-9]{3}` が1件も残らないことを grep で確認し、`pnpm check` を通すこと

**difficulty**: sonnet

**dependencies**: T-054, T-056, T-057, T-059, T-060, T-061

**evidence**: コード・ドキュメント33ファイルからタスク番号を削除。番号が根拠のポインタになっている文は番号なしで意味が通るよう書き直した（例: architecture.md の「T-003で意図的にこのままとする判断」→「意図的にこのままとする判断。理由は前掲の…参照」、workflow.md の difficulty 表の実タスク例→作業の性質が伝わる説明）。CLAUDE.md のコーディング規約に「コード・ドキュメントにタスク番号を書かない」を追記し、grep で機械的に確認できる旨も明記。残存は tasks.json / progress.md / docs/history/ の4ファイルのみ（＝タスク番号が識別子として機能する対象外ファイル）。pnpm check（28ファイル319テスト）通過。sonnetのサブエージェントに委譲したがセッション上限で途中終了したため、メイン側で残り1件の書き換えと、落ちる前に崩れていた3ファイルの整形（oxfmt）を仕上げて受け入れた

## T-063

**タスク**: 追跡ブランチを切り替えたときに、切り替え先のHEADを指す既存タグがあってもそれを再利用せず必ず新しいタグを作っていた挙動をやめる。ユーザー指摘（2026-09-06）:「切り替えた先の最新タグが追跡ブランチのHEADを指していたら新しくタグを作る必要はなくて、最新タグをvalues.yamlに設定すればいい」。従来の根拠は「追跡先が変わったことをvalues.yaml上で明示するため」だったが、タグ名には TAG_FORMAT の必須プレースホルダ {branch} が必ず含まれるため、切り替え先のHEADにある既存タグを書けば名前から追跡先の変化は読み取れる。HEADを指すタグの直接探索に変えた前タスクと同じ無駄が、切り替え経路にだけ残っていた形。

**difficulty**: opus

**evidence**: resolveLatestTag() から branchChanged ガードを外し、hasTagFromOtherBranch()・previousTags 引数・ログの reason "tracked_branch_changed" を削除（この判定専用のコードだったため連鎖的に不要になった）。要件「切り替え前後が同じコミットでも更新する」は、切り替え前のタグ名が現在の追跡ブランチでパースできず trackedHeadTagNames に入らないことで自動的に成立する（image-tag-target.ts 側のスキップ判定）。テスト2件を新仕様に書き換え（切り替え時に既存タグを再利用しvalues.yamlは更新される／dryRunは切り替え先HEADにタグが無いケースで検証）、resolveLatestTag を直接呼ぶ3件の引数を修正。requirements.md 4.1・README（図とFeatures）・glossary.md も同期。pnpm check（28ファイル319テスト、件数変化なし）通過

## T-064

**タスク**: 環境変数 `TARGET_CLIENT` を `TARGET_CLIENTS` にリネームする。この変数は `<tenantId>/<clientId>` の組を**カンマ区切りで複数指定できる**（src/lib/env.ts の `parseTargetClients()`、JSDoc に「複数指定できる」と明記済み）のに名前が単数形で、単一指定しかできないと誤読される。単数形のままの `TARGET_CHART`（単一のディレクトリ名しか取らない）との対比も付く。リネーム対象: src/lib/env.ts のエクスポート名、src/main.ts の参照（`clients: TARGET_CLIENT` と run_start ログの `targetClient` キー）、エラーメッセージ文言（env.ts の `parseTargetClientEntry()`、src/lib/config/config.ts の絞り込みエラー）、.env.example、README.md「環境変数」表、.gitlab-ci.yml の pipeline inputs、docs/requirements.md、docs/smoke-test.md、test/（env.test.ts・main.test.ts・helpers.ts・lib/config/ 配下・steps/filter-targets/）。内部の型・フィールド名（`TargetClient`・`ConfigTarget.clients`）は既に意味と単複が合っているので変更しない。完了条件: `grep -rn "TARGET_CLIENT\b"` が0件になり、`pnpm check` を通すこと

**difficulty**: haiku

**evidence**: 環境変数を TARGET_CLIENTS にリネーム（src/lib/env.ts のエクスポート・エラーメッセージ、main.ts の参照と run_start ログのキー targetClient→targetClients、config.ts のエラーメッセージとJSDoc、types.ts のJSDoc、.env.example、README、.gitlab-ci.yml の inputs と variables、docs/requirements.md・smoke-test.md、test/ 3ファイル）。内部の型 TargetClient・ConfigTarget.clients は据え置き。tasks.json/progress.md/docs/history/direction.md を除いて grep -rn "TARGET_CLIENT\b" が0件。pnpm check（28ファイル319テスト、変化なし）通過。haikuのサブエージェントに委譲し、メイン側で差分・grep・pnpm check を確認して受け入れた

## T-065

**タスク**: エラーハンドリングの方針を再設計する（実装は T-066）。ユーザーの問題意識（2026-09-06）:「fatal なものは処理を落とす、そうでないものは復帰してエラーとして計上する、これをいたるところで書くのを避けたい。try/catch をどこに置くかを決め打ちできないか」。現状の事実（調査済み）: (1) `src/steps/filter-targets/filter-targets.ts` の catch は `settleAsError()` を呼んでおり、`settleAsError()` は `isFatalError()` なら `FatalError` を投げ直すので、**fatal は settled にならず実行全体が落ちる**（`mapWithConcurrency` が `limit.clearQueue()` してから reject → `process()` → `index.ts` の catch）。ユーザーの懸念は挙動そのものではなく、`catch { return settleAsError(...) }` という**書き方が「常に ERROR として計上して続行する」ように読める**点にある。この読み違いを型・構造で防げないかを含めて検討する。なお `test/steps/filter-targets/filter-targets.test.ts` には「401エラーのとき FatalError をスローする」テストが既にあり、挙動は回帰テストで固定されている。(2) src/ の try/catch は7箇所（steps 3箇所＝各stepの並列処理1件分、lib/gitlab/gitlab.ts 2箇所＝404/403のフォールバック、utils/retry.ts、lib/verify-config/verify-config.ts）。詰める論点: (a) 「chartAndApps 1件を処理し、fatal は投げ、それ以外は ERROR に落とす」という共通の骨組みを高階関数（例: `runSettled(logContext, fn)`）や `mapWithConcurrency` 側に寄せて、各stepから catch 節そのものを消せるか。消した場合に `rethrowWithAppContext()`（アプリ名を足して投げ直す）や step ごとに違う成功時の戻り値（`TargetOutcome` / `PlanResult` / `ChartUpdateResult`）と噛み合うか。(b) 戻り値の型で fatal が混ざらないことを表現できるか（例: 成功/ERROR を表す型を返しつつ fatal だけは例外で抜ける、という現状の二重チャネルを保つか、Result型に寄せるか）。(c) lib/gitlab の 404/403 フォールバックのような「特定ステータスだけ握りつぶす」catch は骨組みの対象外とするか。(d) 方針を1箇所に集約しているという現状の設計意図（steps/shared/step-outcome.ts の冒頭コメント）をどう維持するか。決めた方針は docs/architecture.md「コードからは読み取れない設計判断」に記録する。現状維持と決めた場合も同様に理由を記録して決着させる

**difficulty**: opus

**evidence**: コード変更なし（方針決定のみ）。決定: (1) fatalは例外・chartAndApps単位の失敗は戻り値、という2チャネルを維持する（Result型への一本化は、各stepに「fatalなら伝播」の判断が戻るため却下）。(2) 3つのstepのcatch節を高階関数 runSettled() / withAppContext() に吸収し、steps/ 配下のtry/catchを0件にする。(3) lib/gitlab の404/403フォールバック・utils/retry.ts・verify-config.ts のcatchは対象外（前2つはHTTPステータスを正常系に変換する処理、verify-configは問題を全件列挙する別プログラム）。ユーザーが懸念した「filter-targetsでfatalがsettledになる」は挙動としては起きておらず（settleAsError()がFatalErrorを投げ直す。回帰テストもある）、問題は書き方が誤読を招くことだと切り分けた。docs/architecture.md「コードからは読み取れない設計判断」に記録。実装は T-066

## T-066

**タスク**: T-065 で決めたエラーハンドリング方針を実装する。目的は「fatalは実行全体を落とし、それ以外はERRORに計上して続行する」という方針を `src/steps/shared/step-outcome.ts` の1箇所だけに置き、3つのstepから `try`/`catch` を消すこと（現状は各stepが `catch (err) { return settleAsError(err, logContext) }` と書いており、fatalもERRORに計上して続行するように読める）。

実装方針（T-065 の決定。詳細は docs/architecture.md「コードからは読み取れない設計判断」の該当項目）:

(1) `src/steps/shared/step-outcome.ts` に、chartAndApps 1件分の結果を表す共通の型と、それを組み立てる高階関数を追加する。型は現在 `filter-targets.ts` の `TargetOutcome` と `build-plans.ts` の `PlanResult` に重複して定義されているものを1つに寄せる形にする（例: `StepOutcome<T> = { status: "ok"; value: T } | { status: "settled"; result: ChartUpdateResult }` と、生成用の `ok()` / `settled()`）。

(2) 同ファイルに `runSettled<T>(chartAndApps, fn: (logContext) => Promise<StepOutcome<T>>): Promise<StepOutcome<T>>` を追加する。`buildLogContext()` の呼び出しと `try`/`catch` はこの中だけに置き、捕捉した例外は既存の `settleAsError()` に渡す（fatalは `FatalError` として投げ直され、それ以外は `ERROR` を返して settled になる）。

(3) 3つのstepの並列処理1件分の関数（`evaluateTarget()` / `planTarget()` / `applyUpdate()`）を `runSettled()` に載せ替え、`try`/`catch` と `buildLogContext()` の直接呼び出しを消す。`applyUpdate()` は成功時の値が `ChartUpdateResult`（"CREATED"）なので `StepOutcome<ChartUpdateResult>` を使い、`applyUpdates()` 側で `outcome.status === "ok" ? outcome.value : outcome.result` の1行に潰す。

(4) `build-plans.ts` の `buildAppUpdatePlan()` にある `try`/`catch`（`rethrowWithAppContext()` を呼ぶもの）も、`step-outcome.ts` に `withAppContext<T>(projectName, fn: () => Promise<T>): Promise<T>` を追加して吸収する。`rethrowWithAppContext()` はその内部実装にする（非公開にできるなら非公開にする）。

(5) 対象外（触らない）: `src/lib/gitlab/gitlab.ts` の404/403フォールバック、`src/utils/retry.ts`、`src/lib/verify-config/verify-config.ts` の `catch`。

完了条件: (a) `grep -rn "try {" src/steps/` が **0件** であること、(b) fatal（401 / 5xx / ECONNREFUSED / ENOTFOUND / ETIMEDOUT のいずれか）で実行全体が `FatalError` になりERRORとして計上されないこと、および fatal でないエラーは該当 chartAndApps だけがERRORになり他が続行することを、3つのstepそれぞれについてテストで示すこと（filter-targets には401のテストが既にあるので、build-plans・apply-updates 側を確認し不足分を足す）、(c) `pnpm check` を通すこと。既存テストの件数は減らさない。

**difficulty**: sonnet

**dependencies**: T-065

**evidence**: steps/shared/step-outcome.ts に StepOutcome<T>（+ ok()/settle()）・runSettled()・withAppContext() を追加し、3つのstepの catch 節と buildLogContext() の直接呼び出しを吸収した（rethrowWithAppContext() は非公開化、filter-targets の TargetOutcome と build-plans の PlanResult は StepOutcome<T> に統合）。捕捉は step-outcome.ts の .catch() 2箇所だけになり、grep -rn "try {" src/steps/ は0件。テスト2件追加（filter-targets・build-plans で「非fatalなエラーは該当chartAndAppsだけERROR、他は続行」。apply-updates は既存テストが同じ観点を満たしていた）。pnpm check（28ファイル321テスト、319→321）通過。sonnetのサブエージェントに委譲し、メイン側で settle()/settled 変数の名前衝突の解消と、JSDocの動機の書き直し（grep対策ではなく捕捉の集約が目的）を行って受け入れた

## T-067

**タスク**: 型定義をどこに置くかの方針を決める（適用は T-068）。ユーザーの問題意識（2026-09-06）:「`src/types/` にあったり、filter-targets のようにファイル内にあったり、build-plans/sub-steps/types.ts にあったりで一貫した設計方針が無く、ブレて見える」。現状の分布（調査済み）: `src/types/types.ts` + `src/types/brand.ts` にドメイン型を集約する一方、`src/steps/filter-targets/filter-targets.ts`（`FilterTargetsResult`・`TargetOutcome`）、`src/steps/build-plans/build-plans.ts`（`BuildPlansResult`・`BuildPlanContext`・`PlanResult`）、`src/steps/build-plans/sub-steps/types.ts`（6型）、同 sub-steps の各ファイル（`ValuesYamlDraft` 等）、`src/lib/`（`GitlabClient`・`RemoteCache`・`ConfigTarget`・`Anchors` 等）、`src/utils/partition.ts`（`Sorted`）に分散している。詰める論点: (a) 判断軸を CLAUDE.md の原則2（技術・外部システム・ファイル形式に依存するか）と揃えられるか。すなわち「型もそれを使うコードと同じ場所に置き、`src/types/` にはステップ横断のドメイン型だけを置く」という軸で現状を説明できるか、説明できない例外はどれか。(b) `sub-steps/types.ts` のように型だけを集めたファイルを作ってよい条件（使う側が複数ファイルにまたがるときだけ、など）。(c) 1ファイル内でしか使わない型（`TargetOutcome`・`BuildPlanContext`）は今のままそのファイルに置く、で確定してよいか。(d) `lib/` の型（`GitlabClient` 等）を `src/types/` に動かす必要が無いことの根拠。方針は CLAUDE.md「アーキテクチャ概要」の「新しいコードを置く場所」に型の行を足す形で明文化し、詳細が要れば docs/architecture.md に書く。**この時点で「動かす対象と動かさない対象の一覧」まで出すこと**（T-068 はそのリストどおりに動かすだけにする）

**difficulty**: opus

**evidence**: コード変更なし（方針決定のみ）。型の置き場所も「新しいコードを置く場所」と同じ基準で決める（利用箇所の数では決めない）と定め、6分類の表を docs/architecture.md に、要約を CLAUDE.md「アーキテクチャ概要」に追記した。要点: ドメイン語彙は src/types/types.ts（利用箇所が1ファイルの Config・PipelineInfo・RunResult も意図的に残す）、技術のインターフェースは lib/、ステップ内部の作業用の型は「その型を生み出す関数と同じファイル」、sub-steps/types.ts は「特定の1ファイルに帰属しない共有型」だけに絞る。全型の使われ方を数えた結果、この基準から外れているのは2件だけ（LatestTagResolution・BuildChartUpdateAcc）で、移動対象として T-068 に確定させた

## T-068

**タスク**: T-067 で決めた型定義の配置方針（docs/architecture.md「新しいコードを置く場所の判断基準」の型の表、および CLAUDE.md「アーキテクチャ概要」の要約）に合わせて、基準から外れている型2件を移動する。全型の使われ方を数えた結果、動かすのはこの2件だけで、他は現状の位置が基準どおりなので触らない。

(1) `LatestTagResolution` を `src/steps/build-plans/sub-steps/types.ts` から `src/steps/build-plans/sub-steps/resolve-latest-tag.ts` へ移す。理由: これは `resolveLatestTag()` が組み立てる戻り値の型で、「その型を生み出す関数と同じファイル」に置く分類に当たる（同じ分類の先例として `ValuesYamlDraft` が `values-yaml-draft.ts` に、`ApplyHelmTargetsAcc` が `helm-target-branch-target.ts` にある）。参照元は `resolve-latest-tag.ts` と `image-tag-target.ts` の2ファイル。JSDoc（`trackedHeadTagNames` の説明）は一字一句そのまま移すこと。

(2) `BuildChartUpdateAcc` を同 `types.ts` から `src/steps/build-plans/build-plans.ts` へ移す。理由: 参照しているのは `build-plans.ts` だけで（`buildPlan()` と非公開関数 `buildAppUpdatePlan()` の間で受け渡すアキュムレータ）、`types.ts` の条件「複数のサブステップが共有する型」を満たさない。JSDocはそのまま移すこと。移動後の `types.ts` に残るのは `LoadValuesYamlContent` / `BranchExists` / `ApplyTargetsAcc<U>` の3つ（いずれも複数のサブステップから参照されている）。

型の中身・名前・エクスポートの有無は変えない。import の張り替えのみ行う。

完了条件: 移動した2型それぞれについて移動後の位置と参照元を示し、`pnpm check` を通すこと（テスト件数が変わらないこと＝移動でテストが対象から外れていないことも確認する）。

**difficulty**: sonnet

**dependencies**: T-067

**evidence**: LatestTagResolution を sub-steps/types.ts → sub-steps/resolve-latest-tag.ts へ（参照元は resolve-latest-tag.ts 自身と image-tag-target.ts）、BuildChartUpdateAcc を同 types.ts → build-plans.ts へ移動（参照元は build-plans.ts のみだったため、メイン側で export も外して非公開にした）。JSDocは一字一句そのまま。types.ts に残るのは複数サブステップ共有の3型（LoadValuesYamlContent / BranchExists / ApplyTargetsAcc<U>）。pnpm check（28ファイル321テスト、変化なし＝移動でテストが対象から外れていない）通過。sonnetのサブエージェントに委譲し、メイン側で差分を確認して受け入れた

## T-069

**タスク**: URL を文字列で扱っている箇所を型で縛れないか検討し、決めた方針まで実装する。ユーザーの問題意識（2026-09-06）:「URL を string で扱っている箇所があるように見える。`URL` インターフェースを使うなど型で縛ることを検討してほしい」。現状の事実（調査済み）: `GitLabUrl` は `string` のブランド型（src/types/brand.ts）で、生成経路は3つ ―― (1) src/lib/env.ts の `validateGitlabUrl()`（`URL.canParse()` と protocol を検証済み）、(2) src/lib/gitlab/gitlab.ts の `getProjectWebUrl()`（`String(project.web_url)`、**検証なし**）、(3) 同 `getLatestPipelineForRef()`（`String(pipeline.web_url)`、**検証なし**）。組み立て側は src/lib/gitlab/mr-content.ts が `${webUrl}/-/tags/${encodeURIComponent(tagName)}` のような**文字列連結**で、`buildTagUrl()` の戻り値は素の `string`（`GitLabUrl` ですらない）。詰める論点: (a) `GitLabUrl` を `URL` オブジェクトに置き換えるか、ブランド型のままにして生成経路(2)(3)にも検証を通すか。`URL` はミュータブルで JSON ログにそのまま載せると `{}` にならないか（logger の出力・MR本文への埋め込み・テストの比較のしやすさ）を確認して判断する。(b) パスの結合を `new URL(path, base)` に寄せるべきか、GitLab の web_url がサブパス付き（例: `https://example.com/gitlab`）でも壊れないか。現状の連結方式との差を確認する。(c) MR本文に出す最終形は文字列なので、型で縛る範囲の境界をどこに引くか。(d) `TagName` などのブランド型と `encodeURIComponent` の関係（どこでエスケープするかを型で表せるか）。完了条件: 決めた方針を docs/architecture.md「コードからは読み取れない設計判断」に記録し、コード変更を伴う場合は既存のMR本文の出力が変わらないことをテストで示して `pnpm check` を通すこと

**difficulty**: opus

**evidence**: GitLabUrl は URL オブジェクトにせず文字列のブランド型のまま（href正規化で出力が変わる・ミュータブル・テスト比較が煩雑で、用途はMR本文とログへの埋め込みだけ）。代わりに生成経路を縛り、toGitLabUrl() を http(s) 検証つきファクトリにして env.ts の validateGitlabUrl() の検証をそこへ一本化、無検証だった GitLab API 由来の2箇所（project.web_url / pipeline.web_url）も必ず通るようにした。buildTagUrl() の戻り値を GitLabUrl にし、compare URL も buildCompareUrl() に切り出してエスケープを2関数に閉じ込めた。new URL(path, base) へ寄せない理由（webUrlはオリジンではなくプロジェクトのパスまで含むため、ベースのパスが捨てられる）も docs/architecture.md に記録。テスト1件追加（web_urlが不正ならMR本文に載る前にエラー）。pnpm check（28ファイル322テスト、321→322）通過。既存のMR本文のテストが無変更で通ることで出力が変わっていないことを確認

## T-070

**タスク**: `tasks.json` と `progress.md` を新設する `develop/` ディレクトリへ移動する（ユーザー依頼、2026-09-06。理由: アプリケーションの機能に関係しない進捗管理用ファイルをリポジトリ直下から追い出す）。`git mv tasks.json develop/tasks.json`、`git mv progress.md develop/progress.md`。参照を張り替えるファイル: CLAUDE.md（「進捗管理とHandoff」の手順、「コーディング規約」のタスク番号の節にある `grep -rE "T-[0-9]{3}"` の除外対象の記述、「関連リンク」）、docs/workflow.md（全体。冒頭の説明・アーカイブ節のパス）、docs/glossary.md、docs/history/tasks-archive.md・docs/history/progress-archive.md 内の相対リンク（`./tasks-archive.md` 等が `develop/` からの相対で正しく解決されるか確認する）、progress.md 自身が持つ `docs/` へのリンク（`./docs/history/...` → `../docs/history/...`）、README.md にプロジェクト構成ツリーがあれば追記。`docs/history/` を `develop/` 配下に動かすかどうかは今回のスコープ外（現状のまま `docs/history/` に残す）。完了条件: 移動後に `pnpm check` が通り、移動した2ファイルとリンク元のMarkdownの相対リンクがすべて実在するパスを指していることを確認すること

**difficulty**: haiku

**evidence**: git mv で tasks.json / progress.md を develop/ へ移動し、CLAUDE.md（規約のgrep除外・進捗管理の手順・関連リンク）・docs/workflow.md（5箇所）・README のプロジェクト構成ツリー・progress.md 自身の相対リンク（./docs/ → ../docs/）を張り替えた。.gitlab-ci.yml / package.json / .prettierignore / vitest.config.ts にパス参照が無いことも確認。docs/history/ 配下の言及は当時の記録なのでそのまま。pnpm check（28ファイル322テスト、変化なし）通過。haikuのサブエージェントに委譲し、メイン側で差分確認・READMEのツリー位置と行の折り返しを整えて受け入れた

## T-071

**タスク**: `TargetClient`（src/types/types.ts）の `tenantId`/`clientId` を `string` ではなく ブランド型 `TenantId`/`ClientId` で扱う。現状は `ChartAndApps.tenantId`/`clientId` が `TenantId`/`ClientId`（`toTenantId`/`toClientId` で生成）なのに対し、絞り込み条件である `TargetClient` だけが素の `string` になっており非対称（`src/lib/env.ts` の `parseTargetClientEntry()` が `{ tenantId: parts[0], clientId: parts[1] }` とそのまま代入している）。

変更対象:
(1) `src/types/types.ts` の `TargetClient` を `readonly tenantId: TenantId` / `readonly clientId: ClientId` に変更する。
(2) `src/lib/env.ts` の `parseTargetClientEntry()` で `toTenantId(parts[0])` / `toClientId(parts[1])` を使って生成する（`as` は使わない。`brand.ts` の factory 関数のみで型変換する規約）。
(3) `src/lib/config/config.ts` で `TargetClient` を比較している3箇所（`loadClientChartAndApps()` の `c.tenantId === id` / `c.tenantId === tenantId && c.clientId === id`、`clientDirExists()` の `join(path, chartDir, client.tenantId, client.clientId)`）は、比較・パス結合の相手が `listSubdirectories()`由来の素の `string`（ディレクトリ名）なので、`TargetClient` 側を 変換するのではなく比較・結合の相手を `toTenantId(id)` 等で揃えるか、あるいは 型上は互換なため変更不要かを確認し、コンパイルが通る形にする（`ConfigTarget.chartDir` は 今回のスコープ外＝素の`string`のまま。`TargetClient` のみが対象）。

完了条件: `pnpm check` を通すこと。テストは既存の `test/lib/env.test.ts` / `test/lib/config/config.test.ts` がそのまま（またはブランド型を使うよう最小修正して）通ることで確認する。

**difficulty**: sonnet

**evidence**: TargetClient.tenantId/clientId を TenantId/ClientId に変更し、env.ts の parseTargetClientEntry() を toTenantId()/toClientId() 経由の生成に直した。config.ts の比較・パス結合3箇所はブランド型が string のサブタイプであるため型エラーにならず変更不要だった（無理な変換を挿入していない）。test/lib/config/config.test.ts に targetClient() ヘルパーを追加して9箇所のリテラルを置換。pnpm check（28ファイル322テスト、変化なし）通過。sonnetのサブエージェントに委譲し、メイン側で差分と pnpm check を確認して受け入れた

## T-072

**タスク**: フィールド名と型名がズレている箇所を洗い出し、`AnchorTarget.anchor: AnchorName` → `anchorName: AnchorName` と同じリネームをどこまで横展開するか方針を決める（実装は T-073）。ユーザー指摘（2026-09-06）:「特に理由がない限り型の名前に合わせてください」。

調査で分かった事実:

- 型名から `Name`/`Id` 等のサフィックスを外した名前がそのままフィールド名になっている例: `AnchorTarget.anchor: AnchorName`（16箇所で参照）、`HelmTargetBranchConfig.branch: BranchName` と `ParsedTag.branch: BranchName`（4箇所）、`ChartAndApps.chartDir: ChartDirName`（12箇所）。
- 逆に既に型名と一致しているフィールドも多い: `projectId: ProjectId`、`projectName: ProjectName`、`tenantId: TenantId`、`clientId: ClientId`、`valuesPath: ValuesPath`。
- `src/lib/helm.ts` は関数引数として既に `anchorName: AnchorName` という命名を使っており（`findAnchorNode()`・`getValueAtAnchor()`・`setValueAtAnchor()`）、`AnchorTarget.anchor` だけが浮いている状態。
- 一方、`branchToSync`（`AppConfig`）・`mrTargetBranch`（`ChartRepoConfig`）・`previousBranch`/`newBranch`（`HelmTargetBranchUpdate`）は、いずれも型 `BranchName` だがフィールド名に用途を表す修飾語（`~ToSync`・`mrTarget~`・`previous~`/`new~`）が付いており、単純に型名を外しただけの `branch` とは事情が異なる（「特に理由がない限り」の「理由」に当たりうる）。
- `TagName` 型は `ParsedTag.name` / `TagInfo.name` のように「型名からプレフィックス `Tag` を外した `name`」という別パターンのズレもある（`AnchorName`→`anchor`のようにサフィックス`Name`を外すのと逆方向）。これも対象に含めるかは論点。
- 同じ「型名 → フィールド名」のズレは、構造体のフィールドだけでなく `branch: BranchName` のような**関数の引数名**にも多数存在する（`src/lib/gitlab/gitlab.ts`・`src/lib/gitlab/tag.ts`・`src/steps/build-plans/sub-steps/*.ts` など10ファイル以上、数十箇所）。ここまで含めると非常に大きな機械的リネームになる。

決めること:
(a) リネーム対象を「型定義（`type`/`interface`）のフィールド」に限定するか、関数引数名も含めるか（範囲が大きく変わる。含めない場合はその理由を明記する）。
(b) `branchToSync`・`mrTargetBranch`・`previousBranch`・`newBranch` のように修飾語が付いているケースを「理由がある」として除外するか、それとも `previousBranchName`/`newBranchName` のように型名も残す形にするか。
(c) `TagName`→`name`（プレフィックスを外すパターン）を対象に含めるか。
(d) `AnchorTarget.anchor`・`HelmTargetBranchConfig.branch`・`ParsedTag.branch`・`ChartAndApps.chartDir` の要リネーム対象を確定する。

各対象について、リネーム後の名前・影響ファイル・件数まで具体的なリストにして出すこと（T-073はそのリストどおりに機械的に置換するだけにする）。決めた方針・対象外にした理由は `docs/architecture.md`「コードからは読み取れない設計判断」に記録する。

**difficulty**: opus

**evidence**: コード変更なし（方針決定のみ）。規則: 型定義のフィールド名はブランド型が表している語（Name等）を落とさない。適用は型定義のフィールドのみで、関数の引数名は対象外（引数は型注釈が同じ行に見えるが、フィールドはドットアクセスで宣言から離れて読まれる、という違いで線を引いた）。修飾語が「どれか」を担うもの（branchToSync・mrTargetBranch・previousBranch・newBranch）と、包含型が主語を与える name（ParsedTag.name・TagInfo.name）、gitbeakerのペイロード形状である CommitAction.filePath も対象外。リネーム対象6件を確定し T-073 に渡した。docs/architecture.md に記録

## T-073

**タスク**: T-072 で確定したリネーム対象6件を実施する。型の中身・意味は変えず、名前の変更のみ。判断は済んでいるので、以下のリストどおりに機械的に置換すること（迷ったら docs/architecture.md「コードからは読み取れない設計判断」の該当項目を参照）。

(1) `AnchorTarget.anchor: AnchorName` → `anchorName`。参照は16箇所（src: types/types.ts・lib/config/schema.ts・lib/config/validate.ts・lib/helm.ts・lib/verify-config/verify-config.ts・lib/gitlab/mr-content.ts・steps/build-plans/sub-steps/image-tag-target.ts・同 helm-target-branch-target.ts、test: steps/build-plans/sub-steps/image-tag-target.test.ts・lib/config/schema.test.ts）。**anchors.yaml のキー名 `anchor` は変えない**。`schema.ts` の `AnchorTargetSchema` の `.transform((v): AnchorTarget => ({ valuesPath: v.valuesPath, anchor: v.anchor }))` を `anchorName: v.anchor` に直して、wire format と内部表現をここで詰め替える。

(2) `HelmTargetBranchConfig.branch: BranchName` → `branchName`。生成箇所は `lib/config/helm-target-branch.ts` の `return { branch: branchToSync, targets }`。

(3) `ParsedTag.branch: BranchName` → `branchName`。生成箇所は `lib/gitlab/tag.ts`（`parseTag()`・`buildNewTag()`）。

(4) `ChartAndApps.chartDir: ChartDirName` → `chartDirName`（参照12箇所: steps/shared/step-outcome.ts・lib/verify-config/verify-config.ts・lib/config/config.ts・test/lib/config/config.test.ts）。あわせて `ConfigTarget.chartDir?: string`（lib/config/config.ts）も同じ概念なので `chartDirName` に揃える（**型は素の `string` のまま**。参照は main.ts の `chartDir: TARGET_CHART` も含む）。`config.ts` 内にはブランド化前のディレクトリ名を指す素の `string` のローカル変数 `chartDir` があるが、そちらは変えない（区別が付くようになるのがこのリネームの狙いの一つ）。

(5) `ImageTagUpdate.previousTag: TagName | undefined` → `previousTagName`。参照は lib/gitlab/mr-content.ts（`buildImageTagRow()`）・steps/shared/step-outcome.ts（`describePlan()`）・steps/build-plans/sub-steps/image-tag-target.ts・test 側。**`AppUpdatePlan.latestTag`（`ParsedTag`）は変えない**。

(6) `FileUpdate.filePath: ValuesPath` → `valuesPath`。参照は steps/build-plans/sub-steps/values-yaml-draft.ts の `toFileUpdates()`・lib/gitlab/gitlab.ts の `commitFileUpdates()`。**`CommitAction.filePath` は `gitlab.Commits.create()` に渡す gitbeaker のペイロード形状なので変えない**（`filePath: file.valuesPath` という詰め替えになる）。`getFileContent()` の引数名 `filePath` も引数なので変えない。

上記以外はリネームしない（`branchToSync`・`mrTargetBranch`・`previousBranch`・`newBranch`・`ParsedTag.name`・`TagInfo.name`・関数の引数名すべて）。

完了条件: 6件それぞれについて変更後の名前と影響ファイルを示し、`pnpm check` を通すこと。テスト件数が変わらないこと、`config-test/` と `config/` のYAMLを変更していないこと（wire formatは不変）も確認する。

**difficulty**: sonnet

**dependencies**: T-072

**evidence**: 6件をリネーム（anchor→anchorName、HelmTargetBranchConfig.branch/ParsedTag.branch→branchName、chartDir→chartDirName（ConfigTarget側も）、previousTag→previousTagName、FileUpdate.filePath→valuesPath）。anchors.yaml のキー `anchor` と CommitAction.filePath（gitbeakerのペイロード形状）は不変で、詰め替えは schema.ts の .transform() と commitFileUpdates() が担う。ログキーは chartDir→chartDirName・previousTag→previousTagName に追従。pnpm check（28ファイル322テスト、変化なし）通過、config/・config-test/ のYAMLは差分なし。sonnetのサブエージェントに委譲し、メイン側で `const { branchName: branch }` と旧名に戻していたエイリアスを branchName に直して受け入れた

## T-074

**タスク**: コメントの書き方の方針を決める（適用は T-075）。ユーザー指摘（2026-09-06）:「コメントはシンプルかつ簡潔に、基本はコメントがなくてもわかるような実装を目指してください」。

現状の事実: `src/types/types.ts`（169行）はコメント行が66行（約39%）、`src/types/brand.ts`（104行）は31行（約30%）で、JSDocが型の説明・生成元（どのYAMLキー由来か）・具体例まで長文で書かれている（例: `AnchorName` のJSDocが4行、`ChartAndApps` のJSDocが5行）。CLAUDE.mdには既に「コードからは読み取れない設計判断はdocs/architecture.mdに書く」という住み分けがあるため、型定義ファイルのJSDocは本来「その型が何であるか」という短い説明で足りるはずの箇所に、経緯・理由まで書き込まれて長くなっている可能性がある。

決めること:
(a) 「コメントを書かない」を目指す基準（型名・フィールド名から自明なら省略する／1行で済む要約に削る／複数文にわたる背景説明は`docs/architecture.md`か`docs/glossary.md`へ移すか削除する、など）。
(b) 逆に**残すべきコメント**の基準（外部システム・ファイル形式との対応関係でコードだけでは読み取れないもの、非自明な制約や理由）。CLAUDE.mdの「コードからは読み取れない設計判断」の考え方と矛盾しないようにする。
(c) `src/types/types.ts`・`src/types/brand.ts` を題材に、上記基準を適用した後の各コメントの扱い（削除／要約して1行に／`docs/`へ移す／そのまま残す、を型ごとに）を具体的に決める。
(d) 決めた基準を今後の開発にも適用できるよう、`CLAUDE.md`「コーディング規約・レビュー方針」に短く追記する。

決めた内容は `docs/architecture.md` または `CLAUDE.md` に記録し、`src/types/types.ts`・`src/types/brand.ts` に対する具体的な適用内容（(c)）は T-075 がそのまま実装できる粒度で書き出すこと。

**difficulty**: opus

**evidence**: コード変更なし（方針決定のみ）。基準: コメントはコードから読み取れないことだけを書く／型名・フィールド名の言い換えは書かない／書く場合も原則1〜2文で、それを超える背景・理由は正典（docs/architecture.md・glossary.md・requirements.md）に置き二重管理しない／残す価値があるのは「外部との対応関係」と「非自明な前提・制約」。CLAUDE.md「コーディング規約・レビュー方針」に追記。types.ts・brand.ts の長いJSDocの中身は既に正典側にあることを確認済み（アンカー方式→glossary.md、chartを配列にする理由→requirements.md 210-211行、GitLabUrlがブランド型の理由→architecture.md）なので、T-075 は移設ではなく削除・圧縮だけで済む。型ごとの扱いは T-075 の本文に列挙した

## T-075

**タスク**: T-074 で決めたコメント方針（CLAUDE.md「コーディング規約・レビュー方針」の該当項目）を `src/types/types.ts` と `src/types/brand.ts` に適用する。**長い説明の中身は既に正典（docs/glossary.md・docs/requirements.md・docs/architecture.md）にあることを確認済みなので、docs への移設は不要。削除と圧縮だけでよい**。型の中身・名前・エクスポートの有無は変えない。

`src/types/types.ts`:

- `TargetClient`: 1行に。残す情報は「TARGET_CLIENTS 環境変数由来の絞り込み条件1件分」だけ（tenantId/clientIdの組であることはフィールドを見れば分かる）
- `AnchorTarget`: 1行に。「（対象ファイル＋その中でのYAMLアンカー名）」はフィールドの言い換えなので削る
- `HelmTargetBranchConfig`: 6行→2行程度に。残すのは外部との対応（`branchName` は config.yaml の `helm.branchToSync` 由来、`targets` は anchors.yaml の `helm.chart[]` のうち valuesPath 一致分）。「タグの命名規則のような自動生成・自動判定の仕組みは持たず単純に比較する」は削る（`helm-target-branch.ts` を読めば分かる）。`targets` のフィールドJSDocは、親のJSDocに `helm.chart[]` 由来と書くなら削除してよい
- `AppConfig`: 5行→2行程度に。「config.yaml の運用値」「anchors.yaml から projectId で引いた書き込み先」という対応関係だけ残す。`chart` フィールドの5行JSDocは「同じ最新タグを複数箇所へ反映するため配列」＋「anchors.yaml の apps[].chart[] 由来」の1〜2行に（配列にする理由の詳細は docs/requirements.md 4章にある）。`helmTargetBranch` フィールドJSDocは1行に
- `ChartAndApps`: 5行→2行程度に。「`config/<chart>/<tenantId>/<clientId>/`1つ分」「MRを作成する単位」を残し、「tenantId/clientIdが異なれば別のChartAndApps」は前段から導けるので削る
- `TagInfo`: 5行→1行に（または削除）。「名前だけでなくSHAも保持」はフィールドの言い換え、「HEADと一致するか判定するために使う」は利用側（resolve-latest-tag.ts）の話
- `ImageTagUpdate`: 2行→1行に。**JSDoc内に旧フィールド名 `previousTag` が残っているので `previousTagName` に直すこと**。`target` フィールドのJSDoc（「values.yaml内でイメージタグを書き換える1箇所分」）は型 `AnchorTarget` から自明なので削除
- `HelmTargetBranchUpdate`: 3行→1〜2行に。`previousBranch` が values.yaml 側の現在値、`newBranch` が config.yaml 設定値、という対応だけ残す。`target` フィールドのJSDocは削除
- `AppUpdatePlan`: 4行→2行程度に。「`updates`・`helmTargetBranchUpdates` がいずれも空ならこの `AppUpdatePlan` 自体を生成しない」は非自明なので必ず残す
- `ChartRepoConfig`・`Config`・`ParsedTag`・`PipelineInfo`・`FileUpdate`・`ChartUpdateTarget`・`ChartUpdateResult`・`RunResult`: 現状のまま（既に1行以下）

`src/types/brand.ts`:

- ファイル冒頭の4行: 2行程度に。「`src/` 内で `as` を使うのはこのファイルだけ」（機械的に検証できる根拠）は残す
- `TagFormat`: 3行→1行に。「検証は `lib/gitlab/tag.ts` の `validateTagFormat()` が行う」は残す
- `GitLabUrl`: 4行→1〜2行に。「`URL`オブジェクトではなく文字列のブランド型である理由」は docs/architecture.md にあるので、そこを見ろとは書かず単に削る
- `toGitLabUrl`: 4行→1〜2行に。「唯一の生成経路で、未検証の文字列が `GitLabUrl` にならない」は残す
- `AnchorName`: 5行→1行に。例（`&appsVersion` の `appsVersion` 部分）だけ残し、values.yaml がアンカー方式である前提の説明は削る（docs/glossary.md にある）
- その他のブランド型: 現状のまま

完了条件: 変更後の2ファイルを提示し、`pnpm check` を通すこと（コメントのみの変更なのでテスト件数は322のまま）。**コード（型定義・関数の実装）は1文字も変えないこと**を `git diff` で確認する。

**difficulty**: sonnet

**dependencies**: T-074

**evidence**: types.ts 169→128行、brand.ts 104→88行（コメントのみの変更で、型定義・関数実装・エクスポートは無変更。git diff で +/- 行がすべてコメントであることを確認）。長い説明は正典（glossary.md・requirements.md・architecture.md）にあるため移設せず削除。ImageTagUpdate のJSDocに残っていた旧名 previousTag も previousTagName に修正。pnpm check（28ファイル322テスト、変化なし）通過。sonnetのサブエージェントに委譲し、メイン側で TagFormat の「何であるか」が消えて文が宙に浮いていた点と TargetClient の3行JSDocを1行に直して受け入れた

## T-076

**タスク**: `mr-content.ts` の `buildMrDescription()` が `ResolveWebUrl`（`projectId`を受けて`Promise<GitLabUrl>`を返す関数）を受け取っている箇所を、値（解決済みのURLの集合）を渡す形に直す。ユーザー指摘（2026-09-06）:「関数を渡すことになっているが`GitLabUrl`を渡せばいいだけな気がする」。

調査で分かった事実:

- `mr-content.ts` の冒頭コメントは「外部I/Oを持たない純粋な文字列組み立てだけを置く」と宣言しているが、`buildMrDescription()` は実際には非同期で、`webUrlCache`（`getOrFetch()`）を使ったキャッシュ管理までこのファイル内で行っており、宣言と実装がズレている。
- `ResolveWebUrl`が必要に見える理由（`plans`内に複数の異なる`projectId`が含まれうるためwebUrlを`projectId`ごとに解決する必要がある）は本物だが、**呼び出し時点で`plans`から必要な`projectId`の集合は全部分かっている**（`plans.map(p => p.app.projectId)`）。唯一の呼び出し元 `apply-updates.ts` の `applyUpdate()` は既に `gitlab` クライアントを持っているため、`buildMrDescription()` を呼ぶ**前に**必要な`projectId`ぶんの`webUrl`をまとめて解決してしまえる。`build-plans/sub-steps`の`LoadValuesYamlContent`/`BranchExists`が関数のままで正しい理由（アプリを1つずつ処理する過程で必要なキーが逐次分かり、同じキャッシュをアプリ間で引き継ぐ必要がある）とは事情が異なり、こちらは横展開の対象ではない。

変更方針:
(1) `src/lib/gitlab/gitlab.ts` に、複数の`projectId`ぶんのweb URLをまとめて解決する関数を追加する（例: `getProjectWebUrls(gitlab, projectIds: readonly ProjectId[]): Promise<ReadonlyMap<ProjectId, GitLabUrl>>`）。重複する`projectId`は1回だけ解決する（`[...new Set(projectIds)]`等で重複排除してから`getProjectWebUrl()`を並列に呼ぶ）。
(2) `mr-content.ts` の `buildMrDescription()` のシグネチャを `(webUrls: ReadonlyMap<ProjectId, GitLabUrl>, plans: readonly AppUpdatePlan[]) => string` に変え、**同期関数にする**（`async`・`webUrlCache`・`getOrFetch()`を使ったreduceを削除し、単純な`.flatMap()`等に置き換える）。該当する`projectId`が`webUrls`に無い場合の扱いは既存の`resolveWebUrl()`が失敗しうる状況（GitLab APIエラー）とは異なる新しいケースなので、呼び出し元の前提（`plans`にあるすべての`projectId`について事前に解決済みである）をコメントで明記するか、無い場合にエラーを投げるかを決めて実装する。
(3) `ResolveWebUrl` 型は不要になるため削除する。
(4) `apply-updates.ts` の `applyUpdate()` で、`buildMrDescription()` を呼ぶ前に`getProjectWebUrls(gitlab, plans.map(p => p.app.projectId))` を呼んで結果を渡すよう変更する。
(5) `test/lib/gitlab/mr-content.test.ts` の `makeResolveWebUrl()` ヘルパーと全呼び出し箇所（13箇所以上）を、`ReadonlyMap`を直接組み立てて渡す形に書き換える。「同じプロジェクトの web_url 取得は1回だけ呼び出す」というテストは、キャッシュの責務が`getProjectWebUrls()`側に移るため、`test/lib/gitlab/gitlab.test.ts`側に同趣旨のテスト（重複する`projectId`を渡しても`Projects.show`は一意な数だけ呼ばれる）として移設する。

完了条件: `pnpm check` を通すこと。`buildMrDescription()` が同期関数になり`async`・`Promise`を含まなくなること、`grep -rn "ResolveWebUrl"` が0件になることを確認する。テスト件数が大きく変わらないこと（移設分を除き増減なし）。

**difficulty**: sonnet

**evidence**: buildMrDescription() を ReadonlyMap<ProjectId, GitLabUrl> を受け取る同期関数にし、ResolveWebUrl型・webUrlCache・getOrFetchのreduceを削除（mr-content.ts から async/Promise が消え、冒頭コメントの「外部I/Oを持たない純粋な文字列組み立て」と実装が一致した）。URLの解決とキャッシュは gitlab.ts の新関数 getProjectWebUrls()（重複projectIdは1回だけ解決）に移し、apply-updates.ts が事前に呼ぶ。テストは mr-content.test.ts をMap渡しに書き換え、重複排除のテストは gitlab.test.ts へ移設（28ファイル322テストで増減なし）。sonnetのサブエージェントがセッション上限で途中終了したため、メイン側で残りのテスト修正・重複排除テストの移設に加え、向き先ブランチだけのplanのURLまで取得してしまう無駄を webUrlProjectIds() の導入で解消して仕上げた

## T-077

**タスク**: ドキュメント・コメントに残っている「実装と食い違う記述」を4箇所直す。すべて現物を確認済みで、直す内容は確定している（判断は不要、記載どおりに置換すること）。

(1) `README.md` の「実行ログの例」（現在120〜121行目）の `update_chart` 行が実際の出力と違う。実際に出るキーは `src/steps/shared/step-outcome.ts` の `buildLogContext()` と `describePlan()` が決めており、`chartDir` ではなく `chartDirName`、`apps[]` の要素は `{ projectName, latestTag, updates: [{ valuesPath, previousTagName }], helmTargetBranchUpdates: [...] }`（`previousTag` というキーは存在しない）。両関数の実装を読んで、例のJSONをそのとおりに書き直す。同じ例の `run_start` 行も `src/main.ts` の `run()` が実際に出している通り（`gitlabUrl` / `configPath` / `targetChart` / `targetClients` / `tagFormat` を含む）に揃える。

(2) `CLAUDE.md`「テスト方針」の最後の行にある非公開関数の例 `buildChartUpdate()` は現存しない。現在の各ステップの非公開関数は `evaluateTarget()`（filter-targets）/ `buildPlan()`（build-plans）/ `applyUpdate()`（apply-updates）なので、そのいずれかに差し替える。

(3) `src/utils/partition.ts` のJSDocに載っているコード例が実際の呼び出し側と違う（例は `outcome.status === "target"` と `outcome.chartAndApps` を使っているが、実際の `StepOutcome<T>` は `status === "ok"` と `outcome.value`）。`src/steps/filter-targets/filter-targets.ts` の実際の呼び出しに合わせて例を書き直す。

(4) `.gitlab-ci.yml` の `spec.inputs.CONCURRENCY_LIMIT` の description が「1以上の整数」になっているが、実際の検証（`src/lib/env.ts` の `parseConcurrencyLimit()`）は1〜20。同ファイル `variables` 側の description と README の表はすでに「1〜20の整数」なので、inputs 側をそれに揃える。

完了条件: 上記4箇所を直し、`pnpm check` を通すこと（コードの挙動は変わらないのでテスト件数は変わらないはず）。

**difficulty**: haiku

**evidence**: README実行ログ例（chartDirName・describePlan()の形へ、run_startにgitlabUrl/tagFormat追加）、CLAUDE.mdのbuildChartUpdate()→buildPlan()、partition.tsのJSDoc例（status==='ok'/outcome.value）、.gitlab-ci.ymlのCONCURRENCY_LIMIT説明（1〜20）を修正。pnpm check（31ファイル330テスト、変化なし）通過。haikuのサブエージェントに委譲し、メイン側で2点を修正: valuesPathの例が削除済みのdotパス形式だったのでファイルパスに、run_startの未設定env（configPath/targetChart/targetClients）はJSON.stringifyがキーごと落とすため空文字列ではなく非表示に。またタスク本文の記述誤りでvariables側の『1以上の整数』が残っていたため併せて修正した

## T-078

**タスク**: `docs/glossary.md` の記述を現在のコードに合わせて更新する。用語集は「日本語表記・対応するコード上の識別子・定義」の3点で書く方針なので、**識別子が実在しないと用語集としての価値が落ちる**。現状ずれているのは次の4点（いずれも確認済み）:

(1) 「config.yaml / anchors.yaml」の項に出てくる `loadApps()` は存在しない。現在 `validateProjectLinkage()` を呼んでいるのは `src/lib/config/config.ts` の `loadClientChartAndApps()`。
(2) 「chartDir」の項の見出しと英語識別子が `chartDir` だが、実際のフィールド名は `ChartAndApps.chartDirName`（型は `ChartDirName`）。
(3) 「anchor（chart[].anchor）」と「helm.chart[].anchor」の項が、英語識別子を「`ImageTagTarget`＝`AnchorTarget` のフィールド」「`HelmTargetBranchTarget`＝`AnchorTarget` のフィールド」と書いている。`ImageTagTarget` / `HelmTargetBranchTarget` という型はすでに削除済みで（理由は `docs/architecture.md`「values.yamlの書き込み位置は `AnchorTarget` 1つに統一し、用途別の別名は置かない」）、現存するのは `AnchorTarget` だけ。
(4) 同じ2項目の「英語識別子」が `anchor` になっているが、コード上のフィールド名は `AnchorTarget.anchorName`。`anchor` は `anchors.yaml` のYAMLキー名としてのみ残っており（`src/lib/config/schema.ts` の `AnchorTargetSchema` が `.transform()` でキー `anchor` → フィールド `anchorName` に詰め替えている）、この「wire formatのキー名と内部フィールド名が違う」ことこそ用語集に書く価値がある。

この用語集の方針（冒頭の「方針」節）は「表記ゆれが見つかっても統一・修正はせず、現状こう呼ばれているという事実だけを注記する」なので、**過去の経緯の記述（「過去には〜という名前だった」等）は消さずに残し、現在の識別子を正とする形に直す**こと。判断が必要なのは (3)(4) をどう書き分けるか（YAMLキー名と内部フィールド名の対応をどう表現するか）だけで、他は置換で済む。

完了条件: 更新後の `docs/glossary.md` に出てくる `` `xxx()` `` 形式の関数名・型名がすべて `src/` `scripts/` に実在することを grep で確認して示すこと。コード変更は無いので `pnpm check` は通るはず（念のため実行する）。

**difficulty**: sonnet

**evidence**: loadApps()→loadClientChartAndApps()、chartDir→chartDirName、削除済み型ImageTagTarget/HelmTargetBranchTargetへの言及3箇所をAnchorTargetへ、anchorのYAMLキー名(anchor)と内部フィールド名(anchorName)の対応をAnchorTargetSchemaの.transform()込みで明記。実在確認: 用語集の関数名・型名で実コードに無いのはChartGroup/UPDATE_BRANCHのみ（どちらも「旧〜」として意図的に残す歴史記述）。pnpm check（31ファイル330テスト、変化なし）通過。sonnetのサブエージェントに委譲し、メイン側で「反映済みタグ」項のpreviousTag→previousTagName（T-073で改名済み）とローカル変数previousTagRawの所在（build-plans.ts→image-tag-target.ts）を追加修正した

## T-079

**タスク**: リポジトリ直下の `direction.md` を `docs/history/` へ移す。このファイルは2026-09-06にユーザーが書いた指示メモ（6項目）で、内容は「TARGET_CLIENT を複数形に」「filter-targets の fatal が settled になる」「try/catch を減らす」「型の置き場所を統一」「URLを型で縛る」「tasks.json/progress.md を develop/ へ」。**6項目すべてが完了済み**で、対応の記録は `docs/history/tasks-archive.md`（T-064〜T-071 あたり）と `docs/architecture.md`「コードからは読み取れない設計判断」にある。現状はリポジトリ直下に、いつのものとも完了済みとも分からない状態で残っており、新しく読む人には「未対応の宿題リスト」に見える。

作業内容: `git mv direction.md docs/history/direction.md` し、ファイル冒頭に「2026-09-06にユーザーから受けた指示メモ。全項目対応済みで、対応内容は本ディレクトリの `tasks-archive.md` と `docs/architecture.md` にある。当時の記述をそのまま残している」という2〜3行の見出し＋注記を足す（本文の6項目は書き換えない）。`docs/architecture.md`「ディレクトリ構成の勘所」の `docs/history/` の説明にも、このファイルが増えたことを1行で追記する。

完了条件: `git status` で rename として認識されていること、リポジトリ直下に `direction.md` が無いこと、`grep -rn "direction.md" --include='*.md' .` の結果が新しい場所と整合していることを示す。`pnpm check` を通すこと。

**difficulty**: haiku

**evidence**: git mv でリポジトリ直下の direction.md を docs/history/ へ移動（git status で R と認識）。冒頭に「2026-09-06のユーザー指示メモ・全項目対応済み・対応先はtasks-archive.mdとarchitecture.md」の注記を追加し、本文6項目は無変更。docs/architecture.md「ディレクトリ構成の勘所」にも1行追記した。pnpm check（31ファイル330テスト、変化なし）通過。haikuのサブエージェントに委譲し、メイン側で追記1行の表現と折り返しを整えた

## T-080

**タスク**: `AppConfig.chart` というフィールド名を変えるかどうかの方針を決める（適用は次のタスク）。

現状の事実（調査済み）: `src/types/types.ts` に `chart` という名前のフィールドが2つあり、意味がまったく違う。

- `ChartAndApps.chart: ChartRepoConfig` — chartリポジトリそのものの情報（projectId / projectName / mrTargetBranch）
- `AppConfig.chart: readonly AnchorTarget[]` — そのアプリのイメージタグを書き込む values.yaml 上の位置の配列

この2つは `src/steps/build-plans/build-plans.ts` の中で数十行の距離に同居している（`createChartAccess(gitlab, chartAndApps.chart)` と `applyImageTagTargets(..., app.chart)`）。さらに、同じ「書き込み位置の配列」を指す `HelmTargetBranchConfig.targets` は `targets` という別の名前になっており、同じ概念に2つの名前が付いている。

詰める論点:
(a) `AppConfig.chart` を `targets` あるいは `imageTagTargets` 等に改名するか。改名する場合、`HelmTargetBranchConfig.targets` と名前が衝突しないか（別の型のフィールドなので衝突はしないが、読み手が区別できるか）。
(b) `anchors.yaml` のYAMLキーは `apps[].chart[]` のままにする（wire format は変えない）という前提でよいか。`docs/architecture.md`「型定義のフィールド名は、ブランド型が表している語を落とさない」の節にある「YAMLのキー名は wire format なので変えない。内部表現への詰め替えは `src/lib/config/schema.ts` の `.transform()` が担う」という既存方針をそのまま適用できるか。
(c) 改名しないと決める場合、その理由（YAMLキーと内部フィールド名を一致させ続けることの価値）を明文化できるか。
(d) 影響範囲: `AppConfig.chart` の参照は `src/lib/config/config.ts` / `src/lib/config/helm-target-branch.ts` / `src/steps/build-plans/build-plans.ts` / `scripts/lint/verify-config/verify-config.ts` / `test/helpers.ts` ほか。この一覧を確定させること。

完了条件: コードは変更しない。決めた方針（改名する/しない、する場合の新しい名前と影響ファイルの一覧）を `docs/architecture.md`「コードからは読み取れない設計判断」の該当節（既存のフィールド名リネームの節）に追記し、次のタスクがそのリストどおり機械的に置換できる状態にすること。

**difficulty**: opus

**evidence**: コード変更なし（方針決定のみ）。AppConfig.chart → imageTagTargets に改名すると決め、docs/architecture.md「values.yamlの書き込み位置は AnchorTarget 1つに統一」の直後に判断を追記した。targets を選ばなかった決め手は、このコードベースの targets が既に「処理対象のchartAndApps」の意味で使われている（FilterTargetsResult.targets・buildPlans()/applyUpdates()の引数）こと。HelmTargetBranchConfig.targets と ChartAndApps.chart は据え置き、wire format（anchors.yamlのキー chart）も不変。影響ファイル一覧は T-081 の本文に確定させた

## T-081

**タスク**: `AppConfig.chart` を `imageTagTargets` に改名する。方針決めは完了しており（判断の記録は `docs/architecture.md`「`AppConfig`が持つ書き込み位置のフィールド名は`imageTagTargets`」）、**このリストどおりに機械的に置換すること。判断は不要**。

## 改名するもの（内部フィールド名だけ）

`src/types/types.ts` の `AppConfig.chart: readonly AnchorTarget[]` → `imageTagTargets`。JSDocの文言も新しい名前に合わせる。

置き換えが必要な参照:

1. `src/types/types.ts` — `AppConfig` の定義と、`ImageTagUpdate` のJSDoc（`AppConfig.chart`のうち1箇所分…）
2. `src/lib/config/config.ts` — `const { chart: appChart } = anchorApp` の直後で `AppConfig` を組み立てている箇所。`chart: appChart` → `imageTagTargets: appChart`。**`anchorApp.chart` 側（Zodが返す生の型 `AnchorsApp` のフィールド）は変えない**
3. `src/lib/config/helm-target-branch.ts` — `resolveHelmTargetBranch()` の第6引数 `chart: readonly AnchorTarget[]`（appの書き込み位置）を `imageTagTargets` に。関数内の `chart.map(...)` も追従。JSDocの「app自身の`chart[].valuesPath`」はYAMLキーの話なので**そのまま**
4. `src/steps/build-plans/build-plans.ts` — `app.chart` の参照（`applyImageTagTargets()` への引数）とJSDocの手順2の説明
5. `src/steps/build-plans/sub-steps/image-tag-target.ts` — JSDoc2箇所の `app.chart` 表記
6. `scripts/lint/verify-config/verify-config.ts` — `app.chart` の参照。**ただしエラーメッセージ内のラベル `app "${app.projectName}" の chart[]` はYAMLキーを指すので変えない**
7. テスト — `test/helpers.ts` の `makeApp()`、`test/steps/build-plans/build-plans.test.ts`、`test/steps/build-plans/sub-steps/image-tag-target.test.ts`、`test/scripts/lint/verify-config/verify-config.test.ts`、`test/lib/config/config.test.ts`（`apps[0]?.chart` のアサーション）
8. `docs/glossary.md` の「反映済みタグ」項にある `AppConfig.chart` の表記

## 変えないもの（重要）

- `anchors.yaml` のYAMLキー `apps[].chart[]`（wire format）。`src/lib/config/schema.ts` の `AnchorsAppSchema` の `chart` フィールドも変えない
- `ChartAndApps.chart`（`ChartRepoConfig`）
- `HelmTargetBranchConfig.targets`
- 設定ミスのエラーメッセージに出てくる `chart[]` / `helm.chart[]` というラベル（YAMLキーを指すため）
- `docs/requirements.md` の 4.4節（YAMLスキーマの仕様。`chart` はキー名）
- `docs/glossary.md` の「anchor（chart[].anchor）」項にある `chart`配列 の表記（YAMLキーを指すため）

## 完了条件

- `pnpm check` を通し、**テスト件数が31ファイル330テストのまま変わらない**こと
- `grep -rn "app\.chart\b" src/ scripts/ test/` が0件になること
- `git add` / `git commit` はしないこと（呼び出し元が確認してからコミットします）

**difficulty**: sonnet

**dependencies**: T-080

**evidence**: AppConfig.chart → imageTagTargets に改名（12ファイル・30挿入26削除）。grep -rn 'app\.chart\b' src/ scripts/ test/ が0件。wire formatは不変（schema.ts の AnchorsAppSchema・config-test/・docs/requirements.md 4.4節・エラーメッセージのラベル chart[] はいずれも無変更を git diff --name-only で確認）。ChartAndApps.chart と HelmTargetBranchConfig.targets も据え置き。pnpm check（31ファイル330テスト、変化なし）通過。sonnetのサブエージェントに委譲し、メイン側で image-tag-target.ts のJSDocに残っていた「アプリのchart全体」という旧名由来の言い回しを直した

## T-082

**タスク**: ブランド型を使うべき箇所で素の `string` になっている2件を直す。このリポジトリは「`as` を使わずブランド型の生成は factory 関数に封じ込める」（`CLAUDE.md`「コーディング規約」）方針で、ドメインの識別子はブランド型で扱う。以下は既存のブランド型があるのに素の `string` のままになっている取りこぼし:

(1) `src/lib/config/config.ts` の `ConfigTarget.chartDirName?: string` を `ChartDirName` にする。同じ型の `clients?: readonly TargetClient[]` はすでにブランド型（`TenantId`/`ClientId`）になっており、片方だけ素の `string` で非対称。生成元は `src/main.ts` が渡す `TARGET_CHART`（`src/lib/env.ts` の `loadOptionalEnv("TARGET_CHART")`）なので、env.ts 側で `toChartDirName()` を通すか、`ConfigTarget` を組み立てる `main.ts` 側で通すかを、既存の `TARGET_CLIENTS`（env.ts の `parseTargetClients()` が `toTenantId`/`toClientId` を通している）に倣って揃えること。`loadConfig()` 内で `listSubdirectories()` 由来の素の `string` と比較・`join()` している箇所は、ブランド型が `string` のサブタイプなのでそのまま通るはず（無理な変換を挿入しないこと）。

(2) `src/lib/config/helm-target-branch.ts` の `resolveHelmTargetBranch()` の引数 `projectName: string` を `ProjectName` にする。呼び出し元（`src/lib/config/config.ts`）が渡しているのはすでに `ProjectName` で、この関数のシグネチャだけが素の `string` に緩めている。用途はエラーメッセージへの埋め込みのみ。

`as` は使わない（`src/types/brand.ts` の factory 関数のみ）。

完了条件: `pnpm check` を通すこと。既存テスト（`test/lib/env.test.ts` / `test/lib/config/config.test.ts` / `test/lib/config/helm-target-branch.test.ts`）がそのまま、またはブランド型を使う最小修正で通ることで確認する。

**difficulty**: sonnet

**evidence**: ConfigTarget.chartDirName を ChartDirName に、resolveHelmTargetBranch() の projectName を ProjectName にした。ブランド型への変換は env.ts に parseTargetChart() を新設して行う（TARGET_CLIENTS の parseTargetClients() と同じ形）。loadConfig() 内の比較・join() は ChartDirName が string のサブタイプのため無変更で通った（無理な変換を挿入していない）。as キャストは増えていない。pnpm check（31ファイル332テスト、330→332）通過。sonnetのサブエージェントに委譲し、メイン側で parseTargetChart() のテスト2件を追加した（env.ts の他の公開parse関数にテストがある慣習に合わせた）

## T-083

**タスク**: コミットSHAにブランド型を導入するかどうかを決め、決めたところまで実装する。

現状の事実（調査済み）: `src/types/types.ts` の `TagInfo.commitSha` が素の `string`、`src/lib/gitlab/gitlab.ts` の `getBranchHeadSha()` の戻り値も `Promise<string | undefined>`。この2つは `src/steps/build-plans/sub-steps/resolve-latest-tag.ts` の `resolveTrackedHeadTagNames()` で `tag.commitSha === headSha` と比較され、**この比較の正しさがツールの中核の判定（HEADを指すタグがあるか）そのもの**。一方で `ProjectId` / `BranchName` / `TagName` / `ValuesPath` などの識別子はすべてブランド型になっており、SHAだけが素の `string`。

詰める論点:
(a) `CommitSha` ブランド型を新設する価値があるか。この値は「GitLab APIから受け取って比較するだけ」で外部から組み立てない（`toCommitSha()` の呼び出し元は `gitlab.ts` の2箇所だけ）。取り違えのリスクは実際どれだけあるか（同じスコープに他の `string` 型の値 —— `tag.name` 等 —— が並ぶか）。
(b) ブランド型を増やすコスト（`src/types/brand.ts` が既に10種類あり、増やすほど「全部ブランド型にすべき」という圧力が生まれる）と、既存のブランド型を導入した判断基準との一貫性。`docs/architecture.md` に「何をブランド型にするかの基準」が書かれていない場合、この機会に1〜3行で明文化できるか。
(c) 導入しないと決める場合、`TagInfo.commitSha` のJSDocに「GitLab APIが返すコミットSHA。比較専用」と書くだけで十分か。

完了条件: 決めた内容を `docs/architecture.md`「コードからは読み取れない設計判断」に短く記録する。導入する判断なら `src/types/brand.ts` に `CommitSha` と `toCommitSha()` を足し、`gitlab.ts` の生成2箇所を通して `pnpm check` を通すこと。導入しない判断なら記録のみでコード変更なし。

**difficulty**: opus

**evidence**: CommitSha ブランド型を導入すると決めて実装した。決め手は、TypeScriptが string とブランド型の比較は許すのにブランド型どうしの比較は TS2367 で弾くことを実地確認したこと（別ファイルで検証）。これにより中核判定 tag.commitSha === headSha の近くにある tag.name(TagName) との取り違えが型で防げる。生成経路は gitlab.ts の listTags()/getBranchHeadSha() の2箇所のみ、形式検証は付けない。「何をブランド型にするか」の基準（別の識別子と同じ型の式に並ぶか）も docs/architecture.md に明文化。pnpm check（31ファイル332テスト、変化なし）通過

## T-084

**タスク**: ステップ間で受け渡す配列を `readonly` に揃える。このリポジトリは「変数は基本 `const`」に加えてコレクションも不変に扱う方針（`src/types/types.ts` のドメイン型はほぼ全フィールドが `readonly`、`readonly T[]` を使っている）だが、ステップの境界を跨ぐ型だけが可変配列のまま残っている:

- `src/types/types.ts` の `ChartUpdateTarget.plans: AppUpdatePlan[]` / `files: FileUpdate[]`（同じ型の `chartAndApps` は `readonly` なのに、この2つだけ可変）
- `src/steps/filter-targets/filter-targets.ts` の `FilterTargetsResult.targets: ChartAndApps[]` / `settled: ChartUpdateResult[]`（`readonly` 修飾はフィールドに付いているが、配列自体は可変）
- `src/steps/build-plans/build-plans.ts` の `BuildPlansResult.toApply: ChartUpdateTarget[]` / `settled: ChartUpdateResult[]`
- `src/steps/apply-updates/apply-updates.ts` の `applyUpdates()` の戻り値 `Promise<ChartUpdateResult[]>`
- `src/utils/partition.ts` の `partitionMap()` の戻り値 `{ readonly left: L[]; readonly right: R[] }`

実害の具体例: `build-plans.ts` の `buildPlan()` が `ok({ chartAndApps, plans: [...plans], files: toFileUpdates(draft) })` と、`readonly AppUpdatePlan[]` を可変配列に**コピーし直すためだけの spread** を書いている。`ChartUpdateTarget.plans` を `readonly AppUpdatePlan[]` にすればこのコピーは消える。

作業内容: 上記を `readonly T[]` に変更し、それに伴って不要になるコピー（`[...plans]` など）を削る。`partitionMap()` は内部の `reduce` が可変配列を積むので、戻り値の型だけ `readonly L[]` / `readonly R[]` にすればよい（内部実装は変えなくてよい）。`toFileUpdates()` の戻り値 `FileUpdate[]` も呼び出し側が `readonly` を受けられるなら合わせる。**`as` や型アサーションで押し通さないこと** —— 型エラーが出る箇所は、その配列を本当に変更しているということなので、変更している側を直すか、そこだけ可変のまま残す判断をして evidence に理由を書く。

完了条件: `pnpm check` を通し、テスト件数が変わらないこと。削除できたコピー（spread）の箇所を evidence に列挙すること。

**difficulty**: sonnet

**evidence**: ChartUpdateTarget.plans/files、FilterTargetsResult・BuildPlansResult の2フィールドずつ、applyUpdates()の戻り値、partitionMap()の戻り値、toFileUpdates()の戻り値を readonly T[] にした（6ファイル・11行）。実害だった buildPlan() の `plans: [...plans]`（可変配列に合わせるためだけのコピー）が消えた。他の spread は全件確認して genuine な用途（配列連結・アキュムレータへのappend・Map/Setの配列化）のみ。as は1件も使っていない。pnpm check（31ファイル332テスト、変化なし）通過。sonnetのサブエージェントに委譲し、メイン側で toFileUpdates() のJSDocが戻り値の型を言い換えるだけになっていたのを詰めた

## T-085

**タスク**: `src/lib/env.ts` がモジュール読み込み時に環境変数を読んで例外を投げる設計を、そのままにするか変えるかを決め、決めたところまで実装する。

現状の事実（調査済み）: `src/lib/env.ts` の末尾は `export const GITLAB_URL = validateGitlabUrl(loadEnv("GITLAB_URL"))` のようなトップレベルの副作用で、**このモジュールを import した瞬間に環境変数を読んで、未設定なら throw する**。そのため周囲に3つの迂回が生まれている:

1. `scripts/lint/validate-config.ts` が `--remote` のときだけ `await import("../../src/lib/env.js").catch(...)` と**動的importで囲む**必要がある（静的importにすると、認証情報が不要な既定モードでも環境変数を要求してしまうため）
2. `vitest.config.ts` が全テストに対して `env: { GITLAB_URL: "https://gitlab.test", ACCESS_TOKEN: "test-token" }` を注入している（env.ts を間接的にでも import するテストが落ちないようにするため）
3. `test/main.test.ts` が `vi.mock("../src/lib/env.js", () => ({...}))` で8つの定数をまるごとモックしている

詰める論点:
(a) 「環境変数を読む」を関数（例: `loadEnvConfig(): EnvConfig`）にして `src/index.ts` または `src/main.ts` の `run()` の入口で一度だけ呼び、`process()` に値として渡す形にするか。そうすると上記3つの迂回のうちどれが消えるか（`main.ts` が引数で受け取れるようになるので (3) は不要になるはず。(1) は静的importに戻せるか要確認）。
(b) 変えることで `src/main.ts` の `process()` の引数が増える（現在は環境変数のモジュール定数を直接読んでいる）。引数を8個並べるのか、`EnvConfig` 1つにまとめるのか。すでに `filterTargets`/`buildPlans` は `concurrencyLimit`・`dryRun`・`tagFormat` を個別の引数で受け取っているので、その形と揃うか。
(c) `CLAUDE.md`「コーディング規約」の「環境変数はすべて `src/lib/env.ts` で管理する」という規約は、関数化しても満たせるか（満たせる想定だが、規約の文言を更新する必要があるか確認する）。
(d) 「起動時に落ちる（fail fast）」という現在の利点を失わないか。`index.ts` の入口で呼べば実質同じタイミングで落ちるはず。
(e) 変えないと決める場合、上記3つの迂回を「意図的なコスト」として `docs/architecture.md` に記録できるか。

完了条件: 決めた方針を `docs/architecture.md`「コードからは読み取れない設計判断」に記録する。変える判断なら実装し、`vitest.config.ts` の `env` 注入と `test/main.test.ts` の env モックのうち不要になったものを実際に削って `pnpm check` を通すこと（テスト件数が減らないこと）。

**difficulty**: opus

**evidence**: モジュールトップレベルの定数をやめ loadEnvConfig(): EnvConfig にした。run()/process() は EnvConfig を引数で受け取り、生成は src/index.ts のみ。狙いどおり3つの迂回が全部消えた（validate-config.ts の動的import、vitest.config.ts の全テストへのenv注入、main.test.ts の vi.mock(env)）——いずれもgrepで0件を確認。挙動不変を実測: 環境変数なしで既定モードは exit 0、--remote は理由付きメッセージで exit 1。副次的な改善として、環境変数エラーが index.ts の catch に載り構造化ログに出るようになった（以前は素のスタックトレース）。pnpm check（31ファイル332テスト、変化なし）通過。CLAUDE.mdの規約文言と docs/architecture.md に判断を記録

## T-086

**タスク**: `src/main.ts` の `export async function process()` を改名する。この名前は Node.js のグローバル `process` をモジュールスコープで覆っており、同じファイルに `process.exit()` や `process.env` を書いた瞬間に静かに壊れる（実際 `src/index.ts` はグローバルの `process.exit()` を使っている）。すでに影響も出ていて、`test/main.test.ts` は `import { process as processFn, run } from "../src/main.js"` と別名で輸入している。`docs/architecture.md` 自身が「`process` のような汎用名は `main.ts` のオーケストレータやグローバルの `process` と紛らわしいため使わない」と各ステップの命名規則として書いており、その `main.ts` 側だけが例外になっている状態。

新しい名前は `runPipeline()` を第一候補とする（`run()` が計測・ログ・終了コード判定の外枠、`runPipeline()` がステップを順に呼ぶ本体、という関係が名前から読める）。他により良い名前があると判断した場合は evidence に理由を書いて差し替えてよい。

張り替える参照: `src/main.ts` の定義とJSDoc、`test/main.test.ts`（別名輸入をやめて素直に import できるようになるはず）、`CLAUDE.md`「アーキテクチャ概要」冒頭の `process()` への言及、`docs/architecture.md` 内の `process()` への言及（複数箇所。「`process()` が直接呼ぶ」という表現が各所にある）、`develop/progress.md` の該当箇所は履歴なので触らない。

完了条件: `grep -rn "process()" src/ test/ docs/ CLAUDE.md` の結果が、グローバルの `process` を指すもの以外0件になること。`pnpm check` を通し、テスト件数が変わらないこと。

**difficulty**: sonnet

**evidence**: main.ts の process() を runPipeline() に改名（グローバルの process をモジュールスコープで覆っていた）。参照を張り替えたのは src/main.ts・test/main.test.ts（別名輸入 process as processFn が不要になった）・CLAUDE.md 3箇所・docs/architecture.md 6箇所。grep 'process()' が develop//docs/history 以外で0件。pnpm check（31ファイル332テスト、変化なし）通過。sonnetのサブエージェントに委譲し、メイン側で docs/architecture.md の表に残っていた app.chart（T-081の取りこぼし）も併せて直した

## T-087

**タスク**: 3つのステップの入口に同じ形のコードが重複していることを、共通化するか意図的な重複として残すかを決め、決めたところまで実装する。

現状の事実（調査済み）: `src/steps/filter-targets/filter-targets.ts` と `src/steps/build-plans/build-plans.ts` の先頭部分が、名前以外まったく同じ2ステップになっている:

```
const outcomes = await mapWithConcurrency(items, concurrencyLimit, (x) =>
  runSettled(x, (logContext) => <1件分の関数>(..., logContext)),
)
const { left, right } = partitionMap(outcomes, (outcome) =>
  outcome.status === "ok" ? left(outcome.value) : right(outcome.result),
)
```

`src/steps/apply-updates/apply-updates.ts` は3行目以降が違う（`partitionMap` ではなく `outcomes.map()` で `ChartUpdateResult[]` に潰す）。

詰める論点:
(a) この重複を `src/steps/shared/step-outcome.ts` に `runStepConcurrently()` のような高階関数として吸収すべきか。`runSettled()` を同ファイルに置いた時と同じ論法（「catch節をstepから消す」）が、この `partitionMap` にも当てはまるか。
(b) 吸収した場合、各stepの入口が1〜2行になる代わりに「並列に実行する」「1件ずつ失敗を封じ込める」「成功と確定を振り分ける」が1つの名前の裏に隠れる。`docs/architecture.md` は現在「各stepでは `mapWithConcurrency()` の直下で `runSettled()` を呼び、並列に実行することと1件ずつ失敗を封じ込めることが**stepの入口に並んで見える**ようにしている」と、あえて見せる方を選んだと明記している。この判断と矛盾しないか。
(c) `apply-updates` だけ形が違うので、共通化しても3つ全部は揃わない。2つだけのために抽象を1つ増やす価値があるか。
(d) 残す判断をする場合、「なぜこの重複は許容するのか」を `docs/architecture.md` に1〜2行で書けるか（次に読む人が同じ疑問を持って再検討しないように）。

完了条件: どちらに決めても `docs/architecture.md`「コードからは読み取れない設計判断」に理由を記録すること。共通化する判断なら実装して `pnpm check` を通し、テスト件数が変わらないこと。

**difficulty**: opus

**evidence**: コード変更なし（共通化しないと決定）。理由を docs/architecture.md「コードからは読み取れない設計判断」に記録した。決め手は3点: (1) applyUpdates() だけ partitionMap ではなく outcomes.map() で潰すため3つ揃わない、(2) 3つを1つの高階関数に寄せるには「要素からChartAndAppsを取り出す関数」という差を隠すためだけの引数が要る、(3) 重複しているのは配線であって方針ではない（危険なエラー方針は既に runSettled()/settleAsError() に集約済み）

## T-088

**タスク**: `LoadValuesYamlContent` の「呼び出し側が複製を作って渡し、実装がそれを破壊的に埋める」という契約を、不変な形にできないか検討し、決めたところまで実装する。

現状の事実（調査済み）: `src/steps/build-plans/sub-steps/shared/types.ts` の

```
export type LoadValuesYamlContent = (
  cache: Map<ValuesPath, ValuesYamlEntry>,
  valuesPath: ValuesPath,
) => Promise<string>
```

は第1引数に**Mutableな `Map`** を取る。実装（`src/steps/build-plans/build-plans.ts` の `createChartAccess()`）は `getOrFetch()` でその Map に fetch 結果を書き込む。呼び出し側（`image-tag-target.ts` / `helm-target-branch-target.ts`）は毎回

```
const draftCopy = new Map(acc.draft)
const valuesYamlContent = await loadValuesYamlContent(draftCopy, target.valuesPath)
```

と手で複製を作ってから渡し、差分が無い場合も `return { ...acc, draft: draftCopy }` と「fetch結果だけ拾った下書き」を返している。他の値（`ValuesYamlDraft` は `ReadonlyMap`、アキュムレータは全フィールド `readonly`）が徹底して不変なのに、ここだけ「引数として渡した入れ物が書き変わる」規約になっており、読み手は `writeValuesYamlDraft()` のJSDoc（「呼び出し元は `new Map(acc.draft)` で複製したMutableなコピーに対して呼ぶことを想定」）を読まないと正しく使えない。

詰める論点:
(a) 戻り値を `Promise<{ content: string; draft: ValuesYamlDraft }>` にして、複製と書き込みを実装側に閉じ込められるか。そうすると呼び出し側から `new Map(...)` が消え、`ValuesYamlDraft` を `ReadonlyMap` のまま扱い続けられるか。
(b) その形にした場合、`getOrFetch()`（`src/utils/cache.ts`、Mutableな Map を前提とする汎用キャッシュ）をそのまま使えるか。使えないなら、`createChartAccess()` の中だけで複製→書き込み→凍結という手順を踏めば済むか。
(c) 1アプリ・1箇所ごとに Map を複製するコストは現状も同じ（今も毎回複製している）ので、性能上の悪化は無いはず。確認すること。
(d) 変えない判断をする場合、この契約が必要な理由（`ValuesYamlDraft` を chartAndApps 単位で積み上げる設計との関係）を `docs/architecture.md` に書けるか。

完了条件: 決めた内容を `docs/architecture.md`「コードからは読み取れない設計判断」に記録する。変える判断なら実装し、`grep -rn "new Map(acc.draft)" src/` が0件になることと `pnpm check`（テスト件数が変わらないこと）で確認する。

**difficulty**: opus

**evidence**: LoadValuesYamlContent を Promise<{content, draft}> を返す形に変え、複製を実装側（build-plans.ts の createChartAccess）へ寄せた。grep 'new Map(acc.draft)' が0件になり、サブステップ側は ValuesYamlDraft(ReadonlyMap) だけを扱う。コピー回数はむしろ減った（以前はtargetごとに無条件複製、今は下書きミス時と書き込み時のみ）。読み込み用 cacheValuesYamlDraft()(modified:false) と書き込み用 writeValuesYamlDraft()(modified:true) で入口を分け、toFileUpdates() が依存する不変条件を関数名で保つ形にした。pnpm check（31ファイル332テスト、変化なし）通過

## T-089

**タスク**: `scripts/smoke/smoke-fixture.ts` の2つの問題を直す。どちらも実機スモークテスト用スクリプト（`docs/smoke-test.md` の手順から呼ぶ）の話で、本体パイプラインには影響しない。

(1) **ソースリポジトリのprojectIdがハードコードされている**。`SEED_TAGS` に `projectId: 82861978` / `82861977` が直書きされており、chartリポジトリ側だけが `SMOKE_CHART_PROJECT_ID` 環境変数で外出しされているのと非対称。別のGitLabインスタンス・別のフィクスチャで再現しようとすると、このスクリプトを書き換えるしかない。chart側と同じやり方（環境変数で明示、未設定なら理由を出して `process.exit(1)`）に揃えること。変数名は `SMOKE_APP_PROJECT_IDS` のようにカンマ区切りで2件受ける形か、`SMOKE_QA_SPRINT_PROJECT_ID` / `SMOKE_DEVELOP_CLIENT_PROJECT_ID` のように個別に受ける形か、`config-test/` 配下の実際の設定（`yadokari-smoke-test-chart/*/*/config.yaml`）との対応が読み取りやすい方を選ぶ。`docs/smoke-test.md` の手順（projectIdの表と実行コマンド例）も合わせて更新すること。

(2) **タグの新旧をタグ名の辞書順で判定している**。`ensureSeedTags()` の `const hasNewerTag = names.some((name) => name > tag)` は文字列の大小比較で「シードタグより新しいタグがあるか」を判定しており、`TAG_FORMAT` を既定（`{branch}-build-at-{date}-{time}`）から変えると誤判定する（例: `{date}-{time}-{branch}` なら辞書順と時刻順は一致しない）。このリポジトリはタグ名のパース・比較を `src/lib/tag-format.ts` に集約しており（`parseTag()` / `findLatestParsedTag()`）、スクリプト側も同じ関数を使うべき。`src/lib/env.ts` の `TAG_FORMAT` と `parseTag()` を使って `builtAt` で比較する形に直すこと（`SEED_TAGS` の `branch` はすでに各エントリが持っている）。

完了条件: `pnpm check` を通すこと。このスクリプトは実機がないと動かせないので、実行そのものは完了条件に含めない。代わりに (2) について「既定の `TAG_FORMAT` で従来と同じ判定になること」を、変更後のコードを読んで説明すること（`docs/smoke-test.md` の該当箇所を更新したことも示す）。

**difficulty**: sonnet

**evidence**: (1) ソースリポジトリのprojectIdを SMOKE_QA_SPRINT_PROJECT_ID / SMOKE_DEVELOP_CLIENT_PROJECT_ID に外出しし、chart側と同じ requireProjectId() で未設定なら理由付きで終了する形に統一。(2) タグの新旧判定を辞書順比較から lib/tag-format.ts の parseTag()/findLatestParsedTag() による builtAt 比較に変更（既定フォーマットは日時が末尾固定桁なので辞書順と一致し、従来と同じ判定になる）。docs/smoke-test.md も更新。pnpm check（31ファイル332テスト、変化なし）通過。sonnetのサブエージェントに委譲し、メイン側で回帰を1件修正: SEED_TAGSがモジュール直下でprojectIdを要求していたため、chartリポジトリしか触らない reset まで新環境変数を必須にしてしまっていた（環境変数名だけを持たせ、値の要求は ensureSeedTags() に移動。reset がSMOKE_CHART_PROJECT_ID だけで起動することを実行して確認）

## T-090

**タスク**: `CONCURRENCY_LIMIT` の外側で無制限に並列化している `Promise.all` を、そのままにするか制御下に置くかを決める（**低優先**。実害が出ているわけではなく、規模が増えたときの予防）。

現状の事実（調査済み）: 同時実行数の制御は `src/utils/parallel.ts` の `mapWithConcurrency()` で chartAndApps 単位にだけ掛かっており、その内側に無制限の `Promise.all` が3箇所ある:

- `src/lib/gitlab/gitlab.ts` の `getProjectWebUrls()` — 重複排除後の全projectIdに対して同時に `Projects.show` を投げる（1つのclientに登録されたアプリ数だけ並列）
- `src/lib/gitlab/gitlab.ts` の `commitFileUpdates()` — 全ファイルに対して同時に `getFileContent` を投げる
- `src/steps/build-plans/sub-steps/resolve-latest-tag.ts` — `listTags` と `getBranchHeadSha` の2本（これは固定2本なので問題ない）

実効的な同時接続数は `CONCURRENCY_LIMIT`（最大20）× 1clientあたりのアプリ数になり、`CONCURRENCY_LIMIT` が「同時処理数の上限」として説明されている（README・`.gitlab-ci.yml` の description）のと食い違う。

詰める論点:
(a) 実害があるか。夜間の定期実行という前提で、GitLab側のレート制限（429）に当たる可能性はどれくらいか。当たっても `src/utils/retry.ts` の `withRetry()` が429を3回までリトライするので吸収されるのではないか。
(b) 直すとしたら `mapWithConcurrency()` に寄せることになるが、`lib/gitlab/gitlab.ts` は `concurrencyLimit` を知らない層（引数で引き回すか、モジュール定数を読むか）。`lib/` が同時実行数の方針を持つのは責務として妥当か。それとも呼び出し側（`collect-mr-entries.ts` / `apply-updates.ts`）で制御すべきか。
(c) 直さない判断をする場合、`CONCURRENCY_LIMIT` の説明（README の環境変数の表）に「chartAndApps単位の同時処理数であって、GitLab APIへの同時接続数の上限ではない」と1行足すだけで十分か。

完了条件: 決めた内容を記録する（直さない判断ならドキュメントの1行追記、直す判断なら実装して `pnpm check` を通す）。**このタスクは他のタスクをすべて片付けた後で構わない**。

**difficulty**: opus

**evidence**: コード変更なし（現状は絞らないと決定）。docs/architecture.md「既知の制約・注意点」に記録した。理由: (1) 絞ると lib/gitlab/gitlab.ts に concurrencyLimit を引き回すことになり、並列度の方針を持たない層に責務がはみ出す、(2) 429 は utils/retry.ts が指数バックオフで3回再試行し、駄目でも該当chartAndAppsがERRORになるだけで実行全体は壊れない（fatal扱いではない）、(3) 既定は CONCURRENCY_LIMIT=3・1clientあたり数アプリで、最悪ケースは意図的に上限20まで上げないと起きない。README の説明は「(chartリポジトリ, テナント/クライアント)単位の同時処理数」と既に正確だったため変更不要だった。再検討トリガー（429が継続的に出る/1clientが数十アプリ）も明記

## T-091

**タスク**: `pnpm lint` の対象に `test/` を含める。現在 `package.json` の `lint` は `oxlint src scripts && pnpm lint:validate-config` で、**テストコードだけ lint されていない**。`tsconfig.json` の `include` は `test/**/*.ts` を含み、`oxfmt .` はリポジトリ全体を整形しているので、lint だけが対象から外れている状態。テストコードは31ファイル・330テストあり、本体と同じ規約（`typescript/consistent-type-imports` など）が効くべき。

作業内容: `package.json` の `lint` / `lint:fix` の対象に `test` を追加し、検出された指摘を修正する。`.oxlintrc.json` の `categories`（correctness: error / suspicious: warn）はそのままにする。テスト特有の書き方（`vi.mock()` のホイスティングのために import より前に置く、`as unknown as GitlabClient` のようなモック用キャストなど）が correctness に引っかかる場合は、**ルールを緩めるのではなく `.oxlintrc.json` の `overrides` で `test/**` にだけ例外を設ける**か、コード側を直すかを判断して evidence に理由を書くこと。`as` キャストの規約（`CLAUDE.md`「コーディング規約」）は `src/` を対象にしたものなので、テストのモック用キャストを無理に消す必要はない。

完了条件: `pnpm lint` が `test/` も対象にして通ること、`pnpm check` 全体が通ること、テスト件数が変わらないこと。指摘が0件だった場合もその旨（何件検出され何を直したか）を evidence に書くこと。

**difficulty**: sonnet

**evidence**: package.json の lint/lint:fix を oxlint src scripts test に拡張。対象に入れた途端に指摘5件（すべて no-unused-vars の死んだimport: validateTagFormat×3・makeHttpError×2）が出たので削除した。.oxlintrc.json の overrides は不要だった（vi.mock のホイスティングやモック用キャストは現行ルールに引っかからない）。test/ が実際に対象になっていることは、未使用importをわざと入れて検出されるかで確認した。pnpm check（31ファイル332テスト、変化なし）通過

## T-092

**タスク**: `src/lib/config/helm-target-branch.ts`（`resolveHelmTargetBranch()` 1関数だけを持つファイル）の中身を、どこに定義するのが妥当かを再検討し、決めたところまで実装する（**「変えない」も選択肢**。その場合は理由の記録のみでコード変更なし）。

## 現状の事実（調査済み）

- ファイルは `src/lib/config/helm-target-branch.ts`。公開しているのは `resolveHelmTargetBranch()` ただ1つ（約50行）。`config.yaml` の `helm.branchToSync`（書き込む値）と `anchors.yaml` の `helm.chart[]`（書き込み先の `valuesPath`+`anchor` 一覧）を app 単位の `HelmTargetBranchConfig` に振り分ける純粋関数。外部I/Oは持たない。
- 依存先: `config/` のYAML構造の意味論（`valuesPath` 一致で振り分ける／片方だけの指定は設定ミスで例外）と、ドメイン型 `AnchorTarget` / `HelmTargetBranchConfig` / `ProjectName` / `BranchName`。GitLab API には依存しない。
- 呼び出し元は `src/lib/config/config.ts` **ただ1ファイル**（`loadClientChartAndApps()` 内で `helmTargetBranch: resolveHelmTargetBranch(...)` として呼ぶ）。
- テストは `test/lib/config/helm-target-branch.test.ts`（この関数を直接呼ぶ）。
- `docs/architecture.md` の `src/lib/` の表に「`config/helm-target-branch.ts` — `helm.branchToSync` と `helm.chart[]` をapp単位に振り分ける」と1行で載っている。
- 同じ `config/` ディレクトリには `config.ts`（公開API `loadConfig()`・走査・組み立て）/ `schema.ts`（Zodスキーマ）/ `validate.ts`（2ファイル間の紐づけ・projectId重複・書き込み先重複の検証）が並ぶ。

## 詰める論点

(a) `docs/architecture.md`「新しいコードを置く場所の判断基準」は「呼び出し元が `steps/` の1ファイルだけ → そのファイル内の非公開関数」と定めている。`config.ts` は `lib/` だが同じ考え方を当てると `resolveHelmTargetBranch()` は `config.ts` の非公開関数でよいのではないか。`schema.ts`（複数箇所から使う）・`validate.ts`（`loadConfig()` の別フェーズ）を別ファイルにしている基準と、`helm-target-branch.ts` を別ファイルにしている基準は同じか。違うなら何が違うか。
(b) 別ファイルのまま残す場合、`helm-target-branch.ts` という「機能名での分割」は他ファイル（`schema` / `validate` という関心事での分割）と粒度が揃っているか。揃えるなら中身を表す名前（生成する型に寄せる、`resolve-*` に寄せる等）へ変えるべきか。
(c) `config.ts` に取り込む判断なら、テストを `test/lib/config/config.test.ts` から公開API経由で検証する形（`CLAUDE.md`「テスト方針」の非公開関数の扱い）に寄せるか、既存の直接テストを残すか。
(d) 影響ファイルを確定させる: `src/lib/config/config.ts` / `src/lib/config/helm-target-branch.ts` / `test/lib/config/helm-target-branch.test.ts` / `docs/architecture.md`（`src/lib/` の表）/ `docs/glossary.md`（`helm.chart[]` 由来の振り分けの記述がパス名に触れていないか確認）。

## 完了条件

- 決めた内容（変える/変えない、変える場合の移動先・新しい名前・影響ファイル一覧）を `docs/architecture.md`「コードからは読み取れない設計判断」に記録する。
- 変える判断なら実装し、着手時の `pnpm test` の件数から**減らさず** `pnpm check` を通すこと。ファイル移動は `git mv`。
- `git add` / `git commit` はしない（呼び出し元が確認してからコミットする）。
- T-094（`applyHelmTargetBranchTargets` の命名見直し）と "helm target branch" の名前空間が重なる。独立して着手してよいが、先に片方を終えたらもう片方の本文を読み直し、結論が矛盾しないようにすること。

**difficulty**: opus

**evidence**: ユーザー指示で方針変更: config.ts の非公開関数に畳んだ（一時は resolve-helm-target-branch.ts に切り出していたが撤回）。resolveHelmTargetBranch() を config.ts へ移動しファイルを削除、テスト8件は loadConfig 経由なので test/lib/config/config.test.ts の describe(loadConfig（helmTargetBranch）) に統合。docs/architecture.md の該当行・設計判断ノートを「単発ヘルパーは兄弟ファイル化の境目に達しない」に置き換え。pnpm check（30ファイル333テスト、ファイル数は統合で31→30・テスト数不変）通過。

## T-093

**タスク**: `src/lib/tag-format.ts` の配置場所を再検討し、決めたところまで実装する（**「`lib/` のまま」も選択肢**。その場合は理由の記録のみ）。ディレクトリ構造そのもの（このツールのドメイン固有の定数・関数を置く区分を新設するか）まで含めて検討する。

## 現状の事実（調査済み）

- `src/lib/tag-format.ts`（約140行）の公開シンボル: `DEFAULT_TAG_FORMAT` 定数、`validateTagFormat()` / `parseTag()` / `buildNewTag()` / `findLatestParsedTag()`。依存先はこのツール自身が定義する `TAG_FORMAT` テンプレート形式（`{branch}`/`{date}`/`{time}` プレースホルダ、`docs/requirements.md` 4.1節）とブランド型 `TagFormat` / `TagName` / `BranchName`、型 `ParsedTag` のみ。GitLab API にも外部ファイル形式にも依存しない。
- 呼び出し元: `src/lib/env.ts`（`validateTagFormat` / `DEFAULT_TAG_FORMAT`）、`src/steps/build-plans/sub-steps/resolve-latest-tag.ts`（`buildNewTag` / `findLatestParsedTag` / `parseTag`）、`scripts/smoke/smoke-fixture.ts`（`parseTag` / `findLatestParsedTag`）。JSDoc からの言及が `src/types/brand.ts`。
- テストは `test/lib/tag-format.test.ts`。
- `docs/architecture.md` は既にこの配置の根拠を明記している（`lib/gitlab/` 分割を説明する項）: 元は `lib/gitlab/tag.ts` にあった → GitLab に依存しないので分離、`TAG_FORMAT` という「ファイル形式」に当たるものとして `lib/helm.ts`（`values.yaml` 形式）・`lib/config/schema.ts`（`config/` 形式）と同格に `lib/` 直下へ、`utils/` はドメイン知識を持たないものだけの場所なので入れられない、と。
- `steps/shared/` は「`lib/` でも `utils/` でもない、複数の `steps/` が共有するドメイン型だけに依存するもの」のために新設された前例（`docs/architecture.md`）。

## 詰める論点

(a) 疑問の核心は「タグ命名テンプレートは `values.yaml` や `config/` のような外部で形が決まっているファイル形式と本当に同種か」。タグ命名規則はこのツール自身の取り決めであり、`lib/` の「特定の技術・外部システム・ファイル形式に依存する」という基準に厳密には当てはまらないのではないか。
(b) 当てはまらないとすると「技術/外部システム/ファイル形式に依存しない・純粋な計算でもない（ドメイン知識を持つ）・複数 `steps/` 共有でもない（`env.ts` と1サブステップと1スクリプトが使う）」コードの置き場所が無い。この隙間を埋める新区分（例: `src/domain/`）に価値はあるか。作るなら他に何がそこへ動くのか（`steps/shared/feature-branch.ts`？ ブランド型？）を洗い出し、肥大化しないラインを引けるか。`src/` 直下のカテゴリを1つ増やすコストに見合うか。
(c) `lib/` に残す判断なら、`docs/architecture.md` の現行の根拠（`lib/gitlab/` 分割の項）はこの再検討を踏まえてもなお最良の説明か。緩い部分は締め直す。
(d) 一度 `lib/gitlab/tag.ts` から意図的にここへ動かした経緯があるため、再度動かすなら「別の意見」ではなく実利のある改善であることを示すこと（`docs/history/tasks-archive.md` に経緯がある）。
(e) 影響ファイルを確定させる: 移す場合 `src/lib/tag-format.ts` の新パス、import 元3つ（`env.ts` / `resolve-latest-tag.ts` / `smoke-fixture.ts`）、`src/types/brand.ts` の JSDoc、`test/lib/tag-format.test.ts` の対応する新パス、`docs/architecture.md`（`src/lib/` の表・`lib/gitlab/` 分割の項・「ディレクトリ構成の勘所」）、`CLAUDE.md`（「よく使うコマンド」に `npx vitest run test/lib/tag-format.test.ts` の例）、`docs/glossary.md`「タグ命名規則」。

## 完了条件

- 決めた内容を `docs/architecture.md`「コードからは読み取れない設計判断」に記録する。新区分を作るなら「ディレクトリ構成の勘所」と `CLAUDE.md`「アーキテクチャ概要」の判断基準リストも更新する。
- 変える判断なら実装し、着手時の `pnpm test` の件数から**減らさず** `pnpm check` を通すこと。ファイル移動は `git mv`。テストを移した場合は増減の内訳を evidence に書く。
- `git add` / `git commit` はしない。

**difficulty**: opus

**evidence**: ユーザー指示で方針変更（当初は lib/ 据え置き）。src/domain/ を新設し tag-format.ts（← src/lib/）と feature-branch.ts（← src/steps/shared/）を移動。domain/ は「tech非依存で、このツールの取り決め（命名規則・固定ブランチ名）を体現する純粋な関数・定数」。結果 lib/ は外部アダプタだけ、steps/shared/ は step-outcome.ts（step配線）だけになった。import 15ファイル・テスト move 2件、docs/architecture.md（新セクション＋判断基準リスト＋lib/gitlab分割ノート）・CLAUDE.md（判断基準リスト＋テスト例パス）を追従。pnpm check（30ファイル333テスト）通過。

## T-094

**タスク**: `src/steps/build-plans/sub-steps/helm-target-branch-target.ts` の公開関数 `applyHelmTargetBranchTargets()` の名前と、ファイル名 `helm-target-branch-target.ts` が揃っていない件を直す。名前を決め、ファイル名もそれに合わせる（`apply-updates.ts` の中で `applyUpdates()` が公開されているように、ファイル名＝公開関数名にする）。

## 現状の事実（調査済み）

- `src/steps/build-plans/sub-steps/helm-target-branch-target.ts` の公開シンボルは関数 `applyHelmTargetBranchTargets()`（複数形。`helmTargetBranch.targets` の全箇所をループ）と型 `ApplyHelmTargetsAcc`。非公開関数 `applyHelmTargetBranchTarget()`（単数形。1箇所分）がある。
- 姉妹ファイル `src/steps/build-plans/sub-steps/image-tag-target.ts` がまったく同じ形: 公開 `applyImageTagTargets()` + 型 `ApplyImageTagAcc`、非公開 `applyImageTagTarget()`。`docs/architecture.md` は両者を並列の構造として説明している。
- 呼び出し元は `src/steps/build-plans/build-plans.ts` の `buildAppUpdatePlan()`（`app.helmTargetBranch` があれば呼ぶ）ただ1箇所。
- ドメイン語彙は固定: 「Helmの向き先ブランチ」= `AppConfig.helmTargetBranch` / `HelmTargetBranchConfig` / `HelmTargetBranchUpdate` / `resolveHelmTargetBranch()`（`docs/glossary.md`「Helmの向き先ブランチ」）。"helm target branch" の語は落とせない。
- テストは `test/steps/build-plans/sub-steps/helm-target-branch-target.test.ts`（`buildPlans()` 経由で間接検証）。

## 詰める論点

(a) 名前を決める。制約: 公開（複数形・ループ）と非公開（単数形・1箇所）が現状は末尾 `s` だけの差。`apply-updates.ts`↔`applyUpdates()` の前例に倣うなら「ファイル名＝公開関数のケバブケース」。素直に `apply-helm-target-branch-targets.ts` + `applyHelmTargetBranchTargets()` にすると一致はするが長い。短くする案（`apply` を落とす、語順を変える等）も含めて比較し、非公開関数・型名（`ApplyHelmTargetsAcc`）の追従まで決める。
(b) 姉妹の `image-tag-target.ts` / `applyImageTagTargets()` はまったく同じズレを持つ。helm 側だけ直すと並列構造が崩れる。**両方を揃えて直すか、helm 側だけにする明確な理由があるか**を決める（このタスクの一番の判断どころ）。両方直す判断なら `image-tag-target.ts` とそのテスト・`build-plans.ts` の該当箇所・`docs/architecture.md` も対象に含める。
(c) `sub-steps/shared/types.ts` に `ApplyTargetsAcc<T>` などの共有型があり名前の一部を共有している可能性。grep で確認して影響に含める。
(d) 影響ファイルを確定させる: `helm-target-branch-target.ts`（`git mv` でリネーム＋シンボル改名）、`build-plans.ts`（import・呼び出し・手順3のJSDoc）、テスト、`docs/architecture.md`（`build-plans/sub-steps/` の表とサブステップ説明の該当行）、(b) の結論次第で image-tag 側一式。
(e) T-092（`lib/config/helm-target-branch.ts` の置き場所）と "helm target branch" の名前空間が重なる。片方を先に終えたらもう片方の本文を読み直し、結論が矛盾しないようにする。

## 完了条件

- 決めた命名と (b) の結論（両方揃える/helmのみ、およびその理由）を `docs/architecture.md`「コードからは読み取れない設計判断」に記録する。
- ファイルのリネームは `git mv` で行い、rename として認識されること。
- 着手時の `pnpm test` の件数から**減らさず** `pnpm check` を通すこと。`grep -rn "applyHelmTargetBranchTargets" src/ test/` が新しい名前以外で0件（両方揃えた場合は image-tag 側も同様）。
- `git add` / `git commit` はしない。

**difficulty**: opus

**evidence**: image-tag-target.ts→apply-image-tag-targets.ts、helm-target-branch-target.ts→apply-helm-target-branch-targets.ts に git mv（テストも同名rename）。steps/ツリーは全ファイルがファイル名＝公開関数名のケバブケースで、この2つだけが概念名で崩れていたため。姉妹の同型2ファイルは片方だけ直すと規則が中途半端なので両方揃えた。公開関数名は不変（apply=下書き反映・複数形=全targetループの意味が乗るため）、内部型エイリアスのみ関数名に合わせた（ApplyImageTagTargetsAcc・ApplyHelmTargetBranchTargetsAcc）。build-plans.ts のimport・docs/architecture.md・docs/glossary.md も追従。pnpm check（31ファイル333テスト、変化なし）通過。

## T-095

**タスク**: values.yaml のアンカーが存在しないケースを「読み取り時に即エラー」へ寄せ、`ImageTagUpdate.previousTagName` と `HelmTargetBranchUpdate.previousBranch` から `| undefined` を消す。

## 背景（調査済みの事実）

- `getValueAtAnchor()`（`src/lib/helm.ts:13`）が `undefined` を返すのは**アンカーが存在しないときだけ**。アンカーがあれば `String(node.value)` で必ず文字列になる。
- ところが `stage-image-tag-updates.ts` の `stageImageTagUpdate()` は、`previousTagName` が `undefined` のときそのまま「差分あり」として同じアンカーへ `setValueAtAnchor()` を呼ぶ。`setValueAtAnchor()` はアンカーが無ければ例外を投げる（`src/lib/helm.ts:30`）。つまり **`previousTagName: undefined` を持つ `ImageTagUpdate` は生成される前に必ず例外になる**。`stage-helm-target-branch-updates.ts` の `previousBranch` もまったく同じ構造。
- にもかかわらず、あり得ない分岐が3箇所で維持されている: 型（`src/types/types.ts:92`,`:98`）、MR本文の表示（`build-mr-content.ts:64`の`-`、`:97`の`(未設定)`）、テスト（`test/steps/apply-updates/*.test.ts` が `previousTagName: undefined` を手で組み立てている・`test/helpers.ts:60-68`）。
- **CI側の検知は既にある**: `scripts/lint/verify-config/verify-config.ts:186` が `getValueAtAnchor(content, target.anchorName) === undefined` でアンカー不在を検出し、`pnpm lint:validate-config:remote`（`.gitlab-ci.yml` の `validate-config-remote` ジョブ、MR/push/手動で必ず実行）で報告する。よって「config/ 側のtypo」はマージ前に気付ける。実行時に残るのは「chartリポジトリ側の values.yaml からアンカーが消えた」ケースだけで、これは例外で落ちてよい（該当chartリポジトリが ERROR になり処理は継続する）。

## やること

- `src/lib/helm.ts` に「アンカーが見つからなければ例外を投げる」読み取り関数を足し、`stage-image-tag-updates.ts` / `stage-helm-target-branch-updates.ts` の読み取りをそちらに寄せる。**`getValueAtAnchor()`（undefinedを返す版）は残すこと**——`verify-config.ts` は1件目で止めず全問題を集める設計なので、例外ではなく `undefined` が必要。
- `ImageTagUpdate.previousTagName: TagName` / `HelmTargetBranchUpdate.previousBranch: BranchName` に変える（`| undefined` を落とす）。
- 連動して消える分岐を消す: `build-mr-content.ts` の `previousTagText` / `compareUrl` / `previousBranchText` の三項、`test/helpers.ts` の `previousTagName` 分岐、テストの `previousTagName: undefined` を使ったケース。
- 新しい例外メッセージは `setValueAtAnchor()` の既存メッセージ（`values.yaml にアンカー "X" が見つかりません`）と揃え、どの valuesPath かが分かる情報を含めること。

## 完了条件

- `grep -rn "previousTagName\|previousBranch" src/ test/` に `undefined` を絡めた分岐が1件も残っていない。
- `pnpm check` を通す。テスト件数は減ってよいが（あり得ないケースのテストが消えるため）、減った件数と理由を evidence に書く。
- `git add` / `git commit` はしない。

**difficulty**: sonnet

**evidence**: lib/helm.ts に getRequiredValueAtAnchor()（アンカー不在で例外、メッセージに valuesPath を含む）を追加し、stage-image-tag-updates / stage-helm-target-branch-updates の読み取りを移した。getValueAtAnchor() は verify-config.ts が全問題を集める用途で残置。build-mr-content.ts の三項3つと test/helpers.ts の分岐が消えた。grep で previousTagName/previousBranch に undefined を絡めた分岐0件。pnpm check（31ファイル335テスト、ベースラインと同数）。到達不能だった「(未設定)」表示のテスト2件を削除し、getRequiredValueAtAnchor の正常系・例外系2件を追加して差し引きゼロ。

## T-096

**タスク**: パイプライン情報の取得を `build-plans` から `apply-updates` へ移し、`AppUpdatePlan.pipeline` を型から消す。

## 背景（調査済みの事実）

- `AppUpdatePlan.pipeline: PipelineInfo | undefined`（`src/types/types.ts:109`）が `undefined` になる理由が2つ混ざっている: (a) dryRun中はAPIコスト削減のため取得しない（`build-plans.ts:199-202` のコメントと三項）、(b) GitLab上に本当にパイプラインが無い／403（`gitlab.ts:191` の `getLatestPipelineForRef`）。読む側はどちらの `undefined` かを推測しなければならない。
- **`pipeline` の唯一の利用箇所は `build-mr-content.ts:78`（MR本文の表の1列）**。そこへ至る経路は `applyUpdates()` → `applyUpdate()` → `collectMrEntries()` / `buildMrContent()` だけで、dryRun時は `buildPlan()`（`build-plans.ts:122`）でSKIPPEDになりこの経路に入らない。つまり (a) の分岐は「MR作成が確定した後に取れば不要になる」ものでしかない。
- `collectMrEntries()`（`collect-mr-entries.ts`）は既に `gitlab` を受け取り `getProjectWebUrls()` でMR本文用の情報をまとめて解決している。`plan.app.projectId` と `plan.latestTag.name` も手元にあるので、パイプライン取得の置き場所としてここが素直。

## やること

- `getLatestPipelineForRef()` の呼び出しを `build-plans.ts` の `buildAppUpdatePlan()` から `apply-updates` 側（`collect-mr-entries.ts` が第一候補）へ移す。
- `AppUpdatePlan` から `pipeline` フィールドを削除し、MR本文が必要とする形（`MrEntries`／`shared/types.ts`）に載せ替える。**(b) 由来の `| undefined` は残す**（GitLab上に本当に無いケースは実在し、`build-mr-content.ts:78` の `-` 表示はそのまま必要）。
- 取得は `getProjectWebUrls()` と同様、MR本文に載るアプリの分だけまとめて行う。並列度は既存の書き方に合わせること（`utils/parallel.ts` の `mapWithConcurrency` など、周囲の流儀に従う）。
- `build-plans.ts:199-200` の dryRun 用コメントは役目を終えるので削除する。`docs/architecture.md` の `build-plans` / `apply-updates` の責務の記述に `pipeline` の取得場所が書かれていれば追従する。

## 完了条件

- `grep -rn "getLatestPipelineForRef" src/` が `lib/gitlab/gitlab.ts` と `apply-updates/` 配下だけにヒットする。
- `AppUpdatePlan` に `pipeline` が無い。
- `pnpm check` を通す。テスト件数の増減があれば内訳を evidence に書く。
- `git add` / `git commit` はしない。

**difficulty**: sonnet

**evidence**: getLatestPipelineForRef() の呼び出しを build-plans.ts の buildAppUpdatePlan() から collect-mr-entries.ts の collectMrEntries() へ移し、AppUpdatePlan.pipeline を削除して ImageTagEntry.pipeline に載せ替えた（GitLab上に無い/403 由来の | undefined は残置）。dryRun用コメントと三項も削除。grep で getLatestPipelineForRef は lib/gitlab/gitlab.ts と apply-updates/ 配下のみ。docs/architecture.md の collect-mr-entries.ts 責務行を追従。pnpm check（31ファイル334テスト、335から1件減）。減った1件は build-plans.test.ts の「dryRunのとき getLatestPipelineForRef を呼ばない」で、build-plans が呼ばなくなり検証対象が消滅したため削除（dryRunでSKIPPEDになる挙動は同ファイルの別テストで担保）。

## T-097

**タスク**: `EnvConfig.configPath` のデフォルト適用を `src/lib/env.ts` に寄せ、`string | undefined` を `string` にする。

## 背景（調査済みの事実）

- `EnvConfig.configPath: string | undefined`（`src/lib/env.ts:59`）は `loadOptionalEnv("CONFIG_PATH")` の結果をそのまま持っている。
- 一方 `loadConfig()` は `const path = configPath ?? "config"`（`src/lib/config/config.ts:41`）でデフォルトを当てている。つまりデフォルト値は確定しているのに `undefined` が層をまたいで運ばれている。
- 同じ `loadEnvConfig()` 内の `tagFormat`（`parseTagFormat()` が `?? DEFAULT_TAG_FORMAT`）や `concurrencyLimit`（`parseConcurrencyLimit()` が `?? "3"`）は **env.ts 側でデフォルトを当てている**。`configPath` だけ流儀が違う、揃え忘れ。

## やること

- `env.ts` 側でデフォルト `"config"` を当て、`EnvConfig.configPath: string` にする。`loadEnvConfig()` の他の項目と同じ書き方（専用の `parse*` 関数を置くか `?? "config"` で足りるか）は周囲に合わせて判断する。
- `loadConfig(configPath?: string, ...)` 側の扱いを決める: `loadConfig()` は `scripts/lint/validate-config.ts` から**環境変数を経由せず**直接呼ばれており（引数省略あり・コマンドライン引数からのパス指定あり）、そちらでもデフォルトが必要。`loadConfig()` 側のデフォルトを残す／必須引数にして呼び出し側で当てる、のどちらでも良いが、**デフォルト値 `"config"` の定義が2箇所に散らないこと**（定数を1箇所に置いて共有するのが素直）。
- `assertSafePath(path, "CONFIG_PATH")` の第2引数のメッセージが、デフォルト適用後も的確なままか確認する。

## 完了条件

- `EnvConfig.configPath` の型に `undefined` が無い。文字列 `"config"` がデフォルト値として2箇所以上にハードコードされていない。
- `pnpm check` を通す（テスト件数は不変のはず。変わったら内訳を evidence に書く）。
- `git add` / `git commit` はしない。

**difficulty**: haiku

**evidence**: lib/config/config.ts に DEFAULT_CONFIG_PATH を定義し、env.ts の configPath を string 化（?? DEFAULT_CONFIG_PATH）。loadConfig(path: string, ...) は省略可能引数をやめて必須にし、CLIから呼ぶ scripts/lint/validate-config.ts 側でデフォルトを当てる形にした（適用箇所＝入口2つ、定義は1箇所）。着手前は "config" が config.ts と validate-config.ts の2箇所にハードコードされており、grep '"config"' は定数定義の1件のみになった。pnpm check（31ファイル334テスト、不変）。haikuへの委譲がセッションのレート制限で落ちたためメインセッションが実行。

## T-098

**タスク**: 「値が無いかもしれない」の表現を `| undefined` に統一する（`?:` のオプショナルプロパティ記法をやめる）。

## 背景（調査済みの事実）

- `src/` 全体で「無いかもしれない」プロパティはほぼ `readonly x: T | undefined` で書かれている（`AppConfig.helmTargetBranch`、`EnvConfig.targetChart` / `targetClients`、`ImageTagUpdate.previousTagName`、`Anchors.helmChart` など）。
- 例外が `ConfigTarget`（`src/lib/config/config.ts:24-25`）の `readonly chartDirName?: ChartDirName` / `readonly clients?: readonly TargetClient[]` だけ。**この1箇所だけ記法が違う**。
- 2つの記法は「キー自体が無い」と「キーはあるが値が `undefined`」を区別するかどうかで意味が違い、混在していると読む側がその違いを毎回判断させられる。`?:` は書き手に明示を強制しない分、渡し忘れが型で見えない。

## やること

- `src/` 全体を `grep -n "readonly [a-zA-Z]*?:" src/**/*.ts` 相当で洗い、`?:` を使っているプロパティを `| undefined` に統一する（`ConfigTarget` 以外にもあれば同様に）。`loadConfig(configPath?: string, target: ConfigTarget = {})` のような**関数の省略可能な引数**は対象外（そちらは `?` が自然な用法）。ただし `target: ConfigTarget = {}` のデフォルト値は、プロパティを必須にすると `{}` が通らなくなるので、呼び出し側の書き方まで含めて成立させること。
- 呼び出し元（`src/main.ts` が `targetChart` / `targetClients` を渡している箇所、`scripts/lint/validate-config.ts`）とテストを追従させる。
- 統一した方針（`| undefined` に寄せる、関数引数の `?` は別扱い）を `docs/coding-standards.md` に1項目として追記する。

## 完了条件

- `src/` の型定義に `?:` のオプショナルプロパティが残っていない（関数引数の `?` は除く）。
- `docs/coding-standards.md` に方針が1項目として書かれている。
- `pnpm check` を通す。テスト件数は不変のはず（変わったら内訳を evidence に書く）。
- `git add` / `git commit` はしない。

## 追加: コーディング規約に `undefined` の基準を書く（ユーザー指示、2026-09-07）

記法の統一だけでなく、**そもそも `undefined` をいつ許容していつ避けるか**の基準を
`docs/coding-standards.md` に節として追加する。`CLAUDE.md`「コーディング規約・レビュー方針」の
ルール一覧にも1行を足す（`docs/coding-standards.md` は理由と例外だけを書く場所で、ルール本体は
CLAUDE.md側が正典、という既存の分担に従うこと）。

書く内容は、`src/` 全体の `undefined` を棚卸しした結果（2026-09-07）に基づく次の基準:

- **許容する**: 外部の世界の「無い」をそのまま写しているもの。GitLab APIの404（ブランチ・
  ファイル・パイプラインが無い）、`Map.get()` の戻り値、環境変数の未設定、YAMLに該当アンカーが
  無い、HTTPエラーからstatusが取れない、など。これらは要件を変えても消えないので、
  `| undefined` で正直に表す。
- **避ける**: プログラムの都合で生まれたもの。具体的には (a) 実行時には到達しないのに型に
  残っている `undefined`（例: 直後の処理が必ず例外を投げるのに、その手前の値を
  `| undefined` にしている）、(b) 1つの `undefined` に複数の意味が乗っているもの
  （例: 「取得を省略した」と「本当に無い」の両方を表している）、(c) デフォルト値が
  確定しているのに層をまたいで運ばれているもの。
- **判断の順序**: `undefined` を型から消すことを目的にしない。**なぜ `undefined` が
  生まれるのかを先に問い**、値の持ち主や取得のタイミングが正しくないなら**そちらを直す**。
  構造が正しければ残る `undefined` は本物の情報なので消さない。
- **記法**: 「無いかもしれない」プロパティは `readonly x: T | undefined` で書く
  （このタスクの本体。関数の省略可能な引数の `?` は別扱い）。

実例として参照してよい箇所: `src/utils/cache.ts` の `V extends {}`（「値としての `undefined`」を
型で禁じている良い例）。実例を挙げる場合は**現在のコードに実在する箇所だけ**にし、
T-095〜T-097・T-100 で解消される予定の箇所は「悪い例」として書かないこと（直った後に
規約が古くなるため）。

この節の追記により、完了条件に次を加える:

- `docs/coding-standards.md` に `undefined` の節があり、上の「許容する/避ける/判断の順序/記法」
  が読み取れること。`CLAUDE.md` のルール一覧にも1行あること。

**difficulty**: sonnet

**evidence**: src/ の ?: プロパティは ConfigTarget の2件だけで、readonly x: T | undefined に統一。loadConfig の既定値 {} は NO_TARGET 定数に置き換えた。docs/coding-standards.md に「undefined」節（記法＋許容する/避ける/判断の順序）を追加し、CLAUDE.md のルール一覧に1行。grep で src/ に残る ?: は utils/retry.ts のオプション引数の中身1箇所のみで、これは規約に例外として明記した（受け入れ時に、規約の引用が実コードと違っていた点も修正）。pnpm check（31ファイル334テスト、不変）。

## T-099

**タスク**: `branchToSync`（アプリの追跡ブランチ）がGitLab上に存在しない場合を、分かりやすいエラーで即座に落とす。

## 背景（調査済みの事実）

- `resolveLatestTag()`（`src/steps/build-plans/sub-steps/resolve-latest-tag.ts:47-48`）は `getBranchHeadSha(gitlab, app.projectId, app.branchToSync)` を呼ぶ。ブランチが無ければ `undefined` が返る（`gitlab.ts:57`、404フォールバック）。
- `undefined` は `resolveTrackedHeadTagNames()`（`:85`）へ渡され、`tag.commitSha === headSha` が常に偽になるので**空集合**になる。その結果 `resolveLatestTag()` は「HEADにタグが無い」と解釈して `createTag(gitlab, app.projectId, newTag.name, app.branchToSync)`（`:70`）へ進み、**存在しないブランチにタグを作ろうとしてGitLab側の404で落ちる**。設定ミスが、原因の読み取りにくいエラーとして後段に出る。
- **同じ「設定されたブランチが実在するか」を、Helmの向き先ブランチ側では事前検証している**（`stage-helm-target-branch-updates.ts:54` の `if (!(await branchExists(branchName)))` → 「向き先ブランチ "X" がchartリポジトリに見つかりません」という具体的なメッセージ）。扱いが非対称。
- `pnpm lint:validate-config:remote`（`verify-config.ts`）は `config/` に書かれたブランチの実在をMR時点で検証しているので、typoはマージ前に気付ける。ここで直すのは**実行時に対象ブランチが消えていた場合**の落ち方。

## やること

- `resolveLatestTag()` で `headSha` が `undefined` のとき、その場で例外を投げる。メッセージは Helm 向き先ブランチ側の書き方に揃え、projectName・branchToSync が読み取れるものにする。
- 例外の種類は `FatalError` **ではなく**通常の `Error`（設定ミスは該当chartリポジトリだけの問題なので、`steps/shared/step-outcome.ts` の方針どおり ERROR 記録のうえ他のchartリポジトリの処理は継続する）。`src/steps/` に `try`/`catch` を書かないルールは維持すること。
- 例外にしたことで `resolveTrackedHeadTagNames()` の引数 `headSha: CommitSha | undefined` から `undefined` を落とせるか確認し、落とせるなら落とす（`:81` の「`headSha`が`undefined`のときは常に空集合になる」というJSDocも不要になる）。
- テストを追加する: 追跡ブランチが存在しないとき、タグ作成APIが**呼ばれず**、そのchartリポジトリが ERROR になり他は処理継続すること（`test/steps/build-plans/` の既存テストの流儀に合わせ、`lib/gitlab/gitlab.js` をモックして `buildPlans()` 経由で検証する）。

## 完了条件

- 追跡ブランチ不在時に `createTag()` が呼ばれないことがテストで示されている。
- `pnpm check` を通す。テスト件数の増分を evidence に書く。
- `git add` / `git commit` はしない。

**difficulty**: sonnet

**evidence**: resolveLatestTag() で headSha が undefined のとき通常の Error を投げる（「追跡ブランチ "X" がプロジェクト "Y" に見つかりません」）。これで resolveTrackedHeadTagNames() の引数から | undefined を落とし、対応するJSDocの1文も削除。gitlab.ts の getBranchHeadSha() 戻り値の | undefined は「GitLabに無い」を表す層なので残置。テスト2件追加（ブランチ不在時に createTag が呼ばれずERROR／他のchartAndAppsは処理継続）。pnpm check（31ファイル336テスト、334から+2）。

## T-100

**タスク**: Helmの向き先ブランチを `AppConfig`（app単位）から `ChartAndApps`（client単位）へ移し、app単位への振り分けと、その後の重複排除の往復をまとめて無くす。

## 背景（調査済みの事実）

- `docs/glossary.md`「Helmの向き先ブランチ」および `chart-and-apps.ts` のJSDocのとおり、**向き先ブランチは「1client内のapps全体で共通」**。この前提は今後も変わらない（ユーザー確認済み、2026-09-07）。
- ところが共通の値を app 単位の `AppConfig.helmTargetBranch: HelmTargetBranchConfig | undefined`（`src/types/types.ts`）に持たせているため、次の往復が生じている:
  1. `resolveHelmTargetBranch()`（`src/lib/config/chart-and-apps.ts`）が `anchors.yaml` の `helm.chart[]` を、app 自身の `chart[].valuesPath` との一致で **app ごとに振り分ける**
  2. その結果、同じ書き込み先（`valuesPath`+`anchorName`）が複数appの計画に現れる
  3. `uniqueHelmTargetBranchUpdates()`（`src/steps/apply-updates/sub-steps/collect-mr-entries.ts`）が MR 本文のために **書き込み先単位で重複排除し直す**
- `AppConfig.helmTargetBranch` の `| undefined` と、`build-plans.ts` の `buildAppUpdatePlan()` にある `app.helmTargetBranch ? ... : { draft, updates: [] }` の三項も、この配置から派生している。

**このタスクの主目的は `undefined` を消すことではなく、1〜3 の往復を無くすこと。** 向き先ブランチが client 単位になれば「設定されていない」を表す `undefined` は `ChartAndApps` 側に1つだけ残るが、それは本物の情報なので残してよい（消そうとしないこと）。

## やること

- `HelmTargetBranchConfig` の持ち主を `AppConfig` から `ChartAndApps` へ移す。`chart-and-apps.ts` の `resolveHelmTargetBranch()` は app ごとの振り分け（`valuesPath` 一致でのフィルタ）をやめ、client 単位で1つの値を組み立てる形にする。
- **検証は残す**: 「`branchToSync` と `helm.chart[]` は片方だけの指定を設定ミスとして例外にする」「`branchToSync` があるなら client 内の全app の全 `chart[].valuesPath` が `helm.chart[]` でカバーされている」の2つ（現行のエラーメッセージ2種＋カバレッジ検証）。後者は client 単位のほうが検証として自然になるので、メッセージも client 単位の言い回しに見直す。
- `build-plans.ts`: 向き先ブランチの反映を `buildAppUpdatePlan()`（app ループの内側）から**ループの外**へ出し、chartAndApps あたり1回だけ実行する。`app.helmTargetBranch ? ... : ...` の三項は消える。`stage-helm-target-branch-updates.ts` は values.yaml の下書き（`ValuesYamlDraft`）を受け渡す形なので、**app ループとの順序関係を壊さないこと**（下書きは `readValuesYamlDraft` / `writeValuesYamlDraft` で引き継がれる。向き先ブランチの反映をイメージタグ反映の前後どちらに置くかを決め、理由を書く）。
- `AppUpdatePlan.helmTargetBranchUpdates` の置き場所を決め直す。向き先ブランチの更新が app 単位でなくなるので、`ChartUpdateTarget` 側に持たせるのが素直。`collect-mr-entries.ts` の `uniqueHelmTargetBranchUpdates()` は**削除**し、`MrEntries.helmBranches`（`apply-updates/sub-steps/shared/types.ts`）へはそのまま渡す。`build-mr-content.ts` の向き先ブランチのセクションは表示内容を変えない。
- `describe-plan.ts`（dryRun時とMR作成時のログ）が `plan.helmTargetBranchUpdates` を出しているので、移動先に合わせてログの出し方を決める（app単位のログに混ぜるのか、chartAndApps単位のログへ移すのか）。
- ドキュメント追従: `docs/architecture.md`（`stage-helm-target-branch-updates.ts` と `collect-mr-entries.ts` の責務の行、重複排除の記述）、`docs/glossary.md`（「Helmの向き先ブランチ」「書き込み先」の項、カバレッジ検証の説明）。判断の記録を `docs/architecture.md`「コードからは読み取れない設計判断」に残す。

## 完了条件

- `uniqueHelmTargetBranchUpdates` が存在しない（`grep -rn "uniqueHelmTargetBranchUpdates" src/ test/` が0件）。
- `AppConfig` に `helmTargetBranch` が無く、`build-plans.ts` から `app.helmTargetBranch` の三項が消えている。
- 既存のMR本文が変わらないこと（`test/steps/apply-updates/sub-steps/build-mr-content.test.ts` の期待値を、向き先ブランチのセクションについては**書き換えずに**通すこと。データの組み立て方だけを変える）。
- `pnpm check` を通す。テスト件数の増減は内訳を evidence に書く。
- `git add` / `git commit` はしない。

**dependencies**: T-095, T-096

**difficulty**: opus

**evidence**: HelmTargetBranchConfig の持ち主を AppConfig から ChartAndApps へ移し、build-plans.ts の appループの外で1回だけ適用する形にした（適用順はイメージタグの後に固定、下書きに重ねる）。helmTargetBranchUpdates は AppUpdatePlan から ChartUpdateTarget へ移動。collect-mr-entries.ts の uniqueHelmTargetBranchUpdates() は削除（grep 0件）。verify-config.ts の向き先ブランチ検証も client 単位へ引き上げ、アプリ数だけ重複報告していた問題も解消（重複しないことのテストを追加）。docs/architecture.md に設計判断を記録、glossary.md も追従。pnpm check（31ファイル336テスト、不変）。

## T-101

**タスク**: 型の置き場所の基準を、実態に追いつかせたうえで**規約からたどり着ける形**にする。

## 背景（調査済みの事実、2026-09-07）

ユーザーの問題意識は「型がファイルの先頭にあったり `types/types.ts` にあったりで、明確で合理的な理由が無さそうに見える」。調査した結果、**基準は既に存在する**が、たどり着けず、かつ実態から少しずれている:

- `docs/architecture.md`「### 型の置き場所」に**6行の表と3つの補足**が既にある。「利用箇所の数では決めない」「`types/` を型の物置にしない理由」「表の5行目と6行目が競合したら `shared/` を優先する」まで書かれている。
- `CLAUDE.md`「アーキテクチャ概要」の**原則5**が「型の置き場所も同じ判断基準で決める（利用箇所の数では決めない）」と述べ、正典は `docs/architecture.md` としている。
- `docs/coding-standards.md` は冒頭で「配置・分割・**型の置き場所**といった構成の規約は `docs/architecture.md` が正典」と**明示的に委譲している**。
- つまり「ファイルの先頭に型がある」のは表の5行目（ステップ内部の作業用の型は、その型を生み出す関数と同じファイル）に従った結果で、無秩序ではない。**見つけられないことが問題**。

## 決定事項（ユーザー合意済み、2026-09-07）

**正典は `docs/architecture.md`「型の置き場所」のまま**。二重管理を避けるため、表と理由を `docs/coding-standards.md` へ書き写すことはしない。規約側からは**導線を張るだけ**にする。この点は決着済みなので蒸し返さないこと。

## やること

### 1. 表が実態をカバーしきれていない4点を埋める

いずれも調査で実在を確認済み:

- **`src/domain/` の行が無い**。T-093 で新設したディレクトリなのに、型の置き場所の表が更新されていない（現時点で `domain/` に型定義は無いが、置くとしたら何が該当するのかが書かれていない）。`domain/` の定義は同じ文書の「### `src/domain/`」節（「GitLab APIにも外部ファイル形式にも依存せず、ブランド型・ドメイン型にだけ依存する純粋な関数・定数」）に沿わせる。**ドメイン語彙の型は `types/types.ts`、`domain/` に置くのは何か**（あるいは「型は置かない」が答えなのか）を明確にすること。
- **関数が引数として受け取る型がどの行にも当てはまらない**。`LabeledTarget`（`src/lib/config/validate.ts:74`、`validateNoDuplicateTargets()` の引数の形。呼び出し元は `chart-and-apps.ts`）は「その型を**生み出す**関数と同じファイル」（5行目）では説明できない。実際の配置は妥当なので、基準の側を言語化する。
- **外部ファイル形式のスキーマから導出した型の扱いが無い**。`AnchorsApp`（`src/lib/config/schema.ts:77`、`z.infer<typeof AnchorsAppSchema>`）。2行目（技術・外部システムのインターフェース）で読めなくはないが、Zodスキーマからの導出という経路が表に出てこない。`docs/architecture.md`「型定義のフィールド名は…」節の「内部表現への詰め替えはZodスキーマの `.transform()` が担う」という既存の記述と噛み合わせること。
- **2行目の例に `EnvConfig`（`src/lib/env.ts:56`）が挙がっていない**。`ConfigTarget`・`Anchors` と同じ扱いのはずで、例の列に揃っていない。

### 2. 規約側から導線を張る

`CLAUDE.md`「コーディング規約・レビュー方針」のルール一覧に、型の置き場所の項目を1行足す（現在この一覧に型の置き場所の項目は無く、原則5は「アーキテクチャ概要」節にしかない）。`docs/coding-standards.md` 冒頭の委譲の文はそのままでよいか、より見つけやすい書き方があるかを判断する。**同じ内容を2箇所に書かないこと。**

### 3. 現状の型を基準と突き合わせる

`src/` の型定義は17ファイル・約40件（`export type` / `type` / `export interface`）。埋めた基準に実際に従っているか全件突き合わせる。従っていないものが見つかったら、**このタスクでは動かさない**。別タスクとして登録できる形（どの型・現在の場所・あるべき場所・理由）で `develop/tasks.json` に起票するか、`docs/architecture.md` に「意図的な例外」として理由を書くかを選ぶ。**基準づくりと型の引っ越しを同じコミットに混ぜないこと**（混ぜると「規約に合わせて動かした」のか「動かしたいから規約をそう書いた」のか後から判別できなくなる）。

## 完了条件

- 型の置き場所の表が上記4点をカバーしており、`src/domain/` の行がある。
- `CLAUDE.md` のコーディング規約のルール一覧から型の置き場所の基準へたどり着ける。**同じ内容が2箇所に書かれていない**（`docs/coding-standards.md` に表を書き写していない）。
- 突き合わせ（3）の結果が、起票された別タスクか `docs/architecture.md` の例外記述のどちらかの形で残っている。
- 表を拡張した理由が分かる形になっていること（`docs/architecture.md`「設計判断」への追記が必要かは判断に委ねる。表の行そのもので自明なら不要）。
- ドキュメントのみの変更であっても `pnpm check` を通す（`format:check` があるため）。
- `git add` / `git commit` はしない。

## difficulty を opus にしている理由

置き場所の判断（正典をどこにするか）は決着済みだが、**残る作業は既存の入念に議論された文書に新しい基準を接ぎ木すること**で、既存の3つの補足・「用途別の型エイリアスを作らない」「1つの語を2つの意味に使わない」等との整合を取る必要がある。加えて約40件の型の全件突き合わせと、違反を「例外として認める/別タスクにする」の仕分けが入る。

**difficulty**: opus

**evidence**: docs/architecture.md「型の置き場所」の表に4つの穴を補った: ParsedTag（1行目と5行目の競合＝語彙が先、src/domain/ に型が無い理由）・LabeledTarget（関数が引数として受け取る形も5行目）・AnchorsApp（z.infer由来はスキーマと同じファイル）・EnvConfig（2行目の例）。CLAUDE.mdのコーディング規約一覧には基準を書かず参照だけの1行を足した（原則5と二重にならないよう、当初書いた基準の再掲を撤回）。src/の型45件を全件突き合わせて違反0件で、その事実と「型を動かす前に表を読む」を設計判断に記録。pnpm check（31ファイル336テスト、不変）。

## T-102

**タスク**: `src/steps/shared/step-outcome.ts` の `withAppContext()` が `build-plans` からしか使われていない。他の2ステップ（`filter-targets` / `apply-updates`）でアプリ単位のエラー文脈が本当に不要かを確認し、不要なら現状の置き場所・JSDocをその事実に合わせる。

## 背景（調査済みの事実）

- `withAppContext()` は `src/steps/shared/step-outcome.ts` に定義され、使用箇所は `src/steps/build-plans/build-plans.ts:114`（`buildAppUpdatePlan()` の呼び出しを包む）の**1箇所だけ**。
- 内部実装の `rethrowWithAppContext()` は、fatal でない `Error` に `[アプリ: <projectName>] ` を前置して投げ直す。fatal（401/5xx/ネットワーク障害）は**包まずにそのまま投げる**（`settleAsError()` が `cause.response.status` や `code` の構造を見るため、1段深くすると `FatalError` に昇格できなくなる）。
- 同ファイルの `withHandling()` は3ステップすべてが使う（chartAndApps単位）。`step-outcome.ts` 冒頭のコメントは置き場所の理由を「**複数のstepから呼ばれる**ため特定stepの `sub-steps/` にも置かない」と説明しているが、`withAppContext()` はこの説明に当てはまっていない。
- 他2ステップのアプリ単位の扱い:
  - `filter-targets/filter-targets.ts` はアプリ単位のループを持たない（`chartAndApps.apps.length === 0` を見るだけ）。
  - `apply-updates` 本体もアプリ単位のループを持たないが、サブステップの `apply-updates/sub-steps/collect-mr-entries.ts:28` が `updatedPlans.map(async (plan) => ...)` で**プラン（＝アプリ）単位の非同期処理**を行い、`webUrl` とパイプラインを取得している。ここで失敗した場合、現状はアプリ名が付かない。

## 先にやる理由

T-103（コメント基準の追従）と T-104（テストの棚卸し）がこのタスクに依存している。コンフリクト回避ではなく、**T-102 の結論が `step-outcome.ts` のコメントの直しを含む**ため。T-103 がコメントを整えた直後に T-102 が同じ箇所を書き換えると、整えた意味が消える。

## 詰める論点

(a) `collect-mr-entries.ts` のアプリ単位の非同期処理で、エラーにアプリ名が付かないことが実際に困るか。オールオアナッシングでclient全体がERRORになる（＝原因アプリが特定できないと調査できない）という `rethrowWithAppContext()` の動機は、こちらにも同じく当てはまるのではないか。当てはまるなら `withAppContext()` を使う側を増やす、当てはまらないなら理由を言えるようにする。
(b) (a) の結論が「他では不要」なら、`step-outcome.ts` に置き続ける理由が冒頭コメントの説明と食い違う。`build-plans/` 側へ移すか、置き場所は据え置きでコメントの説明を実態に合わせるかを決める（`CLAUDE.md` 原則2「複数箇所から呼ばれるは `lib/` に置く理由にならない」と、原則1「`sub-steps/` 直下のファイル同士は import しない」の両方に照らして判断する）。
(c) 移す判断なら、`rethrowWithAppContext()` が持つ「fatalは包まない」という判断が `settleAsError()` と同じファイルに置かれている現在の利点（方針の変更漏れを防ぐ、と JSDoc に明記されている）を失わない形にできるか。失うなら移さない理由になる。

## 完了条件

- (a)(b) の結論と理由を `docs/architecture.md`「設計判断（なぜ今の形なのか）」に記録する。`step-outcome.ts` 冒頭の置き場所コメントが結論と食い違ったままにしない。
- 使う側を増やす／移す判断なら実装する。着手時の `pnpm test` の件数から**減らさず** `pnpm check` を通すこと。ファイル移動は `git mv`。
- `git add` / `git commit` はしない。

**difficulty**: sonnet

**evidence**: (a)同じ動機が当てはまると結論し、collect-mr-entries.ts のplan単位の解決を withAppContext() で包んだ。(b)使う側が2stepになったため step-outcome.ts は据え置き、withAppContext() のJSDocを実態に更新。docs/architecture.md に「アプリ名の付与は`steps/shared/`に置き〜」節を追加。pnpm check 通過（31ファイル337テスト、着手時336から+1）。

## T-103

**タスク**: コメントの基準を「長さ」から「種類」に置き換え、`src/` と `scripts/` の全ファイルをその基準に合わせ、`docs/coding-standards.md` に明文化する。

## 決定済みの方針（2026-09-07 の grilling でユーザーが確定。実装時に蒸し返さない）

- **基準の軸は種類**: 「今の挙動の制約・前提」は残す（長くてよい）、「昔はこうだった」は行数に関係なく正典（`docs/architecture.md`）送り。既存の「原則1〜2文」は**撤廃する**。
- **行数の目安は一切置かない**（採らなかった案: 「5行を超えたら疑う」等の緩い目安を残す）。理由: 今回の乖離そのものが「数字を置くと、種類の基準ではなく数字のほうが基準として使われる」という実例だから。同じ轍を踏まない。
- **機械チェックはしない**（採らなかった案: 「以前は」「かつて」等の過去形の語を lint で警告する）。理由: 日本語の過去形は正当な文脈にも当たる（例: 「GitLab APIは404ではなく403を**返していた**」という外部挙動の記録）。誤検知が多すぎる。代わりに**レビューの問いを規約に1文書く**: 「この段落はコードの今の挙動を説明しているか、昔の話か」。`/code-review` の Standards 軸は明文化された規約を自動で読むため、スキル側の編集は不要。
- **範囲は `src/` と `scripts/` のみ**。`test/` は含めない（T-104 でテスト自体を見直した後に別タスクで扱う）。

## 背景（調査済みの事実）

- 基準は**既に `docs/coding-standards.md`「コメント」節にある**（(1)コードから読み取れないことだけ (2)型名・関数名の言い換えは書かない (3)原則1〜2文 (4)背景・理由・経緯は正典へ (5)残す価値があるのは「外部との対応関係」と「非自明な前提・制約」）。壊れていたのは基準の不在ではなく (3) の**軸**。
- 長いJSDocは2種類に割れる。**正当に長い**例: `scripts/lint/verify-config/verify-config.ts` の「chartリポジトリが見つからない場合、依存する検証は結果が自明なので行わない」「client単位で1つなので、アプリの数だけ同じ問題を報告しないようループの外で1回だけ呼ぶ」——これは (5) そのもので、削ると情報が消える。**違反**の例: `src/steps/build-plans/sub-steps/shared/values-yaml-draft.ts:224-228`（「以前は`valuesYamlCache`と`modifiedValuesPaths`を別々に持ち回っており〜」5行）、同 `:274-278`（「以前存在した internal error は〜」）。
- `src/`+`scripts/` は43ファイル、うち40ファイルがコメントを持つ。「以前は/かつて/統一する」等の**経緯を疑う語を含むのは3ファイルのみ**（`src/steps/apply-updates/sub-steps/build-mr-content.ts`、`src/steps/shared/step-outcome.ts`、`src/steps/build-plans/sub-steps/shared/values-yaml-draft.ts`）。ただしこの grep は規約(2)「型名・フィールド名の言い換え」型の違反を拾えない（例: `values-yaml-draft.ts:210-213` の「`content`は現在の内容、`modified`は書き換えたかどうか」）。**そのため grep 頼みにせず全40ファイルを目で見る**。
- 移し先が既に埋まっている場合がある: `values-yaml-draft.ts:224-228` の経緯は、`docs/architecture.md:310`（「引数として渡した入れ物が呼び出し先で書き変わる契約にしない」節）の「以前はMutableな`Map`を渡して実装が埋める形で〜」と重なる（完全一致ではない）。
- `docs/architecture.md` は41KBあり通読しない運用。冒頭に「節の索引」があり、`sed -n '/^#### 見出し/,/^#\{1,4\} /p' docs/architecture.md` で節単位に読む。

## 手順

1. `docs/coding-standards.md`「コメント」節を書き換える。(3) を種類の基準に差し替え、レビューの問いを1文足す。**「適切に」のような、読み手によって結論が変わる語を使わない**。
2. `src/` と `scripts/` の40ファイルを1件ずつ見る。判定は「今の挙動の説明か、昔の話か」の1問。**ディレクトリ単位で区切って進める**（量が多いため、途中で中断しても再開できるように）。
3. 経緯と判定したものは、**消す前に正典を確認する**。既にあれば消すだけ、無ければ `docs/architecture.md` の該当節に書いてから消す。
4. `CLAUDE.md`「コーディング規約・レビュー方針」のコメントの行が更新後の基準と食い違わないようにする（`CLAUDE.md` には基準を二重に書かず参照だけにする現在の方針を守る）。

## 完了条件

- 消した経緯それぞれについて、**正典の該当箇所を示せる**か、新たに書き足したことを示せること。「経緯だから消した」だけで済ませない。
- 40ファイルすべてを見たこと（見たが変更不要だったものを含む）。
- 着手時の `pnpm test` の件数から**減らさず** `pnpm check` を通すこと。
- `git add` / `git commit` はしない。

**difficulty**: sonnet

**evidence**: docs/coding-standards.md「コメント」を長さ基準から種類基準（今の挙動は残す／昔の話は正典へ）に差し替え、レビューの問い1文を追加。CLAUDE.md の該当行も参照に更新。src/+scripts/ の43ファイル（コメントあり40）を全件確認し、経緯5箇所を docs/architecture.md の「引数として渡した入れ物〜」「設定ミスの検知〜」「3ファイル分割」「MRの単位〜」の各節へ移してコードから削除（values-yaml-draft.ts 2件・build-mr-content.ts・verify-config.ts・schema.ts）。併せて gitlab.ts の関数名の言い換えコメント1件を削除。pnpm check 通過（31ファイル337テスト、変化なし）。

## T-104

**タスク**: テストの取捨選択の基準を確定し、`pnpm test:coverage` を回して「不要・冗長・不足」の発見リストを作る。**実際の修正はこのタスクに含めず**、リストができた時点で後続タスクとして登録する。

## 決定済みの方針（2026-09-07 の grilling でユーザーが確定。実装時に蒸し返さない）

- **このタスクの範囲は基準の確定と発見リストまで**。削除・追加の実作業は分ける。理由: 候補が何件出るかで作業量が桁違いになり、事前に見積もれない。リストがあれば残りは `sonnet` に落とせる可能性がある（判断は基準確定で済み、あとは手続きを回すだけになるため）。
- **削除は保守的に**。重複が証明できたものだけ消す。証明の手続きは「**消す候補を一時的にスキップして `pnpm check` が落ちないことを確認する**」（落ちないなら他のテストが守っていない＝そのテストが唯一の守り手ではない）。テストの削除は間違えても気づきにくい変更の代表格なので、ここは手続きで縛る。
- **カバレッジに閾値は設けない**（採らなかった案: 閾値を決めて `pnpm check` に組み込み、下回ったら落とす）。理由: 閾値は「数字を満たすためのテスト」を生み、それはこのタスクが消したい冗長テストと同じ病気。穴の在り処を見る道具としてだけ使う。
- **「不足」はエラー方針と要件に関わる穴だけ埋める**。全部の未到達行を埋めない（同じ理由）。**埋めなかった穴とその理由を成果物として残す**——次に見る人が同じ調査を繰り返さずに済むように。
- **`build-mr-content.test.ts` の粒度は正当と見なす**（採らなかった見方: 実装の詳細に密着していて書式変更のたびに壊れるから冗長）。理由: MR本文はこのツールの主要な成果物で、レビュアーが読む唯一の出力。表示の取り決めは他に守る手段が無い。
- 書き先は **`docs/coding-standards.md` に「テスト」節を新設**して正典にする。`CLAUDE.md`「テスト方針」の3行はそちらへ移し、`CLAUDE.md` 側は参照だけにする（`コメント`・`undefined` と同じ形に揃える）。

## 背景（調査済みの事実）

- 現状は31ファイル・336テスト・計4516行。行数上位は `test/lib/config/config.test.ts`(615)、`test/lib/gitlab/gitlab.test.ts`(430)、`test/steps/build-plans/sub-steps/resolve-latest-tag.test.ts`(370)、`test/lib/config/validate.test.ts`(288)、`test/domain/tag-format.test.ts`(252)。
- **カバレッジは導入済み**: `vitest.config.ts` に `coverage: { provider: "v8", include: ["src/**/*.ts", "scripts/lint/verify-config/**/*.ts"] }`、`@vitest/coverage-v8` は devDependencies、`pnpm test:coverage` も定義済み。**導入は不要、回すだけ**。
- **重複の疑いは1つ潰してある**: `test/steps/apply-updates/apply-updates.test.ts` はサブステップ (`build-mr-content.js` / `collect-mr-entries.js`) を `vi.mock()` しており（4-5行目）、配線だけを検証している。専用のサブステップテストとの二重化は起きていない。
- 現行のテスト方針は `CLAUDE.md`「テスト方針」の3行: (1)`test/` 以下にテスト対象と同じディレクトリ構成で配置 (2)`@gitbeaker/rest` は `vi.mock` でモック (3)非公開関数はエクスポートされたステップの振る舞いを通して間接的に検証する。加えて `docs/coding-standards.md`「関数の並び順」節に「テストのためだけの `export` はしない」が間借りしている（`src/lib/env.ts` に例外あり）。
- エラー方針: 401/5xx/ネットワーク障害は `FatalError` を投げて即時終了、それ以外は該当chartリポジトリを `ERROR` としてログ記録し処理継続。

## 手順

1. `docs/coding-standards.md` に「テスト」節を新設し、上の方針を書く。`CLAUDE.md`「テスト方針」の3行を移して参照に落とす。「関数の並び順」節の「テストのためだけの `export` はしない」も移すか、相互参照を張る。
2. **「不要・冗長」の判定観点を確定させる**。狙いどころとして挙がっているのは「同じ `vi.mock` 準備を何度も書いている箇所」「型システムが既に保証している分岐を確認している箇所」「実装の内部構造をなぞっているだけで振る舞いを保証していない箇所」。**採る観点と採らない観点の両方を明示する**。
3. `pnpm test:coverage` を回し、未到達の行を洗い出す。エラー方針と `docs/requirements.md` の要求に照らして、埋めるべき穴とそうでない穴に分ける。
4. 発見リストを作る。削除候補は「どのテストか・なぜ冗長と見たか・スキップ確認の結果」、追加候補は「何を防ぐテストか」、埋めない穴は「なぜ埋めないか」をそれぞれ1〜2行で。

## 完了条件

- 新設した「テスト」節が、書いてあるとおりに適用できること（「適切に」のような、読み手によって結論が変わる語を使わない）。
- 発見リストが `develop/` か `docs/` のどこかに成果物として残っていること（置き場所は実施時に決めてよい）。
- **このタスクではテストを削除・追加しない**。リストに基づく修正タスクと、`test/` のコメント追従タスク（T-103 の基準を `test/` にも当てる）を `develop/tasks.json` に登録して終わる。
- `pnpm check` を通すこと（テスト件数は不変のはず）。
- `git add` / `git commit` はしない。

**difficulty**: opus

**evidence**: docs/coding-standards.md に「テスト」節を新設（置き場所とモック／カバレッジに閾値を設けない／消すかどうかの判断表＋削除の手続き2ステップ／足すかどうか）。CLAUDE.md「テスト方針」は参照1文に。発見リストは develop/test-inventory.md（削除候補9・集約候補2・要調査1・消さないと決めたもの3・追加候補4・埋めない穴5。削除候補9件は実際に skip して手続き2ステップを確認済み）。後続タスク T-105/T-106/T-107 を登録。pnpm check 通過（31ファイル337テスト、削除・追加なしで不変）。

## T-105

**タスク**: `develop/test-inventory.md` の発見リストに沿って、テストの削除・集約・追加を実施する。

## 決定済みの方針（実装時に蒸し返さない）

- 判断基準は `docs/coding-standards.md`「テスト」節が正典。新しい基準をここで作らない。
- **削除は必ず手続きで縛る**。同節の削除の手続き（`it.skip` にして `pnpm check` が落ちない／`pnpm test:coverage` の到達行・分岐が減らない）を、削除する1件ごとに回す。発見リストの skip確認は計測時点のものなので、実施時にもう一度取り直す。
- **カバレッジに閾値は設けない**。数字を上げることを目的にしない。
- 発見リストの「消さないと決めたもの」は消さない。
- 発見リストの「埋めない穴」は埋めない。埋めない判断を変えたくなったら、リスト側の理由を先に更新する。

## やること

1. 削除候補9件を、1件ずつ手続きを回して削除する。手続きに引っかかったものは残し、`develop/test-inventory.md` にその結果を追記する。
2. 重複の集約候補2件（`build-plans` 系4ファイルの `beforeEach` とモック定数、`const mockGitlab = {} as unknown as GitlabClient`）を `test/helpers.ts` に寄せる。テストの件数はここでは減らさない。
3. 要調査1件（`test/steps/build-plans/build-plans.test.ts` とサブステップ3ファイルの経路の重なり）をテスト単位で判断する。
4. 追加候補4件（`src/index.ts` の終了コード、`projectExists`、`loadEnvConfig()`、`verify-config.ts` の catch）のテストを書く。

## 完了条件

- 削除した各テストについて、手続きの2ステップを通した記録が `develop/test-inventory.md` に残っていること。
- 追加した4件が、それぞれ対象の行に到達していることを `pnpm test:coverage` で確認できること。
- `pnpm check` を通すこと。

**difficulty**: sonnet

**evidence**: 削除候補9件を1件ずつ手続き（it.skip→pnpm check通過→カバレッジ表不変）にかけて全件削除、9件まとめて削除後もカバレッジ表が実施前と完全一致することを確認。集約2件を test/helpers.ts に寄せ（mockGitlab・OLD_TAG/NEW_TAG/HEAD_SHA・mockBuildPlansGitlab()）。要調査1件は残す判断。追加4件を7テストとして実装し、カバレッジは 97.19%→99.37%（Lines 97.54%→99.82%）。実施結果と発見は develop/test-inventory.md「実施結果」に追記。pnpm check 通過（32ファイル337テスト）。

## T-106

**タスク**: `test/` 配下のコメントを `docs/coding-standards.md`「コメント」節の基準に合わせる。`src/` と `scripts/` は既に適用済みで、`test/` だけが残っている。

## 決定済みの方針（実装時に蒸し返さない）

- 基準は「コメント」節の判断表（今の挙動の制約・前提と外部との対応関係は残す／昔の話は正典へ移してコードから消す）をそのまま使う。**行数の目安は置かない**。
- テスト名（`it()` の説明文）はコメントではない。言い換えのコメントが `it()` の説明文と重複しているときは、コメント側を消す。
- 経緯をコードから消すときは、先に正典（`docs/architecture.md` / `docs/glossary.md` / `docs/requirements.md`）に書かれているかを確認する。無ければ正典に書いてから消す。

## 完了条件

- `test/` 配下の各コメントが判断表のどれかに当てはまること。
- テストの件数と各テストの内容を変えないこと（コメントの追従のみ）。
- `pnpm check` を通すこと。

**difficulty**: sonnet

**evidence**: test/ 配下の全コメント（11ファイル）を判断表に照らして確認。修正3件: resolve-latest-tag.test.ts の「旧方式/新方式」の経緯を削除（今の挙動の理由は resolve-latest-tag.ts のJSDocが正典）、gitlab.test.ts の403の説明から src 側JSDocの丸写し部分を削り外部挙動だけ残す、config.test.ts の関数名の言い換え1件を削除。他は今の挙動の制約・前提または外部との対応関係に当たるため据え置き。pnpm check 通過（32ファイル337テスト、内容・件数とも変更なし）。

## T-107

**タスク**: `src/utils/http.ts` の `isFatalStatus` の引数の型を `number | undefined` から `number` に狭め、`if (status === undefined) return false` を消す。

唯一の呼び出し元（`isFatalError`）が `status !== undefined` を確認済みで、この分岐には到達しない。`docs/coding-standards.md`「避ける `undefined`」の「実行時には到達しないのに型に残っている `undefined`」に当たる。

## 完了条件

- `isFatalStatus` に `undefined` を渡す呼び出しが無いことを確認したうえで型を狭めていること。
- `test/utils/http.test.ts` の既存テストを変えずに `pnpm check` が通ること。
- `pnpm test:coverage` で `src/utils/http.ts` の branches が 31/31 になること。

**difficulty**: haiku

**evidence**: isFatalStatus の引数を number に狭め、到達しない undefined 判定を削除。呼び出し元は src/utils/http.ts:24 の1箇所のみで status !== undefined を確認済み。pnpm check 通過（32ファイル337テスト、テストは無変更）。カバレッジは http.ts が 100%（未到達行なし）。完了条件の「branches 31/31」は分岐そのものを消したため 29/29（100%）になった。

## T-108

**タスク**: `src/index.ts` の `loadEnvConfig()` の失敗が `.catch` に載らない件を直す。

## 背景（確認済みの事実）

冒頭コメントは「環境変数の読み込みを非同期の中で呼ぶのは、その失敗も下の catch に載せて構造化ログに出すため。トップレベルで投げると素のスタックトレースになる」と説明している。しかし実際の `run(loadEnvConfig())` は引数の `loadEnvConfig()` が先に同期評価されるため、`GITLAB_URL` 未設定などの失敗は `.catch` に載らず、モジュール評価時の例外として素のスタックトレースになる。コメントが説明している意図と実装が食い違っている。

`test/index.test.ts` を書いた際に再現済み（そのケースは失敗するためテストには含めていない）。

## やること

- `loadEnvConfig()` の呼び出しを `.then` の中に入れるなどして、失敗が `unhandled_error` として構造化ログに出るようにする。
- 直したうえで `test/index.test.ts` に「環境変数の読み込みの失敗も unhandled_error として記録する」ケースを足す。
- 冒頭コメントが実装と食い違わない状態にする。

## 完了条件

- 追加したケースが通り、`pnpm check` が通ること。
- `develop/test-inventory.md`「追加テストで見つかった食い違い」の記述を、直した後の状態に合わせて更新すること。

**difficulty**: sonnet

**evidence**: src/index.ts を Promise.resolve().then(() => run(loadEnvConfig())) に変え、環境変数の読み込みの失敗も unhandled_error として構造化ログに出るようにした。冒頭コメントも実装に合わせて更新。test/index.test.ts に該当ケースを追加（4件→5件）。develop/test-inventory.md の該当節を修正済みの記述に更新。pnpm check 通過（32ファイル338テスト）。

## T-109

**タスク**: 実機スモークテストを実行できる状態が揃っているかを確認する（**このタスクでは実行しない**。書き込みを伴う手順は人間の承認が要るため、確認と報告までで止める）。

## 背景

T-064以降の変更が実機未検証のまま溜まっている（URL検証の追加・MR本文のURL解決の作り替え・`loadEnvConfig()`化・values.yaml下書きの受け渡しの作り替え・スモークスクリプトの環境変数追加）。さらに直近のセッションで `src/index.ts` の起動経路を変えた（環境変数の読み込みを `then` の中に移した）。手順は `docs/smoke-test.md` が正典。

## 確認すること

1. **認証情報**: `.env` に `GITLAB_URL` / `ACCESS_TOKEN` が設定されているか（**値そのものは出力しない**。設定の有無だけを見る）。`.env.example` との差分も見る。
2. **対象プロジェクトの実在**: `docs/smoke-test.md`「使うGitLabリソース」の3件（`SMOKE_CHART_PROJECT_ID` / `SMOKE_QA_SPRINT_PROJECT_ID` / `SMOKE_DEVELOP_CLIENT_PROJECT_ID`）が、書かれているprojectIdでGitLab上に実在し参照できるか。**読み取りのみ**（タグ・ブランチ・MRを作らない）。
3. **手順に出てくるコマンドの実在**: `docs/smoke-test.md`「手順」の各コマンドが今の `package.json` / `scripts/smoke/smoke-fixture.ts` に実在するか（スクリプト名・サブコマンド・フラグ名）。手順が古いままになっていないかを見る。
4. **フィクスチャ**: `config-test/` の内容が手順と検証シナリオの前提（chartリポジトリ・2アプリ・向き先ブランチ）と合っているか。`pnpm lint:validate-config:remote` に相当する読み取り専用の検証が通るか。
5. **期待結果の記述のズレ**: 「期待する結果」節が今の実装（MR本文の組み立て・終了コード・dry-runの挙動）と食い違っていないか。

## 完了条件

- 上の5点それぞれについて「揃っている / 欠けている・古い」を根拠付きで一覧にする。欠けているものには埋め方（人間がやること／タスク化すべきこと）を1〜2行で添える。
- 実機への書き込みを伴う操作（`smoke-fixture.ts --apply`、本体の実行）は**行わない**。
- 結果を `develop/progress.md` に残すか、量が多ければ `develop/` 配下のファイルにまとめる。
- 修正が要ると分かったものは `develop/tasks.json` にタスクとして登録する。

**difficulty**: sonnet

**evidence**: 5点すべて「揃っている」。(1)`.env` に GITLAB*URL/ACCESS_TOKEN あり（SMOKE*\* は手順どおり実行時に export する設計）。(2)`pnpm lint:validate-config:remote config-test` が読み取りのみで通過し、3プロジェクト・ブランチ・valuesPath・アンカーの実在を確認（config OK: 3 chart groups, 5 apps）。(3)手順のコマンドは実在（smoke-fixture.ts の setup/reset/--apply、validate-config.ts の位置引数 config-test、pnpm dev）。(4)config-test の projectId・アンカー名が手順の期待と一致。(5)MRタイトル書式・本文8列/4列・summary の3キー・終了コードの写像がいずれもドキュメントの記述どおり。実機への書き込みは未実施。

## T-110

**タスク**: コミットメッセージにタスクIDを振る運用にできるかを確認し、できるなら運用とルールを整える。

## 背景・論点

現在の規約は `docs/coding-standards.md`「タスク番号を書かない」で、**コード・ドキュメント**にタスク番号（`T-` + 3桁）を書かないことになっている。理由は「タスク番号はアーカイブされると意味を失う一方、コード側の記述は残り続けるため、参照先が消えた死んだ識別子になる」。

コミットメッセージがこの規約の対象かどうかは、いまの文面では決まっていない。判断の材料:

- アーカイブ後もIDは `docs/history/tasks-archive.md` に `## T-XXX` として残るので、参照先が消えるわけではない（コード側の懸念がそのままは当てはまらない）
- 一方、規約の機械的な確認は `grep -rE "T-[0-9]{3}"` が `develop/` / `docs/history/` 以外で0件になること、と書いてある。コミットメッセージはワーキングツリーのgrep対象ではないので、この確認方法は変えなくてよいはず（実際にそうか確かめる）
- コミットとタスクの対応が付くと、`git log --grep` で「このタスクで何を変えたか」を後から引ける

## やること

1. 上の論点を確認し、コミットメッセージにIDを書くことが「タスク番号を書かない」規約と衝突しないことを確かめる（衝突するなら、その理由を書いて何も変えずに終わる）。
2. 書式を1つに決める。候補は件名の先頭（`T-109: 〜`）、件名の末尾（`〜（T-109）`）、本文のtrailer（`Task: T-109`）。**件名の文字数を圧迫しないか**と、`git log --oneline` で読めるかで選ぶ。
3. 決めた運用を書く場所を決めて書く。`docs/coding-standards.md`「タスク番号を書かない」節に例外として1〜2文を足すか、`docs/workflow.md` のコミット手順に書くか（規約の正典を二重にしない）。`.claude/skills/next-task/SKILL.md` の手順6がコミットに触れているので、そちらとの整合も取る。
4. 複数タスクにまたがるコミットや、タスクIDを持たない作業（このタスク自身のような運用変更、typo修正）をどう書くかも決めておく。

## 完了条件

- 決めた書式と、それをどこに書いたかを示せること。「適切に」のような読み手によって結論が変わる語を使わない。
- **過去のコミットは遡って書き換えない**（履歴の書き換えは破壊的操作）。
- `pnpm check` を通すこと（ドキュメントのみの変更でも整形の対象になる）。

**difficulty**: sonnet

**evidence**: 衝突しないと判断（規約の対象はコード・ドキュメント／IDはアーカイブ後も docs/history/tasks-archive.md に ## T-XXX として残る／機械的確認の grep はワーキングツリーしか見ずコミットメッセージを含まない。grep -rE 'T-[0-9]{3}' の該当は develop/ と docs/history/ の4ファイルのみで規約どおり）。書式は件名の先頭に `T-XXX: `（git log --oneline に出るため）。正典は docs/workflow.md「コミットメッセージ」節に新設し、docs/coding-standards.md には対象外である旨の2文、SKILL.md 手順6には参照を足した。過去コミットは書き換えていない。pnpm check 通過（32ファイル338テスト）。

## T-111

**タスク**: GitLabへの問い合わせをバッチ全体で使い回すためのキャッシュ機構を設計し、導入する。T-112〜T-115 の前段。

## 背景

実行1回（バッチ）の中で、同じ引数のGitLab問い合わせが何度も走っている箇所が複数ある（T-112〜T-115）。原因は、キャッシュが必要になるたびに**その場で工場関数を1つ書く**やり方を取っていて（`createCachedBranchExists()`（`src/steps/build-plans/build-plans.ts`）・`createResolveLatestTags()`（`src/steps/build-plans/sub-steps/resolve-latest-tags.ts`）の2箇所）、新しい呼び出しを足す人がキャッシュの要否を毎回自分で気づく必要があること。素の関数を呼ぶほうが常に書きやすいので、抜けるほうへ倒れる。

## 解くべき設計上の論点

1. **置き場所**。キャッシュしたい対象は `steps/build-plans/`（values.yamlの読み込み）と `steps/apply-updates/`（`getProjectWebUrl` / `getLatestPipelineForRef`）の**両方**にまたがる。CLAUDE.md 原則1により `steps/` 同士は import できないので、どちらかのstepの中に置く案は取れない。候補は (a) `main.ts` の `runProcess()` でバッチ単位に1つ作り、各stepへ引数で渡す (b) `src/lib/gitlab/` 側で `GitlabClient` を包んだ「キャッシュ付きクライアント」を作り、`createClient()` の戻り値に含める (c) それ以外。原則1・原則2（`lib/`は技術・外部システム依存で判断）と、テスト時にキャッシュを差し替え/無効化できるかで選ぶ。
2. **何をキャッシュしてよいかの規則**。バッチ実行中に値が変わらない読み取りだけが対象。`branchExists` は `commitFileUpdates()`（`src/lib/gitlab/gitlab.ts`）の中では**削除・再作成をまたぐためキャッシュしてはいけない**（現状も生の呼び出しで正しい）。同様に `createTag` / `commitFileUpdates` / `createMergeRequest` の後で値が変わる読み取り（`listTags` など）をどう扱うかを決める。**「キャッシュ可能」を既定にせず、明示的に選んだものだけが乗る**形にするか、その逆にするかを含めて決める。
3. **キーの作り方**。今は `${projectId}:${branch}` のようなテンプレート文字列を各所で手書きしている。引数の取り違え・キー衝突を型で防げるか（例: 関数ごとにキー生成を持たせる）を検討する。
4. **既存2箇所の扱い**。新機構へ寄せるか、そのまま残すか。`createResolveLatestTags()` は「同じappが複数clientにあるときのタグ重複作成の防止」という**正しさのためのキャッシュ**（性能ではない）で、キャッシュを壊すと落ちるテストが付いている。移行するならその保証を落とさないこと。

## やること

1. 上の1〜4を決める。決めた理由（採らなかった案とその理由を含む）を `docs/architecture.md` に節として書く（正典はそちら。CLAUDE.md には二重に書かない）。
2. 機構を実装する。`src/utils/cache.ts` の `getOrFetchShared()` は残す／包む／置き換えるのいずれかを決めたうえで扱う。
3. 少なくとも既存2箇所のどちらか、または T-112〜T-115 のうち1件を新機構に載せて、機構が実際に使えることを示す（残りは T-112〜T-115 で行う）。
4. 機構自体のテストを追加する（同じキーの同時呼び出しが1回にまとまること、失敗した呼び出しがキャッシュに残らないこと）。

## 完了条件

- `docs/architecture.md` に設計判断が書かれ、「新しいGitLab問い合わせを足す人がキャッシュの要否をどう判断するか」が読み取れること。
- `pnpm check` を通すこと（既存338テストが減っていないこと）。

## 注意

- **方針決めを含むため、ユーザーがいるセッションで扱う**（`docs/workflow.md`「委譲しないケース」）。`/loop` の自動進行には載せない。

**difficulty**: opus

**evidence**: 置き場所は案(a)を採用。`src/lib/gitlab/batch-cache.ts` に `GitlabBatchCache` と `createGitlabBatchCache()` を新設し、`runProcess()` がバッチ1回につき1つ作って `buildPlans()` へ引数で渡す。案(b)（`createClient()` の戻り値に含めるキャッシュ付きクライアント）は、生の呼び出しとキャッシュ付きの区別が `.client`/`.cache` というアクセス経路に化けてstepの引数から見えなくなること・寿命がクライアントに固定され `createClient()` を使う `scripts/` にも付いてくることから不採用。キャッシュしてよいのは「このツール自身の書き込み（createTag/commitFileUpdates/createMergeRequest/ブランチ削除）でバッチ中に値が変わらない読み取り」だけで、`GitlabBatchCache` に列挙したものだけが乗る明示的オプトイン（listTags・openMergeRequestExists・commitFileUpdates内のブランチ確認は載せられない旨をコードと正典に明記）。キーは引数から機械的に組み立て（読み取りごとに別Map、区切りはヌル文字）、テンプレート文字列の手書きを廃止。既存2箇所は `createCachedBranchExists()`（単一の読み取りを包むだけ）を機構へ移して廃止し、`createResolveLatestTags()`（複数API＋ドメイン判定にまたがる解決結果。正しさのためのキャッシュ）は据え置き。`getOrFetchShared()` は残し、`V extends {}` の制約は値を箱に包むことで回避（undefinedを返す読み取りも載せられる）。設計判断は docs/architecture.md「GitLabへの問い合わせのキャッシュは`lib/gitlab/`に列挙し、バッチ単位で1つ持ち回る」節（新しい問い合わせを足すときの判断1〜3と、採らなかった案3件）。機構のテストを5件追加（test/lib/gitlab/batch-cache.test.ts: 同時呼び出しが1回にまとまる／引数が違えば別々／falsyな結果もキャッシュされる／失敗はキャッシュに残さず再試行／別インスタンスは共有しない）。`pnpm check` exit=0、33ファイル345テスト（340→345、既存の減少なし）。

## T-112

**タスク**: `commitFileUpdates()` がコミット前に行っている `getFileContent()` の呼び出しを、不要であることを確認したうえで取り除く。

## 背景

`src/lib/gitlab/gitlab.ts` の `commitFileUpdates()` は、コミットするファイルごとに `getFileContent(projectId, file.valuesPath, baseBranch)` を呼び、結果が `undefined` かどうかで CommitAction を `create` / `update` に振り分けている。

しかしこのパイプラインでは `files` に入るのは `toFileUpdates()`（`src/steps/build-plans/sub-steps/shared/values-yaml-draft.ts`）が返す `modified` なエントリだけで、`modified` は `writeValuesYamlDraft()` を通ったものにしか付かない。そして `writeValuesYamlDraft()` が呼ばれる前には必ず `readValuesYamlDraft()` が同じ `projectId` + `valuesPath` + `mrTargetBranch` の取得に成功している（取得できなければ例外をスローする）。つまり**判定結果は常に `update` で、MRごとにファイル数ぶんのAPI呼び出しが無駄になっている**。

## やること

1. 上の不変条件を実際にコードで確認する（`files` の生成経路が本当に `toFileUpdates()` 経由に限られるか）。**確認して崩れていた場合は、取り除かずに理由を `evidence` に書いて終わる**。
2. 成り立つなら、`getFileContent()` の呼び出しと `create`/`update` の分岐を取り除き、`action` を `update` 固定にする。関数のJSDoc（「ファイルごとの action（create/update）は、常に `baseBranch` に該当ファイルが既に存在するかで判定する」）も、実際の前提に合わせて書き直す。
3. この不変条件は `lib/gitlab/` からは見えない（呼び出し元の性質に依存する）ため、**なぜ `update` 固定でよいかをコメントで残す**（`docs/coding-standards.md`「コメントはコードから読み取れないことだけを書く」に従い、前提・制約として書く）。
4. 既存テストで `create` 側の分岐を検証しているものがあれば、削除の是非を `docs/coding-standards.md`「テスト」節の基準で判断する。

## 完了条件

- 取り除いた（または取り除かなかった理由を示した）こと。
- `pnpm check` を通すこと。

**dependencies**: T-111

**difficulty**: sonnet

**evidence**: 不変条件を確認: `commitFileUpdates()` の `src` 内の呼び出し元は apply-updates.ts の1箇所だけで、渡す `files` は `ChartUpdateTarget.files`＝build-plans.ts の `toFileUpdates(draft)` のみが構築する。`toFileUpdates()` は `modified: true` だけを返し、`modified: true` は `writeValuesYamlDraft()` 経由でしか作られず、その2つの呼び出し（stage-image-tag-updates.ts / stage-helm-target-branch-updates.ts）はどちらも直前に同じ `valuesPath` で `readValuesYamlDraft()` が成功している（読めなければ例外）。`projectId`/`baseBranch` も読み込み時と同じ `chart.projectId`/`chart.mrTargetBranch`。よって判定は常に update。`getFileContent()` の呼び出しと create/update の分岐を除去し、`CommitAction` の action を `"update"` に絞り、JSDocを実際の前提に書き直した（前提は lib/gitlab/ からは見えないため理由もそこに残した）。テストは create 側を検証していた2件のうち1件（actionの判定基準）を削除し、混在ケースの1件は「複数ファイルを1回のコミットにまとめ、いずれも update として送る」に書き換えて残した（`RepositoryFiles.show` のモックも不要になったので撤去）。docs/architecture.md「コミット処理だけは`lib/gitlab/`がドメイン型を知っている」節を更新。`pnpm check` exit=0、33ファイル344テスト（345→344、削除1件ぶん）。

## T-113

**タスク**: `getLatestPipelineForRef()` の結果をバッチ全体でキャッシュし、同じappが複数clientに登録されているときの重複問い合わせをなくす。

## 背景

`collectMrEntries()`（`src/steps/apply-updates/sub-steps/collect-mr-entries.ts`）は、更新のある app ごとに `getLatestPipelineForRef(gitlab, plan.app.projectId, plan.latestTag.name)` を呼ぶ。この関数は chartAndApps（＝client）単位で呼ばれるため、**同じappが複数のclientに登録されていると、同じ `projectId` + 同じタグ名に対してclientの数だけパイプライン問い合わせが走る**。

最新タグの解決側は同じ理由で既に対策済み（`createResolveLatestTags()`、`src/steps/build-plans/sub-steps/resolve-latest-tags.ts`）だが、パイプライン側は残っている。値はバッチ実行中に変わらない読み取りなのでキャッシュして安全。

## やること

1. T-111 で決めた機構に載せて、`projectId` + タグ名をキーにバッチ全体でキャッシュする。キャッシュの寿命はバッチ1回ぶん。
2. `mapWithConcurrency` により chartAndApps は並列実行されるため、**同時に来た同じキーの問い合わせも1回にまとめる**こと（`getOrFetchShared()` が持つ性質）。
3. `getLatestPipelineForRef()` は 404/403 を「パイプライン無し」として `undefined` を返す。この `undefined` もキャッシュ対象に含めるかを決める（`getOrFetchShared()` の型 `V extends {}` は `undefined` を弾くので、そのままでは載らない。載せないなら、パイプラインが無いプロジェクトでは毎回問い合わせが走ることを受け入れる判断として書き残す）。
4. キャッシュが効いていることを検証するテストを追加する（同じappを複数clientに持つ入力で、呼び出し回数が1回になること）。既存の `resolve-latest-tags` のキャッシュテストが前例になる。

## 完了条件

- 同じ `projectId` + タグ名の問い合わせが1回に収束することをテストで示すこと。
- `pnpm check` を通すこと。

**dependencies**: T-111

**difficulty**: sonnet

**evidence**: T-111 の `GitlabBatchCache` に `getLatestPipelineForRef`（キーは projectId + タグ名）を足し、`collectMrEntries()` は生の関数の代わりにこれを呼ぶ。キャッシュは `runProcess()` が作る1つを `applyUpdates()` → `applyUpdate()` → `collectMrEntries()` と渡すのでバッチ全体で共有され、`mapWithConcurrency` で同時に来た同じキーも `getOrFetchShared()` により1回にまとまる。`undefined`（パイプライン無し）もキャッシュ対象に含めた（機構側が値を箱に包むので載せられる。パイプラインが無いプロジェクトでも1回に収束する）。厳密には自作タグに後からパイプラインが現れうるが、MR本文への参考情報でしかなく同じタグにclientごとに違う答えを載せるほうが困るため載せる判断にし、理由をメンバーのJSDocと docs/architecture.md のキャッシュの節に書いた。テスト1件追加（collect-mr-entries.test.ts「同じappが複数clientに登録されていても、パイプラインの問い合わせは1回に収束する」= 同じキャッシュで2回呼んで `getLatestPipelineForRef` が1回）。`pnpm check` exit=0、33ファイル345テスト（344→345）。

## T-114

**タスク**: プロジェクトのweb URL解決（`getProjectWebUrl()`）をバッチ全体でキャッシュする。

## 背景

`getProjectWebUrls()`（`src/lib/gitlab/gitlab.ts`）は `new Set` で `projectId` の重複を除いているが、その重複排除は**1回の呼び出しの中だけ**に閉じている。呼び出し元の `collectMrEntries()`（`src/steps/apply-updates/sub-steps/collect-mr-entries.ts`）は chartAndApps（＝client）単位で呼ばれるため、**同じappが複数のclientに登録されていると `Projects.show` がclientの数だけ実行される**。

web URL はバッチ実行中に変わらない値なので、`projectId` をキーにバッチ全体で持ち回れる。

## やること

1. T-111 で決めた機構に載せて、`projectId` をキーにバッチ全体でキャッシュする。
2. 機構の置き場所によっては `getProjectWebUrls()` の `new Set` による重複排除が不要になる（キャッシュが同じ役割を担うため）。二重に持たないよう、どちらを残すか決める。
3. `mapWithConcurrency` により chartAndApps は並列実行されるため、同時に来た同じキーの問い合わせも1回にまとめること。
4. キャッシュが効いていることを検証するテストを追加する（同じappを複数clientに持つ入力で、呼び出し回数が1回になること）。

## 完了条件

- 同じ `projectId` の web URL 解決が1回に収束することをテストで示すこと。
- `pnpm check` を通すこと。

**dependencies**: T-111

**difficulty**: sonnet

**evidence**: `GitlabBatchCache` に `getProjectWebUrl`（キーは projectId）を足し、`collectMrEntries()` は plan ごとにこれを呼ぶ形にした。二重の重複排除を避けるため `getProjectWebUrls()`（`new Set` による一意化は1回の呼び出しの中だけに閉じていた）は廃止し、単数の `getProjectWebUrl()` を公開してキャッシュ側に一本化。Mapを経由しなくなったので `resolveWebUrl()` と「依頼したprojectIdはすべて解決済み」の前提チェックも不要になり削除した（副産物として、web URL解決の失敗も `withAppContext()` の内側に入りアプリ名が付くようになった）。`mapWithConcurrency` で同時に来た同じキーは `getOrFetchShared()` により1回にまとまる。テストは既存の収束テストを拡張して 「同じappが複数clientに登録されていても、web URLとパイプラインの問い合わせは1回に収束する」で `getProjectWebUrl` が1回であることを検証（同じキャッシュで collectMrEntries を2回呼ぶ）。前提チェックのテスト1件は対象コードごと削除、gitlab.test.ts の重複排除テストは `getProjectWebUrl` の正常系テストに置き換え。`pnpm check` exit=0、33ファイル344テスト（345→344）。

## T-115

**タスク**: values.yaml の**GitLabからの読み込み**をバッチ全体でキャッシュする（書き換え中の下書きは今のとおり chartAndApps 単位に保つ）。

## 背景

`readValuesYamlDraft()`（`src/steps/build-plans/sub-steps/shared/values-yaml-draft.ts`）は下書き（`ValuesYamlDraft`）に無いときだけ `getFileContent()` を呼ぶが、**下書きの寿命は chartAndApps 1件ぶん**（`buildPlan()` が毎回新しく作る）。同じchartディレクトリ配下の複数の tenant/client は同じ `chart.projectId` を共有するので、それらが同じ `valuesPath` を指す設定になっていると、**同じファイルを client の数だけ読み直す**。

## 設計上の注意（ここを取り違えると壊れる）

下書きには「GitLabから読んだだけ（`modified: false`）」と「このchartAndAppsが書き換えた（`modified: true`）」の2種類が乗っている。**共有してよいのは前者だけ**で、書き換え後の内容を別のclientに見せてはいけない（clientごとに別のMR・別のブランチを作るため）。キャッシュのキーは `projectId` + `valuesPath` + `ref`（＝`chart.mrTargetBranch`）で、値は**GitLab上の元の内容**。`cacheValuesYamlDraft()` と `writeValuesYamlDraft()` で入口を分けてある既存の作りが、この区別をそのまま使える形になっているはず。

## やること

1. まず、**同じchart配下の複数clientが同じ `valuesPath` を指す構成が実際に起こり得るか**を `config-test/` と `docs/requirements.md`・`config/README.md` で確認する。起こり得ないなら、このタスクは実装せずその根拠を `evidence` に書いて閉じる（`passes` は true でよい）。
2. 起こり得るなら、T-111 で決めた機構に載せて読み込みだけをバッチ全体で共有する。書き換え後の内容が別のchartAndAppsへ漏れないことを保証する。
3. **漏れないことを検証するテストを追加する**（同じ `valuesPath` を指す2つのclientで、片方の書き換えがもう片方の読み取り結果に現れないこと）。これは性能ではなく正しさのテストなので必ず入れる。
4. T-112 の対象（`commitFileUpdates()` 内の `getFileContent()`）とキーが一致するため、機構の置き場所によってはそちらもキャッシュに乗る。T-112 が先に済んでいれば呼び出し自体が消えているので、重複して考えないこと。

## 完了条件

- 実装したなら、書き換えの漏れが無いことをテストで示すこと。見送ったなら、その根拠を示すこと。
- `pnpm check` を通すこと。

**dependencies**: T-111, T-112

**difficulty**: sonnet

**evidence**: 起こり得ると確認したうえで実装した（`docs/requirements.md` 4.2節に「同じ values.yaml を異なるテナント/クライアントのアプリが共有している場合」が**既知の制限**として明記されており、`validateNoDuplicateTargets()` の重複検証も1つのclient内に閉じていてclient間は見ていない。`config-test/tenant1/client1` も `charts/anchor-app/values.yaml` という共有名のパスを指す）。`GitlabBatchCache` に `getFileContent`（キーは projectId + valuesPath + ref）を足し、`readValuesYamlDraft()` の「下書きに無いときだけGitLabから読む」経路をこれに差し替えた。下書き（`ValuesYamlDraft`）は今のとおり chartAndApps 単位のまま。**キャッシュが返すのは常にGitLab上の元の内容**で、書き換え後の内容は `writeValuesYamlDraft()` が下書きにしか積まないため漏れは構造的に起きない（キャッシュを lib/gitlab/ の読み取り単位に置いたT-111 の形のおかげ）。`ValuesYamlSource` は `gitlab` の代わりに `gitlabCache` を持つ。T-112 で `commitFileUpdates()` 内の `getFileContent()` は既に消えているので重複はない。テスト1件追加（build-plans.test.ts「同じvalues.yamlを指す複数clientでは読み込みを1回にまとめ、片方の書き換えを他方に見せない」= 同じchart.projectId・同じvaluesPathの別アンカーを2clientが書き換え、`getFileContent` は1回、各clientの files は自分の書き換えだけを含む）。`pnpm check` exit=0、33ファイル345テスト（344→345）。

## T-116

**タスク**: dry-run の分岐の持ち方を再考し、分離できるなら分離する。できないなら現状維持の理由を残す。

## 背景

`dryRun` は `src/lib/env.ts` の `loadEnvConfig()` が `DRY_RUN === "true"` から作る `boolean` で、そこから**引数として4段バケツリレーされている**（`run()` → `runProcess()` → `buildPlans()` → `buildPlan()` / `createResolveLatestTags()` → `resolveLatestTag()`）。

実際に振る舞いを変えている分岐は**2箇所だけ**:

1. `src/steps/build-plans/build-plans.ts` の `buildPlan()`: 差分があっても `dryRun` なら `SKIPPED`（`reason: "dry_run"`）としてログに出し、`toApply` に載せない。結果として `applyUpdates()`（コミット・MR作成）へ渡らない
2. `src/steps/build-plans/sub-steps/resolve-latest-tags.ts` の `resolveLatestTag()`: `if (!dryRun)` で `createTag()` の呼び出しだけを抑止する。タグ名は作成予定のものをそのまま使い、`create_tag` ログには `dryRun` フィールドを載せる

つまり「ところどころにある」ように見えるのは**分岐の数ではなく引数の貫通**で、`dryRun` を受け取るだけで使わない関数が経路上にある。

## 解くべき論点

1. **そもそも分離すべきか。** 分岐が2箇所しかないことをどう評価するか。「書き込みをするかしないか」という1つの関心事が2箇所に散っていることを問題と見るか、2箇所なら追える範囲と見るか。**分離しないという結論も正解になりうる**
2. **分離するとしてどの形か。** 検討する候補（他にあれば足す）:
   - (a) **書き込み側にno-op実装を挿す**。`GitlabBatchCache`（読み取り）と対になる「書き込み」の層を作り、`dryRun` のときは `createTag` / `commitFileUpdates` / `createMergeRequest` を実行せずログだけ出す実装に差し替える。`dryRun` の判定は `runProcess()` の1箇所に閉じる。ただし `buildPlan()` の「dryRunならSKIPPEDに計上する」は結果集計の話なので、これだけでは消えない
   - (b) **`buildPlan()` 側の分岐を `main.ts` へ引き上げる**。`dryRun` なら `applyUpdates()` を呼ばない、で済むか。現状は `SKIPPED` として `summary` に計上しログも出しているので、**結果の集計とログの出方が変わらないか**を確かめる必要がある
   - (c) 現状維持。バケツリレーだけ減らす（例: `dryRun` を使わない中間関数から引数を落とす）小さな改善に留める
3. **`dryRun` の意味を「書き込みをしない」に一本化できるか。** 今は「タグを作らない」（=(2)）と「MRを作らない」（=(1)）の2つが別々の場所で実現されている。要件上どちらも `DRY_RUN` の効果として同じ意味か、`docs/requirements.md` で確かめる
4. **テストへの影響。** `dryRun: true` を通しているテスト（`build-plans.test.ts` の dryRun ケース、`resolve-latest-tags.test.ts`）が、分離後も同じ振る舞いを固定できるか

## やること

1. 上の論点1〜4を、`docs/requirements.md` の dry-run に関する記述と現在のコードを突き合わせて判断する。
2. **分離しないと決めたなら、実装を変えずにその理由を `docs/architecture.md` の「設計判断」に1節として書いて閉じる**（`evidence` にも根拠を書く）。「分岐が2箇所しかない」「分離すると別の間接層が増える」といった判断材料を、次に同じことを考える人が読める形にする。
3. 分離すると決めたなら実装する。`dryRun` の判定箇所が減ったこと（何箇所から何箇所になったか）を `evidence` に数で示す。
4. どちらの結論でも、**`dryRun` を受け取るだけで使っていない関数があればその引数は落とす**。

## 完了条件

- 結論（分離する / しない）と、その根拠が `docs/architecture.md` に節として書かれていること。「キレイに」のような読み手によって結論が変わる語を使わない。
- `DRY_RUN=true` のときに **GitLabへの書き込みAPI（`Tags.create` / `Commits.create` / `MergeRequests.create` / `Branches.remove`）が1つも呼ばれない**ことが、テストで示されていること（現状の振る舞いが変わらないことの確認を兼ねる）。
- `pnpm check` を通すこと（既存345テストが減っていないこと。テストを消す場合は `docs/coding-standards.md`「消すかどうか」の手続きを踏む）。

## 注意

- **方針決めそのものなので、サブエージェントに委譲せず、ユーザーがいるセッションで扱う**（`docs/workflow.md`「委譲しないケース」）。`/loop` の自動進行には載せない。
- 実装が大きくなると分かったら、この場で押し切らず後続タスクを登録して分ける。
- `docs/requirements.md` の dry-run の要件そのものは変えない（変えたくなったらユーザーに確認する）。

**difficulty**: opus

**evidence**: 分離しない判断（ユーザー確認済み、2026-09-07）。`dryRun` を見ているのは2箇所だけで、`resolve-latest-tags.ts` は純粋な書き込み抑止、`build-plans.ts` の `buildPlan()` はdry-runの成果物そのもの（更新予定のログ＋SKIPPED計上）で関心事が違う。no-op層の案は (a) `applyUpdate()` が最後まで走って `result: "CREATED"` を返し summary が嘘になる (b) 「書き込み関数に到達しない」現状より「呼ぶが末端で無効化」のほうが誤って書く余地が大きい、の2点で不採用。`main.ts` へ引き上げる案も、ログ整形を持つことになり「薄いレイヤー」でなくなる／`buildLogContext()` の公開が要るため不採用。`dryRun` を受け取るだけで使っていない関数は無く（`buildPlans()` は両方に渡す）引数の貫通も減らせない。代わりに `test/main.dry-run.test.ts` を追加し、**gitbeakerの境界**（`@gitbeaker/rest` の `Gitlab`）でモックして `DRY_RUN=true` の実行で `Tags.create`/`Branches.remove`/`Commits.create`/`MergeRequests.create` が0回であることを固定した（ラッパ関数の列挙ではなくAPI境界なので、新しい書き込みを足して考え忘れても落ちる）。同じ入力で `DRY_RUN=false` なら書き込みが起きることも並べて固定し素通りを防止。`resolve-latest-tags.ts` の `if (!dryRun)` を一時的に外す変異で当該テストが落ちることを実測。判断は docs/architecture.md「dry-runは分岐を集約せず、書き込みに到達しないことをテストで守る」節が正典（新しい書き込みを足すときの確認手順も記載）。`pnpm check` exit=0、34ファイル348テスト（345→348）。

## T-117

**タスク**: `async`/`await` と `.then()`/`.catch()` の使い分けを設計思想として確定させ、`docs/coding-standards.md` に書く。T-118 の前段。

## 背景

現在 `src/` で `.then()` / `.catch()` を使っているのは次の5箇所で、残りはすべて `async`/`await`。

- `src/index.ts:9-15`: `Promise.resolve().then(() => run(loadEnvConfig())).then(...).catch(...)` — 起動時の環境変数読み込みの失敗も同じ `catch` で拾うために、あえてこの形にしてある（`docs/history/tasks-archive.md` に経緯あり）
- `src/utils/sequential.ts:17`: `items.reduce((accPromise, item) => accPromise.then((acc) => fn(acc, item)), seed)` — 配列を逐次に畳む実装そのもの
- `src/utils/cache.ts:18`: `fetch().catch((err) => { cache.delete(key); throw err })` — 失敗した Promise をキャッシュから外して再スローする
- `src/steps/shared/step-outcome.ts:37`: `fn().catch((err) => rethrowWithAppContext(err, projectName))`
- `src/steps/shared/step-outcome.ts:54`: `fn(logContext).catch((err) => settle(settleAsError(err, logContext)))`

`scripts/smoke/smoke-fixture.ts:128` にも1箇所ある（`show(...).then(...)`）。

`docs/coding-standards.md` にはこの点の規約が無く、**どちらで書くべきかが読み手の判断に委ねられている**。上の5箇所はいずれも「`try`/`catch` で書くと `steps/` に `try`/`catch` を書かない規約（`docs/coding-standards.md`「エラーハンドリング」）と衝突する」「Promiseを値として畳む処理そのもの」といった事情があるように見えるが、**それが明文化されていない**。

## 解くべき論点

1. **どの立場を採るか**: (a) `async`/`await` に統一（`.then`/`.catch` は禁止）、(b) 使い分けを条件で決める、(c) どちらでもよい（規約にしない）。このリポジトリは「置き場所の判断基準を言語化する」ことを重視しているので、(c) は選びにくいはず
2. **(b) を採る場合、条件をどう言語化するか。** 上の5箇所を全部説明できる条件でなければ意味が無い。候補の観点:
   - `try`/`catch` を書かずにエラーを**値に変換して返す**（`step-outcome.ts` の2つ、`cache.ts`）。`steps/` に `try`/`catch` を書かない規約と直接つながる
   - Promise を**データとして扱う**（`sequential.ts` の reduce、`cache.ts` が Promise 自体をキャッシュする）
   - `await` できない文脈（トップレベル、`index.ts` の起動チェーン）
3. **`utils/` と `steps/` と `lib/` で基準を変えるか**、`src/` 全体で1つにするか
4. **`scripts/` にも同じ規約を適用するか**（`docs/coding-standards.md` の他のルールがスクリプトを対象にしているかを確かめる）
5. **書く場所**。`docs/coding-standards.md` の「エラーハンドリング」節に足すか、新しい節を立てるか。既存の「`steps/` に `try`/`catch` を書かない」との関係が読み取れる位置にする

## やること

1. 上の5箇所（＋`scripts/` の1箇所）を1つずつ読み、**なぜ今その形なのか**を言葉にする。ここで「実は `await` で書ける／書いたほうが読みやすい」ものが見つかったら、それも記録する（修正は T-118）。
2. 論点1〜5を決めて `docs/coding-standards.md` に書く。**採らなかった立場とその理由も書く**（このリポジトリの他の規約と同じ粒度で）。
3. 決めた方針に照らして、**現状のどの箇所が方針から外れているか**を洗い出し、T-118 の `task` 本文に具体的なファイル名・行の一覧として書き込む（T-118 は登録済みなので本文を更新する）。**外れている箇所が1つも無ければ、その旨を T-118 の本文に書き、T-118 は「確認のみで実装なし」で閉じられるようにする**。

## 完了条件

- `docs/coding-standards.md` に方針が書かれ、**上の5箇所それぞれがその方針で説明できる**こと（節の中で個別に触れるか、条件が5箇所すべてを覆っていることを `evidence` で示す）。
- 「統一する」と決めた場合も「使い分ける」と決めた場合も、**判断が読み手によって割れない言葉**で書くこと。「適切に」「必要に応じて」を使わない。
- T-118 の `task` 本文が、この結論に沿った具体的な修正対象の一覧に更新されていること。
- `pnpm check` を通すこと（このタスク自体はドキュメントのみの変更になる想定）。

## 注意

- **方針決めそのものなので、サブエージェントに委譲せず、ユーザーがいるセッションで扱う**（`docs/workflow.md`「委譲しないケース」）。`/loop` の自動進行には載せない。
- **このタスクではコードを変更しない**（変更は T-118）。方針と実装を同じコミットに混ぜない。
- `src/index.ts` の形は過去に意図して変えたもの（環境変数の読み込み失敗も `unhandled_error` として拾うため）。方針が「`await` に統一」に倒れる場合でも、**この振る舞いを壊さない書き方があるかを確かめてから決める**。

**difficulty**: opus

**evidence**: 方針を確定（ユーザー確認済み、2026-09-07）: 「`async`/`await` を既定とし、`.then()`/`.catch()`/`.finally()` はその Promise の結果を待たず Promise 自体を値として扱う（保持する・畳む・変換して返す）ときだけ。同じ式に `await` と `.then()` が並んだら `await` で書き直す」。`docs/coding-standards.md` に「`async`/`await` と `.then()`/`.catch()`」節を新設（「エラーハンドリング」節の直後）。**6箇所すべてをこの1条件で説明できることを確認**: 適合＝`utils/cache.ts`（PromiseをMapに保持）・`utils/sequential.ts`（reduceのアキュムレータを畳む）・`steps/shared/step-outcome.ts` 2箇所（失敗を戻り値に変換して返す）、外れる＝`src/index.ts`（結果を待って exit する制御フロー）・`scripts/smoke/smoke-fixture.ts:128`（`await` と `.then` が同居）。採らなかった立場も併記（全面禁止は `steps/` の try/catch 禁止規約と `const` 規約に正面衝突／規約にしないは実際に smoke-fixture と `withNotFoundFallback()` で書き方がブレていた）。`scripts/` にも適用すると明記。`src/index.ts` は「TLAが使えないから `.then`」ではないことを実測で確認（`type: module` + `module: ESNext` + Node22。try/catch 版で `tsc --noEmit` と `test/index.test.ts` 5件が通ることを確かめて元に戻した）。T-118 の task 本文を、修正対象2件・触らない4箇所・grep での確認手順を含む一覧に更新済み。コード変更なし。`pnpm check` exit=0、34ファイル348テスト。

## T-118

**タスク**: T-117 で確定した `async`/`await` と `.then()`/`.catch()` の方針に従い、既存コードを修正する。

**dependencies**: T-117

## 背景

T-117 で `docs/coding-standards.md` に「`async`/`await` と `.then()`/`.catch()`」節を新設し、方針を確定した:

> `async`/`await` を既定とする。`.then()`/`.catch()`/`.finally()` を使ってよいのは、その Promise の結果を待たず、Promise 自体を値として扱う（保持する・畳む・変換して返す）ときだけ。同じ式に `await` と `.then()` が並んだら `await` で書き直す。

この基準に照らして**方針から外れているのは次の2箇所だけ**。残る `src/utils/cache.ts` / `src/utils/sequential.ts` / `src/steps/shared/step-outcome.ts`（2箇所）は方針に適合しているので**触らない**。

## やること

1. **`src/index.ts`（`Promise.resolve().then(...).then(...).catch(...)`）を top-level await + `try`/`catch` に書き換える。**

   `"type": "module"` + `module: ESNext` + Node 22 なので top-level await が使える。次の形で `tsc --noEmit` と `test/index.test.ts` 5件が通ることは T-117 で実測済み（確認後に元へ戻してある）:

   ```ts
   try {
     const result = await run(loadEnvConfig())
     process.exit(result === "SUCCESS" ? 0 : 1)
   } catch (err: unknown) {
     if (err instanceof FatalError) {
       logger.error({ event: "fatal_error", httpStatus: err.httpStatus, message: err.message })
     } else {
       logger.error({ event: "unhandled_error", message: String(err) })
     }
     process.exit(1)
   }
   ```

   **冒頭の2行のコメント**（「環境変数の読み込みも `then` の中で呼ぶ。`run(loadEnvConfig())` と書くと引数が先に同期評価され、失敗が下の catch に載らず素のスタックトレースになる」）は、`try` が引数の同期評価も覆うので**不要になる。消す**（`docs/coding-standards.md`「コメント」参照）。

2. **`scripts/smoke/smoke-fixture.ts:128` の `await gitlab.RepositoryFiles.show(...).then(() => true, () => false)` を `try`/`catch` に書き換える。**

   `await` と `.then()` が同じ式に並んでいる典型。`src/lib/gitlab/gitlab.ts` の `withNotFoundFallback()` が同じ意図（存在しなければフォールバック）を `try`/`catch` で書いているので、**書き方をそちらに揃える**。`scripts/` は `steps/` ではないので `try`/`catch` を書いてよい。

3. 1箇所ずつ直して `pnpm check` を通す（まとめて直してから落ちると切り分けられない）。
4. 修正後、`src/` と `scripts/` に残る `.then(`/`.catch(` を `grep` で数え、**残ったものが `docs/coding-standards.md` の表に載っている3ファイルだけ**であることを確認する。

## 完了条件

- 上の2箇所を修正したことと、`grep -rn "\.then(\|\.catch(" src scripts` の結果が `src/utils/cache.ts` / `src/utils/sequential.ts` / `src/steps/shared/step-outcome.ts` の**4箇所だけ**になっていることを `evidence` に示すこと。
- `src/index.ts` の振る舞いが変わっていないこと（`test/index.test.ts` の5件が通る。特に「環境変数の読み込みの失敗も `unhandled_error` として記録し終了コード1で終わる」）。
- `pnpm check` を通すこと（既存348テストが減っていないこと。テスト件数を `evidence` に書く）。

## 注意

- **`src/utils/cache.ts` / `src/utils/sequential.ts` / `src/steps/shared/step-outcome.ts` は方針に適合しているので触らない。**
- 振る舞いを変える修正が必要だと分かったら、その場で押し切らず別タスクとして登録する。
- スモークスクリプトの修正は実機実行を伴わない（コードの書き換えのみ）。

**difficulty**: sonnet

**evidence**: `src/index.ts` を top-level await + `try`/`catch` に書き換え（不要になった冒頭コメント2行も削除）、`scripts/smoke/smoke-fixture.ts` の `await ....then(() => true, () => false)` を名前付きヘルパ `fileExists()` の `try`/`catch` に置き換えた。`grep -rn "\.then(|\.catch(" src scripts` の残りは `utils/sequential.ts`・`utils/cache.ts`・`steps/shared/step-outcome.ts`(2) の4箇所のみ。`pnpm check` exit=0（34ファイル348テスト、増減なし）。

## T-119

**タスク**: `develop/test-inventory.md` が今も必要かを判断し、必要な部分だけを残すか、正典を移して削除する。

## 背景

`develop/test-inventory.md`（14KB）は T-104 で作られた「テストの棚卸しの発見リスト」で、当時の31ファイル・337テストにカバレッジ計測を当てた結果。冒頭に「**この文書は発見リストであって、ここに書いたことはまだ実施していない**」とあるが、その後 T-105〜T-107 で削除候補9件・集約候補2件・追加候補4件はすべて実施済みで、「実施結果」節が追記されている。

一方で、**まだ生きている参照が2つある**:

- `docs/coding-standards.md`「足すかどうか」の末尾に「**埋めないと決めた穴は、理由を添えて書き残す**（`develop/test-inventory.md`）」とあり、規約がこのファイルを正典として指している
- `develop/progress.md` の「次にやること」に「「要調査で残す判断にしたもの」「埋めない穴」5件は、判断を変えたくなったらリスト側の理由を先に更新する取り決め」とある

つまり単純に削除はできない。加えて**内容が現在と乖離している箇所がある**（「埋めない穴」の表が `src/steps/build-plans/sub-steps/resolve-latest-tag.ts` を指しているが、このファイルは `resolve-latest-tags.ts` にリネーム済み。計測時点の件数「31ファイル337テスト」も現在は33ファイル345テスト）。

## やること

1. `develop/test-inventory.md` の各節を「今も参照される情報」と「役目を終えた作業記録」に仕分ける。目安:
   - **役目を終えた**: 削除候補9件の表、重複の集約候補2件、追加候補4件、実施結果（すべて T-105〜T-107 で実施済み。経緯は `docs/history/tasks-archive.md` の該当タスクにも残っている）
   - **今も参照される**: 「埋めない穴（5件）」「消さないと決めたもの（3件）」「要調査（1件）」（`docs/coding-standards.md` が指しているのはこれ）
2. 仕分けた結果から置き場所を決める。候補（他にあれば足す）:
   - (a) 生きている3節だけを残してファイルを縮め、役目を終えた部分は `docs/history/` へ移す
   - (b) 生きている3節を `docs/coding-standards.md`「テスト」節の中へ取り込み、ファイル自体は `docs/history/` へ移して `develop/` から消す
   - (c) ファイルごと `docs/history/` へ移し、`docs/coding-standards.md` の参照先をそちらに書き換える
     判断材料は「`develop/` は毎セッション読むファイルの置き場、`docs/history/` は通読しないアーカイブ」という既存の役割分担（`docs/architecture.md`「ディレクトリ構成の勘所」）。
3. 残す情報について、**現在のコードと突き合わせて内容を更新する**（リネーム済みのファイル名、`src/utils/http.ts` の「コード側を直して分岐ごと削除済み」のように既に解決したもの）。**既に解決していて残す意味が無くなった項目は、その旨を書いて落とす。**
4. `docs/coding-standards.md` の参照先と `develop/progress.md` の「次にやること」の記述を、決めた置き場所に合わせて更新する。
5. 移動・削除は `git mv` / `git rm` で行い、履歴を残す。

## 完了条件

- `develop/test-inventory.md` が「残した／縮めた／移した／消した」のどれになったかと、その理由が示されていること。
- **`docs/coding-standards.md` から辿れる「埋めないと決めた穴」の正典が1つだけ存在すること**（参照が切れていない、かつ二重になっていない）。
- 残した記述に、現在のコードに存在しないファイル名・関数名が含まれていないこと。
- `pnpm check` を通すこと（ドキュメントのみの変更でも整形の対象になる）。

## 注意

- **ファイルの削除はユーザーが「不要なら削除をお願い」と許可済み**だが、`docs/coding-standards.md` が指す情報を失わせないこと。情報の移し先を決めてから消す。
- アーカイブへ移す部分は**当時の記述をそのまま**にし、後から書き換えない（`docs/workflow.md`「肥大化したときのアーカイブ」と同じ扱い）。

**difficulty**: sonnet

**evidence**: 案(b)を採用。`develop/test-inventory.md` を `git mv` で `docs/history/test-inventory.md` へ（当時の記述は無編集）、生きていた内容は `docs/coding-standards.md`「テスト」節へ統合（「埋めない穴」は4件の表、「消さないと決めたもの」は「個別の判断（実施済み）」）。`http.ts` の1件はコード側で解決済みのため落とした。表の識別子4つは `grep` で実在確認済み。`pnpm check` exit=0（34ファイル348テスト）。

## T-120

**タスク**: タスクの実行モデルの決め方から「メインセッションのモデル」への従属を外し、**`difficulty` に沿ったモデルのサブエージェントへ依頼する**運用に統一する。

## 背景

現在の正典は `docs/workflow.md`「difficulty に応じたモデルの切り替え方」で、こう書かれている。

> 既定のモデルは `sonnet`（`~/.claude/settings.json` の `model`）。振り分けは**メイン＝Sonnet を基準に決める**
>
> - `sonnet` → メインセッションがそのまま実行する（委譲してもモデルは変わらず、コールドスタートの分だけ損になる）
> - `haiku` / `opus` → Agentツールで `model` を指定して委譲する

つまり振り分けが**メインセッションのモデルが `sonnet` であること**に従属している。ユーザーは `/model` でメインのモデルを普通に切り替えるため、この前提は崩れる。

**実例**: 2026-09-07 のセッションはメインが Opus 5 の状態で `/loop /next-task` を回し、`difficulty: sonnet` の T-112〜T-115 を「メインがそのまま実行」した。ラベルは `sonnet` なのに実行モデルは Opus で、**`difficulty` が実行モデルを表していなかった**。

変えるのは「どのモデルで実行するかの決め方」だけで、**「委譲しないケース」（ユーザーへの確認が必要・会話の文脈に依存する）はモデル選択とは別の軸**（サブエージェントに投げられるかどうか）なので、そのまま残す。

同じ記述が3箇所にある:

- `docs/workflow.md`「difficulty に応じたモデルの切り替え方」（**正典**）
- `.claude/skills/next-task/SKILL.md` 手順4
- `CLAUDE.md`「進捗管理とHandoff」の手順3

## やること

1. `docs/workflow.md`「difficulty に応じたモデルの切り替え方」を書き換える（正典はここ1つ）。
   - **「タスクを実行するときは、`difficulty` に沿ったモデルを指定したサブエージェントに依頼する」に統一する。** メインのモデルが何であるかは判断材料に**しない**
   - 「既定のモデルは `sonnet`。振り分けはメイン＝Sonnet を基準に決める」と「`sonnet` → メインセッションがそのまま実行する」を落とす
   - `sonnet` を委譲しない理由として挙がっている「コールドスタートの分だけ損になる」は、**削るのではなく「一貫性のために受け入れる」と書き換える**（コスト自体は消えないので、判断として残す）
   - **なぜ変えたか**を1〜2文残す（メインのモデルが切り替わると `difficulty` が実行モデルを表さなくなるため）。既定モデルを opus → sonnet に反転させた過去の経緯は履歴に残っているので、ここでは繰り返さない
2. `docs/workflow.md`「difficulty（タスクの難易度）」節に、**`difficulty` がそのまま委譲先モデルの指定になる**ことを1文足す。「判断の重さを表すラベル」という定義自体は変えない。
3. `.claude/skills/next-task/SKILL.md` 手順4と `CLAUDE.md`「進捗管理とHandoff」手順3を、新しい正典に合わせて更新する。**判断材料を二重に書かない**（`CLAUDE.md` は要約と参照だけ）。
4. 「委譲しないケース」の記述は**内容を変えない**。ただし新しい書き方の中で、それが「モデル選択」ではなく「サブエージェントに投げられるか」の話だと読めるようにする。
5. 受け入れの手順（完了報告をそのまま信用せず `pnpm check` の結果で判定し、`evidence` はメイン側で書く）は**変えない**。書き換えの過程で落ちていないことを確認する。

## 完了条件

- `docs/workflow.md` を読んだだけで「1件のタスクをどのモデルで実行するか」が一通りに決まり、その決め方が**メインセッションのモデルに依存しない**こと。「原則として」「適切に」のような、読み手によって結論が変わる語を使わない。
- `grep -rn "メイン\|サブエージェント\|委譲" docs/workflow.md .claude/skills/next-task/SKILL.md CLAUDE.md` の結果を突き合わせ、**3箇所の記述が互いに矛盾しないこと**を示すこと。
- 「委譲しないケース」と受け入れ手順の記述が残っていること。
- `pnpm check` を通すこと（ドキュメントのみの変更でも整形の対象になる）。

## 注意

- **`develop/tasks.json` の既存タスクの `difficulty` は遡って変えない。**
- **方針そのものはユーザーが決めている**（2026-09-07）。是非を蒸し返さず、どう言語化するかだけを決める。
- このタスク自身が `/next-task` の実行ルールを書き換えるので、新ルールは**完了後、次のタスクから**適用する。

**difficulty**: sonnet

**evidence**: `docs/workflow.md`「difficulty に応じたモデルの切り替え方」を「`difficulty` と同じモデルのサブエージェントに必ず委譲する／メインのモデルは判断材料にしない」に書き換え、`.claude/skills/next-task/SKILL.md` 手順4と `CLAUDE.md` 手順3を追随させた。`grep -rn "メイン|サブエージェント|委譲"` で3箇所を突き合わせ、矛盾なしを確認。「委譲しないケース」（モデル選択とは別の軸と明記）と受け入れ手順は残存。`pnpm check` exit=0（34ファイル348テスト）。

## T-121

**タスク**: `EnvConfig.accessToken` を素の `string` からブランド型にする（または、基準に照らして不要ならその根拠を残して閉じる）。

## 背景

`src/lib/env.ts` の `EnvConfig` は8フィールドあり、そのうち `gitlabUrl: GitLabUrl` / `targetChart: ChartDirName | undefined` / `tagFormat: TagFormat` はブランド型なのに、**`accessToken` と `configPath` だけが素の `string`** で、型の付き方が揃っていない（`configPath` は T-122 で扱う）。

`accessToken` の生成は `loadEnv("ACCESS_TOKEN")` の戻り値をそのまま入れているだけで、検証も変換も無い。使い道は `createClient(host: GitLabUrl, token: string)`（`src/lib/gitlab/gitlab.ts`）の第2引数で、呼び出し元は `src/main.ts:44` / `scripts/smoke/smoke-fixture.ts:79` / `scripts/lint/validate-config.ts:50` の3箇所。

**取り違えが型で防げていない実例**: `token` が素の `string` なので、`createClient(env.gitlabUrl, env.gitlabUrl)` のように**第2引数にURLを渡してもコンパイルが通る**（`GitLabUrl` は `string & brand` なので `string` に代入できる）。逆向き（`token` を `host` に渡す）はブランド型が弾く。

## やること

1. `docs/architecture.md`「ブランド型にするのは『同じ`string`の別物と取り違えうる識別子』」の基準に照らして判断する。基準は「その値が別の識別子と**同じ型の式に並ぶ**か」。上の `createClient` の第1・第2引数が該当するかを確かめる。
   **基準に照らして不要と判断したなら、実装を変えずにその根拠を `evidence` に書いて閉じる**（`passes` は true でよい）。
2. ブランド型にすると決めたなら、`src/types/brand.ts` に `AccessToken` と factory `toAccessToken()` を足す（`src/types/types.ts` からの再エクスポートも既存の並びに合わせる）。**`as` を使ってよいのは `brand.ts` だけ**（`docs/coding-standards.md`「`as` キャストを使わない」）。
3. `EnvConfig.accessToken` の型と `createClient()` の第2引数の型を `AccessToken` にし、呼び出し3箇所を通す。
4. **形式の検証を付けるかどうかも決める。** GitLabのアクセストークンは形式が公開仕様として固定されていない（`glpat-` 接頭辞はPersonal Access Tokenの慣習で、Group Access Token やCI変数経由の値では違いうる）。**接頭辞や長さで弾く検証は入れない**方向で検討し、入れないならその理由を factory のJSDocに1行残す。「空でないこと」は既に `loadEnv()` が担保している。
5. **値がログ・エラーメッセージに載っていないことを確認する**（`grep -rn "accessToken" src scripts` の結果を目視）。現在 `run_start` ログには含まれていないので、その状態が保たれていることを確かめる。

## 完了条件

- ブランド型にしたか、しなかったか（＋その根拠）が示されていること。
- ブランド型にした場合、`createClient()` の第2引数に `GitLabUrl` を渡すコードが**型エラーになる**こと。確認方法を `evidence` に書く（例: 一時的にそう書いて `pnpm tsc --noEmit` が落ちることを見る。確認後は元に戻す）。
- `src/` 内で `as` を使っているのが `src/types/brand.ts` だけであること（`grep -rn " as " src` で確認）。
- `pnpm check` を通すこと（既存348テストが減っていないこと。テスト件数を `evidence` に書く）。

## 注意

- **`ACCESS_TOKEN` 環境変数の名前・読み方（`loadEnv`）は変えない。**
- トークンの実値をログ・テストの期待値・エラーメッセージに書かない。テストで使うのは `"test-token"` のようなダミーのみ（既存テストがそうなっている）。
- `configPath` は T-122 の担当。このタスクでは触らない。

**difficulty**: sonnet

**evidence**: ブランド型にした。`src/types/brand.ts` に `AccessToken` と `toAccessToken()` を追加し、`EnvConfig.accessToken` と `createClient()` 第2引数の型を変更（呼び出し3箇所は `env.accessToken` 経由なので無変更）。`src/main.ts` を一時的に `createClient(env.gitlabUrl, env.gitlabUrl)` にすると `TS2345: 'GitLabUrl' is not assignable to parameter of type 'AccessToken'` で落ちることをメイン側でも実測し、`git checkout` で復元済み（`git status` 差分なし・`tsc` clean）。形式検証は入れない（`glpat-` はPATの慣習でGroup Access Token/CI変数では前提にできない）。理由は factory のJSDoc。`pnpm check` exit=0（34ファイル348テスト、増減なし）。

## T-122

**タスク**: `EnvConfig.configPath` の名前を実体に合わせ、値の検証を `loadEnvConfig()` の時点で行う。

## 背景

`src/lib/env.ts` の `EnvConfig.configPath` には2つの問題がある。

**1. 名前から「何の config か」が読み取れない。** 実体は「`config/` 相当の**設定ディレクトリのルートパス**」で、`loadConfig(path)`（`src/lib/config/config.ts`）が `<path>/<chartディレクトリ>/chart.yaml` という2階層固定の構成を走査する起点になる。単一の設定ファイルのパスではなくディレクトリのパスなので、`configPath` という名前は実体より広い。

**2. 検証が `loadEnvConfig()` の時点で行われていない。** 他のフィールドは `env.ts` の中で検証される（`validateGitlabUrl` / `parseConcurrencyLimit` / `parseTagFormat` / `parseTargetClients`）のに、`configPath` だけは `loadOptionalEnv("CONFIG_PATH") ?? DEFAULT_CONFIG_PATH` をそのまま入れている。パストラバーサル検証（`assertSafePath(path, "CONFIG_PATH")`、`src/utils/fs.ts`）は後段の `loadConfig()` の中にあり、**環境変数の検証は `env.ts` に集める**という方針（`docs/coding-standards.md`「環境変数」／`docs/architecture.md`「環境変数はモジュールのトップレベルではなく`loadEnvConfig()`で読む」）と揃っていない。

また、指定したディレクトリが存在しない場合は `listSubdirectories()` の `readdirSync` が生の `ENOENT` を投げるだけで、どの環境変数が原因かが分からない。

## 解くべき論点

1. **`CONFIG_PATH` という環境変数名を変えるか。** 変えると `.env.example` / `README.md`（2箇所の表＋ディレクトリ図）/ `.gitlab-ci.yml`（inputs とジョブ変数）/ `docs/smoke-test.md` / `config/README.md` / `docs/architecture.md` に波及し、**既存のCI設定（pipeline schedule に登録済みの変数）も書き換えが要る**。既定は「**環境変数名は変えない**」（外部インターフェースなので）。変えたくなった場合はユーザーに確認する。
2. **TypeScript側のフィールド名を何にするか。** 候補: `configDirPath` / `configRootPath` / `configDir`。`DEFAULT_CONFIG_PATH`（`src/lib/config/config.ts`）と `loadConfig(path, ...)` の引数名も揃えるか。
3. **検証を `env.ts` に移すか、両方に置くか。** `assertSafePath()` は `loadConfig()` の中にもあり、`loadConfig()` は `scripts/lint/validate-config.ts` からコマンドライン引数のパスで直接呼ばれる（環境変数を経由しない）。**`loadConfig()` 側の検証は消せない。** `env.ts` にも足すと二重になるので、「環境変数由来の値は `env.ts` で、それ以外の入口は `loadConfig()` で」と役割を分けるか、`env.ts` 側だけにするかを決める。
4. **存在チェックを足すか。** 「ディレクトリとして存在すること」を `env.ts` で検証すると、環境変数の検証時点でファイルシステムに触れることになる（今の `env.ts` は `process.env` しか触らない純粋な検証）。足すなら、エラーメッセージに `CONFIG_PATH` と指定値を載せる。足さないなら、生の `ENOENT` のままでよいと判断した理由を残す。

## やること

1. 上の論点1〜4を決める。**論点1は「変えない」が既定**で、変える場合はユーザー確認を挟む。
2. 決めた名前にリネームする（`EnvConfig` のフィールド、`src/main.ts` の参照2箇所、`run_start` ログのキー、関連するJSDoc）。**`run_start` ログのキー名を変える場合は、それがログの互換性を壊すことを `evidence` に明記する。**
3. 検証を論点3・4の結論どおりに実装する。`env.ts` に足す場合は既存の個別パーサ（`parseConcurrencyLimit` 等）と同じ形の関数にし、`docs/coding-standards.md`「関数の並び順」に従って配置する。
4. テストを足す（`test/lib/env.test.ts` に個別パーサのテストが並んでいるので、そこに合わせる）。**検証を足したなら、不正な値で例外になり、メッセージに `CONFIG_PATH` が含まれることを確かめる。**
5. `README.md` の環境変数表に説明の変更が要るか確認する（環境変数名を変えないなら表の行自体は変わらないが、説明文が実体に合っているかを見る）。

## 完了条件

- 決めたフィールド名と、その理由が示されていること。
- **`CONFIG_PATH` に不正な値（パストラバーサル、および論点4で存在チェックを足したなら存在しないパス）を与えたとき、エラーメッセージに `CONFIG_PATH` と与えた値が含まれること**をテストで示すこと。
- `grep -rn "configPath" src scripts test` の結果に、旧名が残っていないこと。
- `pnpm check` を通すこと（既存348テストが減っていないこと。テスト件数を `evidence` に書く）。

## 注意

- **`CONFIG_PATH` 環境変数の名前は、ユーザーの明示的な承認なしに変えない**（CIの pipeline schedule に登録済みの変数のため）。
- `loadConfig()` 側の `assertSafePath()` は、コマンドライン引数から呼ばれる経路があるので**消さない**。
- `accessToken` は T-121 の担当。このタスクでは触らない。

**difficulty**: sonnet

**evidence**: `configPath` → `configDirPath` にリネーム（`DEFAULT_CONFIG_DIR_PATH`・`loadConfig()` の引数名も追随）。`CONFIG_PATH` 環境変数名は変えていない。`env.ts` に `parseConfigDirPath()` を新設し、`assertSafePath()` に加えディレクトリ実在チェックも行う（`loadConfig()` 側はCLI経路のため残置＝意図的な二重検証）。テスト4件追加（34ファイル348→352テスト）。`grep -rn "configPath" src scripts test` は0件。**`run_start` ログのキーが `configPath`→`configDirPath` に変わる（ログの後方互換を壊す）。** `pnpm check` exit=0。

## T-123

**タスク**: `docs/requirements.md` のシナリオに対する自動テストの穴を洗い出し、e2e（シナリオ）テストを足すかどうかの方針を決める。

## 背景

現在のテストは34ファイル348テスト（2026-09-08時点）。**パイプライン全体を通すのは2ファイルだけ**。

- `test/main.test.ts` … `src/lib/gitlab/gitlab.js` と `src/lib/config/config.js` を**モジュール単位でモック**し、`run()` の戻り値（`SUCCESS`/`PARTIAL_FAILURE`）・summary の件数・`createClient`/`loadConfig` への引数・ログイベントの3種を確かめる8件。**MRのタイトル/本文とコミットされる `values.yaml` の中身は見ていない**
- `test/main.dry-run.test.ts` … **gitbeaker（`@gitbeaker/rest`）の境界**でモックし、`DRY_RUN=true` のとき書き込みAPIが0回であることを固定する3件

残りは step / sub-step / lib / utils の単体テストで、いずれも `loadConfig` をモックする。つまり **`config/` のYAML3ファイル（`chart.yaml`/`config.yaml`/`anchors.yaml`）を実際に読んでMRの中身まで通す経路は、実機スモークテスト（`docs/smoke-test.md`、手動・要GitLab）でしか通っていない**。

`docs/requirements.md` 4.1〜4.5 には節ごとにシナリオ（バージョン判定 / 更新ワークフロー / 複数app・chart・client / Helmの向き先ブランチ / 絞り込み実行）が書かれているが、**要件の節と自動テストの対応は誰も突き合わせていない**。

## 解くべき論点

- e2eの入口と出口をどこに取るか。候補: (a) gitbeaker境界モック＋`config-test/` の実ファイルを読む（`main.dry-run.test.ts` の拡張）、(b) `lib/gitlab/` のモジュール境界モック（`main.test.ts` の拡張）、(c) 実GitLab（＝今のスモークテスト。自動化しない）
- **何を守るのか**。単体テストが既に守っている範囲を二重化するだけなら足す価値がない（`docs/coding-standards.md`「テスト」節の追加基準）。守れていないのは「YAMLの実ファイル → MRタイトル/本文/コミット内容」の連結部分
- 要件の節とテストの対応表を作るか（作ると要件変更のたびに更新コストが乗る）
- 実機スモークテスト（`docs/smoke-test.md`）との役割分担。自動e2eを足したらスモークの手順を減らすのか、両方維持するのか

## やること

1. `docs/requirements.md` 4.1〜4.5 の要件と既存テストを突き合わせ、**自動テストで一度も通っていない経路**を列挙する
2. 上の論点を判断し、結論（足す／足さない）と理由を **`docs/architecture.md`「設計判断」か `docs/coding-standards.md`「テスト」節のどちらか1箇所**に節として書く（両方には書かない）
3. 「足す」と判断した場合も、**このタスクでは実装しない**。何をどの境界で何本書くかまで決めて T-124 の本文を更新する
4. 突き合わせた結果「既存テストで足りている」なら、**やらずに理由を `evidence` に書いて閉じる**（T-124 も同時に閉じる）

## 完了条件

- 洗い出しの結果（要件の節 → それを通す自動テストの有無）が判断の根拠として文書に残っている
- 結論と理由が `docs/architecture.md` または `docs/coding-standards.md` の**どちらか1箇所**に節として書かれている
- 「足す」なら T-124 の `task` が具体的な実装指示に更新されている。「足さない」なら T-124 が `status: "done"` / `passes: true` / 理由入りの `evidence` で閉じている
- `pnpm check` が通る

## 注意

- **実GitLabへの書き込みを伴う自動テストは作らない**（`docs/smoke-test.md` の手動手順の領分。CIから走ると本物のMRが増える）
- テストを足す/足さないの基準の正典は `docs/coding-standards.md`「テスト」節。ここと矛盾する結論を出すならその節も直す
- 「埋めない穴」の正典は `docs/coding-standards.md`「テスト」節の「足すかどうか」の表（T-119で統合）。同種の判断が既にあるかを先に見る。当時の調査経緯だけは `docs/history/test-inventory.md` にある
- `/loop /next-task` に載せてよい

**difficulty**: opus

**evidence**: 結論は「足す（ただし要件の節ごとのシナリオテストは作らない）」。要件4.1〜4.5の項目はすべてどこかの単体テストが通しており、穴は項目ではなく連結1箇所（`config/`の実ファイル→`loadConfig()`→3ステップ→コミット内容・MRタイトル・MR本文）に集約されることを突き合わせで確認。正典は `docs/coding-standards.md`「テスト」節の新設「通し（e2e）で守るのは『実ファイル → MRの中身』の連結だけ」（境界=gitbeaker、入口=`config-test/`、実GitLabは使わずスモーク手順も減らさない）。突き合わせ表は `docs/history/test-inventory.md` に日付つきで追記。T-124 の本文を実装指示に更新（`config-test/`の実値と照合済み）。コード変更なし、`pnpm check` exit=0（34ファイル352テスト）。（コミット `373fd08`）

## T-124

**タスク**: `config-test/` の実ファイルを読んで `run()` を通す e2e テストを追加する（T-123 で決めた方針の実装）。

## 背景

`docs/requirements.md` 4.1〜4.5 の各項目は、いずれかの単体テストが既に通している。一方で
**「`config/` のYAML実ファイル → `loadConfig()` → 3ステップ → コミットされる `values.yaml` の
中身・MRタイトル・MR本文」という連結は、自動テストが一度も通していない**（突き合わせた結果は
`docs/history/test-inventory.md`「要件シナリオとの突き合わせ」）。既存の
`test/main.test.ts` / `test/main.dry-run.test.ts` はどちらも `src/lib/config/config.js` を
モックし、`test/helpers.ts` の `makeChartAndApps()` で手組みした値からパイプラインを回している。

方針は `docs/coding-standards.md`「テスト」節の
**「通し（e2e）で守るのは『実ファイル → MRの中身』の連結だけ」が正典**。作業前に必ずこの節を
読むこと（境界・入口・実GitLabを使わない理由が書いてある）。要件の節ごとにシナリオテストを
並べるのは二重化なので**やらない**。

副次的な目的として、gitで管理している唯一の実設定 `config-test/`（実機スモークテストの
フィクスチャ。`docs/smoke-test.md` 参照）を `pnpm check` で守る。現在 `pnpm lint:validate-config`
は既定の `config/` を見るが中身は `README.md` だけで `0 chart groups` のまま通ってしまい、
`config-test/` のスキーマ違反は誰も検知できない。

## やること

`test/main.e2e.test.ts` を新規に1ファイル作り、**3本**のテストを書く。

**境界とモック**（`test/main.dry-run.test.ts` と同じ考え方）:

- `vi.mock("@gitbeaker/rest")` で **gitbeaker の境界**をモックし、`Gitlab` コンストラクタが
  fakeを返すようにする（`main.dry-run.test.ts` の `makeFakeGitlab()` と同じ手口。アロー関数は
  `new` できないので `function () { return gitlab }` を渡す）
- `vi.mock("../src/utils/logger.js", () => ({ logger: { info: vi.fn(), error: vi.fn() } }))`
- **`src/lib/config/config.js` はモックしない**（これがこのファイルの存在理由。`main.test.ts` と
  同居できないのはモックの範囲が違うため。その旨をファイル冒頭コメントに書く）
- `EnvConfig` の `configDirPath` に `"config-test"` を渡す。`dryRun: false`、
  `tagFormat` は既定（`{branch}-build-at-{date}-{time}`）

**`config-test/` の実際の値**（照合済み。テストのfakeはこれに合わせる）:

- chart: `projectId: 86061211` / `mrTargetBranch: main`
- `tenant1/client1`: app `82861978`（`branchToSync: main`）→ `charts/anchor-app/values.yaml` の
  `tenantId1client1AppsVersion`
- `tenant2/client1`: app `82861978` → `charts/smoke-tenant2/client1/values.yaml` の
  `t2c1QaSprintVersion`、app `82861977` → 同ファイルの `t2c1DevelopClientVersion`、
  `helm.branchToSync: release/2026-q1` → 同ファイルの `t2c1HelmTargetBranch`
- `tenant2/client2`: app `82861978` → `charts/smoke-tenant2/client2/values.yaml` の
  `t2c2QaSprintVersion`、app `82861977` → 同ファイルの `t2c2DevelopClientVersion`

**fakeのGitLabが応答すべきもの**:

- `Tags.all(projectId)` … projectIdで分岐させる。**2つのappで状態を変える**:
  - `82861978`（sample-qa-sprint）… 追跡ブランチ `main` のHEADを指すタグが1本あり、その名前が
    `values.yaml` の現在値と**違う**状態（＝更新対象になる。タグ自動作成の経路には入らない）
  - `82861977`（sample-develop-client）… HEADを指すタグの名前が `values.yaml` の現在値と
    **同じ**状態（＝`already_up_to_date` で据え置きになる）
- `Branches.show(projectId, branch)` … 引数で分岐させる。ソースリポジトリの `main` はHEADの
  SHAを返し、chartリポジトリ `86061211` の `release/2026-q1` は存在する扱いにする
  （`helm.branchToSync` の実在検証がここを通る）
- `RepositoryFiles.show(86061211, path, ref)` … `path` で分岐させ、base64の `values.yaml` を返す。
  上の3ファイル分。形式は `variables:\n  - &t2c1QaSprintVersion main-build-at-20251231-000000\n ...`
  のように配列要素にアンカーを付けたもの（`main.dry-run.test.ts` と同じ）
- `MergeRequests.all` → `[]`、`MergeRequests.create` / `Commits.create` / `Tags.create` /
  `Branches.remove` → resolve するだけの `vi.fn()`
- `Projects.show` → `{ web_url: ... }`、`Pipelines.showLatest` → `{ web_url: ... }`

**3本の内容**:

1. **`config-test/` 全件（target未指定）で、client単位に1つずつMRが作られる**
   `run(env)` が `"SUCCESS"` を返し、`MergeRequests.create` が3回
   （`tenant1/client1` / `tenant2/client1` / `tenant2/client2`）呼ばれること。各呼び出しの
   sourceBranch が `feature/yadokari/<tenantId>/<clientId>`、targetBranch が `chart.yaml` の
   `mrTargetBranch`（`main`）であること。MRタイトルに `tenantId/clientId` と件数が入ること。
   本文には実ファイル由来の値（例: `charts/smoke-tenant2/client1/values.yaml` と
   `t2c1QaSprintVersion`）が載ること。
   **本文の書式そのものを網羅的に検証しない**（`build-mr-content.test.ts` の領分。ここで見るのは
   「実ファイルの値がMRまで届いているか」だけ）。
   target未指定にするのは `loadConfig()` が絞り込みをディレクトリ名の時点で行い、絞り込むと
   他clientのYAMLをパースしないため。3client分すべてを必ずパースさせる。

2. **コミットされる `values.yaml` の中身が、実ファイルの設定どおりに書き換わる**
   同じ実行で `Commits.create` に渡された actions を検証する。
   `charts/smoke-tenant2/client1/values.yaml` の content で `t2c1QaSprintVersion` が新しいタグに、
   `t2c1HelmTargetBranch` が `release/2026-q1`（`config.yaml` の `helm.branchToSync`）に
   書き換わっていること。HEAD一致で据え置きになる `t2c1DevelopClientVersion` は
   **元の値のまま**であること。

3. **`TARGET_CLIENTS` 相当の絞り込みで、作られるMRが実際に減る**
   `targetClients` に `tenant2/client2` の1件だけを渡して `run()` すると、
   `MergeRequests.create` が1回だけ呼ばれ、その sourceBranch が
   `feature/yadokari/tenant2/client2` であること。

**モック準備の重複について**: `main.dry-run.test.ts` の `makeFakeGitlab()` と共有できる形に
できるなら `test/helpers.ts` へ寄せる（`docs/coding-standards.md`「消すかどうか」の表の
「同じ `vi.mock` の準備が複数ファイルに重複している」行）。このe2eはprojectId・パスごとに
応答を変える必要があり形が違うので、**寄せられないと判断した場合はその理由を
テストファイルのコメントに1〜2行で書く**（寄せるか寄せないか無言で済ませない）。

## 完了条件

- `test/main.e2e.test.ts` が上の3本を含み、`src/lib/config/config.js` をモックせずに
  `config-test/` の実ファイルを読んで `run()` を通している
- `pnpm check` が通る（着手前は 34ファイル 352テスト。完了後は 35ファイル・355テスト前後になる
  想定。実際の数を `evidence` に書く）
- テストが実GitLabへ一切アクセスしていない（`@gitbeaker/rest` をモックしており、
  `.env` や `GITLAB_URL` / `ACCESS_TOKEN` に依存しない）

## 注意

- **実GitLabへの書き込みを伴う自動テストは作らない**。実在チェック・MR本文のリンク先の
  到達性・GitLab側の応答（`/pipelines/latest` がパイプライン0件のとき404でなく403を返す等）は
  `docs/smoke-test.md` の手動手順の領分で、**スモークの手順は1つも減らさない**
- **`config-test/` の中身を書き換えない**。実機スモークテストのフィクスチャで、GitLab上の
  実プロジェクト（`docs/smoke-test.md` の表）と対応している。テストをフィクスチャに合わせる
- `src/` は原則変更しない。ただし通してみて**実装とテストの食い違い（実バグ）が見つかった場合は
  直す**。その場合は何が食い違っていたかを `evidence` に書く
- 要件の節とテストの対応表を新たに正典へ作らない（`docs/coding-standards.md` の該当節で
  「持たない」と決めてある）。ドキュメントの更新は不要
- 日本語のテスト名は既存ファイルの粒度に合わせる（「〜する」「〜になる」）
- `/loop /next-task` に載せてよい

**difficulty**: sonnet

**evidence**: `test/main.e2e.test.ts` を新設（3件）。`src/lib/config/config.js` をモックせず `config-test/` の実ファイルを読み、gitbeaker境界のfakeで `run()` を通してMR3件・コミット内容・絞り込みを検証。**素通りでないことをメイン側で変異により実測**: (1) `configDirPath` を `config` に変えると3件とも落ちる（実ファイルに依存）、(2) `stageHelmTargetBranchUpdates()` を no-op にすると2件目だけ落ちる（コミット内容の検証が効いている）。どちらも復元済み。`test/helpers.ts` へは寄せない判断（応答をprojectId・パスで分岐させる必要があり形が違う。理由はテストファイル冒頭コメント）。実バグの発見なし。`pnpm check` exit=0（34→35ファイル、352→355テスト）。（コミット `484ca80`）

## T-125

**タスク**: 環境変数にも `config/` にも出ていない「コードに直接書かれた値」を洗い出し、パラメータ化すべきかの判断材料をユーザーに出す。**実装はしない。**

## 背景

利用者が設定できるのは現状2系統。

- **環境変数8つ** — `GITLAB_URL` / `ACCESS_TOKEN` / `CONFIG_PATH` / `CONCURRENCY_LIMIT` / `DRY_RUN` / `TARGET_CHART` / `TARGET_CLIENTS` / `TAG_FORMAT`（正典は `README.md`「設定」章、実装は `src/lib/env.ts` の `loadEnvConfig()`）
- **`config/` のYAML** — projectId・追跡ブランチ・`mrTargetBranch`・`valuesPath`・アンカー名（`docs/requirements.md` 4.4節）

一方で**コードに直接書かれていて利用者が変えられない値**が残っている。ざっと見えているだけでも:

- `src/domain/feature-branch.ts:5` `FEATURE_BRANCH_PREFIX = "feature/yadokari/"`（固定ブランチ名の接頭辞）
- `src/utils/retry.ts` の `maxAttempts = 3` / `baseDelayMs = 1000` / `RETRYABLE_STATUSES = {429,502,503,504}`
- `src/lib/env.ts` `parseConcurrencyLimit()` が課す上限「1〜20の整数」
- `src/steps/apply-updates/sub-steps/build-mr-content.ts` のMRタイトル・本文（Markdownテーブルの列構成）と、それをコミットメッセージへ流用する取り決め（`apply-updates.ts`）
- `src/domain/tag-format.ts` の必須プレースホルダ3種（`{branch}`/`{date}`/`{time}`）と日時のUTC固定

**このリストは出発点であって完全ではない。**

## やること

1. `src/` 全体を走査し、環境変数にも `config/` にも出ていない、**運用で変えたくなりうる値**を列挙する
2. 各項目に次の5点を書く: 現在値 / 位置（`file:line`）/ 変えたくなる場面 / パラメータ化するなら環境変数と `config/` のどちらが妥当か / 変えられるようにしたときの副作用（例: 固定ブランチ接頭辞を可変にすると、`isFeatureBranch()` を使う `scripts/smoke/smoke-fixture.ts` の後片付けが接頭辞を知る必要がある）
3. 結果を `develop/parameterization-candidates.md` に書く
4. `docs/requirements.md`「2.2 対象外とすること」に既に「やらない」と書かれている項目は、その旨を添えて候補から外す

## 完了条件

- `develop/parameterization-candidates.md` が存在し、全項目に上の5点が揃っている
- どう探したか（grepのパターン・見たディレクトリ）が同ファイルに書かれている
- **コードの変更が1行も無い**（`git diff --stat` の対象が `develop/` の追加のみ）
- `pnpm check` が通る

## 注意

- **実装（環境変数の追加）はしない。** 足すかどうかはユーザーが決める
- 出力先を `develop/` にしているのは**ユーザーの判断待ちの作業ファイル**だから。T-119 で `develop/test-inventory.md` を `docs/` 側へ移したのは、あれが「規約に付随する現在の参照情報」に変わっていたからで、判断待ちの作業ファイルを `develop/` に置く運用自体は変えていない
- `/loop /next-task` に載せてよい

**difficulty**: sonnet

**evidence**: `develop/parameterization-candidates.md`（238行）を作成。9項目を「現在値／位置(file:line)／変えたくなる場面／env・configどちらが妥当か／副作用／推奨」で列挙し、探し方（grepパターン4種＋35ファイル目視）も同ファイルに記載。**結論は「積極的に勧める材料は薄い」**（明確に推すのは0件、中立寄りが#1の固定ブランチ接頭辞のみ。#2・#4は `docs/architecture.md` に検討済み・再検討トリガーが既にある）。コード変更0行。メイン側で file:line 4箇所を抜き取り照合し、見出しのタスク番号（規約違反）を除去した。`pnpm check` exit=0（35ファイル355テスト）。（コミット `2c3227c`）

## T-126

**タスク**: `config/` が登録0件のまま運用されている状態の是非を判断し、既定パス `config/` を実際に通す手段を決める。

## 背景

`config/` には `README.md` しか無く、登録は0件。実機検証はすべて `CONFIG_PATH=config-test` で行っており（`docs/smoke-test.md`）、**`CONFIG_PATH` 未指定の既定値 `config/`（`DEFAULT_CONFIG_PATH`、`src/lib/config/config.ts`）を通す経路は実機で一度も通っていない**。

`config/README.md` は「実運用の登録だけを置く。架空の設定例を置くとCIの `validate-config-remote` が必ず失敗する」と定めている。ただし `config-test/` が指す `sinnlosses-group/yadokari-smoke-test-chart` は**実在する**ので、同じ登録を `config/` に置いても `validate-config-remote` は通る。通る代わりに、pipeline schedule の本番実行（`.gitlab-ci.yml` の `update-app-versions`）が毎回スモークテスト用プロジェクトにMRを作ることになる。

指示の後半「必要ならGitLab上で実機テストするための環境を構築してほしい」は**すでに満たされている**（chartリポジトリ + ソースリポジトリ2つ + `scripts/smoke/smoke-fixture.ts` の setup/reset + `docs/smoke-test.md`。2026-09-07に実施して `{"CREATED":2,"SKIPPED":0,"ERROR":0}`）。残っているのは `config/` 側だけ。

## 解くべき論点

- `config/` を空のまま運用してよいか。空だと `validate-config-remote` は検証対象なしでパスし、schedule実行も0件で終わる（＝CIが「通っている」ことを何も保証しない）
- 既定パス `config/` を通す手段。候補: (a) スモークテスト用の登録を `config/` に置く（schedule実行が毎回MRを作る副作用の扱いを決める）/ (b) `config-test/` のままにして、`CONFIG_PATH` 未指定でも同じ結果になることを別の方法（テスト or 一度きりの手動確認）で担保する / (c) ユーザーの実運用chartリポジトリを登録する
- (c) を採るなら、登録に必要な情報の一覧（projectId・追跡ブランチ・`mrTargetBranch`・`valuesPath`・アンカー名）と、いきなり本番にMRを出さないための順序（`DRY_RUN=true` → `TARGET_CLIENTS` で1件だけ → 全件）

## やること

1. 上の論点を判断する。判断材料は `config/README.md`・`.gitlab-ci.yml` の `validate-config-remote` と `update-app-versions`・`docs/requirements.md` 4.4節
2. 結論と理由を `config/README.md`（`config/` の運用の正典）に反映する
3. (c) を採る場合は**ユーザーしか持っていない情報が要るのでそこで止め**、必要な情報の一覧を `evidence` に書いて閉じる。**架空の値で登録しない**
4. 実機での実行が必要になったら、書き込みを伴う手順は実行せず、**コマンドを提示してユーザーに委ねる**

## 完了条件

- 論点3つに対する結論と理由が `config/README.md` に書かれている
- `config/` にファイルを追加した場合、`pnpm lint:validate-config` が通る（`--remote` 版は `.env` が要るので、実行できなければその旨を `evidence` に書く）
- 実行していない手順があれば、何が未実施でなぜかが `evidence` に書かれている
- `pnpm check` が通る

## 注意

- **`config/` への登録は本番の pipeline schedule の対象を変える。実際に登録する前にユーザーの承認を得る**
- 実GitLabへの書き込み（MR作成・タグ作成・ブランチ作成）はユーザー承認が必要。セッションから勝手に実行しない
- **`/loop /next-task` には載せない**（ユーザー確認を伴うため）

**dependencies**: なし

**difficulty**: opus

**evidence**: 論点3つをユーザーとの対話で判断: (1) `config/` は0件のまま運用しない。(2) 既定パスを通す手段は選択肢(a)＝スモークテスト用プロジェクト `yadokari-smoke-test-chart` をそのまま定期実行の対象にする。ただし `config/` と `config-test/` の二重登録は固定ブランチ名 `feature/yadokari/<unitPath>` を奪い合うため（`submitMergeRequest` の削除→再作成とスモークの接頭辞一致削除が互いのMRを壊す）、**ディレクトリを `config/` に一本化**する。(3) 0件を設定エラーにはしない（登録前からCIが赤になり赤に慣れるほうが害が大きい）。**調査で判明**: 既定値 `CONFIG_PATH` 未指定→`"config"` は `test/lib/env.test.ts:199`、`loadConfig()` への受け渡しは `test/main.test.ts:102` で既にテスト済みで、実機未検証なのは「ディレクトリ名が `config` か」の1点のみだった。CIの `validate-config-remote` は位置引数なしのため検証先が空の `config/` で、**検証対象0件で必ず通っていた**。結論と理由は `config/README.md` に反映（3節構成に改稿）。実作業は後続タスクへ分割（一本化＝T-145、実機投入＝T-146）。コード変更0行。

## T-127

**タスク**: `apply-updates` のサブステップ呼び出しの粒度を揃え、`gitlab.ts` を薄いラッパーの役割に戻す。

## 背景

`src/steps/apply-updates/apply-updates.ts` の `applyUpdate()` は4つを順に呼ぶが、**前半2つと後半2つで呼び先の階層が違う**。

- `collectMrEntries()` / `buildMrContent()` … `apply-updates/sub-steps/` のサブステップ
- `commitFileUpdates()` / `createMergeRequest()` … `src/lib/gitlab/gitlab.ts` の関数を直接呼んでいる

つまりstepから見て「サブステップを呼ぶ」と「libを直接呼ぶ」が同じ深さに並んでいる。`build-plans` は同種の粒度ずれを解消済みで（`buildPlan()` はサブステップ3呼び出しだけ）、`apply-updates` だけ揃っていない。

もう一点、`commitFileUpdates()`（`src/lib/gitlab/gitlab.ts:113`）は `branchExists()` → `deleteBranch()` → `Commits.create(..., { startBranch })` という**3種のAPIの手順**を持っており、GitLabの薄いラッパーの粒度を超えている。

**ただしこれは過去に一度判断されている。** `docs/architecture.md`「コミット処理だけは`lib/gitlab/`がドメイン型を知っている」節に「方針をstep側へ引き上げる案は採らない。中身はブランチ確認・削除・コミットという3種のAPI呼び出しの**手順**で、stepに移すとstep側にGitLab APIの呼び出し順が漏れるため」と明記されている。**今回の指示はこの判断を覆すもの**で、覆すかどうかがこのタスクの主題。

## 解くべき論点

- 既存の判断を覆すか。覆すなら「stepにGitLab APIの呼び出し順が漏れる」という当時の理由への答えが要る（**サブステップを新設すれば漏れる先は `apply-updates/sub-steps/` であって `steps/` 直下ではない**、という整理が成り立つか）
- 新しいサブステップの責務と名前。commit + MR作成をまとめるなら、その概念名は何か（`helpers.ts` のような置き場所名は禁止。`docs/architecture.md`「1ファイルにまとめるか分けるか」）
- 固定ブランチの削除・作り直しをサブステップへ移すと、**現在は非公開の `deleteBranch()` を公開する**ことになる。公開範囲が広がるのを許すか
- `commitFileUpdates()` のJSDocにある「action は常に `update`」の根拠（呼び出し元側の不変条件で、`lib/gitlab/` からは見えない）は移動先でどう表現するか
- サブステップ同士は互いをimportしない規約（CLAUDE.md 原則1）に触れないか。共有物が要るなら `sub-steps/shared/`

## やること

1. 上の論点を判断する。**覆さない結論もありうる。** その場合はコードを変えず、理由を `evidence` に書いて閉じ、`docs/architecture.md` の該当節に「再検討したが維持した」ことを1〜2文足す
2. 覆す場合:
   - `src/steps/apply-updates/sub-steps/` に commit + MR作成をまとめたサブステップを新設し、`applyUpdate()` を「3つのサブステップ呼び出し + ログ」だけにする
   - `gitlab.ts` の `commitFileUpdates()` から固定ブランチの削除を外し、GitLab APIの呼び出しに対応する薄い関数へ戻す
   - `docs/architecture.md` の「コミット処理だけは`lib/gitlab/`がドメイン型を知っている」節と「`apply-updates/sub-steps/`」の表を**両方**書き換える（節の見出しも実態に合わせる）
3. テストを追随させる（影響範囲は `test/steps/apply-updates/apply-updates.test.ts` / `test/lib/gitlab/gitlab.test.ts` / `test/main.dry-run.test.ts`）

## 完了条件

- `pnpm check` が通り、テスト件数が減っていない（減ったなら理由を `evidence` に書く）
- **振る舞いが変わらない**: 固定ブランチが既にあれば削除して作り直す順序、コミットメッセージがMRタイトルと同一であること、`DRY_RUN=true` で書き込みAPIが0回であること（`test/main.dry-run.test.ts` が通ることで確認）
- 覆した場合、`grep -n 'gitlab/gitlab.js' src/steps/apply-updates/apply-updates.ts` の結果が型のimportだけになっている
- `docs/architecture.md` の該当2節が現状のコードと一致している

## 注意

- **既存の設計判断を覆すタスクなので、結論はコードだけでなく `docs/architecture.md` に必ず反映する**（正典が古いまま残るのが一番まずい）
- `/loop /next-task` に載せてよい

**difficulty**: opus

**evidence**: 既存の設計判断を**覆した**。`submit-merge-request.ts` を新設して「固定ブランチの削除→作り直し→コミット→MR作成」の呼び出し順をサブステップの内側に置き、`applyUpdate()` をサブステップ3呼び出し＋ログだけにした（`gitlab/gitlab.js` からのimportは型のみ）。`commitFileUpdates()` からブランチ削除を外し `deleteBranch()` を公開（`Branches.remove` 1本ぶんの薄いラッパー）。当時の懸念への答えは「漏れる先は `sub-steps/` の内側で `steps/` 直下ではない」。**振る舞い不変をメイン側で変異により実測**: ブランチ削除の除去→該当1件が落ちる／コミットメッセージをMRタイトルと別物に→該当1件が落ちる（どちらも復元済み）。`docs/architecture.md` は節を見出しごと差し替え＋索引・`apply-updates/sub-steps/` の表も更新。`pnpm check` exit=0（35→36ファイル、355→360テスト）。（コミット `2a62288`）

## T-128

**タスク**: `docs/requirements.md` と `docs/glossary.md` を「テナント/クライアント2階層固定」から「設定ユニット（深さ1〜2）」の仕様へ書き換える。**コードは1行も触らない。**

## 背景

ユーザーからの要件変更: `config/` のディレクトリ階層が `<chartリポジトリ>/<tenantId>/<clientId>/` の2階層で固定されており、テナント分けが不要なchartでもダミーのtenantId/clientIdを作らされる。これを緩めて `<chartリポジトリ>/central/config.yaml` のような1階層も許したい。

**設計判断はユーザーとの対話で確定済み**（原文と選択の経緯は `docs/history/direction.md` の2026-09-08節）:

1. **深さは1〜2に限定**。深さ0（`chart.yaml` と同階層に `config.yaml`）と深さ3以上は不可
2. **入れ子は設定エラーで停止**。`config.yaml` を見つけたらそれ以上降りず、配下にさらに `config.yaml` があれば起動時に例外。理由はGitの ref が D/F conflict を起こすため（`feature/yadokari/central` と `feature/yadokari/central/sub` は同一リポジトリに共存できない）。入れ子禁止はこの制約を完全にカバーする（D/F conflict はパスがプレフィックス関係のときしか起きないため）
3. **後方互換は取らない**。ログの `tenantId`/`clientId` は廃止、環境変数 `TARGET_CLIENTS` も `TARGET_UNITS` へ改名する。チーム内限定ツールなので破壊的変更を許容し、コードに条件分岐を残さないことを優先する
4. **新語彙は「設定ユニット」/ `configUnit`**（`updateUnit` 案は既存の `ChartUpdateTarget`/`ChartUpdateResult`/`AppUpdatePlan` の "Update" と衝突、`scope` 案は `ACCESS_TOKEN` のスコープと衝突するため不採用）
   - 型 `ConfigUnitPath`（値は `"central"` も `"tenant1/client1"` も取る）／フィールド `ChartAndApps.unitPath`／ログ `unitPath`／環境変数 `TARGET_UNITS`／ブランチ `feature/yadokari/<unitPath>`

**現状の記述箇所**（このタスクの対象）:

- `docs/requirements.md` — 3章の用語表42行「テナント / クライアント」、4.2節（89行〜）のブランチ名97行・MRタイトル103行、4.3節（127行〜）の見出し、4.4節（145行〜）特に**237-239行が2階層固定の明文**、4.5節（288行〜）の `TARGET_CLIENTS`
- `docs/glossary.md` — 「テナント / クライアント」エントリ、「固定ブランチ」エントリ（`buildFeatureBranch(tenantId, clientId)`）、「config.yaml / anchors.yaml」エントリ、「Helmの向き先ブランチ」エントリ

## 解くべき論点

- **検証方針の線引きをどう書き直すか。** `docs/requirements.md:97-100` は「`tenantId`/`clientId` にGitLabブランチ名として不正な文字が含まれる場合の追加バリデーションは行わず、ブランチ作成APIのエラーに委ねる」と明記している。今回は深さ（1〜2）と入れ子を**新たに検証する**ので、「何を起動時に検証し、何をAPIエラーに委ねるか」の線引きを書き直す必要がある。文字種の検証は従来どおりしない、が既定
- **`docs/glossary.md` の扱い。** 同ファイルの方針は「表記ゆれは統一・修正はせず『現状こう呼ばれている』事実だけを注記する」だが、今回は語彙そのものを廃止する変更。既存エントリ（「chartリポジトリ / chartAndApps」の「表記ゆれ（解消済み）」）が前例になるので、それに倣うか判断する
- **「設定ユニット」と `ChartAndApps` の関係をどう説明するか。** `ChartAndApps` 型は残る（1設定ユニット分の集約）。用語集で両者の範囲の違いを書き分ける
- 深さ1と深さ2を**同じchartリポジトリ配下に混在させてよいか**を明記する（許す。入れ子でなければブランチ名は衝突しない）

## やること

1. `docs/requirements.md` の3章用語表・4.2・4.3・4.4・4.5を書き換える。237-239行の「2階層固定」は「深さ1〜2・入れ子禁止」に差し替える
2. `docs/glossary.md` の該当エントリを「設定ユニット」に差し替え、今回の経緯を「表記ゆれ（解消済み）」の形で注記する
3. `docs/requirements-grilling.md` は**触らない**（過去のQ&Aログでアーカイブ扱い。27箇所ヒットするが当時の記述のまま残す）
4. 書き換えの過程で「深さ1〜2に限定する理由」がドキュメント上で説明できないと分かった場合は、押し切らずユーザーに確認する

## 完了条件

- `grep -n "tenantId\\|clientId\\|テナント\\|クライアント" docs/requirements.md docs/glossary.md` の結果が0件、または残す判断をした箇所のみでその理由が `evidence` に書かれている
- 次の4点が `docs/requirements.md` に明記されている: (a) 深さ1〜2、深さ0と3以上は不可 (b) 入れ子は設定エラーで即時終了 (c) ブランチ名は `feature/yadokari/<unitPath>` (d) 環境変数は `TARGET_UNITS`
- `git diff --stat` の対象が `docs/requirements.md` と `docs/glossary.md` の2ファイルだけ（コード変更0行）
- `pnpm check` が通る

## 注意

- **このタスクの完了時点では、正典（requirements.md）と実装が食い違う。** それは承知のうえの順序（正典を先に確定させ、T-129/T-130がそれに従う）。`evidence` に「実装はT-129/T-130で追随する」と明記する
- `docs/requirements-grilling.md` はアーカイブ扱いで書き換えない
- `README.md` / `docs/architecture.md` / `docs/smoke-test.md` は触らない（T-129〜T-131が各自の変更と同じコミットで追随する）
- `/loop /next-task` に載せてよい

**difficulty**: opus

**evidence**: `docs/requirements.md` と `docs/glossary.md` の2ファイルのみ変更（`git diff --stat`: 2 files changed, 107 insertions(+), 73 deletions(-)、コード変更0行）。`pnpm check` exit=0（36ファイル360テスト、着手前と同数）。`grep -n "tenantId\\|clientId\\|テナント\\|クライアント" docs/requirements.md docs/glossary.md` は requirements.md で0件、glossary.md は「設定ユニット」エントリの「表記ゆれ（解消済み）」注記1件のみを意図的に残した（旧称を引けるようにする記録。既存の「chartリポジトリ / chartAndApps」エントリと同形式）。requirements.md に (a) 深さ1〜2・深さ1と2の混在可・深さ0と3以上は設定エラー（4.4節 256-264行）、(b) 入れ子は設定エラーで即時終了・理由はGitのref の directory/file conflict（4.4節 265-270行）、(c) ブランチ名 `feature/yadokari/<unitPath>`（4.2節 97-100行）、(d) 環境変数 `TARGET_UNITS`（4.5節 322-333行）の4点を明記。あわせて4.2節の検証方針を「起動時に検証するのは `unitPath` の形（深さ・入れ子）だけ、セグメントの文字種はブランチ作成APIのエラーに委ねる」という線引きに書き直し、4.3節に「設定エラーは該当分だけERRORの方針の対象外で全体を即時終了する」を追記。完了条件はメイン側で全項目を再実測して確認済み。**この時点では正典と実装が食い違う**（承知のうえの順序）。コード側の語彙置換はT-129、走査の深さ拡張と入れ子検出はT-130で追随する。`README.md` / `docs/architecture.md` / `docs/smoke-test.md` / `docs/coding-standards.md` / `docs/requirements-grilling.md` は対象外のため未変更（`git status` で無傷を確認）。**未修正の綻び**: requirements.md 111行のMRタイトル書式が `${N} app image tag(s)` のままで実装（`(image tag N, helm branch N)`）と食い違う。T-128以前からある不一致で範囲外のため触っていない。（コミット `4ab3398`）

## T-129

**タスク**: `tenantId`/`clientId` の2値を `ConfigUnitPath`（`unitPath`）1本に置き換える。**ディレクトリ階層は2階層固定のまま変えず、振る舞いを1つも変えない。**

## 背景

T-128 で `docs/requirements.md` / `docs/glossary.md` の仕様を「設定ユニット（`ConfigUnitPath`）」へ書き換え済み。このタスクはその語彙をコードへ反映するところまでを担当し、**階層を広げるのはT-130**が担当する。振る舞いを変える変更と語彙を変える変更を分けてあるので、このタスクは既存テストが全部通ることで守られる。

調査済みの事実として、**2階層であることに依存しているのは次の箇所だけ**。パイプライン本体（`build-plans` / `apply-updates` / `lib/helm.ts` / `lib/gitlab/gitlab.ts`）は tenant/client を一切見ておらず、`ChartAndApps` を透過的に運ぶだけなので影響しない。

| ファイル                                                      | 現状                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/types/brand.ts`                                          | `TenantId` / `ClientId` ブランド型                                                               |
| `src/types/types.ts`                                          | `TargetClient`（2フィールド）、`ChartAndApps.tenantId`/`.clientId`                               |
| `src/domain/client-ref.ts`                                    | `formatClientRef()` / `parseClientRef()`                                                         |
| `src/domain/feature-branch.ts:12`                             | `buildFeatureBranch(tenantId, clientId)`                                                         |
| `src/lib/config/config.ts`                                    | `ConfigTarget.clients`、`clientDirExists()`（92-100行）、`listClientChartAndApps()`（104-134行） |
| `src/lib/config/chart-and-apps.ts`                            | `loadChartAndApps()` のシグネチャ（33-34行）と戻り値（74-75行）                                  |
| `src/lib/env.ts:80-127`                                       | `parseTargetClients()` / `parseTargetClientEntry()`、`EnvConfig.targetClients`                   |
| `src/steps/shared/step-outcome.ts:99-100`                     | `buildLogContext()` のログフィールド                                                             |
| `src/steps/apply-updates/sub-steps/build-mr-content.ts:10-30` | MRタイトル                                                                                       |
| `src/steps/filter-targets/filter-targets.ts:47`               | `buildFeatureBranch()` の呼び出し                                                                |
| `src/steps/apply-updates/apply-updates.ts:42-46`              | 分割代入と2つの呼び出し                                                                          |
| `scripts/lint/verify-config/verify-config.ts:57,77`           | エラーの位置表示                                                                                 |

テスト側は17ファイルが `tenantId`/`clientId` を参照しており、`test/helpers.ts` の `makeChartAndApps()` と `test/lib/config/fixture.ts` が土台になっている。

**ブランチ名は文字列として変わらない。** `feature/yadokari/<unitPath>` に `"tenant1/client1"` を入れると従来と完全に一致するため、GitLab上の既存のオープンMR・固定ブランチは迷子にならない。これは意図した性質なのでテストで固定する。

## 解くべき論点

- **`src/domain/client-ref.ts` の後継。** `config-unit.ts` に改名し、`formatClientRef()`（2値→文字列）は不要になる。`parseClientRef()` は「相対パスの検証」（`TARGET_UNITS` の各エントリを `ConfigUnitPath` にする入口）として残る。**このタスクの時点では深さ2のみ受理**し、深さ1〜2への緩和はT-130。ファイル自体を残すかどうかも含めて判断する（`buildFeatureBranch()` が文字列連結するだけなら、ドメインの取り決めとして残す価値があるか）
- **`TargetClient` 型を消せるか。** 中身が `ConfigUnitPath` 1つになるなら型エイリアスは不要（`docs/architecture.md`「用途別の型エイリアスを作らない」）。`ConfigTarget.clients: readonly TargetClient[]` は `readonly ConfigUnitPath[]` になるはず。フィールド名も `units` に揃える
- **ログのキー変更は後方互換を壊す。** `update_chart` イベントの `tenantId`/`clientId` が `unitPath` 1本になる。T-122 で `configPath`→`configDirPath` を変えたときと同じ扱い（`evidence` に明記する）で足りるか判断する
- `ConfigUnitPath` をブランド型にする根拠（`docs/architecture.md`「ブランド型にするのは『同じ`string`の別物と取り違えうる識別子』」）を満たすか。`ChartDirName`・`BranchName`・`ValuesPath` と取り違えうるので満たすはずだが、確認する

## やること

1. `src/types/brand.ts` から `TenantId`/`ClientId` を削除し `ConfigUnitPath` を追加。`src/types/types.ts` の `TargetClient` と `ChartAndApps` のフィールドを差し替える
2. `src/domain/client-ref.ts` → `src/domain/config-unit.ts` に改名し、上の論点どおりに中身を作り直す
3. 上の表の残り全ファイルを追随させる。**走査のロジック（`listSubdirectories()` の2重ネスト）は構造を変えず、生成する値が `"<tenant>/<client>"` になるだけにする**
4. `src/lib/env.ts` の `TARGET_CLIENTS` → `TARGET_UNITS`。あわせて `.gitlab-ci.yml` の pipeline inputs（15-22行付近）とジョブ変数（67-72行付近）、`.env.example` があれば同様に
5. テスト17ファイルを追随させる。`test/helpers.ts` / `test/lib/config/fixture.ts` から直す
6. `docs/architecture.md` を追随させる: 155-156行の `src/domain/` の表、73-74行の節の索引、621行「Helmの向き先ブランチはapp単位に振り分けずclient単位で持つ」、640行「MRの単位は `(chartリポジトリ, tenantId, clientId)`」の**見出しごと**書き換える
7. `README.md` の**語彙だけ**追随させる（Features・仕組み章・実行ログ例のJSON・環境変数表の `TARGET_CLIENTS` 行・エラーハンドリング表・CI/CD の pipeline inputs 表）。**162-163行の「2階層で固定」の段落はT-130が書き換えるのでこのタスクでは触らない**
8. `docs/coding-standards.md:223` の `(chartリポジトリ, テナント/クライアント)` も追随させる

## 完了条件

- `grep -rn "tenantId\\|clientId\\|TenantId\\|ClientId\\|TARGET_CLIENTS" src scripts test .gitlab-ci.yml` が0件（`config-test/` のディレクトリ名は対象外。T-131が扱う）
- **振る舞いが1つも変わっていない**: `test/main.e2e.test.ts` の3件がディレクトリ構成・fakeの応答を変えずに通る。特に `buildFeatureBranch()` が `feature/yadokari/tenant1/client1` という**従来と同一の文字列**を返すことをテストで固定する
- `pnpm check` が通り、テスト件数が減っていない（着手前は36ファイル360テスト。実際の数を `evidence` に書く）
- `docs/architecture.md` の該当4箇所と `README.md` の語彙が現状のコードと一致している

## 注意

- **ディレクトリ階層は変えない。** 深さ1の受理・入れ子検出はT-130の担当。このタスクで先取りしない
- **`config-test/` は触らない**（実機スモークテストのフィクスチャ。T-131が扱う）
- `README.md` 162-163行の「2階層で固定」の段落と `docs/smoke-test.md` は触らない
- `docs/requirements.md` / `docs/glossary.md` はT-128で更新済み。ここでさらに書き換えない（食い違いを見つけたらT-128の見落としなので `evidence` に書いて直す）
- `/loop /next-task` に載せてよい

**difficulty**: sonnet

**evidence**: `tenantId`/`clientId`（2フィールド）を `ConfigUnitPath`（`unitPath`）1本へ置換。`src/domain/client-ref.ts` → `config-unit.ts` に改名し、`formatClientRef()` は不要化して削除、`parseClientRef()` → `parseConfigUnitPath()`（深さ2のみ受理を継続）。`TargetClient` 型は削除して `ConfigTarget.units: readonly ConfigUnitPath[] | undefined` に一本化。`TARGET_CLIENTS` → `TARGET_UNITS`（`.gitlab-ci.yml` の inputs・ジョブ変数、`.env.example` 含む）。**ログの後方互換を壊す**: `update_chart` の `tenantId`/`clientId` → `unitPath`、`run_start` の `targetClients` → `targetUnits`（T-122 の `configPath`→`configDirPath` と同種）。走査ロジックは構造を変えず、生成値が `"<tenant>/<client>"` になるだけ。あわせて `docs/requirements.md` 4.2節のMRタイトル書式（`${N} app image tag(s)` のままで実装と食い違っていた申し送り）を `buildMrTitle()` の実装に合わせて修正。**振る舞い不変を変異により実測**: `buildFeatureBranch()` を `feature/yadokari/unit/${unitPath}` に壊すと5件が落ちることを確認し復元。`buildFeatureBranch(toConfigUnitPath("tenant1/client1"))` が従来と同一の `feature/yadokari/tenant1/client1` を返すことを `test/domain/feature-branch.test.ts` で固定（既存のオープンMR・固定ブランチが迷子にならない担保）。`pnpm check` exit=0（36ファイル360テスト、着手前と同数）。旧 `client-ref.test.ts` の7件のうち削除は `formatClientRef`（削除した関数）の2件のみで、残り5件は `config-unit.test.ts` が引き継ぎ、文字種非検証の1件と深さ1のブランチ名1件を追加。メイン側で完了条件を再実測し、`parseConfigUnitPath()` のJSDocにあった作業段階への言及（「このタスクの時点では」）を恒久的な記述に直した。残る grep ヒット3種はいずれも正当（`test/main.e2e.test.ts` の実在YAMLアンカー名＝T-131の領分、`README.md` の構成図と2階層の段落＝T-130の領分、`docs/architecture.md:643` の過去の経緯の記録）。（コミット `686df5e`）

## T-130

**タスク**: 設定ユニットの階層を深さ1〜2に広げ、入れ子を設定エラーにする。

## 背景

T-129 で語彙は `ConfigUnitPath`（`unitPath`）に統一済みだが、走査はまだ2階層固定。`src/lib/config/config.ts` の `listClientChartAndApps()`（104-134行）が `listSubdirectories()` を2重にネストしており、`<chartDir>/<tenantId>/<clientId>/config.yaml` しか見つけられない。

このタスクで `<chartDir>/central/config.yaml`（深さ1）も `<chartDir>/tenant1/client1/config.yaml`（深さ2）も、**同じchartリポジトリ配下に混在した状態で**読めるようにする。仕様の正典はT-128で更新済みの `docs/requirements.md` 4.4節。

**入れ子（親も子も `config.yaml` を持つ）は設定エラーで即時終了する。** 理由はGitの ref が D/F conflict を起こすため: ブランチ `feature/yadokari/central` と `feature/yadokari/central/sub` は同一リポジトリに共存できず、後から作るほうが失敗する。D/F conflict はパスがプレフィックス関係のときだけ起きるので、入れ子禁止でこの制約は完全にカバーされる（深さ1と深さ2が兄弟なら衝突しない）。

## 解くべき論点

- **入れ子をどこで検出するか。** 走査中に「`config.yaml` を見つけたディレクトリの配下をさらに見る」か、走査後に得られた `unitPath` の集合でプレフィックス関係を突き合わせるか。前者は走査の責務に収まるが余分なI/Oが要る。後者は判定が1箇所にまとまるが「見つけた `unitPath` 同士」しか見ないので、深さ3以上に `config.yaml` がある場合を拾えない。**深さ3以上の `config.yaml` を黙って無視してよいのか**（設定ミスに気づけない）も含めて決める
- **絞り込み（`TARGET_UNITS` / `ConfigTarget.units`）の照合。** 現状の `listClientChartAndApps()` は tenant階層・client階層それぞれで `listSubdirectories()` の結果を絞り込んでおり、**絞り込むと他ユニットのYAMLをパースしない**（`test/main.e2e.test.ts` の1本目がこれを理由にtarget未指定にしている）。深さが可変になったとき、この「早い段階で枝を落とす」性質を保つか、走査後に `unitPath` で照合する形に変えるかを決める。**変えると、絞り込み時に無関係なユニットのYAMLをパースするようになり、設定ミスが絞り込み実行でも顕在化するという副作用がある**（良い方向の副作用だが、挙動が変わるので明記する）
- **`clientDirExists()`（`src/lib/config/config.ts:92-100`）の後継。** `TARGET_UNITS` に指定された値がconfig配下に実在するかの検証。深さが可変になると `existsSync(join(...))` だけでは足りない（ディレクトリはあるが `config.yaml` が無い場合の扱い）
- **エラーメッセージ。** 入れ子・深さ0・深さ3以上をそれぞれどう報告するか。設定ミスは `pnpm lint:validate-config` でMR時点で止まるのが望ましい（`docs/architecture.md`「設定ミスの検知は『形』と『実在』で2段に分ける」）ので、`loadConfig()` の中で例外を投げる形になるはず
- **深さ0の扱い。** `<chartDir>/config.yaml`（`chart.yaml` と同階層）は仕様上不可。黙って無視するか、明示的に設定エラーにするか

## やること

1. 上の論点を判断する
2. `src/lib/config/config.ts` の走査を深さ1〜2対応に書き換え、入れ子・深さ0・深さ3以上を設定エラーにする
3. `src/domain/config-unit.ts` の `ConfigUnitPath` の検証を深さ1〜2に緩める（`TARGET_UNITS="central"` が通るようにする）
4. `test/lib/config/config.test.ts` に深さ1・深さ1と2の混在・入れ子エラー・深さ3エラーのテストを足す。`test/lib/env.test.ts` に `TARGET_UNITS="central"` が通ることを足す
5. `docs/architecture.md` の該当節（`src/lib/config/` の責務、および設計判断の節）に、深さ1〜2に限定した理由と入れ子禁止の理由（D/F conflict）を書く。**`docs/requirements.md` に書いてあることを二重に書かず、「なぜこの実装にしたか」だけを書く**
6. `README.md` 162-163行の「ディレクトリ階層は常に…2階層で固定です」の段落を書き換える。`config/` の構成図（145-153行）にも深さ1の例を足す
7. 調べた結果、深さ1〜2の混在がブランチ名以外でも衝突を起こすと分かった場合は、押し切らずユーザーに確認する

## 完了条件

- `config-test/` を使わない単体テストで、次の4つがすべて確認できている: (a) 深さ1の `config.yaml` が読める (b) 深さ1と深さ2が同じchart配下に混在できる (c) 入れ子が例外になる (d) 深さ3以上が例外になる
- `TARGET_UNITS="central"`（深さ1）と `TARGET_UNITS="t1/c1"`（深さ2）の両方が通り、存在しない値はエラーになる
- `pnpm check` が通り、テスト件数が減っていない（実際の数を `evidence` に書く）
- `test/main.e2e.test.ts` の3件が引き続き通る（既存の深さ2構成が壊れていない）
- `README.md` に「2階層で固定」という記述が残っていない

## 注意

- **`config-test/` は触らない**（T-131が扱う）。このタスクのテストは `test/` 配下の一時ディレクトリか既存のフィクスチャ方式で書く
- `docs/requirements.md` / `docs/glossary.md` はT-128で更新済み。ここで書き換えない
- ブランチ名の**文字種**の検証は従来どおり足さない（GitLabのAPIエラーに委ねる。`docs/requirements.md` 4.2節）。今回足すのは深さと入れ子の検証だけ
- `/loop /next-task` に載せてよい

**difficulty**: opus

**evidence**: `src/lib/config/config.ts` の走査を深さ1〜2対応に書き換え、深さ0・深さ3以上・入れ子を `loadConfig()` の設定エラーにした。**走査は深さで打ち切らず**（`collectUnitSegments()` がchartディレクトリ配下を上限なしで再帰し `config.yaml` を持つディレクトリを全件集める）、深さと入れ子（`unitPath` のプレフィックス関係）をその集合上で判定する。打ち切らないので深さ3以上も「対象0件」に紛れず設定エラーとして報告される。**挙動変更**: 階層の検証は `TARGET_UNITS` の絞り込みより前に対象外ユニットも含めて行う（絞り込み実行でしか通らない検証を作らないため）。一方YAMLの読み込みは従来どおり絞り込み後のみ（無関係なチームの設定ミスで緊急の限定実行を止めないため）。この線引きは `docs/architecture.md`「設定ユニットの走査は深さで打ち切らず、絞り込みより先に階層を検証する」節に理由つきで記載。`TARGET_UNITS` の実在チェックは `existsSync` から走査結果の `unitPath` との照合に変更（「ディレクトリはあるが config.yaml が無い」「深さ2の中間ディレクトリを指している」をどちらも『設定ユニットとしては存在しない』と報告するため）。これに伴い `loadChartAndApps()` は `ChartAndApps | undefined` → `ChartAndApps`（死んだ分岐の削除）。深さ上限と区切りは `src/domain/config-unit.ts` に `MAX_UNIT_DEPTH` / `UNIT_PATH_SEPARATOR` として置き規則の重複定義を回避。`parseConfigUnitPath()` は深さ1〜2を受理。テスト+13件（深さ1／混在／入れ子／入れ子メッセージ／兄弟の前方一致は入れ子でない／深さ3／深さ0／絞り込み時の階層検証／chart.yaml無しは配下ごと無視／深さ1で絞り込み／`TARGET_UNITS="central"` ほか）。**メイン側で実測**: `pnpm check` exit=0（36ファイル373テスト、着手前360）、`test/main.e2e.test.ts` は**無変更**で3件通過、`grep "2階層" README.md` は0件、`config-test/`・`docs/smoke-test.md`・`docs/glossary.md`・`docs/requirements.md` は無傷。e2eに「絞り込むと他ユニットをパースしない」前提のコメントは実ファイル上に存在しないというエージェントの申告も grep で裏を取った。`README.md` は構成図に深さ1の例を追加し「2階層で固定」の段落を書き換え。（コミット `04cabe0`）

## T-131

**タスク**: `config-test/` に深さ1の設定ユニットを作り、深さ1と深さ2が混在できることを e2e で守る。

## 背景

`config-test/` は実機スモークテスト（`docs/smoke-test.md`）のフィクスチャで、**GitLab上の実プロジェクトと対応している**（chartリポジトリ `sinnlosses-group/yadokari-smoke-test-chart` = projectId `86061211`）。同時に `test/main.e2e.test.ts` が実ファイルとして読む唯一の設定でもある。

現状は全部が深さ2:

```
config-test/yadokari-smoke-test-chart/
  chart.yaml
  tenant1/client1/{config,anchors}.yaml   → charts/anchor-app/values.yaml の tenantId1client1AppsVersion
  tenant2/client1/{config,anchors}.yaml   → charts/smoke-tenant2/client1/values.yaml のアンカー3つ
  tenant2/client2/{config,anchors}.yaml   → charts/smoke-tenant2/client2/values.yaml のアンカー2つ
```

T-130 で深さ1が読めるようになるので、**深さ1と深さ2が同じchart配下に混在する状態**を実ファイルで固定したい。単体テストでは T-130 が既に守っているが、`config/` の実ファイル → `loadConfig()` → MRの中身という連結を守るのは e2e の役割（正典は `docs/coding-standards.md`「テスト」節の「通し（e2e）で守るのは『実ファイル → MRの中身』の連結だけ」）。

## 解くべき論点

- **深さ1のユニットをどう用意するか。** 2案:
  - **(a) 既存の `tenant1/client1` を深さ1に移す**（例: `config-test/yadokari-smoke-test-chart/anchor-app/`）。`valuesPath`（`charts/anchor-app/values.yaml`）とアンカー名は変わらないので、**GitLab側の実リポジトリを一切変更せずに済む**。変わるのは固定ブランチ名が `feature/yadokari/tenant1/client1` → `feature/yadokari/<新しい名前>` になることだけ。**これが推奨**
  - **(b) 深さ1のユニットを新規に足す**。GitLabの実chartリポジトリに新しい `values.yaml` を追加する必要があり、**ユーザー承認と手作業が要る**
- (a) を採る場合の新しいディレクトリ名。`tenantId1client1AppsVersion` というアンカー名は実リポジトリ側にあり変えられないので、ディレクトリ名との対応が読みにくくなる。それを `docs/smoke-test.md` にどう注記するか
- 深さ1のユニットが**アンカー名やvaluesPathを深さ2のユニットと共有していないこと**の確認（共有していると `validateNoDuplicateTargets` の対象になるかを確かめる）

## やること

1. 論点を判断する。**(b) を選ぶ場合はGitLabへの書き込みが要るのでそこで止め、必要な作業をユーザーに提示して `evidence` に書く**
2. `config-test/` を変更する
3. `test/main.e2e.test.ts` を追随させる。fakeの応答（`RepositoryFiles.show` のパス分岐など）と、1本目が期待する `MergeRequests.create` の `sourceBranch` を新しい構成に合わせる。**深さ1と深さ2の両方からMRが作られることを1本目で明示的に確かめる**
4. `docs/smoke-test.md` を追随させる（16行付近の表、31-36行のvalues.yaml一覧、40-51行のシナリオ、71-77行の `TARGET_CLIENTS`→`TARGET_UNITS` のコマンド例、85-92行の期待結果）
5. `pnpm lint:validate-config` を `CONFIG_PATH=config-test` で通し、形の検証が通ることを確かめる

## 完了条件

- `config-test/yadokari-smoke-test-chart/` の配下に深さ1のユニットと深さ2のユニットが両方存在する
- `test/main.e2e.test.ts` の1本目が、深さ1のユニットと深さ2のユニットの両方からMRが作られることを検証している
- `pnpm check` が通り、テスト件数が減っていない（実際の数を `evidence` に書く）
- `docs/smoke-test.md` の手順・期待結果が新しい `config-test/` の構成と一致している。**手順は1つも減らさない**
- `docs/smoke-test.md` に `TARGET_CLIENTS` が残っていない

## 注意

- **実GitLabへの書き込み（MR作成・タグ作成・ブランチ作成・chartリポジトリへのコミット）はユーザー承認が必要。** セッションから勝手に実行しない。(a) を選べば承認は不要なはず
- 実機スモークテスト自体の実行はこのタスクの完了条件に含めない（ユーザーがターミナルから実行する領分。`docs/smoke-test.md` 参照）。ただし**構成を変えた以上、次回のスモークで旧ブランチ `feature/yadokari/tenant1/client1` が残る可能性**があるので、`scripts/smoke/smoke-fixture.ts` の reset が `isFeatureBranch()` でそれを拾えるかを確かめて `evidence` に書く
- `config-test/` が指すGitLabプロジェクトのprojectId・アンカー名・valuesPathは実物に合わせる。**架空の値を書かない**
- **`/loop /next-task` には載せない**（(b) を選ぶ場合にユーザー確認を伴うため）

**difficulty**: sonnet

**evidence**: 案(a)を採用: `config-test/yadokari-smoke-test-chart/tenant1/client1/` を `anchor-app/`（深さ1）へ `git mv` し、`tenant2/client1`・`tenant2/client2`（深さ2）と混在させた。`valuesPath`（`charts/anchor-app/values.yaml`）とアンカー名（`tenantId1client1AppsVersion`）は変えていないので**GitLab側の実リポジトリは変更不要**（書き込みは一切していない）。ディレクトリ名 `anchor-app` は実chartリポジトリの `charts/anchor-app/` に対応させた。アンカー名だけはディレクトリ名と対応しなくなる（実リポジトリ側の値で変更不可）ため `docs/smoke-test.md` に注記。`test/main.e2e.test.ts` の1本目を、`feature/yadokari/anchor-app`（深さ1）と `feature/yadokari/tenant2/client1`・`/client2`（深さ2）の3件のMR作成を明示検証する形に更新。`docs/smoke-test.md` は表・values.yaml一覧・シナリオ・コマンド例（`TARGET_CLIENTS`→`TARGET_UNITS`）を追随（手順数は0〜5の6ステップのまま減らしていない）。`isFeatureBranch()` はブランチ名の接頭辞のみで判定するため、旧ブランチ `feature/yadokari/tenant1/client1` は次回の `smoke-fixture.ts reset --apply` で拾われる（コード確認済み・変更不要）。**メイン側で実測**: `pnpm check` exit=0（36ファイル373テスト、着手前と同数）、`pnpm lint:validate-config config-test` が `config OK: 3 chart groups, 5 apps`、`grep TARGET_CLIENTS docs/smoke-test.md` は0件、`docs/requirements.md`・`glossary.md`・`architecture.md`・`README.md`・`src/` は無傷。**e2eが空振りでないことを変異で実測**: `collectUnitSegments()` が深さ1のユニットを無視するよう壊すと1本目だけが落ちることを確認し復元（`git diff --quiet` でHEAD一致を確認）。**指示の誤りの訂正**: `scripts/lint/validate-config.ts` は `CONFIG_PATH` 環境変数ではなく位置引数でディレクトリを受け取る（環境変数指定では `0 chart groups` になることを実測）。（コミット `6345e59`）

## T-132

**タスク**: タグ命名規則を「`{branch}`だけでも成立させる」「semverに対応する」ためにどう設計するかを決める。**実装はしない。**

## 背景

ユーザーからの指示（原文は `docs/history/direction.md` の該当節）:

- タグのフォーマットをユーザーが設定できるようにしたい。リポジトリごとにフォーマットが異なりそうなので
- 必要なのは一旦追跡ブランチを特定するために必要な情報（`{branch}`）だけにして、`{date}`・`{time}` は不要にしよう
- タグは今の仕様に加えて semver に対応できるといいね
- フォーマットはリポジトリのconfigに設定できるといいかな
- サポートされていない設定パターンだったらCIで落とすようにしたいな

**この指示は既存機能と正面から衝突する。** 現状 `{date}`/`{time}` は3つの役目を持っている（`src/domain/tag-format.ts`）:

| 役目                                           | 実装箇所                                                                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| (A) HEADを指すタグが複数あるときのタイブレーク | `findLatestParsedTag()` が `builtAt` の降順で1つ選ぶ。`resolve-latest-tags.ts:104` が「返す値を一意に決めるためだけ」に呼ぶ |
| (B) **新しいタグ名の一意性**                   | `buildNewTag()`。`{branch}` だけだと生成名が常に `main` になり、既存タグと衝突して `createTag()` が失敗する                 |
| (C) スモークのシード判定                       | `scripts/smoke/smoke-fixture.ts:105` が `latestTag.builtAt > seedTag.builtAt` を見る                                        |

semver も同じ問題を持つ。`v1.2.3` にはブランチ名が入らないので、`resolveTrackedHeadTagNames()`（`resolve-latest-tags.ts:132-145`）の「`branch` と `tagFormat` でパースできるか」という**追跡ブランチ由来の判定方法そのものが成立しない**。

現状の設定経路は環境変数 `TAG_FORMAT` 1本（`src/lib/env.ts:70`、既定は `{branch}-build-at-{date}-{time}`）で、実行全体で1つの値。`config/` には無い。

## 解くべき論点

1. **`{date}`/`{time}` を必須から外したとき、タグ自動作成（役目B）をどうするか。** 候補: (a) 一意性を持てないフォーマットのアプリでは自動作成をしない（HEADにタグが無ければ `ERROR` か `SKIPPED`）/ (b) フォーマットに一意性が無ければ設定エラーとして起動時に落とす（＝`{branch}`だけは許さない）/ (c) 自動作成専用の別フォーマットを持たせる。**「タグ自動作成」は `docs/requirements.md` に明記された機能なので、削るなら要件側も直す**
2. **役目A（タイブレーク）の代わりをどうするか。** `builtAt` が無いとき、HEADを指すタグが複数あったら何で1つに決めるか（タグ名の辞書順・GitLabが返す順・semverの版順など）。決定性が壊れると「実行のたびにMRの中身が変わる」ので落とせない
3. **semver対応の設計。** 「追跡ブランチ由来」の判定を名前から切り離し、「`branchToSync` のHEADコミットを指すタグのうち semver として読めるもの」にするのが素直か。その場合の順序づけ（プレリリース・ビルドメタデータ・`v` 接頭辞の扱い）と、semverモードでの自動作成の可否（次の版番号は導出できない）
4. **設定の置き場所と優先順位。** 「リポジトリごとに異なる」＝ソースリポジトリ単位なので `config.yaml` の `apps[]` の各エントリが素直だが、`chart.yaml`（chartリポジトリ共通）や設定ユニット単位も選べる。環境変数 `TAG_FORMAT` は残して既定値にするのか、廃止するのか。**運用値なので `anchors.yaml` ではなく `config.yaml` 側**（`docs/architecture.md`「`chart.yaml`/`config.yaml`/`anchors.yaml` の3ファイル分割」）
5. **タイムゾーンを設定可能にするか。** JST化は別タスクで扱うが、フォーマットがリポジトリごとに異なるならタイムゾーンもそうなりうる。ここで「固定でよい」と決めるなら、その理由を残す

## やること

1. 論点1〜5を判断する。**判断できない論点があれば、押し切らずユーザーに問いを提示して止める**
2. 結論と理由を `docs/requirements.md`（仕様）と `docs/architecture.md`（実装上の判断）に書き分ける。二重に書かない
3. 後続タスクの本文を、決めた内容に沿って更新する（設定の置き場所・スキーマの形・semverの扱い）
4. 調べた結果「`{date}`/`{time}` を外すと成立しない」と分かった場合は、**外さない結論も正当**。その場合は理由を `evidence` に書き、後続タスクの範囲を狭めてよい

## 完了条件

- 論点1〜5すべてに結論と理由が付いている
- 結論が `docs/requirements.md` と `docs/architecture.md` に書き分けられている（同じことを両方に書いていない）
- **コードの変更が1行も無い**（`git diff --stat` の対象がドキュメントと `develop/` のみ）
- 後続タスクの `task` 本文が、決めた内容を反映した具体的な実装指示になっている
- `pnpm check` が通る

## 注意

- **実装はしない。** 足すかどうか・どう足すかを決めるところまで
- 「タグ自動作成」の仕様を変える結論になった場合、`docs/requirements.md` の該当節と `docs/glossary.md`「タグ自動作成」エントリの**両方**を直す
- `docs/requirements-grilling.md` はアーカイブ扱いで書き換えない
- `/loop /next-task` に載せてよい

**difficulty**: opus

**evidence**: タグ命名規則の設計を決め、`docs/requirements.md`（4.1節を全面改稿・4.4節に `apps[].tagNaming` を追加）と `docs/architecture.md`（設計判断の節と索引行を追加）に書き分け、`docs/glossary.md` の「タグ命名規則」「順序キー（新設）」「打刻日時」「最新タグ」「タグ自動作成」を追随させた。**結論**: (1) `template` モードの必須は `{branch}` と `{date}` の各1回、任意は `{time}` だけ（`{branch}` 単独・`{time}` 単独は設定エラー。後者は順序キーが毎日一周し `builtAt` を組み立てられないため）。**タグ自動作成の仕様を変更**し、`{time}` を含む `template` モードでのみ行う。それ以外はHEADにタグが無ければ**当該appのみ**警告して見送り、chartAndApps は `ERROR` にしない（`ERROR` は設定ユニット単位のオールオアナッシングで他appを巻き添えにするため）、(2) タイブレークは順序キーの降順、同値ならタグ名の降順、(3) semver は追跡ブランチ由来の判定をHEADコミットで行い（到達可能性判定は不採用＝API負荷と中心的な取り決めの一貫性を優先）、比較は依存を足さず自前実装、(4) 置き場所は `config.yaml` の `apps[].tagNaming`（`mode` 判別共用体）、`TAG_FORMAT` は廃止（環境変数だとCIの `check` で検証できず「サポート外の設定をMRで落とす」が成立しないため）。**同一 `projectId` で `tagNaming` が食い違う場合は設定エラー**（`createResolveLatestTags()` のキャッシュキー `projectId:branchToSync` を変えずに誤共有を防ぐため。`branchToSync` の食い違いは正当なので検証しない）、(5) タイムゾーンは固定で設定項目にしない。**ユーザー確認を2点実施**し、semverは「HEADを指すタグのみ」を追認、「`{branch}` 単独を許す」案は撤回して設定エラーに変更（あわせてメイン側の判断で `{time}` 単独も設定エラーにした）。後続3タスクの `task` 本文をこの結論に沿って書き換えた（`status`/`passes`/`evidence`/`difficulty`/`dependencies` は未変更であることをメイン側で差分検証）。**コード変更0行**（`git diff --stat` は `docs/` 3件と `develop/tasks.json` のみ、170挿入/30削除）、`pnpm check` exit=0（36ファイル373テスト）。**注意**: `docs/` はこれから実装する仕様を記述した状態で、現在のコードおよび `README.md` とは一時的に食い違う（READMEの追随は後続タスクの作業項目）。`develop/parameterization-candidates.md` の項目6が今回の結論と逆向きのまま残っており、JST化のタスクで併せて直す。（コミット `74a22d4`）

## T-133

**タスク**: タグ命名規則を `config.yaml` の `apps[].tagNaming` で設定できるようにし、環境変数 `TAG_FORMAT` を廃止する。

## 前段のタスクで決まったこと

正典は `docs/requirements.md` 4.1節・4.4節と、`docs/architecture.md`「タグ命名規則はapp単位に`config.yaml`へ置き、`TAG_FORMAT`は廃止する」。着手時にこの2つを読むこと。要点:

- 置き場所は `config.yaml` の `apps[]` の各エントリ、キーは `tagNaming`。`chart.yaml`・`anchors.yaml`・設定ユニット単位ではない
- `tagNaming` は `mode` を判別子にする判別共用体。**このタスクで実装するのは `mode: template` だけ**（`mode: semver` は後続タスク）
- 省略時は `mode: template` / `template: "{branch}-build-at-{date}-{time}"`
- 環境変数 `TAG_FORMAT` は**廃止**する（既定値としても残さない）
- **必須プレースホルダは3つのまま変えない**（`{time}` を任意にするのは後続タスク）
- 同じ `projectId` のappが複数の設定ユニットに登録されていて `tagNaming` が食い違う場合は設定エラー（`branchToSync` の食い違いは正当なので検証しない）

`config/` に移すと**CIで落とす仕組みはほぼ自動で付いてくる**: `pnpm lint:validate-config`（`scripts/lint/validate-config.ts`）は `pnpm lint` → `pnpm check` 経由でCIの `check` ジョブに載っており、`loadConfig()` を通すのでZodスキーマと `validateTagFormat()` がMR時点で走る。

## やること

1. `src/types/types.ts` に `TagNaming` 型を足す（ドメイン語彙なので `types/types.ts`。`docs/architecture.md`「型の置き場所」の1行目）。`{ readonly mode: "template"; readonly template: TagFormat }` のような判別共用体にし、後続タスクで `semver` を足せる形にしておく
2. `src/lib/config/schema.ts` の `AppOperationalSchema` に `tagNaming` を足す。`z.discriminatedUnion("mode", ...)` を使い、省略時は既定値に落とす。テンプレート文字列の検証は `validateTagFormat()` に委ねる
3. `config.yaml` と `anchors.yaml` の突き合わせ検証に「同じ `projectId` で `tagNaming` が食い違ったら設定エラー」を足す。既存の `projectName` 食い違い検証と同じ場所・同じ形にする
4. `AppConfig` に `tagNaming` を載せ、`resolve-latest-tags.ts` まで繋ぐ。`createResolveLatestTags()` の `tagFormat` 引数は不要になる（`app.tagNaming` から取る）。**キャッシュキー `projectId:branchToSync` は変えない**（理由は architecture の該当節）
5. `src/lib/env.ts` から `TAG_FORMAT` / `parseTagFormat()` / `EnvConfig.tagFormat` を削除し、`src/main.ts` の `run_start` ログの `tagFormat` フィールドも削除する
6. `.gitlab-ci.yml` の `spec.inputs.TAG_FORMAT` と `variables.TAG_FORMAT`、`.env.example` の該当行を削除する
7. `scripts/smoke/smoke-fixture.ts` が `env.tagFormat` を使っている（102-105行）。対象appの `tagNaming` を `loadConfig()` から引くか、シード用の定数を自前で持つかを決めて追随させる
8. テストを足す/直す（`test/lib/config/schema.test.ts`・`test/lib/config/config.test.ts`・`test/steps/build-plans/sub-steps/resolve-latest-tags.test.ts`・`test/lib/env.test.ts`・`test/main*.test.ts` の `EnvConfig` フィクスチャ）
9. `README.md` の「タグ命名規則」章・環境変数表2箇所・`config/` の説明を追随させる。`docs/requirements.md` / `docs/architecture.md` / `docs/glossary.md` は 前段のタスクで更新済みなので**触らない**（食い違いを見つけたときだけ直す）

## 完了条件

- `config.yaml` でアプリごとに異なる `tagNaming` を指定でき、それが `resolveLatestTag()` まで届いていることがテストで確認できている
- **サポート外のフォーマットを `config.yaml` に書くと `pnpm lint:validate-config` が失敗する**ことを、実際に不正な値を書いた一時ディレクトリで実行して確かめる（出力を `evidence` に書く）
- **同じ `projectId` で `tagNaming` が食い違う `config/` が設定エラーになる**ことがテストで確認できている
- `TAG_FORMAT` という文字列がリポジトリから消えている（`docs/history/` と `develop/` を除く。`grep -rn "TAG_FORMAT"` の結果を `evidence` に書く）
- `pnpm check` が通り、テスト件数が減っていない（実際の数を `evidence` に書く）
- `config-test/` を変更した場合、`pnpm lint:validate-config config-test` が通る（**ディレクトリは位置引数で渡す。`CONFIG_PATH` 環境変数では効かない**）

## 注意

- **`config-test/` が指すGitLabプロジェクトのprojectId・アンカー名・valuesPathは実物に合わせる。架空の値を書かない。** 実GitLabへの書き込みはしない
- semver対応と必須プレースホルダの緩和は後続タスク。ここでは「実行全体で1つ」を「app単位」にする移設だけを行う
- `/loop /next-task` に載せてよい

**dependencies**: T-132

**difficulty**: sonnet

**evidence**: タグ命名規則を環境変数 `TAG_FORMAT`（実行全体で1つ）から app 単位の `config.yaml` の `apps[].tagNaming`（`mode` 判別共用体、省略時は `{branch}-build-at-{date}-{time}`）へ移設。`TagNaming` 型を `src/types/types.ts` に追加して `AppConfig` に載せ、`resolve-latest-tags.ts` まで貫通させた（`createResolveLatestTags()` の `tagFormat` 引数は廃止、**キャッシュキー `projectId:branchToSync` は不変**）。同じ `projectId` のappが複数の設定ユニットで `tagNaming` が食い違う場合は `src/lib/config/validate.ts` の `validateTagNamingConsistency()` で設定エラー（複数ユニットにまたがる検証なので、単一ユニットしか見えない `chart-and-apps.ts` ではなく全ユニットが揃う `config.ts` から呼ぶ）。`src/lib/env.ts` から `TAG_FORMAT`/`parseTagFormat()`/`EnvConfig.tagFormat` を削除し、`.gitlab-ci.yml`・`.env.example`・`README.md` を追随。`scripts/smoke/smoke-fixture.ts` は `DEFAULT_TAG_TEMPLATE` 定数の直接参照に変更。**メイン側で実測**: `pnpm check` exit=0（36ファイル380テスト、着手前375）、一時 `config/` を作って `pnpm lint:validate-config` を実行し、正常な `tagNaming` は `config OK`、`{branch}` を欠くテンプレートと未実装の `mode: semver` は**どちらも exit 1**（＝CIの `check` ジョブでMR時点に落ちる）。`grep -rn TAG_FORMAT` はコードから完全消滅し、残るのは docs の「廃止された」という過去形の記述のみ。**JST化（`29774b2`）は無傷**（`src/domain/tag-format.ts` の diff にJST関連の増減なし。`DEFAULT_TAG_FORMAT`→`DEFAULT_TAG_TEMPLATE` のリネームとエラーメッセージのみ）。`config-test/` は既定の `tagNaming` で整合するため未変更（`pnpm lint:validate-config config-test` が `3 chart groups, 5 apps`）。`docs/` は食い違いとして見つけた `architecture.md` の責務表1セルと `coding-standards.md` のテスト名1語のみ修正。semver対応と `{time}` の任意化は後続タスクの担当として先取りしていない。

## T-134

**タスク**: タグ命名規則を semver に対応させ、あわせて `{time}` を任意プレースホルダにする。

## 前段のタスクで決まったこと

正典は `docs/requirements.md` 4.1節と、`docs/architecture.md` の3節（「タグの順序づけは順序キーに閉じ込め、`builtAt`を直接比較しない」「最新タグが決まらないappはERRORにせずapp単位で見送る」「semverモードは「HEADを指すタグ」に限り、比較は自前で書く」）。着手時にこれらを読むこと。要点:

- `template` モードの必須プレースホルダは `{branch}` と `{date}` のちょうど1回ずつ。任意にするのは `{time}`（0回か1回）だけで、**`{branch}` 単独も `{time}` 単独も設定エラー**。許される形は `{branch}`+`{date}`+`{time}` と `{branch}`+`{date}` の2つ
- `semver` モードでは「追跡ブランチ由来」を名前ではなく**追跡ブランチのHEADコミットを指していること**で判定する。到達可能性（merge_base / コミット一覧）は使わない
- semverの順序は semver 2.0.0 §11。先頭の `v` は任意で順序には影響させない、プレリリースも候補に含める、ビルドメタデータは順序に影響させない、semverとして読めないタグは候補から外す
- **タグ自動作成は `template` モードで `{time}` を含むときだけ**。それ以外（semverモード、`{time}` を含まないテンプレート）は自動作成せず、HEADにタグが無ければそのappを更新対象から外して**警告ログ**を出す。chartAndApps 全体を `ERROR` にはしない
- タイブレークは順序キーの降順。順序キーが同値のとき（`{time}` を含まないテンプレートで同じ日付のタグが複数あるとき、semverで同値の版が複数あるとき）はタグ名の降順
- semverの比較は**依存パッケージを足さず自前で書く**

## やること

1. `src/types/types.ts` の `TagNaming` に `{ readonly mode: "semver" }` を足し、`src/lib/config/schema.ts` の判別共用体に載せる
2. `ParsedTag` の `builtAt: Date` を順序キーに置き換える。`builtAt: Date | undefined` と semver 用フィールドを並べる形は採らない（理由は architecture の該当節）。`docs/architecture.md`「用途別の型エイリアスを作らない」に触れないこと
3. `src/domain/tag-format.ts`
   - `validateTagFormat()` の必須チェックを「`{branch}` と `{date}` はちょうど1回、`{time}` は0回か1回」に緩める（`{date}` を必須のまま残す理由は architecture の該当節）
   - `compileTagPattern()` / `fillTagFormat()` を、`{time}` を含まないフォーマットでも動くようにする
   - semverのパースと比較を足す
   - タグの比較を担う関数を1つ export し、呼び出し側が `Date` を `>` で直接比べる形を残さない
   - 自動作成できるフォーマットかどうかを判定する述語を用意し、`buildNewTag()` はそれが真のときだけ呼べる形にする
4. `resolve-latest-tags.ts`
   - `resolveTrackedHeadTagNames()` をモードで分岐させる（`template` は従来のパース、`semver` は semver として読めるかだけ）
   - 自動作成できないフォーマットでHEADにタグが無い場合、`LatestTagResolution` の最新タグを「決まらない」で返し、警告ログを出す
5. `stage-image-tag-updates.ts` を「最新タグが決まらないapp」を飛ばす形に追随させる
6. テストを足す（`test/domain/tag-format.test.ts`・`test/steps/build-plans/sub-steps/resolve-latest-tags.test.ts`・`test/steps/build-plans/sub-steps/stage-image-tag-updates.test.ts`）
7. `README.md` の「タグ命名規則」章を追随させる。`docs/requirements.md` / `docs/architecture.md` / `docs/glossary.md` は 前段のタスクで更新済みなので**触らない**（食い違いを見つけたときだけ直す）

## 完了条件

- semverのタグ（プレリリース付き・`v`接頭辞あり/なし・ビルドメタデータ付きを含む）から最新タグを決められることがテストで確認できている
- **`{branch}` 単独・`{time}` 単独・`{date}` 単独のテンプレートがいずれも設定エラーになる**ことがテストで確認できている（`{branch}`+`{date}` は通ること）
- semverモード、および `{time}` を含まないテンプレートで、HEADにタグが無いときに**タグが作成されず**、そのappがスキップされ、**同じ設定ユニットの他のappの更新は続く**ことがテストで固定されている
- **既存方式の振る舞いが変わっていない**: `test/main.e2e.test.ts` の3件と既存の `tag-format` のテストが通る
- `pnpm check` が通り、テスト件数が減っていない（実際の数を `evidence` に書く）

## 注意

- 依存パッケージは足さない（前段の結論）。足す判断に変える場合は理由を `evidence` に書く。`package.json` の変更は Renovate の対象になる
- `docs/requirements-grilling.md` はアーカイブ扱いで書き換えない
- `/loop /next-task` に載せてよい

**dependencies**: T-132, T-133

**difficulty**: opus

**evidence**: `tagNaming` に `mode: semver` を追加し、`template` の `{time}` を任意化した。**`ParsedTag.builtAt: Date` を順序キー `orderKey: TagOrderKey`（`readonly (number|string)[]`）に置き換え**、template は `[epoch ms]`、semver は `[major, minor, patch, プレリリース有無, ...識別子]`。要素比較規則（数値同士は数値・文字列同士はASCII・数値<文字列・尽きた側が小）1つで semver 2.0.0 §11 が全部乗る。比較は `compareTags()` 1本に集約し、**`Date` を `>` で直接比べる箇所はコードベースから消滅**（`scripts/smoke/smoke-fixture.ts` も追随）。タグ自動作成は `canCreateTag()` 型述語を門番にし、`buildNewTag()` は `CreatableTagNaming`（ブランド型）しか受け取らない ── **`as` は不使用**（型述語なのでキャスト不要）。作れない場合は `LatestTagResolution.tag` を undefined で返して `logger.warn`（新設）を出し、`stage-image-tag-updates.ts` がそのappだけ飛ばす（chartAndApps は `ERROR` にしない）。**semver比較は依存を足さず自前実装**（`package.json`/`pnpm-lock.yaml` 無変更を確認）。**メイン側で独立に実測**: `pnpm check` exit=0（36ファイル418テスト、着手前380から+38）、`test/main.e2e.test.ts` 3件通過、semver §11.4 の公式な順序8段（`1.0.0-alpha` < `alpha.1` < `alpha.beta` < `beta` < `beta.2` < `beta.11` < `rc.1` < `1.0.0`）が全部成立、`v` 接頭辞とビルドメタデータが順序キーに影響しない（どちらも `[1,2,3,1]`）、`1.10.0 > 1.9.0`（辞書順でなく数値比較）、semverとして読めないタグは候補外、`compareTags` が同順序キーでもタグ名で全順序になり対称（+1/-1）。JST（`JST_OFFSET_MS`）は無傷。エージェント側は変異でも検証（`JST_OFFSET_MS` を0にすると11件、`canCreateTag` の `{time}` 判定を外すと2件落ちる。いずれも復元済み）。**メイン側で正典2箇所を追加修正**: `docs/glossary.md`「打刻日時」の英語識別子（`builtAt` は順序キーの中身になりローカル変数としてのみ残る）と、`docs/requirements.md` 4.1節のタイブレーク説明（`template` は順序キーがタグ名から一意に定まるため同値の分岐に到達しない）。`docs/architecture.md`「型の置き場所」の1文はエージェントが実態に合わせて修正済み。

## T-135

**タスク**: タグ名の日時を UTC から JST にする。

## 背景

ユーザーの指示「tag の日時はJSTがいいな。今はUTCだと思うけど」。実際にUTC固定になっている（`src/domain/tag-format.ts`）:

- `buildNewTag()` … `now.getUTCFullYear()` / `getUTCMonth()` / `getUTCDate()` / `getUTCHours()` / `getUTCMinutes()` / `getUTCSeconds()` でタグ名の `{date}`/`{time}` を組み立てる
- `parseTag()` … 読み取った数字を `new Date(Date.UTC(...))` として `builtAt` にする

この2つは**必ず同時に変える**（片方だけだと生成と解釈がズレる）。

`docs/glossary.md`「タグ命名規則」に「日時のUTC固定」がパラメータ化候補として挙がっており、`develop/parameterization-candidates.md` にも項目がある（前回の洗い出しの結論は「積極的に勧める材料は薄い」だったが、今回はユーザーの明示的な指示なので実施する）。

**既存タグとの互換について**（調査済み。実装時に確認すること）: 移行後、GitLab上にあるUTC命名の既存タグは JST として再解釈されるため `builtAt` が一律9時間ぶん前にずれる。ただし**全タグが同じ向きに同じ量だけずれるので相対順序は保たれ**、かつ JST は UTC より進んでいるので切り替え時点でタグ名は前方へジャンプする（後戻りしない）。したがって `findLatestParsedTag()` のタイブレークは壊れない。**この前提が本当に成り立つかを実装時に自分で確かめること**（成り立たなければ移行手順が必要になる）。

## 解くべき論点

- タイムゾーンを固定にするか設定可能にするかは、**前段のタスクで「タイムゾーンは全アプリ共通で固定とし、設定項目にはしない」と決着済み**（`docs/requirements.md` 4.1節）。このタスクは固定値をUTCからJSTに変えるだけでよく、`config/` にも環境変数にも項目を足さない
- JSTをどう表現するか。`Intl.DateTimeFormat` の `timeZone: "Asia/Tokyo"` を使うか、UTC+9のオフセット計算で済ませるか。**日本にサマータイムは無いのでオフセット計算でも正しいが、意図が読めるのはどちらか**で決める
- `scripts/smoke/smoke-fixture.ts` が `builtAt` の比較（102-105行）でシードタグかどうかを判定している。ここに影響が出ないか

## やること

1. 上の論点を判断する
2. `buildNewTag()` と `parseTag()` を JST に揃える
3. テストを足す/直す（`test/domain/tag-format.test.ts`）。**UTCとJSTで結果が変わる時刻（例: UTC 2026-09-08T16:00 → JST では翌日）を必ず1件入れる**。日付が繰り上がるケースを入れないと、9時間ズレを検知できない
4. `docs/requirements.md` 4.1節・`docs/glossary.md`「タグ命名規則」「打刻日時 / ビルド日時」・`README.md`「タグ命名規則」章を追随させる
5. `develop/parameterization-candidates.md` の該当項目に、実施済みである旨を1行足す

## 完了条件

- `buildNewTag()` が JST でタグ名を組み立て、`parseTag()` がその名前を JST として解釈して `builtAt` に戻すことが、**日付が繰り上がる時刻を含むテスト**で確認できている
- 上の「既存タグとの互換」の前提（相対順序が保たれること）を自分で確かめ、結論を `evidence` に書いている
- `pnpm check` が通り、テスト件数が減っていない（実際の数を `evidence` に書く）
- `docs/` と `README.md` に「UTC」の記述が残っていない（残す場合は経緯としての記述であることを `evidence` に書く）

## 注意

- **タグ名が変わるので、次回の実機スモークテストで生成されるタグ名も変わる。** `docs/smoke-test.md` の期待結果にタグ名の例が書かれていれば追随させる
- 実GitLabへの書き込みはしない
- このタスクは他のタグ関連タスクと独立して着手できる（`dependencies` が空なのはそのため）。ただし他のタグ関連タスクも `src/domain/tag-format.ts` を書き換えるため、**このタスクを先に片付けるほうが手戻りが少ない**。先に他方が入っている場合は、`template` モードの `{date}`/`{time}` を組み立て・解釈する箇所にJST化を入れる
- `/loop /next-task` に載せてよい

**difficulty**: sonnet

**evidence**: `buildNewTag()` / `parseTag()` を JST（UTC+9固定）に同時変更。`JST_OFFSET_MS` 1定数を対称に足し引きするだけの実装（`buildNewTag` は `now.getTime() + offset` してUTC getterでJSTの壁時計値を取り、`parseTag` は `Date.UTC(...) - offset` で真の時刻に戻す）。`Intl.DateTimeFormat` ではなくオフセット計算を選んだのは、日本にサマータイムが無く、足す／引くの対称性がコード上そのまま読めるため。テスト+2件（UTC 16:00以降で日付が翌日に繰り上がるケースを `buildNewTag` 単体と往復の2通り）。**メイン側で独立に実測**: 往復が `2026-09-08T16:00Z`→`20260909-010000`、`2026-09-08T14:59:59Z`→`20260908-235959`、**年跨ぎ** `2026-12-31T15:00Z`→`20270101-000000` の3件とも完全一致。既存タグとの互換は「旧タグの再解釈後 builtAt は一律 −9h シフトなので相対順序は保存、移行後の新タグは真の作成時刻に一致し、JSTはUTCより進んでいるので境界でも後戻りしない」を実測で確認（旧 `20260901-230000` の再解釈 `2026-09-01T14:00Z` < 新（真のUTC `09-02T00:00`）`2026-09-02T00:00Z`）。**移行手順は不要**。`scripts/smoke/smoke-fixture.ts` のシードタグは `buildNewTag()` 由来ではない固定プレースホルダで十分古いため `hasNewerTag` 判定に影響なし（`docs/smoke-test.md` の該当箇所もタグ名の例ではないため追随不要と判断）。`pnpm check` exit=0（36ファイル375テスト、着手前373）。`docs/requirements.md` 4.1節・`docs/glossary.md`「打刻日時 / ビルド日時」・`README.md`「タグ命名規則」章をJST明記に更新し、`develop/parameterization-candidates.md` 項目6に実施済みの旨を追記。`docs/`・`README.md` に残る「UTC」は「JST（UTC+9固定）」という説明の一部のみ。**JST化以外の未実装の食い違い（`TAG_FORMAT` 廃止・`apps[].tagNaming`・semver・プレースホルダ緩和）はこのタスクの範囲外として触っていない。**（コミット `29774b2`）

## T-136

**タスク**: `client` / `chart groups` という廃止済みの語彙の取り残しを一掃する。

## 背景

語彙は「設定ユニット（`unitPath` / `ConfigUnitPath`）」へ、集約の型名は `ChartAndApps` へ一本化済み（正典: `docs/glossary.md`「設定ユニット」「chartAndApps」の各項）。ところが**普通名詞としての「client」「chartグループ / chart groups」がコメント・ドキュメント・CLI出力に残っている**。`docs/glossary.md` は「旧称は `docs/history/` と `develop/` の過去エントリにのみ残る」と宣言しているので、現状はその宣言と食い違っている。

**置換してよいものと、してはいけないものを取り違えないこと**:

- 置換する: 単位を指す普通名詞としての `client`（例: 「1clientの」「clientごとに」「複数のclientに登録されうる」「該当clientが ERROR」）
- 置換しない: **ディレクトリ名・パスの例としての `tenant1/client1` `tenant2/client2` `central`**（設定ユニットのパス例として正しい）、`config-test/` と `docs/smoke-test.md` に出てくる**実在するフィクスチャのディレクトリ名**（`smoke-tenant2/client1` 等）、`GitlabClient` / `createClient` などGitLab APIクライアントの識別子、`sample-develop-client` というソースリポジトリ名
- **触らない**: `docs/history/` 配下、`develop/progress.md` の過去エントリ、`docs/requirements-grilling.md`（いずれもアーカイブ扱い）

## やること

1. `src/` のコメントの `client`（`grep -rn "client" src/ | grep -v GitlabClient | grep -v createClient` で洗い出す。12箇所ある）を「設定ユニット」へ書き換える。対象ファイル: `lib/gitlab/batch-cache.ts` / `lib/config/validate.ts` / `steps/shared/step-outcome.ts` / `steps/shared/describe-plan.ts` / `steps/apply-updates/sub-steps/collect-mr-entries.ts` / `steps/build-plans/build-plans.ts` / `steps/build-plans/sub-steps/resolve-latest-tags.ts` / `steps/build-plans/sub-steps/shared/values-yaml-draft.ts` / `steps/build-plans/sub-steps/stage-image-tag-updates.ts` / `steps/build-plans/sub-steps/stage-helm-target-branch-updates.ts`
2. `src/lib/config/schema.ts` の `loadAnchors(clientDirPath: string)` の引数名を `unitDirPath` に直す（呼び出し元の `chart-and-apps.ts` は既に `unitDirPath` という名前を使っており、そちらに揃える）
3. `scripts/lint/verify-config/remote-cache.ts` のコメントの `client/app` も同様に直す
4. **`scripts/lint/validate-config.ts:32` の出力 `config OK: N chart groups, M apps` を直す。** これは廃止語彙であるうえに、数えているのは `chartAndAppsList.length`（＝設定ユニットの数）でchartディレクトリの数ではないので**表示として二重に誤っている**。「N 設定ユニット, M apps」のように、数えている実体と一致する表記にする
5. `README.md` の `client` 表記（「該当clientが `ERROR`」）と、`TARGET_UNITS` の説明が `"<tenant>/<client>" 形式` のままになっている箇所を、環境変数表と同じ「`unitPath`（深さ1なら `"central"`、深さ2なら `"tenant1/client1"`）」の言い方に揃える。**同じ `"<tenant>/<client>" 形式` の記述が `.env.example` と `.gitlab-ci.yml` の2箇所（`spec.inputs.TARGET_UNITS` と `variables.TARGET_UNITS`）にもあるので一緒に直す**
6. `.gitlab-ci.yml` の `validate-config-remote` ジョブのコメント「1つのclientの設定ミスで全clientの更新が止まる…該当clientだけを ERROR にする」も直す
7. `docs/architecture.md` の `client`（`build-plans/sub-steps/` の責務表3行、`CONCURRENCY_LIMIT` の節、キャッシュの節、`values-yaml-draft` の節）を直す
8. `docs/smoke-test.md` の普通名詞としての `client`（「各clientのMR」「そのclientは SKIPPED」）を直す。**ディレクトリ名としての `client1` / `client2` はそのまま残す**
9. `test/lib/config/config.test.ts` のヘルパー `function unit(tenant: string, client: string)` の引数名と、テスト名の「複数tenant/client」という言い回しを設定ユニットの語彙に直す

## 完了条件

- `grep -rn "client" src/ scripts/ | grep -v GitlabClient | grep -v createClient | grep -v develop-client` の結果が0件（残す場合は理由を `evidence` に書く）
- `grep -rn "chart group" .` が `docs/glossary.md`（廃止の経緯を語る箇所）と `docs/history/` 以外に無い
- `pnpm check` が通り、テスト件数が **418件から減っていない**（実際の数を `evidence` に書く）
- `pnpm lint:validate-config` を実行し、変更後の出力文言を `evidence` に貼る

## 注意

- **振る舞いは1つも変えない**。コメント・引数名・表示文字列・ドキュメントだけの変更
- `docs/glossary.md` の「表記ゆれ（解消済み）」の記述は**旧称を説明している箇所なので書き換えない**
- `/loop /next-task` に載せてよい

**difficulty**: sonnet

**evidence**: `src/`10ファイル14箇所のコメント・`loadAnchors()`の引数名（`clientDirPath`→`unitDirPath`）・`scripts/`3ファイル・`README.md`・`.env.example`・`.gitlab-ci.yml`・`docs/architecture.md`・`docs/smoke-test.md`・テスト2ファイルの語彙を「設定ユニット」に統一。`scripts/lint/validate-config.ts` の出力は `N chart groups` → `N 設定ユニット` にし、`tsx scripts/lint/validate-config.ts config-test` が `config OK: 3 設定ユニット, 5 apps` と**数えている実体（chartAndAppsList.length＝設定ユニット数）に一致する**ことを実測。`grep -rn client src/ scripts/`（GitlabClient/createClient/develop-client 除く）の残り8件はすべて `"tenant1/client1"` 等のパス例と `config-test/` の実フィクスチャ名で、タスクが明示的に残すとした対象。メイン側で `pnpm check` exit=0（36ファイル418テスト、着手前と同数）。受け入れ時にメインで2点補正: テストヘルパー `unit()` の引数名を `(parentDir, childDir)` に揃え、`build-plans.test.ts` のテスト名の `複数client` も置換（委譲先が範囲外として残していた分）。

## T-137

**タスク**: `resolve-latest-tags.ts` の到達不能な分岐を畳み、`docs/coding-standards.md` の未到達リストから該当行を消す。

## 背景

`src/steps/build-plans/sub-steps/resolve-latest-tags.ts` の `resolveLatestTag()` に次の形がある:

```ts
if (trackedHeadTagNames.size > 0) {
  const latestAtHead = findLatestParsedTag(
    [...trackedHeadTagNames],
    app.branchToSync,
    app.tagNaming,
  )
  if (latestAtHead) {
    return { tag: latestAtHead, trackedHeadTagNames }
  }
}
```

`trackedHeadTagNames` は `resolveTrackedHeadTagNames()` が「`parseTag()` が undefined を返さなかったタグ名」だけを詰めた集合なので、**空でなければ `findLatestParsedTag()` は必ず値を返す**。つまり `if (latestAtHead)` の偽側には到達しない。`docs/coding-standards.md`「足すかどうか」の未到達リストにも「`if (latestAtHead)` の偽側 … `trackedHeadTagNames.size > 0` の時点でパース可能なタグが1件以上あるため到達しない」として載っている。

外側の `size > 0` ガードも冗長で、`findLatestParsedTag()` は空配列に対して undefined を返す。

同じドキュメントには前例がある: `src/utils/http.ts` の `isFatalStatus` にあった同種の未到達分岐は「テストではなくコード側の問題だった」として、型を狭めて分岐ごと削除済み。**今回もそれに倣ってコード側を直す**。

## やること

1. 上の二重の分岐を、`findLatestParsedTag()` の結果の undefined 判定1つに畳む（`trackedHeadTagNames.size > 0` のガードを外す）。`trackedHeadTagNames` は戻り値にそのまま載るので、集合の組み立て自体は消さない
2. 「HEADを指すタグはどれも同じコミットを指すため中身は同じだが、返す値を一意に決めるためだけに順序キーが最大のものを選ぶ」というコメントは**残す**（コードから読み取れない決定性の理由なので、`docs/coding-standards.md` のコメント規約に照らして残すべき種類）
3. `docs/coding-standards.md`「埋めないと決めた穴」の表から `if (latestAtHead)` の行を削除する。**表の前文にある「現時点で埋めないと決めているのは次の4件」という件数も直す**

## 完了条件

- `pnpm check` が通り、テスト件数が **418件から減っていない**（実際の数を `evidence` に書く）
- `pnpm test:coverage` を取り、`resolve-latest-tags.ts` の未カバー分岐が変更前より減っている（または0になっている）ことを確認して `evidence` に書く
- `test/steps/build-plans/sub-steps/resolve-latest-tags.test.ts` の27件が**1件も落ちず、1件も消えていない**

## 注意

- **振る舞いを変えない**。HEADを指すタグが1件以上あるとき最新を返す、無いときはタグ自動作成の可否判定へ進む、という流れは同じ
- `docs/coding-standards.md` は正典なので、コードを直したことと表の行を消したことが対応していること
- `/loop /next-task` に載せてよい

**difficulty**: sonnet

**evidence**: `resolveLatestTag()` の二重ガード（`trackedHeadTagNames.size > 0` + `if (latestAtHead)`）を、`findLatestParsedTag()` の結果の undefined 判定1つに畳んだ。決定性の理由コメントは残置。メイン側で実測: `pnpm check` exit=0（36ファイル418テスト、着手前と同数）、`pnpm test:coverage` の全体 branch が 97.62% → **97.91%** に上がり、`resolve-latest-tags.ts` は未カバー一覧から消えた（変更前は Uncovered Line 120）。`docs/coding-standards.md`「埋めないと決めた穴」の表から該当行を削除し、前文を「4件」→「3件」に修正。

## T-138

**タスク**: 冗長な条件分岐と、`const` 原則に反する再代入を畳む。

## 背景

コーディング規約は「変数は基本 `const`。コレクションも不変に保つ」（`CLAUDE.md` / `docs/coding-standards.md`）。次の2箇所が規約または簡潔さの点で引っかかる。

### 1. `src/steps/build-plans/sub-steps/stage-image-tag-updates.ts` の `stageImageTagUpdate()`

```ts
if (previousTagName === latestTagName) return { ...acc, draft }
if (trackedHeadTagNames.has(previousTagName)) {
  return { ...acc, draft }
}
```

**同じ値を返す2つの分岐が連続していて、しかも片方だけブレースが付いている**。1つの条件式にまとめる。まとめたうえで「なぜ2つの理由でスキップするのか」（タグ名が同じ／タグ名は違うがHEADを指すので中身が同じ）が読み取れるようコメントを1行に集約する。

### 2. `src/domain/tag-format.ts` の `compileTagPattern()`

`let source = "^"` と `let lastIndex = 0` を `for` の中で再代入しながら正規表現の文字列を組み立てている。`format.matchAll(PLACEHOLDER_PATTERN)` の結果は配列にできるので、**再代入なしで組み立てられる**（`reduce` で `{ source, lastIndex }` を畳むか、`[...matchAll]` から「直前のリテラル + プレースホルダの変換結果」の配列を作って `join("")` する）。読みやすさを損なわない形を選ぶこと。**畳んだ結果がかえって読みにくくなるなら、無理に変えず「なぜ再代入なのか」の理由をコメントに書いて残す判断でもよい**（その場合は理由を `evidence` に書く）。

同じファイルの `compareOrderKeys()` が `Array.from({ length }, ...)` で全要素の比較を先に計算してから `.find()` している点も目に留まるが、**順序キーは高々数要素なので実害はなく、今の形のほうが宣言的に読める。触らない。**

## やること

1. 上の1を1つの条件に畳む
2. 上の2を再代入なしで組み立てる（または理由を残す判断をする）
3. あわせて、named import の並び順が揃っていない2箇所を昇順に直す（`src/steps/filter-targets/filter-targets.ts` の `{ type StepOutcome, ok, withHandling, settle }`、`src/steps/build-plans/sub-steps/stage-helm-target-branch-updates.ts` の `{ StageUpdatesAcc, BranchExists }`）。**oxfmt の `sortImports` はモジュール間の並びだけを見て波括弧の中までは揃えないため、これは手で揃えるしかない**

## 完了条件

- `pnpm check` が通り、テスト件数が **418件から減っていない**（実際の数を `evidence` に書く）
- `test/domain/tag-format.test.ts`（57件）と `test/steps/build-plans/sub-steps/stage-image-tag-updates.test.ts` が1件も落ちない

## 注意

- **振る舞いを1つも変えない純粋なリファクタ**。テストは足さない（既存テストが守り手）
- `/loop /next-task` に載せてよい

**difficulty**: sonnet

**evidence**: 3項目とも実施。(1) `stageImageTagUpdate()` の同値を返す2連続 return を `||` 1つに統合、(2) `compileTagPattern()` の `let source`/`let lastIndex` を `reduce` で畳んで**`let` を全廃**（プレースホルダ→パターン片の変換は `toPatternPart()` に切り出し）、(3) named import 2箇所を昇順に。委譲先が正規表現の連結順序をわざと逆転させると `tag-format.test.ts` が57件中13件落ちることを確認済み（書き換えが既存テストで守られていることの裏付け）。メイン側で `pnpm check` exit=0（36ファイル418テスト、着手前と同数）。受け入れ時にメインで1点補正: 新設コメントの「再代入をやめた形」という**昔の経緯**の記述を、`lastIndex` が何を指すかの説明に置換（`docs/coding-standards.md` のコメント規約違反のため）。

## T-139

**タスク**: `collect-mr-entries.ts` の「差分が無いplanを外すフィルタ」を、実際に起きうる入力かどうかで判断して倒す。

## 背景

`src/steps/apply-updates/sub-steps/collect-mr-entries.ts` の先頭に

```ts
const updatedPlans = plans.filter((plan) => plan.updates.length > 0)
```

がある。ところが `AppUpdatePlan` の型定義（`src/types/types.ts`）には「`updates`は差分がある箇所だけを含み、**空ならこのAppUpdatePlan自体を生成しない**（＝そのアプリは全箇所が反映済み）」と書かれており、実際 `stage-image-tag-updates.ts` は `updates.length === 0` のとき `AppUpdatePlan` を積まずに次のappへ進む。**本番の経路では `updates` が空の plan は `collect-mr-entries.ts` に到達しない。**

つまりこのフィルタは、型でも実装でも保証されている不変条件をもう一度実行時に確かめている防御コードである。そして `test/steps/apply-updates/sub-steps/collect-mr-entries.test.ts` と `test/steps/apply-updates/sub-steps/build-mr-content.test.ts` は `makePlan({ updates: [] })` で**本番では起こりえない入力を作ってこのフィルタを固定している**。`docs/coding-standards.md`「消すかどうか」の表の2行目（型が既に保証している性質を実行時に確認している）に当たる可能性がある。

**ただし単純に消すのが正解とは限らない**。`AppUpdatePlan.updates` の型は `readonly ImageTagUpdate[]` で空配列を許すので、不変条件はコメントにしか書かれていない。

## 解くべき論点

次の3つから選び、理由を `evidence` に書く:

- (a) **フィルタを消す**。`stage-image-tag-updates.ts` が空の plan を作らないことが唯一の生成経路なので、実行時の再確認は不要。あわせて `makePlan({ updates: [] })` を使うテストを、起こりうる入力（`plans` が空配列、helm更新のみでイメージタグ更新が無いケース）に置き換える
- (b) **フィルタは残し、型で不変条件を表す**。`updates` を「1件以上」と表せる型にして、フィルタが不要であることを型が語る形にする（`readonly [ImageTagUpdate, ...ImageTagUpdate[]]` 等）。**この案を採るなら `docs/architecture.md`「用途別の型エイリアスを作らない」「型の置き場所」と衝突しないかを確認すること**
- (c) **今の形を残す**。残すなら「なぜ型で保証されている条件を実行時にも見るのか」をコメントに書き、`docs/coding-standards.md` の未到達／防御的コードの扱いと整合させる

判断材料: `docs/architecture.md`「エラーは『fatalは例外・それ以外は戻り値』の2チャネル」の「対象外」の考え方、`docs/coding-standards.md`「消すかどうか」の表と `isFatalStatus` の前例（**未到達分岐はテスト側ではなくコード側を直した**）。

## やること

1. 上の論点を判断する
2. 決めた方針で `src/steps/apply-updates/sub-steps/collect-mr-entries.ts` とテストを直す
3. 判断の理由が「今後の判断を変えるもの」なら `docs/architecture.md` の「設計判断」に節を1つ足す。そうでなければドキュメントは触らない

## 完了条件

- 上の3案のどれを採ったかと理由が `evidence` に3行以内で書かれている
- `pnpm check` が通る。テスト件数が減る場合は、**減った分がどのテストで、なぜ消してよいと判断したか**を `evidence` に書く
- `docs/coding-standards.md`「削除の手続き」に従い、テストを消すなら `it.skip` にして `pnpm test:coverage` で「そのテストだけが通していた行・分岐が無いこと」を確認してから消す

## 注意

- **MR本文の中身は変えない**。`test/main.e2e.test.ts` の3件が通ることで担保する
- `/loop /next-task` に載せてよい

**difficulty**: sonnet

**evidence**: **(a) フィルタを消す**を採用。`AppUpdatePlan` の生成経路は `stageAppImageTagUpdates` の1箇所だけで、`updates` が空の plan は production では作られないため消費側の再確認は不要。(b) は委譲先が実際に書いて検証し、TypeScript が `.length === 0` の早期returnを非空タプル型へのnarrowing に使わない（`TS2322`）ため `as` か専用factoryが要ると判明したので不採用。テストは3箇所の `makePlan({ updates: [] })`（本番では起こりえない入力）を `plans: []`（helm向き先ブランチのみのMR＝実際に起こりうる入力）に置換。テストは1件も消していないので削除の手続きは不要。判断は `docs/architecture.md`「配列の非空を型で保証するより、生成経路を1つに保つ」に節を追加し索引にも行を足した。メイン側で `pnpm check` exit=0（36ファイル418テスト、増減なし）、`test/main.e2e.test.ts` 3件も通過。

## T-140

**タスク**: 同じ分岐を重ねて通しているテストを畳み、繰り返しの多いテストを表形式にまとめる。

## 背景

`docs/coding-standards.md`「テスト」節の「消すかどうか」の表と「削除の手続き」が正典。**手続きを飛ばして消さないこと。**

洗い出した候補は3つ。

### 1. `test/domain/tag-format.test.ts` の `validateTagFormat`（消す候補）

「{branch} 単独のフォーマットは例外をスローする」「{time} 単独のフォーマットは例外をスローする」「{date} 単独のフォーマットは例外をスローする」の3件は、**すぐ上にある「{branch} がないとき例外をスローする」「{date} がないとき例外をスローする」と同じ分岐**（`REQUIRED_PLACEHOLDERS` の出現回数が1でない）を通しているだけ。表の1行目「同じ入力分岐を別のテストが既に通している」に当たる。

**ただし `T-134` の完了条件に「`{branch}` 単独・`{time}` 単独・`{date}` 単独のテンプレートがいずれも設定エラーになることがテストで確認できている」と明記されており、意図して足されたテストである。**消すのではなく1件の表形式テストに畳んで「単独形はすべて設定エラー」という意図を残すほうが妥当かどうかを判断すること。

### 2. `test/utils/logger.test.ts` の `redact`（簡潔にする候補）

`token` / `access_token` / `authorization` / `password` / `secret` の5件が、キー名以外まったく同じ本体を持つ。`SENSITIVE_KEYS` の全要素を1つの表で回す形にすれば、**定数に要素が増えたときテストを足し忘れないという利点も付く**。

### 3. `test/utils/http.test.ts` の `isFatalError`（簡潔にする候補）

`ECONNREFUSED` / `ENOTFOUND` / `ETIMEDOUT` の3件が同じ形。同様に表にできる。

## やること

1. 候補ごとに「消す」「表に畳む」「そのまま残す」を判断する。**畳む場合もアサーションの中身は1つも減らさない**（`it.each` を使えばケース名も個別に出る）
2. `it.each` はこのリポジトリでまだ一度も使われていない。導入するなら**この3箇所で書き方を揃える**こと
3. 消す判断をしたものだけ、`docs/coding-standards.md`「削除の手続き」の2ステップ（`it.skip` にして `pnpm check` が落ちないこと → `pnpm test:coverage` でそのテストだけが通していた行・分岐が無いこと）を実際に踏み、結果を `evidence` に書く
4. 「そのまま残す」と判断したものがあれば、`docs/coding-standards.md`「個別の判断（実施済み）」の箇条書きに1行足して、次に同じ調査をしなくて済むようにする

## 完了条件

- `pnpm check` が通る
- テスト件数の増減とその理由が `evidence` に書かれている（**表に畳んだ場合、`it.each` は1ケース1件として数えられるので件数は基本的に変わらない**）
- 消したテストがある場合、削除の手続き2ステップを踏んだ結果が `evidence` にある

## 注意

- **MR本文のテスト（`build-mr-content.test.ts`）には手を付けない**。`docs/coding-standards.md` が「書式は他に守る手段が無いので残す」と明記している
- 型が保証している性質の確認・実装の内部構造をなぞるだけのテストが他にも見つかったら、同じ手続きで扱ってよい。見つからなければ無理に探さない
- `/loop /next-task` に載せてよい

**difficulty**: sonnet

**evidence**: 3候補とも**消さず `it.each` に畳む**判断。(1) 単独形3件は既存テストと同じ分岐だが「単独形はすべて設定エラー」は `docs/requirements.md` 4.1節の仕様なので意図を残した。(2) redact の5キーと (3) isFatalError のネットワークcode 3件は定型の繰り返しなので表化（(3) は実際に別々のOR分岐を通しているので削除対象ではない）。`it.each` は`it.each([...])("%s ...", (x) => {...})` の形で3箇所とも統一（リポジトリ初導入）。`SENSITIVE_KEYS` はテストのための export を避けテスト側にリテラルで保持。`authorization` だけ `logger.error` だったのは `logger.info` に統一（redact は`formatLog()` 内でレベルによらず走る純粋関数で、error 経路は別の describe が担保）。テストを1件も消していないので削除の手続きは対象外。メイン側で `pnpm check` exit=0（36ファイル418テスト、増減なし）。受け入れ時にメインで1点補正: 追記したコメント2箇所の`T-134` 参照が「タスク番号を書かない」規約違反だったので仕様（requirements.md）参照に置換。

## T-141

**タスク**: `README.md` の、実物とズレている記述を直す。

## 背景

洗い出しで見つかった食い違いは3つ。

### 1. 実行ログの例の構造が実装と違う（誤り）

`README.md`「実行ログの例」の `update_chart` の行が

```json
"apps":[{"projectName":"my-app","latestTag":"...","updates":[...],"helmTargetBranchUpdates":[]}]
```

となっていて、**`helmTargetBranchUpdates` が app のオブジェクトの中に入っている**。実装（`src/steps/apply-updates/apply-updates.ts` の `logger.info`）では `apps` と `helmTargetBranchUpdates` は**兄弟のフィールド**で、app 1件分を作る `describePlan()`（`src/steps/shared/describe-plan.ts`）が返すのは `projectName` / `latestTag` / `updates` の3つだけ。ログを grep する運用のドキュメントとして、この構造の誤りは実害がある。

### 2. `run_start` の例のフィールドが足りない

同じ節の `run_start` の行は `gitlabUrl` / `dryRun` / `concurrencyLimit` の3つしか載せていないが、実装（`src/main.ts`）は `configDirPath` / `targetChart` / `targetUnits` も出す。

### 3. Quick Start のディレクトリ例が深さ2固定を前提にしている

`mkdir -p config/my-team-chart/my-tenant/my-client` という例だが、**設定ユニットは深さ1でよい**（「テナント分けが不要ならダミーの階層を作らず深さ1で構いません」と同じREADMEの「config/」節に書いてある）。最初に読む Quick Start が深さ2を既定であるかのように見せているのは、ダミー階層を作らせないという要件変更の意図と逆行する。

## やること

1. `src/main.ts` と `src/steps/apply-updates/apply-updates.ts` と `src/steps/shared/describe-plan.ts` を実際に読み、**ログ例3行を実装が出力する形に直す**。フィールドの順序も実装の順序に合わせる
2. Quick Start の `mkdir` の例を深さ1（例: `config/my-team-chart/central`）にし、深さ2も使えることが分かる1行を添える
3. 例のタグ名・日時の書式が現在の既定テンプレート（`{branch}-build-at-{date}-{time}`、JST）と整合しているかも確認する

## 完了条件

- 直したログ例のフィールド構成が、`src/main.ts` / `apply-updates.ts` / `describe-plan.ts` の実装と1対1で対応している（対応を `evidence` に1行で書く）
- `pnpm check` が通る（README のみの変更なら当然通るが、確認はする）

## 注意

- **ログの例を「実際に動かして得た出力」に差し替える必要はない**。実装を読んで組み立てた正しい形でよい。実GitLabへは接続しない
- `TARGET_UNITS` の説明文の語彙は別タスク（`T-136`）の担当。ここでは触らない
- `/loop /next-task` に載せてよい

**difficulty**: haiku

**evidence**: ログ例3点を実装と1対1に対応させた: `update_chart` は `helmTargetBranchUpdates` を `apps[]` の外（兄弟フィールド）へ戻し、app 1件分は `describePlan()` が返す `projectName`/`latestTag`/`updates`の3つだけに。`run_start` に `configDirPath` を追加。Quick Start の `mkdir` を深さ1（`config/my-team-chart/central`）にして深さ2も可と併記。タグ名の例は既定テンプレートと整合済みで変更不要。受け入れ時にメインで1点補正: 委譲先が `run_start` に `targetChart`/`targetUnits` の値を載せたが、**続く行で teamA-chart と teamB-chart の両方が処理されており絞り込み実行と矛盾**していたため、絞り込み無しの例に戻し（未指定時は `undefined` で JSON から落ちる）、その旨の注記1文を添えた。メイン側で `pnpm check` exit=0（36ファイル418テスト）。

## T-142

**タスク**: `CLAUDE.md` と `docs/architecture.md` に残っている、コードに実在しない識別子を直す。

## 背景

洗い出しで見つかった食い違いは4つ。**どれも「読んだ人がコードを探しに行って見つからない」種類のズレ**で、正典としての信頼性に直接響く。

### 1. `runPipeline()` という関数は存在しない（5箇所）

`src/main.ts` が公開しているのは `run(env)` で、その内側の非公開関数が `runProcess(env)`。`runPipeline()` という名前はコードベースのどこにも無い。にもかかわらず:

- `CLAUDE.md`「アーキテクチャ概要」の冒頭1文と、原則1の本文
- `docs/architecture.md` の見出し「### `src/steps/` — `runPipeline()` が直接呼ぶフラットな3ステップ」
- `docs/architecture.md`「新しいコードを置く場所」の表の1行
- `docs/architecture.md`「FatalErrorは後続ステップも止める」の本文

の5箇所で使われている。**`run()` と `runProcess()` のどちらに置き換えるかは箇所ごとに違う**（ステップを順に呼んでいるのは `runProcess()`、環境設定を受け取る入口は `run()`）ので、`src/main.ts` を読んでから決めること。

### 2. `BuildPlanContext` という型は存在しない

`docs/architecture.md`「型の置き場所」の表の5行目が「ステップ内部の作業用の型」の例として `BuildPlanContext` を挙げているが、この型名は `src/` に無い。同じ行の他の3つ（`FilterTargetsResult` / `ValuesYamlDraft` / `LabeledTarget`）は実在する。**実在する別の例に差し替えるか、その1つを落とす。**なお同じドキュメントには「#### 型の置き場所は`src/`全件と突き合わせて確かめてある」という節があるので、**その節の主張が現状で成り立っていないことになる。突き合わせ直した結果を反映すること。**

### 3. `formatClientRef` / `parseClientRef` という関数も存在しない

「1ファイルにまとめるか分けるか」の「まとめる合図」3番目が、対になっている関数の例として挙げている。実在しないうえに廃止済みの `client` 語彙でもある。**このリポジトリに実在する対の例に差し替える**（`getValueAtAnchor`/`setValueAtAnchor`、`readValuesYamlDraft`/`writeValuesYamlDraft`、`left`/`right` などが候補）。

### 4. 冒頭の「40KB超あるため」がファイルの実サイズと合っていない

`docs/architecture.md` は現在 **75KB**（`ls -la docs/architecture.md` で確認できる）。「このファイルは通読しない」という注意の根拠になっている数字なので、実態に合わせる。**`CLAUDE.md` 側にはサイズの記述が無いので、そちらは触らなくてよい。**

## やること

1. `src/main.ts` を読み、`runPipeline()` の5箇所をそれぞれ `run()` / `runProcess()` の正しいほうに直す
2. `docs/architecture.md`「型の置き場所」の表の例を、`src/` に実在する型だけになるよう突き合わせ直す。**表の下の箇条書きで言及されている型名も同時に確認する**
3. 「まとめる合図」3番目の例を実在する対に差し替える
4. 冒頭のサイズの記述を実サイズに合わせる
5. 直した後、**`docs/architecture.md` と `CLAUDE.md` に出てくる関数名・型名を `grep` で `src/` と突き合わせ、他にも実在しないものが無いか確認する**（見つかったら一緒に直し、`evidence` に列挙する）

## 完了条件

- `grep -rn "runPipeline\|BuildPlanContext\|formatClientRef\|parseClientRef" . | grep -v docs/history | grep -v develop/` が0件
- 手順5の突き合わせを実施した証拠（確認した識別子の数、見つかった追加の食い違い）が `evidence` にある
- `pnpm check` が通る

## 注意

- **`docs/architecture.md` は通読しない。** 冒頭の「節の索引」で節を特定し、`sed -n '/^#### 見出し/,/^#\{1,4\} /p' docs/architecture.md` でその節だけを読む（ファイル自身がそう指示している）
- `docs/history/` 配下はアーカイブなので、当時の記述のまま残す
- `/loop /next-task` に載せてよい

**difficulty**: sonnet

**evidence**: `runPipeline()` の5箇所は**全て `runProcess()`**に統一（`run()` はログ・計測のラッパで、steps/ を実際に順次 await するのは `runProcess()` のため。`run()` 相当の箇所は無かった）。「型の置き場所」表の `BuildPlanContext` → 実在する `BuildPlansResult` に差し替え、「まとめる合図」3番目の例を `getValueAtAnchor`/`setValueAtAnchor`（`lib/helm.ts` に実在する対）に、冒頭のサイズを 40KB超 → 75KB超（実測76,756バイト）に修正。機械的な突き合わせで**追加の食い違いを1件発見**: `resolveWebUrl()` は実在せず、実体は `gitlabCache.getProjectWebUrl()` だったので修正。確認数は関数名35件・型名31件（TS組み込み/外部ライブラリ/概念語を除外後）。「型の置き場所は`src/`全件と突き合わせて確かめてある」節の件数も45→56件に更新し、**メイン側で独立に検算して一致を確認**（`export type|interface` の実数が types.ts 18・brand.ts 12・その他26＝56）。`pnpm check` exit=0（36ファイル418テスト）。

## T-143

**タスク**: `escapeRegExp()` が実際に効いていることを守るテストを足す。

## 背景

T-138（`compileTagPattern()` の再代入の排除）を実行した際、委譲先が**既存テストの穴**を見つけた:

> `escapeRegExp` の呼び出しを1つ外す（正規表現特殊文字のエスケープを飛ばす）だけでは既存テストは1件も落ちなかった。テストのテンプレート・ブランチ名フィクスチャに正規表現特殊文字（`.` `+` など）を含むケースが無いため。

つまり `src/domain/tag-format.ts` の `escapeRegExp()` は**誰にも守られていない**。これは T-138 が生んだ穴ではなく元からある被覆漏れだが、`compileTagPattern()` を書き換えた直後なので放置しない。

**実害のある壊れ方をする**: `README.md`「タグ命名規則」は `template` の**並び順と区切り文字は自由**と明記しており、`{branch}.{date}` や `{branch}+{date}-{time}` のようなテンプレートは正当な設定である。エスケープが壊れると `.` が「任意の1文字」として解釈され、**本来マッチすべきでないタグ名がマッチする**（＝別のタグを最新と誤認して values.yaml に書く）。しかも例外は出ず、静かに誤る。

`docs/coding-standards.md`「足すかどうか」は「埋めるのは `docs/requirements.md` が明示している振る舞いだけ」としているが、区切り文字の自由度は要件として明示されている（`docs/requirements.md` 4.1節）ので、この穴は埋める側に当たる。

## やること

1. `test/domain/tag-format.test.ts` に、**正規表現の特殊文字を区切り文字に含むテンプレート**のテストを足す。最低限、次の2つが落ちることを確認できる形にする:
   - エスケープが無いと**マッチしてはいけないタグ名がマッチしてしまう**ケース（`.` が任意の1文字として働くことを突く。例: テンプレート `{branch}.{date}` に対してタグ名 `main-20260101` を渡すと、エスケープがあれば `undefined`、無ければマッチしてしまう）
   - 特殊文字入りのテンプレートで**正しいタグ名は従来どおりパースできる**こと（回帰）
2. ブランチ名側にも特殊文字が入りうる（`compileTagPattern()` は `branchLiteral` も `escapeRegExp()` に通している）。`branchToSync` に `.` を含むブランチ名（例: `release/1.0`）のケースも1件足す
3. 足したテストが**本当に守り手になっている**ことを確認する: `escapeRegExp()` の呼び出しを一時的に外して**落ちること**を実際に確かめ、件数を `evidence` に書く。確認後は必ず元に戻す

## 完了条件

- `escapeRegExp()` の呼び出しを外すと足したテストが落ちる（件数を `evidence` に書く）。**この確認をしていないテストは守り手になっていないので不可**
- `pnpm check` が通り、テスト件数が **418件から増えている**（実際の数を `evidence` に書く）
- 既存の57件（`tag-format.test.ts`）が1件も落ちていない

## 注意

- **コードは変えない。** `escapeRegExp()` の実装は正しいので、足すのはテストだけ
- テストの追加は最小限にする。`docs/coding-standards.md`「足すかどうか」の「未到達の行を全部は埋めない」に従い、**エスケープが効いていることを示す最小の組**にとどめる
- `/loop /next-task` に載せてよい

**dependencies**: T-138

**difficulty**: sonnet

**evidence**: `compileTagPattern()` が `escapeRegExp()` を呼ぶ**3箇所（プレースホルダ直前のリテラル／`{branch}` に埋める `branchLiteral`／末尾の残りリテラル）それぞれに、「壊れる例」と「回帰」の2件ずつ**を追加（テンプレート `{branch}.{date}`・`{branch}-{date}.`、ブランチ名 `release/1.0`）。**3箇所を個別に外すと、狙った1件だけがそれぞれ落ちる**ことを委譲先が確認し、メイン側でも `branchLiteral` の箇所で独立に再現（1 failed / 62 passed）してソースを復元。`pnpm check` exit=0、テストは 418 → **424件**（+6）。変更は `test/domain/tag-format.test.ts` のみで`src/` は無変更（`git status --short` が1行）。

## T-144

**タスク**: タグ形式の仕様を単純化する。semverモードを廃止し、`{time}`を必須に戻し、`apps[].tagNaming`（`mode`判別共用体）を`apps[].tagFormat`（文字列・必須）にする。あわせて用語を「タグ命名規則」→「タグ形式」に統一する。

## 背景

タグ命名規則をapp単位の設定にしたあと（`config.yaml`の`apps[].tagNaming`）、semverモードと`{time}`任意化を実装した結果、コードが実需要に対して過剰に複雑になった。ユーザーとのgrillingで**実物のタグは2パターンだけ**だと確定した:

- `{branch}-build-at-{date}-{time}`
- `{date}-{time}-{branch}`

**どちらも3プレースホルダ全部入り**で、違いは並び順と区切り文字だけ。semverでタグを打つソースリポジトリも、`{time}`を含まない形式のリポジトリも**予定にすら無い**。`config/`の登録は0件なので、削除しても既存利用者への影響は無い。

一方で「形式が2種類ある」以上、**app単位で設定可能にすること自体は正しい**（そこは削らない）。**自由記述テンプレートも維持する**（並び順が自由でないと2形式を表せないため）。

現状の実装（削る対象）:

- `src/domain/tag-format.ts`（284行）: `SEMVER_PATTERN` / `NUMERIC_IDENTIFIER_PATTERN` / `parseSemverTag()` / `toPrereleaseSegments()` / `compareOrderKeys()` / `compareSegments()` / `compareTags()`(export) / `canCreateTag()` / ブランド型 `CreatableTagNaming` / `OPTIONAL_PLACEHOLDERS` / `DEFAULT_TAG_TEMPLATE`
- `src/types/types.ts`: `TagNaming`（`mode`判別共用体）・`TagOrderKey`、`ParsedTag.orderKey`
- `src/lib/config/schema.ts`: `TagNamingTemplateSchema` / `TagNamingSemverSchema` / `TagNamingSchema`(discriminatedUnion) / `DEFAULT_TAG_NAMING` / `AppOperationalSchema.tagNaming`
- `src/steps/build-plans/sub-steps/resolve-latest-tags.ts`: `canCreateTag()`分岐と`skip_app`警告ログ
- `src/steps/build-plans/sub-steps/stage-image-tag-updates.ts`: `latestTag.tag === undefined`の分岐（58-61行付近）
- `src/steps/build-plans/sub-steps/shared/types.ts`: `LatestTagResolution.tag: ParsedTag | undefined`

用語の状況: コード側の識別子は既に`tag-format.ts` / `TagFormat` / `validateTagFormat()`と"format"系で揃っているのに、日本語だけが「命名規則」で浮いている。アーカイブを除いて**13ファイル43箇所**に「命名規則」がある（`docs/architecture.md` 10・`docs/requirements.md` 9・`README.md` 8・`docs/glossary.md` 6・`src/` 13・`test/` 3）。うち何割かはsemver削除で行ごと消える。

## 解くべき論点

1. **`compareTags()`のexportを消したあと、`findLatestParsedTag()`内で何をどう比べるか。** `ParsedTag.orderKey`を`builtAt: Date`に戻すので日時比較1本になるが、`scripts/smoke/smoke-fixture.ts`（現在114行付近で`compareTags(latestTag, seedTag) > 0`）は`builtAt`の直接比較に戻る。**`builtAt`自体は必ず残すこと**（並び順が自由なので`v{time}_{branch}__{date}`のような形が書け、タグ名の辞書順と日時順は一致しない。「名前の大小で比べればいい」は成立しない）
2. **`{time}`必須化に伴い`compileTagPattern()`・`fillTagFormat()`・`parseTemplateTag()`をどこまで戻すか。** `{time}`任意対応で入った分岐（`match?.groups?.["time"] ?? "000000"`など）は不要になる。`escapeRegExp()`とプレースホルダ位置の畳み込みロジックは**維持する**（自由記述を残すため）
3. **`DEFAULT_TAG_TEMPLATE`を`src/`から消したあと、テンプレート文字列`{branch}-build-at-{date}-{time}`が`test/helpers.ts`・`scripts/smoke/smoke-fixture.ts`・`config-test/`の3箇所に重複する。** これを許容するか、どこかに寄せるか。「テストのためだけの`export`はしない」規約（`CLAUDE.md`）と、`src/`に既定値の概念が無くなることの両方を満たす形を選ぶ
4. **`tagFormat`必須化のZodエラーメッセージ。** 未指定のとき、何をどこに書けばよいか分かる文言にする（`config/`は登録0件なので移行対応は不要）
5. **用語置換で、`docs/glossary.md`の見出し`### タグ命名規則`を参照しているアンカーリンク（`#タグ命名規則`）が他ファイルに無いか。** `README.md:208-209`に`[タグ命名規則](#タグ命名規則)`があるので、少なくともここは追随が要る。他にも無いかgrepで確認する
6. **`validateTagNamingConsistency()`（`src/lib/config/validate.ts`）の新しい名前。** 検証自体は**残す**（`createResolveLatestTags()`のキャッシュキー`projectId:branchToSync`は変えないため、同一projectIdで形式が食い違うと誤共有が起きる）。比較は`JSON.stringify`から単純な文字列比較になる

## やること

1. `src/types/types.ts`: `TagNaming`・`TagOrderKey`を削除。`ParsedTag.orderKey` → `builtAt: Date`。`AppConfig.tagNaming: TagNaming` → `tagFormat: TagFormat`
2. `src/domain/tag-format.ts`: 上記「背景」に挙げたsemver関連・`canCreateTag`関連・`DEFAULT_TAG_TEMPLATE`を削除。`validateTagFormat()`の検証を「`{branch}`/`{date}`/`{time}`の3つとも各1回必須、それ以外のプレースホルダは不可」に戻す。`parseTag()`・`buildNewTag()`の引数を`TagNaming`から`TagFormat`に変える
3. `src/lib/config/schema.ts`: `tagNaming`の判別共用体を`tagFormat: z.string().transform(validateTagFormat)`の**必須**フィールドに置き換える。既定値は持たせない
4. `src/lib/config/validate.ts`: `validateTagNamingConsistency()`を改名し、比較を文字列比較にする。呼び出し元（`src/lib/config/config.ts`）も追随
5. `resolve-latest-tags.ts`: `canCreateTag()`分岐と`skip_app`ログを削除し、HEADにタグが無ければ必ず作成する形に戻す。`shared/types.ts`の`LatestTagResolution.tag`を`ParsedTag`（非undefined）に戻し、`stage-image-tag-updates.ts`のundefined分岐も削除する
6. タイブレーク（順序キー同値ならタグ名の降順）を削除する。テンプレートがapp単位で固定なら「同じ日時＝同じタグ名」で同値は原理的に起きない
7. テストを直す: `test/domain/tag-format.test.ts`（semverの3describe・`canCreateTag`のdescribeを削除、`{time}`なしテンプレートのケースを削除、`DEFAULT_NAMING`/`creatableNaming()`ヘルパを整理）、`test/steps/build-plans/sub-steps/resolve-latest-tags.test.ts`、`test/steps/build-plans/sub-steps/stage-image-tag-updates.test.ts`、`test/lib/config/schema.test.ts`、`test/lib/config/config.test.ts`、`test/helpers.ts`、`test/steps/apply-updates/apply-updates.test.ts`（`orderKey`フィクスチャ）。**T-143で足した`escapeRegExp()`の守りテスト6件と、並び順を入れ替えたテンプレートのテストは消さない**
8. `config-test/`の**5appすべて**に`tagFormat`を明示する。値は全て`{branch}-build-at-{date}-{time}`とし、**2形式目は入れない**
9. `scripts/smoke/smoke-fixture.ts`を追随させる（`compareTags`→`builtAt`比較、`DEFAULT_TAG_TEMPLATE`参照の解消）
10. 正典を追随させる。**semverの記述は完全に消す**（「検討して撤回した」という判断記録も残さない。経緯は`docs/history/tasks-archive.md`のT-132・T-134のevidenceに残っているのでそれで足りる）
    - `docs/requirements.md`: 4.1節（semver・`{time}`任意・タイブレークの記述を削除）、4.4節（`tagNaming`のスキーマ記述を`tagFormat`の必須文字列に）
    - `docs/architecture.md`: タグ関連4節のうち「タグの順序づけは順序キーに閉じ込め…」「最新タグが決まらないappはERRORにせず…」「semverモードは「HEADを指すタグ」に限り…」の**3節と索引行を削除**。残る1節はタイトルから`TAG_FORMAT`を落とす。633行付近の「環境変数を既定値として残さなかった理由（CIの`check`で検証できない）」は**識別子名を使わずに残す**（今も`config/`に置く根拠であるため）
    - `docs/glossary.md`: 「順序キー」エントリを削除、「打刻日時」の識別子欄を`builtAt`（`ParsedTag`のフィールド）に戻す、「最新タグ」「タグ自動作成」からsemverと「自動作成しない場合」の記述を削除、`TAG_FORMAT`の表記ゆれ2行（143-144行付近）を削除
    - `README.md`: 「タグ命名規則」章（43行付近）から`mode: semver`節を削除し`tagFormat`必須の記述に、mermaidフロー（150行付近）の「タグを自動作成できる命名規則?」判定ノードを削除、エラー扱いの表（250行付近）から「タグを自動作成しない命名規則ではそのアプリだけ見送り」を削除、`config.yaml`の説明（208-209行付近）を追随
11. 用語を「タグ命名規則」→「タグ形式」に統一する（`src/`・`test/`・`docs/architecture.md`・`docs/requirements.md`・`docs/glossary.md`・`README.md`）。`docs/glossary.md`の見出しも`### タグ形式`にし、参照しているアンカーリンクを追随させる。**`docs/history/`と`docs/requirements-grilling.md`は触らない**（アーカイブ）

## 完了条件

- `pnpm check` が通る（型チェック・lint・format・test）
- **テスト件数が減っている**こと。着手前は36ファイル424テスト。semverと`{time}`任意化の削除分だけ減るのが正しく、**増えていたら削り漏れ**。実際の件数を`evidence`に書く
- `grep -rn "semver\|tagNaming\|TAG_FORMAT\|命名規則" src test docs README.md config-test .gitlab-ci.yml` の結果が、`docs/history/`と`docs/requirements-grilling.md`を除いて**0件**であることを確認し、出力を`evidence`に書く
- `pnpm lint:validate-config config-test` が通る（**ディレクトリは位置引数で渡す。`CONFIG_PATH`環境変数では効かない**）
- **`tagFormat`を省略した`config.yaml`が設定エラーになる**ことがテストで確認できている
- **`{time}`を含まないテンプレート（`{branch}-{date}`）が設定エラーになる**ことがテストで確認できている
- **並び順を入れ替えたテンプレート（`{date}-{time}-{branch}`）が正しくパース・生成できる**ことがテストで確認できている（実物の2形式目にあたるため必須）
- `docs/architecture.md`の節の索引と実際の節見出しが一致している（削除した3節が索引に残っていない）

## 注意

- **`git revert` は使わない。** `882ebec`(T-134)の後にT-138（`compileTagPattern()`の`let`全廃）・T-140（`it.each`化）・T-143（`escapeRegExp()`の守りテスト6件）が同じファイルを触っており、revertすると残すべきそれらまで巻き戻る。手で削ること
- **1コミットにまとめる。** コード・テスト・正典・READMEを分けてコミットすると、正典とコードが食い違う中間状態が残る
- `compileTagPattern()`・`escapeRegExp()`・`fillTagFormat()`のプレースホルダ位置の畳み込みは**維持する**（自由記述テンプレートを残す判断のため）
- `validateTagNamingConsistency()`の検証**そのもの**は残す（消すのは名前と`JSON.stringify`比較だけ）
- `createResolveLatestTags()`のキャッシュキー`projectId:branchToSync`は**変えない**
- JST固定（`JST_OFFSET_MS`）の扱いは**変えない**
- 実GitLabへの書き込みはしない。`config-test/`はファイル上の`tagFormat`追記のみで、GitLab上のプロジェクトには触らない
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: opus

**evidence**: semverモードと`{time}`任意化を撤回し、`apps[].tagNaming`（`mode`判別共用体）を`apps[].tagFormat`（文字列・必須、既定値なし）へ。`ParsedTag.orderKey`→`builtAt: Date`に戻し、`TagNaming`/`TagOrderKey`/`CreatableTagNaming`/`canCreateTag()`/`compareTags()`(export)/`DEFAULT_TAG_TEMPLATE`を削除。`LatestTagResolution.tag`は非undefinedに戻り、app単位スキップ経路も消滅。用語は「タグ命名規則」→「タグ形式」に統一（glossary見出しとREADMEのアンカーリンク`#タグ形式`まで追随）。`validateTagNamingConsistency()`→`validateTagFormatConsistency()`（文字列比較化、検証とキャッシュキーは不変）。26ファイル +408/-1124行。**メイン側で実測**: `pnpm check` exit=0（36ファイル**393テスト**、着手前424＝-31）。`grep -rn "semver|tagNaming|TAG_FORMAT|命名規則"` は`docs/history/`と`requirements-grilling.md`を除いて**0件**。`pnpm lint:validate-config config-test`＝`3 設定ユニット, 5 apps`。`tagFormat`未指定・`{branch}-{date}`・並び順違い`{date}-{time}-{branch}`のテストをそれぞれ確認。`architecture.md`の索引/見出しの不一致はT-144前後で同一（既存分）で、索引は31→28件と削除3節ぶん一致。**受け入れ時にメインが1点修正**: `architecture.md`「型の置き場所は`src/`全件と突き合わせて確かめてある」の件数が古いままだった（削除した型ちょうど3件ぶん）ので56件→53件（`types.ts` 18→16・残り26→25）に更新。`git revert`は使わず手で削り、T-138/T-140/T-143の成果は温存。

## T-145

**タスク**: `config-test/` を `config/` に統合し、既定の設定ディレクトリ1つに一本化する。

## 背景

`config/` には `README.md` しか無く登録0件で、実機検証はすべて `CONFIG_PATH=config-test` で行ってきた。その結果、**`CONFIG_PATH` 未指定の既定値 `config/`（`DEFAULT_CONFIG_DIR_PATH`、`src/lib/config/config.ts`）を実際の設定ファイル入りで通す経路が一度も動いていない**。CIの `validate-config-remote` は位置引数なしで `pnpm lint:validate-config:remote` を呼ぶため検証先は `config/` で、空なので**検証対象0件で必ず通っている**。

ユーザー判断で、**定期実行の対象chartリポジトリにもスモークテスト用の `sinnlosses-group/yadokari-smoke-test-chart`（projectId 86061211）を使う**ことが決まった。同じプロジェクト・同じ `values.yaml` のアンカーを `config/` と `config-test/` の両方から登録すると完全な二重管理になり、固定ブランチ名が設定ユニット単位（`feature/yadokari/<unitPath>`、`src/domain/feature-branch.ts`）なので**定期実行とスモーク実行が同じブランチを奪い合う**（`submitMergeRequest` は固定ブランチが残っていたら削除して作り直し、`scripts/smoke/smoke-fixture.ts` の `reset` は接頭辞一致でブランチを削除するため、互いのMRを壊す）。したがって**ディレクトリを1つに統合する**。

判断の理由は `config/README.md` に記録済み（このタスクではその「移行中」注記を消す）。

## 解くべき論点

1. **`config-test/` を `git mv` でそのまま移すか、内容を見直して移すか。** 現在は3設定ユニット（`anchor-app`（深さ1）・`tenant2/client1`・`tenant2/client2`）。深さ1と深さ2の両方を残すことは、設定ユニットの深さ1〜2をどちらも実機で通すという意味があるので**減らさない**のが既定。減らす判断をするなら理由を `evidence` に書く
2. **`scripts/smoke/smoke-fixture.ts` は `config-test/` を前提にしているか。** 20行目・57行目付近のコメントが `config-test/yadokari-smoke-test-chart/` を指している。projectIdは環境変数から読む設計なのでコード上の依存は無いはずだが、実際に確かめる
3. **`test/main.e2e.test.ts:71` の `configDirPath: "config-test"`** をどう扱うか。実ディレクトリを読むテストなら `config` に変える必要があり、モックなら文字列を変えるだけでよい。どちらかを確かめてから直す
4. **`.gitlab-ci.yml` の `CONFIG_PATH` 入力（11行目・60行目付近）を残すか。** 統合後は既定値で足りるが、一時的に別ディレクトリを指したい場合の逃げ道でもある。残す/消すを判断して理由を書く

## やること

1. `config-test/yadokari-smoke-test-chart/` を `config/yadokari-smoke-test-chart/` へ `git mv` で移動し、`config-test/` を削除する
2. `config/README.md` の「**移行中**」の引用ブロック（`> **移行中**: …`）を削除する。他の記述は統合後の状態を前提に書いてあるので触らない
3. `docs/smoke-test.md` から `CONFIG_PATH=config-test` を外す（81・84・87行目付近のコマンド例、4・38・61・90行目付近の本文）。統合後は `CONFIG_PATH` 指定なしで同じ検証ができる
4. `README.md` の `config-test/` への言及（121・225・318行目付近）を統合後の記述に直す。ディレクトリ構成図（318行目付近）から `config-test/` の行を削る
5. `scripts/smoke/smoke-fixture.ts` のコメント（20・57行目付近）を追随させる
6. `test/main.e2e.test.ts:71` を追随させる
7. `grep -rn "config-test" .` の結果が、`docs/history/` と `develop/` を除いて0件になるまで追随させる

## 完了条件

- `pnpm check` が通る（型チェック・lint・format・test）。テスト件数が減っていないこと（実際の数を `evidence` に書く）
- **`pnpm lint:validate-config` が位置引数なしで通る**（＝既定の `config/` を検証して `3 設定ユニット, 5 apps` 相当が出る）。出力を `evidence` に書く
- `grep -rn "config-test" .` が `docs/history/` と `develop/` を除いて**0件**。出力を `evidence` に書く
- `config-test/` ディレクトリが存在しない
- `docs/smoke-test.md` のコマンド例に `CONFIG_PATH` が現れない

## 注意

- **実GitLabへの書き込みはしない。** ファイルの移動と記述の追随のみ。projectId・アンカー名・valuesPathは**移動前の値をそのまま使う**（実物に合わせてある値なので変更しない）
- `pnpm lint:validate-config:remote` は `.env` が必要なので、実行できなければその旨を `evidence` に書く（`--remote` なしの検証は必須）
- **コード・ドキュメントにタスク番号を書かない**（`docs/coding-standards.md`）
- `/loop /next-task` に載せてよい

**dependencies**: T-144

**difficulty**: sonnet

**evidence**: `config-test/yadokari-smoke-test-chart/`（7ファイル）を `git mv` で `config/` へ移動し、設定ディレクトリを既定パス1つに一本化。`config/README.md` の「移行中」注記を削除、`docs/smoke-test.md` から `CONFIG_PATH` を全廃、`README.md`（Quick Start・設定章・構成図）・`scripts/smoke/smoke-fixture.ts` のコメント・`test/main.e2e.test.ts`（`configDirPath` は**実ディレクトリを読むe2e**なので文字列変更ではなく実パスとして `config` へ）を追随。委譲先が tasks.json に無かった `docs/coding-standards.md`（「入口は config-test/ の実ファイル」）と `docs/architecture.md`（ディレクトリ構成の勘所2箇所）も grep 0件条件から拾って修正。**メイン側で実測**: `pnpm check` exit=0（36ファイル**393テスト**、着手前と同数で減っていない）。**`pnpm lint:validate-config` が位置引数なしで `config OK: 3 設定ユニット, 5 apps (config)`**（＝空ディレクトリを検証して通っていた状態が解消）。`grep -rn config-test` は `docs/history/` と `develop/` を除いて**0件**、`docs/smoke-test.md` の `CONFIG_PATH` も0件、`config-test/` ディレクトリは不在。移動はすべて `R`（内容差分0）で projectId・アンカー名・valuesPath は不変。**論点4件の判断**: (1) `git mv` でそのまま移動し3設定ユニット（深さ1・2混在）を維持、(2) `smoke-fixture.ts` の `config-test` 依存はコメントのみでコード上は環境変数経由、(3) e2eは実ファイルを読むため実パス変更が必要、(4) `.gitlab-ci.yml` の `CONFIG_PATH` 入力は逃げ道として温存。**受け入れ時にメインが `develop/progress.md` の古くなった `config-test` 記述3箇所を更新**。

## T-149

**タスク**: TARGET_UNITS / unitPath の説明文から、実在しない具体名（`central`・`tenant1/client1`）を外す。

## 背景

`unitPath` を説明する文章が、例示として `central`（深さ1）と `tenant1/client1`（深さ2）を使っている。**どちらも実在しない**:

- 実際の `config/` にあるのは `anchor-app`（深さ1）、`tenant2/client1`・`tenant2/client2`（深さ2）
- `tenant1/client1` は要件変更（テナント/クライアント2階層固定 → 設定ユニット・深さ1〜2）より前の名残で、`develop/progress.md`「次にやること」にも旧固定ブランチ `feature/yadokari/tenant1/client1` の後片付けとして出てくる
- `central` はどの設定にも存在しない。深さ1の例として置かれているだけだが、予約語のように読める

現状の出現箇所（`docs/history/` 配下と `test/` を除く）:

| ファイル                    | 行                                         | 種類                                             |
| --------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `src/lib/env.ts`            | 63, 64                                     | `TARGET_UNITS` パーサのJSDoc                     |
| `src/lib/env.ts`            | 108                                        | **利用者に出るエラーメッセージ**                 |
| `src/domain/config-unit.ts` | 15                                         | JSDoc                                            |
| `src/types/brand.ts`        | 78                                         | JSDoc                                            |
| `README.md`                 | 91, 137, 138, 158, 168, 171, 172, 255      | 設定手順・ログ例・環境変数表・ディレクトリ構成図 |
| `docs/requirements.md`      | 74, 136, 137, 216, 219, 310, 311, 379, 381 | 用語表・4.2・4.4・4.5                            |
| `docs/glossary.md`          | 57, 94, 225                                | 設定ユニット・固定ブランチの定義                 |
| `.gitlab-ci.yml`            | 20, 68                                     | **CIジョブ変数の description（利用者に出る）**   |

**抽象化の前例が既にある**（＝新しい規約を作る話ではなく、揺れを揃える話）。`README.md` 158行目は `"t1/c1"`・`"central,t2/c2"`、`.gitlab-ci.yml` 20行目は `"t1/c1,t2/c2"` と、同じ文脈で既に短い抽象形を使っている。一方で同じファイルの別の行（`README.md` 255行目、`.gitlab-ci.yml` 68行目）は `tenant1/client1` のまま。

ユーザーからの指示は「TARGET_UNITS に central とか tenant1/client1 とか、特定の表現はないほうがいい」。

## 解くべき論点

1. **置き換え先の表記をどうするか。** 候補は (a) メタ変数（`<unitPath>` / `<第1セグメント>/<第2セグメント>`）、(b) 短い抽象名（既存の `t1/c1` 系に寄せる）、(c) 実在する値（`anchor-app`・`tenant2/client1`）。(c) は実物と一致する利点があるが、スモークテスト用フィクスチャの名前が仕様の説明文に固定される欠点がある
2. **利用者に出る文字列（`src/lib/env.ts:108` のエラーメッセージ、`.gitlab-ci.yml` の description）で具体例を残すか。** エラーメッセージは具体例があるほうが直しやすい一方、実在しない名前を出すと「その名前でなければいけない」と誤読される。深さの構造だけを示す形（`"<名前>"` と `"<名前>/<名前>"`）で足りるかを判断する
3. **深さ1と深さ2を1つの例で示す必要があるか。** 現状はほぼ全箇所で2つ並べており、これが記述量を増やしている。`docs/requirements.md` 4.4節が制約の正典なので、他は「深さ1〜2」とだけ書いて正典を参照する形に寄せられないか

## やること

1. 論点1〜3を決め、**適用する前にユーザーへ提案して承認を得る**。表記の統一はREADME・CI・エラーメッセージという利用者に見える面を横断するため、勝手に決めない
2. 承認された表記で、上の表の箇所を置き換える
3. `docs/glossary.md` 94行目の `&tenant1client1AppsVersion` はYAMLアンカー名の例。アンカー名は利用者が自由に付けるものなので、論点1の結論を機械的に当てず、**アンカー名の例として自然かどうかで個別に判断する**
4. 調べた結果、ある箇所は具体名のままのほうがよいと判断したら、**変えずにその理由を `evidence` に書く**（全箇所を一律に置換することが目的ではない）

## 完了条件

- `grep -rn 'central\|tenant1/client1' src/ README.md docs/*.md .gitlab-ci.yml` の結果が、承認された方針で説明のつく状態になっている（0件にすることが条件ではない。残した箇所は `evidence` に理由を書く）
- `README.md` と `.gitlab-ci.yml` の中で、同じ `TARGET_UNITS` の説明が**ファイル内・ファイル間で同じ表記**になっている（現状は `t1/c1` と `tenant1/client1` が混在している）
- `pnpm check` が通る
- `pnpm lint:validate-config` が通る（`config/` の実ディレクトリを触っていないことの確認を兼ねる）

## 注意

- **`config/` 配下の実ディレクトリ（`anchor-app`・`tenant2/client1`・`tenant2/client2`）を変更しない。** 本番の定期実行と実機スモークテストの対象そのもので、名前を変えるとGitLab上の固定ブランチ・MRとの対応が壊れる
- **`test/` 配下のフィクスチャ名を変更しない。** テストデータに具体名を使うのは適切で、この指示の対象外
- **`docs/history/` 配下を変更しない**（当時の記述をそのまま残す規約）
- `scripts/smoke/smoke-fixture.ts` の `charts/smoke-tenant2/...` はGitLab上の実ファイルパスなので変更しない
- 表記の決定には**ユーザー承認が要る**ため、`/loop /next-task` には載せない

**dependencies**: なし

**difficulty**: opus

**evidence**: 承認: メタ変数のみ（例を消す）＋深さの詳細は docs/requirements.md 4.4節に集約。8ファイル21箇所を置換（src/lib/env.ts・src/domain/config-unit.ts・src/types/brand.ts・README.md・docs/requirements.md・docs/glossary.md・.gitlab-ci.yml）。grep 'central|tenant1|client1' が src/・README.md・.gitlab-ci.yml・docs/\*.md で0件（docs/smoke-test.md は実在フィクスチャの手順書なので対象外のまま残した）。TARGET_UNITS の説明6箇所が同一表記「config/<chart...>/ からの深さ1〜2の相対パス」に統一。README.md:91 のmkdirとログ例2件はリテラルが要るためメタ変数化せず my-unit / my-group/my-unit に変更。pnpm check 通過（32ファイル357テスト）、pnpm lint:validate-config 通過（3設定ユニット5apps）。

## T-153

**タスク**: `tagFormat` の置き場所と `anchors.yaml` の新しいファイル名を決め、`docs/requirements.md` 4.4節を先に更新する。

## 背景

`config/<chartディレクトリ>/<unitPath>/` には2ファイルある:

- `config.yaml`（運用値・よく変更する）… `apps[].projectId` / `projectName` / `branchToSync` / **`tagFormat`**、`helm.branchToSync`
- `anchors.yaml`（chart構造・滅多に変更しない）… `apps[].projectId` / `projectName` / `chart[].valuesPath` / `chart[].anchor`、`helm.chart[]`

ユーザーからの指示は「`config.yaml` の `tagFormat` は `anchors.yaml` に移したい（あまり変更されないから）。あと、`tagFormat` が加わることで `anchors.yaml` の名前が実態に合わなくなるから変えてほしい」。

**この指示は既存の設計判断を覆す。** `docs/architecture.md:621` に `#### タグ形式はapp単位に \`config.yaml\` へ置く` という節があり、現在の形の理由が書かれている。まずこの節を読むこと。

**裏取りで分かった重要な事実**:

1. **移しても構造上の問題は解決しない。** `src/lib/config/validate.ts` の `validateTagFormatConsistency()` は「同じ `projectId` のappが複数の設定ユニットに登録されているとき `tagFormat` が食い違っていないか」を検証している。JSDocに「タグ形式はソースリポジトリ側の性質であって設定ユニットごとに変わる値ではない」と書かれているとおり、`tagFormat` のスコープは**ソースリポジトリ単位**。ところが `anchors.yaml` も `config.yaml` と同じく**設定ユニット単位**のファイルなので、移してもスコープ不一致は残り、このクロス検証も残る
2. **移す先としての形は整っている。** `AnchorsAppSchema`（`src/lib/config/schema.ts`）は既に `projectId` / `projectName` を `config.yaml` と重複して持ち、`validateAppLinkage()` で突き合わせている。フィールドを1つ足す形は素直に収まる
3. **改名の影響範囲は広い。** `anchors.yaml` という文字列は `docs/history/` ・`dist/` ・`coverage/` を除いて **16ファイル・106箇所**にある（`src/lib/config/` 4ファイル、`src/types/types.ts`、`test/lib/config/` 4ファイル、`README.md`、`docs/requirements.md`、`docs/glossary.md`、`docs/architecture.md`、ほか）。加えて**実ファイルが3つ**（`config/yadokari-smoke-test-chart/{anchor-app,tenant2/client1,tenant2/client2}/anchors.yaml`）
4. **`docs/requirements.md` 4.4節が「先に更新する」と自ら定めている。** 節の冒頭に「この節が `config/` のスキーマ・制約の**正典**。`README.md` の「設定 > config/」章はセットアップに必要な範囲の要約で、**フィールドを追加・変更したときはこの節を先に更新する**」とある。このタスクはその手順に従い、正典の更新までで止める

## 解くべき論点

1. **`tagFormat` の移し先は `anchors.yaml` でよいか。** 「変更頻度で分ける」という現在のファイル分割の軸には合う。一方でスコープはソースリポジトリ単位で、どちらのファイルも設定ユニット単位なので不一致は残る。**別案**: ソースリポジトリ単位の登録を別ファイル・別階層に切り出す（`validateTagFormatConsistency()` が不要になる代わりに、ファイルが1つ増え `config/` の構成が変わる）。指示は `anchors.yaml` を名指ししているので、別案を採る場合は必ずユーザーに確認する
2. **新しいファイル名を何にするか。** 現在の中身は「chart構造（valuesPath + anchor）」で、そこに「タグ形式」が加わる。共通するのは「滅多に変更しない」ことと「app単位の静的な定義」であること。`anchor` というフィールド名自体は変えない前提で、ファイル名だけを決める
3. **`config.yaml` 側の説明をどう変えるか。** 「運用値のみ（chart構造は〜側が持つ）」という現在の対比（`src/lib/config/schema.ts:65` のコメント、`docs/requirements.md` 4.4節）が、`tagFormat` の移動後は成り立たなくなる。2ファイルの分割軸をどう言い換えるか
4. **`validateTagFormatConsistency()` を残すか。** 論点1で `anchors.yaml` を選ぶなら残す（スコープ不一致が続くため）。別案を採るなら不要になる

## やること

1. `docs/architecture.md` の `#### タグ形式はapp単位に\`config.yaml\`へ置く` 節を読み、現在の形にした理由を確認する（`sed -n '/^#### タグ形式はapp単位に/,/^#\{2,4\} /p' docs/architecture.md`）
2. 論点1〜4を検討し、**結論をユーザーに提案して承認を得る**。ファイル名は複数案を出して選んでもらう
3. 承認された内容で `docs/requirements.md` 4.4節（`config/` スキーマの正典）を更新する。YAMLの記述例も4.4節にあるので合わせて直す
4. `docs/architecture.md` の該当節を、新しい判断を説明する内容に更新する。**旧判断を消すのではなく、なぜ変えたのかが分かる形にする**（このリポジトリは「なぜ今の形なのか」を正典に残す方針）
5. **コード・実 `config/`・テスト・その他のドキュメントは変更しない**（後続タスクで行う）。このタスクは正典2ファイルの更新までで閉じる
6. 検討の結果「移さないほうがよい」と結論した場合は、**変更せずに理由を `evidence` に書いて閉じる**。その場合は後続タスクも不要になるので、その旨も書く

## 完了条件

- `docs/requirements.md` 4.4節に、`tagFormat` を含む新しいファイル分割と**新しいファイル名**が書かれている（YAMLの記述例を含む）
- `docs/architecture.md` の `#### タグ形式はapp単位に\`config.yaml\`へ置く` 節が、新しい判断と**変更した理由**を説明する内容になっている
- `validateTagFormatConsistency()` を残すか無くすかの結論が、上のいずれかの正典に書かれている
- **コードと実 `config/` が1バイトも変わっていない**（`git diff --stat` に `src/` `config/` `test/` が現れないことを `evidence` に書く）
- `pnpm check` が通る

## 注意

- **移し先とファイル名の決定にユーザー承認が要るため `/loop /next-task` には載せない**
- `docs/history/` 配下は変更しない
- コード・ドキュメントにタスク番号を書かない（`docs/coding-standards.md`）
- `anchor` というフィールド名・`docs/glossary.md` の `anchor` 系の用語エントリは、このタスクの対象外（ファイル名だけを決める）

**dependencies**: なし

**difficulty**: opus

**evidence**: 承認された方針: 分割軸は「変更頻度」（ユーザー確認済み。運用値 vs chart構造は副次的な軸で、architecture.md の旧判断はこの軸の取り違えだった）。tagFormat は chartリポジトリ単位の config/<chart>/sources.yaml へ。projectName は sources.yaml を正典としつつ config.yaml/anchors.yaml にも残す。**anchors.yaml の改名は不要**（tagFormat が入らないため理由が消えた。106箇所の変更が不要になった）。validateTagFormatConsistency() は残す（chartリポジトリまたぎの検出に役割が変わる）。実データの裏取り: ソースリポジトリ2件が3設定ユニットに5エントリ、tagFormat は5箇所すべて同値。更新したのは正典2ファイルのみ（requirements.md 4.4節 8箇所・architecture.md 節見出しごと書き換え+1箇所）。後続 T-154 の本文も新しい形に差し替えた。コード・実config・テストは未変更。pnpm check 通過（32ファイル357テスト）。

## T-155

**タスク**: `config/` を2ファイル構成に改める判断を正典へ反映する（`anchors.yaml` の廃止と `sources.yaml` 案の撤回）。

## 背景

前段タスクで「`tagFormat` を chartリポジトリ単位の `sources.yaml` へ移す」と決めたが、その結果ファイルが `chart.yaml` / `sources.yaml` / `config.yaml` / `anchors.yaml` の4種類になり、管理が重いという指摘を受けた。実測すると、その案は `tagFormat` の重複（5→2）を直す代わりに他の指標を悪化させていた。

## 解くべき論点

（このタスクは実施済み。判断の記録として残す）

## やること

（実施済み）

## 完了条件

（実施済み）

## 注意

（実施済み）

**dependencies**: T-153

**difficulty**: opus

**evidence**: 前段の sources.yaml 案を撤回し、config/ を chart.yaml と config.yaml の2ファイル構成に改めた（ユーザー承認済み）。実測比較（実config・app1件追加時・projectId/Name重複・tagFormat重複）: 移行前 7ファイル/2/10/5、sources.yaml案 8/3/12/2、採用案 4/2/7/2。**採用案だけが全指標で移行前より良い**。分割の軸を「変更頻度」から「スコープ」（chartリポジトリ単位 / 設定ユニット単位）に改めた。変更頻度で分けない理由3点を正典に記載: (1) 最多の編集であるappの追加・削除では結局どちらも触る、(2) セルフサービス方式なので編集者が分かれていない、(3) 実際によく変わるのは branchToSync だけで1ユニット十数行に収まる。更新: docs/requirements.md 4.4節（走査対象・構成図・分割の軸の表と理由・YAML例2つ・制約4箇所・helm節2箇所）、docs/architecture.md（節見出しごと書き換え+食い違い検証1箇所）。sources.yaml の言及は両ファイルで0件。コード・実config・テストは未変更（git diff --stat に src/ config/ test/ が現れない）。後続 T-154 の本文も2ファイル構成へ差し替えた。pnpm check 通過（32ファイル357テスト）。

## T-154

**タスク**: `docs/requirements.md` 4.4節で決まった2ファイル構成へ、コード・実 `config/`・テスト・ドキュメントを移行する。

## 背景

前段タスクで `config/` のファイル構成が確定し、`docs/requirements.md` 4.4節（`config/` スキーマの正典）と `docs/architecture.md`「`config/`は「スコープ」で2ファイルに分け、変更頻度では分けない」が更新済み。**このタスクは決まった形を実装と実ファイルに反映するだけで、方針を決め直さない。**

確定した形（**ファイルは2種類だけ**）:

```
config/<chartディレクトリ>/
  chart.yaml            # chart: (projectId/projectName/mrTargetBranch) + apps[]: (projectId/projectName/tagFormat)
  <unitPath>/
    config.yaml         # apps[]: (projectId/projectName/branchToSync/chart[]) + helm: (branchToSync/chart[])
```

移行の中身は3つ:

1. **`anchors.yaml` を廃止**し、内容を同じディレクトリの `config.yaml` へ統合する。`apps[].chart[]`（`valuesPath`+`anchor`）は各appの中へ、`helm.chart[]` は `helm.branchToSync` と同じ `helm:` の下へ入る
2. **`tagFormat` を `config.yaml` から `chart.yaml` の `apps[]` へ移す**（`chart.yaml` にトップレベルの `apps:` を新設する）
3. `projectName` は `chart.yaml` を正典としつつ `config.yaml` にも残す

移行前の実データ: `config/yadokari-smoke-test-chart/` に `chart.yaml` 1つと3設定ユニット（`anchor-app` / `tenant2/client1` / `tenant2/client2`）の `config.yaml`・`anchors.yaml` 各3つ＝**計7ファイル**。ソースリポジトリは2件（`82861978` sample-qa-sprint / `82861977` sample-develop-client）で、`tagFormat` は5箇所すべて `"{branch}-build-at-{date}-{time}"` と同値。移行後は**計4ファイル**になる。

移行対象:

| 対象                               | 現状                                                                                                                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/config/schema.ts`         | `ConfigYamlSchema`（`AppOperationalSchema` に `tagFormat`）と `AnchorsYamlSchema`・`loadAnchors()` が別々。`ChartYamlSchema` に `apps` は無い。`TagFormatSchema` のエラーメッセージが `"config.yaml の apps[] に..."` |
| `src/lib/config/chart-and-apps.ts` | 34-35行目で `config.yaml` / `anchors.yaml` のパスを組み立て、`projectId` で結合                                                                                                                                       |
| `src/lib/config/config.ts`         | 70行目付近で `existsSync(join(chartDirPath, "chart.yaml"))` を見てchartディレクトリを判定                                                                                                                             |
| `src/lib/config/validate.ts`       | `validateProjectLinkage()`（config.yaml ↔ anchors.yaml の突き合わせ）/ `validateTagFormatConsistency()` / `validateNoDuplicateProjectIds()` / `validateNoDuplicateTargets()`                                          |
| `src/types/types.ts`               | `App` 型のJSDocが「`tagFormat`はconfig.yamlの運用値」と書いている（33行目付近）                                                                                                                                       |
| 文字列 `anchors.yaml`              | `docs/history/` ・`dist/` ・`coverage/` を除いて16ファイル106箇所                                                                                                                                                     |

## 解くべき論点

前段タスクで方針が確定しているため、このタスクで決める方針は無い。正典の記述だけで判断が付かない箇所が出たら、押し切らず**そこで止めて理由を `evidence` に書く**。

## やること

1. `docs/requirements.md` 4.4節と `docs/architecture.md` の該当節を読み、確定した形を確認する
2. `src/lib/config/schema.ts`: `ChartYamlSchema` に `apps[]`（`projectId`/`projectName`/`tagFormat`）を足し、`AppOperationalSchema` から `tagFormat` を外して `chart[]` を足す。`ConfigYamlSchema` の `helm` に `chart[]` を足す。`AnchorsYamlSchema` と `loadAnchors()` を削除する。`TagFormatSchema` のエラーメッセージを `chart.yaml` に直す
3. `src/lib/config/chart-and-apps.ts`: `anchors.yaml` の読み込みを削り、`chart.yaml` の `apps[]` と `config.yaml` の `apps[]` を `projectId` で結合して `App` 型を組み立てる
4. 検証を更新する:
   - `validateProjectLinkage()` の役割を「`config.yaml` ↔ `anchors.yaml`」から「`config.yaml` ↔ `chart.yaml` の `apps[]`」に変える。**`chart.yaml` 側にだけあってどの設定ユニットからも参照されないappはエラーにしない**（4.4節が明記）
   - `validateTagFormatConsistency()` は**残す**（chartリポジトリをまたぐ食い違いの検出に役割が変わる）。JSDocを実態に合わせる
   - `validateNoDuplicateTargets()`（`valuesPath`+`anchor` の重複）は同じ `config.yaml` 内の検証になる
5. 実ファイルを移行する。3つの `anchors.yaml` の内容を同じディレクトリの `config.yaml` へ統合して**削除**し、`chart.yaml` に `apps[]` を足し、`config.yaml` から `tagFormat` を削る。**`projectId` / `projectName` / `branchToSync` / `valuesPath` / `anchor` の値は変更しない**（GitLab上の実物に合わせてある）
6. テストを追随させる（`test/lib/config/` の4ファイル、`test/helpers.ts`、`test/main.e2e.test.ts`。e2eは**実ディレクトリを読む**ので実ファイルの変更が反映される）
7. ドキュメントを追随させる（`README.md` の設定章・構成図・環境変数表、`docs/glossary.md`、`config/README.md`、`docs/smoke-test.md`、`scripts/smoke/smoke-fixture.ts` のコメント）。**`docs/requirements.md` と `docs/architecture.md` は前段で更新済みなので、実装と食い違っていないかの確認だけ行う**

## 完了条件

- `grep -rn 'anchors\.yaml' .` が `docs/history/` ・`dist/` ・`coverage/` ・`node_modules/` を除いて **0件**（出力を `evidence` に書く）
- `find config -name '*.yaml' | wc -l` が **4**（移行前は7）
- `grep -rn 'tagFormat' config/` が **`chart.yaml` の2件のみ**（移行前は3つの `config.yaml` に計5件）
- `pnpm check` が通る。**テスト件数が着手前（357件）から減っていない**ことを `evidence` に書く
- **`pnpm lint:validate-config` が通る**（`config OK: 3 設定ユニット, 5 apps` 相当）。出力を `evidence` に書く
- `config.yaml` の `projectId` が `chart.yaml` の `apps[]` に無いときに設定エラーになるテストがある
- `chart.yaml` にだけ書かれたappがエラーにならないテストがある
- `git diff` で `projectId` / `projectName` / `branchToSync` / `valuesPath` / `anchor` の値が変わっていない
- コード・ドキュメントにタスク番号が入っていない

## 注意

- **`sources.yaml` は作らない。** 前段タスクで一度その案を採ったが、ファイル数が増えて管理が重くなるため2ファイル構成に改めた経緯がある
- **実GitLabへの書き込みはしない。** ローカルのファイル操作とテスト実行のみ
- **`projectId`・`projectName`・`valuesPath`・`anchor` の値を変更しない。** GitLab上の実物に合わせてある値で、変えると `pnpm lint:validate-config:remote` と実機スモークテストが壊れる
- `config/` は本番の定期実行が読む実設定でもある。**ファイルを減らすのでCIの `validate-config-remote` ジョブの対象も変わる**。`.gitlab-ci.yml` と `scripts/lint/` が `anchors.yaml` を前提にしていないか確認する
- `docs/history/` 配下は変更しない
- `/loop /next-task` に載せてよい

**dependencies**: T-153

**difficulty**: sonnet

**evidence**: anchors.yaml を config.yaml へ統合して廃止し、tagFormat を chart.yaml の apps[] へ移した。実測: find config -name '\*.yaml' が 7→4件、grep tagFormat config/ が chart.yaml の2件のみ（移行前は config.yaml 3ファイルに5件）、grep anchors.yaml が src/・test/・config/ で0件（docs 側に残る3件は「以前は3ファイルだった」経緯の記述で意図的）。pnpm check 通過（32ファイル359テスト。着手前357から増加）、pnpm lint:validate-config が config OK: 3 設定ユニット, 5 apps。受け入れ時にメインで追加確認: steps/ の try 0件・新規 as キャスト0件・?: 記法0件・タスク番号0件、追加された3つの export（ChartApp/ChartYamlSchema/ConfigYamlSchema）はいずれも他ファイルから利用ありで規約適合。委譲先の報告どおり docs/architecture.md に前段タスクの更新漏れがあったため、受け入れ時にメインが修正: 旧「3ファイル分割」節を削除、節の索引2行（削除1・旧見出し名1）、各ファイルの責務表2行、走査の節1箇所、型の置き場所の Anchors/AnchorsApp→ChartApp を3箇所。索引36件が全て実在見出しに前方一致することを再検証済み。

## T-147

**タスク**: progress.md のアーカイブ基準とトリガーを定義し、tasks.json と同じ検査点に組み込む。

## 背景

`develop/progress.md` が455行・42.7KBまで肥大化している。うち376行（83%）が `## 完了したこと（このセッション）` で、その配下に `### 定期メンテの棚卸し（2026-09-08）`・`### 要件変更: テナント/クライアント2階層固定 → 設定ユニット（深さ1〜2）`・`### 実機スモークテスト（2026-09-07、docs/smoke-test.md の手順どおり）` と複数日付の小節が並ぶ。「このセッション」と題した節に複数セッション分が溜まっている。

規約自体は既にある。`docs/workflow.md`「progress.md の構成」は「**このセッション分のみ**を書き、過去セッション分はアーカイブへ移す」と定めており、`docs/history/progress-archive.md` の冒頭にも同じ運用に切り替えた経緯が残っている。それでも再肥大化したのは、規約を**実行させる仕組みが tasks.json 側にしか無い**ため:

- `docs/workflow.md`「肥大化したときのアーカイブ」の「いつ移すか（トリガー）」は `develop/tasks.json` を読む／書く直後の2点（`/next-task` 手順1、`/plan-tasks` 手順5）に紐付いており、判定基準も `done` 10件以上／30KB超と**tasks.json の数値だけ**。progress.md の肥大化を判定する箇所がどこにも無い
- `.claude/skills/next-task/SKILL.md` 手順6 は progress.md の「完了したこと」へ**追記する**とだけ書かれていて、減らす手順を持たない。追記だけが毎サイクル走るので単調増加する
- 「このセッション」の境界が progress.md 自身から判別できない。セッションは切れて再開する運用（`CLAUDE.md`「進捗管理とHandoff」）なので、次のセッションから見てどこまでが前回分かを機械的に決められない。現に上の3小節は日付を持つものと持たないものが混在している

ユーザーからの指示は「progress.md がメンテされてなく400行以上ある。タスクのtasks.jsonと一緒にメンテされるような仕組みにしてほしい」。

## 解くべき論点

1. **トリガーの基準を何にするか。** tasks.json は「`done` 10件以上／30KB超」の2つの数値を持つ。progress.md には `done` に相当するものが無いので、行数・KB・「完了したこと」配下の小節数などから選ぶ必要がある。tasks.json と桁を揃えるか、progress.md 固有の値にするか
2. **「このセッション」の境界をどう判定可能にするか。** 「完了したこと」配下の小節に日付見出しを必須にすれば機械的に判定できるが書式の縛りが増える。別案の「常に直近1件だけ残す」なら日付に依存しない。現状の書式（日付あり/なしの混在）をどう扱うかも含めて決める
3. **減らす責務をどの手順に置くか。** 追記する `/next-task` 手順6 に持たせるか、検査点である手順1に寄せるか。tasks.json のアーカイブは手順1にあるので、「一緒にメンテされる」という要望に素直なのは手順1への集約
4. **tasks.json のアーカイブと同時に行うことを規約にするか。** 同時にすれば「一緒にメンテされる」がそのまま満たせるが、片方だけがトリガーに達したときの扱いを決める必要がある

## やること

1. 論点1〜4を決める。**決めた理由も `docs/workflow.md` に書く**（このリポジトリは「なぜ今の形なのか」を正典に残す方針。`docs/coding-standards.md`「コメント」参照）
2. `docs/workflow.md` に反映する:
   - 「progress.md の構成」に、境界の判定方法（論点2の結論）を書く
   - 「肥大化したときのアーカイブ」の「いつ移すか（トリガー）」「何を移すか」に progress.md の基準を追加する（現状は tasks.json のことしか書かれていない）
3. `.claude/skills/next-task/SKILL.md` の手順1（論点3の結論次第で手順6も）と、`.claude/skills/plan-tasks/SKILL.md` の手順5 に progress.md の判定を追加する
4. `CLAUDE.md`「進捗管理とHandoff」手順1の「アーカイブすべきタイミングなら作業前にアーカイブする」が progress.md も対象だと読めるかを確認し、読めないなら1行だけ足す（CLAUDE.md に判断材料を二重に書かず、正典は workflow.md 側に置く）
5. **実際のアーカイブ作業はこのタスクでは行わない**（後続タスクに分けてある）。規約とトリガーの定義だけで閉じる
6. 調べた結果、既存のトリガー定義に progress.md を足すだけでは要望を満たせないと分かった場合（例:「一緒に」を満たすには tasks.json 側の基準も変える必要がある）は、その設計変更をユーザーに提案して承認を得てから進める。**承認が得られなければやらずに、理由を `evidence` に書いて閉じる**

## 完了条件

- `docs/workflow.md` の「いつ移すか（トリガー）」の節を読むだけで、tasks.json と progress.md **両方**の判定基準とタイミングが分かる
- `.claude/skills/next-task/SKILL.md` と `.claude/skills/plan-tasks/SKILL.md` の該当手順に progress.md の判定が入っている
- 決めた基準を**現状の `develop/progress.md`（455行・42.7KB・「完了したこと」376行・配下の小節3件）に当てはめると「アーカイブ対象」と判定される**ことを、`evidence` に具体的な数値で書く（基準が現状を素通りするなら基準として機能していない）
- `pnpm check` が通る
- コード・ドキュメントにタスク番号を書かない（`docs/coding-standards.md`「タスク番号を書かない」。コミットメッセージは対象外）

## 注意

- **`develop/progress.md` の中身は移動しない。** このタスクは規約とトリガーの定義まで
- `docs/history/progress-archive.md` は「当時の記述をそのまま残す」規約なので、書式を変えるために遡って書き換えない
- `docs/workflow.md` は現在13KBで通読ガードを入れていない（20KB未満のため対象外とした）。この変更で20KBを超えるようなら、他の正典と同じガード（冒頭の「通読しない」＋節の索引）を入れるか検討する
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: opus

**evidence**: 論点1（tasks.jsonの基準）: ユーザー承認により **todo を判定対象外**にし、done の件数(10件以上)と done のサイズ(30KB超)で判定する形にした。ファイル全体で測っていた頃は todo だけで30KBを超え『基準は超えているのに移せるものが0件』が本セッションで4回空振りしていた。論点2（境界）: 「完了したこと」配下の小節を `### YYYY-MM-DD 〜` 形式に必須化し、最新の日付以外を過去セッション分と判定する（grep '^### ' で機械的に判定可能）。論点3（責務の置き場所）: 追記する next-task 手順6 ではなく検査点の手順1に寄せ、tasks.json と同じ場所で2ファイルまとめて判定する。論点4（同時実行）: 同じ検査点で両方見て、該当した側だけを移す形にした。更新: docs/workflow.md（progress.md の構成に日付見出しの規約／いつ移すかの基準を全面書き換え／何を移すかに progress.md を追加）、.claude/skills/next-task/SKILL.md 手順1・手順6、.claude/skills/plan-tasks/SKILL.md 手順5、CLAUDE.md 手順1に1行。検証: 新基準を現状に当てると tasks.json は done 1件/3694 bytes で『不要』（空振りが消えた）、progress.md は小節3件・日付 2026-09-07 と 2026-09-08 が混在で『**アーカイブ対象**』と正しく判定される。実アーカイブは T-148 で行うため未実施。pnpm check 通過（32ファイル359テスト）。

## T-148

**タスク**: 定めた基準で develop/progress.md を実際にアーカイブする。

## 背景

`develop/progress.md` が455行・42.7KBあり、うち376行が `## 完了したこと（このセッション）`。配下は `### 定期メンテの棚卸し（2026-09-08）`（15行目〜）・`### 要件変更: テナント/クライアント2階層固定 → 設定ユニット（深さ1〜2）`（108行目〜）・`### 実機スモークテスト（2026-09-07、docs/smoke-test.md の手順どおり）`（141行目〜）の3小節で、複数セッション分が溜まっている。

前段タスクで progress.md のアーカイブ基準・境界の判定方法・トリガーが `docs/workflow.md` に定義される。このタスクはそれを**最初に適用する**もの。移動先は `docs/history/progress-archive.md`（124KB、冒頭に通読ガードあり）。

## 解くべき論点

前段タスクで基準が決まっているため、このタスクで決める方針は無い。基準の当てはめで判断が割れたら押し切らず、`difficulty` を上げてから再開する（`docs/workflow.md`「difficulty」の運用ルール）。

## やること

1. `docs/workflow.md` の「progress.md の構成」「肥大化したときのアーカイブ」を読み、前段タスクで決まった基準と境界の判定方法を確認する
2. その基準に従って `develop/progress.md` の「完了したこと」から過去セッション分を `docs/history/progress-archive.md` へ移す。**当時の記述をそのまま移し、書き換えない**。追記位置は progress-archive.md の既存の並びに合わせる
3. `## 次にやること` / `## 未解決` / `## 注意` は残す。**特に「注意」節は未完了タスクの完了条件が参照している記述（テスト用アクセストークンの扱いなど）を含むので消さない**
4. 残した progress.md が `docs/workflow.md`「progress.md の構成」の4セクション構成になっていることを確認する

## 完了条件

- `develop/progress.md` が前段タスクで定めた基準を満たす（アーカイブ対象と判定されない状態になっている）。`evidence` に**アーカイブ前後の行数とKB**を書く
- 移した記述が `docs/history/progress-archive.md` に**一字一句そのまま**存在することを `diff` または `grep` で確認し、その確認方法と結果を `evidence` に書く
- `## 次にやること` / `## 未解決` / `## 注意` の3節が `develop/progress.md` に残っている
- `pnpm check` が通る

## 注意

- **記述の書き換え・要約をしない。** アーカイブは「そのまま移す」のが規約
- 消す前に移し先へ書き、`git diff` で欠落が無いことを確かめる。**取り違えると復元できない情報がある**（実機スモークテストの結果など、再取得にGitLab上の操作が要るもの）
- `/loop /next-task` に載せてよい

**dependencies**: T-147

**difficulty**: sonnet

**evidence**: 新基準の最初の適用。develop/progress.md を **534行/50,902バイト → 252行/23,480バイト**（-53%）に縮小。残したのは最新日付の小節1件のみで、見出しを新規約の形 `### 2026-09-08 定期メンテの棚卸し` に修正。移したのは `### 実機スモークテスト（2026-09-07…）` と日付なしの `### 要件変更: テナント/クライアント2階層固定→設定ユニット` の2小節で、後者は本文が docs/history/direction.md の『2026-09-08（2回目）』を指しており、同じ暦日でも別セッションと判断した（委譲先の根拠を受け入れ時に確認）。**独立検証**: git diff から消えた283行（空行除く245行）を抽出し、progress-archive.md か現行 progress.md に一字一句存在するかを全件照合 → 見つからなかったのは上記の見出し書式修正1行のみで、**欠落ゼロ**。4セクション（完了したこと/次にやること/未解決/注意）は維持、T-146 が参照するアクセストークンの記述も残存を確認。新基準で再判定すると『不要』（小節1件・日付1種）。pnpm check 通過（32ファイル359テスト）。

## T-150

**タスク**: ドキュメント整備の定型作業をスキル化する（`docs/` の `history/` 以外・`README.md`・`CLAUDE.md` が対象）。

## 背景

同じ形のドキュメント整備タスクが繰り返し発生している。アーカイブ済み145タスクのうち、少なくとも次の10件が「実物とのズレ・冗長・重複・読みにくい構造」を直す作業だった:

- T-028（README と requirements 4.4 の食い違い）、T-029（ドキュメント・設定サンプルの実態ドリフト）、T-031（architecture.md 195行の整理）、T-039（MR出力仕様の変更に伴うドキュメント追従）、T-057（README 390行から冗長な記述を削る）、T-077（実装と食い違う記述の除去）、T-078（glossary をコードに合わせる）、T-128（requirements・glossary の用語統一）、T-141（README の実物とのズレ）、T-142（CLAUDE.md・architecture.md の実態と違う記述）

直近でも同じ形の作業をしている。`docs/architecture.md` にしか無かった「通読しない＋節の索引」を `coding-standards.md`・`requirements.md`・`glossary.md`・`history/test-inventory.md` へ展開し、`sed` の終端パターンの誤り（コードブロック内のYAMLコメントを見出しと誤認して節が途中で切れる）を修正した。

このリポジトリには既にプロジェクト独自スキルが2つある（`.claude/skills/next-task/SKILL.md`、`.claude/skills/plan-tasks/SKILL.md`）。どちらも `---` の frontmatter（`name` / `description`）＋「## 手順」＋「## 完了報告のフォーマット」という構成で、**判断基準そのものは `CLAUDE.md` と `docs/workflow.md` に置き、スキル側では繰り返さない**という書き方をしている。

ユーザーからの指示は「docs/ ディレクトリ配下の history/ ディレクトリ配下以外のドキュメントとREADME.mdとCLAUDE.mdをメンテナンスし、冗長な表現、重複、人間にとって読みにくい構造を改善する、というタスクが定型化されつつあるから skills 化してほしい」。

## 解くべき論点

1. **「冗長」「重複」「読みにくい」を、読み手によって結論が変わらない形にどう落とすか。** これが決まらないとスキルは「気をつけて直す」以上のものにならない。手がかりは既にある: 正典の二重化（同じ規約が複数ファイルにある）、実物とのズレ（コード・`config/` と食い違う記述）、通読ガードの有無（20KB以上か）、`docs/coding-standards.md`「コメント」の「今の挙動か昔の話か」の判定。どれを検査項目として採用するか
2. **どこまでを機械的に検査できるようにするか。** `grep`/`wc` で判定できるもの（サイズ超過、通読ガードの有無、タスク番号の混入、リンク切れ）と、読まないと分からないもの（重複・冗長）を分ける。前者はスキルにコマンドとして書ける
3. **1回の実行でどこまでやるか。** 対象は `docs/`（`history/` 除く）9ファイル＋`README.md`＋`CLAUDE.md`。全件を1回で見るのか、1ファイル/1観点ずつなのか。`/next-task` が「1タスク＝1コミット」なので、スキルの実行単位もそれに合わせる必要がある
4. **委譲してよいか、`/loop` に載せてよいか。** `plan-tasks` は方針決めを含むため委譲禁止・`/loop` 禁止としている。ドキュメント整備は「正典をどちらに寄せるか」の判断を含むので、同じ扱いにするかを決める
5. **`develop/tasks.json` にタスクを登録する形にするか、その場で直す形にするか。** 前者なら `/plan-tasks` と役割が重なる。後者なら `/next-task` と重なる。既存2スキルとの境界を決める

## やること

1. 論点1〜5を決める。**論点1（検査項目）が最も重要**で、ここが曖昧なままだとスキルとして機能しない
2. `.claude/skills/<スキル名>/SKILL.md` を作る。既存2スキルと同じ構成（frontmatter の `name` / `description`、`## 手順`、`## 完了報告のフォーマット`）に揃える
3. **判断基準は既存の正典（`docs/coding-standards.md`「コメント」、`docs/architecture.md`「このドキュメントの読み方」、`docs/workflow.md`）に置き、スキル側で二重に書かない。** 既存2スキルがこの書き方をしている
4. `CLAUDE.md`「導入済みスキル」に1行追加する（プロジェクト独自スキルとして `next-task`・`plan-tasks` を挙げている箇所）
5. **作ったスキルを実際に1回走らせて、検査項目が機能することを確かめる**。何も指摘が出ない、あるいは全ファイルが指摘だらけになるなら、論点1の基準が使い物になっていない
6. 調べた結果、既存の `/code-review` スキルのStandards軸と大きく重なると分かった場合は、新規スキルを作らず既存スキルの拡張として提案する。**その場合は新規作成せず、理由を `evidence` に書いて閉じる**

## 完了条件

- `.claude/skills/<スキル名>/SKILL.md` が存在し、frontmatter に `name` と `description` がある
- スキルの手順に、**機械的に実行できる検査コマンドが最低1つ**書かれている（`grep`・`wc` など、実行すれば真偽が決まるもの）
- 「冗長」「重複」「読みにくい」に対応する検査項目が、**それぞれ何を見れば判定できるかの形で**書かれている（「適切に整理する」のような、読み手によって結論が変わる書き方をしない）
- スキルを1回実行した結果（対象ファイルと、出た指摘の件数）が `evidence` に書かれている
- 対象範囲に `docs/history/` が**含まれていない**ことがスキル本文に明記されている
- `CLAUDE.md`「導入済みスキル」に追記されている
- `pnpm check` が通る
- スキル本文・ドキュメントにタスク番号を書かない（`docs/coding-standards.md`「タスク番号を書かない」）

## 注意

- **`docs/history/` 配下は対象外**（`tasks-archive.md` 532KB・`progress-archive.md` 124KB・`direction.md` 20KB・`test-inventory.md` 22KB）。当時の記述をそのまま残す規約があるため、整備の対象にしない。ただし `test-inventory.md` は `history/` にありながら `docs/coding-standards.md` から参照される現役の資料なので、対象に含めるかは論点として扱ってよい
- **既存スキル（`.claude/skills/` 配下の他9つ）を書き換えない。** mattpocock/skills 由来のものを含む
- スキルの設計はユーザーと決める前提のため、`/loop /next-task` には載せない

**dependencies**: なし

**difficulty**: opus

**evidence**: `.claude/skills/maintain-docs/SKILL.md` を新規作成（機械的検査7項目）。SKILL.md に埋め込んだコマンドをそのままコピペ実行して動作を確認。 初回実行: 対象8ファイル、確定群（検査1・3・4）0件、検査2は3件とも `docs/workflow.md` の文書化済み例外、候補群は検査5=7件・検査6=6件・検査7=4件の計17件。 `pnpm check` 通過（32ファイル・359テスト）。`/code-review` は git diff 起点で対象が重ならないため既存スキルの拡張ではなく新規作成とした。

## T-152

**タスク**: `src/steps/build-plans/sub-steps/shared/values-yaml-draft.ts` の型と命名を見直す。

## 背景

このファイルは4つの型を export しているが、**2つは外部から1度も使われていない**（`grep -rn '<型名>' src/` で確認済み）:

| 型                 | ファイル外での使用                                                                                                              | 実態                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ValuesYamlDraft`  | 4ファイル（`build-plans.ts`・`stage-image-tag-updates.ts`・`stage-helm-target-branch-updates.ts`・`sub-steps/shared/types.ts`） | 現役                                                                    |
| `ValuesYamlSource` | 3ファイル（`build-plans.ts:65` が構築、2つのサブステップが引数で受ける）                                                        | 現役                                                                    |
| `ValuesYamlEntry`  | **0件**                                                                                                                         | `ValuesYamlDraft` の値型としてファイル内でしか使われない                |
| `DraftValuesYaml`  | **0件**                                                                                                                         | `readValuesYamlDraft()` の戻り値型。呼び出し側2箇所は即座に分解している |

**命名が読みにくさの主因になっている**:

- `ValuesYamlDraft`（下書きそのもの＝`ReadonlyMap`）と `DraftValuesYaml`（読み込み結果＝`{content, draft}`）が**語順を入れ替えただけの名前**で、同じファイルに隣り合って定義されている
- 呼び出し側2箇所（`stage-image-tag-updates.ts:93`・`stage-helm-target-branch-updates.ts:46`）はどちらも `const { content: valuesYamlContent, draft } = await readValuesYamlDraft(...)` と、`content` を `valuesYamlContent` に**改名しながら**分解している。フィールド名がその場では曖昧だという合図
- `readValuesYamlDraft(source, draft, valuesPath)` の引数 `source` は `{gitlabCache, chart}` を束ねただけの値

ユーザーからの指摘は「型がなぜそういう型でまとめたのか、引数がなぜそういう命名なのかなど疑問に思う程度にはわかりづらい」。

**先に読むこと**: `docs/architecture.md` の「下書き（`ValuesYamlDraft`）は受け取って返す」節に、現在の形にした理由が3点書かれている（複製の責任を実装側に寄せた／読み込み用と書き込み用で入口を分けて不変条件を保っている／内容と「書き換えた」印を1つのエントリにまとめて「印はあるのに内容が無い」を型で防いでいる）。**これらは維持する**。

## 解くべき論点

1. **`DraftValuesYaml` を無くすか。** 呼び出し側が必ず分解しているので、戻り値の形をその場に書けば名前の衝突が消える。一方で戻り値に名前が無くなることの読みにくさもある
2. **`ValuesYamlEntry` を export のままにするか。** `docs/coding-standards.md`「関数の並び順」は「テストのためだけの export はしない」と定めており、型も同じ考え方で判断する
3. **`content` というフィールド名・引数名を変えるか。** 呼び出し側が毎回 `valuesYamlContent` に改名しているので、その名前を型側に寄せる案がある

## やること

1. `docs/architecture.md`「下書き（`ValuesYamlDraft`）は受け取って返す」を読み、維持すべき不変条件を確認する
2. 論点1〜3を決めて適用する。**`ValuesYamlDraft` と `ValuesYamlSource` は現役なので消さない**
3. JSDoc を見直す。「なぜこの単位でまとめたのか」がコードから読み取れないなら、**その理由は `docs/architecture.md` が正典**なので、コメントには書かず正典を参照する（`docs/coding-standards.md`「コメント」）
4. 型の統廃合が上記3つの不変条件のいずれかを壊すと分かったら、**その変更はやらずに理由を `evidence` に書く**
5. 論点1〜3を超える構造変更（`ValuesYamlDraft` の表現そのものを変える、サブステップ間の受け渡し方を変える等）が必要だと判断したら、**押し切らずユーザーに提案する**。`difficulty` を上げて再開してよい

## 完了条件

- `grep -rn 'ValuesYamlEntry\|DraftValuesYaml' src/` の結果が、決めた方針で説明できる状態になっている（残した場合は理由を `evidence` に書く）
- `ValuesYamlDraft` と語順を入れ替えただけの型名が同じファイルに存在しない
- `docs/architecture.md`「下書き（`ValuesYamlDraft`）は受け取って返す」に書かれた3つの理由が、変更後のコードでも成り立っている（成り立たなくなった項目があれば正典側を更新する）
- `src/steps/build-plans/sub-steps/` 配下のファイル同士が互いに import していない（`CLAUDE.md` 原則1。共有は `sub-steps/shared/` 経由）
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **`ValuesYamlDraft` と `ValuesYamlSource` は他ファイルから使われているので消さない**
- 引数として渡した下書きを呼び出し先で書き換える形に戻さない（`docs/architecture.md`「引数として渡した入れ物が呼び出し先で書き変わる契約にしない」）
- 読み込み用（`readValuesYamlDraft`）と書き込み用（`writeValuesYamlDraft`）の入口を1つにまとめない。分けてあること自体が「`modified` なエントリは書き込み経由でしか生まれない」不変条件を保っている
- `/loop /next-task` に載せてよい（論点5に当たったら止めてユーザーに預ける）

**dependencies**: なし

**difficulty**: sonnet

**evidence**: DraftValuesYaml を削除し readValuesYamlDraft() の戻り値をインライン型に、フィールド名を content→valuesYamlContent に変更。ValuesYamlEntry は export を外してファイル内限定に（外部・テストとも0件だったため）。ValuesYamlDraft・ValuesYamlSource は現役なので維持。呼び出し側2箇所の `content: valuesYamlContent` という分解時の改名が不要になった。実測: grep 'ValuesYamlEntry|DraftValuesYaml' src/ は非exportの型定義と ValuesYamlDraft の別名定義の2行のみ、DraftValuesYaml は0件。docs/architecture.md「下書きは受け取って返す」の3つの不変条件（複製の責任・読み書きの入口分離・内容と印を1エントリ）はいずれも維持。pnpm check 通過（32ファイル359テスト、着手前と同数）。受け入れ時にメインで追加確認: steps/ の try 0件・新規 as 0件・?: 0件、sub-steps/ 直下のファイル同士の import 0件、ドキュメント側に旧型名の残存なし（architecture.md:466 の ReadDraftValuesYaml は「以前この形だった」の経緯記述で別物）。

## T-156

**タスク**: `config/` のファイル名とキー名の変更を正典に先行して反映し、コード側の識別子をどこまで追随させるかを決める。

## 背景

`config/<chartディレクトリ>/chart.yaml` は2つのトップレベルキーを持つ（`src/lib/config/schema.ts` の `ChartYamlSchema`）:

- `chart:` … MRを送る先のGitLabプロジェクト（`projectId` / `projectName` / `mrTargetBranch`）。型は `ChartRepoConfig`（`src/types/types.ts`）
- `apps:` … ソースリポジトリごとの `tagFormat` の台帳（`projectId` / `projectName` / `tagFormat`）。型は `ChartApp`（`schema.ts` からexport）

一方 `config/<chartディレクトリ>/<unitPath>/config.yaml` は `apps[].chart[]` と `helm.chart[]` を持つ。結果として **`chart` と `apps` という同じ2語が入れ子違いで両方のファイルに現れ**、別々のことを定義しているのに鏡写しに見える。さらに `chart` は「更新先のGitLabプロジェクト」と「values.yaml内の書き込み位置」という2つの意味で使われており、`docs/architecture.md`「1つの語を2つの意味に使わない」（用途を語らない `chart` を避けるべき例として名指ししている）に反している。

ユーザーとの合意で**次の3点は決定済み**。ここを論点にしない:

- ファイル名 `chart.yaml` → `registry.yaml`
- キー `chart:` → `chartToUpdate:`（`config.yaml` の `branchToSync` と同じ `XToY` の語形）
- キー `apps:` → `appSpecs:`

`config.yaml` は**変更しない**（ファイル名・キー名とも据え置き。`apps[].chart[]` と `helm.chart[]` も触らない）。

このタスクは正典の更新までで止め、実装・テスト・実 `config/` は次のタスクが行う。`tagFormat` の置き場所を変えたときも「正典を先に更新 → 移行」の順で進めた前例がある。

## 解くべき論点

1. **コード側の識別子をどこまでYAMLキーに追随させるか。** 候補は `ChartYamlSchema`・`ChartApp`（`src/lib/config/schema.ts`）、`chartYamlPath`・`chartApps`（`src/lib/config/config.ts`・`chart-and-apps.ts` のローカル変数）、`ChartRepoConfig`（`src/types/types.ts`）、`ChartAndApps.chart` フィールド。
   **`ChartAndApps.chart` は残す方向で検討する**: `docs/architecture.md`「1つの語を2つの意味に使わない」が「包含する型名が用途を与えている場合は短い名前のままでよい」の例として `ChartAndApps.chart` を名指ししているため。この判断を覆すなら、その節も書き換える必要がある
2. **`ChartRepoConfig` を改名するか。** YAMLキーが `chartToUpdate` になっても、型が表しているのは「chartリポジトリの設定」であって変わらない。改名するなら `docs/architecture.md`「型の置き場所」の表も追随させる
3. **`docs/glossary.md`「chart.yaml / config.yaml」の項をどう書き換えるか。** この項は**経緯**（`apps.yaml` → `anchors.yaml` → 2ファイル構成）を長く持っている。経緯は当時の名前のまま残し、現在の姿の記述だけを新しい名前にするのか、経緯側も置換するのか
4. **`docs/requirements-grilling.md` の1箇所を触るか。** 要件検討時のQ&Aログで、`docs/history/` と同じく当時の記述をそのまま残す扱い（`/maintain-docs` の対象からも外している）。**触らない方向で検討する**

## やること

1. 論点1〜4を決める。決めた内容は `docs/architecture.md`「`config/`は「スコープ」で2ファイルに分け、変更頻度では分けない」節に追記する（改名の理由と、`config.yaml` を据え置いた理由）
2. 正典3ファイルを新しい名前に書き換える。現状の出現数は `docs/requirements.md` 17箇所・`docs/glossary.md` 13箇所・`docs/architecture.md` 6箇所（`grep -c 'chart\.yaml'`）
   - `docs/requirements.md` 4.4節が `config/` のスキーマの正典。YAMLの実例を含むので、実例のキー名も直す
   - `docs/glossary.md` の「chart.yaml / config.yaml」の項は見出し名自体が変わる。**見出しを変えたら冒頭の「用語の索引」も直す**
   - `docs/architecture.md` の該当節を直したら、**同じファイル内の「節の索引」・各ファイルの責務表・「型の置き場所」の表まで `grep` で洗う**
3. 実装・テスト・実 `config/` は**触らない**（次のタスク）。この時点で正典とコードが食い違うのは想定どおり

## 完了条件

- 論点1〜4の結論が `docs/architecture.md` に書かれている（コード側の識別子について「何を変え、何を変えないか」が読み取れる）
- `grep -rn 'chart\.yaml' docs/requirements.md docs/architecture.md docs/glossary.md` が0件
- `grep -rn 'chart\.yaml' src scripts test` は**まだ0件でなくてよい**（次のタスクの範囲）
- `docs/glossary.md` の「用語の索引」と `docs/architecture.md` の「節の索引」が、変更後の見出しと一致している
- `pnpm check` が通る
- ドキュメントにタスク番号を書かない

## 注意

- **`docs/history/` 配下は触らない**（当時の記述をそのまま残す）
- `docs/requirements-grilling.md` も同じ扱い（論点4で確認する）
- 実 `config/yadokari-smoke-test-chart/chart.yaml` はこのタスクでは触らない
- `/loop /next-task` に載せてよい（命名は決定済みで、残る判断は正典に書く範囲の話）

**dependencies**: なし

**difficulty**: opus

**evidence**: 正典3ファイルを新名称に更新（`docs/requirements.md` 17件・`docs/glossary.md` 13件・`docs/architecture.md` 6件 → `grep -rn 'chart\.yaml'` で3ファイルとも0件）。 コード識別子の追随範囲は「外部ファイル形式の写しかどうか」で決め、7件の識別子の可否表を `docs/architecture.md` の該当節に追記（`ChartRepoConfig`・`ChartAndApps.chart` は据え置き）。 `pnpm check` 通過（32ファイル・359テスト）。索引の整合も検査済み（索引エントリを sed で切り出す検査でNG 0件）。

## T-146

**タスク**: 既定パス `config/` で本番の定期実行を開始する（手動のDRY_RUN実行 → pipeline schedule 作成）。

## 背景

`config/` への登録が済み（前段タスク）、gitlab.com の `sinnlosses-group/helm-yadokari` で定期実行を開始できる状態になる。CI/CD Variables（`GITLAB_URL` / `ACCESS_TOKEN`）は**登録済み**だが、**pipeline schedule はまだ作成されていない**（2026-09-08時点、ユーザー確認済み）。

ユーザーとの合意事項:

- 対象GitLabは gitlab.com の `sinnlosses-group`
- 対象chartリポジトリは `yadokari-smoke-test-chart`（スモークテスト用と同じもの）
- **まず `DRY_RUN=true` で手動実行し、ログを確認してから** schedule を有効化する
- schedule は **平日 JST 9:00**、`DRY_RUN` は載せない（＝既定の `false` で実際にMRを作る）

`update-app-versions` ジョブは `.gitlab-ci.yml` の rules により `schedule`（`RENOVATE != "true"`）と `web`（手動）で動く。`web` トリガーは `when: manual` なのでパイプライン作成後に手で開始する。

## 解くべき論点

1. **`DRY_RUN=true` の手動実行を、CI（web トリガー）で行うかローカル（`pnpm dev`）で行うか。** CIで行えば「CI環境の変数・権限で既定パスが通る」ことまで確かめられるが、ローカルより手間がかかる。既定パスをCIで通すことがこのタスクの主目的なので**CI側が本命**
2. **手動実行で対象を絞るか（`TARGET_UNITS`）、全件で回すか。** 登録は3設定ユニットなので全件でも小さい

## やること

**このタスクはGitLab UI上の操作を含むため、実行はユーザーに依頼する。エージェントが代行しない。**

1. ユーザーに提示する手順を、コピーして実行できる形にまとめる:
   - `DRY_RUN=true` での手動実行（GitLab UI: CI/CD > Pipelines > Run pipeline、変数 `DRY_RUN=true` を追加 → `update-app-versions` ジョブを手動開始）
   - 確認すべきログの箇所（`run_start` の `configDirPath` が `config` になっていること、各設定ユニットの結果、`DRY_RUN` でMR・タグ・ブランチが作られていないこと）
   - pipeline schedule の作成手順（Settings > CI/CD > Schedules、cron・タイムゾーン `Asia/Tokyo`・平日 JST 9:00、変数は追加しない）
2. ユーザーが実行した結果（ログの要点）を受け取り、`evidence` に記録する
3. 想定と違う挙動があれば、原因を切り分けて報告する（修正は別タスクに切る）

## 完了条件

- `DRY_RUN=true` の手動実行が成功し、**ログの `run_start` に `configDirPath: "config"` が出ている**ことをユーザーの実行結果で確認できている（`evidence` に該当行を書く）
- 手動実行でMR・タグ・ブランチが**作られていない**ことを確認できている
- pipeline schedule が作成され、cron・タイムゾーン・変数の設定内容が `evidence` に書かれている
- `develop/progress.md` の「注意」にある**テスト用アクセストークンの扱いが「本番用として継続利用」に更新されている**（失効させない方針に決まったため、宿題として残さない）

## 注意

- **GitLab上の操作（手動実行・schedule作成・変数の変更）はすべてユーザーが行う。** エージェント／セッションから実行しない
- **`/loop /next-task` には載せない**（ユーザー操作の完了を待つため）
- schedule を有効化すると、平日毎朝 `yadokari-smoke-test-chart` にMRが作られるようになる。スモークテストを回すときは定期実行と時間が重ならないよう注意する（同じ固定ブランチを使うため）

**dependencies**: T-145

**difficulty**: sonnet

**evidence**: CIの手動実行（web、`DRY_RUN=true`）のログで `{"event":"run_start",...,"dryRun":true,"configDirPath":"config"}` を確認。3設定ユニットとも `reason:"dry_run"` で `summary` は `CREATED:0, SKIPPED:3, ERROR:0`（MR・タグ・ブランチは未作成）。 作成済みスケジュールをAPIで実測（`GET /projects/86060538/pipeline_schedules`、1本のみ）: cron `0 9 * * *` / timezone `UTC` / ref `refs/heads/main` / variables `[]` / active `true` / next_run_at `2026-09-10T09:00:00Z`。 **合意の「平日 JST 9:00」に対し実際は「毎日 18:00 JST」だが、ユーザー判断でこのまま採用**（土日は更新が無ければ `no_diff` で終わるため）。着手前にスモーク残骸（MR !28/!29・固定ブランチ2本）を `reset --apply` で除去済み。

## T-151

**タスク**: `StepOutcome` の `settled` が SKIPPED と ERROR の2種を1つの枝に混ぜている点を解く。

## 背景

`src/steps/shared/step-outcome.ts` の `StepOutcome<T>` は2枝:

```ts
export type StepOutcome<T> =
  | { readonly status: "ok"; readonly value: T }
  | { readonly status: "settled"; readonly result: ChartUpdateResult }
```

`settled` に入る値は実際には2種類ある（指摘は事実）:

- `settle("SKIPPED")` … `src/steps/filter-targets/filter-targets.ts:44,50`（登録アプリ0件 / オープン中のMRあり）と `src/steps/build-plans/build-plans.ts:83,93`（差分なし / dry-run）の計4箇所
- `"ERROR"` … `withHandling()` が捕捉した例外を `settleAsError()` に渡した戻り値。`settle<T>(settleAsError(err, logContext))` の形で同じ枝に入る

**さらに型が実態より広い。** `settle()` の引数は `ChartUpdateResult = "CREATED" | "SKIPPED" | "ERROR"`（`src/types/types.ts:107`）だが、`"CREATED"` は `settle()` に渡されない。`"CREATED"` は `src/steps/apply-updates/apply-updates.ts` の `return ok<ChartUpdateResult>("CREATED")` として `ok` 枝から出る。つまり `settle("CREATED")` は型では書けてしまうが意味を持たない。

一方、**消費側3箇所は SKIPPED と ERROR を区別していない**:

- `filter-targets.ts:28` / `build-plans.ts:42`: `partitionMap(outcomes, (o) => o.status === "ok" ? left(o.value) : right(o.result))`
- `apply-updates.ts:27`: `outcomes.map((o) => o.status === "ok" ? o.value : o.result)`

区別が必要になるのは最終集計だけで、`src/main.ts:72` が `{ CREATED: 0, SKIPPED: 0, ERROR: 0 }` に数え上げ、`main.ts:25` が `resultCounts.ERROR === 0` で終了コードを決める。判別に使う情報は `result` の文字列として既に載っているため、**情報は失われていない**。問題は型の枝の名前（`settled`）が「意図的なスキップ」と「失敗」を同居させていることが読み取れない点にある。

## 解くべき論点

1. **3枝に分ける（`ok` / `skipped` / `error`）か、2枝のまま型を狭めるか。** 3枝にすると消費側3箇所が2分岐では書けなくなり、`partitionMap()`（`src/utils/partition.ts`。2バケツ前提のユーティリティ）の使い方も変わる。2枝のまま `settle()` の引数と `settled.result` を `"SKIPPED" | "ERROR"` に狭めるだけなら、消費側は無変更で `settle("CREATED")` が書けなくなる
2. **`docs/architecture.md`「エラーは『fatalは例外・それ以外は戻り値』の2チャネル」との整合。** この節は「2チャネルを1つの`Result`型に寄せる案は採らない」と明記している。今回の変更が、そこで退けた形（stepにfatal判断が戻る）に近づいていないかを確認する。**近づくなら採らない**
3. **狭めた型に名前を付けるか。** `"SKIPPED" | "ERROR"` に `SettledResult` のような名前を与えるか、その場に書くか。`docs/architecture.md`「型の置き場所」の判断表に従う
4. **`settled` という枝名を変えるか。** 変えると `main.ts:50,55` の `settled: filtered` / `settled: planned` や `FilterTargetsResult`・`BuildPlansResult` のフィールド名にも波及する

## やること

1. 論点1〜4を検討し、**結論をユーザーに提案して承認を得てから適用する**。エラー方針は `docs/architecture.md` が設計判断として明文化している領域なので、勝手に変えない
2. 承認された形に `src/steps/shared/step-outcome.ts` を変更し、波及先（`filter-targets.ts`・`build-plans.ts`・`apply-updates.ts`・必要なら `main.ts` と `src/types/types.ts`）を追従させる
3. 変更後、`docs/architecture.md`「エラーは『fatalは例外・それ以外は戻り値』の2チャネル」の節を実態に合わせる。**この節が現在の形を説明できなくなっていたら、節のほうを更新する**
4. 検討の結果「現状のままがよい」と結論した場合は、**変更せずにその理由を `evidence` に書いて閉じる**。ただしその場合でも、型が実態より広い点（`settle("CREATED")` が書ける）は独立した欠陥なので、そこだけは狭める

## 完了条件

- `settle()` に `"CREATED"` を渡すコードが**型エラーになる**（`npx tsc --noEmit` で確認し、確認方法を `evidence` に書く）
- SKIPPED と ERROR を区別したい箇所（`src/main.ts` の集計）が、区別できる形のままである
- `grep -rn "try {" src/steps/` が **0件**（`docs/architecture.md` が定める機械的確認。この規約を壊していないことの担保）
- `docs/architecture.md`「エラーは『fatalは例外・それ以外は戻り値』の2チャネル」の記述が、変更後のコードを説明できている
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **`src/steps/` 配下に `try`/`catch` を書かない**という規約を壊さない（`docs/coding-standards.md`「エラーハンドリング」）
- `settleAsError()` が `FatalError` を投げる経路（401/5xx/ネットワーク障害で実行全体を止める）を変えない。ここを戻り値に寄せる案は `docs/architecture.md` が明示的に退けている
- `src/steps/` 配下の各ファイルは互いに import しない（`CLAUDE.md` 原則1）。共通化するなら `steps/shared/` に置く
- **設計変更の承認が要るので `/loop /next-task` には載せない**

**dependencies**: なし

**difficulty**: opus

**passes**: false（完了条件を満たしていない）

**evidence**: ユーザー判断により**着手しない方針で閉じた**（2026-09-09）。`passes: false` は完了条件を満たしていないことを表す。 指摘自体は事実（`settle("SKIPPED")` 4箇所と `settleAsError()` の `"ERROR"` が同じ枝に入り、`settle()` の引数型には `"CREATED"` も渡せる）だが、消費側3箇所は両者を区別しておらず、集計に必要な情報は `result` の文字列として失われていない。 再開するなら `docs/architecture.md`「エラーは『fatalは例外・それ以外は戻り値』の2チャネル」の方針変更の承認から始める。

## T-157

**タスク**: `chart.yaml` → `registry.yaml` の改名とキー名の変更を、実装・テスト・実 `config/`・残りのドキュメントに反映する。

## 背景

前段タスクで正典（`docs/requirements.md` 4.4節・`docs/architecture.md`・`docs/glossary.md`）は新しい名前に更新済み。この時点で正典とコードが食い違っているので、実装側を追随させる。

決定済みの変更:

- ファイル名 `chart.yaml` → `registry.yaml`
- キー `chart:` → `chartToUpdate:`
- キー `apps:` → `appSpecs:`
- `config.yaml` は**変更しない**（ファイル名・キー名とも据え置き）

コード側の識別子をどこまで追随させるかは**前段タスクが `docs/architecture.md` に記録済み**。着手前にその節を読み、そこに書かれた範囲で改名する（このタスクで決め直さない）。

主な変更箇所（`grep -rn 'chart\.yaml'` の現状値）:

- `src/` 25箇所。特に `src/lib/config/config.ts:71`（`existsSync(join(chartDirPath, "chart.yaml"))`）と `:187`（`const chartYamlPath = join(...)`）がファイル名のリテラル、`:98`・`:121` がエラーメッセージ中の文字列
- `src/lib/config/schema.ts` の `ChartYamlSchema`（`chart` / `apps` の2キー）と `ChartApp`
- `test/` 23箇所（`test/lib/config/fixture.ts`・`config.test.ts`・`schema.test.ts`・`validate.test.ts`・`test/main.e2e.test.ts`）
- `scripts/lint/verify-config/verify-config.ts` 2箇所
- `README.md` 7箇所
- 実 `config/yadokari-smoke-test-chart/chart.yaml` 1ファイル（`git mv` で改名し、2キーを書き換える）

## やること

1. `docs/architecture.md` の該当節を読み、コード側の識別子の改名範囲を確認する
2. 実 `config/yadokari-smoke-test-chart/chart.yaml` を `git mv` で `registry.yaml` にし、`chart:` → `chartToUpdate:`、`apps:` → `appSpecs:` に書き換える
3. `src/`・`scripts/`・`test/` を追随させる。ファイル名のリテラルとエラーメッセージも含む
4. `README.md`・`config/README.md`・`docs/smoke-test.md`・`CLAUDE.md` に `chart.yaml` の記述があれば直す（`config/README.md`・`docs/smoke-test.md`・`CLAUDE.md` は現状0件だが、前段タスクの結果で増える可能性があるので着手時に `grep` で確認する）
5. `pnpm lint:validate-config` が実 `config/` を読めることを確認する（位置引数なしで `3 設定ユニット, 5 apps` が出る）

## 完了条件

- `grep -rn 'chart\.yaml' src scripts test config README.md CLAUDE.md docs` が0件（`docs/history/` と `docs/requirements-grilling.md` を除く）
- 実 `config/` に `registry.yaml` が存在し、`chart.yaml` が存在しない
- `pnpm lint:validate-config` が位置引数なしで成功する（出力を evidence に書く）
- `pnpm check` が通る（テスト件数を evidence に書く。改名だけなので**件数は変わらないはず**で、減っていたら理由を確認する）

## 注意

- **`docs/history/` 配下と `docs/requirements-grilling.md` は触らない**
- 実 `config/` の変更はGitLab上のプロジェクトIDやアンカー名を変えるものではないので、`validate-config-remote` の検証結果は変わらない。**値そのものは書き換えない**
- ファイルの移動は `git mv` を使う（履歴を残すため）
- `/loop /next-task` に載せてよい

**dependencies**: T-156

**difficulty**: sonnet

**evidence**: `config/yadokari-smoke-test-chart/chart.yaml` を `git mv` で `registry.yaml` にし（`git status` が `RM` で記録、値は不変）、16ファイルを追随させた。 `grep -rn 'chart\.yaml' src scripts test config README.md CLAUDE.md docs`（history・grilling除く）が0件。`pnpm lint:validate-config` が位置引数なしで `config OK: 3 設定ユニット, 5 apps`。 `pnpm check` 通過（32ファイル・359テスト。改名のみなので着手前と同数）。可否表の据え置き対象（`ChartRepoConfig`・`ChartAndApps.chart`・`chart-and-apps.ts`・`ConfigYamlSchema`/`AppSchema`）が残存し、旧名5種は0件。

## T-158

**タスク**: `isFatalError()` がネットワーク障害を検出できていない件を解く。

## 背景

`src/utils/http.ts` の `isFatalError()` は、HTTPステータスが取れないときエラー自身の `code` を見る:

```ts
if (!(error instanceof Error)) return false
if (!hasKey(error, "code")) return false
const { code } = error
return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT"
```

しかし gitbeaker が使う undici の `fetch` は `TypeError: fetch failed` を投げ、**実際の
`code` は `error.cause.code` に入る**。実測（gitbeaker 経由で存在しないホストへ
`Projects.show` を呼ぶ）で確認した結果:

```
name: TypeError | msg: fetch failed
e.code: undefined
cause: Error code=ENOTFOUND msg=getaddrinfo ENOTFOUND ...
extractHttpStatus: undefined
>>> isFatalError: false
```

この結果、DNS障害・接続拒否でも `FatalError` にならず、`settleAsError()` は各chartAndAppsを
`ERROR` としてログに落として処理を続ける。`mapWithConcurrency()` の `limit.clearQueue()` も
走らないため、全設定ユニットぶん同じ失敗を繰り返す。`fatal_error` イベントも出ない。

**正典3箇所がこの挙動を約束している**:

- `README.md`「エラーハンドリング」表の「401 認証エラー / 5xx サーバーエラー / ネットワーク障害
  → 即時 `exit(1)` でパイプライン失敗」
- `CLAUDE.md`「コーディング規約・レビュー方針」の「401 / 5xx / ネットワーク障害は
  `FatalError` を投げて即時終了」
- `docs/coding-standards.md`「エラーハンドリング」の同じ記述

`exit(1)` にはなる（`ERROR` が1件以上あるため）ので終了コードは合っているが、「即時」も
`FatalError` の識別も失われている。

**テストが実在しない形を検証している。** `test/utils/http.test.ts:80` は
`Object.assign(new Error(...), { code })` という平たいエラーを組み立てているため、
`cause` にコードが入る実際の形では落ちない。ここを直さないと修正しても回帰を検知できない。

## 解くべき論点

1. **`cause` を何段まで辿るか。** 1段（`error.cause.code`）で足りるか、ループで辿るか。
   `extractHttpStatus()` は `cause.response.status` の1段だけを見ており、そちらとの
   一貫性をどう取るか。深く辿るほど、無関係な内側のエラーを拾う危険が増える
2. **`code` の判定をどこに置くか。** `extractHttpStatus()` と同じ「エラーの形を読む」責務なので
   `http.ts` 内の非公開ヘルパー（例: `extractErrorCode()`）に切り出すか、`isFatalError()` に
   直接書くか。`src/utils/http.ts` 冒頭のコメントが「@gitbeaker/rest がスローするエラー構造に
   依存している」と宣言しているので、その宣言も実態に合わせる必要がある
3. **リトライ方針を変えるか。** `src/utils/retry.ts` の `RETRYABLE_STATUSES` は
   429/502/503/504 だけで、ネットワーク障害はリトライしない。fatal 扱いにするなら
   リトライしないのが筋だが、**この論点で結論を出して `evidence` に書く**（変えるなら
   `README.md` のリトライ行も直す）
4. **`ETIMEDOUT` は現状の `fetch` では発生しうるか。** タイムアウトを設定していないため
   `ETIMEDOUT` が実際に来るのはOSのTCPタイムアウト時だけ。ここは T-159 の論点なので
   **このタスクでは判定リストから外さない**（消すなら T-159 と一緒に判断する）

## やること

1. 論点1〜4を検討する。**`docs/architecture.md`「エラーは『fatalは例外・それ以外は戻り値』の
   2チャネル」を先に読む**。今回の変更は方針の変更ではなく「方針どおりに動いていなかったのを
   直す」ことなので、この節の記述が変わらないことを確認する（変わるなら方針変更なので
   ユーザー承認を取る）
2. `src/utils/http.ts` の `isFatalError()` を、`cause` に入った `code` も見るように直す
3. `test/utils/http.test.ts` の `isFatalError` のテストを**実際の形**に合わせる。
   平たい `code` のケースを消すのではなく、`cause` に入る形のケースを**足す**
   （gitbeaker のバージョン差でどちらの形も来うるため）
4. 実測で裏を取る。存在しないホストを指す `GitlabClient` で `Projects.show` を呼び、
   `isFatalError()` が `true` を返すことを確認する（確認に使ったコマンドと出力を
   `evidence` に書く）
5. 論点3の結論に応じて `src/utils/retry.ts` と `README.md` を直す。変えない結論なら
   その理由を `evidence` に書く

## 完了条件

- gitbeaker 経由の DNS 解決失敗（存在しないホスト）で `isFatalError()` が `true` を返すことを、
  実行して確認できている（コマンドと出力を `evidence` に書く）
- `isFatalError()` の修正を戻すと落ちるテストが**1件以上ある**（変異で確認し、件数を
  `evidence` に書く）
- `grep -rn "try {" src/steps/` が **0件**（`docs/architecture.md` が定める機械的確認）
- `README.md`「エラーハンドリング」表・`CLAUDE.md`・`docs/coding-standards.md`
  「エラーハンドリング」の記述が、修正後のコードを説明できている
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **`src/steps/` 配下に `try`/`catch` を書かない**規約を壊さない
- `FatalError` が投げられる経路（`settleAsError()`）自体は変えない。直すのは判定だけ
- HTTPステータスの直書きを散らさない（`docs/coding-standards.md`「エラーハンドリング」）
- タイムアウトの追加は **T-159 の担当**。このタスクでは入れない
- `/loop /next-task` に載せてよい（正典が既に約束している挙動へ寄せる修正のため）

**dependencies**: なし

**difficulty**: opus

**evidence**: `opus` に委譲。`isFatalError()` の `code` 直読みを非公開ヘルパー `extractErrorCode()` に切り出し、**`cause` を1段だけ辿る**ようにした（際限なく辿らない根拠は `rethrowWithAppContext()` が「致命的エラーは包み直さない」を保証していること）。`code` が文字列であることも確認する。論点3は「リトライ方針を変えない」で決着（fatal＝即時終了とリトライは両立しないため）。 **メイン側で独立に実測**: `createClient()` 経由で存在しないホスト／接続拒否ポートへ `Projects.show`。連鎖は `TypeError(code=undefined) -> Error(code=ENOTFOUND/ECONNREFUSED)` の1段で、どちらも `isFatalError: true`（着手前は false）。 変異確認: `cause` を辿るのをやめると3件、`ETIMEDOUT` を消すと2件のテストが落ちる。`grep -rn 'try {' src/steps/` は0件。`pnpm check` 通過（32ファイル367テスト、着手前361から+6）。正典3箇所は元から正しい方針を書いていたので無修正（ズレていたのはコード側だけ）。

## T-159

**タスク**: GitLab APIへのリクエストのタイムアウト方針を決めて、正典に書く。

## 背景

`src/utils/http.ts` の `isFatalError()` は `ETIMEDOUT` を致命的エラーとして数えているが、
**このツールはどこにもタイムアウトを設定していない**:

- `src/lib/gitlab/gitlab.ts` の `createClient()` は `new Gitlab({ host, token })` だけで、
  タイムアウトのオプションを渡していない
- Node の `fetch`（undici）に既定のリクエストタイムアウトは無い

`grep -rn "タイムアウト|timeout|ETIMEDOUT" docs/requirements.md docs/architecture.md README.md`
が**0件**で、方針そのものが正典に無い。

現状の歯止めは `.gitlab-ci.yml` の `update-app-versions` ジョブの `timeout: 30 minutes` だけ。
定期実行（毎日18:00 JST）なので、1本ハングすると30分ぶん占有してからジョブ失敗になり、
どこで止まったかはログからしか分からない。

## 解くべき論点

1. **そもそも入れるか。** 入れない場合の被害は「CIジョブのタイムアウトまで待たされる」で、
   定期実行かつ個人〜チーム内利用という前提では許容できる可能性がある。**入れない結論も
   正当な答え**で、その場合は理由を正典に書いて閉じる
2. **どの層に置くか。** (a) `createClient()` に gitbeaker のオプションとして渡す、
   (b) `src/utils/retry.ts` の `withRetry()` に `AbortSignal.timeout()` を挟む、
   (c) `lib/gitlab/gitlab.ts` の各関数。原則2では「GitLab固有の知識」は `lib/gitlab/` だが、
   タイムアウト値そのものは技術非依存の設定値。**gitbeaker 43.x がタイムアウトのオプションを
   持っているかを実際に確認してから決める**（持っていないなら (a) は消える）
3. **値をどう決めるか。** 固定値にするか、環境変数（`CONCURRENCY_LIMIT` と同じ扱い）にするか。
   環境変数にするなら `src/lib/env.ts`・`.env.example`・`.gitlab-ci.yml` の `spec.inputs`・
   `README.md`「設定」章の4箇所に足すことになる。**外部インターフェースが増える**ので、
   固定値で足りるならそちらを選ぶ
4. **タイムアウトを fatal 扱いのままにするか。** 1本のリクエストが遅いだけなら、そのchart
   リポジトリを `ERROR` にして続けるほうが被害が小さいかもしれない。`isFatalError()` の
   `ETIMEDOUT` の扱いと整合させる（T-158 の論点4と対になる）

## やること

1. 論点1〜4を検討し、**結論をユーザーに提案して承認を得てから適用する**。エラー方針と
   外部インターフェース（環境変数）に触れる可能性があるため、勝手に決めない
2. 承認された形を実装する。**論点1で「入れない」と結論した場合は、実装せずに理由を
   `docs/architecture.md`「既知の制約・注意点」に1項目として書いて閉じる**（`evidence` にも
   同じ理由を書く）
3. 入れる結論の場合、`docs/architecture.md` に「なぜその層・その値なのか」を書く。
   環境変数を増やしたなら `README.md`「設定」章・`.env.example`・`.gitlab-ci.yml` の
   `spec.inputs` と `variables` の**4箇所すべて**を追随させる
4. タイムアウトが実際に効くことをテストで守る（`AbortSignal` を使うなら `vi.useFakeTimers()`
   で待たずに検証できる形にする）

## 完了条件

- 論点1〜4それぞれの結論と根拠が `evidence` に書かれている
- 「入れる」結論の場合: タイムアウトが発火する経路を通るテストが1件以上あり、実装を戻すと
  落ちることを変異で確認できている
- 「入れない」結論の場合: `docs/architecture.md`「既知の制約・注意点」に理由が書かれており、
  `grep -n "タイムアウト" docs/architecture.md` が1件以上ヒットする
- 環境変数を増やした場合、`README.md` / `.env.example` / `.gitlab-ci.yml`（`spec.inputs` と
  `variables` の両方）に記述があることを `grep` で確認できている
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **方針決めとユーザー承認が要るので `/loop /next-task` には載せない**
- `.gitlab-ci.yml` の `timeout: 30 minutes` は消さない（最後の歯止めとして残す）
- `CONCURRENCY_LIMIT` の既定値・上限（1〜20）を変えない
- T-158（`isFatalError()` の修正）とは独立に着手してよいが、**論点4だけは互いの結論が
  食い違わないようにする**（先に片方が決まっていたらその結論に合わせる）

**dependencies**: なし

**difficulty**: opus

**evidence**: 承認された案「値を明示＋タイムアウトも fatal」を実装。**前提の誤りを実測で訂正**: gitbeakerは既定 `queryTimeout=300000`ms を `@gitbeaker/core` が全リクエストの `AbortSignal.timeout()` に配線済みで、タイムアウトは元から存在した（永久に応答しないローカルサーバへ `queryTimeout:300` で発火307ms・`GitbeakerTimeoutError`）。`createClient()` に `QUERY_TIMEOUT_MS = 300_000` を明示し、`isFatalError()` がエラー名 `GitbeakerTimeoutError` を fatal と判定するようにした。 変異確認: `isFatalError` の判定行を消すと `http.test.ts` が1件落ちる。**`createClient` の `queryTimeout` を消しても落ちない**（gitbeakerの既定値と同値のため。このテストが守るのは「実効値が5分であること」で、既定値がバージョンアップで変わったら落ちる）。 `grep -rn 'try {' src/steps/` は0件。`pnpm check` 通過（32ファイル361テスト、着手前359から+2）。gitbeakerが429/502に行う内部リトライ（最大10回）も同じsignalを共有するため、5分はリトライ込みの総予算。

## T-160

**タスク**: 本番コードから呼ばれていない `logger.warn` の存否を決める。

## 背景

`src/utils/logger.ts` の `logger.warn` は、**`src/` と `scripts/` から1回も呼ばれていない**
（`grep -rn "logger.warn" src scripts` が0件）。呼んでいるのは
`test/utils/logger.test.ts:63,69` の2件だけ。

`git log -S` で追跡した経緯:

- `882ebec` T-134「タグ命名規則を semver に対応させ、{time} を任意にする」で**新設**された。
  当時は「最新タグが決まらない」場合に `LatestTagResolution.tag` を `undefined` で返し、
  そのappだけ飛ばすときの警告として使われていた
- `e302888` T-144「タグ形式から semver と `{time}` 任意化を撤回し、`tagFormat` 必須にする」で
  **唯一の呼び出し元が消えた**。T-144 のコミットメッセージ自身が「『最新タグが決まらない』
  undefined 経路と app 単位スキップも消滅した」と書いている

関数だけが残り、JSDoc も当時のまま残っている:

```ts
/** 実行は継続するが運用者に気づいてほしい事象（例: 最新タグが決まらずappを見送った） */
warn(fields: Record<string, unknown>): void {
```

この「例」は**今は存在しない挙動**の説明で、`docs/coding-standards.md`「コメント」の
「今の挙動の制約・前提は残す、昔の経緯は正典へ」に反している。

## 解くべき論点

1. **消すか残すか。** 残すなら「将来 warn レベルが要る場面がある」という根拠が要る。
   `README.md`「ログ」章や `docs/requirements.md` が warn レベルの出力を要求していないかを
   先に確認する（要求していれば、消すのではなく**呼び出し元が無いことのほうが欠陥**）
2. 消す場合、`test/utils/logger.test.ts` の該当テスト2件も一緒に消えるか。
   `docs/coding-standards.md`「消すかどうか」の判定表と、消す前の手続きに従う

## やること

1. `README.md`・`docs/requirements.md`・`docs/architecture.md` に warn レベルのログを
   要求する記述が無いか `grep` で確認する（`"warn"`・`"警告"`）
2. **要求する記述があった場合**: `logger.warn` は消さず、「呼び出し元が無い」ことを
   欠陥として報告し、このタスクは**やらずに理由を `evidence` に書いて閉じる**
   （呼び出し元を足すのは別タスク）
3. 要求が無ければ `logger.warn` と `formatLog` の warn 経路、`test/utils/logger.test.ts` の
   該当テストを削除する
4. `docs/coding-standards.md`「テスト」節の「消さないと決めたもの」に該当していないことを
   確認してから消す

## 完了条件

- `grep -rn "logger.warn\|console.warn" src scripts test` が **0件**（消す結論の場合）
- 消したテストが `docs/coding-standards.md`「消さないと決めたもの」に載っていないことを
  確認済み（確認した節名を `evidence` に書く）
- `README.md` のログ出力例に warn レベルの行が無いことを確認済み
- `pnpm check` が通る（テスト件数を `evidence` に書く。テストを消すので**359件から減るのが
  正しい**。減った件数と内訳を書く）

## 注意

- `logger.info` / `logger.error` と `redact()` の挙動は変えない
- `SENSITIVE_KEYS` の秘匿処理を巻き込まない（warn 経路だけを消す）
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: sonnet

**evidence**: `sonnet` に委譲。論点1の結論は**消す**。`grep -rn 'warn|警告' README.md docs/requirements.md docs/architecture.md docs/coding-standards.md` が**0件**で、warnレベルの出力を要求する記述が正典のどこにも無いことをメイン側でも独立に確認した（＝「呼び出し元が無いほうが欠陥」には当たらない）。 `src/utils/logger.ts` の `warn()` とそのJSDoc（T-144で消えた挙動の説明）、`test/utils/logger.test.ts` の `describe("warn")` 2件と未使用になった `warnSpy`/`lastWarn` を削除。`formatLog()` は level を引数で受けるだけで分岐を持たないため無変更。`redact()`/`SENSITIVE_KEYS` も無傷。 `grep -rn 'logger.warn|console.warn' src scripts test` は0件。2ファイル・26行の削除のみ。`pnpm check` 通過（32ファイル365テスト、着手前367から**-2**＝削除したテストの数と一致）。正典は無修正。

## T-161

**タスク**: `tsconfig.json` に、現状エラー0件で入る型チェックのフラグを足す。

## 背景

`tsconfig.json` の `compilerOptions` は現在 `strict` と `noUncheckedIndexedAccess` /
`verbatimModuleSyntax` まで。追加できるフラグを `npx tsc --noEmit -p tsconfig.json --<flag>`
で1つずつ実測した結果:

| フラグ                       | 現状のエラー                                                |
| ---------------------------- | ----------------------------------------------------------- |
| `noUnusedLocals`             | 0                                                           |
| `noUnusedParameters`         | 0                                                           |
| `exactOptionalPropertyTypes` | 0                                                           |
| `noImplicitOverride`         | 0                                                           |
| `noFallthroughCasesInSwitch` | 0                                                           |
| `isolatedModules`            | 0                                                           |
| `useUnknownInCatchVariables` | 0                                                           |
| `noImplicitReturns`          | 1（`src/lib/helm.ts(64,5)` TS7030）                         |
| `erasableSyntaxOnly`         | 1（`src/utils/errors.ts(3,5)` TS1294 = parameter property） |

このプロジェクトにとって効きが大きいもの:

- **`exactOptionalPropertyTypes`**: `docs/coding-standards.md`「`undefined`」の
  「`?:` を使わない」規約を、レビューではなく型で機械的に守らせる
- **`noUnusedLocals`**: 撤回作業の取り残し（T-160 の `logger.warn` のような、呼び出し元が
  消えたのに残った定義）を次から自動検出する

`noImplicitReturns` の1件は `src/lib/helm.ts` の `findAnchorNode()` 内、`visit()` に渡す
`Scalar(_key, node)` コールバックが `visit.BREAK` を返す枝と何も返さない枝を持つため。

## 解くべき論点

1. **`erasableSyntaxOnly` を入れるか。** 入れると `src/utils/errors.ts` の `FatalError` の
   parameter property（`public readonly httpStatus`）を明示的なフィールド宣言に書き換える
   ことになる。得られるのは「Node の型ストリップだけで動く」性質だが、ビルドは `tsc`、
   ローカル実行は `tsx` で、どちらも parameter property を扱えるため**必要性が無い**。
   見送りを推奨するが、結論と理由を `evidence` に書く
2. **`noImplicitReturns` の1件をどう直すか。** `yaml` パッケージの `visit()` は
   コールバックの戻り値 `undefined` を「探索を続ける」と解釈する。明示的に
   `return undefined` を書くのが素直だが、`docs/coding-standards.md`「`undefined`」の
   「避ける `undefined`」に当たらないかを確認する（これは外部ライブラリの契約を
   なぞる `undefined` なので「許容する」側と判断できるはず）

## やること

1. 上表の**エラー0件の7フラグ**を `tsconfig.json` に足す
2. `src/lib/helm.ts` の `findAnchorNode()` を直してから `noImplicitReturns` を足す
3. 論点1を検討し、`erasableSyntaxOnly` を入れるか決める（見送るなら理由を `evidence` に書く。
   `tsconfig.json` には書かない）
4. `tsconfig.build.json` は `tsconfig.json` を `extends` しているので追加作業は不要。
   実際に `pnpm build` が通ることで確認する
5. フラグを足した理由が「型で規約を守らせるため」であることを、
   `docs/coding-standards.md` の該当節（「`undefined`」）から辿れるようにするかを検討する。
   **書く場所が無ければ書かなくてよい**（正典を増やすこと自体が目的ではない）

## 完了条件

- `tsconfig.json` に上表のエラー0件の7フラグと `noImplicitReturns` が入っている
- `npx tsc --noEmit` がエラー0件（実行結果を `evidence` に書く）
- `pnpm build` が成功する（`dist/` が生成されることを確認し、`evidence` に書く）
- `exactOptionalPropertyTypes` が実際に効いていることを、`?:` を1箇所わざと足すと
  型エラーになることで確認する（確認方法を `evidence` に書き、確認後は元に戻す）
- `pnpm check` が通る（テスト件数を `evidence` に書く。フラグ追加だけなので**359件のまま**が
  正しく、減っていたら理由を確認する）

## 注意

- **既存のコードの書き方を変えるためのタスクではない。** フラグを足してエラーが出たら、
  そのフラグは足さずに `evidence` へ理由を書く（`noImplicitReturns` の1件だけが例外で、
  これは直すと決まっている）
- `noPropertyAccessFromIndexSignature` は**このタスクでは入れない**。4件のエラーが出るが、
  それはログのフィールドが `Record<string, unknown>` であることが原因で、T-162 の担当
- `strict` 配下の既存フラグを外さない
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: sonnet

**evidence**: `sonnet` に委譲。エラー0件の7フラグ＋`noImplicitReturns` の計8つを `tsconfig.json` に追加。`erasableSyntaxOnly` は見送り（ビルドは `tsc`・実行は `tsx` でどちらも parameter property を扱えるため、`FatalError` を書き換える必要が無い）。`src/lib/helm.ts` の `findAnchorNode()` は `visit()` の契約（戻り値 `undefined` は探索継続）をコメントに残して `return undefined` を明示。 **メイン側で独立に変異検証**: `?:` に `undefined` を渡すと TS2375、未使用の `const` で TS6133、`helm.ts` の `return undefined` を戻すと TS7030。いずれも復元後 `npx tsc --noEmit` はエラー0件。 `pnpm build` 成功（`dist/` に .js 41個）。`pnpm check` 通過（32ファイル361テスト。フラグ追加のみなので着手前と同数が正しい）。`docs/coding-standards.md`「`undefined`」節に、`?:` 規約が型でも強制される旨を2行追記。

## T-162

**タスク**: ログのフィールドに型を与え、`Record<string, unknown>` の素通しをやめる。

## 背景

構造化ログのフィールドが全て `Record<string, unknown>` で、キー名にも `event` の値にも
型が無い。`grep -rc "Record<string, unknown>" src` の内訳:

| ファイル                                     | 件数 | 何に使っているか                                                             |
| -------------------------------------------- | ---- | ---------------------------------------------------------------------------- |
| `src/utils/logger.ts`                        | 5    | `logger.info/warn/error` の引数、`redact()`・`formatLog()`                   |
| `src/steps/shared/step-outcome.ts`           | 3    | `withHandling()` が組み立てて渡す `logContext`、`buildLogContext()` の戻り値 |
| `src/steps/shared/describe-plan.ts`          | 2    | `describePlan()` / `describeHelmTargetBranchUpdates()` の戻り値              |
| `src/steps/filter-targets/filter-targets.ts` | 1    | `evaluateTarget()` の引数                                                    |
| `src/steps/build-plans/build-plans.ts`       | 1    | `buildPlan()` の引数                                                         |
| `src/steps/apply-updates/apply-updates.ts`   | 1    | `applyUpdate()` の引数                                                       |

そのため次が型で守られていない:

- `event` の値（現在 `run_start` / `summary` / `run_end` / `update_chart` / `check_app` /
  `create_tag` / `fatal_error` / `unhandled_error` の8種）がただの文字列
- `logContext` が3つのstepの関数シグネチャを貫通しているのに、何が入っているか型に出ない
- `describePlan()` の戻り値のフィールド名を打ち間違えても型では分からない

証拠として `npx tsc --noEmit -p tsconfig.json --noPropertyAccessFromIndexSignature` を
かけるとテスト側で4件エラーになる（`build-plans.test.ts:192`、
`stage-helm-target-branch-updates.test.ts:185-187`。いずれも `.reason` を index signature
越しに読んでいる）。

置き場所は既に決まっている。`docs/architecture.md`「型の置き場所」の表**4行目**
「複数のstepが共有する、ドメイン型にだけ依存する型 → `steps/shared/`」で、
`StepOutcome<T>` と同じ行に当たる。

## 解くべき論点

1. **どこまで型を付けるか。** 3案ある。(a) `logContext` に名前を付けるだけ、
   (b) それに加えてログのフィールド全体に `LogFields` のような型を置く、
   (c) `event` ごとの判別共用体まで作る。(c) は8種すべてのイベントの形を型で固定できるが、
   ログを1行足すたびに型を触ることになる。**ログは運用のための出力で、形の自由度を
   落としすぎると足しにくくなる**というトレードオフをどう見るか
2. **`logger` の引数を狭めるか。** `logger.info()` の引数を狭めると、`src/index.ts` の
   `fatal_error` / `unhandled_error` や `main.ts` の `summary`（`...resultCounts` を展開）も
   その型に合わせることになる。`summary` は `Record<ChartUpdateResult, number>` を展開して
   いるので、キーが動的に決まる形をどう表すかが論点になる
3. **`describePlan()` の戻り値に名前を付けるか。** 付けるなら置き場所は
   `steps/shared/describe-plan.ts`（表5行目「その型を生み出す関数と同じファイル」）か
   4行目か。`describePlan()` は `build-plans.ts` と `apply-updates.ts` の2stepから
   呼ばれているので4行目にも読めるが、**生み出す関数と同じファイル**が素直
4. **`noPropertyAccessFromIndexSignature` を最後に入れるか。** 型を付けてもテスト側が
   `Record` 越しにログを読み続けるなら4件のエラーは残る。入れるならテスト側も
   型付きで読むように直すことになる

## やること

1. 論点1〜4を検討し、**結論をユーザーに提案して承認を得てから適用する**。ログは
   `README.md`「ログ」章に出力例が載っている外部インターフェースでもあるため、
   出力される JSON の**キー名と値が1つも変わらない**ことを設計の前提に置く
2. 承認された形で型を定義し、`docs/architecture.md`「型の置き場所」の判断表に沿った
   場所へ置く。表のどの行を根拠にしたかを `evidence` に書く
3. 波及先（`logger.ts`・`step-outcome.ts`・`describe-plan.ts`・3つのstep・`index.ts`・
   `main.ts`）を追随させる
4. 論点4の結論に応じて `tsconfig.json` に `noPropertyAccessFromIndexSignature` を足し、
   テスト側を直す
5. **検討の結果「今の `Record<string, unknown>` のままがよい」と結論した場合は、変更せずに
   その理由を `evidence` に書いて閉じてよい。** ただしその場合でも、3つのstepを貫通する
   `logContext` の引数だけは名前付きの型にする（読み手が引数の意味を追えないため）

## 完了条件

- 実行して得られるログのJSONが、**キー名も値も変更前と一致する**ことを確認できている
  （`test/main.e2e.test.ts` と `test/main.test.ts` のログ検証が無改変で通ることを
  `evidence` に書く。ログの形を変えていないなら、これらのテストは触らずに通るはず）
- `grep -rn "Record<string, unknown>" src` の件数が**減っている**（前後の件数を `evidence` に書く）
- `event` の値を打ち間違えると型エラーになる（論点1で判別共用体を採った場合のみ。
  採らなかった場合はその理由を `evidence` に書く）
- `docs/architecture.md`「型の置き場所」の表と、置いた場所が一致している
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **`README.md`「ログ」章の出力例と1文字でも変わる変更をしない。** 変える必要が出たら
  それは設計変更なのでユーザー承認を取る
- `redact()` の秘匿処理（`SENSITIVE_KEYS`）を型変更で迂回できるようにしない
- `src/steps/` 配下は互いに import しない（`CLAUDE.md` 原則1）。共有するなら `steps/shared/`
- **設計判断の承認が要るので `/loop /next-task` には載せない**
- T-161（tsconfig のフラグ追加）と同じ `tsconfig.json` を触るため、**T-161 の完了後に着手する**

**dependencies**: T-161

**difficulty**: opus

**evidence**: ユーザー承認は中間案（`logContext` と `describePlan` に型を付け、`logger` の引数は `Record` のまま）。`ChartUpdateLogContext` を `steps/shared/step-outcome.ts`（型の置き場所の表**4行目**）に、`PlanLogSummary`/`HelmTargetBranchLogSummary` を `steps/shared/describe-plan.ts`（**5行目**）に置いた。`Record<string, unknown>` は **13件→6件**（残りは `logger.ts` のみ＝意図どおり）。 **出力JSONは不変**: `test/` に差分ゼロのまま `main.test.ts`・`main.e2e.test.ts` が通る。 変異確認: `describePlan` のキー名を打ち間違えると TS2561、`logContext` に無い項目を読むと TS2551（どちらも変更前は黙って通っていた）。`noPropertyAccessFromIndexSignature` は論点4の結論として**入れていない**（`logger` の引数を `Record` のまま残す案を採ったのでテスト側の4件が解消しないため）。`pnpm check` 通過（32ファイル361テスト。型付けのみなので同数が正しい）。`pnpm build` 成功。

## T-163

**タスク**: `cacheByArgs()` を `src/utils/cache.ts` へ上げ、`remote-cache.ts` の手書きキャッシュを置き換える。

## 背景

引数からキーを組み立ててメモ化する仕組みが、2箇所に別々の実装で存在する。

`src/lib/gitlab/batch-cache.ts` は非公開の `cacheByArgs()` を持っている。キーは
`args.join("\0")` で、区切りにヌル文字を使う理由もJSDocに書かれている（区切りが値の中に
現れると、引数の切れ目が違う組み合わせが同じキーになるため）。値は箱に入れてから
`getOrFetchShared()` に載せる。

`scripts/lint/verify-config/remote-cache.ts` は同じことを手書きしている:

```ts
hasBranch: (projectId, branch) =>
  getOrFetchShared(branches, `${projectId}#${branch}`, () => ...),
loadValuesYaml: (projectId, ref, valuesPath) =>
  getOrFetchShared(files, `${projectId}#${ref}#${valuesPath}`, async () => ({
    content: await getFileContent(gitlab, projectId, valuesPath, ref),
  })),
```

キーは `#` 連結で、箱詰め（`FileResult`）も手書き。**`#` はGitのブランチ名に使える文字**
（`git check-ref-format` は `~^:?*[\` と空白は禁じるが `#` は禁じない）なので、`files` の
キーは理屈上衝突しうる: `ref="a#b", valuesPath="c"` と `ref="a", valuesPath="b#c"` が
どちらも `1#a#b#c` になる。`batch-cache.ts` 側はこの問題を `\0` 区切りで既に解いてある。

`cacheByArgs()` は**技術非依存のメモ化**でGitLabの知識を持たないため、`CLAUDE.md` 原則2に
照らすと `lib/` ではなく `utils/` が置き場所。`docs/architecture.md`
「GitLabへの問い合わせのキャッシュは`lib/gitlab/`に列挙し〜」節も、
「`utils/cache.ts`に残るのは技術非依存のメモ化（`getOrFetchShared()`）だけで、
`scripts/lint/verify-config/remote-cache.ts`も同じものを使っている」と書いている。

## やること

1. `cacheByArgs()` と `toCacheKey()`、`CacheKeyPart` 型を `src/lib/gitlab/batch-cache.ts` から
   `src/utils/cache.ts` へ移す。JSDoc の「`mapWithConcurrency`により〜」のような
   `lib/gitlab/` 固有の説明は、移動先に合う形に直す（**消すのではなく、どこに書くべきかを
   `docs/coding-standards.md`「コメント」の判断表で決める**）
2. `batch-cache.ts` を移動先から import する形に直す
3. `scripts/lint/verify-config/remote-cache.ts` の3つのメンバー（`hasProject` / `hasBranch` /
   `loadValuesYaml`）を `cacheByArgs()` 経由に置き換える。`FileResult` の箱詰めが
   `cacheByArgs()` 側で行われるようになるなら、`FileResult` 型が不要にならないか確認する
   （`RemoteCache.loadValuesYaml` の戻り値の形を変えると `verify-config.ts` にも波及するため、
   **戻り値の形は変えない**方向で検討する）
4. `docs/architecture.md` の該当節（上記の引用元）と「各ファイルの責務」の `src/utils/` の表を、
   移動後の実態に合わせる

## 完了条件

- `grep -n "cacheByArgs" src/utils/cache.ts` がヒットし、`src/lib/gitlab/batch-cache.ts` には
  定義が無い（import だけがある）
- `grep -n '#\${' scripts/lint/verify-config/remote-cache.ts` が **0件**（手書きのキー連結が
  残っていない）
- `pnpm lint:validate-config` が位置引数なしで `config OK: 3 設定ユニット, 5 apps` を出す
  （出力を `evidence` に書く）
- `docs/architecture.md`「各ファイルの責務」の `src/utils/` の表に `cacheByArgs` の行がある
- `pnpm check` が通る（テスト件数を `evidence` に書く。`test/lib/gitlab/batch-cache.test.ts` が
  無改変で通ることも確認する）

## 注意

- **`GitlabBatchCache` に載せる読み取りの一覧を変えない。** 何をキャッシュしてよいかの判断は
  `docs/architecture.md` が正典で、今回は置き場所を移すだけ
- `getOrFetchShared()` の `V extends {}` 制約を緩めない（「未キャッシュ」の判定が壊れる）
- `RemoteCache` の公開インターフェース（3メンバーの引数と戻り値）を変えない
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: sonnet

**evidence**: `sonnet` に委譲。`cacheByArgs()`/`toCacheKey()`/`CacheKeyPart` を `lib/gitlab/batch-cache.ts` から `src/utils/cache.ts` へ移し（原則2＝技術非依存のメモ化）、`remote-cache.ts` の3メンバーを `cacheByArgs()` 経由に置き換えて手書きの `#` 連結キーを廃止。`RemoteCache` の公開型と `verify-config.ts` は無変更（`git diff` が0行）。
**受け入れ時にメインがテストを1件追加した**。委譲先の実装は正しかったが、`toCacheKey()` の区切りを `\0`→`#` に戻す変異で**365テスト全部が通ってしまい**、このタスクの主目的（キー衝突の回避）がまったく守られていなかったため。`test/utils/cache.test.ts` を新設し、`("a#b","c")` と `("a","b#c")` が別キーになることを検証する。
実測: 追加後は同じ変異で1件落ちる。`pnpm lint:validate-config` は `config OK: 3 設定ユニット, 5 apps`。`pnpm check` 通過（33ファイル366テスト、着手前365から+1）。`docs/architecture.md` は `src/utils/` の責務表と「採らなかった案」の3箇所を実態に合わせた。

## T-164

**タスク**: `verify-config.ts` の `[] as string[]` 2箇所から `as` を外す。

## 背景

`scripts/lint/verify-config/verify-config.ts` に `as` キャストが2箇所ある:

- `:98` `const appProblems = await reduceAsync(apps, [] as string[], async (acc, app) => [...])`
- `:169` `return reduceAsync(targets, [] as string[], async (acc, target) => [...])`

`CLAUDE.md`「コーディング規約」の「`as` キャストは極力使わない」に照らすと避けたい形で、
**`src/` 側は同じことを `as` なしで書いている**。`src/steps/build-plans/sub-steps/resolve-latest-tags.ts:44`:

```ts
const initial: readonly AppWithLatestTag[] = []
return reduceAsync(apps, initial, async (acc, app) => [...])
```

`reduceAsync()` の第2引数に型注釈付きの `const` を渡せば、ジェネリック `Acc` が確定するので
キャストは要らない。ついでに `readonly` も付き、`CLAUDE.md`「コレクションも不変
（`ReadonlyMap`・`readonly`）に保つ」にも合う。

## やること

1. 2箇所を `resolve-latest-tags.ts:44` と同じ形（型注釈付きの `const` を渡す）に書き換える。
   要素型は `string`、`readonly string[]` にできるか確認する
2. `reduceAsync()` の戻り値を受ける側（`verifyChartAndApps()` の `[...chartProblems,
...baseBranchProblems, ...appProblems, ...helmProblems]` と `verifyTargets()` の呼び出し元）で
   型エラーが出ないことを確認する。出る場合は関数の戻り値型（`Promise<string[]>`）も
   `readonly string[]` に揃えるかを検討する。**`verifyConfigExistence()` の公開シグネチャ
   （`Promise<string[]>`）は変えない**（`scripts/lint/validate-config.ts` が
   `problems.length` と `for...of` で使っている）

## 完了条件

- `grep -n " as " scripts/lint/verify-config/verify-config.ts` に `[] as string[]` が
  **1件も残っていない**（import の `as` は対象外）
- `pnpm lint:validate-config` が位置引数なしで `config OK: 3 設定ユニット, 5 apps` を出す
  （出力を `evidence` に書く）
- `pnpm check` が通る（テスト件数を `evidence` に書く。書き換えのみなので**359件のまま**が
  正しい）

## 注意

- **報告される問題の文言・順序・件数を変えない。**
  `test/scripts/lint/verify-config/verify-config.test.ts` が無改変で通ることで確認する
- `verifyConfigExistence()` の公開シグネチャを変えない
- T-165 が同じファイル（`verify-config.ts`）を触るので、前後した場合は競合を確認する
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: haiku

**evidence**: `haiku` に委譲。`verify-config.ts` の `[] as string[]` 2箇所を、型注釈付きの `const initial: readonly string[] = []` を `reduceAsync()` に渡す形（`resolve-latest-tags.ts` と同じ書き方）に置き換えた。`verifyTargets()` の戻り値型は `Promise<string[]>` → `Promise<readonly string[]>` に揃えた。
`grep -n ' as ' scripts/lint/verify-config/verify-config.ts`（import除く）は**0件**。`verifyConfigExistence()` の公開シグネチャ `Promise<string[]>` は不変。`test/` の差分は0行で、報告される問題の文言・順序・件数は変わっていない。
`src`+`scripts` 全体で `brand.ts` 以外の `as` キャストが**0件**になった。`pnpm lint:validate-config` は `config OK: 3 設定ユニット, 5 apps`。`pnpm check` 通過（33ファイル366テスト。書き換えのみなので着手前と同数が正しい）。

## T-165

**タスク**: 設定ユニットの位置表示（`<chartDirName>/<unitPath>`）の組み立てを1箇所にまとめる。

## 背景

「どの設定ユニットで起きたか」を人に見せる文字列が、同じ形で3箇所に手書きされている:

- `src/lib/config/validate.ts:55` `const location = \`${chartAndApps.chartDirName}/${chartAndApps.unitPath}\``
（`validateTagFormatConsistency()` のエラーメッセージ用）
- `scripts/lint/verify-config/verify-config.ts:56` （検証中の例外の報告用）
- `scripts/lint/verify-config/verify-config.ts:76` （`VerifyContext.where`）

`chartDirName` と `unitPath` はどちらもブランド型（`ChartDirName` / `ConfigUnitPath`）で、
その2つを `/` でつないだものが「設定ユニットの位置表示」というこのツールの語彙になっている。
`docs/glossary.md` に載る概念かどうかを確認したうえで、`src/domain/config-unit.ts`
（既に `UNIT_PATH_SEPARATOR` と `MAX_UNIT_DEPTH` を持ち、`ConfigUnitPath` の扱いを担っている）
に1本置ける。

`CLAUDE.md` 原則2に照らすと、この組み立ては特定の技術・外部システムに依存しないので `lib/` では
なく `domain/`。`scripts/` からも `src/domain/` を import する前例は
`scripts/smoke/smoke-fixture.ts`（`isFeatureBranch`）にある。

## 解くべき論点

1. **関数の引数を何にするか。** `(chartDirName, unitPath)` の2引数にするか、`ChartAndApps` を
   丸ごと受け取るか。後者だと `src/domain/` が `ChartAndApps`（`types/types.ts` のドメイン型）に
   依存する。`src/domain/` の既存3ファイルが何に依存しているかを確認して決める
   （`config-unit.ts` と `feature-branch.ts` はブランド型にしか依存していない）
2. **戻り値をブランド型にするか。** `docs/architecture.md`「ブランド型にするのは『同じ`string`の
   別物と取り違えうる識別子』」に照らして判断する。表示専用の文字列なので**素の `string` で
   足りる**と判断できるはずだが、根拠を `evidence` に書く

## やること

1. 論点1・2を検討し、`src/domain/config-unit.ts` に関数を1つ足す。区切り文字は既存の
   `UNIT_PATH_SEPARATOR` を使う
2. 上記3箇所を置き換える
3. `src/domain/` に関数を足したので、`docs/architecture.md`「各ファイルの責務」の
   `src/domain/` の表を追随させる
4. `docs/glossary.md` にこの概念（設定ユニットの位置表示）の見出しが要るかを検討する。
   **既存の用語で説明が付くなら足さない**（用語集を膨らませること自体が目的ではない）

## 完了条件

- `grep -rn 'chartDirName}/' src scripts` が **0件**（手書きの組み立てが残っていない）
- 出力される文言が変更前と**一字一句同じ**である（`test/lib/config/validate.test.ts` と
  `test/scripts/lint/verify-config/verify-config.test.ts` が無改変で通ることで確認し、
  `evidence` に書く）
- `pnpm lint:validate-config` が位置引数なしで `config OK: 3 設定ユニット, 5 apps` を出す
- `docs/architecture.md`「各ファイルの責務」の `src/domain/` の表に新しい関数の行がある
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **`src/steps/shared/step-outcome.ts` の `buildLogContext()` は対象外。** あちらは
  `chartDirName` と `unitPath` を**別々のログフィールドとして**出しており、連結した文字列では
  ない。連結形に変えると `README.md` のログ出力例が変わるので触らない
- T-164 が同じファイル（`verify-config.ts`）を触るので、前後した場合は競合を確認する
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: sonnet

**evidence**: `sonnet` に委譲。`buildConfigUnitLocation(chartDirName, unitPath)` を `src/domain/config-unit.ts` に追加し、3箇所（`validate.ts` の `validateTagFormatConsistency`、`verify-config.ts` の catch節と `VerifyContext.where`）を置き換えた。引数は2つのブランド型（`domain/` の既存2ファイルと同じくブランド型にしか依存しない形を保つため）、戻り値は素の `string`（表示専用で取り違えうる識別子ではない）。`grep -rn 'chartDirName}/' src scripts` は0件。
**受け入れ時にメインがテストを2件追加した**。委譲先は「テストが無改変で通ったことが文言不変の証拠」と報告したが、**変異（区切りを `::` に変更）をかけても375テスト全部が通り**、この文言を assert しているテストが1件も無いことが分かったため。`test/domain/config-unit.test.ts` に書式を固定するテストを足した。
追加後は同じ変異で2件落ちる。`pnpm lint:validate-config` は `config OK: 3 設定ユニット, 5 apps`。`pnpm check` 通過（33ファイル377テスト、着手前375から+2）。`docs/architecture.md` の `src/domain/` 責務表を追随。`docs/glossary.md` は既存の用語で説明が付くため追加せず。

## T-166

**タスク**: `registry.yaml` / `config.yaml` のファイル名リテラルを定数にまとめる。

## 背景

`config/` の2ファイルのファイル名が、コード中に文字列リテラルとして散っている。
`join()` に渡している箇所だけで6件:

- `src/lib/config/config.ts:71` `existsSync(join(chartDirPath, "registry.yaml"))`
- `src/lib/config/config.ts:121` `${join(chartDirPath, "config.yaml")}: config.yaml が registry.yaml と同じ階層にあります`
- `src/lib/config/config.ts:129` `${join(chartDirPath, ...tooDeep, "config.yaml")}: ...`
- `src/lib/config/config.ts:154` `existsSync(join(dirPath, "config.yaml"))`
- `src/lib/config/config.ts:187` `join(chartUnits.chartDirPath, "registry.yaml")`
- `src/lib/config/chart-and-apps.ts:37` `join(unitDirPath, "config.yaml")`

これに加えてエラーメッセージ本文にもファイル名が現れる。`grep -rn 'registry\.yaml\|config\.yaml' src scripts`
は50件ヒットする（大半はJSDoc・エラーメッセージ）。

直近の T-157 が `chart.yaml` → `registry.yaml` の改名で `src/` 25箇所を触っており、
**同じ改名がもう一度起きたときのコストが実測されている**。

同じファイルには既に `DEFAULT_CONFIG_DIR_PATH`（`src/lib/config/config.ts:14`）という
同種の定数がある。

## 解くべき論点

1. **定数をどこまで使うか。** `join()` に渡す6件だけにするか、エラーメッセージ本文の
   文字列も定数に寄せるか。後者はテンプレートリテラルが読みにくくなるトレードオフがある。
   **JSDoc内のファイル名は対象外**（コメントは文章なので定数化しない）
2. **`export` するか。** `DEFAULT_CONFIG_DIR_PATH` は `src/lib/env.ts` から使われるため
   export されている。今回の2定数は `lib/config/` の中だけで足りるなら
   非公開のままにする（`docs/coding-standards.md`「テストのためだけの `export` はしない」）
3. **置き場所。** `config.ts` と `chart-and-apps.ts` の両方から使うので、片方に置いて
   import するか、`schema.ts` に置くか。`CLAUDE.md` 原則4（ファイル名が概念になっているか）に
   照らして決める。**`constants.ts` のような置き場所を名前にしたファイルは作らない**

## やること

1. 論点1〜3を検討し、2つの定数を定義して `join()` に渡す6件を置き換える
2. 論点1で「エラーメッセージ本文も寄せる」と決めた場合のみ、そちらも置き換える
3. 定数名は外部ファイル形式の写しであることが分かる名前にする
   （`docs/architecture.md`「`config/`は「スコープ」で2ファイルに分け〜」節の可否表が、
   コード側識別子を外部形式に追随させる基準を持っているので**先に読む**）

## 完了条件

- `grep -n '"registry.yaml"\|"config.yaml"' src/lib/config/*.ts` が、定数の定義行以外で
  **0件**（論点1で本文も寄せた場合。`join()` だけに絞った場合はその旨を `evidence` に書く）
- `pnpm lint:validate-config` が位置引数なしで `config OK: 3 設定ユニット, 5 apps` を出す
- エラーメッセージの文言が変更前と**一字一句同じ**である
  （`test/lib/config/config.test.ts` が無改変で通ることで確認し、`evidence` に書く）
- `constants.ts` / `helpers.ts` のような置き場所を名前にしたファイルを**作っていない**
  （`CLAUDE.md` 原則4）
- `pnpm check` が通る（テスト件数を `evidence` に書く。書き換えのみなので**359件のまま**が正しい）

## 注意

- **`config/` の実ファイルには一切触らない**（`config/yadokari-smoke-test-chart/` 配下）
- `DEFAULT_CONFIG_DIR_PATH` の値と export を変えない（`src/lib/env.ts` が使っている）
- JSDoc・`docs/`・`README.md` のファイル名の記述は変えない（文章なので定数化の対象外）
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: sonnet

**evidence**: `sonnet` に委譲。`REGISTRY_YAML_FILE_NAME` / `CONFIG_YAML_FILE_NAME` を `src/lib/config/schema.ts` に置き、`join()` の6件に加えエラーメッセージ本文の裸のファイル名も定数化した（改名コストを下げるというタスクの動機に沿う判断）。JSDocは対象外。
**置き場所が `schema.ts` なのは必然**（受け入れ時にメインが確認）: `config.ts` に置くと `config.ts` → `chart-and-apps.ts` → `config.ts` の**循環importになる**。`schema.ts` は両者が既に import しており新しい依存辺を作らない。`constants.ts` 等は作っていない（原則4）。
**変異検証をメインが独立に実施**: `CONFIG_YAML_FILE_NAME` を `config-x.yaml` にすると `config.test.ts` が**26件落ちる**（委譲先の報告と一致）。`grep -n '"registry.yaml"|"config.yaml"' src/lib/config/*.ts` は定義2行のみ。`pnpm check` 通過（33ファイル377テスト、着手前と同数が正しい）。

## T-167

**タスク**: タグ名の中でのブランチ名表現（`/` → `-`）を1つの関数にまとめる。

## 背景

`src/domain/tag-format.ts` に `branch.replaceAll("/", "-")` が2箇所ある:

- `:109` `compileTagPattern()` 内 — タグ名を**パースする**正規表現を組み立てるとき
- `:143` `fillTagFormat()` 内 — タグ名を**生成する**とき

どちらも「タグ名の中では、ブランチ名の `/` を `-` に置き換えた形で表す」という同じ規則で、
パース側と生成側が対称であることが `parseTag()` / `buildNewTag()` の往復が成立する前提に
なっている。片方だけ変えると `buildNewTag()` で作ったタグが `parseTag()` で読めなくなるが、
今は2箇所に分かれているためその結び付きがコードから見えない。

## やること

1. `src/domain/tag-format.ts` にファイル内の非公開関数を1つ足し、2箇所をそれに置き換える。
   関数名は「タグ名の中でのブランチ名表現」であることが分かるものにする
2. `docs/coding-standards.md`「関数の並び順」に従って配置する（外から使うもの →
   その内部で使うもの）。`escapeRegExp()` と同じくファイル末尾側になるはず
3. 「パース側と生成側で同じ表現を使う」という前提をコメントに残すか判断する。
   `docs/coding-standards.md`「コメント」の判断表に従い、**コードから読み取れることは書かない**
   （関数を1本にした時点で読み取れるなら書かない）

## 完了条件

- `grep -c 'replaceAll("/", "-")' src/domain/tag-format.ts` が **1**
- `test/domain/tag-format.test.ts` が**無改変で通る**（`evidence` に書く）
- `buildNewTag()` が作ったタグ名を `parseTag()` が読めることを確かめるテストが既にあることを
  確認する。**無ければ1件足す**（`docs/coding-standards.md`「足すかどうか」の
  「`docs/requirements.md` が明示している振る舞い」に当たるため）
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **`escapeRegExp()` を消したり簡略化したりしない。** 過去に「`escapeRegExp()` を守るテストが
  1件も無い」という穴が T-143 で埋められている
- タグ形式のプレースホルダの扱い（`PLACEHOLDER_PATTERN` / `REQUIRED_PLACEHOLDERS`）を変えない
- JST の扱い（`JST_OFFSET_MS`）に触れない
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: haiku

**evidence**: `haiku` に委譲。`toBranchLiteralInTag(branch)` を `src/domain/tag-format.ts` の末尾側（`escapeRegExp()` の直前）に追加し、`compileTagPattern()` と `fillTagFormat()` の2箇所を置き換えた。`grep -c 'replaceAll("/", "-")' src/domain/tag-format.ts` は **1**。
変異検証は委譲先・メイン双方で実施。置換をやめて `branch` をそのまま返すと**6件落ちる**（`parseTag`・`buildNewTag`・並び順の回帰・`compileTagPattern`・`resolve-latest-tags` の各テスト）。往復（`buildNewTag()`→`parseTag()`）を確かめるテストは既存で3箇所あり、追加不要と確認した。
**受け入れ時にメインがJSDocを2箇所直した**。`fillTagFormat()` の説明が「`{branch}`は**呼び出し元が渡した**`branch`（"/"を"-"に置換済み）」となっていたが、実際は自分で変換しており事実と違っていた（このタスク以前からの誤り）。両方の JSDoc を新関数に向け、パース側と生成側が同じものを使うことがコメントからも読めるようにした。`pnpm check` 通過（33ファイル377テスト、着手前と同数）。

## T-168

**タスク**: ログのキー `duration_ms` だけが snake_case である件の扱いを決める。

## 背景

構造化ログのフィールド名は camelCase で統一されている（`httpStatus`・`chartDirName`・
`unitPath`・`chartProjectId`・`projectName`・`previousTagName`・`dryRun`・
`concurrencyLimit`・`configDirPath`）。唯一 `duration_ms` だけが snake_case:

- `src/utils/timer.ts:1` `Promise<{ value: T; duration_ms: number }>`
- `src/main.ts:22,24` `const { value: resultCounts, duration_ms } = await timed(...)` /
  `logger.info({ event: "run_end", duration_ms })`

これは**外部インターフェース**でもある。`README.md:139` に出力例が載っている:

```
{"level":"info","timestamp":"2026-09-02T00:00:00.520Z","event":"run_end","duration_ms":520}
```

`test/main.test.ts:118` もこのキーで検証しており、`docs/coding-standards.md:262` の
「消すかどうか」の表にも `run_end` の `duration_ms` ログとして登場する。

## 解くべき論点

1. **そもそも直すか。** ログはCIの出力として人と（将来は）ログ収集基盤が読むもので、
   キー名を変えると既存のログとの互換が切れる。**直さない結論も正当**で、その場合は
   「単位付きのキーは snake_case にする」といった規則を正典に書いて意図的な例外にする
2. **直す場合、どこまで変えるか。** `src/utils/timer.ts` の `timed()` の戻り値の
   フィールド名まで変えるか、ログに出すときだけ変換するか。`timed()` の戻り値は
   `main.ts` でしか使われていないので、揃えるなら戻り値ごと変えるのが素直
3. **正典の追随範囲。** `README.md` のログ出力例（1箇所）、`docs/coding-standards.md:262` の
   表、`test/main.test.ts:118`。他に無いか `grep -rn "duration_ms"` で確認する

## やること

1. 論点1を検討し、**結論をユーザーに提案して承認を得てから適用する**。ログのキー名は
   外部インターフェースなので勝手に変えない
2. 「直さない」結論なら、その理由をログのフィールド命名の規則として正典に書く。
   書く先は `README.md`「ログ」章か `docs/coding-standards.md` のいずれかで、
   **どちらが正典かを決めてから**書く（二重に書かない）
3. 「直す」結論なら、論点2の範囲で書き換え、論点3の全箇所を追随させる

## 完了条件

- 論点1の結論と根拠が `evidence` に書かれている
- 「直す」結論の場合: `grep -rn "duration_ms" src test README.md docs` が **0件**
- 「直さない」結論の場合: ログのフィールド命名の規則が正典のどちらか一方に書かれており、
  `grep` でヒットする（書いた場所を `evidence` に書く）
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **`timestamp` と `level` のキー名は変えない**（`logger.ts` の `formatLog()` が出す固定キーで、
  多くのログ収集基盤が前提にする名前）
- `duration_ms` の**値の意味と単位**（ミリ秒）は変えない
- **外部インターフェースの変更なのでユーザー承認が要る。`/loop /next-task` には載せない**
- T-162（ログのフィールドの型付け）と同じ領域を触るため、片方が先に終わっていたら
  その結果に合わせる

**dependencies**: なし

**difficulty**: sonnet

**evidence**: ユーザー判断で `durationMs` への統一を採用。`src/utils/timer.ts`（`timed()` の戻り値のフィールド名ごと）2件・`src/main.ts` 2件・`test/main.test.ts` 1件・`README.md:139` のログ出力例1件・`docs/coding-standards.md:262` の表1件の計7箇所を置換。 `grep -rn duration_ms src test scripts README.md docs CLAUDE.md` は **`docs/history/` の3件を除いて0件**（history は当時の記述をそのまま残す規約のため対象外。完了条件のgrepはこの除外が必要だった）。 変異確認: ログキーだけ `duration_ms` に戻すと `main.test.ts` の「run_start / summary / run_end イベントをログ出力する」が落ちる。`pnpm check` 通過（32ファイル361テスト。改名のみなので着手前と同数が正しい）。

## T-169

**タスク**: 数値に見えるスカラーを書き戻すとクォートが付く件を、正典に書くか実装で防ぐか決める。

## 背景

`src/lib/helm.ts` の `setValueAtAnchor()` は `yaml` パッケージのDocument（AST）の
`node.value` に**文字列**を代入して再シリアライズする。元のスカラーが数値として
パースされていた場合、書き戻すとクォートが付く。実測:

```
入力:  variables:\n  - &ver 20260101\n  - &b main\n
node.value の型: number（20260101）
書き戻し後: - &ver "20260102"
```

イメージタグは `tagFormat` が `{branch}` を必須にしている（`src/domain/tag-format.ts` の
`REQUIRED_PLACEHOLDERS`）ため、タグ名が純粋な数値になることはなく**この経路では起きない**。

起きうるのは **Helmの向き先ブランチ**（`config.yaml` の `helm.branchToSync`）で、ブランチ名が
数字だけ（例: `2026`）の場合。`stage-helm-target-branch-updates.ts` が
`setValueAtAnchor(valuesYamlContent, target.anchorName, branchName)` を呼ぶため、
values.yaml の差分にクォートが増える。

`docs/architecture.md`「既知の制約・注意点」の「その他」には

> `values.yaml` の書き換えは `yaml` パッケージのDocument（AST）を直接操作する方式のため、
> 書き換え対象以外のコメント・クォートスタイルは概ね保持される（完全な保持を保証するものではない）

とあるが、**書き換え対象そのもののクォートが変わる**この条件は書かれていない。

## 解くべき論点

1. **実装で防ぐか、制約として書くか。** 防ぐなら「元の `node.type` を保つ」「元が数値なら
   数値として代入する」などが考えられるが、**ブランチ名は文字列なので数値として書くのは
   むしろ誤り**（YAMLとして読み直すと数値になり、Helmが期待する型と食い違う）。
   クォートが付くのは**正しい挙動**とも言える。この見立てが正しいかを検証する
2. **`getRequiredValueAtAnchor()` 側の `String(node.value)` も対になっている。** 元が数値の
   `2026` を読むと文字列 `"2026"` になり、`config.yaml` の `branchToSync: 2026`（Zodが
   `z.string()` で弾く）とは比較できる形になっている。読み取り側の挙動も合わせて確認する
3. **書くなら、どの正典のどの節か。** `docs/architecture.md`「その他」に1行足すのが素直だが、
   `docs/requirements.md` 4.4節（`config/` のスキーマ仕様）が
   「ブランチ名に数字だけの名前を使わない」と書くべき性質かもしれない

## やること

1. 論点1を検証する。**「クォートが付くのが正しい」と結論できれば、実装は変えずに
   制約として正典に書いて閉じる**（`evidence` に検証内容を書く）
2. 論点2を確認する。読み取り→比較→書き戻しの往復が、数値に見える値でも壊れないことを
   テストで守る（`test/lib/helm.test.ts` に1件足す）
3. 論点3の結論に従って正典に1項目足す

## 完了条件

- 数値に見えるアンカー値（例 `&b 2026`）に対する読み取り・書き戻しの往復を守るテストが
  `test/lib/helm.test.ts` に**1件以上ある**
- `docs/architecture.md`「既知の制約・注意点」または `docs/requirements.md` に、この条件が
  1項目として書かれている（書いた場所を `evidence` に書く）
- 実装を変えた場合: 変更前後で `test/steps/build-plans/sub-steps/stage-helm-target-branch-updates.test.ts`
  が無改変で通る
- `pnpm check` が通る（テスト件数を `evidence` に書く。テストを足すので**359件より増える**のが正しい）

## 注意

- **`yaml` パッケージを別のものに置き換えない。** `docs/architecture.md`
  「`values.yaml` の位置指定はYAMLアンカーのみ、YAML処理は `yaml` パッケージ」が
  `js-yaml` を使わない理由を持っている
- `setValueAtAnchor()` がASTを直接書き換える方式（＝他の要素・インデント・アンカー記法を
  保つ）を変えない
- 実 `config/` とスモークテスト用リポジトリのブランチ名を変えない
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: sonnet

**evidence**: `sonnet` に委譲。論点1の結論は**クォートが付くのが正しい挙動なので実装は変えない**（`src/lib/helm.ts` は `git diff` 0行）。`yaml` パッケージは「文字列として代入した値がクォートなしだと再パース時に数値・真偽値へ化ける」ケースだけを検知してクォートを付ける。
**メインが独立に実測して一致を確認**: `&b 2026`→`"2027"`、`&b 007`→`"008"`、`&b true`→`"false"` はクォートが付き、`&b no`→`yes`（YAML1.2で `no` は文字列）と `&b main`→`develop` には付かない。**必要なときだけ最小限に付く**ことが確認できた。
`test/lib/helm.test.ts` に2件追加（素の `yaml.parse()` でも文字列であることを確認しており、`String()` 変換に依存しない検証）。変異（`getValueAtAnchor` の `String()` を外す）で1件落ちる。正典は `docs/architecture.md`「既知の制約・注意点」→「その他」に1項目（7行）。`docs/requirements.md` は変更なし（`branchToSync` は `z.string()` が数値を弾くため、運用上の禁止事項として書くのは的外れという判断）。`pnpm check` 通過（33ファイル379テスト、+2）。

## T-170

**タスク**: `src/lib/helm.ts` の「アンカーが無い」まわりのエラー表現を整える。

## 背景

`src/lib/helm.ts` に、同じ「アンカーが見つからない」という不変条件を扱う箇所が2つある。

**(1) スカラー以外に付いたアンカーを区別できない。** `findAnchorNode()` は
`visit(doc, { Scalar(_key, node) { ... } })` でスカラーノードだけを探すため、アンカーが
マップやシーケンスに付いている（例: `&group\n  key: value`）と「見つからない」扱いになる。
`getRequiredValueAtAnchor()` は

```
values.yaml にアンカー "..." が見つかりません (valuesPath: ...)
```

と報告するが、実際にはアンカーは存在していてスカラーでないだけなので、**設定を直す人が
原因にたどり着けない**。同じことが `scripts/lint/verify-config/verify-config.ts` の
実在チェックでも起きる（`getValueAtAnchor()` 経由で「アンカーが見つかりません」と出る）。

**(2) 同じ不変条件を2つの関数が別々に投げている。** `getRequiredValueAtAnchor()`（:31）と
`setValueAtAnchor()`（:51）がどちらも「アンカーが見つかりません」を投げる。呼び出し側
（`stage-image-tag-updates.ts` / `stage-helm-target-branch-updates.ts`）は必ず
`getRequiredValueAtAnchor()` を先に呼んで同じ内容に対して `setValueAtAnchor()` を呼ぶため、
**後者の分岐は実行時には到達しない**。

## 解くべき論点

1. **(1) をどこまで直すか。** アンカーの有無とスカラーかどうかを区別するには
   `findAnchorNode()` の探索を変える（全ノードを見てからスカラーか判定する）必要がある。
   エラーメッセージが増える一方、`config/` の設定ミスとしては起こりにくいケースでもある。
   **`docs/requirements.md` 4.4節が「アンカーはスカラーに付ける」と規定しているかを先に確認し、
   規定があるなら「規定違反を検知するメッセージ」として直す価値がある**
2. **(2) を統合するか、到達不能なまま残すか。** `docs/coding-standards.md`「足すかどうか」は
   「到達不能な防御的コード（`internal error:` を投げる分岐など）は埋めない」と書いており、
   **到達不能な防御的分岐を残すこと自体は許容されている**。統合するなら
   `setValueAtAnchor()` の引数を「既に取得済みのノード」に変えるといった設計変更になり、
   `lib/helm.ts` の公開インターフェースが変わる。**割に合わないなら残す結論でよい**
3. `getValueAtAnchor()`（`undefined` を返す、`verify-config.ts` 向け）と
   `getRequiredValueAtAnchor()`（例外を投げる）の2本立ては維持する。用途の違いが
   JSDocに書かれている

## やること

1. 論点1を検討する。`docs/requirements.md` 4.4節を
   `sed -n '/^#### /,/^#\{2,4\} /p'` の形で確認してから決める
2. 論点2を検討する。**「今のままでよい」と結論した場合は、変更せずに理由を `evidence` に
   書いて閉じてよい**（ただしその場合も、論点1で直すと決めた分は実施する）
3. 直す結論の分について実装し、テストを足す

## 完了条件

- 論点1・2それぞれの結論と根拠が `evidence` に書かれている
- (1) を直した場合: スカラー以外に付いたアンカーを渡したときのメッセージが
  「見つからない」と区別できることを守るテストが `test/lib/helm.test.ts` に1件以上ある
- (2) を統合した場合: `grep -c "アンカー" src/lib/helm.ts` が減っており、
  `test/lib/helm.test.ts` と2つの `stage-*` のテストが通る
- どちらも直さない結論の場合: `src/lib/helm.ts` が無変更で、理由が `evidence` にある
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **`getValueAtAnchor()` の戻り値（`string | undefined`）を変えない。**
  `scripts/lint/verify-config/verify-config.ts` が「1件目で止めず全問題を集める」ために
  この形を必要としている
- `setValueAtAnchor()` がASTを直接書き換える方式を変えない
- `src/steps/` 配下に `try`/`catch` を書かない規約を壊さない
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: sonnet

**evidence**: `sonnet` に委譲。論点1は**直す**（`docs/requirements.md` 4.4節が「アンカーは**スカラー値**に付ける」構成を明文で前提にしているため、規定違反を検知する価値がある）。`findAnchorNode()` を `Scalar` 限定の `visit` から全ノード＋`isScalar()` に変え、戻り値を判別可能ユニオン `AnchorLookup`（`not_found`/`non_scalar`/`scalar`、ファイル内限定の型）にした。論点2は**統合しない**（到達不能な防御的分岐は残してよい規約があり、統合には公開インターフェースの変更が要る）。
**メインが独立に実測**: マッピング/シーケンスにアンカーが付くと `getRequired`/`set` が「スカラー値に付いていません」を投げ、不在は従来どおり「見つかりません」。スカラーは無変化。変異（`non_scalar` を `not_found` と同じ扱いに戻す）で2件落ちる。
**残った制約**: `verify-config.ts` は `getValueAtAnchor()`（`string | undefined`）を使うため、実在チェックの経路では両者を区別できず「アンカーが見つかりません」のまま。戻り値契約を変えない制約（全問題を集める用途）とのトレードオフで、意図的に残している。`grep -rn 'try {' src/steps/` は0件。`pnpm check` 通過（33ファイル382テスト、着手前379から+3）。

## T-171

**タスク**: 429/502 のリトライが二重にかかっていて、効くほうが動いていない件を解く。

## 背景

GitLab APIへのリトライが2層ある。

**1層目（gitbeaker の内部）**: `@gitbeaker/rest` の `defaultRequestHandler` は
`retryCodes = [429, 502]` / `maxRetries = 10` を持ち、この2つのステータスを内部で最大10回
リトライする。バックオフは `await delay(2 ** i * 0.25)`（i は 0..9）で、`delay` の定義は
`function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }` と
**ミリ秒**を取る。つまり待ち時間は 0.25ms → 0.5 → 1 → … → 128ms の**合計 255.75ms** で、
実質「0.26秒のあいだに10連射する」動きになる。`Retry-After` は見ていない。

**2層目（このツールの `src/utils/retry.ts`）**: `RETRYABLE_STATUSES = [429, 502, 503, 504]` に
対して `maxAttempts = 3` / `baseDelayMs = 1000` の指数バックオフ（1s → 2s → 4s）を行う。

問題は、**1層目が使い切ったときに投げる `GitbeakerRetryError` が `cause` を持たない**こと。
メッセージは
`Could not successfully complete this request after 10 retries, last status code: 429. ...`
だけで、`cause.response.status` が無い。そのため `isRetryable()` が呼ぶ
`extractHttpStatus()` は `undefined` を返し、**429/502 では2層目が一度も動かない**。
効かないリトライ（0.26秒で10連射）だけが動き、効くリトライ（秒単位のバックオフ）は
動かない状態になっている。

503/504 は gitbeaker の `retryCodes` に入っておらず `throwFailedRequestError()` が
`cause.response.status` を立てるため、2層目が設計どおり効く。

`isFatalError(GitbeakerRetryError)` は false（名前が `GitbeakerTimeoutError` ではなく、
`code` も HTTP ステータスも持たない）なので、該当設定ユニットが `ERROR` になり処理は継続する。

**正典が事実と食い違っている**: `README.md`「エラーハンドリング」表の
「429 / 502 / 503 / 504 → 指数バックオフで最大3回リトライ後にエラー」は、429と502について
実態と違う。

実害の大きさ: 定期実行は1日1回・3設定ユニットで、429を踏む頻度は低い。**「実装は変えず
正典だけ実態に合わせる」も正当な結論になりうる。**

## 解くべき論点

1. **リトライを二重にかけてよいか。** gitbeaker の10回は `requesterFn` を差し替えない限り
   止められない。2層目を429/502でも効かせると「0.26秒で10連射 → 1秒待つ → また10連射」を
   3回、**合計30リクエスト**になる。レート制限を受けている相手にこれが親切かを判断する
2. **`GitbeakerRetryError` から元のステータスをどう得るか。** メッセージに
   `last status code: 429` が含まれるが、**メッセージ文字列のパースに依存してよいか**。
   代案として「エラー名が `GitbeakerRetryError` なら、ステータスを問わずリトライ可能とみなす」
   がある（T-159 で `GitbeakerTimeoutError` を名前で判定した前例と揃う）
3. **`Retry-After` ヘッダを見るか。** gitbeaker は捨てている。見るなら `requesterFn` の
   差し替えが要るので、論点1と一緒に判断する
4. **`src/utils/retry.ts` を残すか。** 503/504 のためには要る。残す前提でよいかを確認する
5. **`README.md` のリトライ行をどう直すか。** 実装を変える場合も変えない場合も、
   この行は実態に合わせる必要がある

## やること

1. **まず実測する。** 429 を返し続けるローカルHTTPサーバを立て、`createClient()` 経由の
   呼び出しが実際に何回リクエストを投げ、何秒かかり、最終的にどのエラーになるかを測る
   （`GitbeakerRetryError` の `message` の実物も記録する）。背景の記述はソースを読んだ結論なので、
   **ここで裏を取ってから設計を決める**
2. 論点1〜5を検討し、**結論をユーザーに提案して承認を得てから適用する**。エラー方針は
   `docs/architecture.md` が設計判断として明文化している領域なので勝手に変えない
3. 承認された形を実装する。**「実装は変えず `README.md` だけ実態に合わせる」と結論した場合は、
   その理由を `evidence` に書いて閉じてよい**（ただし `README.md` の修正は必ず行う）
4. 実装を変えた場合、`docs/architecture.md`「エラーは『fatalは例外・それ以外は戻り値』の
   2チャネル」の節に、2層のリトライの関係を1項目として書く

## 完了条件

- 429 を返し続けるサーバに対する**実測値**（リクエストの実回数・所要時間・最終的なエラーの
  名前とメッセージ）が `evidence` に書かれている
- `README.md`「エラーハンドリング」表のリトライ行が、実測した挙動を説明できている
- 実装を変えた場合: 変更を戻すと落ちるテストが1件以上ある（変異で確認し、`evidence` に書く）
- 実装を変えなかった場合: その判断の理由が `evidence` に書かれている
- `grep -rn "try {" src/steps/` が **0件**
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **gitbeaker の内部リトライは `requesterFn` を差し替えないと止められない。** 差し替えは
  `lib/gitlab/` の責務を大きく変える（`createClient()` がgitbeakerの素のインスタンスを返す
  という前提が崩れる）ので、採る場合はユーザー承認を必ず取る
- **T-159 で入れた `queryTimeout`（5分）は全リトライの総予算。** 1層目の10回も同じ
  `AbortSignal` を共有している。2層目を重ねるときは、この予算内に収まるかを確認する
  （2層目の待ち時間は `AbortSignal` の外なので、1リクエストあたりの予算は毎回5分にリセットされる）
- `src/steps/` 配下に `try`/`catch` を書かない
- HTTPステータスの直書きを散らさない（`docs/coding-standards.md`「エラーハンドリング」）
- **設計変更の承認が要るので `/loop /next-task` には載せない**

**dependencies**: なし

**difficulty**: opus

**evidence**: **実測（429を返し続けるローカルサーバ）**: 429=10回/280ms、502=10回/282ms、503=3回/3015ms、504=3回/3013ms、500=1回/8ms。429と502は `GitbeakerRetryError`（`cause` なし）に化けて `extractHttpStatus` が `undefined` になり、**502 が fatal 判定から漏れていた**（正典は「5xxは即時終了」）。指摘の「自前バックオフが動かない」より重い欠陥で、これが修正の主動機になった。
ユーザー承認は「status を fatal 判定にだけ使う」。`extractExhaustedRetryStatus()` を追加し message の `last status code: N` を読む。**`isRetryable()` には渡さない**ので追加リクエストはゼロ（gitbeakerが既に10回試したあとのため）。読めなければ `undefined` で fatal に昇格させない安全側。
修正後の実測: 502 が `fatal=true` に、**リクエスト回数は10回のまま**（429は `false` で据え置き）。変異2件を確認（fatal判定行を消すと1件、リトライ判定に混ぜると1件落ちる）。`steps/` の try は0件。`pnpm check` 通過（33ファイル370テスト、着手前366から+4）。README のリトライ行を503/504と429/502の2行に分け、`docs/architecture.md` に2層リトライの節を追加。Retry-After は `requesterFn` の差し替えが要るため見送り。

## T-172

**タスク**: `validate` と `verify` の使い分けを決めて、正典に反映する（実装は次のタスク）。

## 背景

設定の検証に関わるファイルが3つあり、**`validate` と `verify` という似た語が別の層に散っている**。

| ファイル                                      | 公開しているもの                                                                                                                  | 何をするか                                                                                  | GitLabに問い合わせるか |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------- |
| `scripts/lint/validate-config.ts`             | なし（トップレベル実行のCLI）                                                                                                     | **入口**。既定はローカル検証のみ、`--remote` を付けると実在チェックも走らせる               | 条件付き               |
| `scripts/lint/verify-config/verify-config.ts` | `verifyConfigExistence()`                                                                                                         | 上記 `--remote` の中身。projectId・ブランチ・valuesPath・アンカーが**GitLab上に実在するか** | する                   |
| `src/lib/config/validate.ts`                  | `resolveProjectLinkage()` / `validateTagFormatConsistency()` / `validateNoDuplicateProjectIds()` / `validateNoDuplicateTargets()` | 本体パイプラインの一部。**YAMLの形と紐づきの矛盾**（重複・projectName不一致など）           | しない                 |

**設計そのものは意図的で、正典に理由が書かれている**（着手前に必ず読むこと）:

- `docs/architecture.md`「設定ミスの検知は「形」と「実在」で2段に分ける」… `loadConfig()` とCIジョブの分担
- `docs/architecture.md`「実在チェックは`src/lib/`ではなく`scripts/lint/`に置く」… 原則3が原則2に優先する例

問題は設計ではなく**名前**で、次の3点が読み手を迷わせる:

1. `validate` が `scripts/lint/validate-config.ts`（CLI入口）と `src/lib/config/validate.ts`（形の検証）の**両方**に現れ、層が違うのに同じ語
2. `validate-config.ts`（CLI）は `--remote` を付けると**verify側も呼ぶ**ので、名前が2つの役割にまたがっている
3. `verify` と `validate` のどちらが「形」でどちらが「実在」かは、**ファイル名からは決まらない**（正典を読まないと分からない）

ユーザーの指示は「verify-config.ts と validate-config.ts があって違いがわからない。lib/config.validate.ts もあって何がなんだか...改善してくれるかな」（実際のパスは `src/lib/config/validate.ts`）。

**改名した場合に波及する範囲**（`grep` で実測した値）:

- `package.json` のスクリプト名2つ（`lint:validate-config` / `lint:validate-config:remote`）
- `.gitlab-ci.yml` 4箇所（ジョブ名 `validate-config-remote`、`script`、コメント2箇所）
- `README.md`（`validate-config-remote` の言及2箇所ほか「設定」章・「CI/CD」章）
- `CLAUDE.md`（「よく使うコマンド」「CI/CD」）
- `docs/architecture.md`（節の索引・2つの設計判断の節・「各ファイルの責務」の表）
- `test/scripts/lint/verify-config/verify-config.test.ts`（ディレクトリ構成がテスト側にも写っている）

## 解くべき論点

1. **そもそも改名するか、ドキュメントで解決するか。** 「`validate`＝形、`verify`＝実在」という
   対応は**既に正典が定めている**ので、名前を変えずに「どこを読めば分かるか」の導線を足すだけでも
   指示の目的（違いが分かる）は達成しうる。**改名しない結論も正当**で、その場合は
   どこに何を書けば迷わなくなるかを決める
2. **改名するなら、どの語をどの層に割り当てるか。** 候補の軸は「形／実在」「ローカル／リモート」
   「CLI入口／実装本体」の3つ。`docs/architecture.md`「1つの語を2つの意味に使わない」と
   「`steps/`配下はファイル名＝公開関数名のケバブケース」の既存規約に照らして決める
3. **外部インターフェースをどこまで変えるか。** `pnpm lint:validate-config` はチーム内の
   手順として `CLAUDE.md`・`README.md` に載っており、`.gitlab-ci.yml` のジョブ名
   `validate-config-remote` は**GitLab上のパイプライン表示・過去のジョブ履歴にも現れる**。
   名前を変える価値がこのコストに見合うかを判断する
4. **`src/lib/config/validate.ts` の関数名（`validateXxx`）も変えるか。** 4関数あり、
   呼び出し元は `config.ts` と `chart-and-apps.ts`。ファイル名だけ変えて関数名を残すと
   別の食い違いを生む
5. **`docs/glossary.md` に用語として載せるか。** 「形の検証」「実在チェック」がドメイン用語なら
   用語集に項目を作る判断がある（`docs/glossary.md` の「用語の索引」を見て決める）

## やること

1. 上の表の3ファイルと、`docs/architecture.md` の該当2節を実際に読んで現状を確認する
2. 論点1〜5を検討し、**結論をユーザーに提案して承認を得る**。改名は外部インターフェース
   （pnpmスクリプト名・CIジョブ名）に波及するため、勝手に決めない
3. 承認された結論を**正典にだけ**反映する（`docs/architecture.md`、必要なら `docs/glossary.md`）。
   **実装・`package.json`・`.gitlab-ci.yml` はこのタスクでは触らない**（T-173の担当）
4. 改名する結論の場合、**新旧の対応表を正典に書く**（T-173 がそれを見て機械的に作業できる形にする）
5. **論点1で「改名しない」と結論した場合**は、正典に導線（どこを読めば違いが分かるか）を
   足して閉じる。その場合 **T-173 は不要になるので、その旨を `evidence` に書く**

## 完了条件

- 論点1〜5それぞれの結論と根拠が `evidence` に書かれている
- 改名する結論の場合: 新旧の対応表が `docs/architecture.md` にあり、`grep` でヒットする
  （表の行数を `evidence` に書く）
- 改名しない結論の場合: 「どちらが形でどちらが実在か」が `docs/architecture.md` の
  「各ファイルの責務」の表から**1画面で読み取れる**状態になっている
- **実装ファイル（`src/` / `scripts/` / `test/`）と `package.json` / `.gitlab-ci.yml` の差分が0**
  （`git diff --stat` で確認し、`evidence` に書く）
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **正典を先に更新し、実装は T-173 で追随させる**（T-156→T-157 と同じ進め方）
- `docs/history/` 配下と `docs/requirements-grilling.md` は触らない
- **設計判断とユーザー承認が要るので `/loop /next-task` には載せない**
- 「形」と「実在」で2段に分ける設計そのものは変えない。変えたくなったらそれは別の話

**dependencies**: なし

**difficulty**: opus

**evidence**: **タスク本文の前提が誤りだった**: 正典の2節（「設定ミスの検知は「形」と「実在」で2段に分ける」「実在チェックは`src/lib/`ではなく`scripts/lint/`に置く」）は2段構成を定めているだけで、`validate`/`verify` という語の割り当てはどこにも書かれていなかった。実測で分かった決め手: `validate` は21ファイルに散る**一般動詞**（`validateGitlabUrl`・タグ形式・スキーマ・`.gitlab-ci.yml` の stage 名まで）で狭い意味を割り当て直せない。一方 `verify` は `scripts/lint/verify-config/` 1箇所だけの例外。論点の結論（ユーザー承認済み）: (1) 改名する、ただし例外側の `verify` を `validate` に寄せる、(2) ディレクトリ名は `remote-existence`（`--remote`・`lint:validate-config:remote`・ジョブ名 `validate-config-remote` と語彙が揃う）、(3) **外部インターフェースは一切変えない**（pnpmスクリプト名・CIジョブ名・stage名・CLI入口のファイル名）、(4) `lib/config/validate.ts` の4関数も据え置き。`docs/architecture.md`「型と命名」に `#### 検証の動詞は`validate`に統一し、`verify`は使わない` を新設し（本文651行目）、10行の旧名→新名の対応表を置いた。索引（78行目）にも同じ見出し名で追加（`grep -n "検証の動詞は"` が2件）。実装は未変更（T-173）。`pnpm check` 通過（33ファイル385テスト）。

## T-173

**タスク**: T-172 で決めた `validate` / `verify` の命名を、実装・CI・ドキュメントに反映する。

## 背景

前段タスク（T-172）で正典に新旧の対応表が入っている。この時点で正典と実装が食い違っているので、
実装側を追随させる。**T-172 が「改名しない」と結論した場合、このタスクは不要**なので、
着手時に T-172 の `evidence` を読んで確認し、不要ならやらずに理由を `evidence` に書いて閉じる。

改名する結論だった場合の主な変更箇所（`grep` で実測した現状値。着手時に再計測すること）:

- `scripts/lint/validate-config.ts`（CLI入口）
- `scripts/lint/verify-config/`（ディレクトリ名。配下に `verify-config.ts` と `remote-cache.ts`）
- `src/lib/config/validate.ts` と、その4つの公開関数（`resolveProjectLinkage` /
  `validateTagFormatConsistency` / `validateNoDuplicateProjectIds` / `validateNoDuplicateTargets`）。
  呼び出し元は `src/lib/config/config.ts` と `src/lib/config/chart-and-apps.ts`
- `package.json` のスクリプト名2つ（`lint:validate-config` / `lint:validate-config:remote`）と、
  `lint` スクリプトからの参照
- `.gitlab-ci.yml` 4箇所（ジョブ名 `validate-config-remote`、`script`、コメント2箇所）
- `README.md` / `CLAUDE.md`（「よく使うコマンド」「設定」「CI/CD」の各章）
- `test/scripts/lint/verify-config/verify-config.test.ts`（ディレクトリ構成がテスト側にも写る）

## やること

1. **T-172 の `evidence` と `docs/architecture.md` の対応表を読み、そこに書かれた範囲でだけ改名する**
   （このタスクで名前を決め直さない）
2. ファイルの移動・改名は `git mv` を使う（履歴を残すため）
3. `package.json` のスクリプト名を変えた場合、`lint` スクリプト内の参照と `.gitlab-ci.yml` の
   `script` 行を必ず揃える。**片方だけ変えるとCIが壊れる**
4. `.gitlab-ci.yml` のジョブ名を変えた場合、`README.md`・`CLAUDE.md`・`.gitlab-ci.yml` の
   コメント内の言及もすべて追随させる
5. `test/` のディレクトリ構成を実装に合わせる（`docs/coding-standards.md`「置き場所とモック」）

## 完了条件

- `docs/architecture.md` の対応表にある**旧名すべてが `grep -rn <旧名> src scripts test package.json
.gitlab-ci.yml README.md CLAUDE.md docs` で0件**（`docs/history/` と
  `docs/requirements-grilling.md` を除く）。旧名の一覧と件数を `evidence` に書く
- 対応表にある**新名すべてが実在する**（各1件以上ヒットすることを `grep` で確認し、`evidence` に書く）
- `pnpm lint:validate-config`（改名後の名前）が位置引数なしで
  `config OK: 3 設定ユニット, 5 apps` を出す（出力を `evidence` に書く）
- `.gitlab-ci.yml` の `script` 行に書かれた pnpm スクリプトが `package.json` に実在する
  （両方を `grep` して突き合わせ、`evidence` に書く）
- `pnpm check` が通る（テスト件数を `evidence` に書く。改名のみなので**件数は変わらないはず**で、
  減っていたら理由を確認する）

## 注意

- **T-172 が「改名しない」と結論していたら、このタスクはやらずに閉じる**
- ファイルの移動は `git mv`（`docs/workflow.md` と T-157 の前例）
- `docs/history/` 配下と `docs/requirements-grilling.md` は触らない
- 実 `config/` の中身（`projectId` 等の値）は変えない
- **T-165 も `scripts/lint/verify-config/verify-config.ts` を触る**。どちらかが先に終わったら、
  もう片方は着手時にファイルパスを再確認する
- `/loop /next-task` に載せてよい（名前は T-172 で決定済みで、ここは機械的な追随）

**dependencies**: T-172

**difficulty**: sonnet

**evidence**: T-172 の対応表10行どおりに改名。`git mv` 3件が `R`（rename）として記録されている（`scripts/lint/verify-config/{verify-config,remote-cache}.ts` と `test/scripts/lint/verify-config/verify-config.test.ts`）。旧名は対応表の全行で**0件**、新名は各2〜4ファイルで実在。**外部インターフェースは差分ゼロ**（`package.json`・`.gitlab-ci.yml`・`README.md`・`CLAUDE.md` の `git diff` が空）。`src/lib/config/validate.ts` は参照コメント1行のみで4関数は無変更。対応表に無かった追随が1件: `vitest.config.ts` の coverage の `include` パス（放置すると `scripts/` のカバレッジ対象が黙って外れる）。残存 `verify` は狙いどおり2種類だけ — gitbeaker のエラー文言（`test/lib/gitlab/errors.test.ts:127`）と `docs/architecture.md` の対応表本体。`pnpm lint:validate-config` は `config OK: 3 設定ユニット, 5 apps (config)`。`pnpm check` 通過（33ファイル385テスト、改名のみなので着手前と同数が正しい）。

## T-174

**タスク**: `stageHelmTargetBranchUpdates()` への `BranchExists` の注入をやめるかどうかを決めて反映する。

## 背景

`src/steps/build-plans/build-plans.ts` は、サブステップに**同じキャッシュを2つの経路で**渡している。

```ts
const valuesYamlSource: ValuesYamlSource = { gitlabCache, chart: chartAndApps.chart }
...
await stageHelmTargetBranchUpdates(
  valuesYamlSource,                                                    // ← gitlabCache と chart を含む
  (branch) => gitlabCache.branchExists(chartAndApps.chart.projectId, branch),  // ← 同じものから作った関数
  chartAndApps.helmTargetBranch,
  draftAfterApps,
)
```

`ValuesYamlSource`（`sub-steps/shared/values-yaml-draft.ts`）は
`{ gitlabCache: GitlabBatchCache; chart: ChartRepoConfig }` で、**`chart.projectId` も
`gitlabCache.branchExists` も既にサブステップから見えている**。つまり
`stageHelmTargetBranchUpdate()` は `source.gitlabCache.branchExists(source.chart.projectId, branchName)`
と直接書けるため、`BranchExists` の注入は情報を隠せていない。

**正典の説明が実態と食い違っている**（着手前に必ず読むこと）。
`sub-steps/shared/types.ts` の `BranchExists` のJSDocは

> `build-plans.ts`側でバッチ単位のキャッシュ（`GitlabBatchCache`）とchartのprojectIdを閉じ込めるため、
> サブステップ側はキャッシュの存在を知らずにブランチの実在確認だけを依頼できる

と書いているが、同じ関数が `source` 経由でキャッシュを受け取っているので「知らずに」が成り立たない。
`docs/architecture.md`「サブステップに関数型を注入するのは、親stepが持つキャッシュを隠すときだけ」も
同じ主張をしている。

さらに**同じ節が、逆向きの前例を自分で記録している**: values.yaml の読み込みは以前
`ReadDraftValuesYaml` という関数型の注入だったが、「読み込み先（`ValuesYamlSource`＝バッチ
キャッシュ＋chartリポジトリ）はそれ自体がただのデータなので、関数型で隠す必要が無い」という理由で
直接呼び出しに変えている。**この理由は `BranchExists` にもそのまま当てはまる。**

`BranchExists` 型の利用箇所は `sub-steps/shared/types.ts`（定義）と
`stage-helm-target-branch-updates.ts`（引数）の2ファイルのみ。

## 解くべき論点

1. **注入をやめて `source` から直接呼ぶか。** やめると引数が1つ減り、`BranchExists` 型が
   消える。一方でサブステップが「キャッシュ経由でブランチの実在を問い合わせる」ことを
   知ることになる。ただし**既に `source` 経由で `getFileContent` を呼んでいる**
   （`readValuesYamlDraft()`）ので、新しく知ることにはならない点を確認する
2. **逆に `ValuesYamlSource` の側を絞る案はあるか。** `stageHelmTargetBranchUpdates()` が
   本当に必要としているのは「values.yamlの読み書き」と「ブランチの実在確認」の2つで、
   どちらも `gitlabCache` + `chart` から導ける。`source` を関数の集合に変える案は、
   上の正典が「ただのデータなので関数型で隠す必要が無い」として**既に退けた形**に戻らないかを確認する
3. **`sub-steps/shared/types.ts` から `BranchExists` が消えると、このファイルに残るのは
   `StageUpdatesAcc` / `LatestTagResolution` / `AppWithLatestTag` の3つ**になる。
   `docs/architecture.md`「型の置き場所」の6行目（複数のサブステップが共有する型）に
   照らして、ファイルを残す判断でよいかを確認する
4. **`docs/architecture.md`「サブステップに関数型を注入するのは、親stepが持つキャッシュを
   隠すときだけ」の節をどう書き換えるか。** 注入をやめると、この節が説明する対象が
   `createResolveLatestTags()`（工場関数の側）だけになる。節ごと組み替えるか、
   前例の記録として残すかを決める

## やること

1. 論点1〜4を検討し、**結論をユーザーに提案して承認を得てから適用する**。
   `docs/architecture.md` が設計判断として明文化している領域なので勝手に変えない
2. 承認された形に実装を変え、波及先（`build-plans.ts` の呼び出し、
   `stage-helm-target-branch-updates.ts` の2関数、`sub-steps/shared/types.ts`）を追随させる
3. `docs/architecture.md` の該当節と、`sub-steps/shared/types.ts` のJSDocを実態に合わせる。
   **`BranchExists` を残す結論でも、「キャッシュを隠している」という現在の説明は事実と違うので
   必ず直す**
4. **検討の結果「今の形のままがよい」と結論した場合は、実装を変えずに理由を `evidence` に
   書いて閉じてよい。** ただしその場合も手順3のJSDoc・正典の修正は行う

## 完了条件

- 論点1〜4それぞれの結論と根拠が `evidence` に書かれている
- `sub-steps/shared/types.ts` の `BranchExists` のJSDoc（残す場合）または
  `docs/architecture.md` の該当節が、**「キャッシュを隠す」という事実と違う説明を含まない**
  （該当箇所を `evidence` に引用する）
- 実装を変えた場合: `test/steps/build-plans/sub-steps/stage-helm-target-branch-updates.test.ts` が
  **無改変で通る**（向き先ブランチが存在しないときに例外を投げる振る舞いが変わっていないこと）。
  無改変で通らないなら、なぜテストの書き換えが要るのかを `evidence` に書く
- `grep -rn "BranchExists" src` の件数が結論と一致している（件数を `evidence` に書く）
- `grep -rn "try {" src/steps/` が **0件**
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- **`stage-helm-target-branch-updates.ts` の振る舞いを変えない。** 向き先ブランチが
  chartリポジトリに実在しないときに例外を投げる（＝該当設定ユニットが `ERROR` になる）経路は維持する
- サブステップ同士は互いに import しない（`docs/architecture.md`「サブステップ同士は互いを
  importせず、共有物は`sub-steps/shared/`に置く」）
- `createResolveLatestTags()`（工場関数でキャッシュの寿命を親stepに持たせる形）は**別の話**なので触らない
- `src/steps/` 配下に `try`/`catch` を書かない
- **設計判断とユーザー承認が要るので `/loop /next-task` には載せない**

**dependencies**: なし

**difficulty**: opus

**evidence**: ユーザー承認は「注入をやめて `source` から直接呼ぶ」。`stageHelmTargetBranchUpdates()` の引数を4→3に減らし、内部で `source.gitlabCache.branchExists(source.chart.projectId, branchName)` を呼ぶ形に。`BranchExists` 型を削除し、`sub-steps/shared/types.ts` は3型（`StageUpdatesAcc`・`LatestTagResolution`・`AppWithLatestTag`）になった（論点3: 複数サブステップが共有する型が残るのでファイルの存在理由は保たれる）。論点2の `ValuesYamlSource` を絞る案は、正典が既に退けた形に戻るため不採用。
**テストは無改変で通った**（`test/` の `git diff` が0行）。既存テストが `buildPlans()` 経由で `lib/gitlab/gitlab.js` をモックする作りだったため、注入の有無に依存していなかった。変異2件で守られていることを確認: 実在確認を消すと4件、別のprojectIdを見るようにすると3件落ちる。
正典は `docs/architecture.md` の該当節を**見出しごと書き換え**（節の索引も追随）。この変更で関数型の注入が0件になったため、節の主張が「注入するのはキャッシュを隠すときだけ」から「注入しない。キャッシュを持つ側が工場関数を公開する」に変わる。`ReadDraftValuesYaml` と `BranchExists` を同じ理由でやめた経緯を並べて記録した。型の置き場所の表からも `BranchExists` を除去。`grep -rn 'try {' src/steps/` は0件。`pnpm check` 通過（33ファイル382テスト、着手前と同数）。

## T-175

**タスク**: アクセストークンがログに出うる経路を洗い、必要ならマスクの隙間を塞ぐ。

## 背景

`src/utils/logger.ts` の `redact()` が、フィールド名を `toLowerCase()` して
`SENSITIVE_KEYS`（`token` / `access_token` / `authorization` / `password` / `secret`）と
**完全一致**したものだけを `[REDACTED]` に置換する。見るのは**トップレベルのキーだけ**で、
ネストしたオブジェクトの中は見ない。

そのため **`accessToken` というキー名は現状ヒットしない**（`toLowerCase()` すると
`accesstoken` になり、`access_token` と一致しない）。`src/lib/env.ts` の `EnvConfig` は
まさにこのキー名でトークンを保持している（`readonly accessToken: AccessToken`）ので、
`logger.info({ ...env })` のような書き方をした瞬間に素通りする。

一方、**現時点の呼び出し元はどれもトークンを渡していない**（`grep -rn "logger\.\(info\|error\)" src scripts`
で13箇所。`src/index.ts` 2件・`src/main.ts` 3件・`steps/` 7件・`step-outcome.ts` 1件）。
`src/main.ts:13` の `run_start` はフィールドを個別に並べている。

例外経路は `src/utils/errors.ts` の `toErrorMessage()` を通り、
`src/steps/shared/step-outcome.ts` の `settleAsError()` と `src/index.ts` がメッセージを出す。
トークンは `src/lib/gitlab/gitlab.ts` の `createClient()` が `new Gitlab({ host, token, ... })`
としてgitbeakerに渡しており、HTTPヘッダで送られる。エラーメッセージやURLに載るかは実物で確かめる。

`scripts/smoke/smoke-fixture.ts` と `scripts/lint/validate-config.ts` は `logger` を通さない
生の `console.log`/`console.error` を使う（現状トークンは出していない）。

テストは `test/utils/logger.test.ts` の `describe("redact")` にあり、5キーと大文字の
`ACCESS_TOKEN` を確認している。

正典側は `docs/requirements.md` 5章「GitLab認証」が **CI/CD変数（masked）で渡す**ことを
決めているだけで、**アプリ自身のログ出力でマスクする方針はどこにも書かれていない**。

## 解くべき論点

1. `SENSITIVE_KEYS` に `accesstoken` 相当を足すだけでよいか、完全一致をやめて部分一致
   （キー名が `token` を含む）にするか。部分一致は無関係なキー（`tokenCount` など）まで潰す
2. ネストしたオブジェクトまで再帰的に見るか。現状 `logger` に渡しているのは平坦な
   フィールドだけなので、再帰は「将来の事故防止」への投資になる。**やらない結論も正当**
3. 値そのものを見て伏せる方式（トークン文字列と一致したら伏せる）を採るか。採ると
   `src/utils/logger.ts` が環境変数を知ることになり **CLAUDE.md 原則2に反する**ので、
   採るなら置き場所から決める
4. 決めた方針を正典に書くか。書くなら `docs/requirements.md` 5章と
   `docs/architecture.md` のどちらか**一方**（二重に書かない）

## やること

1. 上の背景を現物で再確認する（`src/utils/logger.ts`、`grep -rn "logger\.\(info\|error\)" src scripts`）
2. トークンが実際にログへ出うる経路があるかを調べる。**調べた結果「今の呼び出し元では漏れない」
   と分かったら、コードを変えずに閉じてよい**（その根拠を `evidence` に書く）。
   キー名の隙間だけ塞いで閉じる判断も可
3. 変えるなら `src/utils/logger.ts` を直し、`test/utils/logger.test.ts` にケースを足す
4. 方針を正典に書く場合、書き足す場所は1箇所に絞る

## 完了条件

- 調べた経路の一覧（`logger` 呼び出し13箇所・例外メッセージの経路・`scripts/` の生 `console`）と、
  そこにトークンが載りうるかの結論が `evidence` に書かれている
- コードを変えた場合、**`accessToken` というキー名で渡した値が `[REDACTED]` になる**ことを
  テストで示す（テスト名を `evidence` に書く）
- `pnpm check` が通る（テスト件数を `evidence` に書く）

## 注意

- 実際のトークン値をログ・テスト・`evidence` に**絶対に書かない**（ダミー文字列を使う）
- `.env` と CI/CD Variables の設定は変えない（変更はユーザー承認が要る）
- `src/utils/` はドメイン知識・環境依存を持たない（CLAUDE.md 原則2）。環境変数を読むコードを
  ここに足さない
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: sonnet

**evidence**: 結論は「隙間だけ塞ぐ」。`logger` 呼び出し13箇所を全件読み、`EnvConfig` や `Error` を丸ごと spread している箇所は0件（`main.ts:13` の `run_start` も個別フィールド）。gitbeaker 43.8.0 のソースで、トークンは `private-token`/`Authorization` ヘッダ送信のみ・`error.message` はレスポンスボディ由来の `description` だけと確認したので、`toErrorMessage()` 経由でも載らない。対処は `SENSITIVE_KEYS` への `accesstoken` 追加1件のみ（`toLowerCase()` の完全一致ではキャメルケースの `accessToken` が素通りしていた）。再帰化と値ベースの伏せ込みは不採用（後者は `src/utils/` が環境を知ることになり原則2に反する）。方針は `docs/requirements.md` 5章「GitLab認証」の1箇所だけに追記（`docs/architecture.md` には書かない）。変異確認: set の `accesstoken` を潰すと `accesstoken キーの値を [REDACTED] に置換する` と `accessToken キー（キャメルケース）の値を [REDACTED] に置換する` の2件が落ちる。`pnpm check` 通過（33ファイル385テスト、着手前383から+2）。

## T-176

**タスク**: `outcome` と `result` の使い分けを決めて正典に反映する（実装への反映は次のタスク）。

## 背景

ユーザーの指示は「`step-outcome.ts` を見てて思ったこととして、outcome よりは result のほうが
馴染みがあるんだけどどうかな? `step-result`、その他 outcome ではなく result を使う」。

`src/steps/shared/step-outcome.ts` が `StepOutcome<T>` を公開しており、定義はこう:

```ts
export type StepOutcome<T> =
  | { readonly status: "ok"; readonly value: T }
  | { readonly status: "settled"; readonly result: ChartUpdateResult }
```

問題は、**`result` という語がこのリポジトリで既に別の意味で使われている**こと:

- `src/types/types.ts:107` の `ChartUpdateResult = "CREATED" | "SKIPPED" | "ERROR"`
  （chartAndApps 1件の最終的な処理結果）
- **JSONログのフィールド名 `result`**（`filter-targets.ts:49,55`・`build-plans.ts:87,91`・
  `apply-updates.ts:52`・`step-outcome.ts:97` ほか）。`README.md`「実行ログの例」にも出る
- `src/main.ts:23` の `resultCounts`
- `StepOutcome` 自身の `settled` 側のフィールド名が `result`

つまり `StepOutcome` → `StepResult` に改名すると、**`StepResult` の中に
`result: ChartUpdateResult` が入る**形になり、`docs/architecture.md`
「#### 1つの語を2つの意味に使わない」（`### 型と命名` の中）と正面から衝突する。

波及範囲（`grep -rn "utcome" src scripts test docs README.md` の実測。`docs/history/` を除く）:

- `src/steps/shared/step-outcome.ts`（ファイル名 + 本文6箇所）
- `src/steps/filter-targets/filter-targets.ts` / `build-plans/build-plans.ts` /
  `apply-updates/apply-updates.ts` 各9箇所（`outcomes` / `outcome` のローカル変数を含む）
- `sub-steps` 3ファイル（`collect-mr-entries.ts` / `resolve-latest-tags.ts` /
  `stage-image-tag-updates.ts`）の import 各1箇所
- `src/utils/partition.ts` のJSDocの使用例5箇所
- `docs/architecture.md` 5箇所（各ファイルの責務表・型の置き場所の表・設計判断の本文）
- `docs/coding-standards.md` 3箇所

`docs/architecture.md`「#### `steps/`配下はファイル名＝公開関数名のケバブケース」があるため、
型名を変えるならファイル名（`step-outcome.ts`）も追随する。

## 解くべき論点

1. **上の衝突をどう解くか。** 少なくとも3案ある: (a) `ChartUpdateResult` 側を別の語にする、
   (b) `StepOutcome` の `settled` 側のフィールド名を変える、(c) 改名しない。
   ユーザーの指示は「result を使う」だが、**衝突を説明したうえで採らない結論も正当**
2. **ログのフィールド名 `result` を変えるか。** JSONログは運用で `grep` される
   **外部インターフェース**で、`README.md`「実行ログの例」にも載っている
3. `status: "ok" | "settled"` というタグと、`ok()` / `settle()` という関数名は据え置くか
4. 散文中の `outcome`（JSDocの「settled outcome」など）をどこまで書き換えるか

## やること

1. `docs/architecture.md` の「#### 1つの語を2つの意味に使わない」と
   「#### `steps/`配下はファイル名＝公開関数名のケバブケース」を読む
2. 論点1〜4を**ユーザーと合意してから**決める（このタスクはユーザーがいるセッションで行う）
3. 決めた対応表（旧名 → 新名、変えないものとその理由）を `docs/architecture.md` の
   該当する節に反映する。**改名しない結論なら、その理由**を同じ節に残す
4. 実装・テストのコードはこのタスクでは変えない（T-177 が行う）

## 完了条件

- 論点1〜4すべてに結論が出ていて、根拠が `evidence` に書かれている
- 改名する結論なら、`docs/architecture.md` に旧名→新名の対応表があり、
  `grep -rn "utcome" src docs README.md`（`docs/history/` を除く）でヒットする識別子が
  漏れなく載っている（件数を突き合わせて `evidence` に書く）
- 改名しない結論なら、実装・ドキュメントとも識別子は無変更で、理由が
  `docs/architecture.md` の**1箇所だけ**に書かれている
- `pnpm check` が通る（ドキュメントのみの変更でも実行する。テスト件数を `evidence` に書く）

## 注意

- **ユーザーへの確認を含むので `/loop` の自動進行に載せない。サブエージェントにも委譲しない**
- `docs/history/` は触らない
- 実装・テストのコードはこのタスクでは変えない

**dependencies**: なし

**difficulty**: opus

**evidence**: ユーザー判断で**着手しない**（2026-09-10）。共有した懸念: (1) `result` のドメイン型が既に2つある（`ChartUpdateResult`・`RunResult`。どちらも `docs/glossary.md` 掲載）のに `StepOutcome` は制御フローの型で層が違う、(2) `StepResult` にすると `{ status: "settled"; result: ChartUpdateResult }` が `result.result` になり、`docs/architecture.md`「1つの語を2つの意味に使わない」の本文（値の意味を語れないフィールド名は避ける）を自分で踏む、(3) ログのフィールド名 `result` は `README.md` の実行ログ例3箇所に出る外部インターフェースで動かせない、(4) `src/main.ts:66` の reduce が既に `(counts, result)` を使っており局所変数が衝突する。波及は src 8ファイル・docs 2ファイルの約40箇所。正典（`docs/architecture.md`）は無変更で、理由は `develop/progress.md`「未解決」に残した（T-151 と同じ閉じ方）。

## T-177

**タスク**: T-176 で決めた `outcome` / `result` の命名を、実装・テスト・ドキュメントに反映する。

## 背景

前段タスク（T-176）で `docs/architecture.md` に旧名→新名の対応表が入っている。この時点で
正典と実装が食い違っているので、実装側を追随させる。**T-176 が「改名しない」と結論した場合、
このタスクは不要**なので、着手時に T-176 の `evidence` を読んで確認し、不要ならやらずに
理由を `evidence` に書いて閉じる。

改名する結論だった場合の変更箇所（着手時に `grep -rn "utcome" src scripts test docs README.md`
で再計測すること。以下は登録時点の実測値）:

- `src/steps/shared/step-outcome.ts`（ファイル名 + 本文6箇所）
- `src/steps/filter-targets/filter-targets.ts` / `src/steps/build-plans/build-plans.ts` /
  `src/steps/apply-updates/apply-updates.ts` 各9箇所（`outcomes` / `outcome` のローカル変数を含む）
- `src/steps/apply-updates/sub-steps/collect-mr-entries.ts` /
  `src/steps/build-plans/sub-steps/resolve-latest-tags.ts` /
  `src/steps/build-plans/sub-steps/stage-image-tag-updates.ts` の import 各1箇所
- `src/utils/partition.ts` のJSDocの使用例5箇所
- `docs/architecture.md` 5箇所 / `docs/coding-standards.md` 3箇所
- T-176 がログのフィールド名や `ChartUpdateResult` も変える結論だった場合は、
  `README.md`「実行ログの例」と `test/` の該当アサーションも対象になる

## やること

1. **T-176 の `evidence` と `docs/architecture.md` の対応表を読み、そこに書かれた範囲でだけ
   改名する**（このタスクで名前を決め直さない）
2. ファイルの改名は `git mv` を使う（履歴を残すため。T-157 の前例）
3. `test/` 側のファイル名・ディレクトリ構成も実装に合わせる
   （`docs/coding-standards.md`「置き場所とモック」）
4. 対応表に載っていない `outcome` が残った場合は、消さずに理由を `evidence` に書く

## 完了条件

- 対応表にある**旧名すべてが `grep -rn <旧名> src scripts test docs README.md CLAUDE.md` で0件**
  （`docs/history/` と `docs/requirements-grilling.md` を除く）。旧名の一覧と件数を `evidence` に書く
- 対応表にある**新名すべてが実在する**（各1件以上ヒットすることを `grep` で確認し `evidence` に書く）
- `pnpm check` が通る（テスト件数を `evidence` に書く。**改名のみなので件数は変わらないはず**で、
  減っていたら理由を確認する）

## 注意

- **T-176 が「改名しない」と結論していたら、このタスクはやらずに閉じる**
- ファイルの移動は `git mv`
- `docs/history/` 配下と `docs/requirements-grilling.md` は触らない
- 挙動は変えない（型名・変数名・ファイル名の変更だけ）
- `/loop /next-task` に載せてよい（名前は T-176 で決定済みで、ここは機械的な追随）

**dependencies**: T-176

**difficulty**: sonnet

**evidence**: 前段の T-176 が「改名しない」で閉じたため**不要**（タスク本文の「T-176 が改名しないと結論していたら、このタスクはやらずに閉じる」に従う）。コード・ドキュメントとも無変更。

## T-178

**タスク**: HTTPエラー処理の「今の実装」を1つの資料にまとめる（散らばった記述の集約先を決めるところから）。

## 背景

ユーザーの指示は「http 周りのエラーが複雑になってきたけど今の実装がまとまった資料ある?
なければ作ってほしいな」。

調べたところ、HTTPエラーの扱いは**4箇所に分かれて書かれており、実装を1枚で追える資料は無い**:

| 場所                                                                                | 書いてあること                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`「エラーハンドリング」                                                   | ケース→挙動の表8行（利用者向け。401/5xx・queryTimeout・503/504・429/502 など）                                                                                                                                                                                                                                                                                                              |
| `docs/architecture.md`「#### エラーは「fatalは例外・それ以外は戻り値」の2チャネル」 | なぜ2チャネルなのか、`steps/` に `try` を書かない理由（設計判断）                                                                                                                                                                                                                                                                                                                           |
| `docs/coding-standards.md`「エラーハンドリング」                                    | `try`/`catch` を書いてよい場所の一覧、`.then()`/`.catch()` の例外                                                                                                                                                                                                                                                                                                                           |
| コード内のコメント                                                                  | 実際の判定。`src/lib/gitlab/errors.ts`（`GitbeakerTimeoutError` / `GitbeakerRetryError` / `RETRYABLE_STATUSES` = 429,502,503,504 / `isFatalStatus()` = 401と5xx）、`src/utils/retry.ts`（最大3回・基準1000msの指数バックオフ）、`src/lib/gitlab/gitlab.ts`（`QUERY_TIMEOUT_MS` = 300_000）、`src/steps/shared/step-outcome.ts`（`withHandling()` / `withAppContext()` / `settleAsError()`） |

登場する部品: `extractHttpStatus()` / `isNotFoundError()` / `isFatalError()` /
`isRetryableError()`（`src/lib/gitlab/errors.ts`）、`withRetry()`（`src/utils/retry.ts`）、
`FatalError` / `toErrorMessage()`（`src/utils/errors.ts`）、`withHandling()` /
`withAppContext()` / `ok()` / `settle()`（`src/steps/shared/step-outcome.ts`）、
`ChartUpdateResult`（`src/types/types.ts`）。

## 解くべき論点

1. **新規ファイル（例 `docs/error-handling.md`）を作るか、`docs/architecture.md` の
   既存節を厚くするか。** このリポジトリは**正典を二重に書かないこと**を強く守っているので、
   新規ファイルを作るなら既存3箇所との分担（どれが何の正典か）を先に決める
2. **何を載せれば「まとまった」と言えるか。** 1リクエストの失敗が
   リトライ / `ERROR` として継続 / `FatalError` で即時終了 のどれになるかの経路
   （ステータス別の分岐表、またはフロー図）が要るか
3. **コードのコメントから移すものがあるか。** `docs/coding-standards.md`「コメント」は
   「今の挙動の制約・前提は残す、昔の経緯は正典へ」なので、gitbeaker依存の事実
   （エラー名・メッセージ形式）はコメントに残すのが正しい可能性が高い
4. リンクの導線。`CLAUDE.md`「関連リンク」と `docs/architecture.md` の「節の索引」に足すか

## やること

1. 上の4箇所を実際に読み、重複と欠落を洗い出す
2. 論点1を決めてから書く。**「既に必要なことは書かれていて、新規資料は要らない」という結論なら、
   どこを読めば分かるかの導線だけを足して閉じてよい**（その理由を `evidence` に書く）
3. 書く内容は**実物のコードと突き合わせて検証する**（ステータス番号・リトライ回数・
   タイムアウト値をコードから引き、記憶で書かない）
4. 新規ファイルを作った場合は `CLAUDE.md`「関連リンク」から辿れるようにする

## 完了条件

- 資料に書いたHTTPステータス・リトライ回数・タイムアウト値が
  `src/lib/gitlab/errors.ts`・`src/utils/retry.ts`・`src/lib/gitlab/gitlab.ts` の実値と一致する
  （対応を `evidence` に書く）
- 既存3箇所（`README.md` / `docs/architecture.md` / `docs/coding-standards.md`）と
  **同じ説明が2箇所に増えていない**。移したもの・残したものの一覧を `evidence` に書く
- 新規ファイルを作った場合、`CLAUDE.md`「関連リンク」からのリンクが存在する（`grep` で示す）
- `pnpm check` が通る（`format:check` があるので表の整形が崩れると落ちる。テスト件数を `evidence` に書く）

## 注意

- **正典の構成を決める判断を含むので `/loop` の自動進行には載せない**
- `src/` のコードは変えない（資料化だけ。コメントの移動は論点3の結論に従う）
- `docs/history/` は触らない
- 資料を新設した場合、T-179（索引の付与）の対象に含まれる

**dependencies**: なし

**difficulty**: opus

**evidence**: ユーザー合意は「新規ファイルを作らず `docs/architecture.md`「エラー処理と並列実行」に節を1つ足す／`README.md` の8行表は据え置き、新設節は機構だけ」。`#### HTTPエラーの経路` を2チャネル節の直後（本文340行目）に新設し、節の索引（53行目）にも同じ見出し名で追加した（`grep -n "HTTPエラーの経路"` が索引と本文の2件でヒット）。中身は登場人物表（9関数・4ファイル、非公開は `*` 印）／判定の順序5ステップ／404と403の読み替え／「ステータス別の挙動は README が正典」の一文。埋めた穴は、機構の順序・`getLatestPipelineForRef()` だけが403を「パイプライン無し」に読み替えること（`gitlab.ts:205`）・関数の一覧の3つ。記述はメイン側でも実物と突き合わせ済み（`withNotFoundFallback()` が `withGitlabRetry()` の内側にあること、リトライ既定が `maxAttempts` 3・`baseDelayMs` 1000 であること）。重複回避のため `queryTimeout` の5分と2層リトライの実測値は既存節に任せて書いていない。`git diff --stat -- README.md src test` は0行。`pnpm check` 通過（33ファイル385テスト、ドキュメントのみの変更なので据え置きが正しい）。

## T-179

**タスク**: 索引・目次を持たないドキュメントに、既存の形式に合わせた索引を付ける。

## 背景

ユーザーの指示は「各ドキュメントに目次とかあると見やすいんだけどな。ないドキュメントに
付与してくれる?」。

現状（`grep -n "^#\{2,3\} " docs/*.md README.md CLAUDE.md` で実測）:

| ファイル                        | サイズ | 索引                                                                                                             |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `docs/architecture.md`          | 87KB   | あり（`### 節の索引`。`###`/`####` を表で並べる）                                                                |
| `docs/coding-standards.md`      | 34KB   | あり（`### 節の索引`）                                                                                           |
| `docs/glossary.md`              | 30KB   | あり（`### 用語の索引`）                                                                                         |
| `docs/requirements.md`          | 36KB   | あり（`### 節の索引`）                                                                                           |
| `docs/workflow.md`              | 15KB   | **なし**                                                                                                         |
| `docs/smoke-test.md`            | 8.7KB  | **なし**                                                                                                         |
| `docs/requirements-grilling.md` | 16KB   | **なし**（`/grilling` の途中経過ログ）                                                                           |
| `README.md`                     | 23KB   | **なし**                                                                                                         |
| `CLAUDE.md`                     | —      | **なし**（毎セッション全文が読まれる）                                                                           |
| `docs/history/*.md`             | —      | **なし**。`progress-archive.md` と `direction.md` は冒頭に「時系列の追記ログなので節の索引は持たない」と明記済み |

既にあるものは単なる見出しの列挙ではなく、**「どの節に何が書いてあるか」を1行で説明する表**で、
「このファイルは通読しない」という運用（`sed` で節を切り出して読む）とセットになっている。

## 解くべき論点

1. **どのファイルに付けるか。** `docs/history/` の2つは「索引は持たない」と明記済みなので対象外。
   `docs/requirements-grilling.md` は完了済みの検討ログ、`CLAUDE.md` は全文が読まれる前提。
   **付けない判断も正当**で、その場合は理由を残す
2. **形式。** 既存の「節の索引」（表 + 説明）に揃えるか、`README.md` のように
   **GitHub上で人が上から読む**ファイルには普通のリンク付き目次にするか。用途が違う
3. **粒度。** `##` だけを並べるか、`###` まで含めるか（ファイルの大きさで変えてよいか）

## やること

1. 論点1〜3を決める
2. 既存4ファイルの索引の書き方を実際に読んでから、それに揃えて書く
3. **見出し自体は書き換えない**（索引を足すだけ。見出しの改名は別タスク）
4. 索引の各行が**実在する見出しと文字列一致**することを `grep` で確認する

## 完了条件

- 付けた各ファイルについて、索引に並べた見出し名がすべて実在する
  （`grep -n "^#\{2,3\} " <file>` の結果と突き合わせ、`evidence` に書く）
- 付けなかったファイルは、その理由が `evidence` に1行ずつ書かれている
- 既存4ファイル（`architecture` / `coding-standards` / `glossary` / `requirements`）の索引を
  壊していない（`git diff --stat` に出ないこと、または意図した更新であることを `evidence` に書く）
- `pnpm check` が通る（`format:check` があるので表の整形が崩れると落ちる。テスト件数を `evidence` に書く）

## 注意

- **T-178 が新しいドキュメントを作った場合、そのファイルも対象に含める**（着手時に
  `ls docs/*.md` で確認する）
- 本文の内容は書き換えない（索引の追加だけ）
- `docs/history/` は触らない
- `/loop /next-task` に載せてよい

**dependencies**: T-178

**difficulty**: sonnet

**evidence**: `README.md`（リンク付き目次16項目）・`docs/workflow.md`（表形式11行）・`docs/smoke-test.md`（表形式5行）に追加。索引の各行が実在見出しと**順序込みで文字列一致**することを突き合わせで確認（16/16・11/11・5/5）。README のアンカーはGitHubのslug規則に沿う（`config/`→`#config`、`CI/CD`→`#cicd`、`手動実行時のオプション（Pipeline inputs）`→`#手動実行時のオプションpipeline-inputs`）。重複見出しは0件。付けなかったのは3種: `docs/requirements-grilling.md`（完了済みの検討ログで時系列の記録）、`CLAUDE.md`（毎セッション全文が読まれるので索引が二重情報になる）、`docs/history/`（冒頭に索引を持たない旨が明記済み）。見出し名は `## 目次` を使い、既存4ファイルの `### 節の索引` とは分けた（あちらは「通読せず sed で節を切り出す」運用とセット、こちらは上から読むファイル向け）。既存4ファイルの索引は `git diff --stat` に出ず無傷。追加のみ45行、`pnpm check` 通過（33ファイル385テスト）。

## T-180

**タスク**: `config.yaml` の `helm` を省略可能から必須に変える。

## 背景

**ユーザー確認済みの前提（2026-09-10）**: chartリポジトリは常に2ブランチ構成で、
「`apps` というパラメータを定義するブランチ」と「`apps` を流し込んで k8s リソースを構築する
`helm` のブランチ」で構成される。**設定ユニットごとにアンカーを2つ指定するのは当然**という
運用判断。したがって `helm` を省略できる現在のスキーマは、この前提を表せていない。

現状は `src/lib/config/schema.ts:115` が `helm: HelmSchema.optional()`。中身
（`branchToSync` / `chart[]`）は既に両方必須で、片方だけの指定は設定エラーになる。
省略できるのは `helm` オブジェクト自体だけ。

`helm` は `apps[]` とは独立した書き込み指示で、イメージタグの解決・タグの作成には一切関与
しない（`apps[].chart[]` がイメージタグ、`helm.chart[]` がブランチ名を、それぞれ別のアンカーへ
書く）。`apps` が0件なら設定ユニットは `SKIPPED`（`filter-targets.ts:48`、`reason: "no_apps"`）に
なるため、`helm` だけの設定ユニットは動かない。この関係は変えない。

**波及範囲**（`grep` で実測した登録時点の値。着手時に再計測すること）:

| 対象         | 箇所                                                                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| スキーマ     | `src/lib/config/schema.ts:115`（`.optional()` を外し、欠落時のエラーメッセージを足す）                                                                                                        |
| 型           | `src/types/types.ts:59` `readonly helmTargetBranch: HelmTargetBranchConfig \| undefined` から `\| undefined` を消す                                                                           |
| 結合         | `src/lib/config/chart-and-apps.ts:66` の `resolveHelmTargetBranch()`                                                                                                                          |
| 本体         | `src/steps/build-plans/build-plans.ts:78` の分岐（`helmTargetBranch` の有無で処理を分けている）                                                                                               |
| 実在チェック | `scripts/lint/verify-config/verify-config.ts:105` の `helmTargetBranch !== undefined` 分岐                                                                                                    |
| テスト       | `test/helpers.ts:92` の既定値 `helmTargetBranch: undefined`、`test/lib/config/config.test.ts:551` の「どちらにも無いとき、helmTargetBranchはundefinedになる」                                 |
| 実 `config/` | `config/yadokari-smoke-test-chart/anchor-app/config.yaml` と `.../tenant2/client2/config.yaml` に `helm` ブロックを足す（現在この2つには無い）                                                |
| 正典         | `docs/requirements.md:351` の「helm 自体は省略できるが、書くなら〜」とその前後の箇条書き、`docs/glossary.md`「Helmの向き先ブランチ」、`docs/smoke-test.md`（下の論点2）、`README.md` の設定例 |

## 解くべき論点

1. **GitLab側のフィクスチャに受け皿アンカーが無い（着手の前提条件）。**
   `helm.chart[].anchor` は values.yaml に**実在しないと設定エラー**になる
   （`verify-config.ts:203` がMR時点で検出、`lib/helm.ts` の `getRequiredValueAtAnchor()` が
   実行時に throw）。`config/` に `helm` を足すには、GitLab の `yadokari-smoke-test-chart` の
   `charts/anchor-app/values.yaml` と `charts/smoke-tenant2/client2/values.yaml` に
   向き先ブランチ用のアンカーを追加する必要がある。**これは外部への書き込みなので
   ユーザー承認が要る**。`scripts/smoke/smoke-fixture.ts` で追加するのか手で入れるのかも決める
2. **スモークシナリオが1つ消える。** `tenant2/client2` は
   「複数appのimage tag更新のみを検証するclient（Helm向き先ブランチは持たない）」として
   置かれている（`config.yaml` の1行目コメント、`docs/smoke-test.md`）。`helm` 必須化で
   この区別が作れなくなるので、`docs/smoke-test.md` の検証シナリオをどう組み直すかを決める
3. **`build-plans.ts:78` の分岐が消えたあとの形。** 現在は `helmTargetBranch` の有無で
   `stageHelmTargetBranchUpdates()` を呼ぶか決めている。必須化すると常に呼ぶことになるので、
   `docs/architecture.md`「Helmの向き先ブランチはapp単位に振り分けず設定ユニット単位で持つ」節の
   記述と食い違わないか確認する
4. **`docs/coding-standards.md`「許容する `undefined`」との整合。** 今の
   `helmTargetBranch: ... | undefined` は「外部の世界の『無い』を写したもの」として許容側に
   分類されていた。必須化するとこの `undefined` は**構造的に発生しなくなる**ので消せる。
   規約自体は変えない（分類が変わるだけ）

## やること

1. 論点1をユーザーと決め、**GitLab側のアンカー追加を先に済ませる**。ここが済むまで
   `config/` に `helm` を足すとCIの `validate-config-remote` が落ちる
2. スキーマ・型・結合・本体・実在チェックの順に `undefined` を消す
3. 実 `config/` の2ファイルに `helm` を足す
4. テストを追随させる。**「どちらにも無いとき undefined になる」テストは削除ではなく
   「`helm` が無いと設定エラーになる」テストに置き換える**（`docs/coding-standards.md`
   「消すかどうか」）
5. 正典（`docs/requirements.md` 4.4節・`docs/glossary.md`・`docs/smoke-test.md`・`README.md`）を追随させる
6. 論点2でスモークシナリオを組み直したら `docs/smoke-test.md` に反映する

## 完了条件

- `grep -rn "helmTargetBranch.*| undefined" src` が **0件**
- `helm` を書いていない `config.yaml` を読ませると `loadConfig()` が設定エラーになることを
  テストで示す（テスト名を `evidence` に書く）
- `pnpm lint:validate-config` が実 `config/` に対して成功する（出力を `evidence` に書く）
- `pnpm lint:validate-config:remote` が成功する（**GitLab側のアンカー追加が済んでいること**の
  確認を兼ねる。出力を `evidence` に書く）
- `pnpm check` が通る（テスト件数を `evidence` に書く。テストの置き換えがあるので
  件数が変わってよいが、増減の理由を `evidence` に書く）

## 注意

- **GitLabの `yadokari-smoke-test-chart` への書き込みはユーザー承認が要る**。
  勝手に実行しない（`CLAUDE.md`「進捗管理とHandoff」）
- **`/loop /next-task` に載せない**（外部への書き込みの承認と、論点2の判断を含むため）
- `apps` 側の扱いは変えない（`apps` が0件なら `SKIPPED` のまま）
- `helm.chart[]` が全アプリの全 `valuesPath` をカバーする規則も変えない
- `docs/history/` は触らない

**dependencies**: なし

**difficulty**: opus

**evidence**: **コード側は完了、GitLabへの反映だけ未実施**（`.env` がリポジトリに無く、外部書き込みはユーザーが実行する）。`helm: HelmSchema.optional()` を必須にし、`ChartAndApps.helmTargetBranch` から `| undefined` を除去（`grep -rn helmTargetBranch src scripts | grep undefined` が0件）。`resolveHelmTargetBranch()`・`build-plans.ts` の三項演算子・`remote-existence.ts` の `!== undefined` 分岐も削除。論点1は `smoke-fixture.ts` の `SEED_FILES` で自動化（`charts/anchor-app/values.yaml` を新たに対象に加えた。これまで手動管理だったので `docs/smoke-test.md` の記述も更新）。論点2は**シナリオを維持できた** — `client2`・`anchor-app` のシード値を `HELM_TARGET_BRANCH` と同値にして差分なしにし、`client1` だけ `main` のままにした。**当初は `anchorAppHelmTargetBranch` という新規アンカーを作る想定だったが、ユーザーが実物を確認したところ `charts/anchor-app/values.yaml` には既に `&smokeTestTargetBranch release/2025-q4` があり、`&helmVersion develop` という別のアンカーも同居していた**。新規作成をやめて既存の `smokeTestTargetBranch` を使う形に変更し、`helmVersion`（このツールが読み書きしない）はシード内容に含めて上書きで消えないようにした。`config/` の全 `anchor` 8件に seed 側の受け皿があることを突き合わせで確認。テストは385件で増減なし（「どちらにも無いとき undefined になる」を「helm自体が無いとき例外をスローする」に1対1で置き換え）。`test/main.e2e.test.ts` の values.yaml フィクスチャにも向き先ブランチのアンカーが要る（無いと `PARTIAL_FAILURE` になる）。`pnpm lint:validate-config` は `config OK: 3 設定ユニット, 5 apps (config)`、`pnpm check` 通過（33ファイル385テスト）。**GitLabへの反映も完了**（2026-09-10、ユーザー承認のうえ実行）。`smoke-fixture.ts setup --apply` が3ファイル（`charts/anchor-app/values.yaml`・`charts/smoke-tenant2/client1/values.yaml`・`charts/smoke-tenant2/client2/values.yaml`）を update。`anchor-app` の実変更は `smokeTestTargetBranch` の `release/2025-q4` → `release/2026-q1` の1行のみで、`helmVersion` と `tenantId1client1AppsVersion` は現状と同値だった。`pnpm lint:validate-config:remote` が `config OK（実在チェック）: projectId・ブランチ・valuesPath・アンカーをすべて確認 (https://gitlab.com)` を出して**全完了条件を満たした**。

## T-181

**タスク**: `loadChartAndApps()` の `unitDirPath` をやめ、`configYamlPath` を受け取る形にする。

## 背景

ユーザーから「`unitDirPath` は string で型がないし `unitPath` との違いがわからない。
`registryYamlPath` も string で型がない。いろいろよくわからん」という指摘があった
（2026-09-10）。調べた結果、**型が無いのは規約どおり**（ローカルのファイルパスは
リポジトリ全体で素の `string`）だが、**引数の設計は改善できる**ことが分かった。

`src/lib/config/chart-and-apps.ts` の `loadChartAndApps()` は6つの位置引数を持ち、
そのうち3つがパスっぽい `string`:

```ts
export function loadChartAndApps(
  unitDirPath: string, // config/<chartDir>/<unitPath> というローカルのディレクトリ
  chartDirName: ChartDirName,
  unitPath: ConfigUnitPath, // config/<chartDir>/ からの相対パス（ドメインの識別子）
  chart: ChartRepoConfig,
  appSpecs: readonly AppSpec[],
  registryYamlPath: string,
): ChartAndApps
```

問題は `unitDirPath` と `unitPath` が**見た目の双子**なのに別物であること。前者は
ローカルの実ファイルパス、後者はログ・`TARGET_UNITS`・固定ブランチ名に使う識別子で、
`unitDirPath = join(configDirPath, chartDirName, unitPath)` という包含関係にある。

**`unitDirPath` は関数内で1箇所でしか使われていない**（`grep -n "unitDirPath"` で実測）:

```ts
const configYamlPath = join(unitDirPath, CONFIG_YAML_FILE_NAME) // 35行目。ここだけ
```

つまりこの関数はディレクトリを必要としておらず、`config.yaml` のパスが欲しいだけ。

## やること

1. `unitDirPath: string` を `configYamlPath: string` に置き換え、関数内の
   `join(unitDirPath, CONFIG_YAML_FILE_NAME)` を消す
2. **`configYamlPath` と `registryYamlPath` を引数リストで隣接させる**。どちらも
   「パースした値の出どころのYAMLファイル」で、どちらも `resolveProjectLinkage()` の
   エラーメッセージに使われる（`src/lib/config/validate.ts:41,46`）。役割が同じものを並べる
3. 呼び出し元 `src/lib/config/config.ts` の `listUnitChartAndApps()`（193行目付近）で
   `join(chartUnits.chartDirPath, unitPath, CONFIG_YAML_FILE_NAME)` を組み立てて渡す
4. `loadChartAndApps()` のJSDocに、**`unitPath` は識別子・`*YamlPath` はローカルのファイルパス**
   という区別を1行足す（コードから読み取れないため）

## 完了条件

- `grep -rn "unitDirPath" src scripts test` が **0件**
- `src/lib/config/chart-and-apps.ts` に `join(` が残っていない（`node:path` の import も消える）
- 引数リストで `configYamlPath` と `registryYamlPath` が隣接している
- `pnpm check` が通る（テスト件数を `evidence` に書く。**挙動は変えないので385件から変わらないはず**）
- `pnpm lint:validate-config` が `config OK: 3 設定ユニット, 5 apps (config)` を出す

## 注意

- **挙動は変えない**（引数の形と組み立て場所だけの変更）
- `resolveHelmTargetBranch()` の `configYamlPath` 引数はそのまま
- ブランド型の導入は別タスク。ここでは `string` のまま
- `/loop /next-task` に載せてよい

**dependencies**: なし

**difficulty**: sonnet

**evidence**: `loadChartAndApps()` の引数を `(chartDirName, unitPath, chart, appSpecs, configYamlPath, registryYamlPath)` に変更。`unitDirPath` は `join()` のためだけに存在していた（使用箇所1つ）ので消し、組み立てを呼び出し元 `config.ts` の `listUnitChartAndApps()` へ寄せた。引数は「識別子（chartDirName・unitPath）→ データ（chart・appSpecs）→ 出どころのパス（configYamlPath・registryYamlPath）」の3グループに並ぶ。`chart-and-apps.ts` から `node:path` の import が消え、path結合が0件になった（残る `join(` は `Array.prototype.join`）。`grep -rn unitDirPath src scripts test` は0件。`pnpm lint:validate-config` は `config OK: 3 設定ユニット, 5 apps (config)`。`pnpm check` 通過（33ファイル385テスト、引数の形だけの変更なので着手前と同数が正しい）。

## T-182

**タスク**: ローカルのファイルシステムパスをブランド型（`LocalPath`）にする。

## 背景

ユーザー指摘（2026-09-10）「ファイルパスなら Path とか使えない?」を受けて調査した結果、
**正典の基準に照らして該当することが実証できた**。

`docs/architecture.md`「ブランド型にするのは「同じ`string`の別物と取り違えうる識別子」」の
基準は「その値が別の識別子と**同じ型の式に並ぶ**か」。ローカルのパスはこれに該当する:

- `join(chartUnits.chartDirPath, unitPath)` … ローカルのパスと `ConfigUnitPath` が同じ式に並ぶ
- **今は `ConfigUnitPath` を素の `string` 引数に渡してもコンパイルが通る**
  （ブランド型は `string` に代入可能なため）。実際に最小再現で確認済み。
  これは `unitPath` と `unitDirPath` の取り違えが型で止まらないということ

`src/utils/` は `types/` を一切 import していない（`grep -rn "^import" src/utils/*.ts` で
`types/` への参照0件）。ブランド型は `string` に代入可能なので、
`parseYamlFile(filePath: string)` などの**汎用ユーティリティ側は無改修で通る**。

## 解くべき論点

1. **1つのブランドか、パスの種類ごとに分けるか。** 正典が「数を増やすほどブランド型の定義は
   重くなる」と言っているので**1つ**を推す。`configYamlPath` と `registryYamlPath` の
   取り違えは、前段タスクで引数を隣接させ役割を揃えたことで読みやすさ側で解決している
2. **名前。** `FilePath` はディレクトリも含むため誤解を招く。`LocalPath` なら
   `ValuesPath`（GitLab上のchart内パス）との対比が名前に出る。他の候補は `FsPath`
3. **`src/utils/` の引数を `string` のまま据え置くか。** 据え置きを推す
   （`utils/` はドメイン知識・型を持たない。CLAUDE.md 原則2）

## やること

1. `src/types/brand.ts` に `LocalPath` と `toLocalPath()` を足す。JSDocに
   **`ValuesPath`（GitLab上のパス）・`ConfigUnitPath`（識別子）との違い**を書く
2. ローカルのパスを表す宣言を `LocalPath` にする（着手時に再計測すること。登録時点の実測）:
   - `src/lib/env.ts`: `EnvConfig.configDirPath`、`parseConfigDirPath()` の戻り値
   - `src/lib/config/config.ts`: `loadConfig()` の第1引数、`ChartUnits.chartDirPath`、
     `findUnitPaths()`・`collectUnitSegments()` の引数、`registryYamlPath`
   - `src/lib/config/chart-and-apps.ts`: `configYamlPath` / `registryYamlPath`
   - `src/lib/config/validate.ts`: `configYamlPath` / `registryYamlPath` / `filePath`（2箇所）
   - `scripts/lint/validate-config.ts`: コマンドライン引数から作る `configDirPath`
3. **`src/utils/fs.ts`・`src/utils/yaml.ts` の引数は `string` のまま据え置く**（論点3）
4. `docs/architecture.md`「ブランド型にするのは〜」の節に、
   **ローカルのファイルパスはブランド型にする／GitLab上のパスとは別の型である**ことを追記する

## ⚠️ 取り違えてはいけないもの（GitLab側のパスであってローカルではない）

- `scripts/smoke/smoke-fixture.ts` の `fileExists(filePath: string)` と `SEED_FILES` のキー …
  **chartリポジトリ内のパス**。`LocalPath` にしない
- `ValuesPath` … chart内の `values.yaml` の相対パス。既にブランド型があるので触らない
- `scripts/lint/remote-existence/` が扱う `valuesPath` … 同上

判断の軸は「`readFileSync`・`existsSync`・`readdirSync` に渡るか（＝ローカル）」と
「GitLab APIに渡るか（＝リモート）」。

## 完了条件

- `LocalPath` を素の `string` 引数に渡す箇所が残っていない
  （`pnpm check` の `tsc --noEmit` が通ることで担保）
- **型の穴が塞がったことを実証する**: `loadConfig()` に `ConfigUnitPath` を渡すコードが
  `tsc` でエラーになることを確認し、エラーコード（`TS2345` 等）を `evidence` に書く
- `src/utils/` の `dirPath` / `filePath` / `inputPath` の引数が `string` のままである
- `grep -rn "LocalPath" scripts/smoke/` が **0件**（GitLab側のパスに付けていないこと）
- `pnpm check` が通る（テスト件数を `evidence` に書く。**挙動は変えないので変わらないはず**）
- `pnpm lint:validate-config` が `config OK: 3 設定ユニット, 5 apps (config)` を出す

## 注意

- 挙動は変えない（型だけの変更）
- `as` キャストを使わない。生成は `toLocalPath()` の factory 関数に封じ込める（CLAUDE.md）
- `docs/history/` は触らない
- `/loop /next-task` に載せてよい

**dependencies**: T-181

**difficulty**: sonnet

**evidence**: `LocalPath` / `toLocalPath()` を `src/types/brand.ts` に追加し、ローカルのパスを表す宣言（`env.ts` 2件・`config.ts` 6件・`chart-and-apps.ts` 3件・`validate.ts` 4件・`scripts/lint/validate-config.ts` 1件）を揃えた。**型の穴が塞がったことをメイン側でも独自に実証**: `loadConfig(toConfigUnitPath("tenant2/client1"))` を書くと `TS2345: Argument of type 'ConfigUnitPath' is not assignable to parameter of type 'LocalPath'.`（検証後にファイルは削除、`tsc --noEmit` は exit 0）。着手前はこれがコンパイルを通っていた。据え置きは論点どおり: `src/utils/fs.ts`・`yaml.ts` の引数は `string` のまま（原則2）、`scripts/smoke/` はGitLab側のパスなので `grep -rn LocalPath scripts/smoke/` が0件。`git diff --stat -- src/utils scripts/smoke` も0行。受け入れ時に**正典の追随漏れを1件修正**: `docs/architecture.md`「型の置き場所は`src/`全件と突き合わせて確かめてある」の件数が53件（`brand.ts` 12）のままだったので54件（13）に更新。`pnpm check` 通過（33ファイル385テスト、型だけの変更なので着手前と同数が正しい）。

## T-183

**タスク**:

## 背景

`src/lib/config/config.ts` は207行あり、`docs/architecture.md`「各ファイルの責務」の `src/lib/` の
表でも責務が「公開API `loadConfig()`。`config/` の走査（設定ユニットの探索と階層の検証）と
絞り込み」と**「〜と〜」の形**で書かれている。実際、非公開ヘルパーが2グループに割れている:

- 走査側: `findUnitPaths()` / `collectUnitSegments()` / `findNestedPair()` / `isPrefixOf()` と型 `UnitSegments`
- 入口・絞り込み側: `loadConfig()` / `formatChartDirs()` / `listUnitChartAndApps()` /
  `isExplicitlyTargeted()` と `DEFAULT_CONFIG_DIR_PATH` / `ConfigTarget` / `NO_TARGET` / `ChartUnits`

`docs/architecture.md`「1ファイルにまとめるか分けるか」の**分ける合図**のうち、①責務を「〜と〜」で
しか説明できない ②変更理由が別（階層ルールの変更 vs `TARGET_CHART`/`TARGET_UNITS` の仕様変更）
③非公開ヘルパーが2グループに割れている ⑤200行超 の**4つが該当する**。
④「依存が違う」は**該当しない**（`loadConfig()` 自身も `listSubdirectories()` と `existsSync()` を
使うため、fs依存は両側にある）。④が無くても①②③⑤で分割の根拠は足りている。

## 解くべき論点

- `unit-scan.ts` の公開は `findUnitPaths()` 1つで足りるか（階層検証のエラー生成まで含めて
  非公開に保てるか）
- `MAX_UNIT_DEPTH` / `UNIT_PATH_SEPARATOR`（`src/domain/config-unit.ts`）と
  `CONFIG_YAML_FILE_NAME` / `REGISTRY_YAML_FILE_NAME`（`src/lib/config/schema.ts`）の import が
  分割後にどちら側へ要るか（両方に要るものと片方だけのものがある）

## やること

1. `src/lib/config/unit-scan.ts` を新設し、`findUnitPaths()`（公開）と `collectUnitSegments()` /
   `findNestedPair()` / `isPrefixOf()` / 型 `UnitSegments`（いずれも非公開のまま）を移す。
   **ファイル名は `unit-scan.ts` で確定**（ユーザー確認済み。`helpers.ts` のような置き場所名を
   避け、「設定ユニットの走査」という概念名にしたもの）
2. `config.ts` は `unit-scan.js` から `findUnitPaths` を import して使う形にする。残るのは
   `DEFAULT_CONFIG_DIR_PATH` / `ConfigTarget` / `NO_TARGET` / `ChartUnits` / `loadConfig()` /
   `formatChartDirs()` / `listUnitChartAndApps()` / `isExplicitlyTargeted()`
3. 関数の並び順は「外から使うもの → その内部で使うもの」を両ファイルで保つ。テストのためだけの
   `export` はしない
4. JSDocは移動先へそのまま持っていく。移動によって記述が実物とズレる箇所
   （例: `chart-and-apps.ts` の「どのディレクトリが設定ユニットかは`config.ts`の走査が決める」）を
   実物に合わせて直す
5. `docs/architecture.md`「各ファイルの責務」の `src/lib/` の表に `config/unit-scan.ts` の行を足し、
   `config/config.ts` の行から走査の記述を外す
6. **調べた結果、分割するとテストの書き換えが必要になると分かった場合は分割の仕方を疑う。**
   それでも避けられないなら、やらずに理由を `evidence` に書いて閉じる

## 完了条件

- `src/lib/config/unit-scan.ts` が存在し、`export` しているのは `findUnitPaths` だけ
- `src/lib/config/config.ts` が200行以下
- `test/` 配下に一切変更が無い（`git diff --stat test/` の出力が空）
- `docs/architecture.md` の `src/lib/` の責務表に `config/unit-scan.ts` の行がある
- `pnpm check` が通り、**テスト件数が変更前と同じ**

## 注意

- **振る舞いは一切変えない。エラーメッセージの文言も1文字も変えない**
  （`test/lib/config/config.test.ts` に `toThrow` が23件あり、メッセージを検証している）
- `listUnitChartAndApps()` は走査ではなく「絞り込み＋`registry.yaml` の読み込み」なので
  `config.ts` に残す
- 案2（`resolveProjectLinkage` を `validate.ts` から `chart-and-apps.ts` へ移す）と
  案3（`loadChartAndApps()` の6引数をスコープ別の2オブジェクトにまとめる）は**今回のスコープ外**。
  同じ `src/lib/config/` 配下だが手を出さない
- push はしない

**difficulty**: sonnet

**evidence**: `src/lib/config/unit-scan.ts`（77行、`export` は `findUnitPaths` のみ）へ切り出し、`config.ts` は 207行→138行。`git diff --stat test/` は空（テスト無変更）。
`pnpm check` 通過: 33 Test Files / 385 Tests（変更前と同数）。

## T-184

**タスク**:

## 背景

`src/lib/config/config.ts`（138行）は、公開API `loadConfig()` が全体の流れを語れていない。

- `TARGET_CHART` / `TARGET_UNITS` の扱いが**4箇所に散っている**: chartディレクトリの絞り込み
  （`config.ts:56-62`）、`TARGET_UNITS` の不一致検証（`:79-86`）、実際のunit絞り込み（`:122`。
  しかも `listUnitChartAndApps()` の中に埋まっている）、絞り込み結果0件のエラー（`:92`）
- 主役である「YAMLを読んで結合する」が `loadConfig()` → `listUnitChartAndApps()` →
  `loadChartAndApps()` と**2段潜った先**にある
- chartDir → unit → app の3重ループに、読み込みと検証が交互に挟まっている

「走査 → 絞り込み → 読み込み・結合 → 横断検証」という塊は実在するのに、入れ子に溶けていて
入口から見えない。**ファイル数は増やさず**（`src/lib/config/` は5ファイルのまま）、
`loadConfig()` を「名前の付いた段を順に呼ぶだけ」の薄い入口にする。`src/main.ts` の
`runProcess()` が `src/steps/` を順に呼ぶだけなのと同じ形にする。

## 解くべき論点

- 各段の関数名（下の目標の形の名前は仮。既存の命名規約に合わせて詰める）
- `registry.yaml` が無いchartディレクトリを配下ごと無視する判定（`config.ts:71`）を
  どの段に置くか（走査の一部か、chartディレクトリの選択の一部か）
- 0件エラー（`isExplicitlyTargeted()` + `:92`）を独立した段にするか、絞り込みの段に含めるか

## やること

1. `loadConfig()` を次の形に組み替える（**関数名は仮。実装時に詰めてよい**）:

```ts
export function loadConfig(configDirPath: LocalPath, target: ConfigTarget = NO_TARGET): Config {
  assertSafePath(configDirPath, "CONFIG_PATH")
  const chartDirs = selectChartDirs(listSubdirectories(configDirPath), target) // TARGET_CHART
  const chartUnitsList = chartDirs.flatMap((dir) => scanChartDir(configDirPath, dir)) // 走査＋階層検証
  const selected = selectTargetUnits(chartUnitsList, target) // TARGET_UNITS
  const chartAndAppsList = selected.flatMap(loadUnitChartAndApps) // 読み込み＋結合
  validateTagFormatConsistency(chartAndAppsList) // 横断検証
  assertTargetMatched(target, chartAndAppsList) // 0件エラー
  return { chartAndAppsList }
}
```

2. `listUnitChartAndApps()` を `config.ts` から `src/lib/config/chart-and-apps.ts` へ移す
   （`registry.yaml` の読み込みと結合はそのファイルの責務のため）。移すのは読み込み・結合の
   部分だけで、**その中に埋まっている `TARGET_UNITS` の絞り込み（`:122` の `.filter()`）は
   絞り込みの段へ引き上げる**
3. `unit-scan.ts`（T-183で切り出した走査）はパイプラインの1段目としてそのまま残す
4. `ConfigTarget` 型・`NO_TARGET`・`DEFAULT_CONFIG_DIR_PATH` は `config.ts` に置いたままにする
5. `loadConfig()` のJSDocは、段の並びが読めば分かるようになった分だけ削る。**残すのは
   コードから読み取れないことだけ**（`docs/coding-standards.md`「コメント」）。
   特に「`target` 未指定時は0件でもエラーにしない」「registry.yaml のないディレクトリは
   配下ごと無視する」のような**分岐の意図**は残す
6. `docs/architecture.md`「各ファイルの責務」の `src/lib/` の表で、`config/config.ts` と
   `config/chart-and-apps.ts` の行が実物とズレたら直す

## 完了条件

- `loadConfig()` の本体（`{` から `}` まで）が**10行以内**で、各行が名前の付いた段の呼び出しに
  なっている
- `src/lib/config/` のファイル数が**5のまま**（`config.ts` / `unit-scan.ts` / `chart-and-apps.ts` /
  `schema.ts` / `validate.ts`。新規ファイルを作らない）
- `listUnitChartAndApps()` 相当が `chart-and-apps.ts` にあり、`config.ts` から消えている
- `test/` 配下に一切変更が無い（`git diff --stat test/` の出力が空）
- `pnpm check` が通り、**テスト件数が385件のまま**

## 注意

- **振る舞いは一切変えない。エラーメッセージの文言も1文字も変えない**
  （`test/lib/config/config.test.ts` に `toThrow` が23件ある）
- **最重要の落とし穴: 走査の順序を変えないこと。** いまは `TARGET_CHART` で絞り込んだ
  chartディレクトリ**だけ**を走査する。「全chartディレクトリを走査してから絞り込む」形に
  組み替えてはいけない。無関係なchartディレクトリの階層エラー（深さ違い・入れ子）で
  `TARGET_CHART` による限定実行が落ちるようになり、`docs/architecture.md`
  「設定ユニットの走査は深さで打ち切らず、絞り込みより先に階層を検証する」の意図に反する。
  **この違反は既存テストでは検出できない**ので、自分で順序を確認すること
- 逆に、**`TARGET_UNITS` の絞り込みより前に階層を検証する**現在の順序も変えない
  （同じ節が根拠。対象外の設定ユニットも含めて階層を検証する）
- `config.yaml` の読み込みは絞り込んだ**後**だけに行う現在の挙動も変えない
- 案B（`select-units.ts` を新設して `TARGET_*` を別ファイルにする）は**採用しない**。
  ファイルを増やさないことが今回の要件
- push はしない

**difficulty**: sonnet

**evidence**: `loadConfig()` の本体が9行の段の並びになり、`listUnitChartAndApps()` は `chart-and-apps.ts` へ移設（`loadUnitChartAndApps()`）。ファイルは5のまま。
`pnpm check` 通過: 33 Test Files / 385 Tests（変更前と同数）、`test/` は無変更。
走査順序（TARGET_CHART で絞ってから走査）は、壊れた兄弟chartディレクトリを置いた使い捨てconfigで変更前後の挙動が一致することを実行して確認した。

## T-185

**タスク**:

## 背景

T-184 で `loadConfig()` の本体は9行の段の並びになったが、**`src/lib/config/config.ts` 自体は
138行→140行と増えた**。中身を数えると3グループに割れている:

- 公開APIの表面（`DEFAULT_CONFIG_DIR_PATH` / `ConfigTarget` / `NO_TARGET` / `loadConfig`）— 約40行
- **`TARGET_*` の解釈**（`selectChartDirs` / `selectTargetUnits` / `assertTargetMatched` /
  `isExplicitlyTargeted` / `formatChartDirs`）— **非公開ヘルパー6つ中5つ、約65行**
- 走査の呼び出し（`scanChartDir`）— 約11行

入口を名乗るファイルの約7割が `TARGET_*` の解釈になっている。T-184 のタスク化時に
`select-units.ts` の新設（当時の「案B」）を「ファイルを増やしたくない」という理由で見送ったのが
判断ミスで、`TARGET_*` の解釈は入口の都合ではなくそれ自体が1つの塊だった。

根拠は `docs/architecture.md`「1ファイルにまとめるか分けるか」の**分ける合図**①（責務を
「入口と `TARGET_*` の解釈と走査の呼び出し」でしか説明できない）と③（非公開ヘルパーが
2グループに割れている）。**⑤（200行超）は該当しない**（140行）。行数は分ける理由ではない。

## 解くべき論点

- `unit-scan.ts` の公開が `findUnitPaths()` と `scanChartDir()` の2つになるか、`scanChartDir()`
  だけにして `findUnitPaths()` を非公開に降格できるか（`findUnitPaths()` の他の呼び出し元を
  確認して決める）
- `select-units.ts` の3つの公開関数（`selectChartDirs` / `selectTargetUnits` /
  `assertTargetMatched`）を、この粒度のまま公開するか

## やること

1. **`scanChartDir()` を `config.ts` から `src/lib/config/unit-scan.ts` へ移す。**
   `registry.yaml` の有無を見て `findUnitPaths()` を呼び `ChartUnits` を作る、走査そのもの
2. **`ChartUnits` 型を `chart-and-apps.ts` から `unit-scan.ts` へ移す。** T-184 では消費側に
   置いたが、`scanChartDir()` が来るなら `unit-scan.ts` が生産側になる。`chart-and-apps.ts` は
   `import type` で参照する
3. **`src/lib/config/select-units.ts` を新設**し、`TARGET_*` の解釈を移す:
   `selectChartDirs` / `selectTargetUnits` / `assertTargetMatched`（公開）と
   `isExplicitlyTargeted` / `formatChartDirs`（非公開のまま）
4. **`ConfigTarget` 型と `NO_TARGET` も `select-units.ts` へ移す**（`ConfigTarget` は `export`、
   `NO_TARGET` も `config.ts` が既定値に使うので `export`）。`ConfigTarget` が表しているのは
   `TARGET_*` そのものなので、型の置き場所も構成で決める（CLAUDE.md 原則5）。
   `config.ts` は両方を `import` する
5. `config.ts` に残るのは `DEFAULT_CONFIG_DIR_PATH` と `loadConfig()` だけにする
6. `docs/architecture.md`「各ファイルの責務」の `src/lib/` の表に `config/select-units.ts` の行を
   足し、`config/config.ts`・`config/unit-scan.ts`・`config/chart-and-apps.ts` の行を実物に合わせる

## 完了条件

- `src/lib/config/` が**6ファイル**（`config.ts` / `select-units.ts` / `unit-scan.ts` /
  `chart-and-apps.ts` / `schema.ts` / `validate.ts`）
- `src/lib/config/config.ts` が**50行以下**で、`loadConfig()` と `DEFAULT_CONFIG_DIR_PATH` 以外の
  トップレベル定義を持たない
- `test/` 配下に一切変更が無い（`git diff --stat test/` の出力が空）
- `docs/architecture.md` の `src/lib/` の責務表に `config/select-units.ts` の行がある
- `pnpm check` が通り、**テスト件数が385件のまま**

## 注意

- **振る舞いは一切変えない。エラーメッセージの文言も1文字も変えない**
  （`test/lib/config/config.test.ts` に `toThrow` が23件ある）
- **走査の順序を変えないこと。** `loadConfig()` は `selectChartDirs()` で絞り込んだ結果に対して
  だけ `scanChartDir()` を呼ぶ。`scanChartDir()` が `unit-scan.ts` へ移っても、
  **絞り込み前の全chartディレクトリを走査する形にしてはいけない**（無関係なchartの階層エラーで
  `TARGET_CHART` の限定実行が落ちる）。`docs/architecture.md`「設定ユニットの走査は深さで
  打ち切らず、絞り込みより先に階層を検証する」が根拠。**既存テストでは検出できない**
- `loadConfig()` の本体（段の並び）そのものは T-184 の形を保つ。今回はトップレベル定義の
  引っ越しだけで、パイプラインの構造は変えない
- push はしない

**difficulty**: sonnet

**evidence**: `config.ts` は 140行→**36行**（`DEFAULT_CONFIG_DIR_PATH` と `loadConfig()` のみ）。`select-units.ts`(86行) を新設し、`scanChartDir()` と `ChartUnits` は `unit-scan.ts`(102行) へ。`findUnitPaths()` は非公開に降格。
`pnpm check` 通過: 33 Test Files / 385 Tests（変更前と同数）、`test/` は無変更。
走査順序は使い捨てconfigでの実行で変更前後の一致を確認（T-184と同じ手順）。

## T-186

**タスク**:

## 背景

`src/lib/config/` の3ファイルは、**名前が中身を説明できていない**（ユーザーが「ファイル名から
何をするのか分かりづらい」と指摘）:

- `unit-scan.ts` — 公開関数は `scanChartDir()`。**ファイル名は「unit」、関数名は「chartDir」**で
  語が食い違い、名前から関数にたどり着けない。加えて「走査」は木を降りる**やり方**の話で、
  欲しい結果（設定ユニットがどこにあるか）を言っていない
- `select-units.ts` — 公開は `selectChartDirs` / `selectTargetUnits` / `assertTargetMatched` の3つ。
  **名前は「units を select」だが、実際は chartDirs も select し、0件検出もする**
- `chart-and-apps.ts` — **動詞がない**。名詞対でデータの入れ物のように読めるが、実際は
  「2つのYAMLを読んで `projectId` で結合する」という動作

改名の指針は**「機構ではなく、何が手に入るか」**。`src/steps/` が既に「ファイル名＝公開関数名の
ケバブケースで動詞始まり」（`filter-targets.ts`→`filterTargets()`、`build-plans.ts`、
`resolve-latest-tags.ts` 等）で統一されている前例に合わせる。

## 解くべき論点

- `unit-scan.ts` が持つ型 `ChartUnits` の名前を変えるかどうか（ファイル名が
  `find-config-units.ts` になるため。変えないなら理由を `evidence` に一言残す）
- `docs/architecture.md` の「`chart-and-apps.ts`（ファイル名）→ 変えない」の行を、
  どう書き換えれば当時の判断と矛盾しない形になるか

## やること

1. **3ファイルを改名し、公開関数名も揃える**:
   - `src/lib/config/unit-scan.ts` → `src/lib/config/find-config-units.ts`。
     公開関数 `scanChartDir()` → `findConfigUnits()`
   - `src/lib/config/select-units.ts` → `src/lib/config/limit-to-target.ts`。
     **関数名はそのまま**（`selectChartDirs` / `selectTargetUnits` / `assertTargetMatched`）
   - `src/lib/config/chart-and-apps.ts` → `src/lib/config/load-chart-and-apps.ts`。
     公開 `loadUnitChartAndApps()` → `loadChartAndApps()`、
     今その名前を持つ非公開関数 → `buildChartAndApps()`
2. **`git mv` を使って改名する**（履歴を残すため。新規作成＋削除にしない）
3. 参照元の import と、コード内のJSDoc・コメントに書かれた旧ファイル名を実物に合わせる。
   旧名が残っている `src/lib/config/schema.ts` のJSDoc（「`config.ts`・`chart-and-apps.ts`から
   参照する」）も対象
4. **`docs/architecture.md` の「`lib/config/chart-and-apps.ts`（ファイル名）→ 変えない」の行を
   書き換える**（812行目付近の表）。当時の理由は「YAMLのファイル名が `registry.yaml` に
   変わってもコード側は追随しない」で、今回の「動詞が無くて何をするか読めない」とは**別の論点**。
   矛盾を残さないよう、新しい理由で書き換える
5. `docs/` 内の旧ファイル名の参照を実物に合わせる（`docs/history/` を除いて**8箇所**。
   内訳は `architecture.md` 6・`coding-standards.md` 1 ほか。`grep -rn` で洗い直すこと）
6. `docs/architecture.md`「各ファイルの責務」の `src/lib/` の表の3行を、新しい名前と
   「何をするか」の説明に更新する

## 完了条件

- `src/lib/config/` が6ファイルで、名前が `config.ts` / `limit-to-target.ts` /
  `find-config-units.ts` / `load-chart-and-apps.ts` / `schema.ts` / `validate.ts`
- `grep -rn "unit-scan\|select-units\|chart-and-apps" src test scripts docs README.md CLAUDE.md`
  の結果が **`docs/history/` 配下だけ**になる（`load-chart-and-apps` は別語なので誤検出に注意。
  `grep -rn "\bchart-and-apps\b"` 等で確かめる）
- `git log --follow --oneline src/lib/config/find-config-units.ts` が改名前の履歴をたどれる
  （`git mv` を使ったことの確認）
- `test/` 配下に一切変更が無い（`git diff --stat test/` の出力が空）
- `pnpm check` が通り、**テスト件数が385件のまま**

## 注意

- **これは改名だけのタスク。振る舞いは一切変えない**（エラーメッセージの文言、関数の中身、
  パイプラインの構造、走査の順序、すべて据え置き）
- **`docs/history/` 配下は書き換えない**（旧ファイル名が48箇所あるが、当時の記述として残す。
  `docs/workflow.md`・`docs/history/direction.md` 冒頭の運用）
- `filter-targets` という名前は**使わない**。`src/steps/filter-targets/` が「GitLab上で更新対象の
  chartを絞る」という別の意味で既に取っており、1つの語を2つの意味に使うことになる
- `test/` と `scripts/` からこの3ファイルへの参照は**ゼロ**（`loadConfig()` 経由のみ）なので、
  テストの書き換えは発生しない見込み。発生するなら改名の範囲を疑う
- push はしない

**difficulty**: sonnet

**evidence**: `unit-scan.ts`→`find-config-units.ts` / `select-units.ts`→`limit-to-target.ts` / `chart-and-apps.ts`→`load-chart-and-apps.ts`。`git diff --cached -M` が3件とも rename として検出（内容差分は名前の置換のみ、計41行）。
`pnpm check` 通過: 33 Test Files / 385 Tests、`test/` は無変更。旧名の残骸は `docs/history/` 以外ゼロ。
受け入れで `schema.ts` のJSDocが実物とズレていたのを修正（下記 progress.md 参照）。

## T-187

**タスク**:

## 背景

`src/` のコメント量は実測で **824/3194行 = 26%**（`scripts/` は 20%、`test/` は 3% なので
testは問題になっていない）。ルールが無いのではなく、`docs/coding-standards.md`「コメント」節が
既に「コードから読み取れないことだけを書く」「型名・フィールド名・関数名の言い換えは書かない」
「残すかどうかは長さではなく種類で決める」と定めている。**守られていないか、ルールが足りない**。

具体例（ユーザーが挙げたもの）: `src/lib/config/config.ts` の `loadConfig()` は**本体9行に対し
JSDoc 13行**。しかも T-184/T-185 で本体が名前の付いた段の並びになった結果、JSDocの一部が
本体の写しになっている（「`validateTagFormatConsistency()` も検証する」と書いてあるが、
本体にその呼び出し行がそのまま並んでいる）。

腐った実例もある: T-186 の受け入れで見つかった `src/lib/config/schema.ts` の
「`config.ts`・`chart-and-apps.ts`から参照する」は、T-185 で `config.ts` が `schema.ts` を
import しなくなった時点で**既に事実と違っていた**（grepで分かることをコメントに書くと腐る）。

ユーザーの要望は「**概要と Why / Why Not** は必要だが、実装の詳細を書きすぎでメンテコストが
大きい。プロフェッショナルなコメントの書き方を調べて反映してほしい」。
このタスクは**方針を決めて正典を書き換えるところまで**で、コードへの適用は T-188〜T-190 が行う。

## 解くべき論点

- 既存の正典は「今の挙動の制約・前提」「外部との対応関係」について**「必要なだけ長くてよい」**と
  明示している。ユーザーの要望（概要と Why / Why Not に絞る）とこれをどう折り合わせるか。
  **既存の判断を黙って上書きしない**。変えるなら理由を書き、変えないなら要望のどこが
  既存ルールで既に満たされているかを示す
- 長さの上限（行数）を置くか。正典は「数字を置くと、種類の基準の代わりにその数字が基準として
  使われる」として**意図的に置いていない**。この判断を維持するか覆すか
- JSDocの1行目（概要）をどこまで許すか。「型名・関数名の言い換えは書かない」と「概要を書く」は
  衝突しうる。`loadConfig()` のような**本体が自己説明的になった関数**で、概要は何を足すべきか
- 「Why Not（採らなかった案）」をコードに残すか `docs/architecture.md` へ送るか。正典は
  「昔の話は正典へ」としているが、Why Not は昔の話とは限らない
- 対象範囲。`test/`（3%）を外してよいか、`scripts/`（20%）を含めるか

## やること

1. **プロフェッショナルなコメント規約を一次情報で調べる**（`/research` スキルが使える）。
   TSDoc/JSDocの公式ガイダンス、広く参照される規約（例: Google TypeScript Style Guide の
   Comments/Documentation、Rust APIガイドラインのドキュメント章など）を当たり、
   **このリポジトリの既存ルールと突き合わせて差分だけを抽出する**。調査結果は
   `docs/research/` 配下にMarkdownで残す
2. 調べた内容と上の論点への答えを**ユーザーに提示して承認を得る**（正典の書き換えのため）
3. 承認後、`docs/coding-standards.md`「コメント」節を書き換える。**既存の3種類の表
   （制約・前提／外部との対応関係／昔の話）を捨てる前に、それぞれが新しい規約のどこに
   対応するかを確かめる**
4. T-188〜T-190 が機械的に適用できるよう、**節の末尾に「1コメントに1問だけ問うチェック」の
   形で判定手順を書く**（既存の節も「この段落はコードの今の挙動を説明しているか、昔の話か」と
   いう1問の形を持っている。その形を踏襲する）
5. 調べた結果、**既存ルールで既に十分だと分かった場合は正典を書き換えず**、その根拠を
   `evidence` に書いて閉じる。その場合 T-188〜T-190 は「既存ルールの適用」として進める

## 完了条件

- `docs/research/` 配下に調査結果のMarkdownがあり、参照した一次情報のURLが載っている
- `docs/coding-standards.md`「コメント」節に、T-188〜T-190 が機械的に適用できる判定手順がある
  （または、書き換えないと判断した根拠が `evidence` にある）
- 判定手順を `loadConfig()` のJSDoc（13行）に実際に当ててみて、**残る行と消える行が
  一意に決まる**ことを確認し、その結果を `evidence` に書く
- `pnpm check` が通る

## 注意

- **サブエージェントに委譲しない。** 正典の書き換えでユーザー承認が要り、`docs/workflow.md`
  「委譲しないケース」に当たる。`/loop` の自動進行にも載せない
- **このタスクではコードのコメントを1行も書き換えない**（適用は T-188〜T-190）
- 既存の正典の判断を覆すときは、`docs/architecture.md` の同種の記述と矛盾しないか確かめる
- push はしない

**difficulty**: opus

**evidence**: `docs/research/comment-conventions.md`（94行、一次情報3件のURL付き）と、書き換えた `docs/coding-standards.md`「コメント」節（30行→69行、小節4つ）。
判定手順を `loadConfig()` のJSDoc13行に適用: 全5段落で残す/消すが一意に決まり判定不能0件、**13行→4行**（消える10行は本体の行・呼び先JSDoc・戻り値の型の写し）。
`pnpm check` 通過: 385 Tests。`src/` は無変更（適用は T-188〜T-190）。

## T-188

**タスク**:

## 背景

`src/` のコメント量は実測で **824/3194行 = 26%**（`scripts/` は 20%、`test/` は 3% なので
testは問題になっていない）。ルールが無いのではなく、`docs/coding-standards.md`「コメント」節が
既に「コードから読み取れないことだけを書く」「型名・フィールド名・関数名の言い換えは書かない」
「残すかどうかは長さではなく種類で決める」と定めている。**守られていないか、ルールが足りない**。

具体例（ユーザーが挙げたもの）: `src/lib/config/config.ts` の `loadConfig()` は**本体9行に対し
JSDoc 13行**。しかも T-184/T-185 で本体が名前の付いた段の並びになった結果、JSDocの一部が
本体の写しになっている（「`validateTagFormatConsistency()` も検証する」と書いてあるが、
本体にその呼び出し行がそのまま並んでいる）。

腐った実例もある: T-186 の受け入れで見つかった `src/lib/config/schema.ts` の
「`config.ts`・`chart-and-apps.ts`から参照する」は、T-185 で `config.ts` が `schema.ts` を
import しなくなった時点で**既に事実と違っていた**（grepで分かることをコメントに書くと腐る）。

T-187 で `docs/coding-standards.md`「コメント」節の規約と判定手順が決まっている。
このタスクは**その判定手順を `src/lib/` に機械的に適用する**担当。
（実測: コメント 349/1296行 = 27%。`src/` の中で最大）

## 解くべき論点

- 判定手順を当てても残すか消すか決められないコメントが出たら、**自分で決めずに残し**、
  どのコメントで迷ったかを報告に列挙する（T-187 の判定手順の穴になるため）

## やること

1. **まず `docs/coding-standards.md`「コメント」節を読む**（T-187 が書き換えた後の版）。
   `sed -n '/^## コメント/,/^## /p' docs/coding-standards.md` で節だけ読む
2. `src/lib/` の各ファイルのコメントに判定手順を当て、消す・残す・正典へ移すを実行する
3. **正典へ移すものがあれば、先に正典の該当箇所を確認する**（既に書かれていれば消すだけ、
   無ければ `docs/architecture.md` 等に書いてから消す）。これは既存の正典の手順
4. コメントを消した結果、**コードの意図が読めなくなった箇所があれば消さずに残す**。
   判断に迷ったものは報告に列挙する
5. `src/lib/config/config.ts` の `loadConfig()` は**ユーザーが名指しした例**なので、
   ここが短くならないなら判定手順が効いていない。報告に改善後のJSDocを載せる

## 完了条件

- `src/lib/` のコメントが T-187 の判定手順に沿っている
- **振る舞いを一切変えていない**（`git diff` の変更がコメント行と空行のみであることを
  `git diff -U0 | grep '^[+-]' | grep -v '^[+-][+-]'` で確認し、コメント以外の行が
  出ないことを報告に書く）
- `test/` 配下に一切変更が無い（`git diff --stat test/` の出力が空）
- `pnpm check` が通り、**テスト件数が385件のまま**
- 削減した行数（変更前後のコメント行数）を報告に書く

## 注意

- **コードは1行も変えない。コメントの削除・短縮・正典への移動だけ**
- **消す前に正典を確認する**。経緯をコードから消すときの既存手順
- `docs/history/` 配下は書き換えない
- 判断に迷ったコメントは**消さずに残して報告する**（勝手に決めない）
- push はしない

**dependencies**: T-187

**difficulty**: sonnet

**evidence**: `src/lib/` のコメント 349行→334行（-15行）。`loadConfig()` は13行→4行で T-187 の想定どおり。変更は5ファイル（config.ts / find-config-units.ts / load-chart-and-apps.ts / gitlab.ts / batch-cache.ts）。
`git diff -U0 -- src/lib` の変更行がコメント行と空行のみであることを確認（コード行の変更0）。`pnpm check` 通過: 385 Tests、`test/` 無変更。
判定不能で残したコメントは0件。昔の話の残存も0件（受け入れ側でも grep で再確認）。

## T-189

**タスク**:

## 背景

`src/` のコメント量は実測で **824/3194行 = 26%**（`scripts/` は 20%、`test/` は 3% なので
testは問題になっていない）。ルールが無いのではなく、`docs/coding-standards.md`「コメント」節が
既に「コードから読み取れないことだけを書く」「型名・フィールド名・関数名の言い換えは書かない」
「残すかどうかは長さではなく種類で決める」と定めている。**守られていないか、ルールが足りない**。

具体例（ユーザーが挙げたもの）: `src/lib/config/config.ts` の `loadConfig()` は**本体9行に対し
JSDoc 13行**。しかも T-184/T-185 で本体が名前の付いた段の並びになった結果、JSDocの一部が
本体の写しになっている（「`validateTagFormatConsistency()` も検証する」と書いてあるが、
本体にその呼び出し行がそのまま並んでいる）。

腐った実例もある: T-186 の受け入れで見つかった `src/lib/config/schema.ts` の
「`config.ts`・`chart-and-apps.ts`から参照する」は、T-185 で `config.ts` が `schema.ts` を
import しなくなった時点で**既に事実と違っていた**（grepで分かることをコメントに書くと腐る）。

T-187 で `docs/coding-standards.md`「コメント」節の規約と判定手順が決まっている。
このタスクは**その判定手順を `src/steps/` に機械的に適用する**担当。
（実測: コメント 257/1057行 = 24%）

## 解くべき論点

- 判定手順を当てても残すか消すか決められないコメントが出たら、**自分で決めずに残し**、
  どのコメントで迷ったかを報告に列挙する（T-187 の判定手順の穴になるため）

## やること

1. **まず `docs/coding-standards.md`「コメント」節を読む**（T-187 が書き換えた後の版）。
   `sed -n '/^## コメント/,/^## /p' docs/coding-standards.md` で節だけ読む
2. `src/steps/` の各ファイルのコメントに判定手順を当て、消す・残す・正典へ移すを実行する
3. **正典へ移すものがあれば、先に正典の該当箇所を確認する**（既に書かれていれば消すだけ、
   無ければ `docs/architecture.md` 等に書いてから消す）。これは既存の正典の手順
4. コメントを消した結果、**コードの意図が読めなくなった箇所があれば消さずに残す**。
   判断に迷ったものは報告に列挙する

## 完了条件

- `src/steps/` のコメントが T-187 の判定手順に沿っている
- **振る舞いを一切変えていない**（`git diff` の変更がコメント行と空行のみであることを
  `git diff -U0 | grep '^[+-]' | grep -v '^[+-][+-]'` で確認し、コメント以外の行が
  出ないことを報告に書く）
- `test/` 配下に一切変更が無い（`git diff --stat test/` の出力が空）
- `pnpm check` が通り、**テスト件数が385件のまま**
- 削減した行数（変更前後のコメント行数）を報告に書く

## 注意

- **コードは1行も変えない。コメントの削除・短縮・正典への移動だけ**
- **消す前に正典を確認する**。経緯をコードから消すときの既存手順
- `docs/history/` 配下は書き換えない
- 判断に迷ったコメントは**消さずに残して報告する**（勝手に決めない）
- push はしない

**dependencies**: T-187

**difficulty**: sonnet

**evidence**: `src/steps/` のコメント 257行→228行（-29行）。変更は4ファイル（step-outcome.ts / values-yaml-draft.ts / build-plans.ts / resolve-latest-tags.ts）。
`git diff -U0 -- src/steps` の変更行がコメント行のみであることを確認。`pnpm check` 通過: 385 Tests、`test/` 無変更。
受け入れで、消した根拠として挙がった正典3箇所の実在と、書き換わった `withAppContext()` のJSDocが `rethrowWithAppContext()` の実装と一致することを確認した。

## T-190

**タスク**:

## 背景

`src/` のコメント量は実測で **824/3194行 = 26%**（`scripts/` は 20%、`test/` は 3% なので
testは問題になっていない）。ルールが無いのではなく、`docs/coding-standards.md`「コメント」節が
既に「コードから読み取れないことだけを書く」「型名・フィールド名・関数名の言い換えは書かない」
「残すかどうかは長さではなく種類で決める」と定めている。**守られていないか、ルールが足りない**。

具体例（ユーザーが挙げたもの）: `src/lib/config/config.ts` の `loadConfig()` は**本体9行に対し
JSDoc 13行**。しかも T-184/T-185 で本体が名前の付いた段の並びになった結果、JSDocの一部が
本体の写しになっている（「`validateTagFormatConsistency()` も検証する」と書いてあるが、
本体にその呼び出し行がそのまま並んでいる）。

腐った実例もある: T-186 の受け入れで見つかった `src/lib/config/schema.ts` の
「`config.ts`・`chart-and-apps.ts`から参照する」は、T-185 で `config.ts` が `schema.ts` を
import しなくなった時点で**既に事実と違っていた**（grepで分かることをコメントに書くと腐る）。

T-187 で `docs/coding-standards.md`「コメント」節の規約と判定手順が決まっている。
このタスクは**その判定手順を `src/domain/` `src/types/` `src/utils/` `scripts/` に機械的に適用する**担当。
（実測: コメント 308行（domain 63 / types 62 / utils 83 / scripts 100））

## 解くべき論点

- 判定手順を当てても残すか消すか決められないコメントが出たら、**自分で決めずに残し**、
  どのコメントで迷ったかを報告に列挙する（T-187 の判定手順の穴になるため）

## やること

1. **まず `docs/coding-standards.md`「コメント」節を読む**（T-187 が書き換えた後の版）。
   `sed -n '/^## コメント/,/^## /p' docs/coding-standards.md` で節だけ読む
2. `src/domain/` `src/types/` `src/utils/` `scripts/` の各ファイルのコメントに判定手順を当て、消す・残す・正典へ移すを実行する
3. **正典へ移すものがあれば、先に正典の該当箇所を確認する**（既に書かれていれば消すだけ、
   無ければ `docs/architecture.md` 等に書いてから消す）。これは既存の正典の手順
4. コメントを消した結果、**コードの意図が読めなくなった箇所があれば消さずに残す**。
   判断に迷ったものは報告に列挙する
5. `test/` は実測3%で問題になっていないため**対象外**（T-187 が範囲を変えていれば従う）

## 完了条件

- `src/domain/` `src/types/` `src/utils/` `scripts/` のコメントが T-187 の判定手順に沿っている
- **振る舞いを一切変えていない**（`git diff` の変更がコメント行と空行のみであることを
  `git diff -U0 | grep '^[+-]' | grep -v '^[+-][+-]'` で確認し、コメント以外の行が
  出ないことを報告に書く）
- `test/` 配下に一切変更が無い（`git diff --stat test/` の出力が空）
- `pnpm check` が通り、**テスト件数が385件のまま**
- 削減した行数（変更前後のコメント行数）を報告に書く

## 注意

- **コードは1行も変えない。コメントの削除・短縮・正典への移動だけ**
- **消す前に正典を確認する**。経緯をコードから消すときの既存手順
- `docs/history/` 配下は書き換えない
- 判断に迷ったコメントは**消さずに残して報告する**（勝手に決めない）
- push はしない

**dependencies**: T-187

**difficulty**: sonnet

**evidence**: `src/domain/`・`src/types/`・`src/utils/`・`scripts/` のコメント 308行→305行（-3行）。変更は4ファイル（feature-branch.ts / tag-format.ts / brand.ts / types.ts）。
`git diff -U0` の変更行がコメント行のみであることを確認。`pnpm check` 通過: 385 Tests、`test/` 無変更。判定不能で残したコメントは0件。
受け入れで `brand.ts` から消した根拠が `docs/architecture.md` に実在することと、`utils/cache.ts` に削る箇所が無いことを自分で確認した。

## T-191

**タスク**:

## 背景

`src/lib/config/validate.ts` にある `resolveProjectLinkage()` と型 `LinkedApp` は、
**名前に反して検証ではなく「2ファイルの結合」**をしている。JSDocにも
「検証だけして捨てるのではなく組を返すのは、呼び出し元が同じ突き合わせをもう一度やらずに
済ませるため」と書いてある。呼び出し元は `src/lib/config/load-chart-and-apps.ts:67` の
**1箇所だけ**（`grep -rn "resolveProjectLinkage" src test scripts` で確認済み）。

`load-chart-and-apps.ts` はまさに「設定ユニットの `config.yaml` と chartディレクトリの
`registry.yaml` の `appSpecs[]` を読み込み・結合する」担当（`docs/architecture.md`
「各ファイルの責務」の `src/lib/` の表）。そこへ移せば `validate.ts` が
「設定ミスの検知」だけになり、ファイル名と中身が一致する。

`docs/architecture.md`「1ファイルにまとめるか分けるか」の**まとめる合図**③（対になっていて
片方だけでは意味が分からない）④（呼び出し側がほぼ必ずセットでimportする）に当たる。

## 解くべき論点

- `LinkedApp` 型を `load-chart-and-apps.ts` の非公開型にできるか（`validate.ts` の他の関数が
  使っていないことを確認する）
- 移した後の `resolveProjectLinkage()` を `load-chart-and-apps.ts` 内で公開のままにするか
  非公開にするか（呼び出し元が同じファイル内だけになるため）

## やること

1. `resolveProjectLinkage()` と型 `LinkedApp` を `src/lib/config/validate.ts` から
   `src/lib/config/load-chart-and-apps.ts` へ移す
2. 移した先で**非公開にできるなら非公開にする**（`export` を落とす）。
   `grep -rn "resolveProjectLinkage\|LinkedApp" src test scripts` で外部参照がゼロであることを
   先に確認する
3. 関数の並び順は「外から使うもの → その内部で使うもの」を保つ
   （`docs/coding-standards.md`「関数の並び順」）
4. JSDocは移動先へそのまま持っていく。**T-187 で書き換わった `docs/coding-standards.md`
   「コメント」節の判定手順を、移したJSDocにも当てる**（移した先では呼び先が同じファイル内に
   なるため、写しになる段落が出るかもしれない）
5. `docs/architecture.md`「各ファイルの責務」の `src/lib/` の表で、`config/validate.ts` と
   `config/load-chart-and-apps.ts` の行が実物とズレたら直す

## 完了条件

- `src/lib/config/validate.ts` に `resolveProjectLinkage` と `LinkedApp` が存在しない
- `grep -rn "resolveProjectLinkage\|LinkedApp" src test scripts` の結果が
  `src/lib/config/load-chart-and-apps.ts` だけになる
- `test/` 配下に一切変更が無い（`git diff --stat test/` の出力が空）
- `pnpm check` が通り、**テスト件数が385件のまま**

## 注意

- **振る舞いは一切変えない。エラーメッセージの文言も1文字も変えない**
  （`test/lib/config/config.test.ts` に `toThrow` が23件ある）
- `validateNoDuplicateProjectIds` / `validateNoDuplicateTargets` / `validateTagFormatConsistency`
  は `validate.ts` に**残す**（これらは本当に検証）
- 引数の順序・名前は変えない（それは T-192 の担当）
- push はしない

**difficulty**: sonnet

**evidence**: `resolveProjectLinkage()` と `LinkedApp` を `load-chart-and-apps.ts` へ移し、両方とも非公開にした。`validate.ts` 137行→87行、`load-chart-and-apps.ts` 129行→167行。
受け入れで、移した関数本体が移動前と**完全一致**すること（`diff` で確認）と、外部参照が `load-chart-and-apps.ts` だけになったことを確認した。
`pnpm check` 通過: 385 Tests、`test/` 無変更。移したJSDocは判定手順を当てて0件削除。

## T-192

**タスク**:

## 背景

`src/lib/config/load-chart-and-apps.ts` の `buildChartAndApps()` は**6つの位置引数**を取る:

```ts
function buildChartAndApps(
  chartDirName: ChartDirName,
  unitPath: ConfigUnitPath,
  chart: ChartRepoConfig,
  appSpecs: readonly AppSpec[],
  configYamlPath: LocalPath,
  registryYamlPath: LocalPath,
): ChartAndApps
```

問題は2つある。

1. **末尾2つが隣接する同じ `LocalPath` ブランド型**で、取り違えても型エラーにならない。
   ただしこの関数は T-186 で非公開になり、呼び出し元は同じファイル内の1箇所だけなので、
   **被害範囲は1ファイルに閉じている**（当初この案を提案した時点より弱い根拠）
2. **呼び出し側が構造体をバラして渡している**（強い根拠）。`loadChartAndApps(chartUnits)` は
   `ChartUnits` を受け取っているのに、`chartUnits.chartDirName`・`chartUnits.chartDirPath` を
   展開して6つの引数に並べ直している

このリポジトリには「値が何の単位で決まるかで分ける」という正典の軸がある
（`docs/architecture.md`「`config/`は『スコープ』で2ファイルに分け、変更頻度では分けない」）。
それを引数にも当てる。

## 解くべき論点

- 2つのオブジェクトの型に名前を付けるか、インラインの型注釈で済ませるか
  （`docs/architecture.md`「型の置き場所」の表と突き合わせて決める。名前を付けるなら
  `load-chart-and-apps.ts` 内の非公開型）
- `ChartUnits`（`find-config-units.ts`）をそのまま chartリポジトリ単位の引数に使えないか。
  `ChartUnits` は `chartDirName` / `chartDirPath` / `unitPaths` を持ち、必要なのは
  `chartDirName` / `chart` / `appSpecs` / `registryYamlPath` なので**一致しない**。
  無理に合わせず別の形にしてよい

## やること

1. `buildChartAndApps()` の引数を、値が決まる単位で2つのオブジェクトにまとめる:

```ts
buildChartAndApps(
  { chartDirName, chart, appSpecs, registryYamlPath }, // chartリポジトリ単位
  { unitPath, configYamlPath }, // 設定ユニット単位
)
```

2. 呼び出し元（同じファイル内の `loadChartAndApps()`）を合わせる。**chartリポジトリ単位の
   オブジェクトはループの外で1回だけ組み立てる**（今は `unitPaths.map()` の中で毎回
   同じ4つを並べている）
3. 関数本体の中身は変えない。引数の受け取り方だけを変える
4. JSDocの引数の説明が実物とズレたら直す。**T-187 で書き換わった
   `docs/coding-standards.md`「コメント」節の判定手順に沿う**（引数名の言い換えは書かない）

## 完了条件

- `buildChartAndApps()` の引数が2つで、それぞれがオブジェクト
- 呼び出し元で chartリポジトリ単位のオブジェクトが `unitPaths.map()` の外側で1回だけ
  組み立てられている
- `test/` 配下に一切変更が無い（`git diff --stat test/` の出力が空）
- `pnpm check` が通り、**テスト件数が385件のまま**

## 注意

- **振る舞いは一切変えない。エラーメッセージの文言も1文字も変えない**
  （`test/lib/config/config.test.ts` に `toThrow` が23件ある）
- `resolveHelmTargetBranch()` の引数は今回の対象外（3引数で、同型の隣接も無い）
- **T-191 で `resolveProjectLinkage()` が同じファイルに移っている前提**で作業する
  （`dependencies` に T-191 がある）
- push はしない

**dependencies**: T-191

**difficulty**: sonnet

**evidence**: `buildChartAndApps()` の6位置引数を `ChartRepoScope` / `ConfigUnitScope` の2オブジェクトに。chartリポジトリ単位の側は `unitPaths.map()` の外で1回だけ組み立てる形にした。
受け入れで型名を `ChartRepoUnit`/`ConfigUnit` から改名（下記）。エラーメッセージが変更前と完全一致することを `diff` で確認。
`pnpm check` 通過: 385 Tests、`test/` 無変更。
