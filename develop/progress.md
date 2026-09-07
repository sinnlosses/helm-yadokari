# 現在の状態

最終更新: 2026-09-07（配置・命名の再検討タスク3件（T-092〜T-094）を**全件完了**。着手前に
T-077〜T-091（前回のリポジトリ全体レビューのfollow-up、全件 `done`）を `docs/history/` へ
アーカイブした。この3件は `main` にマージ済み）

T-001〜T-091 はすべて完了し、[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)
へ移した。過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある
（T-077〜T-091 のセッション記録も移設済み）。

## 完了したこと（このセッション）

**コードは変えていない。** 以下の2つだけ:

- **アーカイブ**: `develop/tasks.json` の `done` が15件・48KB とアーカイブ基準
  （`docs/workflow.md`「肥大化したときのアーカイブ」）に達していたため、T-077〜T-091 を
  `docs/history/tasks-archive.md`（`## T-077`〜`## T-091` を追記）と
  `docs/history/progress-archive.md`（`## 過去セッション: T-077〜T-091` を追記）へ全件移した。
  `tasks.json` は新規3件だけの状態に戻した。
- **タスク登録（T-092〜T-094）**: いずれもユーザー指摘による「置き場所・命名の再検討」。
  3件とも `opus`（既存の設計判断の文書と噛み合わせつつ方針を決める必要があるため）。
  - **T-092**: `src/lib/config/helm-target-branch.ts`（`resolveHelmTargetBranch()` 1関数だけ、
    呼び出し元は `config.ts` のみ）を独立ファイルのまま置くのが妥当か。`config.ts` の
    非公開関数に畳むか、残すなら `schema.ts`/`validate.ts` と粒度の揃った名前にするか。
  - **T-093**: `src/lib/tag-format.ts` が `lib/` にあるべきか。`TAG_FORMAT` はこのツール自身の
    取り決めで、`values.yaml`/`config/` のような外部ファイル形式とは種類が違う。ドメイン固有の
    定数・関数を置く新区分（`src/domain/` 等）を新設するかまで含めて再検討する。一度
    `lib/gitlab/tag.ts` から意図的にここへ動かした経緯あり（`tasks-archive.md`）。
  - **T-094**: `helm-target-branch-target.ts` の公開関数 `applyHelmTargetBranchTargets()` と
    ファイル名が揃っていない。`apply-updates.ts`↔`applyUpdates()` のようにファイル名＝公開
    関数名に揃える。姉妹 `image-tag-target.ts`/`applyImageTagTargets()` が同じズレを持つため、
    両方揃えるか helm のみかの判断が主な論点。

- **T-092 完了**（ブランチ `chore/reconsider-placement-naming`）。**ユーザー指示で方針変更** ——
  一時は `resolve-helm-target-branch.ts` に切り出したが撤回し、`resolveHelmTargetBranch()` を
  `config.ts` の非公開関数に畳んだ（1関数・呼び出し元1つ）。テスト8件は `loadConfig` 経由なので
  `test/lib/config/config.test.ts` に統合。`docs/architecture.md` の設計判断ノートは「役割で
  括れて複数並べられる単位（`schema.ts`/`validate.ts`）が別ファイルの境目で、単発ヘルパーは
  そこに達しない」に置き換え。`pnpm check`（30ファイル333テスト、統合でファイル数 31→30）。
- **T-093 完了**。**ユーザー指示で方針変更**（当初は「`lib/` のまま据え置き」で終えていた）。
  `src/domain/` を新設し、`tag-format.ts`（← `src/lib/`）と `feature-branch.ts`
  （← `src/steps/shared/`）を移した。`domain/` の定義: 「tech非依存で、このツールの取り決め
  （タグ命名規則・固定ブランチ名の付け方）を体現する純粋な関数・定数」。副次的に境界が明確化 ——
  `lib/` は外部アダプタだけ、`steps/shared/` は `step-outcome.ts`（step処理の配線）だけになった。
  import 15ファイル・テスト2件を追従、`docs/architecture.md`（新セクション＋判断基準リスト＋
  `lib/gitlab/` 分割ノート）と `CLAUDE.md`（判断基準リスト＋テストコマンド例）も更新。
  `types/` は据え置き（scope 判断: import が全域・CLAUDE.md ルールも書き直しで churn 大）。
  `pnpm check`（30ファイル333テスト）。
