# 用語集

このツール（helm-yadokari）で使われる業務ドメイン固有の用語を、日本語表記・対応するコード上の識別子（型名・関数名など）・定義の3点でまとめたもの。オンボーディング時の用語辞典として、また既存ドキュメント/コード間の表記ゆれを把握する目的で作成した。

**方針**:

- ここに載っているのは*業務ドメイン用語*のみ。`lib/`/`steps/`/`utils/`の配置基準や`settled`/`toApply`のようなパイプライン内部の制御語彙は対象外（`CLAUDE.md`のアーキテクチャ概要節を参照）
- 表記ゆれが見つかったものは、統一・修正はせず「現状こう呼ばれている」という事実だけを各エントリに注記する
- 対応する英語識別子がない用語は省略する

## 設定・登録関連

### アプリ

- **英語識別子**: `AppConfig` / `app`
- **定義**: Helm chartでデプロイされる1つのアプリケーション単位。`config/<chart>/<tenantId>/<clientId>/config.yaml`の1エントリ（運用値）と、同じディレクトリの`anchors.yaml`の対応するエントリ（chart構造）を`projectId`で結合したもの（T-017）。

### ソースリポジトリ

- **定義**: アプリのソースコードが置かれ、タグが打たれるGitLabプロジェクト。chartリポジトリ（後述）とは別のプロジェクトを指す。
- **表記ゆれ**: コード上は「ソースリポジトリ」に対応する専用の識別子がなく、chart側の`chart.projectId`と同じ`projectId`という汎用フィールド名（`app.projectId`）が使われている。

### chartリポジトリ / chartAndApps

- **英語識別子**: `ChartAndApps`（旧`ChartGroup`）
- **定義**: 1つの`chart.yaml`（Helm chartを管理するGitLabプロジェクトの情報）と、そのプロジェクト配下で管理する全アプリ（`config.yaml`群）をまとめた集約単位。「chartリポジトリ」はこの集約が指すGitLabプロジェクトそのものを指し、「chartAndApps」は範囲がそれより広い（chartリポジトリの情報＋配下の全アプリ設定を束ねたもの）。並列処理やエラーハンドリングの粒度を説明する文脈（「chartリポジトリ間/chartAndApps内」等）ではこの範囲の違いが意味を持つ。
- **表記ゆれ（解消済み）**: 型名は元々「グループ」という語よりも中身（chart設定＋アプリ設定の集約）を表すよう`ChartAndApps`に改名されていたが、日本語の業務用語としては改名後も「chartグループ」という言葉が`CLAUDE.md`・コードコメント・ドキュメント全般で使われ続けており、型名との乖離があった。ユーザー指摘（「chartグループという単語はなくしてもらいたい。chartAndAppsになったし」）を受けて、日本語プロース上でも型名をそのまま`chartAndApps`と表記する方式に統一し、「chartグループ」という言い方は撤廃した。旧称への言及は`tasks.json`/`progress.md`の過去のエントリにのみ、当時の記録として残っている。

### テナント / クライアント

- **英語識別子**: `tenantId` / `clientId`（`TenantId`/`ClientId`ブランド型、`ChartAndApps`のフィールド）
- **定義**: 同一chartリポジトリ配下でアプリ設定をさらに分割管理する単位。`config/<chart>/<tenantId>/<clientId>/config.yaml`というディレクトリ階層で表現される。MRを作成する単位でもある（T-019）。
- **表記ゆれ（解消済み）**: 当初`AppConfig`/`ChartAndApps`型にはtenantId/clientIdに対応するフィールドが存在せず、ディレクトリを走査してファイルを見つけるためだけに使われるディレクトリ名（永続化されないもの）だった。T-019でMRの粒度をtenantId/clientId単位に変更したのに伴い、`ChartAndApps.tenantId`/`ChartAndApps.clientId`として`TenantId`/`ClientId`ブランド型で保持するようになった。

### config.yaml / anchors.yaml

