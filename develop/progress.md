# 現在の状態

最終更新: 2026-09-08（**タグ形式の仕様を `/grilling` で再検討**し、semver廃止・`{time}` 必須化・
`tagNaming`→`tagFormat`・用語統一を **T-144** として登録した。実装は未着手。
その前に実施した定期メンテの棚卸し（T-136〜T-143）は全件完了済み。あわせて **T-126・T-145 も完了**し、
`config/` の運用方針を決めて `config-test/` を `config/` に統合した（残るは T-146 のみ）。
前回までの流れは下の「完了したこと」を参照）

T-001〜T-146 のうち T-146 を除く全タスクが完了し、[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)
へ移した。過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

### 2026-09-09 ドキュメント整備のスキル化

**T-157 完了**（`sonnet`、委譲）。改名を実装・テスト・実`config/`・`README.md` へ反映し、
**T-156で先行更新した正典の名前が全てコード側に実在する状態になった**（`AppSpec` 3件・
`RegistryYamlSchema` 4件・`registryYamlPath` 9件・`appSpecs` 28件）。16ファイル +199/-194行、
テストは359件のまま（改名のみなので増減しないのが正しい）。

- 実 `config/` は `git mv` で `RM`（rename）として記録され、`projectId`等の値は不変
- **テストフィクスチャの `appsField()` → `listField(key, ...)` はスコープ増ではなく必然**。
  元はキー名 `"apps"` をリテラルで埋め込んで registry 側と config 側で共用していたため、
  片側だけ `appSpecs` になった時点でキーを引数に取る以外に選択肢がない
- 受け入れで確認: 可否表の据え置き対象4種が残存、旧名5種が0件、`steps/` の try 0件・
  新規の `as`/`?:`/タスク番号 0件、`/maintain-docs` の指摘は既存12件のまま増えず

**T-156 完了**（`opus`、委譲）。`config/` の改名（`chart.yaml`→`registry.yaml`、
`chart:`→`chartToUpdate:`、`apps:`→`appSpecs:`）を正典3ファイルに先行反映した。実装・テスト・
実`config/`は未変更（T-157）。**コード識別子の追随は「外部ファイル形式の写しかどうか」で決める**
という基準を立て、7件の可否表を `docs/architecture.md` に追記した（`ChartRepoConfig` と
`ChartAndApps.chart` はドメイン語彙なので据え置き）。

- **委譲先が既存の矛盾を1件発見**: `docs/requirements.md` 4.1節が「タグ形式は `config.yaml` の
  `apps[].tagFormat`」と書いており、正典である4.4節（chartリポジトリ単位のファイル側）と
  食い違っていた。今回の改名に合わせて修正済み
- **受け入れ時にメインが1点修正**: 「`config.yaml` は各チームが日常的に編集する側」という
  理由づけが、同じ節が退けた「変更頻度・編集者による分割」の軸を連れ戻していたので、
  「設定ユニットの数だけ存在するので改名の手数がその数に比例する」に直した

**T-150 完了**（`opus`、判断タスクのため委譲せず実施）。ドキュメント整備を
`.claude/skills/maintain-docs/` としてスキル化した。**論点1（「冗長・重複・読みにくい」を
検査可能にする）の答えは「機械的検査は候補の抽出までにして、正否は既存正典の1問に委ねる」**。
プロトタイプで実測したところ、実在しない `getProjectWebUrls()` や `test/utils/*.test.ts` は
**廃止・削除の記録として正当**で、機械判定だけでは正否が決まらないと分かった。この切り分けは
`docs/coding-standards.md`「コメント」の「今の挙動の説明か、昔の話か」と同型なので、
新しい基準を作らずそちらを参照している（あの節も同じ判定を「機械化しない」と明記している）。

- 検査は7項目。**確定群**（通読ガード・タスク番号・リンク切れ・索引→本文）は直せば必ず正しくなる。
  **候補群**（本文→索引・実在しない識別子/パス・見出しの重複）は上の1問で正否が決まる
- ユーザーと決めたこと: 実行単位は「全検査 → 指摘一覧 → 選んで修正 → 1コミット」、
  **委譲可・`/loop` 可**、対象は8ファイル（`docs/history/` と `requirements-grilling.md` は
  当時の記述を残す性質のため対象外）、検査1は `README.md`/`CLAUDE.md` を除外（通読される入口のため）
- 「委譲可・`/loop` 可」と「ユーザーが選んで修正」の噛み合わせは、**選択者がいない実行では
  確定群だけを直し候補群は報告に留める**という既定で両立させた
