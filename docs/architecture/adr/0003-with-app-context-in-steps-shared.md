# アプリ名の付与は`steps/shared/`に置き、アプリ単位の処理を切り出した箇所すべてから呼ぶ

`withAppContext()`（`steps/shared/step-outcome.ts`）は、アプリ1件ぶんの処理を切り出している箇所を
包み、非fatalな例外に`[アプリ: <projectName>]`を前置する。呼び出し元は
`build-plans/sub-steps/stage-image-tag-updates.ts`のアプリのループと、
`apply-updates/sub-steps/collect-mr-entries.ts`のplanごとのweb URL・パイプライン解決、そして
`resolveTags()`（`settleApp()`経由）。

`settleApp()`は`withAppContext()`を包んで、非fatalな失敗を投げ直す代わりに`AppOutcome`の値に
する。`withHandling()`が設定ユニット単位で行う封じ込めのアプリ単位版だが、**設定ユニットが
決まっていないのでログは出さない**。1回の解決の失敗が何件の設定ユニットのERRORになるかを
決めるのは受け取った`buildPlans()`側で、`ERROR`の記録は`settleAsError()`1箇所に残る。

- **`collect-mr-entries.ts`を対象外にしない**。設定ユニットはオールオアナッシングでERRORになるため、
  「どのアプリで落ちたか」が要るのはアプリ単位の処理を持つ箇所すべてで同じ。ここは
  `getLatestPipelineForRef()`のリトライ後の失敗と`getProjectWebUrl()`の前提崩れが該当する
- **`build-plans/`へ移さない**。移すと、`rethrowWithAppContext()`が持つ「fatalは包まない」判断が
  `settleAsError()`と別ファイルに離れ、エラー方針の変更漏れを招く。「複数stepから呼ばれる」ことは
  `steps/shared/`に置く理由ではないが、**エラー方針の一体性**がここに置く理由になる
- サブステップが`steps/shared/`をimportするのは、サブステップ同士のimport禁止（下記）には
  当たらない。禁止しているのは`sub-steps/`直下のファイル同士であって、stepの共有物ではない
