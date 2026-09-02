import type { ChartGroup } from "../types.js"

/**
 * chartグループに関するログ出力で共通して使う文脈情報を組み立てる。
 * filter-targets / build-plans / apply-updates の各ステップで共通して使う。
 */
export function chartLogContext(chartGroup: ChartGroup): Record<string, unknown> {
  return {
    event: "update_chart",
    chartDir: chartGroup.chartDir,
    chartProjectId: chartGroup.chart.projectId,
    chartProjectName: chartGroup.chart.projectName,
  }
}
