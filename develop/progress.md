# 現在の状態

最終更新: 2026-09-12（**T-198〜T-218 をすべて完了**。前半は命名の洗い直し（`/grilling` 33問・
10ラウンド → 規約4件の書き換えと改名31件）と設定まわりの命名（T-208〜T-211）。後半は
**`README.md` の精査と反映**で、読者目線で洗い出した17件（冗長6・不足7・実装とのズレ4）を
T-214〜T-218 で全件反映し、**clone 直後に Quick Start どおり動く状態**にした。MIT ライセンスも
追加。`scripts/` の引数パースは `node:util` の `parseArgs` に置き換えた（T-213）。
**`done` 11件をアーカイブ済み（`develop/tasks.json` は空）**。2026-09-11以前の記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある）

**未着手のタスクは T-219 の1件**（`loopable: "N"`。下の「次にやること」）。完了タスクは
[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)、過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

### 2026-09-12 config のサンプルとGitHub対応の調査

- **`config.example/`（タスクIDなし）**: `config/` のコピー用サンプルを新設
  （`commit b6f4b42`）。`config/` に架空の設定を置くとCIの `validate-config-remote` が
  実在チェックで必ず落ちるため別ディレクトリにした。深さ1の最小構成と深さ2の複数app構成を
  収録し、`pnpm lint` に `lint:validate-config:example` を足してスキーマ変更時の腐りを検知する。
  `pnpm check` 通過: 386 Tests

- **GitHub対応の調査（タスクIDなし）**: `docs/research/github-support.md` を追加
  （`commit fb09229`）。分界面（`lib/gitlab/` の13関数）は機能しているが、`ProjectId`・
  `GitLabUrl`・`PipelineInfo` の3つが外に漏れている。最大の実装差は複数ファイルの1コミット化で、
  GitHubに等価APIが無くGit Data APIで4呼び出しに分解が要る。GitHub/GitLab公式ドキュメント
  5本の引用付き。**採用も着手も未決**で、最小の一歩として T-219 を登録した

### 2026-09-12 README.md の提案の反映

- **T-217**: MIT ライセンスを追加（`LICENSE` 新規・`package.json` の `license`・`README.md` の
  `## License` 節と目次）。著作権行は `Copyright (c) 2026 sinnlosses`。**npm公開はしない判断**
  （ユーザー判断、2026-09-12）なので `version`/`bin`/`files`/`publishConfig`/`private` は
  足していない。受け入れで License 節の本文を英語から日本語に直した（この README は
  `Features`・`Quick Start` と同じく**見出しは英語・本文は日本語**）。`pnpm check` 通過: 386 Tests

- **T-216**: `README.md` の不足6件（L-1〜L-4・L-6・L-7）を埋めた（+65/-15行）。
  **clone 直後に手順どおり動く状態になった**のが本体で、`cp .env.example .env`（無いと
  `pnpm dev` が起動前に落ちる）と、同梱の `config/yadokari-smoke-test-chart*` を消すか
  `TARGET_CHART` で絞る指示（第三者の環境では必ず `ERROR` になる）の2つが効いている。
  `registry.yaml`/`config.yaml` の最小サンプルも本文に載せた（`src/lib/config/schema.ts` の
  必須フィールドと突き合わせ済み）。受け入れで1文直した——「`GITLAB_URL`/`ACCESS_TOKEN`
  **以外**の環境変数は行頭で渡せる」と範囲を誤っていたので、どれも渡せる形に。
  **`--env-file` と行頭指定は行頭が勝つ**ことを `node --env-file` で実測して確かめた。
  `pnpm check` 通過: 386 Tests

