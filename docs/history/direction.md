# 指示メモのアーカイブ

`develop/direction.md` に書かれたユーザーからの指示を、タスク化した時点でここへ日付見出し付きで
移す（新しいものを上に足す）。運用の正典は
[`docs/workflow.md`](../workflow.md)「指示メモ（`develop/direction.md`）」。
**当時の記述はそのまま残し、後から書き換えない。**

**このファイルは通読しない**（20KB超）。日付見出しの追記ログなので節の索引は持たない。
過去の指示をたどりたいときだけ、`grep -n '^## '` で日付を選び、その節だけを
`sed -n '/^## 2026-09-08（4回目）/,/^#\{2,4\} /p' docs/history/direction.md` の形で読む。

## 2026-09-10（2回目）

生成したタスク: **T-175**（アクセストークンがログに出うる経路の確認とマスクの隙間塞ぎ、`sonnet`、依存なし）、
**T-176**（`outcome`/`result` の使い分けを決めて正典に反映、`opus`、依存なし）、
**T-177**（決めた命名を実装・ドキュメントへ反映、`sonnet`、T-176依存）、
**T-178**（HTTPエラー処理の実装を1つの資料にまとめる、`opus`、依存なし）、
**T-179**（索引が無いドキュメントへの索引付与、`sonnet`、T-178依存）。
タスクにしなかった項目は無い（4項目すべてをタスクにした）。

2件目の「outcome ではなく result を使う」は、裏取りの結果 **`result` が既に3つの意味で
使われている**ことが分かった（`ChartUpdateResult` = CREATED/SKIPPED/ERROR、JSONログの
フィールド名 `result`、`StepOutcome` の `settled` 側のフィールド名）。そのまま改名すると
`StepResult` の中に `result` が入り、`docs/architecture.md`「1つの語を2つの意味に使わない」と
衝突するため、**衝突の解き方を決める T-176 を前段に置き、機械的な反映を T-177 に分けた**
（T-172/T-173 と同じ形）。

1件目のマスクは、`src/utils/logger.ts` に `redact()` が既にあり大半は塞がれていたが、
キー名の完全一致判定のため **`accessToken`（camelCase）だけが素通りする**。現時点の
呼び出し元は誰もトークンを渡していないので、「今は漏れない」と確認して閉じる逃げ道を
タスクに明記した。

3件目の資料は、`README.md`・`docs/architecture.md`・`docs/coding-standards.md`・
コード内コメントの4箇所に分散していることを確認。集約先を決める判断を含むため `opus`。
4件目の索引は、既に4ファイルが「節の索引」形式を持っており、それに揃える形にした
（新設ドキュメントも対象にするため T-178 依存）。

- アクセストークンはシークレットなので文字列として出力されないようにマスクされているか確認し、必要であればマスクするタスクを積むこと
- step-outcome.ts を見てて思ったこととして、outcome よりは result のほうが馴染みがあるんだけどどうかな?step-result、その他 outcome ではなく result を使う
- http 周りのエラーが複雑になってきたけど今の実装がまとまった資料ある?なければ作ってほしいな
- 各ドキュメントに目次とかあると見やすいんだけどな。ないドキュメントに付与してくれる?

## 2026-09-10

生成したタスク: **T-172**（`validate`/`verify` の使い分けを決めて正典に反映、`opus`、依存なし）、
**T-173**（決めた命名を実装・CI・ドキュメントへ反映、`sonnet`、T-172依存）、
**T-174**（`stageHelmTargetBranchUpdates()` への `BranchExists` 注入の要否、`opus`、依存なし）。
タスクにしなかった項目は無い。

1件目は「改名するか、正典への導線を足すだけにするか」から判断が要り、改名すると
`package.json` のスクリプト名と `.gitlab-ci.yml` のジョブ名という外部インターフェースに
波及するため、決定（T-172）と追随（T-173）に分けた。2件目は指摘が事実であることを
確認済みで、**正典（`BranchExists` のJSDocと `docs/architecture.md` の該当節）が
「キャッシュを隠す」と説明しているのに、同じ関数が `source` 経由でキャッシュを受け取っている**
という食い違いも見つかったため、実装を変えない結論でも正典の修正は必須にしてある。

なお指示メモの `lib/config.validate.ts` は実際には `src/lib/config/validate.ts`（表記ゆれ）。

- verify-config.ts と validate-config.ts があって違いがわからない。lib/config.validate.ts もあって何がなんだか...改善してくれるかな。
- stageHelmTargetBranchUpdates に branchExists を渡していますが、source に gitlabCache も渡してるよね? branchExists を渡す必要ある?あまりキレイに見えず。

## 2026-09-09（3回目）

生成したタスク: **T-171**（429/502 のリトライが二重にかかっている件、`opus`、依存なし）。
タスクにしなかった項目は無い。ユーザーは提示した3案（実装＋正典の修正 / 正典だけ / 何もしない）の
うち1番目を選んだため、**実装の変更まで含めて検討するタスク**にしてある（ただしタスク側には
「実測の結果、実装は変えず正典だけ直す」で閉じる逃げ道を残した）。

## 429/502 のリトライが二重になっていて、効くほうが動いていない

T-159〜T-162 の作業中に gitbeaker のソースを読んで見つけた。**タスク1件として起こす**
（ユーザー判断、2026-09-09。選択肢は「実装＋正典の修正」「正典だけ」「何もしない」の3つで、
1番目を選択）。

