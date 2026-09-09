# 現在の状態

最終更新: 2026-09-09（**`config/` のファイル名とキー名を実態に合わせる改名**を完了し
（`chart.yaml`→`registry.yaml`、`chart:`→`chartToUpdate:`、`apps:`→`appSpecs:`）、
**本番の定期実行を開始**した。ドキュメント整備を `/maintain-docs` としてスキル化し、
最後に**ソースコード全体の棚卸しで13タスクを登録**した。詳細は下の「完了したこと」を参照）

**T-001〜T-157 は全件 `done`。未着手は棚卸しで登録した T-158〜T-170 の13件**（下の
「次にやること」）。完了タスクは
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)、過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

### 2026-09-09 ドキュメント整備のスキル化

**T-146 完了**。本番の定期実行を開始した。CIの手動実行（web、`DRY_RUN=true`）で
`run_start` に `configDirPath: "config"` が出ることを確認し、**CI/CD Variables の
`ACCESS_TOKEN` が `Protected: OFF` で参照できて既定パスが通る**ことを実証した。

- 着手前に2026-09-07のスモークが残していた**MR !28/!29 と固定ブランチ2本を `reset --apply` で除去**。
  これを消すまで2ユニットが `mr_exists` で SKIPPED になり、定期実行の検証にならなかった
- **スケジュールの実設定をAPIで実測**したところ、合意の「平日 JST 9:00」ではなく
  `0 9 * * *` / `UTC`（＝毎日18:00 JST）だった。**ユーザー判断でこのまま採用**。
  「作った」という申告を実値で検証しなければ気づけなかった食い違い
- ユーザー指摘により `update-app-versions` の `web` ルールから **`when: manual` を削除**した
  （理由が正典のどこにも記録されていない既定値だった）。受け入れたトレードオフは
  `.gitlab-ci.yml` のコメントに残してある

**T-151 は着手しない判断で閉じた**（`status: done` / `passes: false`）。理由は下の「未解決」。

**T-157 完了**（`sonnet`、委譲）。改名を実装・テスト・実`config/`・`README.md` へ反映し、
**T-156で先行更新した正典の名前が全てコード側に実在する状態になった**（`AppSpec` 3件・
`RegistryYamlSchema` 4件・`registryYamlPath` 9件・`appSpecs` 28件）。16ファイル +199/-194行、
テストは359件のまま（改名のみなので増減しないのが正しい）。

- 実 `config/` は `git mv` で `RM`（rename）として記録され、`projectId`等の値は不変
- **テストフィクスチャの `appsField()` → `listField(key, ...)` はスコープ増ではなく必然**。
  元はキー名 `"apps"` をリテラルで埋め込んで registry 側と config 側で共用していたため、
  片側だけ `appSpecs` になった時点でキーを引数に取る以外に選択肢がない
- 受け入れで確認: 可否表の据え置き対象4種が残存、旧名5種が0件、`steps/` の try 0件・
  新規の `as`/`?:`/タスク番号 0件、`/maintain-docs` の指摘は既存12件のまま増えず

**T-156 完了**（`opus`、委譲）。`config/` の改名（`chart.yaml`→`registry.yaml`、
`chart:`→`chartToUpdate:`、`apps:`→`appSpecs:`）を正典3ファイルに先行反映した。実装・テスト・
実`config/`は未変更（T-157）。**コード識別子の追随は「外部ファイル形式の写しかどうか」で決める**
という基準を立て、7件の可否表を `docs/architecture.md` に追記した（`ChartRepoConfig` と
`ChartAndApps.chart` はドメイン語彙なので据え置き）。

- **委譲先が既存の矛盾を1件発見**: `docs/requirements.md` 4.1節が「タグ形式は `config.yaml` の
  `apps[].tagFormat`」と書いており、正典である4.4節（chartリポジトリ単位のファイル側）と
  食い違っていた。今回の改名に合わせて修正済み