- **T-215**: `README.md` の重複6件（R-1〜R-6）を整理（+32/-33行）。効いたのは
  **同文の表2つ**（Pipeline inputs 表の説明列を `環境変数` 表への参照に寄せた）と
  **Protected OFF の理由の二重展開**（`セットアップ手順` に一本化）。`config/` 節の
  9行1段落は3段落に割り、エラー表からは正常系の1行（タグ自動作成）を外して表の下のリンクにした。
  受け入れでR-6を直した——ログ注記を1行に縮めた結果**「絞り込むと `run_start` に値が載る」まで
  消えていた**ので、`undefined` がJSONから落ちる内部挙動だけを落として残した。
  `pnpm check` 通過: 386 Tests

- **T-218**: `docs/requirements.md` 5章の配布方法を実態に合わせた。「公開npmレジストリ
  （npmjs.com）に公開し `npm install`」→「レジストリ公開はせず、このリポジトリを clone して
  CI 上で `pnpm install` → `pnpm start`」（`.gitlab-ci.yml:149-155` と一致）。**正典が実装から
  取り残されていた**ケースで、ユーザーが「npmでは配布しない」と判断した（2026-09-12）。
  完了条件に書いた「`npmjs` の grep が docs/ 全体で0件」は**達成していない** ——
  `docs/requirements-grilling.md:54` と `docs/history/progress-archive.md:336` は
  **当時の決定の記録なので書き換えない**のが正しく、条件の書き方のほうが間違っていた。
  代わりに grilling の既存慣習（`:96` の「実装後の訂正:」節）に倣って訂正節を足した。
  `pnpm check` 通過: 386 Tests

- **T-214**: `README.md` の実装と食い違う記述3件を訂正（D-1・D-2・D-3）。最大のものは
  503/504 のリトライで、「1秒→2秒→**4秒**で最大3回リトライ」は `src/utils/retry.ts:11,29` の
  既定（`maxAttempts: 3`・`baseDelayMs: 1000`、`attempt === maxAttempts` で打ち切り）と違い、
  **実際は試行3回＝リトライ2回・待ちは1秒→2秒**。受け入れで `src/` の区分の書き方を
  `docs/architecture.md` と同じ「4区分」の語に整えた。`pnpm check` 通過: 386 Tests

### 2026-09-12 scripts/ の引数パース

- **T-213**: `scripts/smoke/smoke-fixture.ts`・`scripts/lint/validate-config.ts` の引数パースを
  `node:util` の `parseArgs`（`strict: true` + `allowPositionals: true`）に置き換えた。
  **外部依存は1つも増やしていない**（Node 22.13+ の標準）。動機は
  `--brokn-anchor` のようなtypoが黙って無視され、`docs/smoke-test.md:145` のシナリオ2が
  **何も壊さないまま「期待どおり」に見える**こと。`configRootPath` は位置引数のまま維持し、
  `README.md`・`.gitlab-ci.yml`・`docs/smoke-test.md` の呼び出しは無変更。
  受け入れで2点直した: **戻り値のインライン型に `readonly` が抜けていた**
  （`src/utils/partition.ts`・`src/lib/config/find-config-units.ts` が前例）のと、
  smoke-fixture 側が英語エラーを握りつぶして usage だけ出しており**どのフラグを間違えたか
  分からなかった**ので、同ファイルの `smoke-fixture ERROR:` 書式（336行目と同じ）に揃えた。
  `pnpm check` 通過: 386 Tests

### 2026-09-12 README.md の精査

- **T-212**: `README.md`（322行）の17見出しを読者目線で精査し、**冗長6件・不足7件・
  実装/正典とのズレ4件**を提案表にまとめた（README.md は1行も変更していない）。着手前に
  ユーザーが**読者像＝OSS公開体裁を維持**・**正典との重複より README 単体完結を優先**と
  決めたため、「`docs/` に書いてあるから削る」方向の指摘は全件対象外にし、**README 内で
  2回書いている箇所**と**読者の意思決定に寄与しない記述**だけを冗長として扱った。
  最も重いのは不足側の L-1（`pnpm dev` は `tsx --env-file=.env` なので `.env` が無いと
  起動前に落ちるのに、README に `.env` の作成手順が1行も無い）と L-2（同梱の
  `config/yadokari-smoke-test-chart*` は作者の GitLab 固有の `projectId` なので、
  第三者環境では必ず `ERROR`＋`exit(1)` になる）。**採否は未定**で、反映は別タスク。
  `maintain-docs` の7検査で機械的に拾える指摘は**0件**だった（検査7が出す5件は見出し名の
  重複のみで、本レポートの対象と重ならない）。`pnpm check` 通過: 386 Tests

