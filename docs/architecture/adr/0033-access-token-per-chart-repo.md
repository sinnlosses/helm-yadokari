# アクセストークンはchartリポジトリ単位に宣言し、`ProjectId`で振り分ける

複数チーム（＝複数グループ）が1つの`config/`を共用するため、トークンは**グループごとに1本**の
Group Access Tokenにし、どれを使うかを`registry.yaml`の`accessTokenEnv`（環境変数名）で
chartリポジトリごとに宣言する。1回の実行が複数のトークンで動き、各トークンは自分のグループにしか
届かないので、1本漏れても他グループのchartリポジトリへはpushできない。仕様（フィールドの
必須・名前の制約・設定エラーの条件）は`docs/requirements.md` 4.4節、失敗の波及範囲は
同4.3節が正典で、ここには**なぜその形なのか**と**どのファイルが何を担うか**だけを書く。

**宣言は必須にする。** 任意にして「書かなければどのグループにも属さない広い権限のトークンを
使う」という経路を残すと、書き漏らしたchartリポジトリが黙って権限の広いほうへ流れる。
`config/`は各チームがMRを送るセルフサービス方式なので、書き漏れはMRのレビュー頼みにせず設定
エラーで落とす。既存の`validateAccessTokenEnvConsistency()`が弾けるのは「同じ`projectId`が
別々の`accessTokenEnv`に結びつく」ケースだけで、新規chartの単なる書き漏れは素通りしていた。
必須化の動機はここであって、「誤ったトークンで叩いてしまう」ではない（宣言したトークンが
読めないときは`Route.kind === "missing"`で失敗するので、別のトークンで叩く経路は元から無い）。

**`config/`には環境変数名だけを書き、トークンの値は書かない。** `config/`は各チームがMRを送る
セルフサービス方式なので、値を書けばリポジトリに平文の秘密が入る。名前を
`^ACCESS_TOKEN_[A-Z0-9_]+$`に限るのも同じ理由で、任意の名前を書けると`RENOVATE_TOKEN`のような
無関係なCI/CD変数をCLIに読み出させる経路になる（MRのレビューだけに頼らない）。検証は
`toAccessTokenEnvName()`（`domain/brand.ts`）に封じ込め、ブランド型`AccessTokenEnvName`を
作れるのはこの関数だけにする。

**型の置き場所**: `accessTokenEnv`は`registry.yaml`のトップレベルのフィールドなので
`RegistryYamlSchema`（`src/lib/config/schema.ts`）に必須フィールドとして足し、`ConfigUnit`
（`src/domain/types.ts`）へ`readonly accessTokenEnv: AccessTokenEnvName`として載せる。
`ChartRepoConfig`（`chartToUpdate`の写し）には入れない — トークンは`chartToUpdate`への書き込みと
`appSpecs[]`の読み取りの両方に効く`registry.yaml`全体のスコープの値だから。宣言された名前の
一覧（`accessTokenEnvNames`）は`LoadedConfig`（`src/lib/config/config.ts`）に足す。chartリポジトリ
横断のグローバルな値を持たせるためにこの型を残してあり、これがその最初の1つになる。

**トークンはschedule変数ではなくプロジェクトのCI/CD変数（Masked）に置く。** pipeline scheduleの
変数はマスクできない（GitLab側の未解決issue）ため、schedule側に置くと出力に混ざった瞬間に
そのまま読める。「このスケジュールはこのグループだけ」と変数で絞れそうに見えるが、マスクを
捨てる代償のほうが大きい。

