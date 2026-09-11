# 用語集

このツール（helm-yadokari）で使われる業務ドメイン固有の用語を、日本語表記・対応するコード上の識別子（型名・関数名など）・定義の3点でまとめたもの。オンボーディング時の用語辞典として、また既存ドキュメント/コード間の表記ゆれを把握する目的で作成した。

**方針**:

- ここに載っているのは*業務ドメイン用語*のみ。`lib/`/`steps/`/`utils/`の配置基準や`settled`/`toApply`のようなパイプライン内部の制御語彙は対象外（`docs/architecture.md`を参照）
- **各エントリは今の姿だけを書く。** もう使っていない名前・採らなかった案・直したあとの不具合といった経緯は載せない（設計判断の経緯は`docs/architecture.md`、当時の記録は`docs/history/`が正典）。今の挙動の制約・前提は経緯ではないのでここに書く
- 表記ゆれが見つかったものは、統一・修正はせず「現状こう呼ばれている」という事実だけを各エントリに注記する
- 対応する英語識別子が無い用語も、`docs/requirements.md`・`README.md`・`docs/architecture.md`で使われている日本語の業務用語であれば載せる（その場合は英語識別子欄を省略する）

## このファイルの読み方

### このファイルは通読しない

20KB超あるため、頭から全部読むとそれだけでコンテキストを大きく消費する。**知りたい用語は
下の索引で1つ特定し、その見出しだけ**を次の形で読む:

```bash
sed -n '/^### 固定ブランチ/,/^#\{2,4\} /p' docs/glossary.md
```

見出しに `[` を含むもの（`### helm.chart\[\].anchor`・`### anchor（chart[].anchor）`）は、
`[` の手前までを指定すれば同じ形で引ける（例: `/^### helm\.chart/`）。

### 用語の索引

| 節                          | 収録している用語                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ## 設定・登録関連           | アプリ / ソースリポジトリ / chartリポジトリ・chartAndApps / 設定ユニット（ConfigUnitPath） / registry.yaml・config.yaml / chartToUpdate・appSpecs / valuesPath / anchor（chart[].anchor）・AnchorName / AnchorTarget / Helmの向き先ブランチ / helm.chart[].anchor / chartDirName / セルフサービス方式・自己申告方式 |
| ## タグ・バージョン管理関連 | 追跡ブランチ（BranchName） / タグ形式 / ParsedTag（TagName） / TagInfo / 打刻日時・ビルド日時 / 最新タグ / 反映済みタグ / タグ自動作成                                                                                                                                                                              |
| ## MR・GitLab操作関連       | MR（Merge Request） / 固定ブランチ / mrTargetBranch / オールオアナッシング / Group Access Token                                                                                                                                                                                                                     |
| ## 実行結果・処理単位関連   | 更新計画 / ImageTagUpdate / HelmTargetBranchUpdate / chartAndApps更新対象 / chartAndApps処理結果 / 実行結果                                                                                                                                                                                                         |
| ## 実行環境・運用関連       | Dry-runモード / TARGET_CHART・TARGET_UNITS / GitLab CI pipeline schedules・スケジュールパイプライン / renovateジョブ                                                                                                                                                                                                |
| ## その他の注記             | 「反映」「適用」「更新」の使い分け / gitlab-watari-dori                                                                                                                                                                                                                                                             |

## 設定・登録関連

### アプリ

- **英語識別子**: `AppConfig` / `app`
- **定義**: Helm chartでデプロイされる1つのアプリケーション単位。`config/<chart>/<unitPath>/config.yaml`の1エントリ（運用値＋chart構造）と、同じchartリポジトリの`registry.yaml`の対応するエントリ（タグ形式の台帳）を`projectId`で結合したもの。

### ソースリポジトリ

- **定義**: アプリのソースコードが置かれ、タグが打たれるGitLabプロジェクト。chartリポジトリ（後述）とは別のプロジェクトを指す。
- **表記ゆれ**: コード上は「ソースリポジトリ」に対応する専用の識別子がなく、chart側の`chartToUpdate.projectId`と同じ`projectId`という汎用フィールド名（`app.projectId`）が使われている。

