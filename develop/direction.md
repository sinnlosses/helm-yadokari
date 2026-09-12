# 未対応の指示メモ（ここに書くと次のセッションが `/plan-tasks` でタスク化する。正典: `task-workflow` スキルの `WORKFLOW.md`）

## GitHub対応に向けた最小の一歩（2026-09-12）

`docs/research/github-support.md` の調査結果を受けた着手指示。**GitHub対応そのものはまだ
決めていない**ので、やるのは下の計測だけ。実装の全面着手はこの結果を見てから判断する。

- `ProjectId`（`src/types/brand.ts` の `number` のブランド型）を、GitHubの `owner/repo` も
  表せる形に変えられるかを**測る**。`projectId` は `src`+`scripts`+`test` で338箇所ある
- 知りたいのは「呼び出し側が無傷で済むか」の一点。無傷で済まない箇所が出たら、そこが
  GitHub対応の本当のコストなので、件数と場所を記録する
- `registry.yaml` / `config.yaml` の `projectId` は `z.number().int()`（`src/lib/config/schema.ts`）
  なので、設定ファイルの破壊的変更を伴う。**設定スキーマを実際に変えるかどうかは、
  計測結果を見てから別途判断する**（この指示には含めない）
- 漏れている残り2つ（`GitLabUrl` ブランド型・`PipelineInfo`）は今回は触らない
