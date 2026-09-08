# 指示メモのアーカイブ

`develop/direction.md` に書かれたユーザーからの指示を、タスク化した時点でここへ日付見出し付きで
移す（新しいものを上に足す）。運用の正典は
[`docs/workflow.md`](../workflow.md)「指示メモ（`develop/direction.md`）」。
**当時の記述はそのまま残し、後から書き換えない。**

**このファイルは通読しない**（20KB超）。日付見出しの追記ログなので節の索引は持たない。
過去の指示をたどりたいときだけ、`grep -n '^## '` で日付を選び、その節だけを
`sed -n '/^## 2026-09-08（4回目）/,/^#\{2,4\} /p' docs/history/direction.md` の形で読む。

## 2026-09-08（4回目）

生成したタスク: T-144（タグ形式の仕様を単純化する。semver廃止・`{time}`必須化・`tagNaming`→`tagFormat`・用語統一を1タスクにまとめた）。
**タスクにしなかった項目は無い。** 指示は `/grilling` セッションで合意した設計そのもので、
決定事項10件と進め方4件を T-144 の1タスクに統合した（分けると正典とコードが食い違う中間状態が
コミットされるため）。

## タグ形式の仕様を見直す（2026-09-08 のgrillingで合意）

タグの仕様を変えたあと、不必要にソースコードが複雑になったと感じている。再度検討したい。

grillingで確定した事実:

- 実物のタグは `{branch}-build-at-{date}-{time}` と `{date}-{time}-{branch}` の2パターン。
  **どちらも3プレースホルダ全部入り**。semverのリポジトリも `{time}` なしのリポジトリも予定にすら無い
- 形式が2種類ある以上、app単位で設定可能にすること自体は正しい（ここは削らない）

決めたこと:

1. `config.yaml` の `apps[].tagNaming`（`mode` 判別共用体）を **`apps[].tagFormat`（文字列・必須）** にする。
   既定値は持たせず、必ず書かせる
2. **semverモードを廃止する**。`mode` 判別共用体ごと畳む
3. **`{time}` を必須に戻す**（`{branch}`/`{date}`/`{time}` の3つとも各1回必須）。
   並び順・区切り文字が自由な自由記述テンプレートは**維持する**（実物2形式が並び順違いのため）
4. タグ自動作成は常に可能に戻る。「最新タグが決まらない」状態とapp単位スキップは消滅する
5. タイブレーク（順序キー同値ならタグ名の降順）は削除。テンプレートがapp単位で固定なら同値は原理的に起きない
6. `ParsedTag.orderKey`（`TagOrderKey`）を **`builtAt: Date`** に戻す。`compareTags()` のexportは消し、
   smokeは `builtAt` の直接比較に戻す。※`builtAt` 自体は残す必要がある。並び順が自由なので
   `v{time}_{branch}__{date}` のような形が書け、タグ名の辞書順と日時順は一致しないため
7. 正典から semver の記述は**完全に消す**（「検討して撤回した」という判断記録も残さない。
   経緯は `docs/history/tasks-archive.md` の T-132・T-134 の evidence に残るのでそこで足りる）
8. 廃止済み環境変数 `TAG_FORMAT` の記述は、**理由は残して識別子名は消す**。
   新キー `tagFormat` と1文字違いで紛らわしいため。「環境変数だとCIの `check` で検証できない」という
   理由自体は今も `config/` に置く根拠なので、識別子名を使わずに残す
9. 用語を「タグ命名規則」→ **「タグ形式」** に統一する。識別子（`tagFormat`/`TagFormat`/
   `tag-format.ts`/`validateTagFormat()`）と1:1に揃える。**コストより正確さを取る**。
   アーカイブ（`docs/history/`・`docs/requirements-grilling.md`）は触らない
10. `config-test/` の5appすべてに `tagFormat` を明示する。**2形式目は入れない**
    （スモークの期待値を同時に動かすとリスク軸が増えるため。並び順違いが動くことは単体テストで固定済み）