### chartリポジトリ / chartAndApps

- **英語識別子**: `ChartAndApps`
- **定義**: 1つの`registry.yaml`（Helm chartを管理するGitLabプロジェクトの情報）と、そのプロジェクト配下で管理する全アプリ（`config.yaml`群）をまとめた集約単位。「chartリポジトリ」はこの集約が指すGitLabプロジェクトそのものを指し、「chartAndApps」は範囲がそれより広い（chartリポジトリの情報＋配下の全アプリ設定を束ねたもの）。並列処理やエラーハンドリングの粒度を説明する文脈（「chartリポジトリ間/chartAndApps内」等）ではこの範囲の違いが意味を持つ。日本語のプロースでも型名をそのまま`chartAndApps`と表記する。

### 設定ユニット

- **英語識別子**: `unitPath`（`ConfigUnitPath`ブランド型、`ChartAndApps`のフィールド）
- **定義**: 同一chartリポジトリ配下でアプリ設定を分割管理する単位。`config.yaml`を1つ持つディレクトリがそのまま1つの設定ユニットで、`unitPath`は`config/<chart>/`からそのディレクトリまでの相対パス（深さ1〜2のいずれか。深さ0と深さ3以上は設定エラー。詳細は`docs/requirements.md` 4.4節）。MRを作成する単位でもあり、固定ブランチ名`feature/yadokari/<unitPath>`の可変部にもなる。
- **`chartAndApps`との範囲の違い**: `ChartAndApps`は「1つの設定ユニット」の集約そのもの（`registry.yaml`の情報＋その設定ユニット配下の全アプリ設定）を指す型で、`unitPath`はその集約が`config/`のどこに置かれているかを表す1フィールド。「chartリポジトリ」は1つ上の粒度で、1つのchartリポジトリに複数の`ChartAndApps`（＝複数の設定ユニット）がぶら下がりうる。
- **入れ子の禁止**: `config.yaml`を持つディレクトリの配下にさらに`config.yaml`があると設定エラーになる。Gitのrefは directory/file conflict を起こすため、`feature/yadokari/a`と`feature/yadokari/a/b`は同一リポジトリに共存できない。逆にプレフィックス関係でなければ衝突しないので、深さ1と深さ2の設定ユニットは同じchartリポジトリ配下に混在できる。

### registry.yaml / config.yaml

- **英語識別子**: なし（ファイル名そのもの）
- **定義**: `config/<chart>/`配下に置く2つの設定ファイル。ファイルを分ける軸は
  「スコープ」（値が何の単位で決まるか）。`registry.yaml`はchartリポジトリ単位で、
  MRの作成先（`chartToUpdate`）と、ソースリポジトリのタグ形式の台帳（`appSpecs[].tagFormat`）を持つ。
  `config.yaml`は設定ユニット単位で、「どのプロジェクトのどのブランチを追跡するか」という
  運用値（`projectId`/`projectName`/`branchToSync`、Helmの向き先ブランチの値
  `helm.branchToSync`）と、「`values.yaml`のどこに書き込むか」というchart構造
  （`apps[].chart[]`、`helm.chart[]`）の両方を持つ。両者は`projectId`で対応付ける。
  `registry.yaml`側の各appは`projectId`に加えて`projectName`も重複して持ち、
  `ChartAndApps`（1設定ユニット分の集約）の読み込み時に`resolveProjectLinkage()`が
  両ファイル間の紐づけ（`config.yaml`の各appに対応するエントリが`registry.yaml`の`appSpecs[]`に
  あるか、`projectName`が食い違っていないか）を検証する。`registry.yaml`の`appSpecs[]`にだけ
  あってどの設定ユニットからも参照されないappはエラーにしない（そのchartリポジトリで
  一時的に更新対象から外している状態を許すため）。ファイルを2つに分ける軸の理由は
  `docs/architecture.md`「`config/`は「スコープ」で2ファイルに分け、変更頻度では分けない」節。

