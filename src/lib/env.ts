import { existsSync, statSync } from "node:fs"

import { parseClientRef } from "../domain/client-ref.js"
import { DEFAULT_TAG_FORMAT, validateTagFormat } from "../domain/tag-format.js"
import type {
  AccessToken,
  ChartDirName,
  GitLabUrl,
  TagFormat,
  TargetClient,
} from "../types/types.js"
import { toAccessToken, toChartDirName, toGitLabUrl } from "../types/types.js"
import { assertSafePath } from "../utils/fs.js"
import { DEFAULT_CONFIG_DIR_PATH } from "./config/config.js"

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

/**
 * CONFIG_PATH は `loadConfig()`（`lib/config/config.ts`）が読む設定ディレクトリの
 * ルートパス（`<configDirPath>/<chartディレクトリ>/chart.yaml` という2階層固定の構成を
 * 走査する起点）。単一ファイルではなくディレクトリを指すため、フィールド名・変数名は
 * 常に「ディレクトリ」であることが分かる `configDirPath` を使う（`CONFIG_PATH`という
 * 環境変数名自体は外部インターフェースのため変えない）。
 *
 * パストラバーサル検証（`assertSafePath`）は `loadConfig()` 内にもある。`loadConfig()` は
 * `scripts/lint/validate-config.ts` からコマンドライン引数のパスで直接呼ばれる経路もあり、
 * そちらの検証は消せないため、環境変数由来の値はここでも検証する（`loadConfig()`経由で
 * 2重に検証が走るが、副作用のない同じ関数を2回呼ぶだけなので実害はない）。
 *
 * ディレクトリとして実在することもここで検証する。無いままだと後段の`listSubdirectories()`が
 * 生の`ENOENT`を投げるだけで、どの環境変数が原因か分からないため。
 */
export function parseConfigDirPath(raw: string | undefined): string {
  const configDirPath = raw ?? DEFAULT_CONFIG_DIR_PATH
  assertSafePath(configDirPath, "CONFIG_PATH")
  if (!existsSync(configDirPath) || !statSync(configDirPath).isDirectory()) {
    throw new Error(`CONFIG_PATH で指定されたディレクトリが存在しません: "${configDirPath}"`)
  }
  return configDirPath
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
 * ロジックはタグ命名規則の本体である `domain/tag-format.ts` 側に持たせ、ここでは
 * 未指定時のデフォルト適用のみ行う。
 */
export function parseTagFormat(raw: string | undefined): TagFormat {
  return validateTagFormat(raw ?? DEFAULT_TAG_FORMAT)
}

/** TARGET_CHART は config/ 直下のディレクトリ名をそのまま`ChartDirName`に変換する（形式検証はなし） */
export function parseTargetChart(raw: string | undefined): ChartDirName | undefined {
  return raw === undefined ? undefined : toChartDirName(raw)
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
  readonly accessToken: AccessToken
  readonly configDirPath: string
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
 * 各テストからも）検証が走ってしまう。`parseConfigDirPath()`のディレクトリ存在チェック
 * （ファイルシステムへのアクセス）も同じ理由でここでしか走らせない。
 */
export function loadEnvConfig(): EnvConfig {
  return {
    gitlabUrl: validateGitlabUrl(loadEnv("GITLAB_URL")),
    accessToken: toAccessToken(loadEnv("ACCESS_TOKEN")),
    configDirPath: parseConfigDirPath(loadOptionalEnv("CONFIG_PATH")),
    concurrencyLimit: parseConcurrencyLimit(loadOptionalEnv("CONCURRENCY_LIMIT")),
    dryRun: loadOptionalEnv("DRY_RUN") === "true",
    targetChart: parseTargetChart(loadOptionalEnv("TARGET_CHART")),
    targetClients: parseTargetClients(loadOptionalEnv("TARGET_CLIENTS")),
    tagFormat: parseTagFormat(loadOptionalEnv("TAG_FORMAT")),
  }
}

function parseTargetClientEntry(entry: string): TargetClient {
  const client = parseClientRef(entry)
  if (client === undefined) {
    throw new Error(`TARGET_CLIENTS は "<tenantId>/<clientId>" 形式で指定してください: "${entry}"`)
  }
  return client
}