### 2026-09-12 型の置き場所の裏付け

- **T-211**: `docs/architecture.md`「型の置き場所は`src/`全件と突き合わせて確かめてある」節の
  裏付けを取り直した。**数え方を節に書いていなかったので55という数字が再現できなかった**のが
  根本で、「行頭から始まる `type`／`interface` 宣言を1件」と定義して再現コマンドを節に載せた
  （現在67件）。内訳は `types.ts`／`brand.ts`／残り の3区分をやめ、**表の行ごとの件数**にした
  （表の判断軸と対応していなかった3区分では「表から外れているものは1件も無い」を裏付けられない）。
  表から外れていた9件は**すべて基準の側**が足りておらず、5行目「ステップ内部の作業用の型」を
  「関数の内部の」に広げて `lib/` の作業用型と `steps/shared/describe-plan.ts` の2件を拾った。
  **型は1件も動かしていない。** 例に挙がる型名28件の実在と置き場所も全件確認し、
  5/6行目の競合の例が間接参照だった1件を実際に import されている型に差し替えた。
  `pnpm check` 通過: 386 Tests

### 2026-09-12 設定まわりの命名

- **`tasks.json` に `summary` フィールドを足した**（タスクIDなし。運用の変更）。発端はユーザーの
  「`summary` ってフィールドが付くと思ってた」という指摘で、調べたら**壊れた痕跡が残っていた**。
  アーカイブの207タスク全件が `**タスク**: <一行>` を持つのに、**その一行を書く指示は
  `plan-tasks` にも `docs/workflow.md` にも一度も存在しなかった**（`git log -S` でヒット0）。
  本文が5節構造になった時点で慣習だけが落ち、テンプレートが残って
  `**タスク**: ### 背景` を吐いていた（T-193〜T-197の5件。ラベルだけで空が10件）。
  `docs/workflow.md` に「summary」節とフィールド定義を足し、アーカイブのエントリの形も明記。
  `plan-tasks` は**先に `summary` を書き、1行に収まらなければ分割に戻る**手順にした
  （タスクの粒度の検査点を兼ねる）。`list-tasks` は `## 背景` を切り出すフォールバックを削除。
  既存4件（T-208〜T-211）には後付けした。**`docs/history/` の15件は遡って直さない**

- **T-209**: ルートの `Config`→`LoadedConfig` に改名し、`src/types/types.ts` から
  `src/lib/config/config.ts` へ**移した**。置き場所は「型の置き場所」の表の**2行目**で説明が付き、
  表に行を足す必要は無かった（引数側の `ConfigTarget` が同じ `lib/config/` で2行目の例になっている＝
  戻り値の形も同じアダプタのインターフェースの一部）。**281行目は改名と無関係に既に事実と
  食い違っていた**——`PipelineInfo` を「利用箇所が1ファイルしかない型」に挙げていたが実測3ファイル。
  実測し直して「1〜2ファイルしかない型（`RunResult`・`TagInfo`）」に直した。型は消さずに残した
  （グローバル設定を将来足す余地）。`pnpm check` 通過: 386 Tests

