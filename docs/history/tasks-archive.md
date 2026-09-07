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
