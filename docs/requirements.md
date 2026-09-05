# helm-yadokari 要件定義

最終更新: 2026-09-02
ステータス: 確定（詳細な検討経緯は `docs/requirements-grilling.md` を参照）

## 1. 概要・目的

Helm chart でバージョン管理されているアプリケーションのバージョンを、自動で最新に
更新・メンテナンスするシステム。GitLab上のタグを「最新版」の判定元とし、
`values.yaml` 内のコンテナイメージタグを最新版へ書き換える Merge Request (MR) を
自動作成する。クラスタへの直接反映（`helm upgrade` の実行）は行わない。

## 2. スコープ

### 2.1 対象とすること

- GitLabのタグ情報を取得し、アプリごとに設定された追跡ブランチ由来の最新タグを判定する
- 判定した最新タグを元に、chartリポジトリの `values.yaml` 内のイメージタグを更新する
  コミットを作成し、chartリポジトリごとにMRを送る
- 複数チーム・複数アプリ・複数テナント/クライアント（複数のHelm chart・複数のGitLab
  プロジェクト）を横断的に扱う汎用システムとして動作する
- GitLab CI の pipeline schedules から定期実行される

### 2.2 対象外とすること（スコープ外）

- クラスタへの直接デプロイ・`helm upgrade` の実行
- MRの自動マージ（人間のレビュー承認を必須とする）
- 専用の通知機能（Slack通知等）。MVPではGitLab標準のMR通知に任せる
- chart自体のバージョン（`Chart.yaml`）や依存チャートの更新

### 2.3 想定利用者

- 社内の複数チーム（チーム内限定利用。外部公開・OSS化は将来検討）

## 3. 用語

| 用語                          | 意味                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| アプリ                        | 管理対象とする、Helm chartでデプロイされる1つのアプリケーション単位。`config.yaml`の1エントリに対応する                                                                |
| ソースリポジトリ              | アプリのソースコードが置かれ、タグが打たれるGitLabプロジェクト                                                                                                         |
| chartリポジトリ               | Helm chart（`values.yaml`を含む）を管理するGitLabプロジェクト。ソースリポジトリとは別プロジェクト。`config/`配下では1ディレクトリ（`chart.yaml`）に対応する            |
| テナント / クライアント       | 同一のchartリポジトリ配下で、アプリの設定をさらに分割管理するための単位。`config/<chartリポジトリ>/<tenantId>/<clientId>/config.yaml` というディレクトリ階層で表現する |
| 追跡ブランチ (`branchToSync`) | アプリごとに設定する、最新タグの判定対象とするソースリポジトリ側のブランチ                                                                                             |

## 4. 機能要件

### 4.1 バージョン判定

- GitLabのタグ一覧から、アプリごとに設定された追跡ブランチ (`branchToSync`) 由来のタグ
  のみを対象に最新版を判定する
- タグの命名規則: `${追跡ブランチ名の "/" を "-" に置換した値}-build-at-${yyyymmdd}-${hhmmss}`
  （例: 追跡ブランチが `release/foo` なら `release-foo-build-at-20260902-123456`）。
  この規則からブランチ名部分を検証し、日時部分をタイムスタンプとしてパースして最新順に
  ソートする
- 追跡ブランチ由来のタグのうち最新のものが、追跡ブランチの現在のHEADコミットと一致するか
  検証する。一致しない場合（該当するタグが1件も見つからない場合に加え、見つかった最新タグが
  追跡ブランチの進行にビハインドしている＝タグ作成後に追跡ブランチへ新しいコミットが積まれた
  場合を含む）は、そのアプリの追跡ブランチの最新コミットに対して、このツール自身が上記命名
  規則に従った新しいタグを作成し、それを最新タグとして扱う（`DRY_RUN=true` のときは実際の
  タグ作成をスキップし、作成予定のタグ名だけを使って以降の判定を続ける）
- 判定した最新タグが、すでに `values.yaml` に反映済みのタグと同じ場合は何もしない（MRを
  作らない）。ただしその判定結果はCLIのログに出力する

### 4.2 更新ワークフロー（chart リポジトリ単位）

