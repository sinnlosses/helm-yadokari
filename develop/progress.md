# 現在の状態

最終更新: 2026-09-10（`/plan-tasks` で **T-175〜T-179 の5件を登録**し、`done` 9件を
`docs/history/tasks-archive.md` へアーカイブした。以下の記述は2026-09-09時点のもの:
**`config/` のファイル名とキー名を実態に合わせる改名**を完了し
（`chart.yaml`→`registry.yaml`、`chart:`→`chartToUpdate:`、`apps:`→`appSpecs:`）、
**本番の定期実行を開始**した。ドキュメント整備を `/maintain-docs` としてスキル化し、
最後に**ソースコード全体の棚卸しで13タスクを登録**した。詳細は下の「完了したこと」を参照）

**未着手は4件**（T-172・T-173・T-178・T-179。下の「次にやること」）。完了タスクは
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)、過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

### 2026-09-10 指示メモのタスク化とトークンのマスク確認

`/plan-tasks` で T-175〜T-179 を登録し、`done` 9件を `docs/history/tasks-archive.md` へ
アーカイブした。**T-176（`outcome`→`result`）は指示のまま改名すると `StepResult` の中に
`result` が入り、`docs/architecture.md`「1つの語を2つの意味に使わない」と衝突する**ため、
方針決めを前段に切り出してユーザー判断待ちにしてある。

**T-175 完了**（`sonnet`、委譲）。アクセストークンがログに出うる経路を全件洗い、
**今の呼び出し方では漏れない**ことを確認したうえで、`SENSITIVE_KEYS` に `accesstoken` を
足す1件だけを対処した（`toLowerCase()` の完全一致では `EnvConfig` のキー名 `accessToken` が
素通りしていた）。gitbeaker はトークンをヘッダでのみ送り、`error.message` に混ぜないことを
ソースで確認済み。再帰的なマスクと値ベースの伏せ込みは**採らない判断**（後者は `src/utils/` が
環境を知ることになり原則2に反する）。方針は `docs/requirements.md` 5章に1箇所だけ追記した。

**T-176・T-177 は着手しない判断で閉じた**（`status: done` / `passes: false`）。理由は下の「未解決」。

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

**T-171 完了**（`opus`、承認が要るためメインで実施）。**実測が指摘より重い欠陥を掘り当てた**。
429/502 は gitbeaker が内部で10回リトライして `cause` を持たない `GitbeakerRetryError` に化けるため、
**502 が fatal 判定から漏れていた**（正典3箇所が「5xxは即時終了」と約束しているのに、
ゲートウェイ障害でも各設定ユニットを1件ずつ ERROR にして進んでしまう）。

- 実測値: 429=10回/280ms、502=10回/282ms、503=3回/3015ms、504=3回/3013ms、500=1回/8ms。
  **503/504 は自前のリトライが設計どおり効いている**（gitbeakerのretryCodesに入っていないため）
- ユーザー承認は「status を **fatal 判定にだけ**使う」。`isRetryable()` には渡さないので
  **追加リクエストはゼロ**（gitbeakerが既に10回試したあとに、こちらから叩く相手ではない）
- 修正後の実測で 502 が `fatal=true` になり、**リクエスト回数は10回のまま**であることを確認
- メッセージが読めないときは `undefined` を返して fatal に昇格させない（ライブラリが書式を
  変えたときに、黙って実行全体を止めないため）

**ユーザー指摘により `src/utils/http.ts` を `src/lib/gitlab/errors.ts` へ移した**（タスクIDなし）。
`src/utils/` は正典が「**ドメイン知識を一切持たない**汎用ユーティリティ」と定義しているのに、
gitbeakerのクラス名とメッセージ書式を持つ状態になっていた。

- **原因の大半はこのセッションのメイン**。構造依存（`cause.response.status`）はセッション前から
  あったが、`GitbeakerTimeoutError`（T-159）と `GitbeakerRetryError` + `/last status code: (\d+)/`
  （T-171）を足したのはメイン側。**ライブラリのクラス名を文字列で持ち英語メッセージを
  正規表現でパースする**のは構造依存とは質が違い、原則2に照らせば最初から `lib/gitlab/` だった
