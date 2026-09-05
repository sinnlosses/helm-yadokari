import type { GitLabUrl, TagFormat, TargetClient } from "../types.js"
import { toGitLabUrl } from "../types.js"
import { DEFAULT_TAG_FORMAT, validateTagFormat } from "./gitlab/tag.js"

export function loadEnv(key: string): string {
  const value = process.env[key]
  if (!value?.trim()) throw new Error(`環境変数 ${key} が未設定です`)
  return value
}

export function loadOptionalEnv(key: string): string | undefined {
  const value = process.env[key]
  return value?.trim() ? value : undefined
}

export function validateGitlabUrl(raw: string): GitLabUrl {
  if (!URL.canParse(raw)) {
    throw new Error(`GITLAB_URL が有効な URL ではありません: "${raw}"`)
  }
  const { protocol } = new URL(raw)
  if (protocol !== "https:" && protocol !== "http:") {
    throw new Error(`GITLAB_URL は http:// または https:// で始まる必要があります: "${raw}"`)
  }
  return toGitLabUrl(raw)
}

export function parseConcurrencyLimit(raw: string | undefined): number {
  const value = Number(raw ?? "3")
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new Error(`CONCURRENCY_LIMIT は 1〜20 の整数である必要があります: "${raw}"`)
  }
  return value
}

/**
 * TAG_FORMAT は `{branch}`/`{date}`/`{time}` プレースホルダをちょうど1回ずつ含む
 * テンプレート文字列（未指定時は `DEFAULT_TAG_FORMAT`）。プレースホルダの検証・置換の
 * ロジックはタグ命名規則の本体である `lib/gitlab/tag.ts` 側に持たせ、ここでは
 * 未指定時のデフォルト適用のみ行う。
 */
export function parseTagFormat(raw: string | undefined): TagFormat {
  return validateTagFormat(raw ?? DEFAULT_TAG_FORMAT)
}

function parseTargetClientEntry(entry: string): TargetClient {
  const parts = entry.split("/")
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`TARGET_CLIENT は "<tenantId>/<clientId>" 形式で指定してください: "${entry}"`)
  }
  return { tenantId: parts[0], clientId: parts[1] }
}

/**
 * TARGET_CLIENT は `<tenantId>/<clientId>` 形式の組をカンマ区切りで複数指定できる
 * （例: "tenantId1/clientId1,tenantId2/clientId2"）。config/ のディレクトリ階層
 * `<chartDir>/<tenantId>/<clientId>/` に対応する2値の組を、1変数でまとめて渡すため。
 */
export function parseTargetClients(raw: string | undefined): readonly TargetClient[] | undefined {
  if (raw === undefined) return undefined
  return raw.split(",").map((entry) => parseTargetClientEntry(entry.trim()))
}

export const GITLAB_URL = validateGitlabUrl(loadEnv("GITLAB_URL"))
export const ACCESS_TOKEN = loadEnv("ACCESS_TOKEN")
export const CONFIG_PATH = loadOptionalEnv("CONFIG_PATH")
export const CONCURRENCY_LIMIT = parseConcurrencyLimit(loadOptionalEnv("CONCURRENCY_LIMIT"))
export const DRY_RUN = loadOptionalEnv("DRY_RUN") === "true"
export const TARGET_CHART_DIR = loadOptionalEnv("TARGET_CHART_DIR")
export const TARGET_CLIENT = parseTargetClients(loadOptionalEnv("TARGET_CLIENT"))
export const TAG_FORMAT = parseTagFormat(loadOptionalEnv("TAG_FORMAT"))
