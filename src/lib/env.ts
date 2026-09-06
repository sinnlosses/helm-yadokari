import type { ChartDirName, GitLabUrl, TagFormat, TargetClient } from "../types/types.js"
import { toChartDirName, toClientId, toGitLabUrl, toTenantId } from "../types/types.js"
import { DEFAULT_TAG_FORMAT, validateTagFormat } from "./tag-format.js"

export function loadEnv(key: string): string {
  const value = process.env[key]
  if (!value?.trim()) throw new Error(`環境変数 ${key} が未設定です`)
  return value
}

export function loadOptionalEnv(key: string): string | undefined {
  const value = process.env[key]
  return value?.trim() ? value : undefined
}

/** URLとしての検証は`toGitLabUrl()`が行う。ここは環境変数名をメッセージに載せるだけ */
export function validateGitlabUrl(raw: string): GitLabUrl {
  return toGitLabUrl(raw, "GITLAB_URL")
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
 * ロジックはタグ命名規則の本体である `lib/tag-format.ts` 側に持たせ、ここでは
 * 未指定時のデフォルト適用のみ行う。
 */
export function parseTagFormat(raw: string | undefined): TagFormat {
  return validateTagFormat(raw ?? DEFAULT_TAG_FORMAT)
}

/** TARGET_CHART は config/ 直下のディレクトリ名をそのまま`ChartDirName`に変換する（形式検証はなし） */
export function parseTargetChart(raw: string | undefined): ChartDirName | undefined {
  return raw === undefined ? undefined : toChartDirName(raw)
}

function parseTargetClientEntry(entry: string): TargetClient {
  const parts = entry.split("/")
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`TARGET_CLIENTS は "<tenantId>/<clientId>" 形式で指定してください: "${entry}"`)
  }
  return { tenantId: toTenantId(parts[0]), clientId: toClientId(parts[1]) }
}

/**
 * TARGET_CLIENTS は `<tenantId>/<clientId>` 形式の組をカンマ区切りで複数指定できる
 * （例: "tenantId1/clientId1,tenantId2/clientId2"）。config/ のディレクトリ階層
 * `<chartDir>/<tenantId>/<clientId>/` に対応する2値の組を、1変数でまとめて渡すため。
 */
export function parseTargetClients(raw: string | undefined): readonly TargetClient[] | undefined {
  if (raw === undefined) return undefined
  return raw.split(",").map((entry) => parseTargetClientEntry(entry.trim()))
}

/** 環境変数から読み取った実行時設定。`loadEnvConfig()`だけが生成する */
export type EnvConfig = {
  readonly gitlabUrl: GitLabUrl
  readonly accessToken: string
  readonly configPath: string | undefined
  readonly concurrencyLimit: number
  readonly dryRun: boolean
  readonly targetChart: ChartDirName | undefined
  readonly targetClients: readonly TargetClient[] | undefined
  readonly tagFormat: TagFormat
}

/**
 * 全環境変数を読んで検証する。未設定・不正な値があればここで例外を投げる。
 *
 * モジュールのトップレベルではなく関数にしてあるのは、`process.env`に触れるのを
 * 呼び出した瞬間だけに限定するため。トップレベルの定数にすると、このファイルを
 * import しただけで（＝環境変数を必要としない`pnpm lint:validate-config`や、
 * 各テストからも）検証が走ってしまう。
 */
export function loadEnvConfig(): EnvConfig {
  return {
    gitlabUrl: validateGitlabUrl(loadEnv("GITLAB_URL")),
    accessToken: loadEnv("ACCESS_TOKEN"),
    configPath: loadOptionalEnv("CONFIG_PATH"),
    concurrencyLimit: parseConcurrencyLimit(loadOptionalEnv("CONCURRENCY_LIMIT")),
    dryRun: loadOptionalEnv("DRY_RUN") === "true",
    targetChart: parseTargetChart(loadOptionalEnv("TARGET_CHART")),
    targetClients: parseTargetClients(loadOptionalEnv("TARGET_CLIENTS")),
    tagFormat: parseTagFormat(loadOptionalEnv("TAG_FORMAT")),
  }
}