- **受け入れ時にメインが1点修正**: 「`config.yaml` は各チームが日常的に編集する側」という
  理由づけが、同じ節が退けた「変更頻度・編集者による分割」の軸を連れ戻していたので、
  「設定ユニットの数だけ存在するので改名の手数がその数に比例する」に直した

**T-150 完了**（`opus`、判断タスクのため委譲せず実施）。ドキュメント整備を
`.claude/skills/maintain-docs/` としてスキル化した。**論点1（「冗長・重複・読みにくい」を
検査可能にする）の答えは「機械的検査は候補の抽出までにして、正否は既存正典の1問に委ねる」**。
プロトタイプで実測したところ、実在しない `getProjectWebUrls()` や `test/utils/*.test.ts` は
**廃止・削除の記録として正当**で、機械判定だけでは正否が決まらないと分かった。この切り分けは
`docs/coding-standards.md`「コメント」の「今の挙動の説明か、昔の話か」と同型なので、
新しい基準を作らずそちらを参照している（あの節も同じ判定を「機械化しない」と明記している）。

- 検査は7項目。**確定群**（通読ガード・タスク番号・リンク切れ・索引→本文）は直せば必ず正しくなる。
  **候補群**（本文→索引・実在しない識別子/パス・見出しの重複）は上の1問で正否が決まる
- ユーザーと決めたこと: 実行単位は「全検査 → 指摘一覧 → 選んで修正 → 1コミット」、
  **委譲可・`/loop` 可**、対象は8ファイル（`docs/history/` と `requirements-grilling.md` は
  当時の記述を残す性質のため対象外）、検査1は `README.md`/`CLAUDE.md` を除外（通読される入口のため）
- 「委譲可・`/loop` 可」と「ユーザーが選んで修正」の噛み合わせは、**選択者がいない実行では
  確定群だけを直し候補群は報告に留める**という既定で両立させた
- 実測で拾った落とし穴2つをスキル本文に明記した: **zsh は変数の単語分割をしない**ので `sh` で
  実行する、**BSD sed は `\|` の交替を解釈しない**ので `sed -n -E` を使う。
  どちらも最初のプロトタイプが全件NGや無検出になって気づいたもの

### 2026-09-09 ソースコード全体の棚卸し

`src/` と `scripts/` の全44ファイル（3,377行）を読み、**アーカイブ・保守性・拡張性・可読性・
型安全**の観点で洗い出して **T-158〜T-170 の13タスク**を登録した（正典の修正も検討対象に含めた）。
ユーザーの希望で**1項目=1タスク**に分けている。

- **思いつきは全件コマンドで裏を取ってから残した。** 最大の収穫は **T-158**で、
  gitbeaker 経由で存在しないホストを叩いて `isFatalError()` が `false` を返すことを実測した。
  **正典3箇所が約束している挙動が実装されていない**のに、テストが実在しないエラーの形
  （平たい `code`）を検証しているため気づけない状態だった
- **T-160 は `git log -S` で撤回の取り残しと特定できた**。`logger.warn` は T-134 で新設され
  T-144 の撤回で呼び出し元が消えたが、関数とJSDocだけが残っていた。**T-161 で
  `noUnusedLocals` を入れれば、この種の残骸は次から自動で見つかる**
- tsconfig の追加フラグは `npx tsc --noEmit --<flag>` で1つずつ実測し、**7フラグがエラー0件**、
  `noImplicitReturns` が1件と分かったうえで T-161 に落とした（見積もりではなく実測値）
- **正典に既に判断があるものは蒸し返さなかった**（stepの入口の重複共通化・`StepOutcome` の
  分離・`env.ts` のテスト専用export・スプレッド蓄積・未到達行3件の5件）。
  出さなかった理由も `docs/history/direction.md` に残してある

### 2026-09-09 承認が要る3件の実行

