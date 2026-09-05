import type { AppConfig, ChartAndApps } from "../src/types.js"
import {
  toAnchorName,
  toBranchName,
  toChartDirName,
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
    chart: [
      {
        valuesPath: toValuesPath("values.yaml"),
        imageTagAnchor: toAnchorName("appVersion"),
        helmBranchAnchor: undefined,
      },
    ],
    helmTargetBranch: undefined,
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