- ユーザー判断で **`utils/retry.ts` は汎用のまま残した**。再試行の可否を引数
  （`isRetryable`）で受け取る形にし、429/502/503/504 という選定は
  `lib/gitlab/errors.ts` の `isRetryableError()` が持つ。両者は `gitlab.ts` の非公開
  `withGitlabRetry()` が束ねる（13箇所の呼び出しはこれ1つに集約）
- 汎用な `toErrorMessage()` だけ `utils/errors.ts`（`FatalError` の隣）へ移し、
  **`utils/http.ts` はファイルごと消えた**。`git mv` で履歴を残している
- 正典も追随: `CLAUDE.md`・`docs/coding-standards.md` の「HTTPエラーの判定は〜を使う」の
  名指し、`docs/architecture.md` の `src/utils/`・`src/lib/` の責務表、
  「`lib/gitlab/` にはGitLabという外部システムを知っているものだけを置く」節に判断の根拠を追記
- **判断の軸として書き残したこと**: 「ライブラリを差し替えたときに書き換える範囲が
  `lib/gitlab/` に収まるか」。利用者が1ファイルしかないことは `utils/` から出す理由にならない

**T-165 完了**（`sonnet`、委譲）。設定ユニットの位置表示（`<chartDirName>/<unitPath>`）の手書き3箇所を
`domain/config-unit.ts` の `buildConfigUnitLocation()` に集約した。

- **受け入れでまた「完了条件は満たすが守られていない」を拾った**（T-163 と同型）。委譲先は
  「テストが無改変で通ったことが文言不変の証拠」と報告したが、**区切りを `::` に変える変異でも
  375テスト全部が通った**——この文言を assert しているテストが1件も無かった。
  `test/domain/config-unit.test.ts` に書式を固定するテストを2件足して塞いだ
- **教訓**: 「既存テストが通る＝振る舞いが変わっていない」は、そのテストが対象を実際に
  検証しているときにしか成り立たない。**受け入れでは変異を当てて確かめる**

**T-166 完了**（`sonnet`、委譲）。`registry.yaml` / `config.yaml` のファイル名リテラルを
`schema.ts` の2定数に集約した。`join()` の6件だけでなくエラーメッセージ本文も含めたので、
`grep -n '"registry.yaml"|"config.yaml"' src/lib/config/*.ts` は定義2行のみになった。

- **置き場所は `schema.ts` が必然**。`config.ts` に置くと `config.ts` → `chart-and-apps.ts` →
  `config.ts` の**循環import**になる（受け入れ時にメインが確認。委譲先の理由づけより強い根拠）
- **委譲プロンプトに「主張は変異で確かめること」を足した効果が出た初回**。委譲先が自分で
  変異（`config-x.yaml`）を当てて26件落ちることを確認して報告し、メインの独立検証とも一致した。
  T-163・T-165 で2回続いた「完了条件は満たすが守られていない」は今回は発生していない

**T-167 完了**（`haiku`、委譲）。タグ名の中でのブランチ名表現（`/`→`-`）を
`toBranchLiteralInTag()` に一本化した。置換をやめる変異で6件落ちることを双方で確認。

- **受け入れでJSDocの事実誤認を2箇所直した**。`fillTagFormat()` の説明が「`{branch}`は
  **呼び出し元が渡した**`branch`（"/"を"-"に置換済み）」となっていたが、実際は自分で変換して
  いる。**このタスク以前からの誤り**で、関数に名前が付いた今なら両方の JSDoc を同じ関数へ
  向けられるため、パース側と生成側の対称性がコメントからも読めるようにした
- 委譲先の変異検証は正確だった（6件・落ちたテスト名も一致）。往復テストが既存で3箇所ある
  ことも確認済みで、追加は不要だった

**T-169 完了**（`sonnet`、委譲）。数値に見えるスカラーのクォート化は **`yaml` パッケージの
正しい挙動**と結論し、実装は変えず `docs/architecture.md`「その他」に制約として書いて閉じた。