- **T-094 完了**。`build-plans/sub-steps/` の2ファイルをリネーム（`git mv`、テストも同名）:
  `image-tag-target.ts` → `apply-image-tag-targets.ts`、`helm-target-branch-target.ts` →
  `apply-helm-target-branch-targets.ts`。`steps/` ツリーは全ファイルがファイル名＝公開関数名の
  ケバブケースで、この2つだけが概念名で崩れていた。姉妹の同型2ファイルなので両方揃えた。
  公開関数名は不変、内部型エイリアスのみ関数名に合わせた（`ApplyImageTagTargetsAcc`・
  `ApplyHelmTargetBranchTargetsAcc`）。`build-plans.ts` import・`docs/architecture.md`・
  `docs/glossary.md` も追従。判断を `docs/architecture.md` に記録。
  `pnpm check`（31ファイル333テスト、変化なし）。

## 次にやること

- **`undefined` の棚卸しから5件を登録した（T-095〜T-099、全件 `todo`）**。`src/` 全体の
  `undefined` を調査し、(A)外部の「無い」を写しているだけで消せないもの、(B)要件を変えれば
  消せるもの、(C)表現が揃っていないもの、に分類した結果からの登録。
  - T-095（sonnet）: アンカー不在を読み取り時に即エラーへ寄せ、`previousTagName` /
    `previousBranch` の `| undefined` を消す。**この2つの `undefined` は実行時に到達不可能**
    （直後の `setValueAtAnchor()` が必ず例外を投げる）なのに、型・MR本文の表示・テストの
    3箇所であり得ない分岐を維持している、というのが調査で判明した一番の発見
  - T-096（sonnet）: パイプライン取得を `build-plans` → `apply-updates` へ移し
    `AppUpdatePlan.pipeline` を消す（dryRun由来の `undefined` が無くなる）
  - T-097（haiku）: `EnvConfig.configPath` のデフォルトを `env.ts` に寄せる
  - T-098（sonnet）: `?:` を `| undefined` に統一し、**`docs/coding-standards.md` に
    `undefined` の基準**（外部の「無い」は許容／プログラムの都合で生まれたものは避ける／
    消すことを目的にせず生まれる理由を先に問う）を節として追加する。規約を書く判断が
    入るので haiku から上げた
  - T-099（sonnet）: `branchToSync` 不在を分かりやすいエラーで落とす（今は存在しない
    ブランチにタグを作ろうとして404で落ちる。Helm向き先ブランチ側は事前検証しているのに非対称）
- **T-100（opus）**: Helmの向き先ブランチを `AppConfig`（app単位）から `ChartAndApps`
  （client単位）へ移す。**主目的は `undefined` 削減ではなく**、共通の値をapp単位に振り分けてから
  `uniqueHelmTargetBranchUpdates()` で重複排除して戻す往復を無くすこと。「向き先ブランチは
  client内のapps全体で共通」という要件は今後も変わらないとユーザー確認済み（2026-09-07）。
  T-095・T-096 と触るファイルが重なるため両者に依存させてある
- **T-101（opus）**: 型の置き場所の基準を実態に追いつかせ、規約からたどり着ける形にする。
  調査の結果 **基準は既に `docs/architecture.md`「型の置き場所」に6行の表として存在**し、
  `coding-standards.md` は冒頭でそこへ明示的に委譲している。ただし表が実態を
  カバーしきれていない（`src/domain/` の行が無い／関数の引数として受け取る型／Zod
  スキーマ由来の型／`EnvConfig` が例に無い）。**二重管理を避けるため、書き写すのではなく
  表の拡充＋規約からの導線**を推奨として本文に書いた（最終判断は着手時、要ユーザー合意）。
- 前回まで（T-064以降）の実機未検証分は据え置き（下の「注意」参照）。

## 未解決

- なし（各タスクの論点は `tasks.json` の本文に記載）

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
