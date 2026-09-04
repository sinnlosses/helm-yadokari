import type { AppConfig, ChartAndApps } from "../src/types.js"
import {
  toBranchName,
  toChartDirName,
  toDotPath,
  toProjectId,
  toProjectName,
  toValuesPath,
} from "../src/types.js"

export const makeHttpError = (status: number): Error =>
  new Error("HTTP Error", { cause: { response: { status } } })

export function makeApp(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    projectId: toProjectId(1),
    projectName: toProjectName("my-app"),
    branchToSync: toBranchName("main"),
    chart: [{ valuesPath: toValuesPath("values.yaml"), imageTagKey: toDotPath("image.tag") }],
    ...overrides,
  }
}

export function makeChartAndApps(apps: AppConfig[]): ChartAndApps {
  return {
    chartDir: toChartDirName("teamA-chart"),
    chart: {
      projectId: toProjectId(100),
      projectName: toProjectName("teamA-chart"),
      mrTargetBranch: toBranchName("develop"),
    },
    apps,
  }
}
