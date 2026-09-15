// scripts/smoke/provision-group.ts（docs/smoke-test.md「パス5」用グループBの作成スクリプト）が
// 書き込む内容の組み立てだけを集めたファイル。GitLabへの問い合わせを一切持たない純粋関数と、
// その組み立てに使う固定値（ブランチ名・プロジェクト名・シードタグ・トークンの条件）を置く。
// provision-group.ts はここから import して使う。

import type { AccessTokenScopes } from "@gitbeaker/rest"

export const HELM_TARGET_BRANCH = "release/2026-q1"
export const CHART_DIR_NAME = "yadokari-smoke-test-chart-b"
export const CONFIG_UNIT_DIR = "smoke-b-app"
export const CHART_PROJECT_NAME = "yadokari-smoke-test-chart-b"
export const SOURCE_PROJECT_NAME = "sample-smoke-b-app"
export const VALUES_PATH = `charts/${CONFIG_UNIT_DIR}/values.yaml`
// グループAのソースリポジトリ（sample-develop-client）と同じタグ形式・同じ打刻に揃えている
// （docs/smoke-test.md「2グループ目（パス5）に必要なもの」）。実在する、かつ最新より古い
// タグにする理由はsmoke-fixture.tsのSEED_TAGSコメントと同じ
export const SEED_TAG = "main-build-at-20260101-000000"
export const SEED_TAG_FORMAT = "{branch}-build-at-{date}-{time}"
export const ACCESS_TOKEN_ENV_NAME = "ACCESS_TOKEN_SMOKE_B"
export const GROUP_TOKEN_NAME = "yadokari-smoke-b"
// README「複数グループで運用する」の手順どおり: read_api + write_repository、Developer、90日
export const TOKEN_SCOPES: readonly AccessTokenScopes[] = ["read_api", "write_repository"]
const TOKEN_VALID_DAYS = 90

/** README「複数グループで運用する」の命名例（`yadokari-<group>`）に揃えた既定のトークン名 */
export function defaultTokenName(groupPath: string): string {
  const segments = groupPath.split("/").filter((segment) => segment !== "")
  const lastSegment = segments.at(-1)
  return `yadokari-${lastSegment ?? groupPath}`
}

/** チャートリポジトリのvalues.yaml初期値。アンカー名はCONFIG_UNIT_DIR配下のconfig.yamlと一致させる */
export function buildValuesYamlContent(seedTag: string): string {
  return (
    `variables:\n` +
    `  - &smokeBAppVersion ${seedTag}\n` +
    `  - &smokeBHelmTargetBranch ${HELM_TARGET_BRANCH}\n`
  )
}

/** config/<CHART_DIR_NAME>/registry.yaml の中身（docs/requirements.md 4.4節のスキーマに従う） */
export function buildRegistryYamlContent(chartProjectId: number, sourceProjectId: number): string {
  return (
    `accessTokenEnv: ${ACCESS_TOKEN_ENV_NAME}\n` +
    `chartToUpdate:\n` +
    `  projectId: "${chartProjectId}"\n` +
    `  projectName: ${CHART_PROJECT_NAME}\n` +
    `  mrTargetBranch: main\n` +
    `appSpecs:\n` +
    `  - projectId: "${sourceProjectId}"\n` +
    `    projectName: ${SOURCE_PROJECT_NAME}\n` +
    `    tagFormat: "${SEED_TAG_FORMAT}"\n`
  )
}

/** config/<CHART_DIR_NAME>/<CONFIG_UNIT_DIR>/config.yaml の中身 */
export function buildAppConfigYamlContent(sourceProjectId: number): string {
  return (
    `helm:\n` +
    `  branchRef: ${HELM_TARGET_BRANCH}\n` +
    `  locations:\n` +
    `    - valuesPath: ${VALUES_PATH}\n` +
    `      anchor: smokeBHelmTargetBranch\n` +
    `apps:\n` +
    `  - projectId: "${sourceProjectId}"\n` +
    `    projectName: ${SOURCE_PROJECT_NAME}\n` +
    `    branchToSync: main\n` +
    `    locations:\n` +
    `      - valuesPath: ${VALUES_PATH}\n` +
    `        anchor: smokeBAppVersion\n`
  )
}

/** `now`からTOKEN_VALID_DAYS日後の日付をGitLabの`expires_at`形式（yyyy-mm-dd, UTC基準）で返す */
export function computeExpiresAt(now: Date): string {
  const expires = new Date(now.getTime() + TOKEN_VALID_DAYS * 24 * 60 * 60 * 1000)
  const year = expires.getUTCFullYear()
  const month = String(expires.getUTCMonth() + 1).padStart(2, "0")
  const day = String(expires.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * gitlab.com Free プランでは Group Access Token（Project Access Tokenも同様）を発行できない
 * （Premium以上限定。self-managedは全ティアで発行可）。`provision-group.ts`は`--skip-token`
 * 指定時と、指定なしで発行が400/403で失敗したときの両方でこの案内を表示する
 */
export function buildTokenSkipGuidance(): string {
  return (
    "gitlab.com の Free プランでは Group Access Token を発行できません（Premium 以上限定）。\n" +
    `代わりに手元のトークン（ボットユーザーの個人アクセストークン、` +
    `またはスモーク用途なら手元の個人アクセストークン）を ${ACCESS_TOKEN_ENV_NAME} に設定してください。\n` +
    ".env に追記する行のひな型:\n" +
    `${ACCESS_TOKEN_ENV_NAME}=<read_api+write_repositoryスコープ以上のPAT>`
  )
}
