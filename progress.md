# 現在の状態

最終更新: 2026-09-06（T-058でtasks.json/progress.mdのアーカイブ運用を整備し、`done`だった
T-001〜T-053の記録を history へ移した。tasks.jsonに残るのは T-054〜T-062 の9件）

T-001〜T-053（要件定義・CLI実装・GitLab実機検証・スキーマ再設計・MR分割単位の変更・
MR文面の再設計・ファイル分割など）はすべて完了し、`tasks.json` から
[`docs/history/tasks-archive.md`](./docs/history/tasks-archive.md) へ移した（`tasks.json` には
T-054以降の未完了タスクだけが残る）。当時のセッションの記録は
[`docs/history/progress-archive.md`](./docs/history/progress-archive.md) にある
（`tasks.json` の `evidence` はコミットハッシュ・テスト件数・アーカイブへの参照に絞る運用）。

## 完了したこと（このセッション: T-058, T-054, T-059, T-060, T-061, T-057, T-055, T-056）

### T-056: 最新タグ判定の実装（T-055 の決定を反映）

- `resolveLatestTag()` から「全タグの中から名前が最新のものを選んでHEADと比較する」判定
  （`existingTag`/`existingTagCommitSha`）を削除し、**`trackedHeadTagNames` が空でなければ
  その中から選ぶ**方式に変更
- 意図的な振る舞い変更: HEADにタグがあるのに別コミットにより新しい名前のタグがあると
  無駄な新規タグを作っていた問題が解消。この振る舞いを検証するテストを追加
- 決定2はコード変更不要のため回帰テストのみ（並び順違いフォーマット2種）。決定3は到達不能なので実装せず
- テスト4件追加（315→319）。README のmermaid図・Features・エラーハンドリング表、
  docs/glossary.md も新方式に同期

### T-055: タグ命名規則・最新タグ判定の要件を確定（実装は T-056）

調査で分かった事実（要件判断の根拠）:

- `ParsedTag.builtAt` は `findLatestParsedTag()` の比較にしか使われていない（MR本文もログも
  `.name` しか読まない）
- **GitLabの「タグの作成日時」は当てにできない**。`TagSchema.created_at` は optional で、
  軽量タグには付かない。このツールは `Tags.create()` を message 無しで呼ぶ＝軽量タグを作る
- `resolveLatestTag()` が並び順を必要としているのは「最新タグがHEADを指すか」の判定だけ

ユーザー判断:

1. **最新タグ判定を「追跡ブランチ由来でHEADを指すタグを直接探す」方式に変更**。複数該当時は
   タグ名から読んだ日時の降順（いずれも同じコミット＝中身は同じなので決定性のためだけの規則）
2. **TAG_FORMAT は緩めず現状維持**（`{branch}`/`{date}`/`{time}` を各1回必須）。ただし
   「**並び順・区切り文字は任意**」であることを要件とREADMEに明記した。これは実測で
   既に動くことを確認済み（`{date}-{time}-{branch}`・`v{time}_{branch}__{date}` で生成・
   再パース・最新判定が成功）＝**コード変更は不要**
3. 一意化要素が無い場合のタグ作成エラーは、date/time が常に必須である以上**到達不能**なので
   作らない（デッドコードを増やさない）

当初検討したコミット日時ソート案は、上記の事実2により却下。

### T-057: README の冗長な記述を削る

- 393行 → 268行（-125行、約32%）。削ったのは**正典と二重管理だった4ブロック**だけ:
  config/ の3つのYAML例と設定エラー5ケース → `docs/requirements.md` 4.4節、
  タグ命名規則の実装名・非互換の詳細 → 同4.1節、プロジェクト構成ツリーの `src/` 配下の
  責務コメント約35行 → `docs/architecture.md` の責務テーブル、`config-test/` の説明 → 同勘所
- いずれも削除ではなく**要約1〜2文＋正典へのリンク**に置換。正典側に無い情報（mermaid図・
  実行ログ例・CI/CDセットアップ手順・環境変数表・エラーハンドリング表）は残した

### T-061: `src/steps/` をステップ名ディレクトリ構成に変更

- `steps/<step名>/<step名>.ts` に統一し、サブステップは `steps/build-plans/sub-steps/` へ。
  「そのステップからしか呼ばれない」ことを構造で表せるようになった
- `steps/shared/step-outcome.ts` は複数ステップの共有なので据え置き
- test/ も同構成に追従。**テスト件数が315件のまま**であることを確認（移動でファイルが
  vitest の対象から外れる事故の検知）

### T-060: 型定義を `src/types/` に集約

- `src/types.ts` → `src/types/types.ts`（`git mv`。同名のファイルとディレクトリが並ぶ状態を解消し、
  `src/lib/<名前>/<名前>.ts` と同じ形に揃えた）
- `export * from "./brand.js"` の再エクスポートは維持したので、利用側の import の形は不変
- src/test/scripts の35ファイルの相対パスを張り替え。`sub-steps/build-plans/types.ts` への
  ローカル参照（`"./types.js"`）は別ファイルなので据え置き

### T-059: values.yamlの書き込み位置の型を `AnchorTarget` 1つに統一

- `ImageTagTarget` / `HelmTargetBranchTarget`（どちらも `AnchorTarget` の単なるエイリアス）を
  削除。以前は「用途を読み手に伝えるため」意図的に残していたが、ユーザー判断で統一した
- 削除したエイリアスのJSDocは `AppConfig.chart`・`HelmTargetBranchConfig.targets`・
  `ImageTagUpdate.target`・`HelmTargetBranchUpdate.target` のフィールドJSDocへ移送（情報は不変）
