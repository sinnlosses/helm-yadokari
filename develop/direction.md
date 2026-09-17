# 未対応の指示メモ（ここに書くと次のセッションが `/plan-tasks` でタスク化する。正典: `task-workflow` スキルの `WORKFLOW.md`）

## ユーザーから

### registry.yaml の group は名前ではなく groupId で特定する（2026-09-18）

T-263 で足した `group: <グループのフルパス>` は、**特定にグループ名（パス）を使っている点が
誤り**。名前は変わることがあるが ID は変わらないので、**特定は `groupId` で行い、名前は
人間が読むための補助情報として持つ**。

これはこのリポジトリの既存の規約そのもので、`chartToUpdate` / `appSpecs[]` が
`projectId`（特定）＋ `projectName`（ラベル）を持つ形と同じ。`docs/glossary.md` にも
「**`projectName`をキーに入れない**: `projectId`と1:1のラベルで、同一性の判定には効かないため」
と明記されている。T-263 はこの規約に追随できていない。

#### 調べて分かっていること

- `Groups.show(groupId)` は `ExpandedGroupSchema` を返し、`id` と `full_path` を持つ
  （gitbeaker 43.8.0。`scripts/smoke/provision-group.ts` が既に `Groups.show()` を使って
  パス→数値IDを解決している前例がある）
- `Projects.show` が返す `namespace` は `id`・`full_path`・`parent_id` を持つ。
  `namespace.id` だけではサブグループ配下かどうかを判定できない（`parent_id` は1階層ぶん）
- したがって **サブグループ配下を許す仕様（T-263 で決めた）を保つなら、`groupId` から
  `full_path` を1回だけ引いて、いまのセグメント単位の前方一致をそのまま使う**のが素直。
  解決は registry.yaml 単位（= chartリポジトリ単位）で1回なので、projectId ごとの
  API 呼び出しは増えない（T-263 の「API 呼び出しの回数を増やさないこと」を満たす）
- 副産物として、`groupId` から引いた `full_path` と registry.yaml に書かれた名前を突き合わせれば
  **名前が古くなっている（グループがリネームされた）状態を検出できる**。まさに今回の懸念そのもの

#### 決めてほしい論点

- **フィールドの形**。`accessTokenEnv` と同じトップレベルのスカラー2本（`groupId` + `groupName`）か、
  `chartToUpdate` のようにネスト（`group:` の下に2フィールド）か。ネストすると `group.groupId` と
  語が重複する
- **名前側のフィールド名**。GitLab は `name`（表示名）と `path`/`full_path`（スラッグ）を区別する。
  いま書いてある `sinnlosses-group` は `full_path`。`projectName` の前例に倣って `groupName` にするか、
  実体に合わせて `groupPath` にするか
- **名前が実物とズレていたときの扱い**。`--remote` で問題として報告するか、黙って通すか
  （ラベルなので落とさない、という判断もありうる）
- **`GroupId` のブランド型**。`ProjectId` は形式検証なしの文字列ブランド（GitLab の数値と
  GitHub の `owner/repo` を兼ねるため）。グループは GitLab 専用なので数値のみに絞れるが、
  `ProjectId` の前例に寄せるかどうか

#### 対象

`src/domain/brand.ts`・`src/domain/types.ts`・`src/lib/config/schema.ts`・
`src/lib/config/load-config-unit.ts`・`src/lib/gitlab/api.ts`・
`scripts/lint/remote-existence/`・`scripts/smoke/group-fixture-content.ts`・
`scripts/smoke/provision-group.ts`（groupId を表示する）・`config/` の2件・
`config.example/`・テスト・ドキュメント（README「設定」章と「複数グループで運用する」、
`docs/requirements.md` 4.4節、`config/README.md`、`docs/architecture.md`、`docs/glossary.md`、
`docs/smoke-test.md`）。T-263 が触った範囲と同じ。

`config/` の2件に書く `groupId` は gitlab.com の `sinnlosses-group` の実際の数値ID
（架空の値を置かない。実在チェックの対象のため）。