- **T-210**: 環境変数 `CONFIG_PATH`→`CONFIG_ROOT_PATH`（12ファイル）。T-208 が
  「外部インターフェースだから」と据え置いた最後の1つを、**ユーザーが据え置きを解除**して改名した。
  `.gitlab-ci.yml` は spec input として `default: ""` で宣言されているだけで、**登録が必須の
  CI/CD Variables（`GITLAB_URL`・`ACCESS_TOKEN`）には入っていない**ことを確認したうえで実施。
  `src/utils/fs.ts` の `assertSafePath()` のJSDocが環境変数名を例示していたので汎用に直した（原則2）。
  `pnpm check` 通過: 386 Tests。**pipeline schedule に手で登録している場合のみGitLabのUI側の
  変数名変更が要る**（リポジトリ外の作業）

- **T-208**: `ConfigDirPath`→`ConfigRootPath` 系5件を15ファイル・71/71行で改名（純粋な改名）。
  `configDirPath` が「`config/` の最上位」か「`config.yaml` があるディレクトリ」か読めない、
  というユーザーの指摘が発端。**T-122 で `configPath`→`configDirPath` にした判断を一部覆した**形で、
  当時の論点2には `configRootPath` が候補として挙がっていたが落とした理由が記録されておらず、
  T-122 の背景自身が実体を「設定ディレクトリの**ルートパス**」と書いていた。`run_start` ログの
  項目名も追随（承認済み）。`CONFIG_PATH` 環境変数は据え置き。受け入れで `README.md` の
  `CONFIG_PATH` の説明2行も直した——**識別子だけ直してもユーザーが読む側に同じ曖昧さが残る**
  ため。`pnpm check` 通過: 386 Tests

### 2026-09-12 `docs/glossary.md` の整理

- **T-207**: `ParsedTag.builtAt`→`taggedAt`。6ファイル・19/19行の機械的な改名で、受け入れでの
  修正なし。**これで T-201〜T-207 が全完了**し、`/grilling` で決めた規約4件と改名31件が
  正典・コード・`config/`・ログ・`README.md` のすべてに反映された

- **T-206**（唯一の設計変更）: `HelmBranchRefUpdate` から `newBranch` を削り、
  `{ location, currentBranch }` に。`ImageTagUpdate` の `{ location, currentTag }` と**完全に対称**
  になった。消費側2つは引数を1つ足すだけで解決し、**原則1を壊す必要は無かった**
  （呼び出し元3箇所がいずれも `configUnit` を持っていた）。**ログには新しい値を出し続ける判断**
  ——削った複製の問題は「型が位置ごとに違う値を持ててしまう」不正な状態を許すことで、1つの引数から
  組み立てるログサマリは構造上そうならない。かつ dry-run のログは行き先ブランチが読める唯一の出力。
  MR本文のテスト期待値は1行も変えていない。`pnpm check` 通過: 385 Tests

- **T-205**: 「前」側の値を `current` に統一（`previousTagName`→`currentTag`、
  `previousBranch`→`currentBranch`）し、ログ項目と `helm.branchToSync`→`helm.branchName` も
  揃えた。27ファイル・78/78行で**完全に釣り合った純粋な改名**。**受け入れでの修正は初めて0件**で、
  前タスクの教訓「確認の grep に単語境界 `\b` を使わない」を注意に書いたのが効いた。
  `newBranch` は T-206 の担当なので無変更を `git diff` で確認済み。`pnpm check` 通過: 385 Tests

- **T-204**: `AnchorTarget`→`AnchorLocation` と、YAMLキー `apps[].chart[]`/`helm.chart[]`→
  `locations[]`（`config/` 4ファイル計10箇所）。受け入れで2つ直した。**(1) T-203 の取りこぼし19件**
  ——日本語プロースに埋まった `chartAndApps` を、私が使った `\bchartAndApps\b` の grep が
  **日本語に挟まれた識別子を単語境界として認識せず**見逃していた。以後この確認は境界なしで行う。
  **(2) 改名が中途半端だった**——`LabeledTarget.target`→`location` とフィールドだけ変わり、型名と
  `validateNoDuplicateTargets`・`validateTargets`・`validateTarget` が `Target` のまま残っていた
  （サブエージェントが正典の「型の置き場所」の記述を「命名は変えない」と誤読）。`Location` に
  揃えた。`pnpm check` 通過: 385 Tests

