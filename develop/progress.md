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

## 次にやること

棚卸し（2026-09-09）で登録した13件。**ユーザーの希望で1項目=1タスクに分けてあるので、
1件ずつ判断しながら進める。** 着手順のおすすめは T-158 → T-161 → T-160 → T-163・T-164。

**承認が要る＝`/loop /next-task` に載せないもの: T-159・T-162・T-168 の3件。**

- **T-158（`isFatalError()` がネットワーク障害を検出できない、`opus`、依存なし）**。
  実測で確認済みの**本物のバグ**。undici の `fetch` は `TypeError: fetch failed` を投げ、
  `ECONNREFUSED`/`ENOTFOUND` は `cause.code` に入るが、`src/utils/http.ts:26` は
  エラー自身の `code` しか見ていない。正典3箇所（`README.md`・`CLAUDE.md`・
  `docs/coding-standards.md`）が「ネットワーク障害は即時終了」と書いているのに効いていない。
  `test/utils/http.test.ts:80` が実在しない平たい形を検証しているので**テストは緑のまま**。
- **T-159（HTTPリクエストのタイムアウト方針を決める、`opus`、依存なし）**。`ETIMEDOUT` を
  fatal に数えているのにタイムアウトを設定していない。正典に記述が0件で方針そのものが未定。
  **「入れない」も正当な結論**で、その場合は理由を正典に書いて閉じる。`/loop` 不可。
- **T-160（未使用の `logger.warn` の存否、`sonnet`、依存なし）**。T-134 で新設され T-144 の
  撤回で唯一の呼び出し元が消えた残骸。JSDoc が今は無い挙動を説明している。
- **T-161（tsconfig のフラグ追加、`sonnet`、依存なし）**。実測でエラー0件の7フラグ
  （`noUnusedLocals`・`exactOptionalPropertyTypes` ほか）＋`noImplicitReturns`（1件、
  `src/lib/helm.ts:64`）。`exactOptionalPropertyTypes` は「`?:` を使わない」規約を型で固定し、
  `noUnusedLocals` は T-160 のような撤回残骸を次から自動検出する。
- **T-162（ログのフィールドの型付け、`opus`、T-161依存）**。`Record<string, unknown>` が
  6ファイル13箇所。**出力JSONのキー名・値を1つも変えない**ことが設計の前提。`/loop` 不可。
- **T-163（`cacheByArgs()` を `utils/cache.ts` へ上げる、`sonnet`、依存なし）**。
  `remote-cache.ts` が `batch-cache.ts` と同じ仕組みを手書きしている。`#` 連結のキーは
  理屈上衝突しうる（`batch-cache.ts` は `\0` 区切りで既に解決済み）。
- **T-164（`[] as string[]` の除去、`haiku`、依存なし）**。`verify-config.ts:98,169`。
  `src` 側（`resolve-latest-tags.ts:44`）は同じことを `as` なしで書いている。
- **T-165（設定ユニットの位置表示の一本化、`sonnet`、依存なし）**。
  `${chartDirName}/${unitPath}` が3箇所。**T-164 と同じファイルを触る**ので前後に注意。
- **T-166（`config/` のファイル名リテラルの定数化、`sonnet`、依存なし）**。T-157 の改名が
  25箇所を触った実績があるので、次の改名のコストを下げる。
- **T-167（タグ名内のブランチ名表現の一本化、`haiku`、依存なし）**。
  `branch.replaceAll("/", "-")` が `tag-format.ts` に2箇所。パースと生成の対称性が前提。
- **T-168（`duration_ms` のログキー命名、`sonnet`、依存なし）**。唯一の snake_case。
  `README.md:139` に出力例があり**外部インターフェース**なので承認が要る。`/loop` 不可。
- **T-169（数値スカラーのクォート化、`sonnet`、依存なし）**。`- &ver 20260101` に書き戻すと
  `"20260102"` になる（実測）。イメージタグは `{branch}` 必須なので該当せず、
  `helm.branchToSync` が数字だけのときだけ起きる。**「正しい挙動」と結論して正典に書いて
  閉じてよい**。
- **T-170（`helm.ts` のアンカー不在まわりのエラー表現、`sonnet`、依存なし）**。スカラー以外に
  付いたアンカーを「見つからない」と報告する件と、同じ不変条件を2関数が投げている件。
  **どちらも「今のままでよい」と結論して閉じてよい**。

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
