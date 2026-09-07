# 現在の状態

最終更新: 2026-09-07（`undefined` の棚卸しから登録した T-095〜T-101 の7件をすべて完了し、
`docs/history/` へアーカイブした。`develop/tasks.json` は空）

T-001〜T-101 はすべて完了し、[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)
へ移した。過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

- **アーカイブ**: `develop/tasks.json` が33KBと基準（30KB）を超え、かつ全7件が `done` に
  なっていたため、T-095〜T-101 を `docs/history/` へ移した（`tasks.json` は `[]`）。
- **既定モデルを Sonnet に変更し、委譲の向きを反転**: `~/.claude/settings.json` の `model` を
  `opus` → `sonnet` に変更（ユーザー指示、全プロジェクトに適用）。これに伴い `difficulty` の
  振り分けを「`sonnet` はメインが自分で実行、`haiku`/`opus` はサブエージェントに委譲」へ
  反転させ、`docs/workflow.md`・`CLAUDE.md`・`.claude/skills/next-task/SKILL.md` を更新した。
- **`docs/architecture.md` に導線を追加**: 41KBあり、開くだけでコンテキストを大きく使うため、
  冒頭に節見出しの索引を置き、必要な節だけを読めるようにした。

## 次にやること

- **T-102〜T-104 の3件を登録した（全件 `todo`）**。いずれもユーザー指摘による品質の棚卸し。
  - **T-102（sonnet）**: `withAppContext()` が `build-plans` からしか使われていない件。他2ステップで
    アプリ単位のエラー文脈が本当に不要かを確認する。**`apply-updates/sub-steps/collect-mr-entries.ts`
    がプラン単位の非同期処理を持つ**（＝エラーにアプリ名が付かない）ことが調査で分かっており、
    ここが主な論点。結論次第で置き場所か冒頭コメントのどちらかを直す
  - **T-103（opus）**: コメントの基準の明確化と既存コードの追従。**基準自体は既に
    `docs/coding-standards.md`「コメント」節にあり**、問題はコードが追いついていないこと
    （本文3行以上のJSDocが `step-outcome.ts` に5個など）。「原則1〜2文」が厳しすぎるのか
    コードが悪いのかを先に決めるのが一番の判断どころ
  - **T-104（opus）**: テストの棚卸し（31ファイル336テスト・4516行）。テストを消すのは
    間違えても気づきにくいため、「不要・冗長」の判定基準と「不足」の見つけ方を先に決めてから
    着手する。量が読めないので分割して残りを再登録してよい
- T-103・T-104 は T-102 に依存させてある（T-102 が `step-outcome.ts` のコメントとテストに
  触りうるため、先に確定させる）。
- 前回まで（T-064以降）の実機未検証分は据え置き（下の「注意」参照）。

## 未解決

- なし

## 注意

- `config/` には実運用の登録だけを置く（架空の設定例を置くとCIの `validate-config-remote` が
  必ず失敗する）。記述例は `docs/requirements.md` 4.4節、実物に近いサンプルは `config-test/`
- `<名前>/<名前>.ts` の形（`src/lib/` の gitlab / config、`scripts/lint/verify-config/`）で
  統一している。同名のファイルとディレクトリを並べない（T-092/T-094 の命名判断に効く）
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている
- `src/lib/config/config.ts` に oxlint の `no-shadow` 警告が2件あるが、分割前からある既存の警告
  （`loadClientChartAndApps` の引数 `target` と、内側の `.map((target) => ...)`）
- リモートは `origin` が `github.com/sinnlosses/helm-yadokari` と
  `gitlab.com/sinnlosses-group/helm-yadokari` の2つの push URL を持つ。
  `git push`/`git fetch` は両方に対して行われる
- gitlab.com 上に検証用の `sinnlosses-group/yadokari-smoke-test-chart` プロジェクトが存在する
  （削除せず残置）
- T-064以降の変更（URL検証の追加・MR本文のURL解決の作り替え・`loadEnvConfig()` 化・
  values.yaml 下書きの受け渡しの作り替え・スモークスクリプトの環境変数追加）は実機未検証。
  検証が完全に終わったら、テスト用のGitLabアクセストークンを失効させる（ユーザー対応）