- `@gitbeaker/rest` の `defaultRequestHandler` は `retryCodes = [429, 502]` を**内部で最大10回**
  リトライする。バックオフは `await delay(2 ** i * 0.25)` で、`function delay(ms)` は
  **ミリ秒**なので合計 255.75ms。つまり0.26秒のあいだに10連射しているだけで、
  レート制限（`Retry-After` は秒〜分単位）に対しては意味がない
- 使い切ると `GitbeakerRetryError` を投げる。このエラーは message だけで `cause` を持たないため、
  `src/utils/retry.ts` の `isRetryable()` は `extractHttpStatus()` から `undefined` を受け取り
  **false** を返す。結果、**本物の指数バックオフ（1s→2s→4s）を持つ自前のリトライが
  429/502 で一度も動かない**
- 503/504 は gitbeaker の `retryCodes` に入っておらず `throwFailedRequestError()` が
  `cause.response.status` を立てるので、自前のリトライが設計どおり効く
- `isFatalError(GitbeakerRetryError)` は false なので、該当設定ユニットが ERROR になり処理継続
- **`README.md` の「429 / 502 / 503 / 504 → 指数バックオフで最大3回リトライ」は
  429と502について事実と違う**

実害の大きさ: 毎日1回・3設定ユニットの定期実行なので429を踏む頻度は低い。「実装は変えず
正典だけ直す」も正当な結論になりうる。

補足: 当初「5分のタイムアウト（T-159）に当たるのでは」と述べたが**誤り**。合計0.26秒しか
待たないので当たらない。

## 2026-09-09（2回目）

生成したタスク: **T-158**（`isFatalError()` がネットワーク障害を検出できない件、`opus`）、
**T-159**（HTTPタイムアウト方針の決定、`opus`）、**T-160**（未使用の `logger.warn` の存否、`sonnet`）、
**T-161**（tsconfig のフラグ追加、`sonnet`）、**T-162**（ログのフィールドの型付け、`opus`、T-161依存）、
**T-163**（`cacheByArgs()` を `utils/` へ、`sonnet`）、**T-164**（`[] as string[]` の除去、`haiku`）、
**T-165**（設定ユニットの位置表示の一本化、`sonnet`）、**T-166**（config/ のファイル名リテラルの定数化、`sonnet`）、
**T-167**（タグ名内のブランチ名表現の一本化、`haiku`）、**T-168**（`duration_ms` の命名、`sonnet`）、
**T-169**（数値スカラーのクォート化、`sonnet`）、**T-170**（`helm.ts` のアンカー不在まわりのエラー表現、`sonnet`）。
E2 と E3 は同じ `src/lib/helm.ts` の同じ不変条件を扱うため T-170 に統合した。それ以外は
ユーザーの「1つ1つ判断しながら解きたい」という希望に沿って A1〜E1 を1項目=1タスクで分けている。
「調べたうえで『出さない』と決めたもの」の6項目は、正典に既に判断があるためタスクにしていない。

## ソースコード全体の棚卸し（アーキテクチャ・保守性・拡張性・可読性・型安全）

`src/` と `scripts/` の全44ファイル（3,377行）を読んで改善点を洗い出した。**正典の修正も
検討対象に含める。** ユーザーの希望は「1つ1つ判断しながら解きたい」ので、**項目ごとに
個別のタスクへ分ける**（まとめて1タスクにしない）。

各項目は洗い出し時にコマンドで裏を取ってある。ベースラインは `pnpm check` 通過・
32ファイル359テスト。

### A. 実装が正典の約束を守れていない

- **A1. `isFatalError()` がネットワーク障害を検出できていない。** `src/utils/http.ts:26` は
  エラー自身の `code` を見ているが、gitbeaker が使う undici の `fetch` は
  `TypeError: fetch failed` を投げ、`ECONNREFUSED`/`ENOTFOUND` は `cause.code` に入る。
  実測（gitbeaker 経由で存在しないホストへ `Projects.show`）で `isFatalError: false` を確認。
  `README.md`「エラーハンドリング」表・`CLAUDE.md`・`docs/coding-standards.md`
  「エラーハンドリング」の3箇所が「ネットワーク障害は即時終了」と書いているのに効いていない。
  `test/utils/http.test.ts:80` が実在しない平たい形（`Object.assign(new Error, {code})`）を
  検証しているためテストは緑のまま。
- **A2. HTTPリクエストにタイムアウトが無い。** `ETIMEDOUT` を fatal に数える設計なのに、
  `fetch` に既定タイムアウトは無く gitbeaker にも渡していない。`docs/requirements.md`・
  `docs/architecture.md`・`README.md` にタイムアウトの記述は0件で、方針そのものが未定。

### B. 撤回作業の取り残し

- **B1. `logger.warn` が本番コードから0回も呼ばれていない。** `git log -S` で追跡した結果、
  T-134（semver対応）で新設され、T-144 の撤回で唯一の呼び出し元が消えた（T-144 のコミット
  メッセージ自身が「『最新タグが決まらない』undefined 経路と app 単位スキップも消滅した」と
  書いている）。JSDoc の「例: 最新タグが決まらずappを見送った」は今は存在しない挙動の説明で、
  `docs/coding-standards.md`「コメント」に反する。生かしているのは `logger.test.ts` の2件だけ。

