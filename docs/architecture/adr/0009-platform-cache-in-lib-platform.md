# PlatformAdapterへの問い合わせのキャッシュは`lib/platform/`に列挙し、バッチ単位で1つ持ち回る

実行1回（バッチ）を通して使い回す読み取りは`lib/platform/cached-reads.ts`の`CachedReads`に
**列挙したものだけ**がキャッシュされる（明示的なオプトイン）。`runProcess()`が
`withCachedReads(adapter)`を1回だけ呼び、返した`PlatformAdapterWithCachedReads`（`adapter`に
`cached: CachedReads`を1つ足しただけの値）を全stepへ引数で渡す。包む相手はトークンの振り分け
アダプタ（`createTokenRoutedAdapter()`）の戻り値で、キャッシュは常にその**外側**に重ねる
（`docs/architecture/adr/0033-access-token-per-chart-repo.md`）。キャッシュが必要になるたびに
その場で工場関数を書く形だと、新しい問い合わせを足す人がキャッシュの要否を毎回自分で
気づく必要があり、素の関数を呼ぶほうが常に書きやすいぶん抜けるほうへ倒れる。

**キャッシュ済みの読み取りを`PlatformAdapter`に入れ子にする。** `adapter`とバッチキャッシュを
別の値として持ち回ると、生とキャッシュ済みのどちらを呼んでいるかが変数名でしか読めない。
`branchExists`は生・キャッシュ済みの両方が要る唯一のメンバーで
（`submitMergeRequest()`は固定ブランチの削除と再作成をまたぐため`adapter.branchExists`を、
`stageHelmBranchRefUpdate()`はバッチ中不変な向き先ブランチの実在確認なので
`adapter.cached.branchExists`を呼ぶ）、`.cached`の有無で呼び出し箇所に読み取り経路が出る。
渡す値は1つだが、`.cached`を使わない関数（`filterTargets`・`submitMergeRequest`・
`buildMrContent`・`resolveTags`・`resolveLatestTag`・`stageImageTagUpdates`等）は宣言する型を素の
`PlatformAdapter`のままにし、使う関数だけ`PlatformAdapterWithCachedReads`を宣言する。
`PlatformAdapterWithCachedReads`は`PlatformAdapter`の交差型なので前者は後者にそのまま代入できる。

**新しい`PlatformAdapter`への問い合わせを足すときの判断**:

1. その読み取りの値が、バッチ中に**このツール自身の書き込み**（`createTag`・`commitFileUpdates`・
   `createMergeRequest`・ブランチ削除）で変わるか。変わるなら載せず、`PlatformAdapter`の生の関数を
   直接呼ぶ。`listTags`（`createTag`で変わる）・`openMergeRequestExists`（`createMergeRequest`で
   変わる）・固定ブランチを作り直すときの存在確認（`submitMergeRequest()`。削除と再作成をまたぐ）がこれに当たる
2. 変わらないなら`CachedReads`にメンバーを1つ足す。キーは引数から機械的に組み立てられる
   ので手書きしない。読み取りごとに`Map`を分けてあるため、別の読み取りとのキー衝突も起きない
3. **複数のAPI呼び出しとドメイン判定にまたがる「解決結果」はここに載せない。** `lib/platform/`は
   ドメイン判定を知らない。最新タグの解決は`listTags`＋`getBranchHeadSha`＋タグ作成とその判定の
   組で**副作用を含む**ため、キャッシュではなくstep（`resolveTags`）として軸の交差を明示する（前節）

なお、**厳密には値が変わりうるが載せてよい読み取りもある**。`getLatestPipelineForRef`は
このツールが作ったタグに後からパイプラインが現れうるが、MR本文への参考情報でしかなく、
同じタグについて設定ユニットごとに違う答えを載せるほうが困る。判断が上の1に収まらないときは、
そのメンバーのJSDocに載せた理由を書く。

採らなかった案:

- **`createClient()`の戻り値にキャッシュを含める（キャッシュ付きクライアント）**: `GitlabClient`・
  `GithubClient`はgitbeaker/Octokitのインスタンス型そのもので、包むと`lib/gitlab/`・`lib/github/`
  の全関数の第1引数の意味が変わる。生の呼び出しとキャッシュ付きの呼び出しの区別が
  `.client`/`.cache`というアクセス経路に化け、**stepの引数として見えなくなる**。キャッシュの
  寿命もクライアントの寿命に固定され、`createClient()`を使う`scripts/`（キャッシュ不要、
  あるいは別寿命の`newRemoteCache`を持つ）にも付いてくる
- **stepごとにキャッシュを作る**: 今キャッシュしたい読み取りはたまたまstepをまたがないが、
  寿命の宣言がstepごとに散り、またぐ読み取りが出たときに気づけない。バッチの寿命を知っているのは
  `runProcess()`だけなので、生成もそこに置く
- **`utils/`に`CachedReads`そのものを置く**: どの読み取りがバッチ中に変わらないかは
  プラットフォーム固有の知識なので、原則2で`lib/`。`utils/cache.ts`にあるのは技術非依存の
  メモ化（`getOrFetchShared()`・引数からキーを組み立てて読み取り1つをキャッシュ付きにする
  `cacheByArgs()`）だけで、`scripts/lint/remote-existence/remote-cache.ts`も同じものを使っている

`getOrFetchShared()`は「未キャッシュ」の判定に`undefined`を使う（`V extends {}`）ため、
`cacheByArgs()`は値を箱に入れてから載せる。これで`CachedReads`の`getFileContent`・
`getLatestPipelineForRef`のように`undefined`を返す読み取りも、メンバーごとに独自の箱を
作らずそのまま載せられる。

**キャッシュと下書きは別の層として重ねる。** values.yamlは設定ユニット単位の下書き
（`ValuesYamlDraft`）で書き換えを持ち回るが、下書きに無いときの読み込みだけはこのキャッシュを
通す。キャッシュが返すのは常にプラットフォーム上の元の内容で、書き換え後の内容は
`writeValuesYamlDraft()`が下書きにしか積まないため、同じ`valuesPath`を指す別の設定ユニットへ
書き換えが漏れることはない（`docs/requirements.md` 4.2節の既知の制限にあたる構成でも、
読み込みは1回で済む）。キャッシュを`lib/platform/`の読み取り単位に置いたことで、この分離は
作りから自動的に決まる。

**単一の読み取りの重複排除はキャッシュの外に置かない。** 呼び出し側で`new Set`などで一意化すると、
その重複排除は1回の呼び出しの中だけに閉じていて、バッチ全体を見るキャッシュと役割が二重になる。
web URLの解決が単数の`getProjectWebUrl()`だけなのはこのため。
**副作用を含む解決の重複排除は逆にキャッシュへ寄せない**（前節）。一意化をどちらに置くかは
「速度のためか、正しさのためか」で分かれる。