### chartToUpdate・appSpecs

- **英語識別子**: `chartToUpdate`（型は`ChartRepoConfig`）・`appSpecs`（要素の型は`AppSpec`）。いずれも`registry.yaml`のトップレベルキー。
- **定義**:
  - `chartToUpdate`: `projectId`・`projectName`・`mrTargetBranch`の3フィールドを持つ、chartリポジトリ共通の設定（`ChartAndApps.chart`フィールドの値になる）。
  - `appSpecs`: `projectId`・`projectName`・`tagFormat`の3フィールドを持つ配列要素。ソースリポジトリごとのタグ形式の台帳で、`projectId`をキーに`config.yaml`側の`apps[]`と結合する。
- **`registry.yaml`との関係**: 両ファイルの紐づけの検証（`resolveProjectLinkage()`）や、`appSpecs[]`にだけあってどの設定ユニットからも参照されないappを許容する挙動は「registry.yaml / config.yaml」の項を参照。

### valuesPath

- **英語識別子**: `valuesPath`
- **定義**: `config.yaml`内で、対象アプリが参照する`values.yaml`ファイルのパスを指すフィールド。

### AnchorTarget

- **英語識別子**: `AnchorTarget`（`valuesPath`・`anchorName`の2フィールドを持つ型）
- **定義**: `values.yaml`内の書き込み位置1箇所分を表す型。`apps[].chart[]`（イメージタグの書き込み先）と`helm.chart[]`（Helmの向き先ブランチの書き込み先）の両方がこの型を共有する（スキーマ側も`AnchorTargetSchema`を共有している）。各フィールドの意味は「valuesPath」「anchor（chart[].anchor）」の各項を参照。

### anchor（chart[].anchor）

- **英語識別子**: `anchorName`（型は`AnchorName`ブランド型、`AnchorTarget`のフィールド）。ただし
  `config.yaml`上のYAMLキー名は`anchor`のままで、`AnchorTargetSchema`（`src/lib/config/schema.ts`）
  の`.transform()`がキー`anchor`をフィールド`anchorName`に詰め替える
- **定義**: `values.yaml`内のイメージタグの位置をYAMLアンカー名で指す、`config.yaml`の
  `apps[].chart`配列の1要素が持つフィールド名。`variables: [&myAppVersion main, ...]`
  のように、配列要素にアンカーで名前を付けた構成のvalues.yamlを前提とする。1つのソース
  リポジトリでWebAPI/バッチ/デーモンなど複数のデプロイ単位を管理している場合は、`chart`配列に
  要素を複数指定し、それぞれ異なる`anchor`を持たせる。
- **補足**: `yaml`パッケージ（`src/lib/helm.ts`の`lookupValueAtAnchor`/`setValueAtAnchor`）がASTを
  `visit()`で走査し、アンカー名をノードのプロパティとして直接引く。値の位置指定として受け付ける
  のはYAMLアンカーだけ（理由は`docs/architecture.md`「`values.yaml` の位置指定はYAMLアンカーのみ、
  YAML処理は `yaml` パッケージ」節）。

### Helmの向き先ブランチ

- **英語識別子**: `helm.branchToSync`（config.yamlのフィールド名）/
  `ChartAndApps.helmTargetBranch: HelmTargetBranchConfig`（設定ユニット単位で持つコード上の型）
- **定義**: Helm chartは(1)`values.yaml`等のパラメータを定義するブランチ（既存の`mrTargetBranch`に相当）と、
  (2)そのパラメータを受け取ってk8sリソースを実際に構築するブランチの2種類で構成される、という前提のもと、
  後者を指すブランチ名。タグではなくブランチ名そのもので指定する。1つの設定ユニット内のapps全体で
  共通の1つの値であり、`config.yaml`のトップレベルフィールド`helm`（`apps:`配列と同階層、
  `branchToSync`と`chart`を持つ1件のオブジェクト。配列表記は使わない）として人間が直接
  書き換える。タグ形式のような自動生成・自動判定の仕組みは持たない。chartリポジトリが常に
  上記2ブランチ構成である以上、設定ユニットごとに1件書くのが常態なので`helm`は**必須**
  （省略は設定エラー）。更新したくない設定ユニットは現在の値と同じブランチ名を書けば差分が
  出ないので更新されない。