### C. 型安全

- **C1. tsconfig に足せるフラグがある。** `npx tsc --noEmit --<flag>` で1つずつ実測した:
  `noUnusedLocals` / `noUnusedParameters` / `exactOptionalPropertyTypes` / `noImplicitOverride` /
  `noFallthroughCasesInSwitch` / `isolatedModules` / `useUnknownInCatchVariables` は
  **エラー0件**。`noImplicitReturns` は1件（`src/lib/helm.ts:64`）。`erasableSyntaxOnly` は
  1件（`errors.ts` の parameter property）で、入れる価値は薄い。
  `exactOptionalPropertyTypes` は「`?:` を使わない」規約を型で機械的に固定でき、
  `noUnusedLocals` は B1 のような撤回残骸を次から自動検出する。
- **C2. ログのフィールドに型が無い。** `Record<string, unknown>` が6ファイル13箇所。`event` 名も、
  3つのstepの引数を貫通する `logContext` も、`describePlan()` の戻り値も全部これ。
  `noPropertyAccessFromIndexSignature` を入れるとテスト側で4件エラーになる（index signature
  越しにログを読んでいる証拠）。`docs/architecture.md`「型の置き場所」の表4行目
  （複数のstepが共有する、ドメイン型にだけ依存する型 → `steps/shared/`）に当てはまる。

### D. 重複・一貫性（片側だけ既に解けている系）

- **D1. `scripts/lint/verify-config/remote-cache.ts` が `batch-cache.ts` の `cacheByArgs()`
  相当を手書きしている。** キー3本を `#` 連結し、箱詰めも手書き。`#` はGitのブランチ名に
  使える文字なので `files` のキーは理屈上衝突しうる（`ref="a#b",path="c"` と
  `ref="a",path="b#c"`）。`batch-cache.ts` は `\0` 区切りで既に解いてある。`cacheByArgs` は
  技術非依存なので `utils/cache.ts` へ上げれば原則2に合うし、`docs/architecture.md` 自身が
  「`utils/cache.ts`に残るのは技術非依存のメモ化」と書いている。
- **D2. `scripts/lint/verify-config/verify-config.ts:98,169` に `[] as string[]` が2箇所。**
  `src` 側の同じ形（`resolve-latest-tags.ts:44`）は
  `const initial: readonly AppWithLatestTag[] = []` で `as` を避けている。同じ手が使えるのに
  片方だけキャストしていて、ついでに `readonly` も落ちている。
- **D3. `${chartDirName}/${unitPath}` の組み立てが3箇所**（`src/lib/config/validate.ts:55`、
  `scripts/lint/verify-config/verify-config.ts:56,76`）。設定ユニットの位置表示という
  ドメイン語彙なので `src/domain/config-unit.ts` に1本置ける。
- **D4. `"registry.yaml"` / `"config.yaml"` のリテラルが散っている**（`src/lib/config/config.ts`
  に5箇所、`chart-and-apps.ts` に1箇所、ほかエラーメッセージ内）。直近の T-157 がまさに
  この改名で25箇所を触った実績がある。
- **D5. `branch.replaceAll("/", "-")` が `src/domain/tag-format.ts` に2箇所**
  （`compileTagPattern` と `fillTagFormat`）。タグ名内でのブランチ名表現という同じ規則で、
  パースと生成の対称性を1関数で担保できる。
- **D6. ログキーで `duration_ms` だけ snake_case**（他は `httpStatus`・`chartDirName`）。
  `README.md:139` に出力例が載っているので、直すなら正典も同時に。

### E. 細かい挙動の穴

- **E1. `setValueAtAnchor()` が数値に見えるスカラーをクォート付きで書き戻す。** 実測で
  `- &ver 20260101` に書き込むと `- &ver "20260102"` になった。イメージタグは `{branch}` 必須
  なので該当しないが、`helm.branchToSync` の向き先ブランチ名が数字だけ（例 `2026`）だと
  values.yaml の差分にクォートが混じる。`docs/architecture.md`「その他」の
  「クォートスタイルは概ね保持」に、この条件が書かれていない。
- **E2. `findAnchorNode` は Scalar しか見ない**ので、アンカーがマップ/シーケンスに付いていると
  「アンカーが見つかりません」と報告する。原因が読み取れないメッセージになる。
- **E3. 「アンカーが無い」という同じ不変条件を `getRequiredValueAtAnchor` と
  `setValueAtAnchor` が別々に投げている**（呼び出し順が固定なので後者は到達しない）。

### 調べたうえで「出さない」と決めたもの（タスクにしない）

正典に既に判断があるものは蒸し返さない。念のため記録だけ残す:

- stepの入口の「並列実行 → 振り分け」の共通化 → `docs/architecture.md` が理由3点つきで却下済み
- `StepOutcome.settled` の SKIPPED/ERROR 分離 → T-151 でユーザー判断により着手しない決定済み
- `env.ts` のテスト専用 export → `docs/coding-standards.md` が例外として明記済み
- `reduceAsync`/`partitionMap` のスプレッド蓄積（O(n^2)）→ 不変性を核の規約にしている方針との
  トレードオフになるので、性能問題が出るまで触らない