- **メインが独立に実測して委譲先の結論と一致を確認**。`&b 2026`→`"2027"`・`&b 007`→`"008"`・
  `&b true`→`"false"` はクォートが付き、`&b no`→`yes`（YAML1.2で `no` は文字列）と
  `&b main`→`develop` には付かない。**型を保つために必要なときだけ最小限に付く**
- `docs/requirements.md` は変更なし。`helm.branchToSync` は `z.string()` が数値を弾くので、
  「数字だけのブランチ名を使うな」を運用の禁止事項として書くのは的外れという判断
- 足したテストは素の `yaml.parse()` でも型を確認しており、`String()` 変換に依存していない

**T-170 完了**（`sonnet`、委譲）。`findAnchorNode()` の戻り値を判別可能ユニオンにして、
「アンカーが無い」と「アンカーはあるがスカラーでない」を区別できるようにした。論点2
（2関数が同じ不変条件を投げる件）は**統合しない**結論（到達不能な防御的分岐は残してよい規約）。

- 直す判断の根拠は `docs/requirements.md` 4.4節の明文（アンカーは**スカラー値**に付ける構成が前提）。
  規定があるので「規定違反を検知するメッセージ」に価値がある
- **残した制約**: `verify-config.ts` は `getValueAtAnchor()`（`string | undefined`）経由なので
  実在チェックでは両者を区別できない。戻り値契約を変えない制約とのトレードオフで意図的

**メイン側の手順ミスが再発した。** T-169 のコミット（`a450a13`）に整形前の `develop/tasks.json`
が入っていた（`pnpm format` を記録の**前**に回してしまった）。T-165〜T-167 は無事。
T-170 のコミットで整形し直し、**手順を「記録を書く → `pnpm format` → `pnpm check` → コミット」に
固定**した（下の「注意」を更新）。

**T-174 完了**（`opus`、承認が要るためメインで実施）。`stageHelmTargetBranchUpdates()` への
`BranchExists` の注入をやめ、`source`（`ValuesYamlSource`＝`gitlabCache`+`chart`）から直接
呼ぶ形にした。引数が4→3、`BranchExists` 型は消滅。

- **指摘のとおり注入は情報を隠せていなかった**。同じ関数が `source` を別の引数で受け取っており、
  JSDoc の「サブステップ側はキャッシュの存在を知らずに」は事実と違っていた
- **この変更で関数型の注入が0件になったので、正典の節を見出しごと書き換えた**（索引も追随）。
  「注入するのはキャッシュを隠すときだけ」→「注入しない。キャッシュを持つ側が工場関数を公開する」。
  `ReadDraftValuesYaml`（過去に廃止）と `BranchExists` を**同じ理由でやめた2例**として並べてある
- **テストは無改変で通った**（`test/` の差分0行）。既存テストが `buildPlans()` 経由で
  `lib/gitlab/gitlab.js` をモックする作りで、注入の有無に依存していなかったため
- 変異2件で確認: 実在確認を消すと4件、別のprojectIdを見ると3件落ちる

**`develop/tasks.json` の `done` 9件をアーカイブした**（T-146・T-151・T-157・T-158・T-159・
T-160・T-161・T-162・T-168）。`done` が9件・30,240バイトで基準（10件 or 30KB超）にかかったため、
`/next-task` 手順1の検査点でその場で実施。**86.7KB → 34.6KB**、`done` は0件になった。

- 移した内容が `docs/history/tasks-archive.md` に一字一句存在することを全件照合し、**欠落ゼロ**を確認
- `progress.md` 側は小節が全て最新日付（2026-09-09）なのでアーカイブ対象外
- **`docs/history/tasks-archive.md` の冒頭は「節は `T-001` から昇順に並べる」と書いているが、
  実態は完了順の追記**（末尾は T-145 → T-149 → T-153 → T-155 → T-154 → …）。既存の実践に
  合わせて末尾に追記した。記述と実態のズレは `/maintain-docs` の検査対象

## 次にやること

**未着手は4件**。うち **T-172・T-178 は方針決め・承認を含むので `/loop /next-task` に載せない**
（ユーザーがいるセッションで扱う）。T-173 は T-172 の結論待ちで、「改名しない」なら丸ごと不要になる。
T-176・T-177 は着手しない判断で閉じた（下の「未解決」）。