- **英語識別子**: なし（ファイル名そのもの）
- **定義**: `<tenantId>/<clientId>`ディレクトリに置く2つの設定ファイル（T-017）。`config.yaml`は
  「どのプロジェクトのどのブランチを追跡するか」という運用値（`projectId`/`projectName`/
  `branchToSync`、Helmの向き先ブランチの値`helm.branchToSync`。頻繁に変更される）のみを持ち、
  `anchors.yaml`は「`values.yaml`のどこに書き込むか」というchart構造（`apps[].chart[]`、
  `helm.chart[]`。滅多に変更されない）のみを持つ。両者は`projectId`で対応付ける。
  `anchors.yaml`側の各appは`projectId`に加えて`projectName`も重複して持ち、
  `loadApps()`内の`validateProjectLinkage()`が両ファイル間の紐づけ（`config.yaml`の各appに
  対応するエントリが`anchors.yaml`にあるか、逆に`anchors.yaml`に孤児エントリが
  無いか、`projectName`が食い違っていないか）を検証する。
- **経緯**: 元々は`config.yaml`（当時は`apps.yaml`）自身が`apps[].chart[]`・`helm.chart[]`と
  してchart構造も持っていたが、「chart設定は一度設定すればあまり触らず、apps.yamlはよく触る」
  というユーザー指摘により分離した。最初は`chart-targets.yaml`という名前で`projectId`を
  キーとするマップ形式にしたが、「`projectId`だけで読み解くのは難しいかもしれない」という
  評価を受けて撤回。改めて`anchors.yaml`という名前で、`projectId`をマップのキーにする
  代わりに`projectId`/`projectName`を持つ自己完結した配列要素にする形に作り直した。
  `helm`もユーザーが手動で`[{chart: [...]}]`という配列表記から`{chart: [...]}`という単純な
  オブジェクトに直接修正し、それに実装を追従させた。

### valuesPath

- **英語識別子**: `valuesPath`
- **定義**: `anchors.yaml`内で、対象アプリが参照する`values.yaml`ファイルのパスを指すフィールド。

### anchor（chart[].anchor）

- **英語識別子**: `anchor`（型は`AnchorName`ブランド型、`ImageTagTarget`＝`AnchorTarget`のフィールド）
- **定義**: `values.yaml`内のイメージタグの位置をYAMLアンカー名で指す、`anchors.yaml`の
  `apps[].chart`配列の1要素が持つフィールド名。`variables: [&tenant1client1AppsVersion main, ...]`
  のように、配列要素にアンカーで名前を付けた構成のvalues.yamlを前提とする。1つのソース
  リポジトリでWebAPI/バッチ/デーモンなど複数のデプロイ単位を管理している場合は、`chart`配列に
  要素を複数指定し、それぞれ異なる`anchor`を持たせる。
- **補足**: `yaml`パッケージ（`src/lib/helm.ts`の`getValueAtAnchor`/`setValueAtAnchor`）がASTを
  `visit()`で走査し、アンカー名をノードのプロパティとして直接引く。オブジェクトのネストを
  dotパスで辿る`imageTagKey`方式も過去に存在したが、実運用ではYAMLアンカー方式のみで
  十分なため削除された。過去には`imageTagAnchor`という名前だったが、ユーザー指示により
  `helm.chart[].anchor`と対になる形で`anchor`にリネームされ、さらに`apps.yaml`から
  `anchors.yaml`へ移設された（T-017）。

### Helmの向き先ブランチ

- **英語識別子**: `helm.branchToSync`（config.yamlのフィールド名）/
  `AppConfig.helmTargetBranch: HelmTargetBranchConfig`（app単位に振り分けた後のコード上の型）
- **定義**: Helm chartは(1)`values.yaml`等のパラメータを定義するブランチ（既存の`mrTargetBranch`に相当）と、
  (2)そのパラメータを受け取ってk8sリソースを実際に構築するブランチの2種類で構成される、という前提のもと、
  後者を指すブランチ名。タグではなくブランチ名そのもので指定する。1つのtenantId/clientId内のapps全体で
  共通の1つの値であり、`config.yaml`のトップレベルフィールド`helm`（`apps:`配列と同階層、
  `branchToSync`を持つ1件のオブジェクト。運用値のためconfig.yaml側に置く。`anchors.yaml`
  側の`helm`も同じくオブジェクト形式で、両者とも配列表記は使わない）として人間が直接
  書き換える。タグ命名規則のような自動生成・自動判定の仕組みは持たない（T-016）。
