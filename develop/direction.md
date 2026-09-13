# 未対応の指示メモ（ここに書くと次のセッションが `/plan-tasks` でタスク化する。正典: `task-workflow` スキルの `WORKFLOW.md`）

- バッチ1回分をまとめた成果物としてレポートを出したい。gitlabではartifactsになるよ。

  補足（アスナが現物を見て確認したこと。指示そのものではない）:
  - 今は `summary` イベントが `{CREATED, SKIPPED, ERROR}` の3件数を出すだけで、内訳は
    `update_unit` 行を自分で拾う必要がある。`runProcess()` の戻り値も
    `Record<ConfigUnitUpdateResult, number>` しか持っていない（`src/main.ts`）
  - `.gitlab-ci.yml` の `update-app-versions` は `pnpm start` を叩くだけで `artifacts` が無い
  - **`ERROR` が1件でもあると `src/index.ts` が exit 1 にするため、`artifacts:` には
    `when: always` が要る**（付けないと、一番レポートが欲しい失敗時に残らない）
  - `docs/requirements.md` 2.2 のスコープ外は「専用の通知機能（Slack通知等）」であって
    artifacts は含まれていない
  - このCLIは常に GitLab CI から回す前提（CLAUDE.md）なので、`PLATFORM=github` でも
    artifacts は GitLab 側の話で揃う

  決めること:
  - 形式（Markdown / HTML / JSON）と、GitLabのUIでどう見せるか
  - 載せる内容（設定ユニットごとの result と reason、作成したMRのURL、作成したタグ、
    エラーの詳細。どこまで載せるか）
  - 生成コードの置き場所（本体パイプラインから呼ぶので `scripts/` ではなく `src/`。
    ファイル形式に依存するので `src/lib/` か、集約を担う新しい step か）
  - `DRY_RUN=true` のときも出すか
