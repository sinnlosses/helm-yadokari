import { extractHttpStatus, isFatalError } from "../../lib/gitlab/errors.js"
import type {
  ChartAndApps,
  ChartDirName,
  ChartUpdateResult,
  ConfigUnitPath,
  ProjectId,
  ProjectName,
} from "../../types/types.js"
import { FatalError, toErrorMessage } from "../../utils/errors.js"
import { logger } from "../../utils/logger.js"

/**
 * chartAndApps 1件分の処理結果ログに共通で載せる識別情報。3つのstepが`withHandling()`から
 * 受け取り、自分の`result`/`reason`を足してログに出す。
 */
export type ChartUpdateLogContext = {
  readonly event: "update_chart"
  readonly chartDirName: ChartDirName
  readonly unitPath: ConfigUnitPath
  readonly chartProjectId: ProjectId
  readonly chartProjectName: ProjectName
}

export type StepOutcome<T> =
  | { readonly status: "ok"; readonly value: T }
  | { readonly status: "settled"; readonly result: ChartUpdateResult }

export function ok<T>(value: T): StepOutcome<T> {
  return { status: "ok", value }
}

export function settle<T>(result: ChartUpdateResult): StepOutcome<T> {
  return { status: "settled", result }
}

/**
 * アプリ単位の処理を実行し、非fatalな例外に「どのアプリで起きたか」を付けて投げ直す。
 * 致命的エラーはそのまま投げる（アプリ名を付けない）。
 */
export function withAppContext<T>(projectName: ProjectName, fn: () => Promise<T>): Promise<T> {
  return fn().catch((err: unknown) => rethrowWithAppContext(err, projectName))
}

/**
 * chartAndApps単位の並列処理1件分を実行する高階関数。捕捉した例外はこのツールのエラー方針に
 * 従って処理され、fatalなら`FatalError`として投げ直され（実行全体が止まる）、それ以外は
 * `ERROR`のsettled outcomeになる。
 *
 * 各stepでは`mapWithConcurrency()`の直下で呼び、「並列に実行する」ことと「1件ずつ失敗を
 * 封じ込める」ことがstepの入口に並んで見えるようにしている。
 */
export function withHandling<T>(
  chartAndApps: ChartAndApps,
  fn: (logContext: ChartUpdateLogContext) => Promise<StepOutcome<T>>,
): Promise<StepOutcome<T>> {
  const logContext = buildLogContext(chartAndApps)
  return fn(logContext).catch((err: unknown) => settle<T>(settleAsError(err, logContext)))
}

/**
 * アプリ単位の処理で捕捉した例外に「どのアプリで起きたか」を付け足して投げ直す。
 * オールオアナッシングで設定ユニット全体がERRORになるため、原因のアプリがログから特定できないと
 * 調査できないことへの対策。`withAppContext()`の内部実装であり、外からは直接呼ばない。
 *
 * 致命的エラー（401 / 5xx / ネットワーク障害）は**包まずにそのまま投げる**。`settleAsError()`は
 * 元の例外の構造（`cause.response.status` や `code`）を見て判定するため、`new Error(..., { cause })`
 * で包むとその構造が1段深くなり、`FatalError`に昇格できなくなるためである。この「何が致命的か」の
 * 判断を`settleAsError()`と同じファイルに置くことで、方針の変更漏れを防ぐ。
 */
function rethrowWithAppContext(err: unknown, projectName: ProjectName): never {
  if (isFatalError(err) || !(err instanceof Error)) throw err
  throw new Error(`[アプリ: ${projectName}] ${err.message}`, { cause: err })
}

/**
 * step内で捕捉した例外を、このツールのエラー方針に従って処理する。
 *
 * - 401 / 5xx / ネットワーク障害（`isFatalError()`）は全chartAndApps共通の致命的エラーなので
 *   `FatalError`として投げ直し、実行全体を即時終了させる（この関数は値を返さない）
 * - それ以外は該当chartAndAppsのみ`ERROR`として記録し、他のchartAndAppsの処理は続行する
 *
 * 方針そのものを1箇所に置くための関数。3つのstepからは直接ではなく`withHandling()`経由で呼ぶ。
 */
function settleAsError(err: unknown, logContext: ChartUpdateLogContext): "ERROR" {
  if (isFatalError(err)) throw new FatalError(extractHttpStatus(err), err)
  logger.error({
    ...logContext,
    result: "ERROR",
    reason: `httpStatus: ${extractHttpStatus(err)}, message: ${toErrorMessage(err)}`,
  })
  return "ERROR"
}

/**
 * 3つのstepすべてが同じキー・同じ値で出力するよう、ここ1箇所で組み立てる。
 */
function buildLogContext(chartAndApps: ChartAndApps): ChartUpdateLogContext {
  return {
    event: "update_chart",
    chartDirName: chartAndApps.chartDirName,
    unitPath: chartAndApps.unitPath,
    chartProjectId: chartAndApps.chart.projectId,
    chartProjectName: chartAndApps.chart.projectName,
  }
}
