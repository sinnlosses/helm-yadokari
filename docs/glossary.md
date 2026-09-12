# 用語集

このツール（helm-yadokari）で使われる業務ドメイン固有の用語を、日本語表記・対応するコード上の識別子（型名・関数名など）・定義の3点でまとめたもの。オンボーディング時の用語辞典として、また既存ドキュメント/コード間の表記ゆれを把握する目的で作成した。

**方針**:

- ここに載っているのは*業務ドメイン用語*のみ。`lib/`/`steps/`/`utils/`の配置基準や`settled`/`toApply`のようなパイプライン内部の制御語彙は対象外（`docs/architecture.md`を参照）
- **各エントリは今の姿だけを書く。** もう使っていない名前・採らなかった案・直したあとの不具合といった経緯は載せない（設計判断の経緯は`docs/architecture.md`、当時の記録は`docs/history/`が正典）。今の挙動の制約・前提は経緯ではないのでここに書く
- 表記ゆれが見つかったものは、**改名するか据え置くかを決めて結論を書く**。据え置いたものは「現状こう呼ばれている」という事実に加えて、据え置いた理由も各エントリに残す（理由が無いと、読むたびに同じ検討をやり直すことになる）
- 対応する英語識別子が無い用語も、`docs/requirements.md`・`README.md`・`docs/architecture.md`で使われている日本語の業務用語であれば載せる（その場合は英語識別子欄を省略する）

## このファイルの読み方

### このファイルは通読しない

20KB超あるため、頭から全部読むとそれだけでコンテキストを大きく消費する。**知りたい用語は
下の索引で1つ特定し、その見出しだけ**を次の形で読む:

```bash
sed -n '/^### 固定ブランチ/,/^#\{2,4\} /p' docs/glossary.md
```

見出しに `[` を含むもの（`### helm.locations\[\].anchor`・`### anchor（locations[].anchor）`）は、
`[` の手前までを指定すれば同じ形で引ける（例: `/^### helm\.locations/`）。

### 用語の索引

| 節                          | 収録している用語                                                                                                                                                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ## 設定・登録関連           | アプリ / ソースリポジトリ / chartリポジトリ / 設定ユニット（ConfigUnit） / registry.yaml・config.yaml / chartToUpdate・appSpecs / valuesPath / 書き込み位置（AnchorLocation） / anchor（locations[].anchor） / Helmの向き先ブランチ / helm.locations[].anchor / chartディレクトリ名 / セルフサービス方式 |
| ## タグ・バージョン管理関連 | 追跡ブランチ（BranchName） / タグ形式 / タグの読み取り結果（ParsedTag） / GitLab上のタグ（TagInfo） / 打刻日時 / 最新タグ / 反映済みタグ / タグ自動作成                                                                                                                                                  |
| ## MR・GitLab操作関連       | MR（Merge Request） / 固定ブランチ / mrTargetBranch / オールオアナッシング / Group Access Token                                                                                                                                                                                                          |
| ## 実行結果・処理単位関連   | アプリ更新計画 / イメージタグの更新 / 向き先ブランチの更新 / 設定ユニット更新対象 / 設定ユニット処理結果 / 実行結果                                                                                                                                                                                      |
| ## 実行環境・運用関連       | Dry-runモード / TARGET_CHART・TARGET_UNITS / pipeline schedules                                                                                                                                                                                                                                          |
| ## その他の注記             | 「target」の意味は文脈で決まる / 「反映」「適用」「更新」の使い分け                                                                                                                                                                                                                                      |

## 設定・登録関連

### アプリ

- **英語識別子**: `AppConfig` / `app`
- **定義**: Helm chartでデプロイされる1つのアプリケーション単位。`config/<chart>/<unitPath>/config.yaml`の1エントリ（運用値＋chart構造）と、同じchartリポジトリの`registry.yaml`の対応するエントリ（タグ形式の台帳）を`projectId`で結合したもの。

### ソースリポジトリ

- **定義**: アプリのソースコードが置かれ、タグが打たれるGitLabプロジェクト。chartリポジトリ（後述）とは別のプロジェクトを指す。
- **表記ゆれ**: コード上は「ソースリポジトリ」に対応する専用の識別子がなく、chart側の`chartToUpdate.projectId`と同じ`projectId`という汎用フィールド名（`app.projectId`）が使われている。

### chartリポジトリ