進め方:

- **1タスクにまとめる**（コード削除・テスト削除・正典追随・README追随を1コミットで整合させる）。
  分けると正典とコードが食い違う中間状態がコミットされるため
- **`git revert` は使わない**。`882ebec`(T-134) の後に T-138・T-140・T-143 が同じファイルを触っており、
  revertすると残すべきそれらまで巻き戻る
- `validateTagNamingConsistency()` は**残す**（キャッシュ誤共有の防止。比較は文字列比較に単純化）。
  `compileTagPattern()`・`escapeRegExp()` と T-143 の守りテスト6件も**維持**
- `DEFAULT_TAG_TEMPLATE` は既定値でなくなるので `src/` から消す。`test/helpers.ts` と
  `scripts/smoke/smoke-fixture.ts` は自前のリテラルを持つ（テストのためだけのexportをしない規約）

## 2026-09-08（3回目）

生成したタスク: T-132（`{date}`/`{time}` を外したときとsemverの設計を決める。実装しない）/
T-133（タグ命名規則を `config/` で設定できるようにする）/ T-134（semver対応）/ T-135（タグ名の日時をJSTに）。
**タスクにしなかった項目は無い。** ただし1項目め「`{date}`、`{time}`は不要にしよう」は**既存機能と正面衝突する**ため、
そのまま実装するタスクにはせず T-132 の第一の論点にした。`{date}`/`{time}` は (A) HEADを指すタグが複数あるときの
タイブレーク（`findLatestParsedTag()`）(B) **新しいタグ名の一意性**（`buildNewTag()`。`{branch}`だけだと生成名が常に
`main` になり既存タグと衝突して作成できない）(C) スモークのシード判定、の3つの役目を持っており、外すと
「タグ自動作成」（`docs/requirements.md` に明記された機能）が成立しない。semverも同様に、`v1.2.3` には
ブランチ名が入らないため `resolveTrackedHeadTagNames()` の「追跡ブランチ由来」の判定方法そのものが成立しない。
そのため「方針決め（T-132、実装なし）→ 設定の置き場所（T-133）→ semver（T-134）」の直列にした。
4項目め「サポートされていない設定パターンだったらCIで落とす」は**独立したタスクにしていない**。フォーマットを
`config/` に移すと `pnpm lint:validate-config` が `pnpm lint` → `pnpm check` 経由でCIの `check` ジョブに載っており
MR時点でZodスキーマと `validateTagFormat()` が走るため、T-133 の完了条件に畳み込んだ。
JST化（T-135）は他と独立して着手できるので `dependencies` を空にした。

- tag のフォーマットをユーザーが設定できるようにしたい。リポジトリごとにフォーマットが異なりそうなので。
  - 必要なのは一旦追跡ブランチを特定するために必要な情報({branch})だけにして、{date}、{time}は不要にしよう
  - タグは今の仕様に加えて semver に対応できるといいね
  - フォーマットはリポジトリのconfigに設定できるといいかな
  - サポートされていない設定パターンだったらCIで落とすようにしたいな
- tag の日時はJSTがいいな。今はUTCだと思うけど

## 2026-09-08（2回目）

生成したタスク: T-128（要件・用語の正典を「設定ユニット（深さ1〜2）」へ書き換え）/ T-129（コードの語彙を `unitPath` 1本に置換。振る舞い不変）/
T-130（走査を深さ1〜2に拡張し、入れ子を設定エラーに）/ T-131（`config-test/` に深さ1のユニットを作り e2e で混在を守る）。
**タスクにしなかった項目は無い**（1項目の指示で、設計判断4点はセッション内の対話で確定させたうえで4タスクに分割した）。
分割の方針は「正典を先に確定 → 振る舞いを変えない語彙置換 → 振る舞いを変える階層拡張 → 実ファイルのフィクスチャ」で、
**振る舞い不変のリファクタ（T-129）と振る舞いの変更（T-130）を分けてある**（前者は既存テストが全部通ることで守られるため）。