**読み込みの順序**: `loadEnvConfig()`は`config/`を読む前に走るので、宣言された名前のトークンは
config読み込みのあとに読む。`loadConfig()`が`LoadedConfig.accessTokenEnvNames`（実行対象の
設定ユニットが宣言した名前の一覧）を返し、`src/lib/env.ts`の`loadAccessTokens()`がその名前だけを
`process.env`から読んで`ReadonlyMap<AccessTokenEnvName, AccessToken>`にする。**`process.env`に
触れるのは`src/lib/env.ts`だけ**という規約は変えず、読み取りの入口が`loadEnvConfig()`と
`loadAccessTokens()`の2つになる（`docs/coding-standards.md`「環境変数」とCLAUDE.mdは
「`src/lib/env.ts`の関数（`loadEnvConfig()`・`loadAccessTokens()`）を通す」と書いてある）。
`TARGET_CHART`で絞れば、読むトークンもそのchartリポジトリの分だけになる。未設定の名前は
`loadAccessTokens()`では失敗させずに表から落とす（1グループの付け替え漏れを実行全体の失敗に
しないため。扱いは下の401と同じ）。

**`EnvConfig`はアクセストークンを持たない。** CLIが読むトークンは`accessTokenEnv`で宣言された
`ACCESS_TOKEN_<グループ>`だけで、`loadEnvConfig()`が読む値ではなく`loadAccessTokens()`が
config読み込みのあとに引く値になる。宣言された環境変数がすべて未設定でトークンが1本も読めない
ときは、`createTokenRoutedAdapter()`が組み立て時に例外を投げて即時終了する（`config/`の読み込み
エラーと同じ経路。どのchartリポジトリがどの環境変数を要求しているかを並べる）。代表となる
アダプタが無いと`isFatalError()`等を載せられないためで、chartリポジトリ単位の`ERROR`に
落とせるのは他に1本でも読めるトークンがあるときだけ。

**振り分けは`src/lib/platform/token-routed-adapter.ts`の`createTokenRoutedAdapter()`が担い、`steps/`は
触らない。** `PlatformAdapter`の各関数は第1引数に`ProjectId`を取るので、「`ProjectId`から**そのプロジェクトを
読めるトークンのアダプタ**を引き当てて委譲するだけの`PlatformAdapter`」を1枚かぶせれば、stepからは
今までどおり1つのアダプタに見える。

**振り分ける軸はトークンであって、GitLab/GitHubの違いではない。** プラットフォームは`env.platform`で
実行ごとに1つに決まる（`main.ts`の`createPlatformAdapter()`）ため、表に並ぶアダプタは全部同じ
プラットフォームのもの。それでも複数あるのは、上の「グループごとに1本」という権限分離の要件が先に
あり、トークンが分かれるとクライアントも分かれるから（gitbeakerの`new Gitlab({ host, token })`も
Octokitの`new Octokit({ auth })`もコンストラクタでトークンを受け取る形で、この点は両プラットフォーム
同じ）。**GitHub対応が無かったとしてもこの振り分けは要る。**

設定ユニットごとにアダプタを配って持ち回る形は取れない。`resolveTags`が設定ユニットをまたいで
タグ解決を重複排除する（ソースリポジトリ×追跡ブランチ×タグ形式の単位に畳む）ため、呼ぶ時点で
「どの設定ユニットの分か」が決まっていない。引けるのは`ProjectId`だけ。

- 引数は`(configUnits, adapters)`。`adapters`は宣言された名前ごとの`PlatformAdapter`を引く
  `ReadonlyMap<AccessTokenEnvName, PlatformAdapter>`（表が1つだけになったので、専用の型で包まず
  Mapのまま渡す）。GitLab/GitHubの選択は`main.ts`の`createPlatformAdapter(env, accessToken)`に残す（`lib/platform/`は`lib/gitlab/`・`lib/github/`を
  importしない、を保つため）
- 組み立て時に`configUnits`から`ProjectId`→アダプタの表を作る。`chartToUpdate.projectId`と、
  そのchartリポジトリの`appSpecs[]`の`projectId`が同じトークンに結びつく
- `buildTagUrl`・`buildCompareUrl`・`isFatalError`・`extractHttpStatus`の4つは`ProjectId`を
  取らず、どのトークンのアダプタでも同じ実装なので振り分けない（表の先頭のものをそのまま載せる）