- **定義**: Helm chartを管理するGitLabプロジェクトそのもの。1つの`registry.yaml`が対応する。1つのchartリポジトリ配下に複数の設定ユニット（`ConfigUnit`）がぶら下がりうる。並列処理やエラーハンドリングは`(chartリポジトリ, 設定ユニット)`の組単位で行う。

### 設定ユニット

- **英語識別子**: `ConfigUnit`（集約。`registry.yaml`の情報＋その設定ユニット配下の全アプリ設定をまとめた型）・`unitPath`（`ConfigUnitPath`ブランド型、`ConfigUnit`のフィールドで、`config/`のどこに置かれているかを表す）
- **定義**: 同一chartリポジトリ配下でアプリ設定を分割管理する単位。`config.yaml`を1つ持つディレクトリがそのまま1つの設定ユニットで、`unitPath`は`config/<chart>/`からそのディレクトリまでの相対パス（深さ1〜2のいずれか。深さ0と深さ3以上は設定エラー。詳細は`docs/requirements.md` 4.4節）。MRを作成する単位でもあり、固定ブランチ名`feature/yadokari/<unitPath>`の可変部にもなる。
- **入れ子の禁止**: `config.yaml`を持つディレクトリの配下にさらに`config.yaml`があると設定エラーになる。Gitのrefは directory/file conflict を起こすため、`feature/yadokari/a`と`feature/yadokari/a/b`は同一リポジトリに共存できない。逆にプレフィックス関係でなければ衝突しないので、深さ1と深さ2の設定ユニットは同じchartリポジトリ配下に混在できる。

### registry.yaml / config.yaml

- **英語識別子**: なし（ファイル名そのもの）
- **定義**: `config/<chart>/`配下に置く2つの設定ファイル。ファイルを分ける軸は
  「スコープ」（値が何の単位で決まるか）。`registry.yaml`はchartリポジトリ単位で、
  MRの作成先（`chartToUpdate`）と、ソースリポジトリのタグ形式の台帳（`appSpecs[].tagFormat`）を持つ。
  `config.yaml`は設定ユニット単位で、「どのプロジェクトのどのブランチを追跡するか」という
  運用値（`projectId`/`projectName`/`branchToSync`、Helmの向き先ブランチの値
  `helm.branchName`）と、「`values.yaml`のどこに書き込むか」というchart構造
  （`apps[].locations[]`、`helm.locations[]`）の両方を持つ。両者は`projectId`で対応付ける。
  `registry.yaml`側の各appは`projectId`に加えて`projectName`も重複して持ち、
  `ConfigUnit`（1設定ユニット分の集約）の読み込み時に`resolveProjectLinkage()`が
  両ファイル間の紐づけ（`config.yaml`の各appに対応するエントリが`registry.yaml`の`appSpecs[]`に
  あるか、`projectName`が食い違っていないか）を検証する。`registry.yaml`の`appSpecs[]`にだけ
  あってどの設定ユニットからも参照されないappはエラーにしない（そのchartリポジトリで
  一時的に更新対象から外している状態を許すため）。ファイルを2つに分ける軸の理由は
  `docs/architecture.md`「`config/`は「スコープ」で2ファイルに分け、変更頻度では分けない」節。

### chartToUpdate・appSpecs

- **英語識別子**: `chartToUpdate`（型は`ChartRepoConfig`）・`appSpecs`（要素の型は`AppSpec`）。いずれも`registry.yaml`のトップレベルキー。
- **定義**:
  - `chartToUpdate`: `projectId`・`projectName`・`mrTargetBranch`の3フィールドを持つ、chartリポジトリ共通の設定（`ConfigUnit.chartRepo`フィールドの値になる）。
  - `appSpecs`: `projectId`・`projectName`・`tagFormat`の3フィールドを持つ配列要素。ソースリポジトリごとのタグ形式の台帳で、`projectId`をキーに`config.yaml`側の`apps[]`と結合する。
- **`registry.yaml`との関係**: 両ファイルの紐づけの検証（`resolveProjectLinkage()`）や、`appSpecs[]`にだけあってどの設定ユニットからも参照されないappを許容する挙動は「registry.yaml / config.yaml」の項を参照。
- **YAMLキー`chartToUpdate`と型名`ChartRepoConfig`で語幹が違う理由**: `docs/architecture.md`
  「`config/`は「スコープ」で2ファイルに分け、変更頻度では分けない」が、型名のうちドメイン語彙に
  当たるものはYAMLのキー名に追随させないと決めている。キーが`chartToUpdate`になっても、型が
  表すものは「chartリポジトリの設定」のままなので`ChartRepoConfig`を据え置く。

