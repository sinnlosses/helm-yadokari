# 設定ユニットは`versions.yaml`と`locations.yaml`に分け、appは`projectName`で参照する

設定ユニットのファイルを、よく触る値の`versions.yaml`（`helmBranchRef`・app名をキーにした`appBranchToSync`）と、
あまり触らない値の`locations.yaml`（`helm[]`・app名をキーにした`apps`）に分ける。
`0027-config-split-by-scope.md`が決めた「変更頻度では分けない」を、この判断で置き換える。
仕様（形・検証規則）は`docs/requirements.md` 4.4節が正典。

**0027が分けない理由の一番目にしていたのは、`projectId`と`projectName`を両方のファイルに
重複して書く手間だった。** 設定ユニット側のappを`projectName`をキーにしたマップで参照し、
`projectId`を`registry.yaml`の`appSpecs[]`にだけ書くことで、この重複が無くなった。
appの追加・削除で両ファイルを触る点は変わらないが、触る行はキー1つずつで済み、分けても
手数はほとんど増えない。一方、`appBranchToSync`と`helmBranchRef`だけを見たいとき・変えたいときに、
書き込み位置の細部（`valuesPath`・`anchor`）が邪魔にならない。0027の残る2つの理由（編集者が
分かれていない・1ファイルが十数行）は、分割を禁じるものではなく、分けない積極的な根拠にも
ならなくなった。

**`projectName`が参照の鍵になるので、同じ`registry.yaml`の中で一意にする。** 重複があると
設定ユニット側の名前から`appSpecs[]`の引き先が決まらない。代わりに、同じ`projectId`の重複と
`projectId`・`projectName`の食い違いの検証は要らなくなった（設定ユニット側に`projectId`が
無い）。

**設定ユニットは2ファイルがそろったディレクトリとする。** 片方だけのディレクトリは、
置き忘れか書きかけなので設定エラーにする。2ファイルのapp名のキー集合の一致と、各名前が
`appSpecs[]`にあることも設定エラーで検証する（「形」の検証。`0026`）。

0027のうち、`chart`の語をchartリポジトリ単位のファイルで使わない理由・`tagFormat`を
`registry.yaml`に置く理由・環境変数で与える案を採らなかった理由・`tagFormat`の食い違い検証は、
この判断でも変わらない。
