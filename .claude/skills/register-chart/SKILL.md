---
name: register-chart
description: 手元に clone した Helm chart リポジトリの values ファイル（YAMLアンカー）とディレクトリ構成から、`config/` の `registry.yaml`・`versions.yaml`・`locations.yaml` を下書きし、`pnpm lint:validate-config` を通すところまで進める。新しい chart ディレクトリ一式の生成と、既存の chart ディレクトリへの設定ユニット・app の追加の両方を扱う。ユーザーが「chart を登録したい」「config を生成したい」「新しい chart リポジトリを config/ に追加したい」「設定ユニットを足したい」「app を追加したい」「registry.yaml / versions.yaml / locations.yaml を書きたい」と言ったときは、「スキル」という言葉が無くても必ずこのスキルを使う。GitLab/GitHub の API は呼ばず、認証情報を扱わず、コミット・MR は作らない。
---

# register-chart

手元の chart リポジトリの clone を読み、`config/` の設定ファイルを下書きする。推測した値は
必ず表にしてユーザーに確認させてから書き出す。推測の誤り（アンカーの取り違え・app 名の
付け違い）は `pnpm lint:validate-config` では見つからないため、確認を省かない。

## しないこと

- GitLab/GitHub の API を呼ばない。トークン・`.env` を読まない
- clone 側のファイルを書き換えない（読むだけ。`git fetch` もしない）
- コミット・MR の作成をしない。書いて検証したところで止まり、差分をユーザーに渡す

## 始める前に

1. 設定ファイルの形式と制約を読む。スキーマはこのスキルに写していないので毎回ここから読む:

   ```bash
   sed -n '/^### 4.4 アプリの登録・設定/,/^#\{2,4\} /p' docs/requirements.md
   ```

   書き方の手本は `config.example/`（深さ1と深さ2の設定ユニット、1 app から複数 `valuesPath`
   への書き込み）。

2. clone のパスをユーザーに尋ねる（引数で渡されていればそれを使う）。

3. 既存の `config/*/registry.yaml` をすべて読む。`chart.projectName` が clone の
   ディレクトリ名、または `git -C <clone> remote get-url origin` のリポジトリ名と一致するものが
   あれば **追加**（下の「既存の chart ディレクトリへの追加」）、無ければ **新規生成**に進む。
   どちらに進むかをユーザーに告げる。候補が複数あって決まらなければ尋ねる。

## 共通: clone を読んで候補を出す

### 1. アンカーの一覧と分類

clone 内の `values*.yaml`（`.git/`・`node_modules/` は除く）から、スカラー値に付いたアンカー
（`&name value`）を集める。マッピング・シーケンスに付いたアンカーは本体が書き換えられないので
候補から外し、外したことを表に出す。

アンカーごとに、次の2つの根拠で分類する。

| 根拠   | イメージタグ（`apps`）                          | 向き先ブランチ（`helm[]`）                          |
| ------ | ----------------------------------------------- | --------------------------------------------------- |
| 今の値 | 8桁の数字と6桁の数字を含む（`{date}`・`{time}`） | ブランチ名らしい（`main`・`develop`・`release/...`） |
| 名前   | `Version`・`Tag` を含む                          | `Branch`・`TargetBranch`・`Ref` を含む               |

2つが一致したものだけを分類済みにする。食い違うもの・どちらにも当たらないものは **不明** に
置き、どちらとして使うか、登録しないかをユーザーに決めさせる（例: `&helmVersion develop` は
名前はタグ、値はブランチなので不明）。

イメージタグのアンカーには app 名の候補を付ける。アンカー名から `Version`・`Tag` とその後ろ
（`Extra` など）を落として kebab-case にする（`myAppVersion`・`myAppVersionExtra` → `my-app`）。
同じユニットのアンカーがそろって同じ接頭辞（`t2c1QaSprintVersion` と `t2c1DevelopClientVersion`
の `t2c1` など）で始まるなら、その接頭辞も落とす。同じ候補に落ちたアンカーは、1つの app の
複数の書き込み先としてまとめる。候補が既存の `apps[].projectName` の末尾と一致するとき
（`qa-sprint` と `sample-qa-sprint`）は、その既存の名前を候補にする。app 名はソース
リポジトリ名に揃えるのが既定なので、候補がリポジトリ名と違いそうなら実際の名前を尋ねる。

ユーザーには次の表を1つ見せ、分類と app 名を確かめてもらう。

| アンカー | valuesPath（clone のルートから） | 今の値 | 分類 | app 名の候補 |
| -------- | -------------------------------- | ------ | ---- | ------------ |

### 2. 設定ユニットの候補

values ファイルを持つディレクトリ1つを設定ユニット1つの候補にする。同じディレクトリにある
複数の values ファイル（`values.yaml` と `values-extra.yaml` など）は同じユニットにまとめる。

`unitPath` の候補は、そのディレクトリのパスから先頭の `charts/` を落とした残り。1〜2
セグメントならそのまま、3セグメント以上なら末尾2セグメントにする。`unitPath` は固定ブランチ
`feature/yadokari/<unitPath>` の名前になるだけなので、chart 側のパスと違う名前にしてよいと
添える。

ユーザーに見せる前に、候補ごとに次を調べて表に注記する。