### valuesPath

- **英語識別子**: `valuesPath`
- **定義**: `config.yaml`内で、対象アプリが参照する`values.yaml`ファイルのパスを指すフィールド。

### 書き込み位置

- **英語識別子**: `AnchorLocation`（`valuesPath`・`anchorName`の2フィールドを持つ型。スキーマは`AnchorLocationSchema`）
- **定義**: `values.yaml`内の書き込み位置1箇所分を表す型。`apps[].locations[]`（イメージタグの書き込み先）と`helm.locations[]`（Helmの向き先ブランチの書き込み先）の両方がこの型を共有する（スキーマ側も`AnchorLocationSchema`を共有している）。各フィールドの意味は「valuesPath」「anchor（locations[].anchor）」の各項を参照。
- **`Anchor`と`Location`の両方を名前に持つ理由**: `Location`が「1箇所分の位置」という役割を、`Anchor`が「その位置をYAMLアンカーで指す」という手段を担う。手段を落とすと`src/lib/helm.ts`の`lookupValueAtAnchor()`/`setValueAtAnchor()`と語が繋がらなくなる。

### anchor（locations[].anchor）

- **英語識別子**: `anchorName`（型は`AnchorName`ブランド型、`AnchorLocation`のフィールド）。ただし
  `config.yaml`上のYAMLキー名は`anchor`のままで、`AnchorLocationSchema`（`src/lib/config/schema.ts`）
  の`.transform()`がキー`anchor`をフィールド`anchorName`に詰め替える
- **定義**: `values.yaml`内のイメージタグの位置をYAMLアンカー名で指す、`config.yaml`の
  `apps[].locations`配列の1要素が持つフィールド名。`variables: [&myAppVersion main, ...]`
  のように、配列要素にアンカーで名前を付けた構成のvalues.yamlを前提とする。1つのソース
  リポジトリでWebAPI/バッチ/デーモンなど複数のデプロイ単位を管理している場合は、`locations`配列に
  要素を複数指定し、それぞれ異なる`anchor`を持たせる。
- **補足**: `yaml`パッケージ（`src/lib/helm.ts`の`lookupValueAtAnchor`/`setValueAtAnchor`）がASTを
  `visit()`で走査し、アンカー名をノードのプロパティとして直接引く。値の位置指定として受け付ける
  のはYAMLアンカーだけ（理由は`docs/architecture.md`「`values.yaml` の位置指定はYAMLアンカーのみ、
  YAML処理は `yaml` パッケージ」節）。

### Helmの向き先ブランチ

- **英語識別子**: `helm.branchName`（config.yamlのフィールド名）/
  `ConfigUnit.helmTargetBranch: HelmTargetBranchConfig`（設定ユニット単位で持つコード上の型）
- **定義**: Helm chartは(1)`values.yaml`等のパラメータを定義するブランチ（既存の`mrTargetBranch`に相当）と、
  (2)そのパラメータを受け取ってk8sリソースを実際に構築するブランチの2種類で構成される、という前提のもと、
  後者を指すブランチ名。タグではなくブランチ名そのもので指定する。1つの設定ユニット内のapps全体で
  共通の1つの値であり、`config.yaml`のトップレベルフィールド`helm`（`apps:`配列と同階層、
  `branchName`と`locations`を持つ1件のオブジェクト。配列表記は使わない）として人間が直接
  書き換える。タグ形式のような自動生成・自動判定の仕組みは持たない。chartリポジトリが常に
  上記2ブランチ構成である以上、設定ユニットごとに1件書くのが常態なので`helm`は**必須**
  （省略は設定エラー）。更新したくない設定ユニットは現在の値と同じブランチ名を書けば差分が
  出ないので更新されない。
- **`AppConfig.branchToSync`（追跡ブランチ）との関係**: YAMLキー名は`helm.branchName`と
  `apps[].branchToSync`で別々になっており、コード側も`HelmTargetBranchConfig.branchName`と
  `AppConfig.branchToSync`で名前が分かれている。指しているものも別（前者はk8sリソースを
  構築するブランチ、後者はタグを探す追跡ブランチ）で、混同しない。
- **HelmTargetBranchConfig**: `branchName`（向き先ブランチ名。`helm.branchName`由来）と
  `locations`（書き込み先の`valuesPath`＋`anchorName`の一覧。`helm.locations[]`のうち、設定ユニット内の
  いずれかのappが実際に書き込む`valuesPath`を指す要素だけになる。空もありうる）の2フィールドを
  持つ、設定ユニット単位の集約型。

