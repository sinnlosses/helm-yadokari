# 未対応の指示メモ（ここに書くと次のセッションが `/plan-tasks` でタスク化する。正典: `task-workflow` スキルの `WORKFLOW.md`）

- バッチ1回分をまとめた成果物としてレポートを出したい。gitlabではartifactsになるよ。

  **方針はユーザーと詰めて確定済み（2026-09-13のチャット）。タスク化はこの決定に従う。**

  決めたこと:
  - **集約は `src/` 側で行う**。`ConfigUnitUpdateResult`（`"CREATED" | "SKIPPED" | "ERROR"` の
    文字列）を result + reason を持つレコード型に広げ、4stepの戻り値を通して `src/main.ts` の
    `runProcess()` 末尾で書き出す。ログを `scripts/` で整形する案と、`logger` に蓄積させる案は
    採らない（後者は `logger` がグローバルな可変状態を持つため）
  - **形式は Markdown 1枚**。JSONは出さない
  - **粒度は設定ユニット単位の1行**（chart / unit / 結果 / 理由）。アプリ単位の内訳
    （`describePlan()` の結果）はレポートに運ばない。詳細はログとMR本文に任せる
  - **MRのURLは載せない**。`adapter.createMergeRequest()` は `Promise<void>` のまま変えない
    （`docs/requirements.md` 2.2「標準のMR・PR通知に任せる」に沿う）
  - **`FatalError` のときはレポートを出さない**。fatal は `runProcess()` を貫通して
    `src/index.ts` の `catch` に飛ぶので、末尾の書き出しには到達しない。それでよい
    （全設定ユニット共通の異常で即時終了する設計なので、部分的なレポートに意味が薄い）
  - **`DRY_RUN=true` のときも出す**。ヘッダに `dryRun: true` を明示し、MRが作られていないことが
    レポートだけで分かるようにする

  置き場所（原則から決まる）:
  - 出力パスの環境変数 → `src/lib/env.ts` の `EnvConfig` に1フィールド追加
    （`parseConfigRootPath()` のパストラバーサル検証に倣う）
  - ファイル書き出し → `src/lib/` に新規（原則2。`node:fs` と Markdown 形式に依存する）
  - 集約レコードの型 → `src/domain/types.ts`（既存の `ConfigUnitUpdateResult` を広げる形）
  - 集約して書き出す呼び出し → `src/main.ts` の `runProcess()` 末尾（`summarizeResults()` の隣）

  実装で引っかかる点（調査済み）:
  - レポートに要る情報は現在**5箇所の `logger.info` / `logger.error` の引数の中にしか無い**。
    `main.ts` まで戻るのは結果の文字列だけ
  - `reason` は型を持っておらず、5箇所で個別に組み立てられている:
    `"no_apps"`・`"mr_exists"`（`filter-targets.ts:51,57`）、`"no_diff"`・`"dry_run"`
    （`build-plans.ts:86,92`）、エラー文字列 `httpStatus: X, message: Y`
    （`step-outcome.ts:147`）。レコードに載せるならこれを型にする必要がある
  - `settle()`（`step-outcome.ts:43`）が `ConfigUnitUpdateResult` しか受け取らないので、
    reason を運ぶならここの引数が変わる。`StepOutcome<T>` の `settled` も同様
  - `.gitlab-ci.yml` の `update-app-versions` に `artifacts` を足す。**`when: always` が必須**
    （`ERROR` が1件でもあると exit 1 になり、既定の `on_success` では回収されない）。
    パスは `$CI_PROJECT_DIR` 配下であること。`expire_in` も明示する
  - `docs/requirements.md` 2.2 のスコープ外は「専用の通知機能（Slack通知等）」であって
    artifacts は含まれていない
