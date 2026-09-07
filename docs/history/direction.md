# 指示メモのアーカイブ

`develop/direction.md` に書かれたユーザーからの指示を、タスク化した時点でここへ日付見出し付きで
移す（新しいものを上に足す）。運用の正典は
[`docs/workflow.md`](../workflow.md)「指示メモ（`develop/direction.md`）」。
**当時の記述はそのまま残し、後から書き換えない。**

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
