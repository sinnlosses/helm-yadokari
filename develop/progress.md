# 現在の状態

最終更新: 2026-09-07（品質の棚卸し T-102〜T-108 とスモークテストの準備確認 T-109 を完了し、
`docs/history/` へアーカイブした。`develop/tasks.json` に残るのは `todo` の T-110 のみ）

T-001〜T-109 はすべて完了し、[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)
へ移した。過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

- **アーカイブ**: `develop/tasks.json` が32KBと基準（30KB）を超えたため、`done` の
  T-102〜T-109 の8件を `docs/history/` へ移した（残りは `todo` の T-110 のみ、3KB）。

## 次にやること

- **T-110（sonnet・依存なし）が残り1件**。コミットメッセージにタスクIDを振る運用にできるかの
  確認と、できる場合のルール整備。論点は `docs/coding-standards.md`「タスク番号を書かない」
  との整合（アーカイブ後もIDは `docs/history/` に残るのでコード側の懸念はそのままは
  当てはまらない、が出発点）。過去コミットは遡って書き換えない。
- **実機スモークテストは「いつでも実行できる」状態**（T-109 で確認済み）。実行はGitLabへの
  書き込みを伴うので、ユーザーの承認を得てから `docs/smoke-test.md` の手順1から回す。
  完了したらテスト用アクセストークンの失効も忘れない（下の「注意」参照）。
- `develop/test-inventory.md` の「要調査で残す判断にしたもの」「埋めない穴」5件は、
  判断を変えたくなったらリスト側の理由を先に更新する取り決め。
- `develop/tasks.json` はアーカイブ直後で3KB（`todo` の T-110 のみ）。

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