## テナント/クライアント2階層固定の廃止 → 「設定ユニット」への抽象化

ユーザーの原文:

> 1つ重要な要件変更をお願いしたい。README.md に「ディレクトリ階層は常に
> `<chartリポジトリ>/<tenantId>/<clientId>/` の2階層で固定です。テナント分けが不要な場合も
> ダミーの1つの tenantId/clientId ディレクトリ配下に置いてください。」とあるけど、これを
> 抽象化してテナント分けが不要なもの(例えば `<chartリポジトリ>/central/apps.yaml`) など
> chartリポジトリ配下すべてに対応することはできるかな? 変更範囲はかなり広いと思う。

### 確定した設計判断（このセッションでユーザーが選択）

1. **深さは1〜2に限定**。`<chart>/central/config.yaml`（深さ1）と
   `<chart>/tenant1/client1/config.yaml`（深さ2）の両方を許す。深さ0（`chart.yaml` と同階層に
   `config.yaml`）は不可、深さ3以上も不可
2. **入れ子は設定エラーで停止**。走査は `config.yaml` を見つけた時点でそれ以上降りるのを
   やめ、その配下にさらに `config.yaml` があれば起動時に例外を投げる
   （理由: Git の ref は D/F conflict を起こすため、`feature/yadokari/central` と
   `feature/yadokari/central/sub` は同一リポジトリに共存できない。入れ子禁止がこの制約を
   完全にカバーする ─ D/F conflict はパスがプレフィックス関係のときしか起きないため）
3. **後方互換は取らない**（新名称に統一）。ログの `tenantId`/`clientId` は廃止して1本化、
   環境変数 `TARGET_CLIENTS` も改名する。チーム内限定ツールなので破壊的変更を許容し、
   コードに条件分岐を残さないことを優先する
4. **新しい語彙は「設定ユニット」/ `configUnit`**（`updateUnit`・`scope` 案は不採用。
   前者は既存の `ChartUpdateTarget`/`ChartUpdateResult`/`AppUpdatePlan` の "Update" と
   衝突し、後者は `ACCESS_TOKEN` のスコープと衝突するため）
   - 型: `ConfigUnitPath`（ブランド型。値は `"central"` も `"tenant1/client1"` も取る）
   - フィールド: `ChartAndApps.unitPath`（`tenantId`/`clientId` を置き換える）
   - ログ: `{"chartDirName":"teamA-chart","unitPath":"central",...}`
   - 環境変数: `TARGET_UNITS="central,tenant2/client1"`
   - ブランチ: `feature/yadokari/<unitPath>`（深さ2のとき既存の文字列と完全一致するため、
     既存のオープンMR・ブランチは迷子にならない）
   - ファイル: `src/domain/client-ref.ts` → `src/domain/config-unit.ts` に改名。
     `formatClientRef`/`parseClientRef` は「相対パスの検証・正規化」に役割が変わる
     （深さ1〜2チェック、空セグメント拒否、`..` 拒否）
   - 日本語プロース: 「テナント/クライアント」→「設定ユニット」

### 影響範囲（このセッションで調査済み）

コア（2階層に依存しているのはこの6箇所だけ。パイプライン本体 build-plans / apply-updates /
helm.ts / gitlab.ts は tenant/client を一切見ておらず `ChartAndApps` を透過的に運ぶだけ）:

- `src/lib/config/config.ts:104-134` `listClientChartAndApps()` が `listSubdirectories()` を
  2回ネストする決め打ち走査。ここを深さ1〜2の再帰＋入れ子検出に置き換える。
  `clientDirExists()`（92-100行）も相対パス版に
