# dry-runは分岐を集約せず、書き込みに到達しないことをテストで守る

`dryRun`（`DRY_RUN=true`）の意味は**「GitLabの状態を変える呼び出しを一切しない」**の1つで、
`docs/requirements.md` 4.1節（タグ作成のスキップ）と5章（ブランチ作成・MR送信をしない）を
まとめるとそうなる。実装で `dryRun` を見ているのは次の2箇所だけで、**関心事が違う**。

| 箇所                                           | 何をしているか                                                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `resolve-tags/sub-steps/resolve-latest-tag.ts` | `createTag()` を呼ばない（純粋な書き込み抑止）                                                                                                                                             |
| `build-plans/build-plans.ts` の `buildPlan()`  | **dry-runの成果物そのもの**。「何を更新する予定か」をログに出し `SKIPPED (dry_run)` として計上する。あわせて `toApply` に載せないことで `applyUpdates()`（コミット・MR作成）に到達させない |

**この2つを1つに集約する案は採らない。**

- **書き込み関数を「dry-runのときは何もしない実装」に差し替える案（no-op層）を採らないのは、
  2つの理由から。** ひとつは `applyUpdate()` が最後まで走って `result: "CREATED"` を返すため、
  `summary` が「作っていないものを作った」と報告してしまうこと（直すには結局 `dryRun` を見て
  `SKIPPED` を返す分岐が要り、分岐は消えず層だけ増える）。もうひとつは、no-op層が
  「**書き込みAPIを呼ぶ経路は残したまま末端で無効化する**」形なのに対し、現在は
  「**書き込み関数に到達しない**」形であること。dry-runで誤って書いてしまう事故の余地は前者が大きい
- **`buildPlan()` の分岐を `main.ts` へ引き上げる案も採らない。** 引き上げると `main.ts` が
  ログの整形（`buildLogContext()` 相当と `describePlan()`）を持つことになり、「`main.ts` は
  `steps/` を順に呼ぶだけの薄いレイヤー」でなくなる。`buildLogContext()` は
  「3つのstepが同じキー・同じ値で出す」ために `steps/shared/step-outcome.ts` の非公開関数に
  してあるので、それを公開する形にもなる
- **`dryRun` を受け取るだけで使っていない関数は無い**（`buildPlans()` は `buildPlan()` へ、
  `resolveTags()` は `resolveLatestTag()` へ渡すために受け取る）。引数の貫通を減らす余地は
  ほとんど無い

**代わりに、分岐が漏れたことを検知できるようにしてある。** `test/main.dry-run.test.ts` は
`src/lib/gitlab/api.ts` ではなく**gitbeakerの境界**（`@gitbeaker/rest` の `Gitlab`）で
モックし、`DRY_RUN=true` の実行で `Tags.create` / `Branches.remove` / `Commits.create` /
`MergeRequests.create` が1回も呼ばれないことを固定している。ラッパ関数を列挙して確かめるのでは
なくAPI境界で見ているので、**新しい書き込みを足した人がdry-runを考え忘れても落ちる**。
同じ入力で `DRY_RUN=false` なら書き込みが起きることも並べて固定し、検証が素通りにならない
ようにしてある。

**新しくGitLabの状態を変える呼び出しを足すときは、この2箇所のどちらで抑止されるかを確かめる。**
解決（`resolve-tags`）や計画（`build-plans`）の途中で書き込むなら `resolve-latest-tag.ts` と
同じく `dryRun` の分岐が要り、適用（`apply-updates`）の中で書き込むなら `toApply` に載らない
ことで自動的に抑止される。
