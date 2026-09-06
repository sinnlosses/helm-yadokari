# config/

このディレクトリには、**実運用で更新対象にするアプリの登録**だけを置く。

- ディレクトリ構成とスキーマの正典は [`docs/requirements.md`](../docs/requirements.md) 4.4節
  （YAMLの記述例もそこにある）。セットアップ手順は [`README.md`](../README.md) の「設定」章
- 新しいアプリの登録は、このディレクトリへMRを送りレビュー後にマージするセルフサービス方式
- CIの `validate-config-remote` ジョブは、ここに書かれた projectId・ブランチ・valuesPath・
  アンカーがGitLab上に**実在するか**をMR時点で検証する（読み取りのみ）。そのため
  ドキュメント用の架空の設定例はここに置かない（置くと全MRが必ず落ちる）。
  登録が0件のあいだ、このジョブは検証対象なしでパスする
- 実GitLabに対する手動スモークテスト用のフィクスチャは `config-test/` にある
  （`CONFIG_PATH=config-test` で使う。CIからは参照されない）