- MRはアプリ単位ではなく **chartリポジトリ単位** で作成する。GitLabのMRはプロジェクト
  単位でしか作れないため、1つのchartリポジトリ配下で更新対象になった複数アプリ
  （複数テナント/クライアントをまたぐ場合を含む）の変更は、1つの固定ブランチ・1つのMRに
  まとめる
- ブランチ名は固定値（例: `yadokari/update`）とする。chartリポジトリ単位でブランチが
  分かれるため、アプリ名やテナント/クライアントIDをブランチ名に含める必要はない
- MRの作成先ブランチ（ベースブランチ）は、そのchartリポジトリの `chart.yaml` に設定する
  `mrTargetBranch` を使う
- 既にその固定ブランチにMR（未マージ）がオープンな場合は、そのchartリポジトリ配下の
  全アプリの更新処理をスキップする（他のchartリポジトリの処理には影響しない）。
  マージまたはクローズされた後の実行で、改めて固定ブランチを作り直しMRを作成する
- MRは自動マージしない。マージには人間のレビュー承認を必須とする
- MR本文には、更新対象になった各アプリについて、アプリ名・旧タグ→新タグ・タグの
  打刻日時・旧タグ/新タグそれぞれへのGitLabリンクに加えて、そのタグ（push）に紐づく
  GitLab CI パイプラインへのリンクを含める。パイプラインの状態（成功/失敗/実行中）に
  関わらず候補として扱い、状態はMR本文に記載する情報提供に留め、マージするかどうかの
  判断はレビュアーに委ねる（自動的なフィルタリングは行わない）
- MR本文には、旧タグ→新タグ間のGitLab比較URL（`-/compare/旧タグ...新タグ`）も含め、
  レビュアーが実際のコミット差分をワンクリックで確認できるようにする。旧タグが未設定
  （初回反映など）の場合は比較のしようがないため、その旨を記載し比較URLは省略する

### 4.3 複数アプリ・複数chartリポジトリの処理

- 1回のCLI実行（1回のpipeline schedule実行）で、`config/` 配下に登録された全chart
  リポジトリ・全アプリをまとめて処理する
- **chartリポジトリ間**: あるchartリポジトリの処理が失敗しても、他のchartリポジトリの
  処理は継続する
- **chartリポジトリ内（アプリ間）**: 同じchartリポジトリ内のいずれかのアプリの処理
  （タグ取得等）が失敗した場合は、そのchartリポジトリ全体の更新（MR作成/更新）を
  オールオアナッシングで見送る。成功した一部のアプリの変更だけを反映することはしない。
  失敗はログ・サマリーに出力し、次回実行時に再度全体を試行する
- 実行終了時に失敗したchartリポジトリの一覧をサマリー表示し、失敗が1件でもあればCLI
  全体の終了コードを非ゼロにする
- chartリポジトリ／アプリの処理は `p-limit` 等で同時実行数を制御する（デフォルト3〜5
  程度、設定ファイルで上書き可能）。GitLab APIのレート制限への配慮のため、無制限の
  並列実行は行わない

### 4.4 アプリの登録・設定

管理対象の情報は、CLIリポジトリ側の `config/` ディレクトリで一元管理する
（chartリポジトリ側に設定を持たせる自己申告方式は採用しない）。CLIは `config/` 配下を
再帰的に走査し、見つけた全ての `config.yaml`（とその直近の親をたどって見つかる`chart.yaml`、
同じディレクトリの`anchors.yaml`）を処理対象とする。

ディレクトリ構成:

```
config/
  <chartリポジトリ名>/            # 例: teamA-chart（ディレクトリ名は人間向けのラベル）
    chart.yaml                     # そのchartリポジトリ共通の情報
    <tenantId>/
      <clientId>/
        config.yaml         # 運用値（どのプロジェクトのどのブランチを追跡するか等）
        anchors.yaml        # chart構造（values.yaml内のどこに書き込むか）
```

`config.yaml`（よく変更する）と`anchors.yaml`（滅多に変更しない）でファイルを分ける
（T-017）。`config.yaml`は「どのプロジェクトのどのブランチを追跡するか」といった運用値のみを
持ち、`anchors.yaml`は「`values.yaml`のどこ（`valuesPath`+YAMLアンカー名）に書き込むか」
というchart構造を持つ。両者は`projectId`で対応付け、`anchors.yaml`側にも同じ
`projectId`/`projectName`を重複して書くことで、`anchors.yaml`単体を見ても「どのappの
設定か」が分かるようにしている。

