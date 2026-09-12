import { existsSync, statSync } from "node:fs"

import { parseConfigUnitPath } from "../domain/config-unit.js"
import type {
  AccessToken,
  ChartDirName,
  ConfigRootPath,
  ConfigUnitPath,
  PlatformUrl,
} from "../types/types.js"
import { toAccessToken, toChartDirName, toConfigRootPath, toPlatformUrl } from "../types/types.js"
import { DEFAULT_CONFIG_ROOT_PATH } from "./config/config.js"

export function loadEnv(key: string): string {
  const value = process.env[key]
  if (!value?.trim()) throw new Error(`環境変数 ${key} が未設定です`)
  return value
}

export function loadOptionalEnv(key: string): string | undefined {
  const value = process.env[key]
  return value?.trim() ? value : undefined
}

/** URLとしての検証は`toPlatformUrl()`が行う。ここは環境変数名をメッセージに載せるだけ */
export function validateGitlabUrl(raw: string): PlatformUrl {
  return toPlatformUrl(raw, "GITLAB_URL")
}

/**
 * CONFIG_ROOT_PATH は `loadConfig()`（`lib/config/config.ts`）が読む設定ディレクトリの
 * ルートパス（`<configRootPath>/<chartディレクトリ>/registry.yaml` という2階層固定の構成を
 * 走査する起点）。`config.yaml` があるディレクトリ（設定ユニットのディレクトリ）と紛れないよう、
 * フィールド名・変数名は `config/` の最上位だと分かる `configRootPath` を使う。
 *
 * パストラバーサル検証は`toConfigRootPath()`が行う。ディレクトリとして実在することは
 * そちらでは見ないのでここで検証する。無いままだと後段の`listSubdirectories()`が
 * 生の`ENOENT`を投げるだけで、どの環境変数が原因か分からないため。
 */
export function parseConfigRootPath(raw: string | undefined): ConfigRootPath {
  const configRootPath = toConfigRootPath(raw ?? DEFAULT_CONFIG_ROOT_PATH)
  if (!existsSync(configRootPath) || !statSync(configRootPath).isDirectory()) {
    throw new Error(`CONFIG_ROOT_PATH で指定されたディレクトリが存在しません: "${configRootPath}"`)
  }
  return configRootPath
}

export function parseConcurrencyLimit(raw: string | undefined): number {
  const value = Number(raw ?? "3")
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new Error(`CONCURRENCY_LIMIT は 1〜20 の整数である必要があります: "${raw}"`)
  }
  return value
}

/** TARGET_CHART は config/ 直下のディレクトリ名をそのまま`ChartDirName`に変換する（形式検証はなし） */
export function parseTargetChart(raw: string | undefined): ChartDirName | undefined {
  return raw === undefined ? undefined : toChartDirName(raw)
}

/**
 * TARGET_UNITS は `unitPath`（`config/<chartディレクトリ>/` からの深さ1〜2の相対パス）を
 * カンマ区切りで複数指定できる。config/ のディレクトリ階層に
 * 対応する設定ユニットを、1変数でまとめて渡すため。
 */
export function parseTargetUnits(raw: string | undefined): readonly ConfigUnitPath[] | undefined {
  if (raw === undefined) return undefined
  return raw.split(",").map((entry) => parseTargetUnitEntry(entry.trim()))
}

/**
 * 環境変数から読み取った実行時設定。`loadEnvConfig()`だけが生成する。`platformUrl`と
 * 名付けているのは、対応プラットフォームの選択（`PLATFORM`）に応じて`GITLAB_URL`/
 * `GITHUB_URL`のどちらかを読む配線を見込んでいるため（現時点では`GITLAB_URL`のみ読む）
 */
export type EnvConfig = {
  readonly platformUrl: PlatformUrl
  readonly accessToken: AccessToken
  readonly configRootPath: ConfigRootPath
  readonly concurrencyLimit: number
  readonly dryRun: boolean
  readonly targetChart: ChartDirName | undefined
  readonly targetUnits: readonly ConfigUnitPath[] | undefined
}

/**
 * 全環境変数を読んで検証する。未設定・不正な値があればここで例外を投げる。
 *
 * モジュールのトップレベルではなく関数にしてあるのは、`process.env`に触れるのを
 * 呼び出した瞬間だけに限定するため。トップレベルの定数にすると、このファイルを
 * import しただけで（＝環境変数を必要としない`pnpm lint:validate-config`や、
 * 各テストからも）検証が走ってしまう。`parseConfigRootPath()`のディレクトリ存在チェック
 * （ファイルシステムへのアクセス）も同じ理由でここでしか走らせない。
 */
export function loadEnvConfig(): EnvConfig {
  return {
    platformUrl: validateGitlabUrl(loadEnv("GITLAB_URL")),
    accessToken: toAccessToken(loadEnv("ACCESS_TOKEN")),
    configRootPath: parseConfigRootPath(loadOptionalEnv("CONFIG_ROOT_PATH")),
    concurrencyLimit: parseConcurrencyLimit(loadOptionalEnv("CONCURRENCY_LIMIT")),
    dryRun: loadOptionalEnv("DRY_RUN") === "true",
    targetChart: parseTargetChart(loadOptionalEnv("TARGET_CHART")),
    targetUnits: parseTargetUnits(loadOptionalEnv("TARGET_UNITS")),
  }
}

function parseTargetUnitEntry(entry: string): ConfigUnitPath {
  const unit = parseConfigUnitPath(entry)
  if (unit === undefined) {
    throw new Error(
      `TARGET_UNITS は設定ユニットのディレクトリのパス（"<ユニット名>" や ` +
        `"<第1セグメント>/<第2セグメント>" のような深さ1〜2の相対パス）で指定してください: "${entry}"`,
    )
  }
  return unit
}
