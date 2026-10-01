# YAMLのキーを受けるコードの名前はキー名をそのまま使う

`config/`のYAMLのキーを受けるコード側の型・フィールドは、YAMLのキー名に合わせる（ユーザー判断）。
`0027-config-split-by-scope.md`が決めた「ドメイン語彙に当たる型名はYAMLのキー名に追随させない」を、
この判断で置き換える。YAMLのキーそのものの仕様は`docs/requirements.md` 4.4節が正典。

YAMLのキーは次の形にする（ユーザー判断）。

- `registry.yaml`: `accessTokenEnv`・`group.id`/`group.name`・`chart`・`apps[]`
- `versions.yaml`: `helm`（Helmの向き先ブランチ名）・`apps.<app名>`（追跡ブランチ名）
- `locations.yaml`: `helm[]`・`apps.<app名>[]`（どちらも`valuesPath`+`anchor`の配列）

`helm`と`apps`は1つのキー名が、ファイルによって値・書き込み先・台帳と別の中身を持つ。YAMLは
それをファイルで区別している。そのため、コードの1つの型の中ではキー名をそのまま写せない位置があり、
次の3つの規則で名前を決める。

**規則A: YAMLのオブジェクトのキーを1対1で受けるフィールドは、キー名と同じ綴りにする。** 語幹を
揃えるだけでなく綴りも同じにする。YAMLからコードへ詰め替えるたびに名前が変わると、YAMLを見て
コードを探すときに読み替えが要るため。この規則は`0013-brand-field-naming.md`（修飾語が無ければ
型の語を持つ）と、`0016-one-word-two-meanings.md`の`chartRepo`の項より優先する。
`AnchorLocation.anchor: AnchorName`・`ConfigUnit.chart`はこの規則による。

**規則B: YAML上に名前が無い位置は、どのファイル由来かで名前を揃える。** `versions.yaml`の値と
`locations.yaml`の配列には写す名前が無いので、コード側の命名規約で決める。

- `locations.yaml`由来の書き込み先の配列は`locations`にする（`HelmConfig.locations`・
  `AppConfig.locations`）。`helm[]`と`apps.<app名>[]`は同じ形で、YAMLは親キーだけで区別している。
  コードでも親の型が用途を与えるので、`0016`の但し書き（包含する型名が用途を与えるなら短い名前で
  よい）が効く
- `versions.yaml`由来のブランチ名は`HelmConfig.branchRef`・`AppConfig.branchToSync`のままにする。
  `branch`だけにすると`0013`に反し、両方を`branchName`に揃えると「向き先」と「追跡」の区別が
  コードから消える（`docs/glossary.md`「Helmの向き先ブランチ」）。さらに`branchToSync`は
  YAMLの写しではない`TagSource`へ、`branchRef`は`HelmBranchRefUpdate`の語幹へ広がっていて、
  改名がYAMLとの境界の外まで波及する

**規則C: YAMLのキーの塊1つを写すドメイン型は`<キーの単数形>Config`と呼ぶ**（`HelmConfig`・
`AppConfig`・`ChartConfig`・`GroupConfig`）。同じキー名がファイルごとに別の中身を持つときは、
3ファイルを結合したドメイン型が素の名前を取り、1ファイルだけの写し（`lib/config/schema.ts`の
スキーマ定数と`z.infer`の型）にファイル名を接頭辞として付ける（`RegistryYamlSchema`と同じ付け方）。
`registry.yaml`の`apps[]`の1要素は`projectId`・`projectName`・`tagFormat`だけの部分で、appとして
完結するのは`projectName`で結合したあとなので、素の`AppConfig`は結合後の側に渡す。

## 対応表

改名するもの:

| YAMLの位置                               | 旧識別子                                    | 新識別子                                    | 規則 |
| ---------------------------------------- | ------------------------------------------- | ------------------------------------------- | ---- |
| `registry.yaml`の`chart`                 | `ChartRepoConfig`（型）                     | `ChartConfig`                               | C    |
| `registry.yaml`の`chart`                 | `ConfigUnit.chartRepo`                      | `ConfigUnit.chart`                          | A    |
| `registry.yaml`の`apps[]`の要素          | `AppSpecSchema`（定数）・`AppSpec`（型）    | `RegistryAppSchema`・`RegistryApp`          | C    |
| `registry.yaml`の`group`                 | `ConfigUnit.groupId`/`ConfigUnit.groupName` | `ConfigUnit.group: GroupConfig`（新しい型） | A・C |
| `registry.yaml`の`group.id`/`group.name` | （上の2フィールド）                         | `GroupConfig.id`/`GroupConfig.name`         | A    |
| `locations.yaml`の`anchor`               | `AnchorLocation.anchorName`                 | `AnchorLocation.anchor`                     | A    |
| `locations.yaml`の`apps.<app名>[]`       | `AppConfig.imageTagLocations`               | `AppConfig.locations`                       | B    |

改名したフィールドを受ける作業用の型・変数（`load-config-unit.ts`の`ChartRepoScope`の
`groupId`/`groupName`、`appSpecByName`、変数・引数の`appSpecs`/`appSpec`）は、表に合わせて
`group`・`registryAppByName`・`registryApps`/`registryApp`にする。

改名しないもの:

| 識別子                                                                             | 理由                                                                             |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `ConfigUnit.apps`・`ConfigUnit.helm`・`ConfigUnit.accessTokenEnv`                  | 既にキーと同名                                                                   |
| `HelmConfig`・`AppConfig`・`AnchorLocation`・`AnchorLocationSchema`・`GroupSchema` | 規則Cの形に既に合っている。`AnchorLocation`は配列の要素で、写すキー名が無い      |
| `HelmConfig.branchRef`・`HelmConfig.locations`・`AppConfig.branchToSync`           | 規則B                                                                            |
| `GroupId`・`GroupName`・`GroupIdSchema`・`GroupNameSchema`                         | キーの写しではなくブランド型の名前                                               |
| `TagSource.branchToSync`・`HelmBranchRefUpdate`とその系列                          | YAMLの写しではない                                                               |
| `ConfigUnitReport.chartProjectName`                                                | YAMLの写しではなく、実行ログの出力項目でもある                                   |
| `ChartRepoScope`（`lib/config/load-config-unit.ts`）                               | `chart`キーではなく、`registry.yaml`1つ分（chartリポジトリ単位）のスコープを指す |
| 関数の引数名`anchorName`（`lib/helm.ts`など）                                      | `0013`は引数を対象外にしている                                                   |
| `ValidateContext.groupId`・`remote-cache.ts`の引数`groupId`                        | 実在チェックの作業用の型・引数で、YAMLの写しではない                             |
| `scripts/smoke/provision-group.ts`の`groupId`/`groupName`                          | GitLabのグループ作成APIの値で、`ConfigUnit`とは無関係                            |

## `0027`から置き換えるもの

- 「同じキー名を2つの意味に使わない（同名別義）」。`helm`・`apps`がファイルごとに別の中身を持つ形を
  ユーザーが選び、区別はファイルが担う
- 「chartリポジトリ単位のファイル側では`chart`という語を使わない」。キーが`chart`になった
- 「コード側の識別子は外部ファイル形式の写しかどうかで追随を決める」。規則Aに置き換える

「YAMLキーと型フィールドで語幹を違えない」と「日本語の項目名とYAML・型の語の不一致は翻訳であって
違反ではない」は引き続き有効。`docs/glossary.md`の日本語の見出し語（「chartリポジトリ」「追跡ブランチ」
「Helmの向き先ブランチ」「書き込み位置」）は変えず、「英語識別子」欄を、規則AでYAMLとコードが同名に
なる箇所は1つにまとめ、規則Bの位置は「YAMLの位置 → コードのフィールド」の組で書く。