- **T-203**: `ChartAndApps`→`ConfigUnit` を軸にコードを一括改名（35ファイル、357/360行で
  **純粋な改名**）。型5件・フィールド2件・定数と関数5件・ファイル1件・ログイベント1件。
  **受け入れで17件の取りこぼしを直した**（`docs/architecture.md` 14件・
  `docs/coding-standards.md` 3件）。原因は T-201 の完了条件を
  `grep 'AnchorTarget\|ChartAndApps'` としか書かなかったことで、小文字の `chartAndApps` と
  `ChartUpdate*` 系を拾えていなかった。**完了条件の grep は大文字小文字と派生形まで列挙しないと
  抜ける**という教訓。`pnpm check` 通過: 385 Tests（変更前と同数）

- **T-202**: 用語集を新しい規約に合わせて全面更新（38項→36項）。内部の型6件を日本語見出しにし、
  `config.yaml` に打ち込む語（YAMLキー・環境変数・ファイル名）は識別子見出しのまま残した。
  **`chartリポジトリ / chartAndApps` の結合見出しを解体**し、`ConfigUnit` の集約説明を
  「設定ユニット」へ統合したことで、範囲の違いを説明していた6行がまるごと不要になった。
  受け入れで、サブエージェントが「本来この用語集の対象外」と自分で書きながら載せていた
  `ConfigUnitScope` の項を削除している（冒頭の方針が明確に除外している語彙）。
  `pnpm check` 通過: 385 Tests

- **T-201**: `docs/architecture.md` の命名規約4件を書き換えた。規約②は「落とさない」から
  **「修飾語があれば落とす」へ反転**し、`previousBranch` の名指し除外を削除。規約①は多義を
  明示的に許可したうえで判定基準「修飾語が用途を言っているか、識別の手段を言っているだけか」を
  追加した。規約④には同名別義とYAML/型の語幹違いの禁止を足した。受け入れで3点を直している
  （同名別義の適用範囲が2ファイル間に狭まっていた・例に削除予定の `newBranch` が使われていた・
  判定基準の由来である `AnchorLocation` の例が抜けていた）。`pnpm check` 通過: 385 Tests

- **命名の洗い直し（`/grilling`、33問・10ラウンド）**: T-200 の結論「改名1件・据え置き5件」を
  前提から問い直し、**大きく覆った**。決め手は2つ。(1) 据え置きの根拠に使っていた
  `docs/architecture.md`「型と命名」の規約が**実態と逆**だったこと。`BranchName` 型の
  フィールド6件は「修飾語があれば `Name` を落とす」で例外ゼロなのに、規約は「落とさない
  （ただし `previousBranch` 等は除く）」と書いていた。一般則を見つけ損ねて個別例外を
  規約に書き込んだ跡。(2) 「読者は未来の自分が主」「`config/` の実物6ファイルは全部自分の
  フィクスチャで他チームの登録はまだ無い」と確認したことで、**「外部インターフェースだから
  動かせない」という据え置き理由が今は効かない**と分かったこと。
  結果、**規約4件すべてを書き換え、改名は31件**になった。最大のものは
  `ChartAndApps`→`ConfigUnit`（ブランド型 `ConfigUnitPath` が既に `ConfigUnit` を語幹に
  持つのに肝心の型が無かった）と、`HelmBranchRefUpdate.newBranch` の削除（設定ユニットに
  1つしかない値を書き込み位置ごとに複製していた）。決定は T-201〜T-207 に落としてある

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
  `HelmBranchRefUpdate`・`TARGET_CHART・TARGET_UNITS`。283行→339行、24.6KB→29.9KB）。
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

### 2026-09-12 スキルをユーザー単位へ移設

