# yadokari 実行レポート

- 実行時刻: 2026-09-15T00:54:27.044Z
- 所要時間: 672ms
- dryRun: true
- 件数: CREATED 0 / SKIPPED 0 / ERROR 4

| chart                      | unit            | 結果  | 理由                                                                                                                               |
| -------------------------- | --------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| yadokari-smoke-test-chart  | anchor-app      | ERROR | httpStatus: undefined, message: [chart: yadokari-smoke-test-chart] 環境変数 ACCESS_TOKEN_SMOKE のトークンで HTTP 401 が返りました  |
| yadokari-smoke-test-chart  | tenant2/client1 | ERROR | httpStatus: undefined, message: [chart: yadokari-smoke-test-chart] 環境変数 ACCESS_TOKEN_SMOKE のトークンで HTTP 401 が返りました  |
| yadokari-smoke-test-chart  | tenant2/client2 | ERROR | httpStatus: undefined, message: [chart: yadokari-smoke-test-chart] 環境変数 ACCESS_TOKEN_SMOKE のトークンで HTTP 401 が返りました  |
| yadokari-smoke-test-chart2 | shared-app      | ERROR | httpStatus: undefined, message: [chart: yadokari-smoke-test-chart2] 環境変数 ACCESS_TOKEN_SMOKE のトークンで HTTP 401 が返りました |