**T-159 完了**（`opus`、承認が要るためメインで実施）。**下調べで前提が誤りだと分かった**のが最大の収穫で、
gitbeakerは既定 `queryTimeout=300000`ms を `@gitbeaker/core` が全リクエストの `AbortSignal.timeout()` に
配線済みだった（＝タイムアウトは元から存在した）。ユーザー判断で**値を明示＋タイムアウトも fatal 化**を採用。

- **「タイムアウトが無い」という洗い出し時の指摘は誤りだった。** 実測（永久に応答しないローカルサーバに
  `queryTimeout:300` で接続）で307msの発火と `GitbeakerTimeoutError` を確認してから選択肢を組み直した
- `GitbeakerTimeoutError` はHTTPステータスも `code` も持たないため、`isFatalError()` は**エラー名**で
  判定する。`instanceof` にしないのは、パッケージの実体が二重に解決されると偽になるため
- **変異で守れていない範囲も記録した**: `createClient` の `queryTimeout` を消してもテストは落ちない
  （gitbeakerの既定値と同値のため）。テストが守るのは「実効値が5分であること」
- gitbeakerが429/502に行う**内部リトライ（最大10回）も同じsignalを共有**するので、5分はリトライ込みの総予算
- **この調査の副産物として T-171 を登録した**。gitbeakerの内部リトライはバックオフの単位が
  ミリ秒で合計255.75msしかなく、しかも使い切ると `cause` の無い `GitbeakerRetryError` を投げるため、
  自前の指数バックオフが429/502で一度も動いていない

**T-168 完了**（`sonnet`、承認が要るためメインで実施）。ユーザー判断で **`durationMs` への統一**を採用し、
ログキーの命名の例外が消えた。`timed()` の戻り値のフィールド名ごと変えて7箇所を置換。

- **`docs/history/` の3件は対象外**（当時の記述をそのまま残す規約）。完了条件に書いた
  `grep` はこの除外を含んでいなかったので、evidence に明記した
- 変異確認: ログキーだけ `duration_ms` に戻すと `main.test.ts` が落ちる

**T-161 完了**（`sonnet`、委譲）。エラー0件の7フラグ＋`noImplicitReturns` の計8つを `tsconfig.json` に
追加した。`erasableSyntaxOnly` は見送り（`tsc`/`tsx` のどちらも parameter property を扱えるため）。

- **受け入れ時にメインが独立に変異検証した**（委譲先の報告を鵜呑みにしない）: `?:` に `undefined` を
  渡すと TS2375、未使用の `const` で TS6133、`helm.ts` の `return undefined` を戻すと TS7030
- **`noUnusedLocals` が入ったので、T-160 の `logger.warn` のような撤回残骸は次から型チェックで落ちる**
- `docs/coding-standards.md`「`undefined`」節に、`?:` 規約が型でも強制される旨を2行追記

**この3コミットでメイン側の手順ミスを1つ踏んだ。** T-159・T-168 の記録で `develop/tasks.json` を
Pythonで書き換えたあと `pnpm format` を回さずコミットしたため、**その2コミットは `format:check` に
落ちる状態で入っている**（単一要素配列が1行に畳まれるかどうかの差のみ。コード・テストへの影響は無い）。
T-161 のコミットで整形し直した。手順は下の「注意」に追加してある。

**T-162 完了**（`opus`、承認が要るためメインで実施）。ユーザー承認は**中間案**で、`logContext` と
`describePlan()` の戻り値に型を与え、`logger` の引数は `Record<string, unknown>` のまま残した
（ログを1行足すのに型を触らなくてよい自由度を優先）。`Record<string, unknown>` は **13件→6件**。

- **出力JSONが1文字も変わっていないことを、`test/` に差分ゼロのまま `main.test.ts`・
  `main.e2e.test.ts` が通ることで担保した**（ログは `README.md` に例が載る外部インターフェース）
- 変異確認: `describePlan` のキー名を打ち間違えると TS2561、`logContext` に無い項目を読むと TS2551。
  **どちらも変更前は黙って通っていた**