- 未到達行3件 → 「埋めない穴」として理由つきで記録済み
- `coverage/` は `.gitignore` 済み（git追跡0件）で問題なし

## 2026-09-09

生成したタスク: **T-156**（正典の先行更新＋コード側識別子の追随範囲の決定、`opus`）、
**T-157**（実装・テスト・実`config/`・残りドキュメントの移行、`sonnet`、T-156依存）。
タスクにしなかった項目は無い。

## config/ のファイル名とキー名を実態に合わせる

`chart.yaml` は「chartだけの設定」ではなくなっており、更新対象のchartの設定と各appの設定の
両方を持っている。加えて `chart.yaml` が `chart:` + `apps:`、`config.yaml` が
`apps[].chart[]` という形で、**同じ2語が入れ子違いで両方のファイルに現れる**ため、
別々のことを定義しているのに鏡写しに見える。ここを解消する。

ユーザーと合意した変更（この3点はもう決まっているので、タスク側で論点にしない）:

- ファイル名 `chart.yaml` → `registry.yaml`
- キー `chart:` → `chartToUpdate:`（更新対象のchartであることを明示。`branchToSync` と同じ
  `XToY` の語形に揃える）
- キー `apps:` → `appSpecs:`（appの変わりにくい設定であることを明示。中身は
  `projectId` / `projectName` / `tagFormat`）

**`config.yaml` は変更しない**（ファイル名・キー名とも据え置き）。`apps[].chart[]` と
`helm.chart[]` も今回は触らない。

選定の過程で落とした案と理由（同じ案を再検討しないため）:

- `targetChart:` は使えない。`envConfig.targetChart`（環境変数 `TARGET_CHART`）が
  「chartディレクトリ名での絞り込み」という別の意味で既に存在する
- `updateTargetChart:` は型 `ChartUpdateTarget`（差分確定後の更新内容）と紛らわしい
- `chart-repo.yaml` / `chart-settings.yaml` は「chartだけの設定」と読めてしまい、
  元の不満がそのまま残る
- `chart-and-apps.yaml` は型 `ChartAndApps` と同名で範囲が違うため、別の混乱を生む
- `appDefaults:` / `appPresets:` は「上書き可能な既定値」と誤読される（実際は必須・上書き不可）

タスク化で決めること:

- コード側の識別子（`ChartYamlSchema`・`ChartApp`・`ChartRepoConfig` など）を
  YAMLキーに追随させるかどうか、させるならどこまで
- 正典（`docs/requirements.md` 4.4節・`docs/architecture.md`・`docs/glossary.md`）を
  先に更新してから移行するか（`tagFormat` の置き場所を変えたときの前例に倣うか）
- 実 `config/` の `chart.yaml` 1ファイルと、`docs/smoke-test.md` の手順の追随

## 2026-09-08（8回目）

生成したタスク: T-153（tagFormat の置き場所と anchors.yaml の新しいファイル名を決め、docs/requirements.md 4.4節を先に更新する）、T-154（決まった形へコード・実config・テスト・ドキュメントを移行する。T-153 に依存）。
**タスクにしなかった項目は無い。** 1指示を「正典の更新」と「実装への反映」の2つに割ったのは、
`docs/requirements.md` 4.4節が自ら「フィールドを追加・変更したときはこの節を先に更新する」と定めているため（既存の手順に沿った分割）。
裏取りで分かったこと3点: (1) この指示は `docs/architecture.md:621`「タグ形式はapp単位に config.yaml へ置く」という既存の設計判断を覆す、
(2) `anchors.yaml` も `config.yaml` と同じ設定ユニット単位のファイルなので、移しても `validateTagFormatConsistency()` が扱うスコープ不一致
（tagFormat はソースリポジトリ単位の性質）は解決しない、(3) 文字列 `anchors.yaml` は history/・dist/・coverage/ を除いて16ファイル106箇所、実ファイルは3つ。

- config.yaml の tagFormat は anchors.yaml に移したい(あまり変更されないから)。あと、tagFormatが加わることで anchors.yaml の名前が実態に合わなくなるから変えてほしいな

## 2026-09-08（7回目）

生成したタスク: T-151（StepOutcome の settled が SKIPPED と ERROR を混ぜている点を解く）、T-152（values-yaml-draft.ts の型と命名の見直し）。
**タスクにしなかった項目は無い。** 1件目は裏取りの結果、指摘どおり `settled` に SKIPPED（settle("SKIPPED") が4箇所）と ERROR（settleAsError() の戻り値）が同居していた。
加えて `settle()` の引数型が `ChartUpdateResult` で `"CREATED"` も受け取れる（実際には渡されない）実態より広い型であることも判明した。
消費側3箇所は両者を区別していないため、3枝に分けるか型を狭めるだけにするかを論点として残した。
2件目は4つのexport型のうち `ValuesYamlEntry` と `DraftValuesYaml` がファイル外で0件、
かつ `ValuesYamlDraft`（下書き本体）と `DraftValuesYaml`（読み込み結果）が語順を入れ替えただけの名前で隣り合っていることを確認した。

- StepOutcome が ok と settled の2種類だけど settled がスキップとエラーの2種あるように見えた。これは本当?本当だとするとそこを分けたほうが結果がわかりやすいんじゃないかと思ったんだけどどうかな
- values-yaml-draft.ts の型がなぜそういう型でまとめたのか、引数がなぜそういう命名なのかなど疑問に思う程度にはわかりづらい印象だった。型をなくす、型にまとめる単位の見直し、命名の見直しで見通しを良くして

