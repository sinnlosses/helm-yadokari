# 現在の状態

最終更新: 2026-09-12（`/plan-tasks` で **T-198〜T-200 を登録**し、**T-198 を完了**。
`docs/glossary.md` の整理とドメイン用語の命名見直し。未着手2件。2026-09-11のセッションの記録も
下の「完了したこと」、2026-09-09以前の記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある）

**未着手のタスクは2件**（T-199 → T-200 の一直線）。完了タスクは
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)、過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

### 2026-09-12 `docs/glossary.md` の整理

- **T-198**: 用語集から経緯を切り離した（312行→283行、30.4KB→24.6KB）。旧称・撤回案・
  バグ修正の記録を7項から消し、「今の形の理由」に当たる3件（HEADを指すタグを直接探す／
  切り替え時に新タグを作らない／固定ブランチを削除して作り直す）は `docs/requirements.md`
  4.1・4.2節に既にあったため `docs/architecture.md` への移設は0件。用語集冒頭に
  「各エントリは今の姿だけを書く」の方針を足し、`docs/architecture.md` の「用語集は経緯を
  長く持つ」の文を「用語集は経緯を持たない」に改めた。20KB以上のままなので通読ガードは維持
  （`CLAUDE.md` と冒頭の「25KB超」を「20KB超」に）。maintain-docs の検査1〜7は増減なし。
  `pnpm check` 通過: 385 Tests。**受け入れで見つかった範囲外の指摘**を「未解決」に残した

### 2026-09-11 `src/lib/config/config.ts` の分割

- **T-197**: 4パスを実機実行し、`docs/smoke-test.md` の「期待する結果」を**実測値で確定**した。
  パス1 `{CREATED:4}`／パス2 `{SKIPPED:4}` mr_exists／**パス3 `{CREATED:3,ERROR:1}` 終了コード1**／
  パス4 `anchor-app`=no_diff・他3件=mr_exists。今回の主目的だった**部分失敗と終了コード1が
  実機で通った**（ERRORは `tenant2/client2` のみで、残り3ユニットにはMRができた＝処理継続）。
  **パス4の当初手順が誤りだと判明**: `reset` だけして `setup` を省く方法では `no_diff` にならない。
  このツールは `main` に書かず固定ブランチにコミットするため、`reset` すると `main` はシードに
  戻るため。**実装のバグではなくドキュメントの誤り**（T-193より前から書かれていた）で、
  MRを1件マージしてから再実行する手順に差し替えた。後片付け済み（両chartともオープンMR0件）。
  **MRの差分と本文も読み取りで確認した**（summary と終了コードだけでは「正常に動いた」と
  言うには足りないため）。書き換え先のアンカーだけが変わり、`helmVersion`（ツールが管理
  しないアンカー）・HEAD一致のapp・差分なしの向き先ブランチはいずれも無傷。`shared-app` の
  新タグが `develop-` 由来なことで、キャッシュキー `projectId:branchToSync` の分岐も確認できた

- **T-196**: `config/` に新シナリオを追加。`config/yadokari-smoke-test-chart2/` を新設（**2つ目の
  chartリポジトリ**。`sample-qa-sprint` を **`branchToSync: develop`** で追跡＝キャッシュキー
  `projectId:branchToSync` が分岐する経路）と、`tenant2/client1` に `values-extra.yaml` への
  2件目の書き込み先を追加（1appが複数valuesPathに書く）。3ユニット/5apps → **4ユニット/6apps**。
  `validate-config:remote` 通過。`test/main.e2e.test.ts` は実 `config/` を読むため追随が必要で、
  **別プロジェクト宛てMRと develop由来タグが選ばれることの検証**が新たに入った
  （テスト件数は385のまま。サブエージェントの「383→385」という報告は誤りで、受け入れ側で
  stash して実測し直した）

- **T-195**: GitLabにフィクスチャを実適用した（**このセッション唯一の外部書き込み**、承認済み）。
  chartリポジトリ2 `sinnlosses-group/yadokari-smoke-test-chart2`（**id 86354445**）をAPIで作成し、
  両chartに `reset --apply` / `setup --apply` を適用。前回の実行の残骸（MR !30〜!32 と
  固定ブランチ3本）もここで片付いた。**適用結果は読み取りで確認**している（宣言だけで
  合格にしない）。ソースリポジトリへの書き込みは発生していない（シードタグは2件とも既存）。
  読み取り中に `release/2026-q1` が見えない瞬間があったが、GitLab側の反映待ちで、
  再確認したら存在していた

