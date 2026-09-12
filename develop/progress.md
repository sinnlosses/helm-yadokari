# 現在の状態

最終更新: 2026-09-12（**T-198〜T-200 を完了**し、命名の見直しで決まった改名1件を
**T-201 として登録**。`docs/glossary.md` の整理はこれで一段落。未着手は T-201 の1件。
2026-09-11以前の記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある）

**未着手のタスクは1件**（T-201。`AnchorTarget` の改名、`haiku`、`/loop` 可）。完了タスクは
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)、過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

### 2026-09-12 `docs/glossary.md` の整理

- **T-200**: 命名の論点6件にユーザー判断で結論を出した。**改名は `AnchorTarget`→`AnchorLocation`
  の1件だけ**（T-201 として登録）。`target` が既に「MRのベース」「向き先」「処理対象」の3義で
  使われており、「書き込み位置」が4つ目の意味になっていたため。**据え置き5件**は
  `branchToSync` の同名別義・`target` の多義5種・`previousBranch` の `Name` 無し・
  `ChartRepoConfig` と `chartToUpdate` の語幹違い・`TagInfo` と `ParsedTag` の非対称で、
  **いずれも `docs/architecture.md`「型と命名」の既存規約が既に答えを持っていた**
  （`previousBranch` は規約が名指しで除外例に挙げている）。理由は用語集の該当項に書いた。
  「反映」「適用」「更新」は `values.yaml` 側に一本化し、クラスタ側は「デプロイ」と書くと決めて
  `CLAUDE.md`・`docs/requirements.md` の2箇所を直した（2.2節が元から「デプロイ」で前例があった）。
  用語集冒頭の方針「表記ゆれは注記するだけ」も「改名か据え置きかを決めて理由を書く」に改めた。
  `pnpm check` 通過: 385 Tests

- **T-199**: `src/types/types.ts`（10型）・`brand.ts`（13型）・`schema.ts` のYAMLキー・`env.ts` の
  環境変数・`docs/requirements.md`「3. 用語」から候補を列挙し、用語集に7項を足した
  （`chartToUpdate・appSpecs`・`AnchorTarget`・`ParsedTag`・`TagInfo`・`ImageTagUpdate`・
  `HelmTargetBranchUpdate`・`TARGET_CHART・TARGET_UNITS`。283行→339行、24.6KB→29.9KB）。
  値のラップと技術的な入れ物（`Config`・`FileUpdate`・`PipelineInfo`・`CommitSha` 等）は足さず、
  理由は `evidence` にある。方針「識別子が無い用語は省略」は実態と食い違っていたので
  「主要ドキュメントで使う業務用語は載せる」に改めた。**命名の気づき6件を `evidence` に残し
  T-200 の入力にした**（`Name` 接尾辞の不揃い、`target` フィールドから `Anchor` が落ちる、
  `ChartRepoConfig` と `chartToUpdate` の語幹違い等）。`pnpm check` 通過: 385 Tests

- **T-198**: 用語集から経緯を切り離した（312行→283行、30.4KB→24.6KB）。旧称・撤回案・
  バグ修正の記録を7項から消し、「今の形の理由」に当たる3件（HEADを指すタグを直接探す／
  切り替え時に新タグを作らない／固定ブランチを削除して作り直す）は `docs/requirements.md`
  4.1・4.2節に既にあったため `docs/architecture.md` への移設は0件。用語集冒頭に
  「各エントリは今の姿だけを書く」の方針を足し、`docs/architecture.md` の「用語集は経緯を
  長く持つ」の文を「用語集は経緯を持たない」に改めた。20KB以上のままなので通読ガードは維持
  （`CLAUDE.md` と冒頭の「25KB超」を「20KB超」に）。maintain-docs の検査1〜7は増減なし。
  `pnpm check` 通過: 385 Tests。**受け入れで見つかった範囲外の指摘**を「未解決」に残した

## 次にやること

**未着手は T-201 の1件**（T-198〜T-200 は完了）:

- **T-201**（`haiku`、`/loop` 可）: `AnchorTarget` → `AnchorLocation` の改名。
  正典（`docs/glossary.md`）は T-200 で新名に書き換え済みで、コードと `docs/architecture.md` を
  それに追随させる。フィールド名 `target`/`targets`/`imageTagTargets` は据え置きなので変えない。
  波及は26件/8ファイル（src 14・docs 9・test 0）

T-172〜T-197 はすべて `done`（T-183〜T-192 は `docs/history/tasks-archive.md` へアーカイブ済みで、
`develop/tasks.json` からは消えている）。