## 2026-09-08（6回目）

生成したタスク: T-149（TARGET_UNITS / unitPath の説明文から実在しない具体名を外す）、T-150（ドキュメント整備の定型作業をスキル化する）。
1件目の progress.md の指示は**5回目で T-147・T-148 として登録済み**のため、新規タスクを作らず既存タスクに委ねた（同じ指示が再度書かれていた）。
**タスクにしなかった項目は無い。** 2件目は裏取りの結果 `central`・`tenant1/client1` がどちらも実在せず（実物は `anchor-app`・`tenant2/client1`・`tenant2/client2`）、
`README.md` と `.gitlab-ci.yml` の中で既に `t1/c1` 系の抽象形と混在していることを確認した。3件目は145タスク中10件（T-028・T-029・T-031・T-039・T-057・T-077・T-078・T-128・T-141・T-142）が
同じ形のドキュメント整備であることを確認し、定型化の裏付けとした。

- progress.md がメンテされてなく400行以上ある。タスクのtasks.jsonと一緒にメンテされるような仕組みにしてほしい
- TARGET_UNITS に central とか tenant1/client1 とか、特定の表現はないほうがいい
- docs/ ディレクトリ配下の history/ ディレクトリ配下以外のドキュメントとREADME.mdとCLAUDE.mdをメンテナンスし、冗長な表現、重複、人間にとって読みにくい構造を改善する、という タスクが定型化されつつあるから skills 化してほしい

## 2026-09-08（5回目）

生成したタスク: T-147（progress.md のアーカイブ基準とトリガーを定義し、tasks.json と同じ検査点に組み込む）、T-148（定めた基準で実際にアーカイブする。T-147 に依存）。
**タスクにしなかった項目は無い。** 「400行以上ある」は事実で（455行・42.7KB、うち376行が「完了したこと」）、
規約自体は既に `docs/workflow.md`「progress.md の構成」にあるが実行させる仕組みが tasks.json 側にしか無い、
という切り分けをしたうえで、方針決め（T-147）と適用（T-148）に分けた。

- progress.md がメンテされてなく400行以上ある。タスクのtasks.jsonと一緒にメンテされるような仕組みにしてほしい

## 2026-09-08（4回目）

生成したタスク: T-144（タグ形式の仕様を単純化する。semver廃止・`{time}`必須化・`tagNaming`→`tagFormat`・用語統一を1タスクにまとめた）。
**タスクにしなかった項目は無い。** 指示は `/grilling` セッションで合意した設計そのもので、
決定事項10件と進め方4件を T-144 の1タスクに統合した（分けると正典とコードが食い違う中間状態が
コミットされるため）。

## タグ形式の仕様を見直す（2026-09-08 のgrillingで合意）

タグの仕様を変えたあと、不必要にソースコードが複雑になったと感じている。再度検討したい。

grillingで確定した事実:

- 実物のタグは `{branch}-build-at-{date}-{time}` と `{date}-{time}-{branch}` の2パターン。
  **どちらも3プレースホルダ全部入り**。semverのリポジトリも `{time}` なしのリポジトリも予定にすら無い
- 形式が2種類ある以上、app単位で設定可能にすること自体は正しい（ここは削らない）

決めたこと:

1. `config.yaml` の `apps[].tagNaming`（`mode` 判別共用体）を **`apps[].tagFormat`（文字列・必須）** にする。
   既定値は持たせず、必ず書かせる
2. **semverモードを廃止する**。`mode` 判別共用体ごと畳む
3. **`{time}` を必須に戻す**（`{branch}`/`{date}`/`{time}` の3つとも各1回必須）。
   並び順・区切り文字が自由な自由記述テンプレートは**維持する**（実物2形式が並び順違いのため）
4. タグ自動作成は常に可能に戻る。「最新タグが決まらない」状態とapp単位スキップは消滅する
5. タイブレーク（順序キー同値ならタグ名の降順）は削除。テンプレートがapp単位で固定なら同値は原理的に起きない
6. `ParsedTag.orderKey`（`TagOrderKey`）を **`builtAt: Date`** に戻す。`compareTags()` のexportは消し、
   smokeは `builtAt` の直接比較に戻す。※`builtAt` 自体は残す必要がある。並び順が自由なので
   `v{time}_{branch}__{date}` のような形が書け、タグ名の辞書順と日時順は一致しないため
7. 正典から semver の記述は**完全に消す**（「検討して撤回した」という判断記録も残さない。
   経緯は `docs/history/tasks-archive.md` の T-132・T-134 の evidence に残るのでそこで足りる）
8. 廃止済み環境変数 `TAG_FORMAT` の記述は、**理由は残して識別子名は消す**。
   新キー `tagFormat` と1文字違いで紛らわしいため。「環境変数だとCIの `check` で検証できない」という
   理由自体は今も `config/` に置く根拠なので、識別子名を使わずに残す
9. 用語を「タグ命名規則」→ **「タグ形式」** に統一する。識別子（`tagFormat`/`TagFormat`/
   `tag-format.ts`/`validateTagFormat()`）と1:1に揃える。**コストより正確さを取る**。
   アーカイブ（`docs/history/`・`docs/requirements-grilling.md`）は触らない