- `noPropertyAccessFromIndexSignature` は入れていない。`logger` の引数を `Record` のまま残す案を
  採ったので、テスト側の4件（`.reason` の index signature 越しの読み取り）が解消しないため
- 型の置き場所は `docs/architecture.md` の表の4行目・5行目に対応。表の例示に
  `ChartUpdateLogContext` を追記した

### 2026-09-09 `/loop /next-task` による自動進行

**T-158 完了**（`opus`、委譲）。棚卸しで見つけた**本物のバグ**の修正。undici の `fetch` が
`TypeError: fetch failed` を投げ `code` を `cause` に入れるため、`isFatalError()` が
DNS障害・接続拒否を検出できていなかった。正典3箇所（`README.md`・`CLAUDE.md`・
`docs/coding-standards.md`）が約束していた「ネットワーク障害は即時終了」が効いていなかった。

- **正典は無修正**。元から正しい方針を書いており、ズレていたのはコード側だけだった
- `cause` は**1段だけ**辿る。際限なく辿ると無関係な内側エラーの `code` で実行全体を止める危険が
  あり、1段で足りる根拠は `rethrowWithAppContext()` が「致命的エラーは包み直さない」ことを
  保証していること（既存の不変条件が設計判断の裏づけになった）
- **受け入れ時にメインが独立に実測**: 連鎖は `TypeError -> Error(code=ENOTFOUND)` の1段で、
  DNS失敗・接続拒否とも `isFatalError: true`（着手前は false）
- 変異確認: `cause` を辿るのをやめると3件、`ETIMEDOUT` を消すと2件が落ちる

**T-160 完了**（`sonnet`、委譲）。T-134 で新設され T-144 の撤回で呼び出し元が消えた `logger.warn` を、
JSDocごと削除した。2ファイル・26行の削除のみで、`redact()`/`SENSITIVE_KEYS` と `info`/`error` は無傷。

- 正典に warn レベルを要求する記述が無いことを**メイン側でも独立に grep して確認**した
  （あれば「呼び出し元が無いほうが欠陥」になり、結論が逆になる分岐だった）
- テストは 367→**365**で、削除した2件とちょうど一致

**T-163 完了**（`sonnet`、委譲）。`cacheByArgs()` を `lib/gitlab/` から `src/utils/cache.ts` へ上げ、
`remote-cache.ts` の手書きキャッシュ（`#` 連結キー）を置き換えた。`RemoteCache` の公開型と
`verify-config.ts` は無変更。

- **受け入れ時にメインがテストを1件足した**。委譲先の実装自体は正しかったが、区切りを
  `\0`→`#` に戻す変異で**365テスト全部が通ってしまい**、このタスクの主目的である
  キー衝突の回避が1件も守られていなかった。`test/utils/cache.test.ts` を新設して
  `("a#b","c")` と `("a","b#c")` が別キーになることを検証する（追加後は同じ変異で1件落ちる）
- **委譲先の報告を実行して確かめないと見つからない穴だった**。完了条件の `grep` は全て
  満たしており、報告だけ読むと問題が無いように見える

**T-164 完了**（`haiku`、委譲）。`verify-config.ts` の `[] as string[]` 2箇所を型注釈付きの
`const` に置き換えた。これで **`src`+`scripts` 全体で `brand.ts` 以外の `as` キャストが0件**になった。

**ここで `/loop /next-task` を停止した。** `develop/direction.md` にユーザーが新しい指示を
書いていたため（`/next-task` 手順1の「未タスク化の指示が残っていればタスク化が先」）。

- **メイン側の手順ミス**: T-163 のコミットで `git add -A` を使ったため、ユーザーが書いた
  `direction.md` の指示メモ2行を**T-163のコミットに巻き込んで**いた（内容は失われていない）。
  履歴は書き換えない。**記録コミットではパスを明示して `git add` する**