スモークテストの包括化は完了（T-193〜T-197）。GitLabのフィクスチャは初期状態に戻してある。
次に実機スモークを回すときは `docs/smoke-test.md` の手順どおりでよい。

**順序の制約**（次に `config/` を触るとき用）: GitLab側のフィクスチャが先、`config/` への追加が後。
`config/` に設定ユニットを足すと `pnpm lint:validate-config:remote` とCIが実在を検証するため、
GitLab上に無い状態で設定だけ先にコミットすると落ちる。T-176・T-177 は着手しない判断で閉じたもので、理由は下の
「未解決」にある。

`src/lib/config/` のリファクタリングでは、案2（`resolveProjectLinkage` を `validate.ts` から
`chart-and-apps.ts` へ移す）・案3（`loadChartAndApps()` の6引数をスコープ別の2オブジェクトに
まとめる）・案B（`select-units.ts` の新設）を**提案したうえで見送っている**（2026-09-11、
ユーザー判断）。経緯は `docs/history/direction.md` の 2026-09-11 の2つの節にある。

- **次回の実機スモークは `docs/smoke-test.md` の手順1からやり直す。** `helm` 必須化で
  3つの設定ユニットすべてが `helm` を持つようになり、差分が出るのは `tenant2/client1` だけ
  （`client2` と `anchor-app` は向き先ブランチが `helm.branchToSync` と同値）。
  `smoke-fixture.ts setup --apply` は 2026-09-10 に実行済みで、フィクスチャは初期状態にある
- 新しい指示は `develop/direction.md` に書き、`/plan-tasks` でタスク化する

## 未解決

- **`docs/architecture.md` の `src/steps/` 責務表（`resolve-latest-tags.ts` の行）が
  「追跡ブランチを切り替えた場合はタグを自動作成」と書いている**が、現在のコードと
  `docs/requirements.md` 4.1節は「切り替え先のHEADを指すタグがあれば再利用し、新しいタグは
  作らない」。T-198 の受け入れで見つかった範囲外の食い違い（2026-09-12）。`/maintain-docs` か
  次にその表を触るタスクで直す

- **T-176（`outcome` を `result` に改名する件）は着手しない判断**（ユーザー判断、2026-09-10）。
  `tasks.json` では `status: done` / `passes: false` で閉じてあり、**正典（`docs/architecture.md`）は
  無変更**。判断を変えたくなったときのために懸念だけ残す:
  - `result` のドメイン型が既に2つある（`ChartUpdateResult` = CREATED/SKIPPED/ERROR、
    `RunResult` = SUCCESS/PARTIAL_FAILURE。どちらも `docs/glossary.md` に掲載）のに対し、
    `StepOutcome` は**ドメインではなく制御フローの型**（`ok` = 続行 / `settled` = 打ち切り）で層が違う
  - `StepResult` にすると `{ status: "settled"; result: ChartUpdateResult }` が **`result.result`** になり、
    `docs/architecture.md`「1つの語を2つの意味に使わない」の本文（値の意味を語れないフィールド名は
    避ける）を自分で踏む
  - ログのフィールド名 `result` は `README.md`「実行ログの例」3箇所に出る**外部インターフェース**で、
    `ChartUpdateResult` の意味に固定したい
  - `src/main.ts:66` の reduce が既に `(counts, result)` を使っており、局所変数が衝突する
  - 再開するなら、型名を `StepResult` にしたうえで `settled` 側のフィールド名を
    `settledAs` などに変えて `result.result` を避ける案（波及は src 8ファイル・docs 2ファイルの約40箇所）
    から検討する。**T-177（反映タスク）も同時に閉じてある**ので、再開時は両方を起こし直す

- **T-151（`StepOutcome` の `settled` が SKIPPED と ERROR を混ぜている件）は着手しない判断**
  （ユーザー判断、2026-09-09）。`tasks.json` では `status: done` / `passes: false` で閉じてある。
  判断を変えたくなったときのために理由だけ残す: 指摘は事実だが、**消費側3箇所（`filter-targets.ts:28`・
  `build-plans.ts:42`・`apply-updates.ts:27`）は SKIPPED と ERROR を区別しておらず**、
  区別が要る最終集計（`main.ts:72`）には `result` の文字列として情報が残っているため、
  実害が出ていない。再開するときは `docs/architecture.md`「エラーは『fatalは例外・それ以外は
  戻り値』の2チャネル」の方針変更をユーザー承認するところから始める。

