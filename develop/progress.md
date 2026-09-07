# 現在の状態

最終更新: 2026-09-07（`undefined` の棚卸しから登録した T-095〜T-101 の7件をすべて完了し、
`docs/history/` へアーカイブした。`develop/tasks.json` は空）

T-001〜T-101 はすべて完了し、[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)
へ移した。過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

- **T-106 完了**: `test/` 配下のコメントをコメント基準に追従（経緯1件を削除、src側JSDocの
  丸写し1件を圧縮、言い換え1件を削除）。テストの件数・内容は変えていない。

- **T-105 完了**: 発見リストに沿ってテストを削除9件・集約2件・追加7件。カバレッジは
  97.19% → 99.37%（Lines 99.82%）。追加テストの過程で `src/index.ts` の `loadEnvConfig()` の
  失敗が `.catch` に載らないことが分かり、T-108 として登録した。

- **T-104 完了**: テストの取捨選択の基準を `docs/coding-standards.md`「テスト」節として正典化し、
  カバレッジ計測に基づく発見リストを `develop/test-inventory.md` に残した。実作業は
  T-105（削除・集約・追加）・T-106（`test/` のコメント追従）・T-107（`isFatalStatus` の型を狭める）
  として登録済み。

- **T-103 完了**: コメントの基準を「長さ」から「種類」に置き換え（`docs/coding-standards.md`）、
  `src/`+`scripts/` を全件見て経緯5箇所を `docs/architecture.md` の既存4節へ移した。

- **T-102 完了**: `withAppContext()` の適用漏れを解消。`apply-updates/sub-steps/collect-mr-entries.ts`
  のplan単位の解決（web URL・最新パイプライン）も同じくアプリ名が要ると判断して包み、置き場所は
  `steps/shared/` に据え置いた（理由は `docs/architecture.md`「アプリ名の付与は〜」節）。

- **アーカイブ**: `develop/tasks.json` が33KBと基準（30KB）を超え、かつ全7件が `done` に
  なっていたため、T-095〜T-101 を `docs/history/` へ移した（`tasks.json` は `[]`）。
- **既定モデルを Sonnet に変更し、委譲の向きを反転**: `~/.claude/settings.json` の `model` を
  `opus` → `sonnet` に変更（ユーザー指示、全プロジェクトに適用）。これに伴い `difficulty` の
  振り分けを「`sonnet` はメインが自分で実行、`haiku`/`opus` はサブエージェントに委譲」へ
  反転させ、`docs/workflow.md`・`CLAUDE.md`・`.claude/skills/next-task/SKILL.md` を更新した。
- **`docs/architecture.md` に導線を追加**: 41KBあり、開くだけでコンテキストを大きく使うため、
  冒頭に節見出しの索引を置き、必要な節だけを読めるようにした。

## 次にやること

- **T-102〜T-104 の3件を登録した（全件 `todo`）**。いずれもユーザー指摘による品質の棚卸し。
  - **T-102（sonnet）**: `withAppContext()` が `build-plans` からしか使われていない件。他2ステップで
    アプリ単位のエラー文脈が本当に不要かを確認する。**`apply-updates/sub-steps/collect-mr-entries.ts`
    がプラン単位の非同期処理を持つ**（＝エラーにアプリ名が付かない）ことが調査で分かっており、
    ここが主な論点。結論次第で置き場所か冒頭コメントのどちらかを直す
  - **T-103（opus）**: コメントの基準の明確化と既存コードの追従。**基準自体は既に
    `docs/coding-standards.md`「コメント」節にあり**、問題はコードが追いついていないこと
    （本文3行以上のJSDocが `step-outcome.ts` に5個など）。「原則1〜2文」が厳しすぎるのか
    コードが悪いのかを先に決めるのが一番の判断どころ
  - **T-104（opus）**: テストの棚卸し（31ファイル336テスト・4516行）。テストを消すのは
    間違えても気づきにくいため、「不要・冗長」の判定基準と「不足」の見つけ方を先に決めてから
    着手する。量が読めないので分割して残りを再登録してよい
- **3件とも `/grilling` で方針を確定済み**（2026-09-07、18問）。決定は各タスクの `task` 本文の
  「決定済みの方針」に書いてあるので、実施時に蒸し返さない。主な確定事項:
  - コメントの基準は**長さではなく種類**（今の挙動の制約か／昔の話か）。「原則1〜2文」は撤廃し、
    行数の目安は一切置かない。機械チェックは諦めてレビューの問い1文に落とす
  - テストは**削除前に一時スキップして `pnpm check` が落ちないことを確認する**手続きで縛る。
    カバレッジ（導入済み）に閾値は設けず、穴の在り処を見る道具としてだけ使う
  - テストの規約は `docs/coding-standards.md` に「テスト」節を新設して正典化し、
    `CLAUDE.md`「テスト方針」は参照に落とす（`コメント`・`undefined` と同じ形）
- **T-105（`test/` のコメント追従）は意図的に未登録**。`docs/workflow.md` の「`tasks.json` に
  無いIDは完了済みとみなす」規則があるため、実在しないタスクへの依存は張れない。T-104 完了時に、
  発見リストに基づく修正タスクと**まとめて登録**する。
- T-103・T-104 は T-102 に依存させてある（**理由はコンフリクト回避ではなく**、T-102 の結論が
  `step-outcome.ts` のコメントの直しを含むため。T-103 が整えた直後に T-102 が書き換えると
  整えた意味が消える）。
- 前回まで（T-064以降）の実機未検証分は据え置き（下の「注意」参照）。

## 未解決

- なし

## 注意

- `config/` には実運用の登録だけを置く（架空の設定例を置くとCIの `validate-config-remote` が
  必ず失敗する）。記述例は `docs/requirements.md` 4.4節、実物に近いサンプルは `config-test/`
- `<名前>/<名前>.ts` の形（`src/lib/` の gitlab / config、`scripts/lint/verify-config/`）で
  統一している。同名のファイルとディレクトリを並べない（T-092/T-094 の命名判断に効く）
- `.claude/` と `config/` は `.prettierignore` で `oxfmt` の対象外にしている
- `src/lib/config/config.ts` に oxlint の `no-shadow` 警告が2件あるが、分割前からある既存の警告
  （`loadClientChartAndApps` の引数 `target` と、内側の `.map((target) => ...)`）
- リモートは `origin` が `github.com/sinnlosses/helm-yadokari` と
  `gitlab.com/sinnlosses-group/helm-yadokari` の2つの push URL を持つ。
  `git push`/`git fetch` は両方に対して行われる
- gitlab.com 上に検証用の `sinnlosses-group/yadokari-smoke-test-chart` プロジェクトが存在する
  （削除せず残置）
- T-064以降の変更（URL検証の追加・MR本文のURL解決の作り替え・`loadEnvConfig()` 化・
  values.yaml 下書きの受け渡しの作り替え・スモークスクリプトの環境変数追加）は実機未検証。
  検証が完全に終わったら、テスト用のGitLabアクセストークンを失効させる（ユーザー対応）