`chart.yaml`:

```yaml
chart:
  projectId: 888 # values.yamlを更新するGitLabプロジェクトID
  projectName: teamA-chart
  mrTargetBranch: develop # MR作成先のベースブランチ
```

`config.yaml`:

```yaml
apps:
  - projectId: 888 # タグを取得するGitLabプロジェクトID（ソースリポジトリ）
    projectName: my-app
    branchToSync: main # 追跡するブランチ
```

`anchors.yaml`（`config.yaml`と同じ`<tenantId>/<clientId>`ディレクトリに置く）:

```yaml
apps:
  - projectId: 888 # config.yaml と一致させる
    projectName: my-app # config.yaml と一致させる
    chart:
      - valuesPath: charts/my-app/values.yaml
        anchor: myAppVersion # values.yaml内のYAMLアンカー名
```

- `apps[].chart[].anchor` は、`values.yaml`内のイメージタグの位置をYAMLアンカー名で
  指定するフィールド。`values.yaml`はオブジェクトのネストではなく、配列要素にYAMLアンカーで
  名前を付けた構成（例: `variables: [&myAppVersion main, ...]`）を前提とし、指定したアンカー名を
  持つYAML上のスカラー値を、ネストの深さ・キー名に関わらず直接書き換える

- `chart` は1件以上の配列で、`valuesPath`（書き換え対象の`values.yaml`のパス）＋
  `anchor`（書き換え位置）ごとに1要素を指定する。1つのソースリポジトリ（1つの
  `projectId`・タグ）に対してWebAPI/バッチ/デーモンなど複数のデプロイ単位を管理している
  ケースでは、`chart`に複数要素を指定することで、同じ最新タグを複数箇所へまとめて反映できる

  ```yaml
  # anchors.yaml
  apps:
    - projectId: 890
      projectName: multi-service-app
      chart:
        - valuesPath: charts/multi-service-app/values.yaml
          anchor: multiServiceAppWebapiVersion
        - valuesPath: charts/multi-service-app/values.yaml
          anchor: multiServiceAppBatchVersion
        - valuesPath: charts/multi-service-app/values.yaml
          anchor: multiServiceAppDaemonVersion
  ```

- `config.yaml`の各appに対応する`projectId`が`anchors.yaml`に見つからない場合、
  逆に`anchors.yaml`に`config.yaml`側に存在しないappが定義されている場合（孤児設定）、
  同じ`projectId`なのに`projectName`が食い違っている場合は、いずれも設定エラーになる
  （`config.yaml`と`anchors.yaml`の紐づけを検証する仕組みが働く）
- ディレクトリ階層は常に `<chartリポジトリ>/<tenantId>/<clientId>/` の
  2階層（tenantId/clientId）に統一する。テナント分けが不要なchartでも、ダミーの
  1つのtenantId/clientIdディレクトリ配下に置く
- 新しいアプリの登録は、各チームがCLIリポジトリの `config/` へMRを送り、レビュー後
  マージするセルフサービス方式とする

**Helmの向き先ブランチ**（values.yamlのパラメータを受け取ってk8sリソースを実際に構築する
ブランチ。既存の`mrTargetBranch`＝値定義ブランチとは別物）の追従・更新も、このMRの対象に含める:

```yaml
# config.yaml トップレベル。apps:配列と同階層、tenantId/clientId単位に1件のオブジェクト（運用値）
helm:
  branchToSync: release/2026-q1
apps:
  - projectId: 888
    projectName: my-app
    branchToSync: main
```

```yaml
# anchors.yaml トップレベル（chart構造。config.yaml の helm.branchToSync の値をどこに書くか）
apps:
  - projectId: 888
    projectName: my-app
    chart:
      - valuesPath: charts/my-app/values.yaml
        anchor: myAppVersion
helm:
  chart:
    # helm.branchToSyncの値をこのvaluesPath内のこのアンカーに書き込む
    - valuesPath: charts/my-app/values.yaml
      anchor: myAppTargetBranch
```