10. `config-test/` の5appすべてに `tagFormat` を明示する。**2形式目は入れない**
    （スモークの期待値を同時に動かすとリスク軸が増えるため。並び順違いが動くことは単体テストで固定済み）

進め方:

- **1タスクにまとめる**（コード削除・テスト削除・正典追随・README追随を1コミットで整合させる）。
  分けると正典とコードが食い違う中間状態がコミットされるため
- **`git revert` は使わない**。`882ebec`(T-134) の後に T-138・T-140・T-143 が同じファイルを触っており、
  revertすると残すべきそれらまで巻き戻る
- `validateTagNamingConsistency()` は**残す**（キャッシュ誤共有の防止。比較は文字列比較に単純化）。
  `compileTagPattern()`・`escapeRegExp()` と T-143 の守りテスト6件も**維持**
- `DEFAULT_TAG_TEMPLATE` は既定値でなくなるので `src/` から消す。`test/helpers.ts` と
  `scripts/smoke/smoke-fixture.ts` は自前のリテラルを持つ（テストのためだけのexportをしない規約）

## 2026-09-08（3回目）

生成したタスク: T-132（`{date}`/`{time}` を外したときとsemverの設計を決める。実装しない）/
T-133（タグ命名規則を `config/` で設定できるようにする）/ T-134（semver対応）/ T-135（タグ名の日時をJSTに）。
**タスクにしなかった項目は無い。** ただし1項目め「`{date}`、`{time}`は不要にしよう」は**既存機能と正面衝突する**ため、
そのまま実装するタスクにはせず T-132 の第一の論点にした。`{date}`/`{time}` は (A) HEADを指すタグが複数あるときの
タイブレーク（`findLatestParsedTag()`）(B) **新しいタグ名の一意性**（`buildNewTag()`。`{branch}`だけだと生成名が常に
`main` になり既存タグと衝突して作成できない）(C) スモークのシード判定、の3つの役目を持っており、外すと
「タグ自動作成」（`docs/requirements.md` に明記された機能）が成立しない。semverも同様に、`v1.2.3` には
ブランチ名が入らないため `resolveTrackedHeadTagNames()` の「追跡ブランチ由来」の判定方法そのものが成立しない。
そのため「方針決め（T-132、実装なし）→ 設定の置き場所（T-133）→ semver（T-134）」の直列にした。
4項目め「サポートされていない設定パターンだったらCIで落とす」は**独立したタスクにしていない**。フォーマットを
`config/` に移すと `pnpm lint:validate-config` が `pnpm lint` → `pnpm check` 経由でCIの `check` ジョブに載っており
MR時点でZodスキーマと `validateTagFormat()` が走るため、T-133 の完了条件に畳み込んだ。
JST化（T-135）は他と独立して着手できるので `dependencies` を空にした。

- tag のフォーマットをユーザーが設定できるようにしたい。リポジトリごとにフォーマットが異なりそうなので。
  - 必要なのは一旦追跡ブランチを特定するために必要な情報({branch})だけにして、{date}、{time}は不要にしよう
  - タグは今の仕様に加えて semver に対応できるといいね
  - フォーマットはリポジトリのconfigに設定できるといいかな
  - サポートされていない設定パターンだったらCIで落とすようにしたいな
- tag の日時はJSTがいいな。今はUTCだと思うけど

## 2026-09-08（2回目）

生成したタスク: T-128（要件・用語の正典を「設定ユニット（深さ1〜2）」へ書き換え）/ T-129（コードの語彙を `unitPath` 1本に置換。振る舞い不変）/
T-130（走査を深さ1〜2に拡張し、入れ子を設定エラーに）/ T-131（`config-test/` に深さ1のユニットを作り e2e で混在を守る）。
**タスクにしなかった項目は無い**（1項目の指示で、設計判断4点はセッション内の対話で確定させたうえで4タスクに分割した）。
分割の方針は「正典を先に確定 → 振る舞いを変えない語彙置換 → 振る舞いを変える階層拡張 → 実ファイルのフィクスチャ」で、
**振る舞い不変のリファクタ（T-129）と振る舞いの変更（T-130）を分けてある**（前者は既存テストが全部通ることで守られるため）。

## テナント/クライアント2階層固定の廃止 → 「設定ユニット」への抽象化

ユーザーの原文:

> 1つ重要な要件変更をお願いしたい。README.md に「ディレクトリ階層は常に
> `<chartリポジトリ>/<tenantId>/<clientId>/` の2階層で固定です。テナント分けが不要な場合も
> ダミーの1つの tenantId/clientId ディレクトリ配下に置いてください。」とあるけど、これを
> 抽象化してテナント分けが不要なもの(例えば `<chartリポジトリ>/central/apps.yaml`) など
> chartリポジトリ配下すべてに対応することはできるかな? 変更範囲はかなり広いと思う。

### 確定した設計判断（このセッションでユーザーが選択）

1. **深さは1〜2に限定**。`<chart>/central/config.yaml`（深さ1）と
   `<chart>/tenant1/client1/config.yaml`（深さ2）の両方を許す。深さ0（`chart.yaml` と同階層に
   `config.yaml`）は不可、深さ3以上も不可
