# 検証の動詞は`validate`に統一し、`verify`は使わない

`validate`はこのコードベース全体の「検証する」の一般動詞で、`validateGitlabUrl()`（`lib/env.ts`）・
タグ形式の検証（`domain/tag-format.ts`）・スキーマ検証（`lib/config/schema.ts`）から
`.gitlab-ci.yml`のstage名（検証全般を指す）まで、層をまたいで使われている。**`validate`に
「形の検証だけ」のような狭い意味を割り当て直すことはできない**。

`verify`は使わない。隣り合う`scripts/lint/validate-config.ts`（CLI入口）と実在チェックで動詞が
違うと、どちらがどちらの一部なのかがファイル名から読めない。

実在チェックのディレクトリ名には`remote`を使う（`scripts/lint/remote-existence/`）。`--remote`オプション・pnpmスクリプトの
`lint:validate-config:remote`・CIジョブの`validate-config-remote`と語彙が揃い、**入口の
どのモードの実装なのかが名前で分かる**ため。
