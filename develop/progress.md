# 現在の状態

最終更新: 2026-09-07（品質の棚卸し T-102〜T-108 の7件をすべて完了。`develop/tasks.json` の
`todo` は0件）

T-001〜T-101 は [`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md) へ移してある。
過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。
T-102〜T-108 は `develop/tasks.json` に残っている（`done` 7件・26KB でアーカイブの基準未満）。

## 完了したこと（このセッション）

- **T-109 完了**: 実機スモークテストの準備確認（実行はしていない）。5点すべて揃っていた。
  - 認証情報: `.env` に `GITLAB_URL` / `ACCESS_TOKEN` あり。`SMOKE_*` は手順の中で
    `export` する設計なので `.env`/`.env.example` に無いのは想定どおり
  - 対象プロジェクト: `pnpm lint:validate-config:remote config-test` が**読み取りのみ**で通過
    （3 chart groups / 5 apps。projectId・ブランチ・valuesPath・アンカーの実在を確認）
  - 手順のコマンド: `smoke-fixture.ts` の `setup`/`reset`/`--apply`、`validate-config.ts` の
    位置引数、`pnpm dev` はいずれも実在
  - フィクスチャ: `config-test/` の projectId・アンカー名が手順の期待と一致
  - 期待する結果: MRタイトル書式・本文の8列/4列・`summary` の3キー・終了コードの写像は
    いずれも今の実装と一致（T-108 で変えた起動経路も含めてズレなし）

- **T-108 完了**: `src/index.ts` の `loadEnvConfig()` の失敗が `.catch` に載っていなかった件を
  修正（`Promise.resolve().then(() => run(loadEnvConfig()))`）。冒頭コメントも実装に合わせ、
  テストを1件追加した。

- **T-107 完了**: `isFatalStatus` の引数を `number` に狭め、到達しない `undefined` 判定を削除
  （`src/utils/http.ts` はカバレッジ100%に）。

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

- **T-110（sonnet・依存なし）が残り1件**。コミットメッセージにタスクIDを振る運用にできるかの
  確認と、できる場合のルール整備。論点は `docs/coding-standards.md`「タスク番号を書かない」
  との整合（アーカイブ後もIDは `docs/history/` に残るのでコード側の懸念はそのままは
  当てはまらない、が出発点）。過去コミットは遡って書き換えない。
- **実機スモークテストは「いつでも実行できる」状態**（T-109 で確認済み）。実行はGitLabへの
  書き込みを伴うので、ユーザーの承認を得てから `docs/smoke-test.md` の手順1から回す。
  完了したらテスト用アクセストークンの失効も忘れない（下の「注意」参照）。
- `develop/test-inventory.md` の「要調査で残す判断にしたもの」「埋めない穴」5件は、
  判断を変えたくなったらリスト側の理由を先に更新する取り決め。
- `develop/tasks.json` は `done` 8件・28KB。**次に `done` が10件になるか30KBを超えた時点で**
  `docs/history/` へアーカイブする（`docs/workflow.md` 参照）。

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
