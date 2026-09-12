# 進捗管理とHandoffの詳細（このプロジェクト固有の部分）

`develop/tasks.json` / `develop/progress.md` / `develop/direction.md` でタスクを管理する運用の
**ルール本体（フィールド定義、`summary`・`difficulty` の基準、evidence の書き方、アーカイブの
トリガーと手順）は、ユーザー単位スキル `task-workflow` の `WORKFLOW.md` が正典**
（`~/.claude/skills/task-workflow/WORKFLOW.md`。ソースは
`~/ghq/github.com/sinnlosses/claude-skills`）。このファイルには、その運用のうち
**このプロジェクトでしか成り立たないこと**だけを書く。5手順そのものは `CLAUDE.md`
「進捗管理とHandoff」が正典。

## このプロジェクトの値（`develop/workflow.json`）

| キー            | 値            | 意味                                                             |
| --------------- | ------------- | ---------------------------------------------------------------- |
| `checkCommand`  | `pnpm check`  | タスクの受け入れ判定に使う。ドキュメントだけの変更でも省略しない |
| `formatCommand` | `pnpm format` | 受け入れ前に走らせる整形                                         |

それ以外（タスクIDの接頭辞 `T-`、アーカイブ先 `docs/history/`、アーカイブのトリガー
`done` 10件以上または 30KB超）は既定値のまま。

## コミットメッセージ

タスクに対応するコミットは件名の先頭にタスクIDを置く（書式は正典「コミットメッセージ」）。
このプロジェクトでは `docs/coding-standards.md`「タスク番号を書かない」がコードとドキュメント
にタスク番号を書くことを禁じているが、**コミットメッセージはその対象外**。IDはアーカイブ後も
`docs/history/tasks-archive.md` に `## T-XXX` の節として残るため、参照先が消えた識別子には
ならない。

## `summary` を持たないタスク

`summary` フィールドを足す前に登録されたタスクには `summary` が無く、
`docs/history/tasks-archive.md` の `**タスク**:` 行に `task` 本文の先頭（`### 背景`）が
そのまま入っているものが15件ある。`docs/history/` は当時の記述のまま残す運用なので
**遡って直さない**。

## evidence に書かない経緯の行き先

正典は evidence に「設計変更の物語・撤回した案・実機検証の手順」を書かないと定めている。
このプロジェクトでそれらを残したいときは、要件に関わるものは `docs/requirements-grilling.md`、
設計に関わるものは `docs/architecture.md`、それ以外は `docs/history/` のアーカイブへ書く。
