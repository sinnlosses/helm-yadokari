# テストの棚卸し（発見リスト）

`docs/coding-standards.md`「テスト」節の基準を、現状の31ファイル・337テストに当てた結果。
**この文書は発見リストであって、ここに書いたことはまだ実施していない。**

計測時点: `pnpm test:coverage` で Statements 97.19% (623/641) / Branches 95.75% (271/283) /
Functions 97.13% (237/244) / Lines 97.54% (556/570)。

削除候補の「skip確認」は「テスト」節の削除の手続きの2ステップ（`it.skip` にして
`pnpm check` が落ちない／`pnpm test:coverage` の到達行・分岐が減らない）を回した結果。

## 削除候補（9件）

| テスト                                                                                                    | 冗長と見た理由                                                                                                                                                                                            | skip確認               |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `test/lib/env.test.ts` parseTargetClients の「区切り文字が2つ以上あるエントリがあるとき例外をスローする」 | `parseTargetClients` は分解を `parseClientRef` に委譲しており、同じ分岐を `test/domain/client-ref.test.ts` が通している。env側は「不正形式なら例外にする（`undefined` を返さない）」を確かめる1件で足りる | 両ステップとも変化なし |
| 同上「tenantIdが空のとき例外をスローする」                                                                | 同上                                                                                                                                                                                                      | 両ステップとも変化なし |
| 同上「clientIdが空のとき例外をスローする」                                                                | 同上                                                                                                                                                                                                      | 両ステップとも変化なし |
| `test/utils/timer.test.ts`「duration_ms に経過時間（ms）を返す」                                          | `toBeGreaterThanOrEqual(0)` と `typeof duration_ms === "number"` は戻り値の型が既に保証している                                                                                                           | 両ステップとも変化なし |
| `test/utils/partition.test.ts`「片側に1件も振り分けられない場合も、もう片側は正しく積まれる」             | 「空配列のとき left/right とも空配列を返す」と「入力順を保つ」が同じ分岐を通す                                                                                                                            | 両ステップとも変化なし |
| `test/lib/gitlab/gitlab.test.ts` getBranchHeadSha の「404以外のエラーは再スローする」                     | `branchExists` / `getBranchHeadSha` / `getFileContent` は同じ `withNotFoundFallback` を通る。branchExists の「404 以外のエラーは再スローする」1件を残せば足りる                                           | 両ステップとも変化なし |
| 同上 getFileContent の「404以外のエラーは再スローする」                                                   | 同上                                                                                                                                                                                                      | 両ステップとも変化なし |
| `test/utils/http.test.ts` isFatalError の「500番台のその他のステータスのとき true を返す」                | 「HTTP 500 エラーのとき true を返す」と同じ分岐（`status >= 500`）                                                                                                                                        | 両ステップとも変化なし |
| 同上「fatal 扱いしないステータス(200/402)のとき false を返す」                                            | 「HTTP 403 エラーのとき false を返す」「HTTP 404 エラーのとき false を返す」と同じ分岐                                                                                                                    | 両ステップとも変化なし |

## 重複の集約候補（削除ではない・2件）

- **`build-plans` 系4ファイルの `beforeEach`**: `test/steps/build-plans/build-plans.test.ts` と
  `sub-steps/` の3ファイルが、`listTags` / `getBranchHeadSha` / `getFileContent` /
  `getLatestPipelineForRef` / `createTag` / `branchExists` のモック設定と定数
  `OLD_TAG` / `NEW_TAG` / `HEAD_SHA` を同じ内容で持っている。`test/helpers.ts` に寄せる
- **`const mockGitlab = {} as unknown as GitlabClient`**: 9ファイルに同じ行がある。
  `as` を使わない規約の例外を1箇所に閉じ込める意味でも `test/helpers.ts` に置く

## 要調査（1件）

- `test/steps/build-plans/build-plans.test.ts` をファイルごと除外しても、減るカバレッジは
  `values-yaml-draft.ts` の1文・1分岐だけだった。`sub-steps/` の3ファイルと同じ経路を
  通している疑いが強い。ステップ自身の契約（集約とエラーの振り分け）を確かめていないケースは
  削除候補になりうるので、テスト単位で削除の手続きを回して判断する

## 消さないと決めたもの（3件）

- `test/domain/tag-format.test.ts` の describe「TAG_FORMATのプレースホルダの並び順・区切り文字は
  任意（回帰テスト）」2件: skip してもカバレッジは変わらないが、過去の不具合の再発防止として
  書かれた回帰テストなので残す（基準の表の「回帰テスト」行）
- `test/lib/gitlab/gitlab.test.ts`「createClient > Gitlab インスタンスを返す」: 薄いラッパの
  確認に見えるが、skip すると `createClient` の1文・1関数が唯一の守り手を失う
- `test/lib/config/schema.test.ts` 全6件と
  `test/steps/build-plans/sub-steps/stage-image-tag-updates.test.ts` 全体: ファイルごと除外しても
  カバレッジは1行も減らない。拒否される設定の内容という別の振る舞いを固定しているので残す
  （カバレッジ不変は単独では削除理由にしない、の実例）