- 実測で拾った落とし穴2つをスキル本文に明記した: **zsh は変数の単語分割をしない**ので `sh` で
  実行する、**BSD sed は `\|` の交替を解釈しない**ので `sed -n -E` を使う。
  どちらも最初のプロトタイプが全件NGや無検出になって気づいたもの

## 次にやること

- **T-156（`config/` の改名を正典に先行反映し、コード識別子の追随範囲を決める、`opus`、依存なし）**。
  ユーザーと合意済みの決定は3点: **`chart.yaml` → `registry.yaml`**、**`chart:` → `chartToUpdate:`**、
  **`apps:` → `appSpecs:`**。**`config.yaml` は据え置き**（`apps[].chart[]`・`helm.chart[]` も触らない）。
  動機は「`chart` と `apps` が入れ子違いで両ファイルに現れ、別々のことを定義しているのに
  鏡写しに見える」こと。落とした案と理由は `docs/history/direction.md` の 2026-09-09 にある
  （`targetChart:` は `envConfig.targetChart` と衝突、`chart-and-apps.yaml` は型 `ChartAndApps` と
  範囲が違う、など）。残る判断はコード側の識別子をどこまで追随させるかで、
  **`ChartAndApps.chart` は `docs/architecture.md` が「短い名前のままでよい」例として
  名指ししている**ので残す方向。`/loop` 可。
- **T-157（改名を実装・テスト・実`config/`・残ドキュメントへ反映、`sonnet`、T-156依存）**。
  現状の `chart.yaml` 出現数は `src/` 25・`test/` 23・`scripts/` 2・`README.md` 7。
  実 `config/yadokari-smoke-test-chart/chart.yaml` は `git mv` で改名する。`/loop` 可。

- ~~**T-148（定めた基準で progress.md をアーカイブ、`sonnet`）**~~ **完了**。
  **534行/50.9KB → 252行/23.5KB**（-53%）。新基準の最初の適用で、残したのは最新日付の
  小節1件のみ。消えた245行（空行除く）が移し先に一字一句存在することを全件照合で確認し、
  **欠落ゼロ**。

- ~~**T-147（progress.md のアーカイブ基準とトリガーを定義、`opus`）**~~ **完了**。
  **`todo` を判定対象外にした**（ユーザー承認）。`tasks.json` は `done` の件数と `done` の
  サイズで判定する。全体サイズで測っていた頃は `todo` だけで30KBを超え、
  **本セッションだけで4回空振り**していた（基準は超えるのに移せるものが0件）。
  `progress.md` は「完了したこと」配下の小節を `### YYYY-MM-DD 〜` 形式に必須化し、
  最新の日付以外があればアーカイブ対象。2ファイルを**同じ検査点でまとめて判定**する。
  - 新基準の検証: 現状の `tasks.json` は「不要」（空振り解消）、`progress.md` は
    小節3件・日付混在で「アーカイブ対象」と正しく判定される
  - **実アーカイブは T-148**（このタスクは定義のみ）

- ~~**T-152（`values-yaml-draft.ts` の型と命名の見直し、`sonnet`）**~~ **完了**。
  `DraftValuesYaml`（`ValuesYamlDraft` と語順違いの紛らわしい名前）を削除してインライン型に、
  戻り値のフィールドを `content`→`valuesYamlContent` に改名（呼び出し側2箇所の分解時の
  改名が不要になった）。`ValuesYamlEntry` は非exportへ。

- **T-144・T-145 は完了**。残る `todo` は **T-146〜T-150**。
- ~~**T-153（`tagFormat` の置き場所を決め、正典を先に更新、`opus`）**~~ **完了**。
  ユーザーと詰めた結果、**ファイル分割の軸は「変更頻度」**で確定（`docs/requirements.md` 4.4節が
  「よく変更する/滅多に変更しない」と「運用値/chart構造」の**2つの軸を並べて書いており**、
  `tagFormat` について反対の答えを出していた。`docs/architecture.md` の旧判断は後者で
  判断していた誤り）。**`tagFormat` は chartリポジトリ単位の `config/<chart>/sources.yaml` へ。**
  - **`anchors.yaml` の改名は不要になった**（`tagFormat` が入らないため理由が消えた。
    当初見積もっていた106箇所の変更がまるごと不要）
  - `projectName` は `sources.yaml` を正典としつつ各ファイルにも残す（単体で読めることを優先）
  - `validateTagFormatConsistency()` は残す（chartリポジトリをまたぐ食い違いの検出に役割が変わる）
  - 実データの裏取り: ソースリポジトリ2件が3設定ユニットに5エントリ、`tagFormat` は5箇所とも同値