2. **入れ子は設定エラーで停止**。走査は `config.yaml` を見つけた時点でそれ以上降りるのを
   やめ、その配下にさらに `config.yaml` があれば起動時に例外を投げる
   （理由: Git の ref は D/F conflict を起こすため、`feature/yadokari/central` と
   `feature/yadokari/central/sub` は同一リポジトリに共存できない。入れ子禁止がこの制約を
   完全にカバーする ─ D/F conflict はパスがプレフィックス関係のときしか起きないため）
3. **後方互換は取らない**（新名称に統一）。ログの `tenantId`/`clientId` は廃止して1本化、
   環境変数 `TARGET_CLIENTS` も改名する。チーム内限定ツールなので破壊的変更を許容し、
   コードに条件分岐を残さないことを優先する
4. **新しい語彙は「設定ユニット」/ `configUnit`**（`updateUnit`・`scope` 案は不採用。
   前者は既存の `ChartUpdateTarget`/`ChartUpdateResult`/`AppUpdatePlan` の "Update" と
   衝突し、後者は `ACCESS_TOKEN` のスコープと衝突するため）
   - 型: `ConfigUnitPath`（ブランド型。値は `"central"` も `"tenant1/client1"` も取る）
   - フィールド: `ChartAndApps.unitPath`（`tenantId`/`clientId` を置き換える）
   - ログ: `{"chartDirName":"teamA-chart","unitPath":"central",...}`
   - 環境変数: `TARGET_UNITS="central,tenant2/client1"`
   - ブランチ: `feature/yadokari/<unitPath>`（深さ2のとき既存の文字列と完全一致するため、
     既存のオープンMR・ブランチは迷子にならない）
   - ファイル: `src/domain/client-ref.ts` → `src/domain/config-unit.ts` に改名。
     `formatClientRef`/`parseClientRef` は「相対パスの検証・正規化」に役割が変わる
     （深さ1〜2チェック、空セグメント拒否、`..` 拒否）
   - 日本語プロース: 「テナント/クライアント」→「設定ユニット」

### 影響範囲（このセッションで調査済み）

コア（2階層に依存しているのはこの6箇所だけ。パイプライン本体 build-plans / apply-updates /
helm.ts / gitlab.ts は tenant/client を一切見ておらず `ChartAndApps` を透過的に運ぶだけ）:

- `src/lib/config/config.ts:104-134` `listClientChartAndApps()` が `listSubdirectories()` を
  2回ネストする決め打ち走査。ここを深さ1〜2の再帰＋入れ子検出に置き換える。
  `clientDirExists()`（92-100行）も相対パス版に
- `src/domain/feature-branch.ts:12` `buildFeatureBranch(tenantId, clientId)` → `unitPath` 1引数
- `src/steps/apply-updates/sub-steps/build-mr-content.ts:10-30` MRタイトル
- `src/steps/shared/step-outcome.ts:99-100` `buildLogContext()` のログフィールド
- `src/lib/env.ts:80-127` `parseTargetClients()` / `parseTargetClientEntry()` → `TARGET_UNITS`
- `scripts/lint/verify-config/verify-config.ts:57,77` エラーの位置表示
- 型: `src/types/brand.ts` の `TenantId`/`ClientId` を削除し `ConfigUnitPath` を追加、
  `src/types/types.ts` の `TargetClient` を廃止（`ConfigUnitPath` 単体で足りる）、
  `ChartAndApps` のフィールド差し替え
- `src/lib/config/chart-and-apps.ts:24-35,74-75` シグネチャと戻り値

ドキュメント（作業量の大半はここ。「テナント/クライアント」がドメイン語彙として全体に浸透）:

- `docs/glossary.md`(15箇所) ─ 「テナント / クライアント」エントリを「設定ユニット」に
  差し替え、表記ゆれ注記として今回の経緯を書く。**正典なのでここを最初に直す**
- `docs/requirements.md`(41箇所) ─ 「4.4 アプリの登録・設定」が config/ 構成の正典
- `README.md`(24箇所) ─ 特に「設定」章の階層説明（162-163行）と環境変数表
- `docs/architecture.md`(23箇所) / `docs/smoke-test.md`(22箇所) /
  `docs/coding-standards.md`(2箇所)
- `docs/requirements-grilling.md`(27箇所) は**過去のQ&Aログなので書き換えない**（アーカイブ扱い）
- `.gitlab-ci.yml` の pipeline inputs（`TARGET_CLIENTS`）

テスト・フィクスチャ:

- `test/` 17ファイルが `tenantId`/`clientId` を参照（`test/helpers.ts`・
  `test/lib/config/fixture.ts` が土台）
- `config-test/` は深さ2のまま残しつつ、**深さ1のケースを1つ足して e2e で守る**
  （深さ1と深さ2が同じ chart 配下に共存できることの回帰テストになる）
- `scripts/smoke/smoke-fixture.ts`

## 2026-09-08