- ~~**`develop/tasks.json` のアーカイブ基準（30KB超）が、`todo` だけで超えたときに機能しない。**~~
  **解決済み**（T-147で `todo` を判定対象外にした）。2026-09-09の棚卸しで13タスクを登録した
  時点で**実測により確認**: ファイル全体は43.8KBだが、判定対象の `done` は3件・9.4KBで
  基準内。**`todo` 13件を足しても空振りのトリガーが鳴らない**ことを、新基準の2回目の適用で
  確かめた。

- 上の棚卸しで見つかったうち、**次の2件は着手しない判断**（ユーザー判断、2026-09-07）。
  判断を変えたくなったときのために理由だけ残す:
  - `filterTargets` のオープンMR確認（`src/steps/filter-targets/filter-targets.ts`）は
    chartAndApps ごとに1回で、同じ `chart.projectId` を共有する client の数だけ走る。
    プロジェクト単位で `state: "opened"` を1回引いてローカルで `sourceBranch` を突き合わせれば
    N→1 にできるが、他人が立てたMRが多いプロジェクトではページングのコストが乗るため、
    client数が増えるまでは割に合わない
  - `createResolveLatestTags()` のキャッシュキーが `projectId:branchToSync` なので、
    同じappを別clientが**別ブランチ**で追跡していると `listTags`（プロジェクト全タグ）を
    2回引く。影響が小さいので見送り

## 注意

- **コミット手順は「記録を書く → `pnpm format` → `pnpm check` → `git add` → `git commit`」の順に固定する。**
  `develop/tasks.json` は `oxfmt` の対象（`.prettierignore` の除外は `.claude/` と `config/` だけ）で、
  スクリプトで `json.dump(indent=2)` すると単一要素配列が展開されて `format:check` に落ちる。
  **`pnpm format` を記録より前に回すと必ず取りこぼす。** 2026-09-09 に T-159・T-168 で踏み、
  対策を書いたのに 2026-09-10 の T-169 で**同じ順序ミスを再発**させた（T-165〜T-167 は無事）。
  順序そのものを固定しないと再発する。
- **`git add` はパスを明示する。`git add -A` を使わない。** ユーザーが作業中に編集した
  ファイル（`develop/direction.md`・`src/main.ts` など）を無関係なコミットに巻き込むため。
- `config/` には実在の登録だけを置く（架空の設定例を置くとCIの `validate-config-remote` が
  必ず失敗する）。定期実行の登録とスモーク用フィクスチャは**同居させる**（理由は
  `config/README.md`）。記述例は `docs/requirements.md` 4.4節、実物は
  `config/yadokari-smoke-test-chart/`
- `<名前>/<名前>.ts` の形（`src/lib/` の gitlab / config、`scripts/lint/verify-config/`）で
  統一している。同名のファイルとディレクトリを並べない（T-092/T-094 の命名判断に効く）
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている
- リモートは `origin` が `github.com/sinnlosses/helm-yadokari` と
  `gitlab.com/sinnlosses-group/helm-yadokari` の2つの push URL を持つ。
  `git push`/`git fetch` は両方に対して行われる
- gitlab.com 上に検証用の `sinnlosses-group/yadokari-smoke-test-chart` プロジェクトが存在する
  （削除せず残置）
- **`RENOVATE=true` を持つ pipeline schedule が存在しないため、`renovate` ジョブは一度も
  動いていない**（このCLI自体の依存パッケージ更新が止まっている状態）。`.gitlab-ci.yml` は
  そのスケジュールの作成を必須と書いているが、**現時点では対応しない判断**（ユーザー判断、
  2026-09-09。タスクにもしない）
- T-064以降の変更は2026-09-07の実機スモークテストで検証済み。**テスト用に発行したGitLab
  アクセストークンは失効させず、本番の定期実行用としてそのまま使い続ける**（2026-09-09に方針決定。
  宿題ではない）。2026-09-07のスモークが残していたMR !28/!29 と固定ブランチ2本は
  **`smoke-fixture.ts reset --apply` で片付け済み**
- **定期実行は手動スモークテストを置き換える**（ユーザー判断、2026-09-09。問題が出たら
  そのとき対応する）。同じchartリポジトリ・同じ設定ユニット・同じ固定ブランチを共有するため、
  次の2点が起こりうる。踏んだら対処を決める:
  - 作られたMRを誰もマージしないと、翌日以降は `mr_exists` で SKIPPED になり続ける
  - スモークテストを回すと手順1の `reset` が定期実行の作ったMRと固定ブランチを消す
