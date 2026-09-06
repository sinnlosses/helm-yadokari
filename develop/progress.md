# 現在の状態

最終更新: 2026-09-06（リポジトリ全体をレビューし、改善点を洗い出してタスク化した。
コード変更なし。完了済みの T-071〜T-076 を `docs/history/tasks-archive.md` へ、
前セッションの記録を `docs/history/progress-archive.md` へアーカイブし、
`tasks.json` は T-077〜T-091 の15件の `todo` だけになっている）

T-001〜T-076 はすべて完了し、[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)
へ移した。過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

**コードは1行も変えていない。** `src/` `scripts/` `test/` の全ファイル・全ドキュメント・
CI設定を読み、改善点を洗い出して `tasks.json` に15件登録しただけ。着手前の状態は
`pnpm check`（31ファイル330テスト）通過・カバレッジ 97.31%（stmts）。

洗い出した改善点は5系統:

- **ドキュメントの実装との乖離**（T-077 / T-078）。README の実行ログ例が実際の出力と違う
  （`chartDir` は `chartDirName`、`apps[]` に `previousTag` というキーは存在しない）、
  `CLAUDE.md` のテスト方針が現存しない関数 `buildChartUpdate()` を例示、
  `docs/glossary.md` が `loadApps()`・`ImageTagTarget`・`chartDir` という削除済み/改名済みの
  識別子を現役として書いている、`src/utils/partition.ts` のJSDocのコード例が実際の
  `StepOutcome` と合っていない、`.gitlab-ci.yml` の inputs 説明だけ「1以上」で実際の1〜20と不一致
- **命名の一貫性**（T-080/T-081 / T-082 / T-083）。最大のものは `AppConfig.chart`
  （書き込み位置の配列）と `ChartAndApps.chart`（chartリポジトリの情報）が**同名で別物**な件で、
  `build-plans.ts` の中で数十行の距離に同居している。ほかにブランド型の取りこぼし2件
  （`ConfigTarget.chartDirName` と `resolveHelmTargetBranch()` の `projectName` が素の `string`）と、
  `commitSha` にブランド型を入れるかの判断
- **不変性**（T-084 / T-088）。ドメイン型はほぼ全て `readonly` なのに、ステップ境界を跨ぐ型
  （`ChartUpdateTarget.plans`/`files`、各ステップの戻り値、`partitionMap()` の戻り値）だけが
  可変配列で、そのせいで `buildPlan()` に `[...plans]` というコピー専用の spread が要る。
  `LoadValuesYamlContent` の「呼び出し側が `new Map(acc.draft)` を渡し実装が破壊的に埋める」
  契約も、周囲の不変な作りから浮いている
- **設計の再検討**（T-085 / T-086 / T-087 / T-090）。`src/lib/env.ts` のトップレベル副作用が
  3つの迂回（`validate-config.ts` の動的import、`vitest.config.ts` の全テストへのenv注入、
  `main.test.ts` のenvモック）を生んでいる件、`main.ts` の `process()` がグローバル `process` を
  覆っている件（`docs/architecture.md` 自身が「その名前は使わない」と書いている）、
  `filter-targets` と `build-plans` の入口の完全重複、`CONCURRENCY_LIMIT` の外側で
  無制限に並列化している `Promise.all` 3箇所
- **スクリプト・リポジトリ衛生**（T-079 / T-089 / T-091）。対応済みの指示メモ `direction.md` が
  リポジトリ直下に残っている、スモークテスト用スクリプトにソースリポジトリの projectId が
  直書き＋タグの新旧を辞書順比較している（`TAG_FORMAT` を変えると誤判定）、
  `pnpm lint` が `test/` を対象にしていない

**検討したが登録しなかったもの**（次に同じ調査をしないための記録）:

- `src/utils/logger.ts` の `redact()` がトップレベルのキーしか伏せない件 —— 現状ネストした
  オブジェクトに認証情報を入れて出力する経路が無く、予防的すぎるため見送り
- `partitionMap()` / `reduceAsync()` が `[...acc, x]` で配列を積む O(n²) の書き方 ——
  n が chartAndApps 数・アプリ数（数十）なので実害が無く、不変性を優先した現在の書き方が方針どおり
- `image-tag-target.ts` と `helm-target-branch-target.ts` の構造的な相似 —— 共通化すると
  サブステップ同士が型を共有する形になり、`sub-steps/shared/` を太らせるだけで得が無い

## 次にやること

`tasks.json` の T-077〜T-091（15件）はすべて `todo`。依存関係は T-081 → T-080 の1本だけで、
他は独立に着手できる。着手順の目安:

1. まず機械的なもの（T-077 / T-079 / T-091）でノイズを消す
2. 次に方針決めが要るもの（T-080 / T-083 / T-085 / T-087 / T-088）。いずれも
   「決めた内容を `docs/architecture.md` に記録する」ところまでが完了条件
3. T-090（無制限 `Promise.all`）は**低優先**。他を片付けた後でよい

以下は前セッションから引き継いだ未処理事項:

- **`main` が `origin/main` より2コミットahead。pushが未実施**（外部への反映のため
  ユーザー承認が要る）
- T-064以降の変更は**実機未検証**。特に T-069（URL検証の追加）と T-076（MR本文のURL解決の
  作り替え）はスモークテストで1回通しておきたい
- `TARGET_CHART` の0件検知、追跡ブランチ切り替えも実機未検証
- 前回のスモークテストで残したMR（!26、!27）とブランチ2本の後片付け（不要になったら
  `SMOKE_CHART_PROJECT_ID=86061211 npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply`）
- 検証が完全に終わったら、テスト用のGitLabアクセストークンを失効させる（ユーザー対応）

## 未解決

- なし

## 注意

- `config/` には実運用の登録だけを置く（架空の設定例を置くとCIの `validate-config-remote` が
  必ず失敗する）。記述例は `docs/requirements.md` 4.4節、実物に近いサンプルは `config-test/`
- `<名前>/<名前>.ts` の形（`src/lib/` の gitlab / config、`scripts/lint/verify-config/`）で
  統一している。同名のファイルとディレクトリを並べない
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている
- `src/lib/config/config.ts` に oxlint の `no-shadow` 警告が2件あるが、分割前からある既存の警告
  （`loadClientChartAndApps` の引数 `target` と、内側の `.map((target) => ...)`）
- リモートは`origin`が`github.com/sinnlosses/helm-yadokari`と`gitlab.com/sinnlosses-group/helm-yadokari`の
  2つの push URL を持つ。`git push`/`git fetch`は両方に対して行われる
- gitlab.com上に検証用の`sinnlosses-group/yadokari-smoke-test-chart`プロジェクトが存在する（削除せず残置）