### helm.locations\[\].anchor

- **英語識別子**: `anchorName`（型は`AnchorName`ブランド型、`AnchorLocation`のフィールド）。YAMLキー名は
  `anchor`のままで、`apps[].locations[].anchor`と同じ`AnchorLocationSchema`がキー`anchor`から
  フィールド`anchorName`への詰め替えを担う
- **定義**: 「Helmの向き先ブランチ」の値を`valuesPath`のどこに書き込むかを指す、
  `config.yaml`トップレベル`helm.locations`配列の各要素が持つフィールド。`apps[].locations[].anchor`と
  同様にYAMLアンカー名で位置を指定するが、書き込む値がタグではなくブランチ名である点が
  異なる。`apps[].locations[]`とは独立したリストで、app側に専用フィールドは持たせない。
  向き先ブランチは設定ユニット内のapps全体で共通なので、コード上もapp単位に振り分けず
  設定ユニット単位（`ConfigUnit`）で1つ持ち、書き込みもappのループの外で1回だけ行う
  （理由は`docs/architecture.md`「Helmの向き先ブランチはapp単位に振り分けず設定ユニット単位で持つ」節）。
- **制約**: そのconfig.yaml配下の全アプリの全`locations[].valuesPath`が同じ`config.yaml`の
  `helm.locations[]`でカバーされている必要がある（Helmの向き先ブランチは「1設定ユニット内のapps全体で
  共通」という前提のため、1つでもvaluesPathが漏れていると設定エラーになる）。`helm`自体の省略も、
  `helm.branchName`と`helm.locations[]`の片方だけの指定も設定エラー。

### chartディレクトリ名

- **英語識別子**: `chartDirName`（型は`ChartDirName`ブランド型、`ConfigUnit`のフィールド）
- **定義**: `config/`配下でchartリポジトリに対応するディレクトリ名。ログ出力等で人間向けラベルとして使われる。

### セルフサービス方式

- **定義**: 各チームがこのCLIリポジトリの`config/`へMRを送り、レビュー後マージすることで新しいアプリを登録する運用フロー。

## タグ・バージョン管理関連

### 追跡ブランチ

- **英語識別子**: `branchToSync` / `BranchName`
- **定義**: アプリごとに設定する、最新タグの判定対象とするソースリポジトリ側のブランチ。
- **表記ゆれ**: 要件定義の初期検討段階（`docs/requirements-grilling.md`）では「追跡対象ブランチ」という表記もあったが、確定版の`docs/requirements.md`では「追跡ブランチ」に統一されている。
- **`apps[].branchToSync`という名前を据え置く理由**: YAMLキーとコード上のフィールド名（`AppConfig.branchToSync`）が
  一致しており、「YAMLキーと型フィールドで語幹を違えない」という規約に違反していない。`helm.branchName`とは
  キー名が異なるため、同じキー名を別の意味に使う衝突も無い。

### タグ形式

- **英語識別子**: `tagFormat` / `TagFormat`（`AppConfig`のフィールド。ブランド型は`TagFormat`）
- **定義**: アプリ（ソースリポジトリ）ごとに`registry.yaml`の`appSpecs[]`で指定する、タグ名の読み方と
  作り方を表すテンプレート文字列。`{branch}`/`{date}`/`{time}`をそれぞれちょうど1回含み、
  並び順と区切り文字は自由。既定値は持たず必須。`validateTagFormat()`/`parseTag()`/
  `buildNewTag()`が扱う。仕様は`docs/requirements.md` 4.1節が正典。

### タグの読み取り結果

- **英語識別子**: `ParsedTag`（`name: TagName`・`branchName: BranchName`・`taggedAt: Date`の3フィールド）
- **定義**: タグ名を`tagFormat`でパースして読み取れる情報。タグ名そのもの（`name`）、タグ形式から
  読み取った追跡ブランチ名（`branchName`）、打刻日時（`taggedAt`。詳細は「打刻日時」の
  項）をまとめた型。`parseTag()`/`findLatestParsedTag()`/`buildNewTag()`が返す。

### GitLab上のタグ

- **英語識別子**: `TagInfo`（`name: TagName`・`commitSha: CommitSha`の2フィールド）
- **定義**: GitLab上のタグ1件分の情報。名前とそのタグが指すコミットのSHAを持つ。`listTags()`が返す。
- **`ParsedTag`と型名の付け方が非対称な理由**: `TagInfo`はGitLab APIが返した生のタグ情報、
  `ParsedTag`はそれを`tagFormat`で解釈した結果で、持っている情報も出どころも別物。
  接尾辞（`〜Info`）と接頭辞（`Parsed〜`）が揃っていないこと自体が、この2つを取り違えないための
  情報になっているため据え置く。