**`withCachedReads()`は振り分けの外側に重ねる**（`withCachedReads(createTokenRoutedAdapter(...))`）。
キャッシュのキーは`ProjectId`で、1つの`projectId`は1つのトークンにしか結びつかない（後述の検証が
保証する）ため、外側に1つ持てば足りる。逆順（トークンごとにキャッシュで包んでから振り分ける）に
すると、`runProcess()`が持つ「バッチ1回＝キャッシュ1つ」という寿命の宣言がトークンの数だけ
分かれてしまう。

**1つの`projectId`が2つのトークンに結びつく構成は設定エラーにする。** 判定は
`src/lib/config/validate.ts`の`validateAccessTokenEnvConsistency()`が持ち、`loadConfig()`が
`validateTagFormatConsistency()`の隣で呼ぶ。chartリポジトリをまたぐ整合性という同じ性質で、
GitLabに問い合わせずローカルのYAMLだけで分かる＝「形」の検証なので、`pnpm lint:validate-config`
でもMR時点で止まる。最新タグの解決は`(ソースリポジトリ, 追跡ブランチ, タグ形式)`単位に1回だけ
行い、読み取りのキャッシュも`projectId`をキーに持つので、同じ`projectId`に2つの答えがある状態は
そもそも表現できない。振り分けアダプタはこの検証を通ったあとの`configUnits`だけを受け取る。

**401は、そのchartリポジトリの`ERROR`に落とす。** 読み替えるのは`createTokenRoutedAdapter()`が
包んだ呼び出しの中（`lib/<プラットフォーム>/`のリトライの外側、
`withAppContext()`より内側）で、`errors.ts`側には置かない — `isFatalError()`に見えるのは例外だけで、
どのトークンで呼んだかを知らないため。委譲先のアダプタが投げた例外の`extractHttpStatus()`が
401なら、HTTPの構造を持たない素の`Error`（メッセージにchartディレクトリ名・環境変数名・`HTTP 401`を
載せる）に替えて投げ直す。こうすると`isFatalError()`は自然に偽になり、`settleAsError()`がその設定
ユニットを`ERROR`として記録して他のchartリポジトリは続く。`FatalError`へ昇格させるかの判定を
2箇所に増やさないための形で、`rethrowWithAppContext()`がさらに包んでも（`cause`を1段しか
辿らないため）結果は変わらない。宣言した環境変数が未設定だったときも同じく素の`Error`を投げる。
5xx・ネットワーク障害はそのまま上がって`FatalError`になる（プラットフォーム側の
障害であってトークンの問題ではないため）。この読み替えでログの`httpStatus`は`undefined`になる
（`HTTP 401`はメッセージ側に残る）。

**`validate-config --remote`はトークンごとに分解する。** `scripts/lint/validate-config.ts`が設定
ユニットを`accessTokenEnv`でグループ分けし、グループごとに`createClient()`と
`validateRemoteExistence()`を呼んで問題を連結する。`validateRemoteExistence()`の引数は変えない
（`RemoteCache`もグループごとに分かれるが、`projectId`は1つのトークンにしか属さないので同じ
問い合わせが二重になることはない）。本体と違って、必要なトークンが1本でも未設定ならそこで失敗
させる（どのchartリポジトリがどの環境変数を要求しているかを全件並べる）。このジョブの目的は
「このMRをマージしてよいか」の判定で、検証できなかったchartリポジトリがある状態を成功にすると、
存在しないアンカー・ブランチがそのままマージされてしまう。

採らなかった案:

- **設定ユニット単位（`config.yaml`）での宣言**: トークンの権限はグループ＝chartリポジトリ側の
  性質で、設定ユニットごとには変わらない。`tagFormat`を`registry.yaml`に置いたのと同じ理由
- **`appSpecs[]`ごと・`projectId`ごとの宣言**: 表現力は上がるが、同じ`projectId`に2つのトークンが
  結びつく構成を招く（上のとおり解決の重複排除とキャッシュが成り立たなくなる）
- **1本のトークンにまとめ、CLI側でグループを判別する**: グループとプロジェクトの対応をAPIで
  引く必要があるうえ、「1本漏れると全グループへ届く」という採らなかった前提そのものが残る
