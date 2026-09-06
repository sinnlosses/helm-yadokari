import type {
  AppConfig,
  AppUpdatePlan,
  ChartAndApps,
  PipelineInfo,
  TagName,
} from "../src/types/types.js"
import {
  toAnchorName,
  toBranchName,
  toChartDirName,
  toClientId,
  toProjectId,
  toProjectName,
  toTagName,
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
    imageTagTargets: [
      {
        valuesPath: toValuesPath("values.yaml"),
        anchorName: toAnchorName("appVersion"),
      },
    ],
    helmTargetBranch: undefined,
    ...overrides,
  }
}

export function makeChartAndApps(
  apps: AppConfig[],
  overrides: Partial<Pick<ChartAndApps, "chartDirName" | "tenantId" | "clientId">> = {},
): ChartAndApps {
  return {
    chartDirName: toChartDirName("teamA-chart"),
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

export function makePlan(
  overrides: Partial<{
    pipeline: PipelineInfo
    previousTagName: TagName | undefined
    projectName: string
    updates: AppUpdatePlan["updates"]
    helmTargetBranchUpdates: AppUpdatePlan["helmTargetBranchUpdates"]
  }> = {},
): AppUpdatePlan {
  const previousTagName =
    "previousTagName" in overrides
      ? overrides.previousTagName
      : toTagName("main-build-at-20251231-000000")
  return {
    app: makeApp({
      projectId: toProjectId(1),
      projectName: toProjectName(overrides.projectName ?? "my-app"),
    }),
    latestTag: {
      name: toTagName("main-build-at-20260101-000000"),
      branchName: toBranchName("main"),
      builtAt: new Date("2026-01-01T00:00:00Z"),
    },
    pipeline: overrides.pipeline,
    updates: overrides.updates ?? [
      {
        target: {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("appVersion"),
        },
        previousTagName,
      },
    ],
    helmTargetBranchUpdates: overrides.helmTargetBranchUpdates ?? [],
  }
}
