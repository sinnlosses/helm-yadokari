import type { AppConfig, ChartGroup } from "../src/types.js"
import { toBranchName, toDotPath, toProjectId, toProjectName, toValuesPath } from "../src/types.js"

export const makeHttpError = (status: number): Error =>
  new Error("HTTP Error", { cause: { response: { status } } })

export function makeApp(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    projectId: toProjectId(1),
    projectName: toProjectName("my-app"),
    branchToSync: toBranchName("main"),
    chart: { valuesPath: toValuesPath("values.yaml"), imageTagKey: toDotPath("image.tag") },
    ...overrides,
  }
}

export function makeChartGroup(apps: AppConfig[]): ChartGroup {
  return {
    chartDir: "teamA-chart",
    chart: {
      projectId: toProjectId(100),
      projectName: toProjectName("teamA-chart"),
      mrTargetBranch: toBranchName("develop"),
    },
    apps,
  }
}