- `config.yaml`の`helm.branchToSync`はchartリポジトリ内の別ブランチ（chart.yamlの`projectId`と
  同一プロジェクト）を指す、tenantId/clientId単位に1件の値。人間が自己申告方式で直接書き換える
  運用とし、タグ命名規則のような自動生成・自動判定の仕組みは持たない
- `anchors.yaml`の`helm.chart[]`は書き込み先（`valuesPath`+`anchor`）の一覧で、
  `apps[].chart[]`とは独立したリスト。どのappに紐づくかは`valuesPath`の一致だけで決まる
  （app側に専用フィールドは持たせない）。1つのappが複数の`valuesPath`を持つ場合、それぞれに
  対応する`helm.chart[]`の要素があれば複数箇所へまとめて反映できる
- Helmの向き先ブランチは「1client内のapps全体で共通」という前提のため、`helm.branchToSync`が
  指定されている場合、そのconfig.yaml配下の**全アプリ**の**全`chart[].valuesPath`**が
  `helm.chart[]`でカバーされている必要がある（1つでも漏れていると設定エラー）。
  `helm.branchToSync`と`helm.chart[]`は片方だけの指定も設定エラー
- 書き込み前に、指定されたブランチ名がchartリポジトリ上に実在するか検証する。存在しなければ
  そのchartグループ全体を`ERROR`として扱う（他のアプリの更新も含めオールオアナッシングで見送る）
- 同じtenantId/clientIdが複数のchartディレクトリにまたがる場合、各`config.yaml`が独立して
  値を持つため、片方だけ更新し忘れて値がズレる可能性がある。これは許容し、追加の
  整合性チェックは行わない

### 4.5 特定chart・特定client限定実行

- 通常は `config/` 配下に登録された全chartリポジトリ・全アプリを対象に実行するが、
  `TARGET_CHART_DIR` / `TARGET_CLIENT` を指定することで対象を絞り込んだ実行もできる
  （手動での動作確認・特定チームからの緊急更新依頼など、全件実行が不要な場面向け）
- `TARGET_CHART_DIR`: `config/` 直下の特定のchartディレクトリ名を1つ指定し、そのchart
  リポジトリのみを対象にする
- `TARGET_CLIENT`: `"<tenantId>/<clientId>"` 形式で特定のtenant/clientを指定し、
  該当するconfig.yamlのみを対象にする。カンマ区切りで複数のtenant/client組を指定でき、
  指定した組のいずれかに一致するconfig.yamlがすべて対象になる（`TARGET_CHART_DIR`と
  組み合わせ可能。組み合わせた場合はその両方に一致するものだけが対象になる）
- 指定した`TARGET_CHART_DIR`、または`TARGET_CLIENT`内の各tenant/client組が
  `config/`配下に1件も見つからない場合は、typo等に気づけるようエラーとして即時終了する
  （`TARGET_CLIENT`に複数指定した場合、1件でも見つからない組があればエラーにする。
  対象0件のまま正常終了はしない）
- どちらも未指定の場合の挙動（全件実行）は変わらない

## 5. 実行環境・非機能要件

- **実行形態**: CLIツール。GitLab CI の pipeline schedules から定期実行する
- **実装言語**: TypeScript
- **配布方法**: 公開npmレジストリ（npmjs.com）にパッケージを公開し、CI job上で
  `npm install` する（Dockerイメージ配布は採用しない）
- **Node.jsバージョン**: `package.json` の `engines` でNode.js LTSバージョンを明示し、
  CI側のベースイメージで揃える
- **GitLab認証**: `CI_JOB_TOKEN` ではなく、スコープを絞った Group Access Token を
  CI/CD変数（masked）としてCLIに渡す（複数プロジェクトを横断操作するため）。
  付与するスコープは `read_api`（タグ・パイプライン等の読み取り）、`write_repository`
  （ブランチ作成・コミット）、MR作成権限相当に限定し、最小権限とする
- **Dry-runモード**: 実際のブランチ作成・MR送信を行わず、「何を更新する予定か」だけを
  確認できる `--dry-run` 相当のモードを用意する

## 6. 参照

- 検討経緯・質疑応答の詳細ログ: `docs/requirements-grilling.md`