### 打刻日時

- **英語識別子**: `taggedAt`（`ParsedTag`のフィールド）
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
- **`currentTag`と対にして改名しない理由**: `latestTag`は`currentTag`（反映済みタグ）と前後で対になる
  値ではなく、追跡ブランチのHEADが指す先という独立したドメイン概念（追跡ブランチを切り替えれば
  実体も変わる）。`current`という修飾語の命名基準を持ち込む理由が無い。

### 反映済みタグ

- **英語識別子**: `currentTag`（型は`TagName`ブランド型、`ImageTagUpdate`のフィールド）
- **定義**: `values.yaml`に現在書かれているタグ。`AppConfig.imageTagLocations`の書き換え箇所（`AnchorLocation`）ごとに
  独立して読み取るため、1つのソースリポジトリでWebAPI/バッチ/デーモンなど複数のデプロイ単位を
  管理している場合、同一アプリ内でも箇所によって異なりうる（`AppUpdatePlan.updates[].currentTag`）。
- **改名しない理由**: 「反映」の語はvalues.yaml側の意味に一本化済み（「「反映」「適用」「更新」の
  使い分け」の項を参照）で、この用語自体は既に正確（改名不要）。
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

- **定義**: GitLab上のプルリクエストに相当する概念。1つの設定ユニットにつき1つのMRを作成する。

### 固定ブランチ

- **英語識別子**: `buildFeatureBranch(unitPath)`（値は`feature/yadokari/<unitPath>`）
- **定義**: 1つの設定ユニット（`(chartリポジトリ, 設定ユニット)`単位）でMRを送るために使い回す固定ブランチ名。設定ユニットごとに異なる値になる。`unitPath`の`/`はそのままブランチ名の階層になるため、深さ2の設定ユニットでは`feature/yadokari/<第1セグメント>/<第2セグメント>`のように3階層のブランチ名になる。
- **入れ子の禁止との関係**: 設定ユニットの入れ子を禁止しているのは、この命名だとブランチ名が
  プレフィックス関係になりGitのrefが共存できなくなるため。
- **作り直し**: このブランチにオープン中のMRが無いことを確認したうえで、ブランチが残っていれば
  削除してから`mrTargetBranch`を起点に作り直す（`docs/requirements.md` 4.2節が正典）。
- **日本語「固定ブランチ」と識別子`buildFeatureBranch`が対応しない理由**: 日本語は「MRを送るたびに
  使い回す、名前が一意に決まる」という性質を言っており、英語（`feature/`という接頭辞）は
  ブランチ命名規約の接頭辞を言っている。別のことを言っているので無理に語を揃えない。

### mrTargetBranch

- **英語識別子**: `mrTargetBranch`（`ChartRepoConfig`のフィールド）
- **定義**: MRの作成先（ベースブランチ）を指定する`registry.yaml`の`chartToUpdate`のフィールド。
- **改名しない理由**: GitLabがMRのベースブランチを指して使う語そのものなので、独自の言い換えはしない。

### オールオアナッシング

- **定義**: 同一設定ユニット内で1アプリでも処理が失敗した場合、成功した他アプリの分も含めてその設定ユニット全体の更新を見送る方針。

### Group Access Token

- **英語識別子**: `ACCESS_TOKEN`
- **定義**: GitLab認証に使う、スコープを絞ったトークン。`read_api` + `write_repository` + MR作成権限の最小権限で運用する。

## 実行結果・処理単位関連

### アプリ更新計画

- **英語識別子**: `AppUpdatePlan`
- **定義**: 1アプリ分の更新内容。最新タグが反映済みタグと異なる場合にのみ生成される。

### イメージタグの更新

- **英語識別子**: `ImageTagUpdate`（`location: AnchorLocation`・`currentTag: TagName`の2フィールド）
- **定義**: `AppConfig.imageTagLocations`のうち1箇所分の更新内容。`currentTag`（反映済みタグ。
  詳細は「反映済みタグ」の項）は書き換え箇所（`location`）ごとに独立して読み取る。`AppUpdatePlan.updates`
  の要素になる。