生成したタスク: T-123・T-124（要件シナリオに対するe2eテストの方針決めと実装）/ T-125（パラメータ化候補の洗い出し）/
T-126（`config/` の運用方針と既定パスの通し方）/ T-127（`apply-updates` のサブステップ粒度と `gitlab.ts` の薄いラッパー化）。
**3項目めの後半「必要ならGitLab上で実機テストするための環境を構築してほしい」はタスクにしなかった。すでに構築済みのため**
（`sinnlosses-group/yadokari-smoke-test-chart` + ソースリポジトリ2つ + `scripts/smoke/smoke-fixture.ts` の setup/reset +
`docs/smoke-test.md`。2026-09-07に実施して `{"CREATED":2,"SKIPPED":0,"ERROR":0}`）。残っている `config/` 側だけを T-126 にした。
4項目めの後半（`gitlab.ts` を薄いラッパーに戻す）は `docs/architecture.md`「コミット処理だけは`lib/gitlab/`がドメイン型を
知っている」節の**既存の設計判断を覆すもの**なので、覆すかどうかを T-127 の第一の論点にした。

- スモークテストはあるけど要件に沿った体系的なシナリオテストというか、e2eがなさそうだけど検討してもらえるかな
- このリポジトリで環境変数にすでに設定されている部分以外でパラメータ化できる部分を洗い出してほしい。パラメータ化して使う人が設定できるようにすべきか考えたいので。
- configディレクトリに実際に設定ファイルを置いて通してみたい。必要なら GitLab 上で実際に実機テストするための環境を構築してほしい。
- apply-updates.ts がサブステップの呼び出しの連鎖で成り立っていない部分があるのでリファクタしたい。現状は collectMrEntries -> buildMrContent -> commitFileUpdates -> createMergeRequest の流れだけど、commitFileUpdates と createMergeRequest はステップになってない。ステップになっていない2つを1つのステップとしてまとめると良さそう? あと、 gitlab.ts の commitFileUpdates はブランチのdeleteもやっていてgitlabの薄いラッパーと呼べないくらいの処理になっている。上記で作ったステップでそういった手順は組み、gitlab.tsでは薄いラッパーである役割を貫こう。

## 2026-09-07（3回目）

生成したタスク: T-121（`accessToken` をブランド型にする）/ T-122（`configPath` のリネームと検証）。
タスクにしなかった項目は無し。2点とも現物で裏が取れた（`EnvConfig` 8フィールドのうち
`gitlabUrl`/`targetChart`/`tagFormat` はブランド型なのに `accessToken` と `configPath` だけ素の
`string`。`configPath` のパストラバーサル検証は `env.ts` ではなく後段の `loadConfig()` にある）。

- env.ts の EnvConfig がよくわからない印象
  - accessToken は string のまま使っているけど型をつけたいな
  - configPath が具体的に何のconfigのpathかわからず、わかりやすい名前にしたいし、値の形式にvalidationもなさそうだね。形式が決まっているならvalidateしたいな

## 2026-09-07（2回目）

生成したタスク: T-120（タスクの実行モデルの決め方から「メインセッションのモデル」への従属を外し、
`difficulty` に沿ったモデルのサブエージェントへ依頼する運用に統一する）。タスクにしなかった項目は無し。
指摘は現物で裏が取れた（同日のセッションはメインがOpus 5の状態で `difficulty: sonnet` の
T-112〜T-115 を「メインがそのまま実行」しており、ラベルと実行モデルが一致していなかった）。

- tasks を処理する方法としてサブエージェントに必ず投げるようにする。現状はメインが担当することがあるがメインのモデルの切り替えを普通に行うことがあるので、一貫してサブエージェントに投げることで統一感を出す

## 2026-09-07

生成したタスク: T-116（dry-runの分岐の再考）/ T-117・T-118（async/awaitとthen/catchの方針確定と適用）/
T-119（`develop/test-inventory.md` の要否判断）。
タスクにしなかった項目は無し。3項目とも現物のコードで裏を取ったうえでタスク化した。

- dry_run の仕組みの再考。処理の途中で dry_run であるかどうかの分岐がところどころにある。これはキレイに分離できるならしたいけどアイデアがない。検討してほしい。
- async/await と then/catch の混在をどうするか(許容、使い分け、統一)を設計思想として確定させ、迷いがないように記録したい。その後、決められた方針に従い既存のコードの修正も行いたい。
- develop/test-inventory.md はまだ必要なファイル?不要なら削除をお願い

## 2026-09-06

**全項目が対応済み**。対応内容の詳細は同じディレクトリの
[`tasks-archive.md`](./tasks-archive.md) と
[`docs/architecture.md`](../architecture.md)「設計判断（なぜ今の形なのか）」を参照。
このメモはタスク化の運用（`/plan-tasks`）を決める前に書かれたものなので、
「各項目 → 生成したタスクID」の対応表は残っていない。

- 環境変数 TARGET_CLIENT は複数指定できる認識なので TARGET_CLIENTS に修正したほうが良さそう
- filter-targets で fatal なエラーが settled になってしまいそう。fatalなものは処理全体を落としてしまいたい
- try catch を少なく、あるいはどこで try catch を入れるかを決め打ちできないかを検討してほしい
  - fatal なものは処理を落とす、そうでないものは復帰してエラーとして計上する、これをいたるところで書くのを避けられるか、という課題
- 型の定義配置をリポジトリで統一感持たせたい。types/ディレクトリにあったり、filter-targetsのようにファイル内にあったり、build-plans/sub-steps/types.ts にあったりと一貫した設計方針がないのでブレている印象
- URLをstringで扱っている箇所があるように見え、URLインターフェースを使うなど型で縛ることを検討してください
- tasks.json と progress.mdをdevelop/ディレクトリを新しく作ってそこに配置してください(機能に関係ないファイルなので)
