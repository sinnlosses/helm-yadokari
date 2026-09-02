import { describe, expect, it } from "vitest"

import { chartLogContext } from "../../src/lib/log-context.js"
import { makeApp, makeChartGroup } from "../helpers.js"

describe("chartLogContext", () => {
  it("event / chartDir / chartProjectId / chartProjectName を含む", () => {
    const chartGroup = makeChartGroup([makeApp()])
    expect(chartLogContext(chartGroup)).toEqual({
      event: "update_chart",
      chartDir: chartGroup.chartDir,
      chartProjectId: chartGroup.chart.projectId,
      chartProjectName: chartGroup.chart.projectName,
    })
  })
})
