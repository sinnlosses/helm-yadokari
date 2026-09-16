# 現在の状態

最終更新: 2026-09-16（**`docs/coding-standards.md` を整理する指示を T-259〜T-262 にタスク化し、
T-259〜T-262 を全件完了**。二重になっていた本文を1つに戻し、ブロックタグ禁止規約を廃止し、
対応記録を落として 667行 → 400行にした（関数の並び順の lint は既製ルールが無く見送り）。
前回: 既定 `ACCESS_TOKEN` を廃止し `accessTokenEnv` を必須化、T-255〜T-258 を完了）

**未着手のタスクは0件**（`develop/tasks.json` は全件 `done`。次に進めるものが無いので、
`develop/direction.md` に指示を書いて `/plan-tasks` にかけるところから）。

**T-249〜T-258 の `done` 10件は
[`docs/history/tasks.md`](../docs/history/tasks.md) へアーカイブ済み**。
過去セッションの記録は
[`docs/history/progress.md`](../docs/history/progress.md) にある。

接尾辞なしの `ACCESS_TOKEN` は **GitLab の CI/CD Variables と手元の `.env` の両方から削除済み**
（2026-09-16、ユーザーが実施。API で確認したCI/CD変数は `GITLAB_URL` / `ACCESS_TOKEN_SMOKE_A` /
`ACCESS_TOKEN_SMOKE_B` の3つだけ）。手元の `.env` に `GITLAB_PROVISION_PAT` はまだ無いので、
`scripts/smoke/provision-group.ts` を動かすときに追加が要る（T-255 で名前を変えたため）。

## 完了したこと（このセッション）

### 2026-09-16 coding-standards.md から対応記録を落とした（T-262）

- **T-262: `docs/coding-standards.md` を 509行 → 400行**に。`### 消すかどうか` の実施記録
  3ブロック、`### 足すかどうか` の「埋めないと決めた穴」、`## async/await` の
  「採らなかった立場」2項目を落とした。**ルールの理由と例外は残してある**
- 線引きは「この文が無いと規約の意味（何をしてよくて何が駄目か）が変わるか」で判定した。
  **「埋めないと決めた穴は理由を添えて書き残す」は文面がルール形だが落とした**——これは
  テストの書き方ではなく「この記録をここに書け」という指示で、記録を置かない結論と矛盾するため
- 逆に**MR本文の粒度の段落は特定のテストファイル名を含むが残した**。「書式変更のたびに
  壊れることは冗長さの証拠にしない」という、判定表に無い基準を足しているため
- ファイルは 32230B で、冒頭の「30KB超あるため通読しない」という前置きは今も成り立つ

### 2026-09-16 関数の並び順の lint 化は見送った（T-261）

- **T-261: oxlint に「export された関数を上・非公開ヘルパーを下」を見るルールは無い**と確認し、
  `status: done` / `passes: false` で閉じた（ユーザー判断により、既製ルールが無ければ見送り）。
  `docs/coding-standards.md`「## 関数の並び順」と CLAUDE.md の該当ルールはそのまま残っている
- **`no-use-before-define` は方向が逆**なので今後も採れない。この規約どおりに並べると
  「定義前に使っている」として必ず落ちる（最小例で実測）。`typescript/member-ordering` は
  oxlint に存在しない（設定すると `Rule 'member-ordering' not found in plugin 'typescript'`）

### 2026-09-16 JSDocのブロックタグ禁止規約を廃止した（T-260）

- **T-260: `### JSDocのブロックタグは使わない` 小節を削除**した。禁止をやめると残るのが
  「何も強制しない」という裏返しだけになり、規約として言うことが無くなるため、書き換えて
  残す案は採らなかった。`@param` 等は**必要なら書いてよい**扱いになった
- 索引表の該当行・`## コメント` の「下の7小節を含む」→「6小節」・`### 1行目は要約` の
  「（ブロックタグだけを採らなかった）」も追随。受け入れ時に、T-259 で本文を更新したのに
  索引表の説明が古いままだった1行（`2段落以上のJSDocの形と…`）も直した
- `docs/research/comment-conventions.md` は**当時の調査記録なので書き換えていない**

### 2026-09-16 coding-standards.md の重複した本文を1つに戻した（T-259）

