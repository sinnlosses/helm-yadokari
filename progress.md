# 現在の状態

最終更新: 2026-09-06（T-038〜T-053 を完了。`tasks.json` の53タスクがすべて `done`）

T-001〜T-037・T-043（要件定義・CLI実装・GitLab実機検証・スキーマ再設計・MR分割単位の変更・
MR文面の再設計など）は完了済み。当時の詳細な記録は
[`docs/history/progress-archive.md`](./docs/history/progress-archive.md) に、タスク単位の詳細な
証跡は [`docs/history/tasks-archive.md`](./docs/history/tasks-archive.md) に退避してある
（`tasks.json` の `evidence` はコミットハッシュ・テスト件数・アーカイブへの参照に絞る運用）。
1つ前のセッション（T-022〜T-037・T-043、リファクタリング監査2回分）の記録も
`docs/history/progress-archive.md` にある。

## 完了したこと（このセッション: T-038〜T-047 の9件）

**200行超ファイルの整理（3回目の監査で登録した4件）**

- **T-044完了**: `lib/gitlab/gitlab.ts`（364行）をAPIラッパー（214行）と
  `lib/gitlab/mr-content.ts`（165行、外部I/Oなし）に分割。`buildMrDescription()` は
  GitLabクライアントではなく `ResolveWebUrl = (projectId) => Promise<GitLabUrl>` を受け取り、
  `apply-updates.ts` が `getProjectWebUrl` を注入する（T-027と同じ関数型注入）
- **T-045完了**: `lib/config.ts`（380行）を `lib/config/` の4ファイルへ
  （config.ts 163 / schema.ts 93 / validate.ts 97 / helm-target-branch.ts 51）
- **T-046完了**: `lib/verify-config.ts`（227行）を `lib/verify-config/` へ。
  100行あった `verifyChartAndApps()` を約40行にし、app単位を `verifyApp()` に切り出した。
  キャッシュ層は `newRemoteCache(gitlab)` が `hasProject`/`hasBranch`/`loadValuesYaml` を返す形にし、
  `gitlab`・`caches` の引き回しを廃止（`verifyTarget` は8引数→3引数）
- **T-047完了**: `types.ts`（267行）からブランド型11個を `types/brand.ts` へ。
  `export * from "./types/brand.js"` の再エクスポートで25ファイルのimportは無変更
- **T-041完了**: テスト3ファイルを src/ の構成に合わせて分割。
  `test/lib/config.test.ts`（938行）→ `test/lib/config/` 4ファイル＋`fixture.ts`（`useConfigDir()`）、
  `gitlab.test.ts`（723行）→ gitlab 434行 + mr-content 299行、
  `build-plans.test.ts`（609行）→ 本体172行 + `test/steps/sub-steps/build-plans/` 3ファイル

**2回目の監査で登録した残り**

- **T-040完了**: T-036以降どこからも読まれていなかった `PipelineInfo.status` と
  `PipelineStatus` 型を削除（`PipelineInfo` は `webUrl` のみ）。`isFatalStatus()` を非公開にし、
  テストを `isFatalError()` 経由に寄せた
- **T-039完了**: T-034〜T-037の仕様変更に追従できていなかったドキュメントを同期
  （requirements.md 4.2節のパイプライン状態、README Features、READMEのmermaid図にT-037の分岐、
  glossary.mdの「反映済みタグ」、architecture.mdの`scripts/smoke/`）
- **T-042完了**: `verifyConfigExistence()` の chartAndApps 単位を `mapWithConcurrency()` で並列化
  （`concurrencyLimit` を引数に追加、出力順は入力順のまま）。**並列化で表面化する穴**として、
  `getOrFetch()` が解決済みの値だけをキャッシュするため同時呼び出しで二重fetchすることが分かり、
  Promiseを共有する `getOrFetchShared()`（失敗時はキャッシュから削除）を追加して
  `remote-cache.ts` で使うようにした。逐次のままの2箇所（build-plans・mr-content）は `getOrFetch` のまま
