# 現在の状態

最終更新: 2026-09-07（`src/` 全体の `undefined` を棚卸しし、T-095〜T-101 の**7件を登録**した。
コード変更は無し。着手前に T-092〜T-094 を `docs/history/` へアーカイブ済み）

T-001〜T-094 はすべて完了し、[`docs/history/tasks-archive.md`](../docs/history/tasks-archive.md)
へ移した。過去セッションの記録は
[`docs/history/progress-archive.md`](../docs/history/progress-archive.md) にある。

## 完了したこと（このセッション）

**コードは変えていない。** `undefined` の棚卸しと、その結果のタスク登録:

- **`src/` 全体の `undefined` を調査**し、(A)外部の「無い」を写しているだけで消せないもの、
  (B)要件を変えれば消せるもの、(C)表現が揃っていないもの、に分類した。**一番の発見は
  `previousTagName` / `previousBranch` の `undefined` が実行時に到達不可能**なこと
  （`getValueAtAnchor()` が `undefined` を返すのはアンカー不在時だけで、その直後の
  `setValueAtAnchor()` が必ず例外を投げる）。あり得ない分岐が型・MR本文の表示・テストの
  3箇所で維持されていた。
- **T-095〜T-100 を登録**（commit `5e2a6c3`）。B1〜B4・C・「穴」（`branchToSync` 不在の
  落ち方）と、B3（向き先ブランチを `ChartAndApps` へ移す）。B3は「向き先ブランチはclient内の
  apps全体で共通」という要件が今後も変わらないことをユーザーに確認したうえで案を確定した。
- **T-101 を登録**（commit `18cfffd` → `a86f5ba`）。型の置き場所の基準。調査の結果
  **基準は既に `docs/architecture.md` に6行の表として存在**し、`coding-standards.md` は
  そこへ明示的に委譲していた（問題はたどり着けないこと）。正典は `architecture.md` のまま
  拡充し、規約側からは導線を張るだけ、とユーザー合意のうえ本文を書き直した。
- **アーカイブ**: `develop/tasks.json` が44KBと基準（30KB）を超えたため、`done` の
  T-092〜T-094 を `docs/history/` へ移した。

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
  `coding-standards.md` は冒頭でそこへ明示的に委譲している（「ファイルの先頭に型がある」のは
  表の5行目に従った結果で無秩序ではない）。問題は**たどり着けないこと**と、表が実態を
  カバーしきれていないこと（`src/domain/` の行が無い／関数の引数として受け取る型／Zod
  スキーマ由来の型／`EnvConfig` が例に無い）。**正典は `architecture.md` のままとし、
  規約側からは導線を張るだけにする**ことでユーザー合意済み（2026-09-07、二重管理を避けるため）。
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
