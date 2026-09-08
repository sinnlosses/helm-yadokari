import { vi } from "vitest"

import { DEFAULT_TAG_TEMPLATE } from "../src/domain/tag-format.js"
import type { GitlabBatchCache } from "../src/lib/gitlab/batch-cache.js"
import { createGitlabBatchCache } from "../src/lib/gitlab/batch-cache.js"
import type { GitlabClient } from "../src/lib/gitlab/gitlab.js"
import {
  branchExists,
  createTag,
  getBranchHeadSha,
  getFileContent,
  getLatestPipelineForRef,
  listTags,
} from "../src/lib/gitlab/gitlab.js"
import type { AppConfig, AppUpdatePlan, ChartAndApps, TagName } from "../src/types/types.js"
import {
  toAnchorName,
  toBranchName,
  toChartDirName,
  toCommitSha,
  toConfigUnitPath,
  toProjectId,
  toProjectName,
  toTagName,
  toValuesPath,
} from "../src/types/types.js"

export const makeHttpError = (status: number): Error =>
  new Error("HTTP Error", { cause: { response: { status } } })

/**
 * `vi.mock()`でモックしたGitLabクライアントの置き換え先。実体は使われないため空オブジェクトで
 * 足りる。`as`を使う箇所をここ1つに閉じ込めるためテスト側では組み立てない。
 */
export const mockGitlab = {} as unknown as GitlabClient

/**
 * `buildPlans()`に渡すバッチキャッシュ。中身は本物で、包む対象の`gitlab.js`だけがモックに
 * なる。呼び出しごとに作り直すのは、キャッシュした結果が別のテストへ持ち越されないようにするため。
 */
export const newBatchCache = (): GitlabBatchCache => createGitlabBatchCache(mockGitlab)

export const OLD_TAG = "main-build-at-20251231-000000"
export const NEW_TAG = toTagName("main-build-at-20260101-000000")
export const HEAD_SHA = toCommitSha("head-sha")

/**
 * `buildPlans()`を通すテストの既定のモック。追跡ブランチのHEADに`NEW_TAG`があり、values.yamlの
 * 現在値が`OLD_TAG`（＝差分1件が出る）状態にする。個別のテストは必要なものだけ上書きする。
 */
export function mockBuildPlansGitlab(): void {
  vi.mocked(listTags).mockResolvedValue([{ name: NEW_TAG, commitSha: HEAD_SHA }])
  vi.mocked(getBranchHeadSha).mockResolvedValue(HEAD_SHA)
  vi.mocked(getFileContent).mockResolvedValue(`variables:\n  - &appVersion ${OLD_TAG}\n`)
  vi.mocked(getLatestPipelineForRef).mockResolvedValue(undefined)
  vi.mocked(createTag).mockResolvedValue(undefined)
  vi.mocked(branchExists).mockResolvedValue(true)
}

export function makeApp(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    projectId: toProjectId(1),
    projectName: toProjectName("my-app"),
    branchToSync: toBranchName("main"),
    tagNaming: { mode: "template", template: DEFAULT_TAG_TEMPLATE },
    imageTagTargets: [
      {
        valuesPath: toValuesPath("values.yaml"),
        anchorName: toAnchorName("appVersion"),
      },
    ],
    ...overrides,
  }
}

export function makeChartAndApps(
  apps: AppConfig[],
  overrides: Partial<Pick<ChartAndApps, "chartDirName" | "unitPath" | "helmTargetBranch">> = {},
): ChartAndApps {
  return {
    chartDirName: toChartDirName("teamA-chart"),
    unitPath: toConfigUnitPath("tenant1/client1"),
    chart: {
      projectId: toProjectId(100),
      projectName: toProjectName("teamA-chart"),
      mrTargetBranch: toBranchName("develop"),
    },
    apps,
    helmTargetBranch: undefined,
    ...overrides,
  }
}

export function makePlan(
  overrides: Partial<{
    previousTagName: TagName
    projectName: string
    updates: AppUpdatePlan["updates"]
  }> = {},
): AppUpdatePlan {
  const previousTagName = overrides.previousTagName ?? toTagName("main-build-at-20251231-000000")
  return {
    app: makeApp({
      projectId: toProjectId(1),
      projectName: toProjectName(overrides.projectName ?? "my-app"),
    }),
    latestTag: {
      name: toTagName("main-build-at-20260101-000000"),
      branchName: toBranchName("main"),
      orderKey: [Date.UTC(2026, 0, 1)],
    },
    updates: overrides.updates ?? [
      {
        target: {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("appVersion"),
        },
        previousTagName,
      },
    ],
  }
}