- **T-259: `docs/coding-standards.md` を 667行 → 517行に**。79b7356 が入れた重複ブロック
  （本文の前半と索引表後半のコピー、157行）を削り、`### 1行目は要約、空けてから詳細` は
  **重複側にしか入っていなかった新しい本文**のほうを残した
- **`oxfmt` は太字 `**…**` の中のコードスパン `` `/** \*/` `` を壊す\*\*ことが分かったため
  （下の「注意」）、追加した段落は太字を外して平文で書いた。文言の意味は変えていない

### 2026-09-16 利用者向けドキュメントを既定 ACCESS_TOKEN 廃止に追随させた（T-258）

- **T-258: `README.md`・`.env.example`・`.gitlab-ci.yml`・`config.example/`・`docs/smoke-test.md` と、
  T-257 で残った `docs/architecture.md` 1行・`docs/glossary.md` の用語名を追随させた**。
  README の環境変数表・CI/CD変数表に載るトークンは `ACCESS_TOKEN_<GROUP>` だけになり、
  エラーハンドリング表の401は2行から1行に統合された
- `docs/glossary.md` の用語名を `ACCESS_TOKEN・accessTokenEnv` →
  `` `ACCESS_TOKEN_<グループ>`・accessTokenEnv `` に改名（索引行と見出しの両方）
- **`docs/smoke-test.md` のシナリオ (d)「既定 `ACCESS_TOKEN` を消しても動く」は手順から削除**。
  2026-09-15の実測ログ側の (d) は記録として残し、「現在の手順には無い」注記を足して整合させた

### 2026-09-16 accessTokenEnv を必須化し既定 ACCESS_TOKEN を廃止した（T-257）

- **T-257: `registry.yaml` の `accessTokenEnv` を必須にし、既定 `ACCESS_TOKEN` の経路を丸ごと削った**。
  `EnvConfig.accessToken`・`AdaptersByAccessToken`・`Route` の `fallback` バリアント・
  `assertFallbackAvailable()`・`access-token-groups.ts` の既定グループが消え、**401は全て
  chart単位 `ERROR` に一本化**（5xx・ネットワーク障害の即時終了は据え置き）
- `createRoutedAdapter()` の第2引数は `ReadonlyMap<AccessTokenEnvName, PlatformAdapter>` に。
  表が1つになり専用の型で包む理由が消えたため
- **CLI本体・lintスクリプトは接尾辞なしの `ACCESS_TOKEN` を一切読まなくなった**。
  CI/CD変数と `.env` からの削除はユーザー作業（未実施）
- 受け入れ時に、どのタスクの担当範囲にも入っていなかった `CLAUDE.md`（3箇所）と
  `docs/coding-standards.md`（2箇所）の401方針・環境変数の記述を追随させた

## 未解決

- **`CLAUDE.md` の「関連リンク」が存在しないファイルを指している**（2026-09-16 に発見）。
  `docs/history/tasks-archive.md` / `docs/history/progress-archive.md` と書いてあるが、
  abcf502 の改名で実物は `docs/history/tasks.md` / `docs/history/progress.md`。
  `/maintain-docs` か次に CLAUDE.md を触るタスクで直す

- **GitHub側の実機検証が未実施**（2026-09-13）。`PLATFORM=github` の経路はユニットテストと
  型でしか確かめていない。特に次の3つはモックでは検証しきれない:
  - `commitFileUpdates` の4呼び出し（`repos.getBranch` → `createTree` → `createCommit` → `createRef`）が
    実際に1コミットのPRになるか
  - `getFileContent` の1MB制限と、`listTags` のページング（タグ31件以上のリポジトリ）
  - `retry-after` 付きの403/429が実際にどう返るか
    `scripts/smoke/` と `pnpm lint:validate-config:remote` は**GitLab専用のまま**なので、
    GitHub用の手順を作るところから必要（`docs/smoke-test.md` にその旨を明記済み）。

- ~~**GitHub対応をやるかどうかが未定**~~ **やると決定**（ユーザー判断、2026-09-12。T-220〜T-227 を登録）。T-219 の計測で「`ProjectId` の中立化は
  呼び出し側への波及という意味では障害にならない」ことは確かめた（`src/` の影響は
  `lib/config/schema.ts` の3箇所）。**残る判断は2つ**:
  - YAMLの `projectId: 100` を文字列に寄せるか（`config/` の破壊的変更）、スキーマで両方受けるか
  - 最大の実装差である「複数ファイルの1コミット化」（GitHubに等価APIが無く、Git Data APIで
    4呼び出しに分解が要る）を引き受けるか
    詳細は [`docs/research/github-support.md`](../docs/research/github-support.md)。