- **表記ゆれ**: config.yaml上のフィールド名は`helm.branchToSync`だが、これは`AppConfig.branchToSync`
  （追跡ブランチ、ソースリポジトリ側の別概念）とは無関係。同じフィールド名が異なる2つの意味で
  使われている点に注意。
- **HelmTargetBranchConfig**: `branchName`（向き先ブランチ名。`helm.branchToSync`由来）と
  `targets`（書き込み先の`valuesPath`＋`anchorName`の一覧。`helm.chart[]`のうち、設定ユニット内の
  いずれかのappが実際に書き込む`valuesPath`を指す要素だけになる。空もありうる）の2フィールドを
  持つ、設定ユニット単位の集約型。

### helm.chart\[\].anchor

- **英語識別子**: `anchorName`（型は`AnchorName`ブランド型、`AnchorTarget`のフィールド）。YAMLキー名は
  `anchor`のままで、`apps[].chart[].anchor`と同じ`AnchorTargetSchema`がキー`anchor`から
  フィールド`anchorName`への詰め替えを担う
- **定義**: 「Helmの向き先ブランチ」の値を`valuesPath`のどこに書き込むかを指す、
  `config.yaml`トップレベル`helm.chart`配列の各要素が持つフィールド。`apps[].chart[].anchor`と
  同様にYAMLアンカー名で位置を指定するが、書き込む値がタグではなくブランチ名である点が
  異なる。`apps[].chart[]`とは独立したリストで、app側に専用フィールドは持たせない。
  向き先ブランチは設定ユニット内のapps全体で共通なので、コード上もapp単位に振り分けず
  設定ユニット単位（`ChartAndApps`）で1つ持ち、書き込みもappのループの外で1回だけ行う
  （理由は`docs/architecture.md`「Helmの向き先ブランチはapp単位に振り分けず設定ユニット単位で持つ」節）。
- **制約**: そのconfig.yaml配下の全アプリの全`chart[].valuesPath`が同じ`config.yaml`の
  `helm.chart[]`でカバーされている必要がある（Helmの向き先ブランチは「1設定ユニット内のapps全体で
  共通」という前提のため、1つでもvaluesPathが漏れていると設定エラーになる）。`helm`自体の省略も、
  `helm.branchToSync`と`helm.chart[]`の片方だけの指定も設定エラー。

### chartDirName

- **英語識別子**: `chartDirName`（型は`ChartDirName`ブランド型、`ChartAndApps`のフィールド）
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

### タグ形式

- **英語識別子**: `tagFormat` / `TagFormat`（`AppConfig`のフィールド。ブランド型は`TagFormat`）
- **定義**: アプリ（ソースリポジトリ）ごとに`registry.yaml`の`appSpecs[]`で指定する、タグ名の読み方と
  作り方を表すテンプレート文字列。`{branch}`/`{date}`/`{time}`をそれぞれちょうど1回含み、
  並び順と区切り文字は自由。既定値は持たず必須。`validateTagFormat()`/`parseTag()`/
  `buildNewTag()`が扱う。仕様は`docs/requirements.md` 4.1節が正典。

### ParsedTag

- **英語識別子**: `ParsedTag`（`name: TagName`・`branchName: BranchName`・`builtAt: Date`の3フィールド）
- **定義**: タグ名を`tagFormat`でパースして読み取れる情報。タグ名そのもの（`name`）、タグ形式から
  読み取った追跡ブランチ名（`branchName`）、打刻日時（`builtAt`。詳細は「打刻日時 / ビルド日時」の
  項）をまとめた型。`parseTag()`/`findLatestParsedTag()`/`buildNewTag()`が返す。

### TagInfo