- `applyImageTagTarget()` などの**関数名は変更しない**（型名ではなく「何を適用するか」を
  表す名前なので、用途の区別を担う側として残す）

### T-054: `TARGET_CHART_DIR` → `TARGET_CHART` 改名＋誤設定の検知強化

- 環境変数名だけを変更し、値の意味（`config/` 直下のディレクトリ名）と内部の型・フィールド名
  （`ChartDirName`・`ChartAndApps.chartDir`・`ConfigTarget.chartDir`）は据え置き
- **検知の穴を塞いだ**: 以前は「`config/` 直下に無い名前」だけがエラーで、ディレクトリは
  存在するが `chart.yaml` が無い場合や絞り込み結果0件は「0 chart groups」で正常終了していた。
  `loadConfig()` に `isExplicitlyTargeted()` を追加し、`TARGET_CHART`/`TARGET_CLIENT` を
  **明示指定したときに限り**対象0件をエラーにする（未指定時に0件でもエラーにしない既存仕様は
  回帰テストで固定した）
- エラーメッセージに `formatChartDirs()` で実在ディレクトリ名の一覧を添えた

### T-058: アーカイブ運用の整備

`tasks.json`（93KB、`done` 53件）と `progress.md` の肥大化が放置されていた（アーカイブの
移し先だけがあり、いつ移すかのトリガーが無かった）ため、トリガーを明文化し実際にアーカイブした。

- **トリガーの明文化**: `docs/workflow.md`「肥大化したときのアーカイブ」節に、(1)
  セッション開始時に `done` が10件以上ならアーカイブする、(2) 10件未満でも `tasks.json` が
  30KBを超えたら `done` を減らせないか検討する、という具体的な基準を追記。`dependencies` が
  アーカイブ済みタスクIDを指す場合は書き換えず残し、「`tasks.json` に存在しないIDはアーカイブ
  済み＝完了とみなす」ルールも明記した。`CLAUDE.md`「進捗管理とHandoff」の手順1にも、
  セッション開始時にこのトリガーを確認する旨を1〜2行で追記
- **tasks.json → tasks-archive.md**: `done` だった T-001〜T-053 の53件全件を
  `docs/history/tasks-archive.md` へ移した。既存21節（T-004等）は当時の `**タスク**`・
  `**当時のevidence**` を書き換えずに残し、`tasks.json` 側のevidenceを `**evidence**` 行として
  追記（節を循環参照させる「詳細な経緯は…この節を参照」という自己参照の文言のみ削除）。
  節が無かった32件は同じ書式で新設し、`difficulty`/`dependencies` を持つタスクはその行も追加。
  節はT-001から昇順に並べ直した（既存21節も含む）
- **tasks.json のサイズ削減**: 93,137バイト（62件、うちdone 53件）→ 14,211バイト（9件、
  T-054〜T-062のみ、すべて`status: todo`で内容は変更していない）。`docs/history/tasks-archive.md`
  は21節・61,168バイト → 53節・120,229バイトに増えた（情報は移しただけで消していない）
- **情報欠落の確認**: 移動前の `tasks.json` をスクラッチにコピーし、`done` 53件それぞれの
  `task` 本文冒頭20文字と（自己参照を除いた）`evidence` 冒頭20文字が
  `docs/history/tasks-archive.md` に含まれることをスクリプトで突き合わせ、欠落0件を確認
- **progress.md → progress-archive.md**: 旧「完了したこと（このセッション: T-038〜T-047の9件、
  実際の内容はT-038〜T-053）」ブロック（見出し〜「**最終状態**」段落まで）を、見出しを
  「## 完了したこと（T-038〜T-053 のセッション）」に付け替えたうえで内容はそのまま
  `docs/history/progress-archive.md` 末尾へ移した。同ファイルの1行目タイトルも
  「〜T-021」→「〜T-053」に更新。`progress.md` 冒頭のサマリ段落もT-053までアーカイブ済みの
  実態に合わせて書き換えた

**最終状態**: `pnpm check`（tsc・oxlint・config検証・oxfmt・vitest **28ファイル308テスト**）通過。
ドキュメントの移動だけなのでテスト件数は作業前と同じ。

## 次にやること

T-062 を残すのみ（他8件は完了）。（すべて `todo`）。`/loop` で依存の解けたものから1件ずつ実行中:

| id    | 内容                                        | difficulty | 依存                      |
| ----- | ------------------------------------------- | ---------- | ------------------------- |
| T-062 | コード・ドキュメントから `T-XXX` 参照を削除 | sonnet     | T-054/056/057/059/060/061 |

- タスク化の際にユーザーへ確認した判断: (1) `T-XXX` 削除の範囲は**コード・ドキュメントのみ**で、
  `tasks.json` / `progress.md` / `docs/history/` はタスク番号を識別子として残す。
  (2) `TARGET_CHART` が指定する値は**`config/` 直下のディレクトリ名のまま**（意味は変えず
  名前とエラーメッセージだけ分かりやすくする）
- T-062 は他タスクでファイルが動く前に走らせると二度手間になるため、最後に回してある
  （残る依存は T-056・T-057）
- T-043（追跡ブランチ切り替え）は実機未検証。スモークテストで `branchToSync` を切り替える
  シナリオを追加すると確認できる
- **このセッションのコミットは `chore/archive-completed-tasks` ブランチにあり、push していない**
  （`main` は `origin/main`（677e7d8）と同期済み。タスク1件＝1コミットで積んでいる）
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
