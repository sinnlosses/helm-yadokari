# config/

このディレクトリには、**pipeline schedule の定期実行で更新対象にするアプリの登録**を置く。
`CONFIG_ROOT_PATH` を省略したときに読まれる既定のディレクトリで、CIの `validate-config-remote` が
検証する対象でもある。

- ディレクトリ構成とスキーマの正典は [`docs/requirements.md`](../docs/requirements.md) 4.4節
  （YAMLの記述例もそこにある）。セットアップ手順は [`README.md`](../README.md) の「設定」章
- 新しいアプリの登録は、このディレクトリへMRを送りレビュー後にマージするセルフサービス方式
- CIの `validate-config-remote` ジョブは、ここに書かれた projectId・ブランチ・valuesPath・
  アンカーがGitLab上に**実在するか**をMR時点で検証する（読み取りのみ）。そのため
  ドキュメント用の架空の設定例はここに置かない（置くと全MRが必ず落ちる）

## 手動スモークテストの対象もここに置く

実GitLabに対する手動スモークテスト（[`docs/smoke-test.md`](../docs/smoke-test.md)）が使う
chartリポジトリと、定期実行が更新するchartリポジトリは**同じものを使う**。したがって
スモーク用のフィクスチャも専用ディレクトリに分けず、このディレクトリに置く。

分けない理由:

- 同じGitLabプロジェクト・同じ`values.yaml`のアンカーを2つのディレクトリから登録すると、
  **完全な二重管理**になる。固定ブランチ名は設定ユニット単位（`feature/yadokari/<unitPath>`）
  なので、両方に同じ設定ユニットがあると定期実行とスモーク実行が同じブランチを奪い合い、
  `submitMergeRequest` の「固定ブランチが残っていたら削除して作り直す」挙動と
  スモークの後片付け（接頭辞一致でブランチを削除する）が互いのMRを壊す
- 分けている限り、**既定パス（`CONFIG_ROOT_PATH` 未指定）は実機で一度も通らない**。
  ここに置けば定期実行もスモークも同じ経路を通り、CIの `validate-config-remote` も
  空ディレクトリではなく実在の設定を検証するようになる

## パス5（複数グループ）用のフィクスチャは常設しない

[`docs/smoke-test.md`](../docs/smoke-test.md) パス5（複数グループ・複数トークン）の
2グループ目（chartリポジトリB）は、上の「分けない」判断とは別に、**検証のときだけ`config/`へ
置き、確認後に削除する**。既存のchartリポジトリ1・2（パス1〜4）は繰り返し使う回帰的な
フィクスチャなので常設しているが、パス5は「別グループ・別トークンが独立して動く」ことを
一度確かめれば足りる検証であり、常設すると`validate-config-remote`と定期実行が常に
2つ目のグループのGitLabリソース・トークン（`ACCESS_TOKEN_SMOKE_B`）を要求し続け、
そのグループのトークンを他と同じように失効前に更新し続けるコストだけが増える。

2グループ目のGitLab側のリソース（グループ・chartリポジトリB・ソースリポジトリ・
Group Access Token）自体の作成は `scripts/smoke/smoke-fixture.ts` ではなく
`scripts/smoke/provision-group.ts` に隔離してある。既存プロジェクトへは書き込まず、
新規リソースしか作らない（`--group-path`が既に存在すれば何もせず中止する）。手順は
`docs/smoke-test.md`「2グループ目（パス5）に必要なもの」参照。

## 登録が0件のときの挙動

`loadConfig()` は `TARGET_CHART` / `TARGET_UNITS` を指定していない限り、対象0件でも
エラーにしない。したがって登録が0件のあいだは `validate-config-remote` も定期実行も
**何もせずに成功する**。これは意図した挙動で、0件を設定エラーとして落とす仕組みは入れない
（登録が入るまでCIが赤のままになり、赤に慣れて本物の失敗を見逃すほうが害が大きいため）。
そのぶん、**「CIが緑であること」は登録内容が正しいことを意味しない**点に注意する。

## `config/` を変えたら `test/main.e2e.test.ts` も直す

`test/main.e2e.test.ts` は実物の `config/` を読み、projectId ごとの fake 応答で全設定ユニットが `SUCCESS` になることを
検証する。chart や app を足す・`accessTokenEnv` を宣言すると、fake にそのプロジェクトの応答を足し、宣言した環境変数を
テスト内で設定しないと `pnpm check` が落ちる（`docs/smoke-test.md`「パス5」の CI 実測を参照）。