**`develop/tasks.json` の `done` 9件をアーカイブした**（T-146・T-151・T-157・T-158・T-159・
T-160・T-161・T-162・T-168）。`done` が9件・30,240バイトで基準（10件 or 30KB超）にかかったため、
`/next-task` 手順1の検査点でその場で実施。**86.7KB → 34.6KB**、`done` は0件になった。

- 移した内容が `docs/history/tasks-archive.md` に一字一句存在することを全件照合し、**欠落ゼロ**を確認
- `progress.md` 側は小節が全て最新日付（2026-09-09）なのでアーカイブ対象外
- **`docs/history/tasks-archive.md` の冒頭は「節は `T-001` から昇順に並べる」と書いているが、
  実態は完了順の追記**（末尾は T-145 → T-149 → T-153 → T-155 → T-154 → …）。既存の実践に
  合わせて末尾に追記した。記述と実態のズレは `/maintain-docs` の検査対象

## 次にやること

棚卸し（2026-09-09）で登録した13件のうち**残り5件**、作業中に見つかった **T-171**、2026-09-10 の指示から作った **T-172〜T-174** の計9件。**ユーザーの希望で1項目=1タスクに分けてあるので、
1件ずつ判断しながら進める。** 着手順のおすすめは T-158 → T-160 → T-163・T-164。

**承認が要る3件（T-159・T-162・T-168）と依存の T-161 は完了。残る承認待ちは T-171 の1件だけで、他の9件は `/loop /next-task` に載せられる。**

- **T-165（設定ユニットの位置表示の一本化、`sonnet`、依存なし）**。
  `${chartDirName}/${unitPath}` が3箇所。**T-164 と同じファイルを触る**ので前後に注意。
- **T-166（`config/` のファイル名リテラルの定数化、`sonnet`、依存なし）**。T-157 の改名が
  25箇所を触った実績があるので、次の改名のコストを下げる。
- **T-167（タグ名内のブランチ名表現の一本化、`haiku`、依存なし）**。
  `branch.replaceAll("/", "-")` が `tag-format.ts` に2箇所。パースと生成の対称性が前提。
- **T-169（数値スカラーのクォート化、`sonnet`、依存なし）**。`- &ver 20260101` に書き戻すと
  `"20260102"` になる（実測）。イメージタグは `{branch}` 必須なので該当せず、
  `helm.branchToSync` が数字だけのときだけ起きる。**「正しい挙動」と結論して正典に書いて
  閉じてよい**。
- **T-170（`helm.ts` のアンカー不在まわりのエラー表現、`sonnet`、依存なし）**。スカラー以外に
  付いたアンカーを「見つからない」と報告する件と、同じ不変条件を2関数が投げている件。
  **どちらも「今のままでよい」と結論して閉じてよい**。

- **T-171（429/502 のリトライが二重にかかっている、`opus`、依存なし）**。T-159〜T-162 の作業中に
  gitbeakerのソースを読んで見つけた。gitbeakerは429/502を**内部で最大10回**リトライするが、
  バックオフが `delay(2 ** i * 0.25)` で `delay(ms)` は**ミリ秒**なので**合計255.75ms**——
  0.26秒で10連射しているだけでレート制限には効かない。使い切って投げる `GitbeakerRetryError` は
  `cause` を持たないため `isRetryable()` が false になり、**秒単位のバックオフを持つ自前の
  リトライが429/502で一度も動かない**。503/504は自前のリトライが設計どおり効く。
  `README.md` のリトライ行が429/502について事実と違う。`/loop` 不可。