- **英語識別子**: `TagInfo`（`name: TagName`・`commitSha: CommitSha`の2フィールド）
- **定義**: GitLab上のタグ1件分の情報。名前とそのタグが指すコミットのSHAを持つ。`listTags()`が返す。

### 打刻日時 / ビルド日時

- **英語識別子**: `builtAt`（`ParsedTag`のフィールド）
- **定義**: タグ名に含まれる`yyyymmdd`/`hhmmss`部分が表す日時。JST（UTC+9固定）で組み立て・
  解釈する。HEADを指すタグが複数あるときに1件を選ぶ比較値でもある（**デプロイされる中身は
  どれも同じで、返す値を一意にするためだけの規則**）。

### 最新タグ

- **英語識別子**: `latestTag`
- **定義**: 追跡ブランチ由来のタグのうち、追跡ブランチの現在のHEADコミットを指しているもの
  （複数該当する場合はいずれも同じコミットを指すため中身は同じだが、決定性のためだけに
  上述の「打刻日時」が最も新しいものを選ぶ）。「追跡ブランチ由来」はタグ名が現在の
  `branchToSync`と`tagFormat`でパースできることで判定する。
  1件も見つからない場合は、新規作成されたタグがこれに当たる（後述の「タグ自動作成」）。
  判定の仕様は`docs/requirements.md` 4.1節が正典。

### 反映済みタグ

- **英語識別子**: `previousTagName`（型は`TagName`ブランド型、`ImageTagUpdate`のフィールド）
- **定義**: `values.yaml`に現在書かれているタグ。`AppConfig.imageTagTargets`の書き換え箇所（`AnchorTarget`）ごとに
  独立して読み取るため、1つのソースリポジトリでWebAPI/バッチ/デーモンなど複数のデプロイ単位を
  管理している場合、同一アプリ内でも箇所によって異なりうる（`AppUpdatePlan.updates[].previousTagName`）。
- **更新しない例外**: 反映済みタグが現在の追跡ブランチのHEADコミットを指している場合は、
  より新しい名前のタグが存在しても更新しない（デプロイされる中身が同じなのに差分だけが出る
  MRを作らないため）。ただし追跡ブランチを切り替えた直後は、切り替え前のタグ名が現在の
  追跡ブランチ由来としてパースできずこの例外に当てはまらないため、切り替え前後が同じ
  コミットを指していても更新される。

### タグ自動作成

- **定義**: 追跡ブランチの現在のHEADコミットを指す、追跡ブランチ由来のタグが1件も無い場合に、
  このCLI自身が追跡ブランチの最新コミットに対してタグ形式通りの新しいタグを作成する機能
  （`dryRun`のときは作成をスキップし名前の計算のみ行う）。タグ形式は`{time}`（`hhmmss`）を
  必ず含むため、生成するタグ名は秒単位で一意になり既存タグと衝突しない。
- **追跡ブランチを切り替えたときも特別扱いしない**: 切り替え先のHEADを指すタグがあれば
  それを再利用し、新しいタグは作らない。タグ名には追跡ブランチ名が含まれるため、そのタグを
  `values.yaml`に書けば追跡先が変わったことは名前から読み取れる。仕様は
  `docs/requirements.md` 4.1節が正典。

## MR・GitLab操作関連

### MR（Merge Request）

- **定義**: GitLab上のプルリクエストに相当する概念。1つのchartAndAppsにつき1つのMRを作成する。

### 固定ブランチ

- **英語識別子**: `buildFeatureBranch(unitPath)`（値は`feature/yadokari/<unitPath>`）
- **定義**: 1つのchartAndApps（`(chartリポジトリ, 設定ユニット)`単位）でMRを送るために使い回す固定ブランチ名。設定ユニットごとに異なる値になる。`unitPath`の`/`はそのままブランチ名の階層になるため、深さ2の設定ユニットでは`feature/yadokari/<第1セグメント>/<第2セグメント>`のように3階層のブランチ名になる。
- **入れ子の禁止との関係**: 設定ユニットの入れ子を禁止しているのは、この命名だとブランチ名が
  プレフィックス関係になりGitのrefが共存できなくなるため。