- ~~**T-155（`config/` を2ファイル構成に改める、`opus`、T-153依存）**~~ **完了**。
  T-153 の `sources.yaml` 案は**ファイル数を7→8、app追加時に触る数を2→3、`projectId`/`projectName`
  の重複を10→12組に増やしていた**（`tagFormat` の重複5→2だけが改善）。実測して比較し、
  **`chart.yaml` + `config.yaml` の2ファイル構成**に改めた（4ファイル・触る数2・重複7組で、
  **全指標が移行前より良い唯一の案**）。`anchors.yaml` は `config.yaml` に統合して廃止、
  `sources.yaml` は作らない。分割の軸は「変更頻度」→**「スコープ」**（chartリポジトリ単位 /
  設定ユニット単位）に変更。変更頻度で分けない理由3点は `docs/architecture.md` が正典。
- ~~**T-154（2ファイル構成へ移行、`sonnet`）**~~ **完了**。`anchors.yaml` を廃止して
  `config.yaml` へ統合、`tagFormat` を `chart.yaml` の `apps[]` へ。実 `config/` は
  **7→4ファイル**、テストは357→**359件**。
  - **受け入れ時に `docs/architecture.md` の更新漏れを修正した**（T-153・T-155 で正典を
    書き換えたとき、旧「3ファイル分割」節・節の索引・各ファイルの責務表・型の置き場所の
    `Anchors`/`AnchorsApp` を直し忘れていた。委譲先が指摘してくれた）。
    **正典を書き換えるときは、同じドキュメント内の索引・表・型名まで grep で洗うこと。**
- **T-151（`StepOutcome` の settled が SKIPPED と ERROR を混ぜている点を解く、`opus`、依存なし）**。
  指摘は事実。`settle("SKIPPED")` が4箇所、`settleAsError()` の `"ERROR"` が同じ枝に入る。
  加えて `settle()` の引数が `ChartUpdateResult` で **`"CREATED"` も型上は渡せる**（実際は
  `apply-updates` が `ok("CREATED")` で返すため渡されない）。消費側3箇所は両者を区別していない。
  3枝に分けるか型を狭めるだけにするかが論点。**`docs/architecture.md` のエラー方針に関わるので
  承認が要る＝`/loop` に載せない。**
- **T-152（`values-yaml-draft.ts` の型と命名の見直し、`sonnet`、依存なし）**。
  `ValuesYamlEntry` と `DraftValuesYaml` はファイル外で**0件**。`ValuesYamlDraft`（下書き本体）と
  `DraftValuesYaml`（読み込み結果）が**語順を入れ替えただけの名前**で隣り合っている。
  `docs/architecture.md`「下書きは受け取って返す」の3つの不変条件は維持する。`/loop` 可。
- ~~**T-149（TARGET_UNITS の説明文から実在しない具体名を外す、`opus`）**~~ **完了**。
  承認された方針は「メタ変数のみ（`<ユニット名>` / `<第1セグメント>/<第2セグメント>`）＋
  深さの詳細は `docs/requirements.md` 4.4節に集約」。8ファイル21箇所を置換した。
  **判断の根拠**: `README.md` の構成図と `docs/requirements.md` 216行目が既に
  「メタ変数が本体、具体名は『例:』の括弧内」という書き方をしており、設定ユニットの階層だけが
  そこから漏れていた（新しい規約ではなく既存規約の適用漏れ）。
  - `docs/smoke-test.md` は**対象外のまま残した**。`TARGET_UNITS=tenant2/client1,...` は
    実際に走らせるコマンドで、`config/` の実フィクスチャを指しているため。
  - `README.md:91` の `mkdir` とログ出力例2件はリテラルが要るのでメタ変数化せず、
    `my-unit` / `my-group/my-unit` に置き換えた。
- ~~**T-150（ドキュメント整備の定型作業をスキル化、`opus`）**~~ **完了**。`/maintain-docs` を
  新設。**当初「`/loop` に載せない」としていた前提はユーザー判断で覆り、委譲可・`/loop` 可**に
  なった（検査が機械的に決まるため）。初回実行の指摘17件は**未修正のまま残してある**
  （候補群のみで、正典の寄せ先の判断が要る）。
- **T-147（progress.md のアーカイブ基準とトリガーを定義、`opus`、依存なし）**。この
  `progress.md` が455行・42.7KB まで肥大化し、うち376行が「完了したこと」になっている。
  規約（`docs/workflow.md`「progress.md の構成」の「このセッション分のみ」）はあるのに、
  アーカイブのトリガー判定が `tasks.json` の数値（`done` 10件／30KB超）にしか無く、
  `/next-task` 手順6 は progress.md へ**追記するだけ**で減らす手順を持たないため再肥大化した。
  トリガー・境界の判定方法を決めて `docs/workflow.md` と両スキルに組み込む。