- **T-172（`validate`/`verify` の使い分けを決めて正典に反映、`opus`、依存なし）**。
  `scripts/lint/validate-config.ts`（CLI入口）・`scripts/lint/verify-config/verify-config.ts`
  （実在チェック）・`src/lib/config/validate.ts`（形の検証）で、**`validate` が層をまたいで2箇所**に
  現れ、どちらが「形」でどちらが「実在」かがファイル名から決まらない。**設計自体は正典が
  意図的と書いており、問題は名前だけ**。改名は `package.json` のスクリプト名と `.gitlab-ci.yml` の
  ジョブ名に波及するため承認が要る。**「改名しない」も正当な結論**。`/loop` 不可。
- **T-173（決めた命名を実装・CI・ドキュメントへ反映、`sonnet`、T-172依存）**。
  T-172 が「改名しない」と結論したら**不要になるタスク**。`/loop` 可。
- **T-174（`BranchExists` 注入の要否、`opus`、依存なし）**。`build-plans.ts` が
  `stageHelmTargetBranchUpdates()` に `source`（`gitlabCache` + `chart` を含む）と
  `branchExists`（同じものから作った関数）を**両方**渡している。**正典が「キャッシュを隠すための
  注入」と説明しているのに隠せていない**。しかも同じ節が、values.yaml読み込みで同型の注入を
  やめた前例（「ただのデータなので関数型で隠す必要が無い」）を自分で記録している。
  実装を変えない結論でも**正典の修正は必須**。`/loop` 不可。

**タスクにしなかったもの**（正典に既に判断があるので蒸し返さない）: stepの入口の
「並列実行 → 振り分け」の共通化、`StepOutcome.settled` の分離（T-151）、`env.ts` の
テスト専用 export、`reduceAsync`/`partitionMap` のスプレッド蓄積、未到達行3件。
棚卸しの全文は `docs/history/direction.md` の「2026-09-09（2回目）」にある。

- **設定の構成が変わったので、次回の実機スモークは `docs/smoke-test.md` の手順1から
  やり直す。** 旧ブランチ `feature/yadokari/tenant1/client1` がGitLab上に残っていれば
  `smoke-fixture.ts reset --apply` が拾って片付ける（`isFeatureBranch()` は接頭辞判定のみ）。
  **統合後はスモークも定期実行も同じ `config/` を見るため、`CONFIG_PATH` の指定は不要**。
  同じ固定ブランチを使うので、スモークと定期実行を同時に走らせないこと。
- `scripts/lint/validate-config.ts` はディレクトリを**位置引数**で受け取る（`CONFIG_PATH`
  環境変数では効かない）。統合後は既定の `config/` を見るので `pnpm lint:validate-config` だけでよい。
- 新しいGitLab読み取りをキャッシュ機構に載せる手順と「載せてよいかの判断」は
  `docs/architecture.md`「GitLabへの問い合わせのキャッシュは`lib/gitlab/`に列挙し、バッチ単位で
  1つ持ち回る」節にある。
- 「埋めない穴」「消さないと決めたもの」の正典は `docs/coding-standards.md`「テスト」節に
  移した（T-119）。判断を変えたくなったら、まずそちらの理由を更新する。

## 未解決

- **T-151（`StepOutcome` の `settled` が SKIPPED と ERROR を混ぜている件）は着手しない判断**
  （ユーザー判断、2026-09-09）。`tasks.json` では `status: done` / `passes: false` で閉じてある。
  判断を変えたくなったときのために理由だけ残す: 指摘は事実だが、**消費側3箇所（`filter-targets.ts:28`・
  `build-plans.ts:42`・`apply-updates.ts:27`）は SKIPPED と ERROR を区別しておらず**、
  区別が要る最終集計（`main.ts:72`）には `result` の文字列として情報が残っているため、
  実害が出ていない。再開するときは `docs/architecture.md`「エラーは『fatalは例外・それ以外は
  戻り値』の2チャネル」の方針変更をユーザー承認するところから始める。