- **表記ゆれ**: config.yaml上のフィールド名は`helm.branchToSync`だが、これは`AppConfig.branchToSync`
  （追跡ブランチ、ソースリポジトリ側の別概念）とは無関係。同じフィールド名が異なる2つの意味で
  使われている点に注意。

### helm.chart\[\].anchor

- **英語識別子**: `anchor`（型は`AnchorName`、`HelmTargetBranchTarget`＝`AnchorTarget`のフィールド）
- **定義**: 「Helmの向き先ブランチ」の値を`valuesPath`のどこに書き込むかを指す、
  `anchors.yaml`トップレベル`helm.chart`配列の各要素が持つフィールド（chart構造の
  ためconfig.yamlではなくanchors.yaml側に置く、T-017）。`apps[].chart[].anchor`と
  同様にYAMLアンカー名で位置を指定するが、書き込む値がタグではなくブランチ名である点が
  異なる。`apps[].chart[]`とは独立したリストで、どのappの`values.yaml`に書き込むかは
  `valuesPath`の一致だけで決まる（app側に専用フィールドは持たせない）。
- **制約**: config.yamlに`helm.branchToSync`が指定されている場合、そのconfig.yaml配下の全アプリの全
  `chart[].valuesPath`が`anchors.yaml`の`helm.chart[]`でカバーされている必要がある
  （Helmの向き先ブランチは「1client内のapps全体で共通」という前提のため、1つでもvaluesPathが
  漏れていると設定エラーになる）。`helm.branchToSync`と`helm.chart[]`は片方だけの指定も
  設定エラー。過去には`apps[].chart[].helmBranchAnchor`というapp単位の任意フィールドだったが、
  ユーザー指示によりトップレベルの独立リストへ再設計され（T-016）、さらに`apps.yaml`から
  `anchors.yaml`へ移設された（T-017）。当初`helm`は`[{chart: [...]}]`という配列表記
  だったが、ユーザーが`{chart: [...]}`という単純なオブジェクトに直接修正した。

### chartDir

- **英語識別子**: `chartDir`（型は`ChartDirName`ブランド型）
- **定義**: `config/`配下でchartリポジトリに対応するディレクトリ名。ログ出力等で人間向けラベルとして使われる。

### セルフサービス方式 / 自己申告方式

- **定義**:
  - **セルフサービス方式**（採用）: 各チームがこのCLIリポジトリの`config/`へMRを送り、レビュー後マージすることで新しいアプリを登録する運用フロー。
  - **自己申告方式**（不採用）: chartリポジトリ側に設定を持たせる代替案。検討の末に採用されなかった。
- **表記ゆれ**: 字面が似ているが指す運用フローは正反対（前者はこのCLIのリポジトリ側に設定を集約、後者はchartリポジトリ側に分散）なので混同注意。

## タグ・バージョン管理関連

### 追跡ブランチ

- **英語識別子**: `branchToSync` / `BranchName`
- **定義**: アプリごとに設定する、最新タグの判定対象とするソースリポジトリ側のブランチ。
- **表記ゆれ**: 要件定義の初期検討段階（`docs/requirements-grilling.md`）では「追跡対象ブランチ」という表記もあったが、確定版の`docs/requirements.md`では「追跡ブランチ」に統一されている。

### タグ命名規則

- **定義**: デフォルトは `${追跡ブランチ名の"/"を"-"に置換した値}-build-at-${yyyymmdd}-${hhmmss}`
  というフォーマット。`TAG_FORMAT`環境変数（`{branch}`/`{date}`/`{time}`プレースホルダを
  ちょうど1回ずつ含むテンプレート文字列）でカスタマイズ可能（当初は固定フォーマットだったが、
  T-018で設定可能に変更）。`validateTagFormat()`/`parseTag()`/`buildNewTag()`が扱う。

### 打刻日時 / ビルド日時

- **英語識別子**: `builtAt`
- **定義**: タグ名に含まれる`yyyymmdd-hhmmss`部分が表す日時。

### 最新タグ

