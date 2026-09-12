import type { Platform } from "../../lib/platform/platform.js"
import type {
  ChartDirName,
  ConfigUnit,
  ConfigUnitPath,
  ConfigUnitUpdateResult,
  ProjectId,
  ProjectName,
} from "../../types/types.js"
import { FatalError, toErrorMessage } from "../../utils/errors.js"
import { logger } from "../../utils/logger.js"

/**
 * 設定ユニット1件分の処理結果ログに共通で載せる識別情報。3つのstepが`withHandling()`から
 * 受け取り、自分の`result`/`reason`を足してログに出す。
 */
export type ConfigUnitLogContext = {
  readonly event: "update_unit"
  readonly chartDirName: ChartDirName
  readonly unitPath: ConfigUnitPath
  readonly chartProjectId: ProjectId
  readonly chartProjectName: ProjectName
}

export type StepOutcome<T> =
  | { readonly status: "ok"; readonly value: T }
  | { readonly status: "settled"; readonly result: ConfigUnitUpdateResult }

export function ok<T>(value: T): StepOutcome<T> {
  return { status: "ok", value }
}

export function settle<T>(result: ConfigUnitUpdateResult): StepOutcome<T> {
  return { status: "settled", result }
}

/**
 * アプリ単位の処理を実行し、非fatalな例外に「どのアプリで起きたか」を付けて投げ直す。
 * 致命的エラーはそのまま投げる（アプリ名を付けない）。
 */
export function withAppContext<T>(
  platform: Platform,
  projectName: ProjectName,
  fn: () => Promise<T>,
): Promise<T> {
  return fn().catch((err: unknown) => rethrowWithAppContext(platform, err, projectName))
}

/**
 * 設定ユニット単位の並列処理1件分を実行する高階関数。捕捉した例外はこのツールのエラー方針に
 * 従って処理され、fatalなら`FatalError`として投げ直され（実行全体が止まる）、それ以外は
 * `ERROR`のsettled outcomeになる。
 *
 * 各stepでは`mapWithConcurrency()`の直下で呼び、「並列に実行する」ことと「1件ずつ失敗を
 * 封じ込める」ことがstepの入口に並んで見えるようにしている。
 *
 * `platform`を受け取るのはエラーの分類（`isFatalError`・`extractHttpStatus`）のためだけで、
 * API呼び出しはしない。gitbeakerとOctokitでは例外の形が違うので、どちらで動いているかを
 * 知っている`Platform`に尋ねる。
 */
export function withHandling<T>(
  platform: Platform,
  configUnit: ConfigUnit,
  fn: (logContext: ConfigUnitLogContext) => Promise<StepOutcome<T>>,
): Promise<StepOutcome<T>> {
  const logContext = buildLogContext(configUnit)
  return fn(logContext).catch((err: unknown) => settle<T>(settleAsError(platform, err, logContext)))
}

/**
 * アプリ単位の処理で捕捉した例外に「どのアプリで起きたか」を付け足して投げ直す。
 * オールオアナッシングで設定ユニット全体がERRORになるため、原因のアプリがログから特定できないと
 * 調査できないことへの対策。`withAppContext()`の内部実装であり、外からは直接呼ばない。
 *
 * 致命的エラー（401 / 5xx / ネットワーク障害）は**包まずにそのまま投げる**。判定は元の例外の構造
 * （gitbeakerなら`cause.response.status`、Octokitなら`status`）を読むため、
 * `new Error(..., { cause })`で包むとその構造が1段深くなり、`FatalError`に昇格できなくなるため
 * である。この関数と`settleAsError()`が同じ`platform.isFatalError()`に尋ねることで、
 * 包む・包まないの境目と昇格の境目がずれないようにしている。
 */
function rethrowWithAppContext(platform: Platform, err: unknown, projectName: ProjectName): never {
  if (platform.isFatalError(err) || !(err instanceof Error)) throw err
  throw new Error(`[アプリ: ${projectName}] ${err.message}`, { cause: err })
}

/**
 * step内で捕捉した例外を、このツールのエラー方針に従って処理する。
 *
 * - 401 / 5xx / ネットワーク障害（`platform.isFatalError()`）は全設定ユニット共通の致命的エラーなので
 *   `FatalError`として投げ直し、実行全体を即時終了させる（この関数は値を返さない）
 * - それ以外は該当設定ユニットのみ`ERROR`として記録し、他の設定ユニットの処理は続行する
 *
 * 方針そのものを1箇所に置くための関数。3つのstepからは直接ではなく`withHandling()`経由で呼ぶ。
 */
function settleAsError(
  platform: Platform,
  err: unknown,
  logContext: ConfigUnitLogContext,
): "ERROR" {
  if (platform.isFatalError(err)) throw new FatalError(platform.extractHttpStatus(err), err)
  logger.error({
    ...logContext,
    result: "ERROR",
    reason: `httpStatus: ${platform.extractHttpStatus(err)}, message: ${toErrorMessage(err)}`,
  })
  return "ERROR"
}

/**
 * 3つのstepすべてが同じキー・同じ値で出力するよう、ここ1箇所で組み立てる。
 */
function buildLogContext(configUnit: ConfigUnit): ConfigUnitLogContext {
  return {
    event: "update_unit",
    chartDirName: configUnit.chartDirName,
    unitPath: configUnit.unitPath,
    chartProjectId: configUnit.chartRepo.projectId,
    chartProjectName: configUnit.chartRepo.projectName,
  }
}