## 追加候補（4件）

| 未到達                                              | 何を防ぐテストか                                                                                                                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts` 8-19（ファイル全体が未到達）         | `run()` の `SUCCESS` / `PARTIAL_FAILURE` を終了コード 0 / 1 に写す部分。「失敗が1件でもあれば終了コードを非ゼロ」の要件が壊れても誰も気づかない。`FatalError` を `fatal_error` イベントとして構造化ログに出す分岐も同じ |
| `src/lib/gitlab/gitlab.ts` 35-38（`projectExists`） | 404 のときだけ `false`、それ以外は再スロー。CIの `validate-config-remote` ジョブの判定そのもので、ここが壊れると存在しない projectId が通る。他のGitLab関数と違いテストではモックされるだけで直接の検証が無い           |
| `src/lib/env.ts` 77-86（`loadEnvConfig()` 未実行）  | `dryRun: loadOptionalEnv("DRY_RUN") === "true"` と `configPath ?? DEFAULT_CONFIG_PATH` はこの関数にしか無い。dry-run は要件が明示している振る舞いで、個別パーサのテストでは守れない                                     |
| `scripts/lint/verify-config/verify-config.ts` 56    | 1つの chartAndApps の検証が例外で落ちても他の検証を続け、メッセージとして返す分岐。エラー方針（fatal 以外は記録して継続）そのもの                                                                                       |

## 埋めない穴（5件）

| 未到達                                                              | 埋めない理由                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/config/chart-and-apps.ts` 65                               | `internal error:` を投げる防御的分岐。`validateProjectLinkage` を通過した後は到達しない                                                                                                                                                                                      |
| `src/lib/config/config.ts` 89（`formatChartDirs` の `"(なし)"`）    | エラーメッセージの文面だけが変わる分岐で、判断は変わらない                                                                                                                                                                                                                   |
| `src/steps/build-plans/sub-steps/resolve-latest-tag.ts` 61          | `trackedHeadTagNames.size > 0` の時点でパース可能なタグが1件以上あるため、`if (latestAtHead)` の偽側には到達しない                                                                                                                                                           |
| `src/utils/http.ts` 42（`isFatalStatus` の `status === undefined`） | 唯一の呼び出し元が `status !== undefined` を確認済みで到達しない。**テストではなくコード側の問題**だったため、引数の型を `number` に狭めて分岐ごと削除済み（`docs/coding-standards.md`「避ける `undefined`」の「実行時には到達しないのに型に残っている `undefined`」に該当） |
| `src/steps/shared/describe-plan.ts` 19（`map` のコールバック）      | Helmの向き先ブランチ更新のログサマリが、空配列でしか組み立てられていない。更新そのものの振る舞いは `stage-helm-target-branch-updates.test.ts` が確かめており、未到達なのはログの文面だけ                                                                                     |

## 実施結果

削除・集約・追加を実施した後の計測: Statements 99.37% / Branches 97.87% / Functions 99.59% /
Lines 99.82%（実施前は 97.19 / 95.75 / 97.13 / 97.54）。32ファイル・337テスト。

- **削除候補9件は全件削除した**。1件ずつ `it.skip` にして `pnpm check` の通過とカバレッジ表の
  不変を確認し、9件をまとめて削除した後にもう一度カバレッジ表が実施前と完全一致することを
  確認した（削除で減った9件は、直後に追加した7件と相殺されて総数337に戻っている）。
- **集約2件を実施した**。`mockGitlab` と `OLD_TAG`/`NEW_TAG`/`HEAD_SHA`、`build-plans` 系の
  `beforeEach` の中身（`mockBuildPlansGitlab()`）を `test/helpers.ts` に寄せた。
  `as unknown as GitlabClient` はテスト本体から消え、`helpers.ts` と `gitlab.test.ts` の
  `makeClient()` の2箇所だけになった。
- **要調査1件は「残す」と判断した**。`build-plans.test.ts` の10件は SKIPPED/ERROR の振り分け、
  オールオアナッシング、`FatalError` の伝播、アプリ名付きのエラーメッセージという
  ステップ自身の契約を固定している。カバレッジが減らないことは単独では削除理由にしない
  （「テスト」節の表の最終行）。
- **追加4件は7テストとして実施した**（`test/index.test.ts` 4件、`projectExists` 2件、
  `loadEnvConfig()` 2件、`verify-config.ts` の catch 1件、うち `index.ts` は1ファイルで4件）。
  いずれも対象行に到達していることをカバレッジで確認した。
- **埋めない穴5件は埋めていない**。実施後も同じ5箇所が未到達のまま残っている。

### 追加テストで見つかった食い違い（修正済み）