- ~~**T-212 で洗い出した `README.md` の提案17件は採否が未定**~~ **全件反映済み**
  （T-214〜T-218、2026-09-12）。以下は反映した内容の要約として残す:
  - **L-1（不足・高）**: `Quick Start`(113-122) に `.env` の作成手順が無い。`pnpm dev` は
    `tsx --env-file=.env`（`package.json:7`）なので、`.env` が無いと起動前に落ちる
    （`.env` は `.gitignore:11` で追跡外）。`cp .env.example .env` を手順に足す案
  - **L-2（不足・高）**: 同梱の `config/yadokari-smoke-test-chart`・`同2` は作者の GitLab 固有の
    `projectId`（86061211 等）なので、第三者環境では必ず `ERROR`＋`exit(1)`。手順2に
    「同梱設定を消すか `TARGET_CHART` で絞る」を足す案
  - **L-3（不足・高）**: `registry.yaml`/`config.yaml` の最小サンプルが README 本文に無い
    （`タグ形式` 節の `appSpecs` 断片のみ）。README 単体完結の前提では手順2を実行できない
  - **R-1（冗長・高）**: `環境変数` 表(168-176) と `手動実行時のオプション` 表(276-282) が
    5変数の説明を同文で持つ（173行と279行は完全一致）。後者の説明列を前者への参照に寄せる案
  - **R-2（冗長・高）**: 「Protected を OFF にする理由」が `設定ファイルの検証`(229-231) と
    `セットアップ手順`(263-266) の両方で本文展開されている
  - **D-1（ズレ・高）**: README:239 の「指数バックオフ（1秒→2秒→**4秒**）で**最大3回リトライ**」が
    実装と違う。`withRetry` の既定は `maxAttempts: 3`・`baseDelayMs: 1000`（`src/utils/retry.ts:11`）で
    `attempt === maxAttempts` で打ち切るため、**試行3回＝リトライ2回・待ちは1秒→2秒**。
    `docs/architecture.md:387` は正しく、README だけがズレている
  - **D-2（ズレ・中）**: README:311 の `src/ # steps/ → lib/ → utils/ の3層構成` が
    `domain/`・`types/` を落としている（実際は5ディレクトリ）
  - **D-4（ズレ・中）**: `docs/requirements.md` 5章が配布方法を「npmjs.com に公開して
    `npm install`」と定めているが、`package.json` に `version`/`bin`/`files` が無く CI も
    `pnpm start`。**正典側が実装から取り残されている**疑い。README ではなく要件側の要否確認が要る
  - **L-5（不足・中）**: `LICENSE` も `package.json` の `license` も無い。OSS公開体裁を維持する
    判断をしたので、**ライセンス選定はユーザー判断**が要る

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

- **`oxfmt` は Markdown の太字 `**…**` の中に書いたコードスパン `` `/** _/` `` を壊す。**
`` `/\*\* _/` `` → `` `/** \_/` `` に書き換わり、同じ段落の後続の `` `/** _/` `` まで
`` `/\*\* \_/` `` になる（2026-09-16 に最小再現で確認）。`\*\*`と`_/` が絡むと強調の対応が
  崩れるため。**JSDoc の記法を説明する文では太字を使わない**（T-259 でこの回避を採った）

- **改名の確認 grep は単語境界 `\b` を使わない。** 日本語に挟まれた識別子
  （「1つのchartAndAppsを処理する」など）を単語境界として認識せず見逃す。T-204 で19件の
  取りこぼしを踏み、次のタスクの注意に書いたら取りこぼしが0件になった
- **ログの項目名と `config.yaml` のキー名が 2026-09-12 に変わっている。** 過去のログや古い
  `config.yaml` を読むときは `update_chart`→`update_unit`、`previousTagName`→`currentTag`、
  `chart[]`→`locations[]`、`helm.branchToSync`・`helm.branchName`→`helm.branchRef`、
  `helmTargetBranchUpdates`→`helmBranchRefUpdates` で読み替えること

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