- **英語識別子**: `latestTag`
- **定義**: 追跡ブランチ由来のタグのうち、追跡ブランチの現在のHEADコミットを指しているもの
  （複数該当する場合はいずれも同じコミットを指すため中身は同じだが、決定性のためだけに
  打刻日時が最も新しいものを選ぶ）。1件も見つからない場合は、新規作成されたタグがこれに
  当たる（後述の「タグ自動作成」）。「タグ名が最も新しいものを選んでからHEADと比較する」
  のではなく「HEADを指すタグを直接探す」方式にしているのは、HEADに既にタグがあるのに
  別コミットに新しい名前のタグがあると無駄なタグを作ってしまうのを避けるため（T-056）。

### 反映済みタグ

- **英語識別子**: `previousTag`
- **定義**: `values.yaml`に現在書かれているタグ。`AppConfig.chart`の書き換え箇所（`ImageTagTarget`）ごとに
  独立して読み取るため、1つのソースリポジトリでWebAPI/バッチ/デーモンなど複数のデプロイ単位を
  管理している場合、同一アプリ内でも箇所によって異なりうる（`AppUpdatePlan.updates[].previousTag`）。
- **表記ゆれ**: 型のフィールド名は`previousTag`だが、`build-plans.ts`内のローカル変数では
  書き換え前の生の文字列を`previousTagRaw`と呼んでいる。
- **更新しない例外**: 反映済みタグが現在の追跡ブランチのHEADコミットを指している場合は、
  より新しい名前のタグが存在しても更新しない（デプロイされる中身が同じなのに差分だけが出る
  MRを作らないため。T-037）。ただし追跡ブランチを切り替えた直後は、切り替え前後が同じ
  コミットを指していても新しいタグを作成して反映する（T-043）。

### タグ自動作成

- **定義**: 追跡ブランチの現在のHEADコミットを指す、追跡ブランチ由来のタグが1件も無い場合に、
  このCLI自身が追跡ブランチの最新コミットに対して命名規則通りの新しいタグを作成する機能
  （`dryRun`のときは作成をスキップし名前の計算のみ行う）。
- **補足**: `docs/requirements-grilling.md`に記載があるとおり、当初の要件（見つからない場合は
  エラーにする）から実装時に仕様変更された経緯がある。実運用での実機検証を通じて「HEADに
  ビハインドしている場合も作成する」判定が追加され（当初は名前が一致する既存タグを無条件に
  再利用していた）、その後T-056で「タグ名が最も新しいものを選んでからHEADと比較する」方式から
  「HEADを指すタグを直接探す」方式に変更された（無駄なタグ作成を避けるため）。

## MR・GitLab操作関連

### MR（Merge Request）

- **定義**: GitLab上のプルリクエストに相当する概念。1つのchartAndAppsにつき1つのMRを作成する。

### 固定ブランチ

- **英語識別子**: `buildUpdateBranch(tenantId, clientId)`（値は`feature/yadokari/<tenantId>/<clientId>`）
- **定義**: 1つのchartAndApps（`(chartリポジトリ, tenantId, clientId)`単位）でMRを送るために使い回す固定ブランチ名。tenantId/clientIdごとに異なる値になる。
- **補足**: 要件定義の検討初期段階では`yadokari/<アプリ名>`というアプリ単位のブランチ名案だったが、議論の末に「chartリポジトリ単位で固定（`yadokari/update`）」に変更され、さらにT-019で「`(chartリポジトリ, tenantId, clientId)`単位」に変更された（同じchartリポジトリに複数のtenantId/clientIdが乗る場合、クライアントごとに独立したブランチ・MRになる）。以前は`UPDATE_BRANCH`という固定値のエクスポートだったが、tenantId/clientIdごとに値が変わるようになったため関数に変わった。
- **バグ修正（T-021）**: 要件定義には元々「マージまたはクローズされた後の実行で、改めて固定ブランチを作り直しMRを作成する」と明記されていたが、実装（`commitFileUpdates()`）はブランチが存在する場合は削除せず追加コミットを積むだけだった。`filterTargets`が「このブランチにオープン中のMRが無い」ことを確認済みという前提を活かし、ブランチが存在すれば`deleteBranch()`で無条件に削除してから作り直すよう修正した。

### mrTargetBranch