- **`location`という短いフィールド名にする理由**: `docs/architecture.md`「用途別の型エイリアスを
  作らない」の但し書き（包含する型名・キー名が用途を与えている場合は、フィールド名で用途を
  繰り返さなくてよい）による。`ImageTagUpdate.location`は型名が「イメージタグの更新」という
  用途を与えているため、`AnchorLocation`という型の語をそのまま繰り返さない。
  `HelmTargetBranchUpdate.location`も同じ。

### 向き先ブランチの更新

- **英語識別子**: `HelmTargetBranchUpdate`（`location: AnchorLocation`・`currentBranch: BranchName`の2フィールド）
- **定義**: Helmの向き先ブランチのうち1箇所分の更新内容。`currentBranch`は`values.yaml`側の現在値。
  新しい値は`ConfigUnit.helmTargetBranch.branchName`（`config.yaml`の設定値）からその都度取るため、
  `HelmTargetBranchUpdate`自体は新しい値のフィールドを持たない。`ConfigUnitUpdateTarget.helmTargetBranchUpdates`
  の要素になる。
- **`location`という短いフィールド名にする理由**: 「イメージタグの更新」の項を参照
  （`ImageTagUpdate.location`と同じ理由）。
- **`BranchName`型なのに`Name`が付かない理由**: `docs/architecture.md`「ブランド型のフィールド名は、
  修飾語があれば型の語を落とし、無ければ持つ」により、`current`という修飾語が既に
  「どちらのブランチか」を語っているため`Name`を足さない。`ImageTagUpdate.currentTag`も同じ理由。

### 設定ユニット更新対象

- **英語識別子**: `ConfigUnitUpdateTarget`
- **定義**: 差分が確定し、実際にコミット・MR作成の対象になった1件分の更新内容（対象を表す`configUnit`フィールド＋複数の`AppUpdatePlan`＋書き換え済みファイル一覧）。

### 設定ユニット処理結果

- **英語識別子**: `ConfigUnitUpdateResult`（`"CREATED"` / `"SKIPPED"` / `"ERROR"`）
- **定義**: 1つの設定ユニットの処理結果を表す3値。
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
- **`TARGET_UNITS`という名前を据え置く理由**: 環境変数はCIの手動実行時に人が値を直接打ち込む
  外部インターフェースであり、絞り込みを担う内部の関数名・型名の改名に追随させる理由が無い。

### pipeline schedules

- **定義**: このCLIの実行トリガー。GitLab CIのスケジュール実行機能を指す、GitLabの機能名そのもの。GitLabに存在しない語順の日本語訳は作らず、英語表記のまま使う。

## その他の注記

### 「target」の意味は文脈で決まる

`target`という語は次の4つの意味で使われている。**いずれも改名せず据え置くと決めている**
（ユーザー判断）。1語を1意味に絞るより、包含する型名・キー名が用途を与えているほうを優先する。

| 使われ方                                            | 意味                   | 据え置く理由                                                                |
| --------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `mrTargetBranch`                                    | MRのベースブランチ     | GitLabがMRのベースブランチを指して使う語そのもの。独自の言い換えはしない    |
| `helmTargetBranch`                                  | Helmの向き先ブランチ   | 「向き先」を表す語で、包含する`helm`が主語を与えている                      |
| `ConfigUnitUpdateTarget`                            | 更新対象の設定ユニット | 「対象」の意味。`TARGET_CHART`・`filterTargets()`と同じ使い方で一貫している |
| `TARGET_CHART` / `TARGET_UNITS` / `filterTargets()` | 処理対象の絞り込み     | 同上                                                                        |

**書き込み位置1箇所分を表す型だけは`target`を使わず`AnchorLocation`と呼ぶ。** アンカーは
値の位置を**どう指すか**という識別の手段でしかなく、「何のための位置か」という用途を
答えていない。`docs/architecture.md`「1つの語を2つの意味に使ってよいのは、包含する型名・
キー名が用途を与える場合だけ」の但し書きは用途を語る修飾語にしか効かないため、この型だけは
多義でない`Location`を使う。

### 「反映」「適用」「更新」の使い分け

**これら3つの動詞はいずれも、`values.yaml`への書き込み（このツールのスコープ内）を指す。**
3語の間に厳密な使い分けは無く、混在していてよい。コード上は`applyUpdates()`/`apply-updates.ts`/
`toApply`のように「適用」に対応する英語`apply`が使われている。

**クラスタ側は「デプロイ」と書き、「反映」とは書かない。** `helm upgrade`の実行はこのツールの
スコープ**外**で（`docs/requirements.md` 2.2節）、同じ語を内外に使うと読者がどちらの話か
判断できなくなるため。