- `.claude/skills/` の13スキルのうち `maintain-docs` 以外の12件を `~/.claude/skills/`
  （ソース: `~/ghq/github.com/sinnlosses/claude-skills`、symlink）へ移した。タスク運用の
  ルール本体は新設の参照専用スキル `task-workflow` の `WORKFLOW.md` に移し、`docs/workflow.md`
  はこのプロジェクト固有の値と経緯だけに薄くした。プロジェクト固有の値（`pnpm check` /
  `pnpm format`）は `develop/workflow.json` に置き、3スキルが読み込み時に `` !`cat` `` で注入する
- 検証: `pnpm check` 34ファイル・386テスト通過。`maintain-docs` の確定群（検査1〜4）0件

## 次にやること

**T-219（`ProjectId` の中立化の計測、`opus`、`loopable: "N"`、依存なし）が1件 `todo`。**
`loopable: "N"` なので `/loop` では拾われない。**ユーザーがいるセッションで `/next-task` を
直接呼ぶ必要がある**（候補の表現の選定に承認が要り、計測結果がGitHub対応そのものの採否判断の
入力になるため）。調査記録は [`docs/research/github-support.md`](../docs/research/github-support.md)、
指示メモは [`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-12（4回目）」。

T-212 の提案17件はすべて反映し終えた（T-214〜T-218。ユーザーが採否を決め、L-5はMIT・
D-4は「npm配布しないので正典を実装に合わせる」で確定。残り15件は全件採用）。
**README.md は clone 直後に Quick Start どおり動く状態になった。**
**実機スモークテストは未実施のまま**（下の記述を参照）。

T-213（`parseArgs` 化）は
**「導入して良くなるライブラリはあるか」の問いから出たタスク**で、結論は「外部パッケージは増やさない」——本体3,784行に対し実行時依存は
4つ（`@gitbeaker/rest`・`p-limit`・`yaml`・`zod`）で、手作りの `logger.ts` 35行・`retry.ts` 36行は
どれも置き換える利が無い（pino はログ形式が `README.md` の外部インターフェースとして固定されて
いるため、p-retry は `isRetryable` を注入する今の形が原則2に沿っているため、却下）。
**唯一の実益が Node 標準の `parseArgs`** だった（依存を増やさずに引数のtypoを弾ける）。

次にやることは、下の「未解決」に置いた **T-212 の提案17件の採否**がユーザー判断待ち。採ると決まった
ものを反映タスクとして登録する（指示メモは
[`docs/history/direction.md`](../docs/history/direction.md) の「2026-09-12（3回目）」）。

設定まわりの命名（T-208・T-209・T-210）と、その過程で見つかった型の置き場所の裏付け直し
（T-211）は完了済み（指示メモは同ファイルの「2026-09-12（2回目）」）。

- **`AnchorValueLookup`（`lib/helm.ts`、公開）と `AnchorLookup`（同ファイル、内部）が1文字違いで、
  名前から公開・内部の区別が読めない。** T-211 の突き合わせ中に見つけたが、「型の置き場所」では
  なく命名の話なのでその場では手を付けていない。気になったら命名タスクとして起こす

**`ConfigUnit` の `unit` を外す案は検討して却下した**（ユーザー判断、2026-09-12）。`Config` が
ルートの型で埋まっている・`ConfigUnitPath` が `ConfigRootPath` と同語になる・`unit` が
「並列処理とMR発行の粒度」を表していて外すと `chartリポジトリ = config` と誤読される、の3点。
識別子は約831箇所/62ファイルで T-203 の一括改名の直後でもある。**`ConfigUnit` 系は現状維持。**

**実機スモークテストは未実施。** `config.yaml` のキーが2つ変わっている
（`chart[]`→`locations[]`、`helm.branchToSync`→`helm.branchRef`）ので、一度
`docs/smoke-test.md` の手順を通しておくと、設定の読み込みが実機でも壊れていないことを
確かめられる。ローカルの `pnpm check` と `pnpm lint`（`config/` のスキーマ検証を含む）は通っている。

## 未解決

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
