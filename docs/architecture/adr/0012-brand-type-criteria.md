# ブランド型にするのは「同じ`string`の別物と取り違えうる識別子」

数を増やすほどブランド型の定義は重くなるので、基準は「その値が別の識別子と**同じ型の式に
並ぶ**か」に置く。並ばないただの文字列（エラーメッセージ・ログの本文など）はブランド型にしない。
並ぶ値を素の`string`のままにすると、TypeScriptは別物同士の比較を通してしまう（両方が
ブランド型なら重なりが無いものとして`TS2367`で弾かれる）。

生成は必ずfactory関数（`toProjectId`等）を通す。形式の検証を付けるかは値ごとに決めてよい
（外部から受け取った値をそのまま比較するだけなら不要）。

ローカルのファイルシステムパス（`config/`配下のディレクトリ・`registry.yaml`・`versions.yaml`・`locations.yaml`など、
`readFileSync`・`existsSync`・`readdirSync`に渡る値）は`LocalPath`にする。`join()`で
`ConfigUnitPath`（識別子）と同じ式に並ぶため、この基準に該当する。GitLab上のパスを表す
`ValuesPath`（chart内での相対パス）とは別の型で、`LocalPath`にはしない。パスの種類ごとに
ブランドを分けることはせず、ローカルパス全体で`LocalPath`1つにまとめる。

例外は**不変条件を型で表す場合**で、`ConfigRootPath`（`LocalPath`の部分型）だけがこれに当たる。
種類が違うから分けているのではなく、「cwd配下であることを検証済み」という性質を型に載せるため。
`toConfigRootPath()`が唯一の生成経路なので、未検証のパスが`loadConfig()`に渡ることはコンパイル時に
弾かれ、`loadConfig()`と`env.ts`の双方に検証を置く必要がなくなる（`toPlatformUrl()`と同じ作法）。
部分型にしているのは`join()`・`listSubdirectories()`へ変換なしで渡すため。
`src/utils/`（`fs.ts`・`yaml.ts`）はドメインを知らない側にあるので
（→「新しいコードを置く場所」の2軸の表）、そちらの引数は素の`string`のまま据え置く。
