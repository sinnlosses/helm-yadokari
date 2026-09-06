# 現在の状態

最終更新: 2026-09-06（`direction.md` のユーザー指摘6件を T-064〜T-070 の7タスクとして登録。
着手前に T-054〜T-063 の記録を history へアーカイブした）

T-001〜T-063 はすべて完了し、`tasks.json` から
[`docs/history/tasks-archive.md`](./docs/history/tasks-archive.md) へ移した（`tasks.json` には
T-064以降だけが残る）。当時のセッションの記録は
[`docs/history/progress-archive.md`](./docs/history/progress-archive.md) にある
（`tasks.json` の `evidence` はコミットハッシュ・テスト件数・アーカイブへの参照に絞る運用）。

## 完了したこと（このセッション）

- `direction.md` に書かれたユーザー指摘6件を読み解き、コードの現状を調べたうえで
  T-064〜T-070 の7タスクとして `tasks.json` に登録した（コード変更なし）。
  設計判断が要る3件（エラーハンドリング方針・型定義の配置・URLの型付け）は
  `opus` の決定タスクと、決定に従うだけの実装タスクに分けてある
- アーカイブのトリガー（`done` 10件以上）に該当していたため、着手前に T-054〜T-063 の10件を
  `docs/history/tasks-archive.md` へ移し（53節→63節）、`progress.md` の前セッション分の
  「完了したこと」を `docs/history/progress-archive.md` へ移した。
  `tasks.json` は 24,399→11,754バイト

**調査で分かった事実（T-065 の前提）**: ユーザーが懸念した「filter-targets で fatal が
settled になる」は**挙動としては起きていない**。`settleAsError()` は `isFatalError()` の場合に
`FatalError` を投げ直し、`mapWithConcurrency` がキューをクリアして reject するため実行全体が
落ちる。問題は挙動ではなく `catch { return settleAsError(...) }` という**書き方が
「常にERRORに計上して続行する」ように読める**ことなので、T-065 はそれを型・構造で
防げるかを論点にしてある（挙動自体は `test/steps/filter-targets/filter-targets.test.ts` の
「401エラーのとき FatalError をスローする」テストで固定済み）。

## 次にやること

`tasks.json` の7タスク（T-064〜T-070）はすべて `todo`。依存があるのは T-066（T-065 待ち）と
T-068（T-067 待ち）だけなので、T-064 / T-065 / T-067 / T-069 / T-070 はいつでも着手できる。

前セッションから引き継いだ未処理:

- `TARGET_CHART` の0件検知（`TARGET_CHART`/`TARGET_CLIENT` 明示時のみエラー）は実機未検証。
  ユニットテストは通っているが、スモークテストのシナリオには含まれていない
- 追跡ブランチ切り替えは実機未検証。スモークテストで `branchToSync` を切り替える
  シナリオを追加すると確認できる
- 前回のスモークテストで残したMR（!26、!27）とブランチ2本の後片付け（不要になったら
  `SMOKE_CHART_PROJECT_ID=86061211 npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply`）
- 検証が完全に終わったら、テスト用のGitLabアクセストークンを失効させる（ユーザー対応）
- 未確認のまま取り込んである方針変更（`steps/shared/` の新設、evidenceを3行以内に絞る運用、
  README「設定 > config/」章を要約に縮小し正典を requirements.md 4.4節にしたこと）

## 未解決

- なし

## 注意

- `config/` には実運用の登録だけを置く（架空の設定例を置くとCIの `validate-config-remote` が
  必ず失敗する、T-038）。記述例は `docs/requirements.md` 4.4節、実物に近いサンプルは `config-test/`
- `src/lib/<名前>/<名前>.ts` の形（gitlab / config / verify-config）で統一している。
  同名のファイルとディレクトリを並べない
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている
- `src/lib/config/config.ts` に oxlint の `no-shadow` 警告が2件あるが、分割前からある既存の警告
  （`loadClientChartAndApps` の引数 `target` と、内側の `.map((target) => ...)`）
- リモートは`origin`が`github.com/sinnlosses/helm-yadokari`と`gitlab.com/sinnlosses-group/helm-yadokari`の
  2つの push URL を持つ。`git push`/`git fetch`は両方に対して行われる
- gitlab.com上に検証用の`sinnlosses-group/yadokari-smoke-test-chart`プロジェクトが存在する（削除せず残置）
