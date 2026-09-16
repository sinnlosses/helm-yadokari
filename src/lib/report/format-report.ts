import type { ConfigUnitReport, ConfigUnitUpdateResult } from "../../domain/types.js"

/**
 * レポートのヘッダに載せる、`reports`本体とは別に持ち回る実行時メタ情報。
 * `counts`は呼び出し側が集計済みの値をそのまま渡す。
 */
export type ReportMeta = {
  readonly startedAt: Date
  readonly durationMs: number
  readonly dryRun: boolean
  readonly counts: Record<ConfigUnitUpdateResult, number>
}

/**
 * バッチ1回分の実行結果をMarkdown1枚に整形する。ヘッダに実行時刻・所要時間・dryRun・
 * 件数サマリを、本体に設定ユニット1件につき1行の表（chart / unit / 結果 / 理由）を持つ。
 */
export function formatReport(meta: ReportMeta, reports: readonly ConfigUnitReport[]): string {
  return [buildHeader(meta), "", buildTable(reports)].join("\n")
}

function buildHeader(meta: ReportMeta): string {
  const { counts } = meta
  return [
    "# yadokari 実行レポート",
    "",
    `- 実行時刻: ${meta.startedAt.toISOString()}`,
    `- 所要時間: ${meta.durationMs}ms`,
    `- dryRun: ${meta.dryRun}`,
    `- 件数: CREATED ${counts.CREATED} / SKIPPED ${counts.SKIPPED} / ERROR ${counts.ERROR}`,
  ].join("\n")
}

function buildTable(reports: readonly ConfigUnitReport[]): string {
  return [
    "| chart | unit | 結果 | 理由 |",
    "| --- | --- | --- | --- |",
    ...reports.map((report) => {
      const cells = [report.chartDirName, report.unitPath, report.result, report.reason ?? "-"]
      return `| ${cells.map(toTableCell).join(" | ")} |`
    }),
  ].join("\n")
}

/**
 * 表のセル1つ分に収める。ERRORの`reason`は捕捉した例外のメッセージそのもので、`|`や改行を
 * 含みうる（そのまま入れると表が崩れて後続の行まで読めなくなる）。
 */
function toTableCell(value: string): string {
  return value.replace(/\r?\n/g, " ").replaceAll("|", "\\|")
}