`src/index.ts` の冒頭コメントは「環境変数の読み込みを非同期の中で呼ぶのは、その失敗も下の
catch に載せて構造化ログに出すため」と説明していたが、`run(loadEnvConfig())` は引数が先に
同期評価されるため、`loadEnvConfig()` の失敗は `.catch` に載らずモジュール評価の例外として
素のスタックトレースになっていた。`Promise.resolve().then(() => run(loadEnvConfig()))` に
変えてコメントの説明どおりの挙動にし、`test/index.test.ts` に環境変数の読み込みが失敗する
ケースを足した。

## 要件シナリオとの突き合わせ（2026-09-08・34ファイル352テスト時点）

`docs/requirements.md` 4.1〜4.5 の各項目に対して、それを通す自動テストがあるかを突き合わせた
結果。結論（e2eを足す／足さない）と、そこで採った境界の理由は
`docs/coding-standards.md`「通し（e2e）で守るのは『実ファイル → MRの中身』の連結だけ」が正典。
**この表は当時の調査記録であって、要件を変えるたびに追従させるものではない。**

| 要件の節                      | それを通す自動テスト                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 通っていない部分                                                                                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4.1 バージョン判定            | `test/domain/tag-format.test.ts`（命名規則・`TAG_FORMAT`の並び順/区切り）、`test/steps/build-plans/sub-steps/resolve-latest-tags.test.ts`（HEADを指すタグの探索・無ければ作成・既存タグ再利用・`branchToSync`切り替え・HEAD一致時のスキップとその例外・dry-run時のタグ作成抑止・403時のERROR）                                                                                                                                                                                              | 無し                                                                                                                                                                                                                                                         |
| 4.2 更新ワークフロー          | `test/steps/apply-updates/apply-updates.test.ts`（MR単位・固定ブランチ名・`mrTargetBranch`）、`test/domain/feature-branch.test.ts`、`test/steps/filter-targets/filter-targets.test.ts`（オープン中MRのスキップ）、`test/steps/apply-updates/sub-steps/submit-merge-request.test.ts`（残った固定ブランチの削除→`baseBranch`から作り直し→コミット→MR作成）、`build-mr-content.test.ts` / `collect-mr-entries.test.ts`（タイトルの件数表記・本文の2セクション・比較URL・パイプラインのリンク） | MRのタイトル・本文・コミット内容を、`test/helpers.ts` の手組みデータではなく**実ファイル（`config/`のYAMLと`values.yaml`）から通した結果**                                                                                                                   |
| 4.3 複数app・chart・client    | `test/main.test.ts`（サマリー件数・`SUCCESS`/`PARTIAL_FAILURE`）、`test/index.test.ts`（終了コード0/1）、`build-plans.test.ts`（client内オールオアナッシング・他clientへの非波及・`FatalError`の伝播）、`filter-targets.test.ts`、`test/utils/parallel.test.ts`（同時実行数制御）                                                                                                                                                                                                           | 「1回の実行で複数chart・複数tenant/clientをまとめて処理する」を、実ファイルの階層から**複数のMRが並ぶところまで**通すこと                                                                                                                                    |
| 4.4 アプリの登録・設定        | `test/lib/config/config.test.ts` / `schema.test.ts` / `validate.test.ts`（一時ディレクトリに実YAMLを書いて`loadConfig()`に読ませる。走査・3ファイルの読み分け・`chart[]`複数指定・`helm.*`のマージと整合性・紐づけ検証・重複検証・スキーマ違反）                                                                                                                                                                                                                                            | `loadConfig()`の戻り値がパイプラインへ入る先は常に `makeChartAndApps()` の手組み。gitで管理している唯一の実設定 `config-test/` は `pnpm check` のどこからも読まれない（`pnpm lint:validate-config` は既定の `config/` を見るが中身は `README.md` だけで0件） |
| 4.5 特定chart・client限定実行 | `test/lib/env.test.ts` / `test/domain/client-ref.test.ts`（`TARGET_CHART`/`TARGET_CLIENTS`のパース）、`config.test.ts`「target絞り込み」「絞り込み結果が0件のときの検知」、`main.test.ts`（`run()`が`loadConfig`へ渡す引数）                                                                                                                                                                                                                                                                | 絞り込んだ結果として**実際に作られるMRが減る**こと（`loadConfig`がモックのため引数の確認で止まっている）                                                                                                                                                     |
| 5章 dry-run                   | `test/main.dry-run.test.ts`（gitbeaker境界で`Tags.create`/`Branches.remove`/`Commits.create`/`MergeRequests.create`が0回、`DRY_RUN=false`なら起きる）                                                                                                                                                                                                                                                                                                                                       | 無し                                                                                                                                                                                                                                                         |

要件の項目そのものはすべてどこかの単体テストが通しており、穴は項目ではなく**その間の連結**
（`config/`の実ファイル → `loadConfig()` → 3ステップ → コミット内容・MRタイトル・MR本文）
1箇所に集約される。実機スモークテスト（`docs/smoke-test.md`）はこの連結を通しているが、手動で
GitLabへの書き込みを伴うためCIからは実行できない。