- **作り直し**: このブランチにオープン中のMRが無いことを確認したうえで、ブランチが残っていれば
  削除してから`mrTargetBranch`を起点に作り直す（`docs/requirements.md` 4.2節が正典）。

### mrTargetBranch

- **英語識別子**: `mrTargetBranch`（`ChartRepoConfig`のフィールド）
- **定義**: MRの作成先（ベースブランチ）を指定する`registry.yaml`の`chartToUpdate`のフィールド。

### オールオアナッシング

- **定義**: 同一chartAndApps内で1アプリでも処理が失敗した場合、成功した他アプリの分も含めてそのchartAndApps全体の更新を見送る方針。

### Group Access Token

- **英語識別子**: `ACCESS_TOKEN`
- **定義**: GitLab認証に使う、スコープを絞ったトークン。`read_api` + `write_repository` + MR作成権限の最小権限で運用する。

## 実行結果・処理単位関連

### 更新計画

- **英語識別子**: `AppUpdatePlan`
- **定義**: 1アプリ分の更新内容。最新タグが反映済みタグと異なる場合にのみ生成される。

### ImageTagUpdate

- **英語識別子**: `ImageTagUpdate`（`target: AnchorTarget`・`previousTagName: TagName`の2フィールド）
- **定義**: `AppConfig.imageTagTargets`のうち1箇所分の更新内容。`previousTagName`（反映済みタグ。
  詳細は「反映済みタグ」の項）は書き換え箇所（`target`）ごとに独立して読み取る。`AppUpdatePlan.updates`
  の要素になる。

### HelmTargetBranchUpdate

- **英語識別子**: `HelmTargetBranchUpdate`（`target: AnchorTarget`・`previousBranch: BranchName`・
  `newBranch: BranchName`の3フィールド）
- **定義**: Helmの向き先ブランチのうち1箇所分の更新内容。`previousBranch`は`values.yaml`側の現在値、
  `newBranch`は`config.yaml`の設定値。`ChartUpdateTarget.helmTargetBranchUpdates`の要素になる。

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
- **表記ゆれ**: 環境変数は`DRY_RUN`（UPPER_SNAKE_CASE）、コード内引数は`dryRun`（camelCase）と大文字小文字の表記が異なる（環境変数は大文字、コードは小文字という通常の慣習であり、実質的な不整合ではない）。

### TARGET_CHART・TARGET_UNITS

- **英語識別子**: 環境変数`TARGET_CHART`（型は`ChartDirName`）・`TARGET_UNITS`（型は
  `readonly ConfigUnitPath[]`。カンマ区切りで複数指定）
- **定義**: 通常は`config/`配下の全chartリポジトリ・全アプリを対象に実行するところを、
  絞り込んで実行するための環境変数。`TARGET_CHART`は`config/`直下のchartディレクトリ名を1つ
  指定してそのchartリポジトリのみを対象にし、`TARGET_UNITS`は`unitPath`（設定ユニット）を
  指定して該当する`config.yaml`のみを対象にする。両方を組み合わせた場合は両方に一致するものだけが
  対象になる。指定した`TARGET_CHART`、または`TARGET_UNITS`内の各`unitPath`が`config/`配下に
  1件も見つからない場合はエラーとして即時終了する（仕様は`docs/requirements.md` 4.5節が正典）。
- **表記ゆれ**: 環境変数は`TARGET_CHART`/`TARGET_UNITS`（UPPER_SNAKE_CASE）だが、`loadEnvConfig()`が
  読み取った後のフィールド名は`targetChart`/`targetUnits`（camelCase）になる。

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

同じ作者による類似の先行プロジェクト。本リポジトリの実装時に技術スタックのテンプレートとして参照された。「chartAndApps間は失敗しても他は継続するが、FatalErrorのときは即時中断する」という例外パターンの由来として`docs/architecture.md`「FatalErrorは後続ステップも止める」節で言及されている。要件定義書（`docs/requirements.md`/`docs/requirements-grilling.md`）には登場しない。
