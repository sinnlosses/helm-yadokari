import type {
  ChartDirName,
  ConfigUnit,
  ConfigUnitPath,
  ConfigUnitUpdateResult,
  ProjectId,
  ProjectName,
} from "../../domain/types.js"
import type { PlatformAdapter } from "../../lib/platform/adapter.js"
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

/**
 * アプリ1件分の処理結果。失敗を例外ではなく値として持つため、1回だけ実行した処理の結果を
 * 成功・失敗のどちらでも複数の設定ユニットへ配れる（例外は最初の1つにしか届かない）。
 * 設定ユニット単位の`ConfigUnitUpdateResult`を持たないのは、この失敗をどの設定ユニットの
 * ERRORにするかを決めるのが受け取った側だから。
 */
export type AppOutcome<T> =
  | { readonly status: "ok"; readonly value: T }
  | { readonly status: "failed"; readonly error: Error }

export function ok<T>(value: T): StepOutcome<T> {
  return { status: "ok", value }
}

export function settle<T>(result: ConfigUnitUpdateResult): StepOutcome<T> {
  return { status: "settled", result }
}

/**
 * アプリ単位の処理を実行し、非fatalな失敗を`AppOutcome`として返す。`withHandling()`が
 * 設定ユニット単位で行う封じ込めの、アプリ単位版にあたる。fatalなエラーは`withHandling()`と
 * 同じく`FatalError`として投げ直し、実行全体を止める。
 *
 * ログは出さない。この失敗が何件の設定ユニットのERRORになるかは受け取った側が決めるため、
 * ERRORとしての記録は`withHandling()`のまま1箇所に残す。
 */
export function settleApp<T>(
  adapter: PlatformAdapter,
  projectName: ProjectName,
  fn: () => Promise<T>,
): Promise<AppOutcome<T>> {
  return withAppContext(adapter, projectName, fn).then(
    (value): AppOutcome<T> => ({ status: "ok", value }),
    (err: unknown) => failApp<T>(adapter, err),
  )
}

/**
 * アプリ単位の処理を実行し、非fatalな例外に「どのアプリで起きたか」を付けて投げ直す。
 * 致命的エラーはそのまま投げる（アプリ名を付けない）。
 */
export function withAppContext<T>(
  adapter: PlatformAdapter,
  projectName: ProjectName,
  fn: () => Promise<T>,
): Promise<T> {
  return fn().catch((err: unknown) => rethrowWithAppContext(adapter, err, projectName))
}

/**
 * 設定ユニット単位の並列処理1件分を実行する高階関数。捕捉した例外はこのツールのエラー方針に
 * 従って処理され、fatalなら`FatalError`として投げ直され（実行全体が止まる）、それ以外は
 * `ERROR`のsettled outcomeになる。
 *
 * 各stepでは`mapWithConcurrency()`の直下で呼び、「並列に実行する」ことと「1件ずつ失敗を
 * 封じ込める」ことがstepの入口に並んで見えるようにしている。
 *
 * `adapter`を受け取るのはエラーの分類（`isFatalError`・`extractHttpStatus`）のためだけで、
 * API呼び出しはしない。gitbeakerとOctokitでは例外の形が違うので、どちらで動いているかを
 * 知っている`PlatformAdapter`に尋ねる。
 */
export function withHandling<T>(
  adapter: PlatformAdapter,
  configUnit: ConfigUnit,
  fn: (logContext: ConfigUnitLogContext) => Promise<StepOutcome<T>>,
): Promise<StepOutcome<T>> {
  const logContext = buildLogContext(configUnit)
  return fn(logContext).catch((err: unknown) => settle<T>(settleAsError(adapter, err, logContext)))
}

/**
 * `settleApp()`が捕捉した例外を`AppOutcome`に変換する。fatalかどうかの判定は`settleAsError()`と
 * 同じで、こちらは設定ユニットが決まっていないためログを出さない。`withAppContext()`が
 * 例外でない値をそのまま投げうるので、`Error`に揃えてから値にする。
 */
function failApp<T>(adapter: PlatformAdapter, err: unknown): AppOutcome<T> {
  if (adapter.isFatalError(err)) throw new FatalError(adapter.extractHttpStatus(err), err)
  return { status: "failed", error: err instanceof Error ? err : new Error(toErrorMessage(err)) }
}

/**
 * アプリ単位の処理で捕捉した例外に「どのアプリで起きたか」を付け足して投げ直す。
 * オールオアナッシングで設定ユニット全体がERRORになるため、原因のアプリがログから特定できないと
 * 調査できないことへの対策。`withAppContext()`の内部実装であり、外からは直接呼ばない。
 *
 * 致命的エラー（401 / 5xx / ネットワーク障害）は**包まずにそのまま投げる**。判定は元の例外の構造
 * （gitbeakerなら`cause.response.status`、Octokitなら`status`）を読むため、
 * `new Error(..., { cause })`で包むとその構造が1段深くなり、`FatalError`に昇格できなくなるため
 * である。この関数と`settleAsError()`が同じ`adapter.isFatalError()`に尋ねることで、
 * 包む・包まないの境目と昇格の境目がずれないようにしている。
 */
function rethrowWithAppContext(
  adapter: PlatformAdapter,
  err: unknown,
  projectName: ProjectName,
): never {
  if (adapter.isFatalError(err) || !(err instanceof Error)) throw err
  throw new Error(`[アプリ: ${projectName}] ${err.message}`, { cause: err })
}

/**
 * step内で捕捉した例外を、このツールのエラー方針に従って処理する。
 *
 * - 401 / 5xx / ネットワーク障害（`adapter.isFatalError()`）は全設定ユニット共通の致命的エラーなので
 *   `FatalError`として投げ直し、実行全体を即時終了させる（この関数は値を返さない）
 * - それ以外は該当設定ユニットのみ`ERROR`として記録し、他の設定ユニットの処理は続行する
 *
 * 方針そのものを1箇所に置くための関数。3つのstepからは直接ではなく`withHandling()`経由で呼ぶ。
 */
function settleAsError(
  adapter: PlatformAdapter,
  err: unknown,
  logContext: ConfigUnitLogContext,
): "ERROR" {
  if (adapter.isFatalError(err)) throw new FatalError(adapter.extractHttpStatus(err), err)
  logger.error({
    ...logContext,
    result: "ERROR",
    reason: `httpStatus: ${adapter.extractHttpStatus(err)}, message: ${toErrorMessage(err)}`,
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
