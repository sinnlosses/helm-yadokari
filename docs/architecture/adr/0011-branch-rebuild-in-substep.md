# ブランチの作り直しはサブステップに置き、`lib/gitlab/`は薄いラッパーに保つ

`commitFileUpdates()`はドメイン型`FileUpdate`を受け取り、ファイルごとの action を`update`に
固定する。ここだけは`lib/gitlab/`がドメイン型を知っている。`update`固定でよい根拠は呼び出し元側の
不変条件（`baseBranch`時点の内容を読めたファイルしか渡ってこない）で、`lib/gitlab/`からは
見えないため`commitFileUpdates()`のJSDocに書いてある（ファイルごとに問い合わせてcreate/updateを
振り分けても、判定結果は常に`update`になる）。

一方**「固定ブランチが残っていれば削除して`baseBranch`から作り直す」手順は`commitFileUpdates()`
には置かず、`submit-merge-request.ts`（サブステップ）に置く**。GitLab APIの呼び出し順が漏れる先は
サブステップの内側であって`steps/`直下ではない。`applyUpdate()`から見えるのはサブステップ3つの
呼び出しだけで、ブランチ確認・削除・コミット・MR作成という順序はその1段下に隠れる
（`buildPlan()`と同じ形。`docs/architecture/adr/0022-substeps-no-cross-import.md`の**階層はサブステップ側に
隠す**）。`lib/gitlab/`の関数はどれもGitLab APIの1呼び出しに対応する薄いラッパーで、
`deleteBranch()`を公開しているのも`Branches.remove`1本ぶんなので`lib/gitlab/`の役割からはみ出さない。
