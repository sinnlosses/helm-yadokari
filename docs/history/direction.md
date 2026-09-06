# 2026-09-06 ユーザーからの指示メモ

本ファイルは2026-09-06にユーザーが書いた指示（6項目）で、**全項目が対応済み**です。対応内容の詳細は同じディレクトリの [`tasks-archive.md`](./tasks-archive.md) と [`docs/architecture.md`](../architecture.md)「コードからは読み取れない設計判断」を参照してください。以下は当時の記述をそのまま残しています。

---

- 環境変数 TARGET_CLIENT は複数指定できる認識なので TARGET_CLIENTS に修正したほうが良さそう
- filter-targets で fatal なエラーが settled になってしまいそう。fatalなものは処理全体を落としてしまいたい
- try catch を少なく、あるいはどこで try catch を入れるかを決め打ちできないかを検討してほしい
  - fatal なものは処理を落とす、そうでないものは復帰してエラーとして計上する、これをいたるところで書くのを避けられるか、という課題
- 型の定義配置をリポジトリで統一感持たせたい。types/ディレクトリにあったり、filter-targetsのようにファイル内にあったり、build-plans/sub-steps/types.ts にあったりと一貫した設計方針がないのでブレている印象
- URLをstringで扱っている箇所があるように見え、URLインターフェースを使うなど型で縛ることを検討してください
- tasks.json と progress.mdをdevelop/ディレクトリを新しく作ってそこに配置してください(機能に関係ないファイルなので)
