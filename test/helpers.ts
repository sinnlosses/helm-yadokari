import type { AppConfig, ChartAndApps } from "../src/types/types.js"
import {
  toAnchorName,
  toBranchName,
  toChartDirName,
  toClientId,
  toProjectId,
  toProjectName,
  toTenantId,
  toValuesPath,
} from "../src/types/types.js"

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
        anchor: toAnchorName("appVersion"),
      },
    ],
    helmTargetBranch: undefined,
    ...overrides,
  }
}

export function makeChartAndApps(
  apps: AppConfig[],
  overrides: Partial<Pick<ChartAndApps, "chartDir" | "tenantId" | "clientId">> = {},
): ChartAndApps {
  return {
    chartDir: toChartDirName("teamA-chart"),
    tenantId: toTenantId("tenantId1"),
    clientId: toClientId("clientId1"),
    chart: {
      projectId: toProjectId(100),
      projectName: toProjectName("teamA-chart"),
      mrTargetBranch: toBranchName("develop"),
    },
    apps,
    ...overrides,
  }
}