- **T-194**: `scripts/smoke/smoke-fixture.ts` を4パス構成に合わせて拡張（184行→257行）。
  chartリポジトリ2向けのシード（`SMOKE_CHART2_PROJECT_ID` 未設定なら既存シナリオを壊さず
  スキップ）、`values-extra.yaml`、`setup --broken-anchor`（`t2c2QaSprintVersion` を抜いた版）。
  **GitLabへの書き込みは一切なし**（dry-runのみ、書き込みAPI5箇所が全て `if (apply)` の内側に
  あることを受け入れ側で確認）。受け入れで、**dry-runの出力が通常setupと `--broken-anchor` で
  区別できない穴**を塞いだ（「dry-runを見てから`--apply`」が安全設計なので、見分けが付かないと
  取り違えて書き込みうる）。`pnpm check` 通過: 385 Tests

- **T-193**: スモークテストを4パス構成に設計し直し、`docs/smoke-test.md` を書き換えた
  （141行→238行）。パス1=通常更新（複数chartリポジトリ・1appが複数ファイル・複数の追跡ブランチ）、
  パス2=再実行（`mr_exists`）、**パス3=部分失敗（`ERROR` 1件で他は継続、`PARTIAL_FAILURE`、
  終了コード1）**、パス4=差分なし（`no_diff`）。パス3が今回の主目的。
  **設計中に前提が1つ崩れた**: 当初「複数chartリポジトリは `tagFormat` 食い違い検証が効く
  唯一の経路」としていたが、食い違う設定は `pnpm lint` とCIで落ちるため `config/` に
  コミットできず、かつ単体テスト済みだった。2つ目のchartリポジトリの用途を
  「MRが2プロジェクトに分かれることの確認」に変えた。載せないと決めた4件は
  `docs/smoke-test.md`「載せていないシナリオ」に理由付きで残してある

- **T-192**: `buildChartAndApps()` の6位置引数を、値が決まる単位で2オブジェクトにまとめた
  （`ChartRepoScope` / `ConfigUnitScope`）。chartリポジトリ単位の側は `unitPaths.map()` の
  外で1回だけ組み立てる形になった。**受け入れで型名を直した**: サブエージェントは
  `ChartRepoUnit` / `ConfigUnit` と命名したが、`ConfigUnit` はドメイン用語「設定ユニット」
  （集約は `ChartAndApps`）と衝突し、`ChartRepoUnit` は同じファイルで使う `ChartUnits` および
  `ChartRepoConfig` と紛らわしかった。正典がこの軸を「スコープ」と呼んでいる
  （`docs/architecture.md`「`config/`は『スコープ』で2ファイルに分け」）のに合わせて改名した。
  `pnpm check` 通過: 385 Tests

- **T-191**: `resolveProjectLinkage()` と `LinkedApp` を `validate.ts` から
  `load-chart-and-apps.ts` へ移し、**両方とも非公開にした**（呼び出し元が同じファイル内に
  来たため）。名前に反して検証ではなく結合だったもので、`validate.ts` は 137行→**87行**に
  なり名前どおり検証だけのファイルになった。受け入れでは移した関数本体が移動前と
  完全一致することを `diff` で確認。`pnpm check` 通過: 385 Tests

- **T-190**: 判定手順を `src/domain/`・`src/types/`・`src/utils/`・`scripts/` に適用。
  **308行→305行（-3行）**で、この範囲は元から規約に沿っていた。消えた4件のうち1件は
  `types.ts` の `FileUpdate` の「1ファイル分の更新内容」で、**正典が禁止例として名指ししていた
  コメントそのもの**が残っていたもの。残り3件は呼び出し元ファイル名・内部関数名への言及と、
  `docs/architecture.md` に逐語で重複していた置き場所の説明。
  これでコメント規約の適用は完了（**合計 914行→867行、-47行**）。`pnpm check` 通過: 385 Tests

- **T-189**: 判定手順を `src/steps/` に適用。**257行→228行（-29行）**。削れたのは4ファイルで、
  中身は `docs/architecture.md` に既にある設計判断の写しと、本体の分岐の言い換え
  （`reason: "no_diff"` / `"dry_run"` がコードにそのまま書いてある箇所など）。
  受け入れでは、消した根拠として挙がった正典3箇所の実在を自分で確認し、書き換わった
  `withAppContext()` のJSDocが `rethrowWithAppContext()` の実装（`isFatalError()` で素通し）と
  一致することも確かめた。`pnpm check` 通過: 385 Tests

- **T-188**: T-187 の判定手順を `src/lib/` に適用。**349行→334行（-15行）**で、`loadConfig()` の
  13行→4行が大半を占める。削れたのは5ファイルだけで、`helm.ts`・`env.ts`・`gitlab/errors.ts`
  （率42%）などは受け入れ側で当て直しても削る箇所が無かった（呼ぶ人に要る Why か、
  外部システムの挙動記録）。**減り幅が小さいのは想定どおり**で、T-187 の診断（病気は長さでは
  なく写し。写しはコードを直した箇所に集中する）と一致している。`pnpm check` 通過: 385 Tests