- `src/domain/feature-branch.ts:12` `buildFeatureBranch(tenantId, clientId)` → `unitPath` 1引数
- `src/steps/apply-updates/sub-steps/build-mr-content.ts:10-30` MRタイトル
- `src/steps/shared/step-outcome.ts:99-100` `buildLogContext()` のログフィールド
- `src/lib/env.ts:80-127` `parseTargetClients()` / `parseTargetClientEntry()` → `TARGET_UNITS`
- `scripts/lint/verify-config/verify-config.ts:57,77` エラーの位置表示
- 型: `src/types/brand.ts` の `TenantId`/`ClientId` を削除し `ConfigUnitPath` を追加、
  `src/types/types.ts` の `TargetClient` を廃止（`ConfigUnitPath` 単体で足りる）、
  `ChartAndApps` のフィールド差し替え
- `src/lib/config/chart-and-apps.ts:24-35,74-75` シグネチャと戻り値

ドキュメント（作業量の大半はここ。「テナント/クライアント」がドメイン語彙として全体に浸透）:

- `docs/glossary.md`(15箇所) ─ 「テナント / クライアント」エントリを「設定ユニット」に
  差し替え、表記ゆれ注記として今回の経緯を書く。**正典なのでここを最初に直す**
- `docs/requirements.md`(41箇所) ─ 「4.4 アプリの登録・設定」が config/ 構成の正典
- `README.md`(24箇所) ─ 特に「設定」章の階層説明（162-163行）と環境変数表
- `docs/architecture.md`(23箇所) / `docs/smoke-test.md`(22箇所) /
  `docs/coding-standards.md`(2箇所)
- `docs/requirements-grilling.md`(27箇所) は**過去のQ&Aログなので書き換えない**（アーカイブ扱い）
- `.gitlab-ci.yml` の pipeline inputs（`TARGET_CLIENTS`）

テスト・フィクスチャ:

- `test/` 17ファイルが `tenantId`/`clientId` を参照（`test/helpers.ts`・
  `test/lib/config/fixture.ts` が土台）
- `config-test/` は深さ2のまま残しつつ、**深さ1のケースを1つ足して e2e で守る**
  （深さ1と深さ2が同じ chart 配下に共存できることの回帰テストになる）
- `scripts/smoke/smoke-fixture.ts`

## 2026-09-08

生成したタスク: T-123・T-124（要件シナリオに対するe2eテストの方針決めと実装）/ T-125（パラメータ化候補の洗い出し）/
T-126（`config/` の運用方針と既定パスの通し方）/ T-127（`apply-updates` のサブステップ粒度と `gitlab.ts` の薄いラッパー化）。
**3項目めの後半「必要ならGitLab上で実機テストするための環境を構築してほしい」はタスクにしなかった。すでに構築済みのため**
（`sinnlosses-group/yadokari-smoke-test-chart` + ソースリポジトリ2つ + `scripts/smoke/smoke-fixture.ts` の setup/reset +
`docs/smoke-test.md`。2026-09-07に実施して `{"CREATED":2,"SKIPPED":0,"ERROR":0}`）。残っている `config/` 側だけを T-126 にした。
4項目めの後半（`gitlab.ts` を薄いラッパーに戻す）は `docs/architecture.md`「コミット処理だけは`lib/gitlab/`がドメイン型を
知っている」節の**既存の設計判断を覆すもの**なので、覆すかどうかを T-127 の第一の論点にした。

- スモークテストはあるけど要件に沿った体系的なシナリオテストというか、e2eがなさそうだけど検討してもらえるかな
- このリポジトリで環境変数にすでに設定されている部分以外でパラメータ化できる部分を洗い出してほしい。パラメータ化して使う人が設定できるようにすべきか考えたいので。
- configディレクトリに実際に設定ファイルを置いて通してみたい。必要なら GitLab 上で実際に実機テストするための環境を構築してほしい。
- apply-updates.ts がサブステップの呼び出しの連鎖で成り立っていない部分があるのでリファクタしたい。現状は collectMrEntries -> buildMrContent -> commitFileUpdates -> createMergeRequest の流れだけど、commitFileUpdates と createMergeRequest はステップになってない。ステップになっていない2つを1つのステップとしてまとめると良さそう? あと、 gitlab.ts の commitFileUpdates はブランチのdeleteもやっていてgitlabの薄いラッパーと呼べないくらいの処理になっている。上記で作ったステップでそういった手順は組み、gitlab.tsでは薄いラッパーである役割を貫こう。

