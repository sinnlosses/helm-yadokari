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

| 未到達                                                              | 埋めない理由                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/config/chart-and-apps.ts` 65                               | `internal error:` を投げる防御的分岐。`validateProjectLinkage` を通過した後は到達しない                                                                                                                                                                              |
| `src/lib/config/config.ts` 89（`formatChartDirs` の `"(なし)"`）    | エラーメッセージの文面だけが変わる分岐で、判断は変わらない                                                                                                                                                                                                           |
| `src/steps/build-plans/sub-steps/resolve-latest-tag.ts` 61          | `trackedHeadTagNames.size > 0` の時点でパース可能なタグが1件以上あるため、`if (latestAtHead)` の偽側には到達しない                                                                                                                                                   |
| `src/utils/http.ts` 42（`isFatalStatus` の `status === undefined`） | 唯一の呼び出し元が `status !== undefined` を確認済みで到達しない。**テストではなくコード側の問題**で、引数の型を `number` に狭めれば分岐ごと消える（`docs/coding-standards.md`「避ける `undefined`」の「実行時には到達しないのに型に残っている `undefined`」に該当） |
| `src/steps/shared/describe-plan.ts` 19（`map` のコールバック）      | Helmの向き先ブランチ更新のログサマリが、空配列でしか組み立てられていない。更新そのものの振る舞いは `stage-helm-target-branch-updates.test.ts` が確かめており、未到達なのはログの文面だけ                                                                             |
