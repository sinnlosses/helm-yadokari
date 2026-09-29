# GitHub（`PLATFORM=github`）の実機検証の手順を作り、実機で確かめる（作業中: 旧形式 progress.md からの移行）

- 根拠: `PLATFORM=github` の経路はユニットテストと型でしか確かめていない（`docs/smoke-test.md` 冒頭）。モックでは検証しきれないのは次の3つ:
  - `commitFileUpdates` の4呼び出し（`repos.getBranch` → `createTree` → `createCommit` → `createRef`）が実際に1コミットのPRになるか
  - `getFileContent` の1MB制限と、`listTags` のページング（タグ31件以上のリポジトリ）
  - `retry-after` 付きの403/429が実際にどう返るか
- 出し先: `scripts/smoke/` と `pnpm lint:validate-config:remote` は GitLab 専用なので、GitHub 用の手順を作るタスク（→ 実機で上の3点を確かめるタスク）