- **T-172（`validate`/`verify` の使い分けを決めて正典に反映、`opus`、依存なし）**。
  `scripts/lint/validate-config.ts`（CLI入口）・`scripts/lint/verify-config/verify-config.ts`
  （実在チェック）・`src/lib/config/validate.ts`（形の検証）で、**`validate` が層をまたいで2箇所**に
  現れ、どちらが「形」でどちらが「実在」かがファイル名から決まらない。**設計自体は正典が
  意図的と書いており、問題は名前だけ**。改名は `package.json` のスクリプト名と `.gitlab-ci.yml` の
  ジョブ名に波及するため承認が要る。**「改名しない」も正当な結論**。`/loop` 不可。
- **T-173（決めた命名を実装・CI・ドキュメントへ反映、`sonnet`、T-172依存）**。
  T-172 が「改名しない」と結論したら**不要になるタスク**。`/loop` 可。
- **T-178（HTTPエラー処理の実装を1つの資料にまとめる、`opus`、依存なし）**。
  現状は `README.md`（挙動の表）・`docs/architecture.md`（設計判断）・
  `docs/coding-standards.md`（try を書く場所）・コード内コメント（gitbeaker依存の判定）の
  4箇所に分散。**新規ファイルを作るか既存節を厚くするか**の判断を含むので `/loop` 不可。
- **T-179（索引が無いドキュメントへの索引付与、`sonnet`、T-178依存）**。
  索引があるのは `architecture` / `coding-standards` / `glossary` / `requirements` の4つ。
  `workflow.md`・`smoke-test.md`・`README.md` などが対象候補で、**付けない判断も正当**。
  T-178 が新設したドキュメントも対象に含める。`/loop` 可。

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

- **T-176（`outcome` を `result` に改名する件）は着手しない判断**（ユーザー判断、2026-09-10）。
  `tasks.json` では `status: done` / `passes: false` で閉じてあり、**正典（`docs/architecture.md`）は
  無変更**。判断を変えたくなったときのために懸念だけ残す:
  - `result` のドメイン型が既に2つある（`ChartUpdateResult` = CREATED/SKIPPED/ERROR、
    `RunResult` = SUCCESS/PARTIAL_FAILURE。どちらも `docs/glossary.md` に掲載）のに対し、
    `StepOutcome` は**ドメインではなく制御フローの型**（`ok` = 続行 / `settled` = 打ち切り）で層が違う
  - `StepResult` にすると `{ status: "settled"; result: ChartUpdateResult }` が **`result.result`** になり、
    `docs/architecture.md`「1つの語を2つの意味に使わない」の本文（値の意味を語れないフィールド名は
    避ける）を自分で踏む
  - ログのフィールド名 `result` は `README.md`「実行ログの例」3箇所に出る**外部インターフェース**で、
    `ChartUpdateResult` の意味に固定したい
  - `src/main.ts:66` の reduce が既に `(counts, result)` を使っており、局所変数が衝突する
  - 再開するなら、型名を `StepResult` にしたうえで `settled` 側のフィールド名を
    `settledAs` などに変えて `result.result` を避ける案（波及は src 8ファイル・docs 2ファイルの約40箇所）
    から検討する。**T-177（反映タスク）も同時に閉じてある**ので、再開時は両方を起こし直す

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

- **コミット手順は「記録を書く → `pnpm format` → `pnpm check` → `git add` → `git commit`」の順に固定する。**
  `develop/tasks.json` は `oxfmt` の対象（`.prettierignore` の除外は `.claude/` と `config/` だけ）で、
  スクリプトで `json.dump(indent=2)` すると単一要素配列が展開されて `format:check` に落ちる。
  **`pnpm format` を記録より前に回すと必ず取りこぼす。** 2026-09-09 に T-159・T-168 で踏み、
  対策を書いたのに 2026-09-10 の T-169 で**同じ順序ミスを再発**させた（T-165〜T-167 は無事）。
  順序そのものを固定しないと再発する。
- **`git add` はパスを明示する。`git add -A` を使わない。** ユーザーが作業中に編集した
  ファイル（`develop/direction.md`・`src/main.ts` など）を無関係なコミットに巻き込むため。
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