- **T-148（定めた基準で実際にアーカイブ、`sonnet`、T-147依存）**。T-147 で決めた基準の初適用。
  「次にやること」「未解決」「注意」は残す（**「注意」は T-146 の完了条件が参照している**）。
- **T-146（既定パスで定期実行を開始、`sonnet`、T-145依存）**。`DRY_RUN=true` の手動実行 →
  ログ確認 → pipeline schedule 作成（**平日 JST 9:00・`DRY_RUN` は載せない**）。
  **GitLab UI操作はユーザーが行う**ので `/loop` には載せない。CI/CD Variables は登録済みだが
  **schedule は未作成**（2026-09-08時点）。
  - テスト用アクセストークンは**失効させず本番用として継続利用する**方針に決まった。
    下の「注意」の記述を更新して宿題を閉じるのは T-146 の完了条件に含めてある。
- **定期メンテで登録した T-136〜T-143 は全件完了**（洗い出しの中身は上の「完了したこと」）。
  残る `todo` は **T-126 と T-144** で、T-126 はユーザー承認が要るのでループには載せない。
  - ~~**T-136（`sonnet`）**~~ **完了**。残った `client` はパス例と実フィクスチャ名のみ。
  - ~~**T-137（`sonnet`）**~~ **完了**。「埋めない穴」は3件に減った。
  - ~~**T-138（`sonnet`）**~~ **完了**。ここで見つかった穴が **T-143（`sonnet`、T-138依存）**。
    `escapeRegExp()` を守るテストが1件も無い（外しても全テストが通る）ので、テンプレートの
    区切り文字に `.` 等を使うと静かに誤マッチする
  - ~~**T-139（`sonnet`）**~~ **完了**。(a) 消す を採用。理由は architecture.md の新節。
  - ~~**T-140（`sonnet`）**~~ **完了**。3候補とも畳むだけで削除なし。`it.each` を初導入した。
  - ~~**T-141（`haiku`）**~~ **完了**。ログ例が実装と1対1で対応するようになった。
  - ~~**T-142（`sonnet`）**~~ **完了**。
  - ~~**T-143（`sonnet`）**~~ **完了**。棚卸し由来のタスクはこれで全件done。
- **T-126（`config/` の運用方針、`opus`）は `/loop /next-task` に載せない**
  （`config/` への登録が本番の pipeline schedule の対象を変えるため、ユーザー承認が要る）。
- **設定の構成が変わったので、次回の実機スモークは `docs/smoke-test.md` の手順1から
  やり直す。** 旧ブランチ `feature/yadokari/tenant1/client1` がGitLab上に残っていれば
  `smoke-fixture.ts reset --apply` が拾って片付ける（`isFeatureBranch()` は接頭辞判定のみ）。
  **統合後はスモークも定期実行も同じ `config/` を見るため、`CONFIG_PATH` の指定は不要**。
  同じ固定ブランチを使うので、スモークと定期実行を同時に走らせないこと。
- `scripts/lint/validate-config.ts` はディレクトリを**位置引数**で受け取る（`CONFIG_PATH`
  環境変数では効かない）。統合後は既定の `config/` を見るので `pnpm lint:validate-config` だけでよい。
- 新しいGitLab読み取りをキャッシュ機構に載せる手順と「載せてよいかの判断」は
  `docs/architecture.md`「GitLabへの問い合わせのキャッシュは`lib/gitlab/`に列挙し、バッチ単位で
  1つ持ち回る」節にある。
- 「埋めない穴」「消さないと決めたもの」の正典は `docs/coding-standards.md`「テスト」節に
  移した（T-119）。判断を変えたくなったら、まずそちらの理由を更新する。

## 未解決

- **`develop/tasks.json` のアーカイブ基準（30KB超）が、`todo` だけで超えたときに機能しない。**
  T-151・T-152 を登録した時点で39.5KBに達し、`done` の T-149 を
  `docs/history/tasks-archive.md` へ移したが、**残り6件の `todo` だけで32.9KB**あり基準内に
  戻らなかった。`docs/workflow.md`「肥大化したときのアーカイブ」が定める対処は
  「`done` を減らす」だけなので、`done` が0件のこの状態では打つ手が無い。
  **T-147（アーカイブ基準とトリガーの定義）で一緒に扱う。**

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
- T-064以降の変更は2026-09-07の実機スモークテストで検証済み。**テスト用のGitLab
  アクセストークンの失効はまだ（ユーザー対応）**。gitlab.com 上には今回作ったMR !28/!29 と
  固定ブランチ2本が残っている（次回の `reset` で片付く）
