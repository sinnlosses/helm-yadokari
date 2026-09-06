# 現在の状態

最終更新: 2026-09-06（`verify-config` を `src/lib/` から `scripts/lint/` へ移動。
T-064〜T-076 のセッション記録は history へアーカイブした）

T-001〜T-070 はすべて完了し、`tasks.json` から
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md) へ移した（`tasks.json` には
T-071以降だけが残る）。当時のセッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある
（`tasks.json` の `evidence` はコミットハッシュ・テスト件数・アーカイブへの参照に絞る運用）。

## 完了したこと（このセッション）

- **`verify-config` を `src/lib/` から `scripts/lint/` へ移した**（ユーザー指摘）。本体
  パイプライン（`index.ts`→`main.ts`→`steps/`）からの参照は0で、唯一の呼び出し元が
  `scripts/lint/validate-config.ts` だったため。`pnpm build` の `dist/` から lint専用コードが
  消えたことを実測で確認（`find dist -name "*verify*"` が0件）。
  - `src/lib/verify-config/` → `scripts/lint/verify-config/`、
    `test/lib/verify-config/` → `test/scripts/lint/verify-config/`（いずれも `git mv`）
  - あわせて: `pnpm lint` を `oxlint src scripts` に拡張（移動先が lint 対象から外れるため）、
    `vitest.config.ts` の coverage対象に `scripts/lint/verify-config/**` を追加、
    `CLAUDE.md` にテスト配置ルール（`scripts/` 配下は `test/scripts/`）を追記
  - この判断の根拠は `CLAUDE.md` の**原則3**と `docs/architecture.md`「コードからは読み取れない
    設計判断」に記録した（原則2は「`src/`のどこに置くか」の基準であって「`src/`に置くか否か」を
    決めない、という切り分け）
  - `pnpm check`（28ファイル**322テスト**）通過＝移動前と同数。`--remote` の実機実行は未実施

## 次にやること

`tasks.json` の6タスク（T-071〜T-076）はすべて `done`。**このセッションの最終状態**:
`pnpm check`（tsc・oxlint・config検証・oxfmt・vitest **28ファイル322テスト**）通過。

- **`main` が `origin/main` より1コミットahead、かつ verify-config の移動が未コミット。
  コミットとpushが未実施**（外部への反映のためユーザー承認が要る）
- 今回の変更（T-064以降すべて）は**実機未検証**。特に T-069（URL検証の追加）と
  T-076（MR本文のURL解決の作り替え）は、スモークテストで1回通しておきたい
- `TARGET_CHART` の0件検知（`TARGET_CHART`/`TARGET_CLIENTS` 明示時のみエラー）も実機未検証
- 追跡ブランチ切り替えは実機未検証。スモークテストで `branchToSync` を切り替える
  シナリオを追加すると確認できる
- 前回のスモークテストで残したMR（!26、!27）とブランチ2本の後片付け（不要になったら
  `SMOKE_CHART_PROJECT_ID=86061211 npx tsx --env-file=.env scripts/smoke/smoke-fixture.ts reset --apply`）
- 検証が完全に終わったら、テスト用のGitLabアクセストークンを失効させる（ユーザー対応）

## 未解決

- なし

## 注意

- `config/` には実運用の登録だけを置く（架空の設定例を置くとCIの `validate-config-remote` が
  必ず失敗する、T-038）。記述例は `docs/requirements.md` 4.4節、実物に近いサンプルは `config-test/`
- `<名前>/<名前>.ts` の形（`src/lib/` の gitlab / config、`scripts/lint/verify-config/`）で
  統一している。同名のファイルとディレクトリを並べない
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている
- `src/lib/config/config.ts` に oxlint の `no-shadow` 警告が2件あるが、分割前からある既存の警告
  （`loadClientChartAndApps` の引数 `target` と、内側の `.map((target) => ...)`）
- リモートは`origin`が`github.com/sinnlosses/helm-yadokari`と`gitlab.com/sinnlosses-group/helm-yadokari`の
  2つの push URL を持つ。`git push`/`git fetch`は両方に対して行われる
- gitlab.com上に検証用の`sinnlosses-group/yadokari-smoke-test-chart`プロジェクトが存在する（削除せず残置）