- 深さが1〜2か
- 候補同士、または同じ chart ディレクトリの既存ユニットと入れ子・重複になっていないか
- Git の ref に使えない文字（空白・`..`・`~`・`^`・`:`・`?`・`*`・`[`・`\`）を含まないか
- ユニット内の values ファイルそれぞれに、向き先ブランチのアンカーが1つあるか（無い
  ファイルは `helm[]` が全 `valuesPath` をカバーできず lint で落ちる）

| ユニット候補（ディレクトリ） | 含む values ファイル | unitPath の候補 | 注記 |
| ---------------------------- | -------------------- | --------------- | ---- |

ユーザーはここで `unitPath` の変更、ユニットの統合、対象外にするユニットの除外を決める。

### 3. 値の既定を出す

推測した値は既定として示し、確認を取ってから使う。黙って採用せず、白紙でも尋ねない。

- `tagFormat`: 同じ `projectId` がどこかの `config/*/registry.yaml` にあればその値を使う
  （食い違いは設定エラーになるため推測より優先）。無ければ今のタグ値の8桁数字を `{date}`、
  6桁数字を `{time}`、残りのブランチ名にあたる部分を `{branch}` に置き換えて提案する
  （`main-build-at-20260101-000000` → `{branch}-build-at-{date}-{time}`）。8桁・6桁が
  見つからない値からは推測せずに尋ねる。
- `versions.yaml`の`apps`: 上の `tagFormat` でタグ値の `{branch}` 部分を取り出して提案する。タグの中では
  ブランチ名の `/` が `-` になるので、`release-x` が `release/x` の可能性があることを必ず添える。
- `versions.yaml`の`helm`: そのユニットの向き先ブランチのアンカーの今の値。今と同じ値なら差分が出ない。
  ユニット内のアンカー同士で今の値が違うときは、全部が同じ `versions.yaml`の`helm` に揃うことを伝えて
  1つ選ばせる。
- `config/` のディレクトリ名と `chart.projectName`: clone のディレクトリ名か remote の
  リポジトリ名。
- `mrTargetBranch`: `git -C <clone> symbolic-ref --short refs/remotes/origin/HEAD` の結果から
  `origin/` を落としたもの。取れなければ尋ねる。
- `group.name`: remote URL のパスからリポジトリ名を落としたもの。

ファイルから分からない値は尋ねる: `chart.projectId`（GitLab は数値。GitHub なら
remote URL の `owner/repo` を候補にしてよい）、`group.id`、`accessTokenEnv`（同じグループの
既存 chart ディレクトリがあればその値を候補にする）、新しい app の `projectId`。

## 新規生成

1. 上の「共通」の3段を順に行い、確認の済んだ値で `config/<chartディレクトリ名>/registry.yaml`
   と、ユニットごとの `versions.yaml`・`locations.yaml` を書く。
2. `locations.yaml` の `apps` と `versions.yaml` の `apps` は同じ app 名のキー集合にし、
   ユニットで使う app だけを書く。`registry.yaml` の `apps[]` には全ユニットの app を
   1件ずつ書く。
3. 新しい app の `projectId` が別の chart ディレクトリの `registry.yaml` にもあれば、その
   `projectName`・`tagFormat` に合わせる。`accessTokenEnv` が違うと設定エラーになる
   （1つの `projectId` は1つのトークンにしか結びつけられない）ので、書く前にユーザーに伝える。
4. 「書いたあとの検証」へ進む。

## 既存の chart ディレクトリへの追加

既存の `registry.yaml` を台帳として先に読み、そこに合わせる。既存ファイルは丸ごと書き直さず、
足す行だけを編集する（既存のコメントを消さない）。

1. 上の「共通」の1段目で、既存ユニットの `locations.yaml` にすでにある書き込み先
   （`valuesPath`+`anchor`）を候補から外してから表を見せる。
2. app 名の候補が既存の `apps[].projectName` と一致したら、その app の再利用を提案する。
   `projectId`・`tagFormat` は既存の値を使い、尋ねない。一致しない app だけを新しい app として
   扱い、`apps[]` の末尾に足す。
3. 名前の重複を書く前に解く。
   - 新しい app の `projectName` が既存と同じなのに別のソースリポジトリなら、別名を決めさせる
   - 新しい app の `projectId` が同じ `registry.yaml` に別名で既にあれば、既存の名前に寄せる
   - 新しい app の `projectId` が別の chart ディレクトリにあるときは、新規生成の3と同じ
4. 新しいユニットは新規生成と同じ形で足す。`unitPath` が既存ユニットと入れ子・重複に
   ならないことを「共通」の2段目で確かめておく。
5. 既存ユニットに app を足すときは、`versions.yaml` の `apps` と `locations.yaml` の
   `apps` の両方にキーを足す。app の `valuesPath` がそのユニットの `helm[]` に無ければ、
   `helm[]` にも足す。
6. 「書いたあとの検証」へ進む。

## 書いたあとの検証

1. `pnpm lint:validate-config` を実行し、`config OK` が出るまで直す。落ちたらエラー文の
   ファイル名・キーを読んで直し、打ち直す。
2. lint はアンカーが values ファイルに実在するかを見ないので、書いた `valuesPath`+`anchor` の
   組ごとに、clone 側のそのファイルに `&<anchor>` があることを `grep` で確かめる。
3. ユーザーに次を伝えて終える。
   - 書いた・変えたファイルの一覧（`git status --short config/`）
   - 実在チェック `pnpm lint:validate-config:remote` はトークンが要るため実行していないこと
     （GitLab 専用）
   - `accessTokenEnv` が新しい名前なら、CI/CD Variables への登録が要ること（`README.md`
     「複数グループで運用する」）
   - コミット・MR は作っていないこと