- **T-038完了（ユーザー判断）**: CIの `validate-config-remote` が架空の設定例で必ず失敗する問題を、
  「`config/` には実運用の登録だけを置く」方針で解消。`config/teamA-chart/` を削除し
  `config/README.md`（運用ルール）に置き換えた。記述例は `docs/requirements.md` 4.4節が正典なので
  情報の損失はない。実機で `pnpm lint:validate-config:remote` が終了コード0になることを確認

**build-plans の改善（T-048〜T-053、サブエージェント委譲運用の初適用）**

- **T-051(haiku)**: dryRun時に不要な `getLatestPipelineForRef()` を呼ばないようにした
- **T-052(haiku)**: 失敗ログにアプリ名が出ず原因アプリを特定できなかった問題を解消。
  `steps/shared/step-outcome.ts` に `rethrowWithAppContext()` を追加。**致命的エラーだけは
  包まずそのまま投げる**（`new Error(..., {cause})` で包むと `extractHttpStatus()` が
  ステータスを辿れず FatalError に昇格できなくなるため）
- **T-048(sonnet)**: `readCurrentImageTags()` が読んだ `previousTags` を
  `applyImageTagTargets()` にも渡し、同じアンカーの二重読み取りを解消
- **T-049(sonnet)**: `LatestTagResolution.pointsAtTrackedHead`（クロージャ）を
  `trackedHeadTagNames: ReadonlySet<TagName>`（データ）に置き換え
- **T-050(sonnet)**: `valuesYamlCache` + `modifiedValuesPaths` を `ValuesYamlDraft` 1本に統合。
  詰め替えが消え、`buildFileUpdates()` の internal error も型レベルで不要になった
- **T-053(opus)**: アプリ単位の逐次実行は**現状維持**と決定。読み取りだけの先行並列化は
  技術的には可能だが、削減幅（1アプリ2〜3往復）に対してタグ作成の副作用が並列・前倒しで
  走る代償が大きい。理由と再検討条件を docs/architecture.md に明記

**最終状態**: `pnpm check`（tsc・oxlint・config検証・oxfmt・vitest **28ファイル308テスト**）通過。
`tasks.json` の53タスクはすべて `done` / `passes: true`。

## 次にやること

- **すべてのタスクが `done`**（53件）。次の作業は新しく洗い出してから
- T-043（追跡ブランチ切り替え）は実機未検証。スモークテストで `branchToSync` を切り替える
  シナリオを追加すると確認できる
- **push はまだしていない**（このセッションの11コミットはローカルのみ）
- 実機検証で残置したMR（!24、!25）とブランチ2本の後片付け（不要になったら
  `SMOKE_CHART_PROJECT_ID=86061211 npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply`）
- 検証が完全に終わったら、テスト用のGitLabアクセストークンを失効させる（ユーザー対応）
- 未確認のまま取り込んである方針変更（`steps/shared/` の新設、evidenceを3行以内に絞る運用、
  README「設定 > config/」章を要約に縮小し正典を requirements.md 4.4節にしたこと）

## 未解決

- なし

## 注意

- `config/` には実運用の登録だけを置く（架空の設定例を置くとCIの `validate-config-remote` が
  必ず失敗する、T-038）。記述例は `docs/requirements.md` 4.4節、実物に近いサンプルは `config-test/`
- `src/lib/<名前>/<名前>.ts` の形（gitlab / config / verify-config）で統一している。
  同名のファイルとディレクトリを並べない
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている
- `src/lib/config/config.ts` に oxlint の `no-shadow` 警告が2件あるが、分割前からある既存の警告
  （`loadClientChartAndApps` の引数 `target` と、内側の `.map((target) => ...)`）
- リモートは`origin`が`github.com/sinnlosses/helm-yadokari`と`gitlab.com/sinnlosses-group/helm-yadokari`の
  2つの push URL を持つ。`git push`/`git fetch`は両方に対して行われる
- gitlab.com上に検証用の`sinnlosses-group/yadokari-smoke-test-chart`プロジェクトが存在する（削除せず残置）