- **英語識別子**: `mrTargetBranch`（`ChartRepoConfig`のフィールド）
- **定義**: MRの作成先（ベースブランチ）を指定する`chart.yaml`のフィールド。

### オールオアナッシング

- **定義**: 同一chartAndApps内で1アプリでも処理が失敗した場合、成功した他アプリの分も含めてそのchartAndApps全体の更新を見送る方針。

### Group Access Token

- **英語識別子**: `ACCESS_TOKEN`
- **定義**: GitLab認証に使う、スコープを絞ったトークン。`read_api` + `write_repository` + MR作成権限の最小権限で運用する。

## 実行結果・処理単位関連

### 更新計画

- **英語識別子**: `AppUpdatePlan`
- **定義**: 1アプリ分の更新内容。最新タグが反映済みタグと異なる場合にのみ生成される。

### chartAndApps更新対象

- **英語識別子**: `ChartUpdateTarget`
- **定義**: 差分が確定し、実際にコミット・MR作成の対象になった1件分の更新内容（対象を表す`chartAndApps`フィールド＋複数の`AppUpdatePlan`＋書き換え済みファイル一覧）。

### chartAndApps処理結果

- **英語識別子**: `ChartUpdateResult`（`"CREATED"` / `"SKIPPED"` / `"ERROR"`）
- **定義**: 1つのchartAndAppsの処理結果を表す3値。
- **表記ゆれ**: `docs/requirements.md`には`CREATED`という語自体は登場せず「MRを作る」という記述のみ。`SKIPPED`/`ERROR`はドキュメント上でも同じ語で登場する。

### 実行結果

- **英語識別子**: `RunResult`（`"SUCCESS"` / `"PARTIAL_FAILURE"`）
- **定義**: CLI全体の実行結果を表す型。`PARTIAL_FAILURE`のとき、CLIの終了コードを非ゼロにする。
- **表記ゆれ**: ドキュメントには対応する語がなく、「CLI全体の終了コードを非ゼロにする」という説明文のみで言及されている。

## 実行環境・運用関連

### Dry-runモード

- **英語識別子**: 環境変数`DRY_RUN` / コード内引数`dryRun`
- **定義**: 実際のブランチ作成・タグ作成・MR送信を行わず、予定内容だけをログで確認するモード。
- **表記ゆれ**: 環境変数は`DRY_RUN`（UPPER_SNAKE_CASE）、コード内引数は`dryRun`（camelCase）と大文字小文字の表記が異なる（環境変数の命名規則としては通常の慣習であり、実質的な不整合ではない）。

### GitLab CI pipeline schedules / スケジュールパイプライン

- **定義**: このCLIの実行トリガー。GitLab CIのスケジュール実行機能を指す。ドキュメント内で英語表記「pipeline schedules」と日本語表記「スケジュールパイプライン」が両方使われている。

### renovateジョブ

- **定義**: `.gitlab-ci.yml`内の、このCLI自体の依存パッケージ更新用ジョブ（`RENOVATE=true`のときのみ実行）。本体の更新処理を実行する`update-app-versions`ジョブとは無関係な別機能だが、名前が似ており紛らわしいので注意。

## その他の注記

### 「反映」「適用」「更新」の使い分け

これら3つの動詞はドキュメント内で厳密に使い分けられておらず、混在している。特に「反映」は次の2つの異なる意味で使われている:

- クラスタへの`helm upgrade`実行（このツールのスコープ**外**）
- `values.yaml`への書き込み（このツールのスコープ**内**）

コード上は`applyUpdates()`/`apply-updates.ts`/`toApply`のように「適用」に対応する英語`apply`が使われている。読む際は、その「反映」がクラスタ反映を指すのか`values.yaml`反映を指すのか、文脈で判断する必要がある。

### gitlab-watari-dori

同じ作者による類似の先行プロジェクト。本リポジトリの実装時に技術スタックのテンプレートとして参照された。「chartAndApps間は失敗しても他は継続するが、FatalErrorのときは即時中断する」という例外パターンの由来として`CLAUDE.md`で言及されている。要件定義書（`docs/requirements.md`/`docs/requirements-grilling.md`）には登場せず、`CLAUDE.md`と`progress.md`にのみ記録がある。