- ~~**`develop/tasks.json` のアーカイブ基準（30KB超）が、`todo` だけで超えたときに機能しない。**~~
  **解決済み**（T-147で `todo` を判定対象外にした）。2026-09-09の棚卸しで13タスクを登録した
  時点で**実測により確認**: ファイル全体は43.8KBだが、判定対象の `done` は3件・9.4KBで
  基準内。**`todo` 13件を足しても空振りのトリガーが鳴らない**ことを、新基準の2回目の適用で
  確かめた。

- 上の棚卸しで見つかったうち、**次の2件は着手しない判断**（ユーザー判断、2026-09-07）。
  判断を変えたくなったときのために理由だけ残す:
  - `filterTargets` のオープンMR確認（`src/steps/filter-targets/filter-targets.ts`）は
    chartAndApps ごとに1回で、同じ `chart.projectId` を共有する client の数だけ走る。
    プロジェクト単位で `state: "opened"` を1回引いてローカルで `sourceBranch` を突き合わせれば
    N→1 にできるが、他人が立てたMRが多いプロジェクトではページングのコストが乗るため、
    client数が増えるまでは割に合わない
  - `createResolveLatestTags()` のキャッシュキーが `projectId:branchToSync` なので、
    同じappを別clientが**別ブランチ**で追跡していると `listTags`（プロジェクト全タグ）を
    2回引く。影響が小さいので見送り

## 注意

- **`develop/tasks.json` を書き換えたら、コミット前に必ず `pnpm format` を回す。** このファイルは
  `oxfmt` の対象（`.prettierignore` で除外されているのは `.claude/` と `config/` だけ）で、
  スクリプトで `json.dump(indent=2)` すると単一要素配列が展開されて `format:check` に落ちる。
  2026-09-09 に T-159・T-168 の2コミットでこれを踏んだ（`pnpm check` を通したあとに記録を書いたため）。
- `config/` には実在の登録だけを置く（架空の設定例を置くとCIの `validate-config-remote` が
  必ず失敗する）。定期実行の登録とスモーク用フィクスチャは**同居させる**（理由は
  `config/README.md`）。記述例は `docs/requirements.md` 4.4節、実物は
  `config/yadokari-smoke-test-chart/`
- `<名前>/<名前>.ts` の形（`src/lib/` の gitlab / config、`scripts/lint/verify-config/`）で
  統一している。同名のファイルとディレクトリを並べない（T-092/T-094 の命名判断に効く）
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている
- リモートは `origin` が `github.com/sinnlosses/helm-yadokari` と
  `gitlab.com/sinnlosses-group/helm-yadokari` の2つの push URL を持つ。
  `git push`/`git fetch` は両方に対して行われる
- gitlab.com 上に検証用の `sinnlosses-group/yadokari-smoke-test-chart` プロジェクトが存在する
  （削除せず残置）
- **`RENOVATE=true` を持つ pipeline schedule が存在しないため、`renovate` ジョブは一度も
  動いていない**（このCLI自体の依存パッケージ更新が止まっている状態）。`.gitlab-ci.yml` は
  そのスケジュールの作成を必須と書いているが、**現時点では対応しない判断**（ユーザー判断、
  2026-09-09。タスクにもしない）
- T-064以降の変更は2026-09-07の実機スモークテストで検証済み。**テスト用に発行したGitLab
  アクセストークンは失効させず、本番の定期実行用としてそのまま使い続ける**（2026-09-09に方針決定。
  宿題ではない）。2026-09-07のスモークが残していたMR !28/!29 と固定ブランチ2本は
  **`smoke-fixture.ts reset --apply` で片付け済み**
- **定期実行は手動スモークテストを置き換える**（ユーザー判断、2026-09-09。問題が出たら
  そのとき対応する）。同じchartリポジトリ・同じ設定ユニット・同じ固定ブランチを共有するため、
  次の2点が起こりうる。踏んだら対処を決める:
  - 作られたMRを誰もマージしないと、翌日以降は `mr_exists` で SKIPPED になり続ける
  - スモークテストを回すと手順1の `reset` が定期実行の作ったMRと固定ブランチを消す
