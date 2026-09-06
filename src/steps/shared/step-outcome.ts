import type { AppUpdatePlan, ChartAndApps, ProjectName } from "../../types/types.js"
import { FatalError } from "../../utils/errors.js"
import { extractHttpStatus, isFatalError, toErrorMessage } from "../../utils/http.js"
import { logger } from "../../utils/logger.js"

// 3つのstep（filter-targets / build-plans / apply-updates）が共通で使う、
// 「chartAndApps 1件の処理結果をどう記録し、失敗をどう扱うか」だけを置く。
// 特定の技術・外部システムには依存しない（ドメイン型にのみ依存する）ため lib/ には置かず、
// 「複数のstepから呼ばれる」ため特定stepの sub-steps/ にも置かない。

/**
 * chartAndApps 1件分の処理結果ログに共通で載せる識別情報。3つのstepすべてが
 * 同じキー・同じ値で出力するよう、ここ1箇所で組み立てる。
 */
export function buildLogContext(chartAndApps: ChartAndApps): Record<string, unknown> {
  return {
    event: "update_chart",
    chartDir: chartAndApps.chartDir,
    tenantId: chartAndApps.tenantId,
    clientId: chartAndApps.clientId,
    chartProjectId: chartAndApps.chart.projectId,
    chartProjectName: chartAndApps.chart.projectName,
  }
}

/** 1アプリ分の更新計画を、ログ用のサマリに変換する（dryRun時とMR作成時の両方で使う） */
export function describePlan(plan: AppUpdatePlan): Record<string, unknown> {
  return {
    projectName: plan.app.projectName,
    latestTag: plan.latestTag.name,
    updates: plan.updates.map((update) => ({
      valuesPath: update.target.valuesPath,
      previousTag: update.previousTag,
    })),
    helmTargetBranchUpdates: plan.helmTargetBranchUpdates.map((update) => ({
      valuesPath: update.target.valuesPath,
      previousBranch: update.previousBranch,
      newBranch: update.newBranch,
    })),
  }
}

/**
 * アプリ単位の処理で捕捉した例外に「どのアプリで起きたか」を付け足して投げ直す。
 * オールオアナッシングでclient全体がERRORになるため、原因のアプリがログから特定できないと
 * 調査できないことへの対策。
 *
 * 致命的エラー（401 / 5xx / ネットワーク障害）は**包まずにそのまま投げる**。`settleAsError()`は
 * 元の例外の構造（`cause.response.status` や `code`）を見て判定するため、`new Error(..., { cause })`
 * で包むとその構造が1段深くなり、`FatalError`に昇格できなくなるためである。この「何が致命的か」の
 * 判断を`settleAsError()`と同じファイルに置くことで、方針の変更漏れを防ぐ。
 */
export function rethrowWithAppContext(err: unknown, projectName: ProjectName): never {
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
 * 方針そのものを1箇所に置くための関数なので、3つのstepのcatch節はこれを呼ぶだけにする。
 */
export function settleAsError(err: unknown, logContext: Record<string, unknown>): "ERROR" {
  if (isFatalError(err)) throw new FatalError(extractHttpStatus(err), err)
  logger.error({
    ...logContext,
    result: "ERROR",
    reason: `httpStatus: ${extractHttpStatus(err)}, message: ${toErrorMessage(err)}`,
  })
  return "ERROR"
}
