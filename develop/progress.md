# 現在の状態

最終更新: 2026-09-07（`undefined` の棚卸しから登録した T-095〜T-101 の7件をすべて完了し、
`docs/history/` へアーカイブした。`develop/tasks.json` は空）

T-001〜T-101 はすべて完了し、[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)
へ移した。過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

- **アーカイブ**: `develop/tasks.json` が33KBと基準（30KB）を超え、かつ全7件が `done` に
  なっていたため、T-095〜T-101 を `docs/history/` へ移した（`tasks.json` は `[]`）。
- **`docs/architecture.md` に導線を追加**: 41KBあり、開くだけでコンテキストを大きく使うため、
  冒頭に節見出しの索引を置き、必要な節だけを読めるようにした。

## 次にやること

- **未着手タスクは無い**（`develop/tasks.json` は空）。次のセッションでタスクを登録するところから始める。
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