## 2026-09-07（3回目）

生成したタスク: T-121（`accessToken` をブランド型にする）/ T-122（`configPath` のリネームと検証）。
タスクにしなかった項目は無し。2点とも現物で裏が取れた（`EnvConfig` 8フィールドのうち
`gitlabUrl`/`targetChart`/`tagFormat` はブランド型なのに `accessToken` と `configPath` だけ素の
`string`。`configPath` のパストラバーサル検証は `env.ts` ではなく後段の `loadConfig()` にある）。

- env.ts の EnvConfig がよくわからない印象
  - accessToken は string のまま使っているけど型をつけたいな
  - configPath が具体的に何のconfigのpathかわからず、わかりやすい名前にしたいし、値の形式にvalidationもなさそうだね。形式が決まっているならvalidateしたいな

## 2026-09-07（2回目）

生成したタスク: T-120（タスクの実行モデルの決め方から「メインセッションのモデル」への従属を外し、
`difficulty` に沿ったモデルのサブエージェントへ依頼する運用に統一する）。タスクにしなかった項目は無し。
指摘は現物で裏が取れた（同日のセッションはメインがOpus 5の状態で `difficulty: sonnet` の
T-112〜T-115 を「メインがそのまま実行」しており、ラベルと実行モデルが一致していなかった）。

- tasks を処理する方法としてサブエージェントに必ず投げるようにする。現状はメインが担当することがあるがメインのモデルの切り替えを普通に行うことがあるので、一貫してサブエージェントに投げることで統一感を出す

## 2026-09-07

生成したタスク: T-116（dry-runの分岐の再考）/ T-117・T-118（async/awaitとthen/catchの方針確定と適用）/
T-119（`develop/test-inventory.md` の要否判断）。
タスクにしなかった項目は無し。3項目とも現物のコードで裏を取ったうえでタスク化した。

- dry_run の仕組みの再考。処理の途中で dry_run であるかどうかの分岐がところどころにある。これはキレイに分離できるならしたいけどアイデアがない。検討してほしい。
- async/await と then/catch の混在をどうするか(許容、使い分け、統一)を設計思想として確定させ、迷いがないように記録したい。その後、決められた方針に従い既存のコードの修正も行いたい。
- develop/test-inventory.md はまだ必要なファイル?不要なら削除をお願い

## 2026-09-06

**全項目が対応済み**。対応内容の詳細は同じディレクトリの
[`tasks-archive.md`](./tasks-archive.md) と
[`docs/architecture.md`](../architecture.md)「設計判断（なぜ今の形なのか）」を参照。
このメモはタスク化の運用（`/plan-tasks`）を決める前に書かれたものなので、
「各項目 → 生成したタスクID」の対応表は残っていない。

- 環境変数 TARGET_CLIENT は複数指定できる認識なので TARGET_CLIENTS に修正したほうが良さそう
- filter-targets で fatal なエラーが settled になってしまいそう。fatalなものは処理全体を落としてしまいたい
- try catch を少なく、あるいはどこで try catch を入れるかを決め打ちできないかを検討してほしい
  - fatal なものは処理を落とす、そうでないものは復帰してエラーとして計上する、これをいたるところで書くのを避けられるか、という課題
- 型の定義配置をリポジトリで統一感持たせたい。types/ディレクトリにあったり、filter-targetsのようにファイル内にあったり、build-plans/sub-steps/types.ts にあったりと一貫した設計方針がないのでブレている印象
- URLをstringで扱っている箇所があるように見え、URLインターフェースを使うなど型で縛ることを検討してください
- tasks.json と progress.mdをdevelop/ディレクトリを新しく作ってそこに配置してください(機能に関係ないファイルなので)
