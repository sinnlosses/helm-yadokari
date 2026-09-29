# 進捗管理とHandoffの詳細（このプロジェクト固有の部分）

`develop/task/`（1件1ファイル）/ `develop/direction.md` でタスクを管理する運用の
**ルール本体（タスクファイルの文法、`summary`・`difficulty` の基準、`## 結果` の書き方、
知見の置き場、`tw` コマンド）は、ユーザー単位スキル `task-workflow` の `WORKFLOW.md` が正典**
（`~/.claude/skills/task-workflow/WORKFLOW.md`。ソースは
`~/ghq/github.com/sinnlosses/claude-skills`）。このファイルには、その運用のうち
**このプロジェクトでしか成り立たないこと**だけを書く。手順の概略は `CLAUDE.md`
「進捗管理とHandoff」が正典。

## このプロジェクトの値

検証コマンド・整形コマンド・ブランチは `CLAUDE.md`「## タスク運用」節が正典。

## 旧形式の履歴

2026-09-29 に `develop/tasks.json`・`develop/progress.md` の旧形式から `tw migrate` で移した。
それ以前の完了タスクと過去セッションの記録は `docs/history/tasks.md` / `docs/history/progress.md`
に残っており、**読むだけで書き足さない**。

## コミットメッセージ

タスクに対応するコミットは件名の先頭にタスクIDを置く（書式は正典「コミットメッセージ」）。
このプロジェクトでは `docs/coding-standards.md`「タスク番号を書かない」がコードとドキュメント
にタスク番号を書くことを禁じているが、**コミットメッセージはその対象外**。タスクファイルが
`tw prune` で消えたあとも、本文は `git log --grep=T-XXX` で引ける（旧形式の時代のものは
`docs/history/tasks.md` の `## T-XXX` の節）。

## `summary` を持たないタスク

`summary` フィールドを足す前に登録されたタスクには `summary` が無く、
`docs/history/tasks.md` の `**タスク**:` 行に `task` 本文の先頭（`### 背景`）が
そのまま入っているものが15件ある。`docs/history/` は当時の記述のまま残す運用なので
**遡って直さない**。

## `## 結果` に書かない経緯の行き先

正典は `## 結果` に「設計の物語・撤回した案・手順の詳細」を書かないと定めている。
このプロジェクトでそれらを残したいときは、要件に関わるものは `docs/history/requirements-grilling.md`、
設計に関わるものは `docs/architecture.md` へ書く。