- **T-187**: コメント規約を一次情報で調べ直し、`docs/coding-standards.md`「コメント」節を
  書き換えた（30行→69行）。**調べた結果、病気は「長すぎる」ではなく「他所の写し」だった。**
  `loadConfig()` のJSDoc13行のうち10行が、本体の行・呼び先のJSDoc・戻り値の型の写しで、
  `tagFormat` の食い違いの説明に至っては3箇所に同じものがあった。T-184/T-185 で本体が
  段の並びになった結果、それまで有用だったJSDocが写しに変わったもの。
  足したのは Google TypeScript Style Guide 由来の**読者の軸**（`/** */` は呼ぶ人向け、
  `//` は実装を読む人向け）と、種類の表への「写しは消す」の行、レビューの2問目。
  **行数上限は置かず「制約・前提は必要なだけ長くてよい」も撤回しなかった**（長さが原因では
  なかったため）。JSDocのブロックタグも導入しない（既存0件で、要望より大きな変更になる）。
  調査記録は `docs/research/comment-conventions.md`

- **T-186**: `src/lib/config/` の3ファイルを、何をするか分かる名前に改名した
  （`unit-scan.ts`→`find-config-units.ts` / `select-units.ts`→`limit-to-target.ts` /
  `chart-and-apps.ts`→`load-chart-and-apps.ts`）。`src/steps/` の「ファイル名＝公開関数名で
  動詞始まり」に揃えたもの。**改名だけで振る舞いは無変更**（使い捨てconfigでの実行で
  改名前後の一致を確認）。`docs/architecture.md` の「`chart-and-apps.ts` は変えない」の行は、
  当時の論点（YAMLファイル名への追随）は据え置いたまま別の論点で改名した旨を添えて書き換えた。
  受け入れで、`schema.ts` のJSDoc「`config.ts`から参照する」が **T-185 の時点で既に嘘に
  なっていた**（`config.ts` は `schema.ts` を import していない）のを見つけ、参照元の列挙自体を
  削除した（grepで分かることをコメントに書くと腐る実例）。`pnpm check` 通過: 385 Tests

- **T-185**: `config.ts` を **140行→36行**（`DEFAULT_CONFIG_DIR_PATH` と `loadConfig()` だけ）に
  した。`TARGET_*` の解釈（`ConfigTarget` / `NO_TARGET` 含む）を新設の `select-units.ts` へ、
  `scanChartDir()` と `ChartUnits` 型を `unit-scan.ts` へ移し、`findUnitPaths()` は非公開に降格。
  T-184 のタスク化時に「ファイルを増やしたくない」で `select-units.ts` の新設を見送ったのが
  判断ミスで、その結果 `config.ts` が138行→140行と増えていたのを直したもの。
  `pnpm check` 通過: 33 Test Files / 385 Tests

- **T-184**: `loadConfig()` を「名前の付いた段を順に呼ぶだけ」の入口（本体9行）に組み替え、
  `selectChartDirs` / `scanChartDir` / `selectTargetUnits` / `loadUnitChartAndApps` /
  `validateTagFormatConsistency` / `assertTargetMatched` の並びにした。`listUnitChartAndApps()` は
  `chart-and-apps.ts` へ移設し、`ChartUnits` 型もそちらへ。**ファイルは5のまま増やしていない**。
  受け入れでは、壊れた兄弟chartディレクトリを置いた使い捨て `config/` を作り、
  `TARGET_CHART` 指定時にそれを走査しないことを**変更前後の実行結果の一致**で確認した
  （既存テストでは検出できない不変条件のため）。`pnpm check` 通過: 33 Test Files / 385 Tests

- **T-183**: `config.ts`（207行）から設定ユニットの走査と階層の検証を
  `src/lib/config/unit-scan.ts`（77行、`export` は `findUnitPaths` のみ）へ切り出し、`config.ts` は
  138行になった。`docs/architecture.md`「1ファイルにまとめるか分けるか」の分ける合図①②③⑤に
  該当（④「依存が違う」は不成立。`loadConfig()` 自身も `listSubdirectories()`・`existsSync()` を使う）。
  **振る舞いは無変更**で、`test/` は1文字も触っていない（`git diff --stat test/` が空）。
  `pnpm check` 通過: 33 Test Files / 385 Tests（変更前と同数）

## 次にやること

**未着手は T-199 → T-200 の2件**（`docs/glossary.md` の整理、登録は 2026-09-12。T-198 は完了）:

- **T-199**（`sonnet`、`/loop` 可）: `src/types/` と `schema.ts`・`env.ts` から用語を洗い出し、
  不足を埋める。命名の良し悪しは判断せず evidence に列挙して T-200 へ渡す
- **T-200**（`opus`、**委譲しない・`/loop` に載せない**）: 命名の見直し。ユーザーと採否を決め、
  採用した改名だけを個別タスクとして登録する。このタスク自身はコードを変えない

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
