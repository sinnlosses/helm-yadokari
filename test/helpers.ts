import { vi } from "vitest"

import { validateTagFormat } from "../src/domain/tag-format.js"
import { extractHttpStatus, isFatalError } from "../src/lib/gitlab/errors.js"
import type { GitlabClient } from "../src/lib/gitlab/gitlab.js"
import type { PlatformAdapter } from "../src/lib/platform/adapter.js"
import type { PlatformBatchCache } from "../src/lib/platform/batch-cache.js"
import { createPlatformBatchCache } from "../src/lib/platform/batch-cache.js"
import type { AppConfig, AppUpdatePlan, ConfigUnit, TagName } from "../src/types/types.js"
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
 * `main.test.ts`のように`lib/gitlab/gitlab.js`ごとモックする層のテストでのみ使う
 * （`createClient`の戻り値の置き換え先）。`steps/`のテストは`PlatformAdapter`を直接偽装する
 * `makeAdapter()`を使うため、`GitlabClient`を組み立てる必要が無い。
 */
export const mockGitlab = {} as unknown as GitlabClient

/**
 * `steps/`のテストが受け取る`PlatformAdapter`の偽物。API呼び出しの13関数を`vi.fn()`にした状態で返すため、
 * 各テストは`vi.mocked(adapter.X)`でその場ごとに返り値・実装を差し替えられる。
 * `overrides`は個別の関数を丸ごと差し替えたいとき（稀）に使う。
 *
 * エラー分類の2関数だけは`vi.fn()`にせずGitLab版の実物を入れる。`makeHttpError()`が組み立てるのが
 * gitbeaker形のエラーで、`steps/`のテストが確かめたいのは「401はFatalError、403はERROR」という
 * 振り分けそのものだからである。
 */
export function makeAdapter(overrides: Partial<PlatformAdapter> = {}): PlatformAdapter {
  return {
    listTags: vi.fn(),
    branchExists: vi.fn(),
    deleteBranch: vi.fn(),
    getBranchHeadSha: vi.fn(),
    getFileContent: vi.fn(),
    openMergeRequestExists: vi.fn(),
    commitFileUpdates: vi.fn(),
    createMergeRequest: vi.fn(),
    createTag: vi.fn(),
    getProjectWebUrl: vi.fn(),
    getLatestPipelineForRef: vi.fn(),
    buildTagUrl: vi.fn(),
    buildCompareUrl: vi.fn(),
    isFatalError,
    extractHttpStatus,
    ...overrides,
  }
}

/**
 * `buildPlans()`等に渡すバッチキャッシュ。中身は本物で、包む対象の`adapter`だけが偽物になる。
 * 呼び出しごとに作り直すのは、キャッシュした結果が別のテストへ持ち越されないようにするため。
 */
export const newPlatformCache = (adapter: PlatformAdapter): PlatformBatchCache =>
  createPlatformBatchCache(adapter)

/** テストのapp（`makeApp()`）のタグ形式。実際に使われている2形式のうちの1つ */
const BUILD_AT_FORMAT = validateTagFormat("{branch}-build-at-{date}-{time}")

export const OLD_TAG = "main-build-at-20251231-000000"
export const NEW_TAG = toTagName("main-build-at-20260101-000000")
export const HEAD_SHA = toCommitSha("head-sha")

/**
 * `buildPlans()`を通すテストの既定のモック。追跡ブランチのHEADに`NEW_TAG`があり、values.yamlの
 * 現在値が`OLD_TAG`（＝差分1件が出る）状態にする。個別のテストは必要なものだけ上書きする。
 */
export function mockBuildPlansAdapter(adapter: PlatformAdapter): void {
  vi.mocked(adapter.listTags).mockResolvedValue([{ name: NEW_TAG, commitSha: HEAD_SHA }])
  vi.mocked(adapter.getBranchHeadSha).mockResolvedValue(HEAD_SHA)
  vi.mocked(adapter.getFileContent).mockResolvedValue(`variables:\n  - &appVersion ${OLD_TAG}\n`)
  vi.mocked(adapter.getLatestPipelineForRef).mockResolvedValue(undefined)
  vi.mocked(adapter.createTag).mockResolvedValue(undefined)
  vi.mocked(adapter.branchExists).mockResolvedValue(true)
}

export function makeApp(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    projectId: toProjectId("1"),
    projectName: toProjectName("my-app"),
    branchToSync: toBranchName("main"),
    tagFormat: BUILD_AT_FORMAT,
    imageTagLocations: [
      {
        valuesPath: toValuesPath("values.yaml"),
        anchorName: toAnchorName("appVersion"),
      },
    ],
    ...overrides,
  }
}

export function makeConfigUnit(
  apps: AppConfig[],
  overrides: Partial<Pick<ConfigUnit, "chartDirName" | "unitPath" | "helm">> = {},
): ConfigUnit {
  return {
    chartDirName: toChartDirName("teamA-chart"),
    unitPath: toConfigUnitPath("tenant1/client1"),
    chartRepo: {
      projectId: toProjectId("100"),
      projectName: toProjectName("teamA-chart"),
      mrTargetBranch: toBranchName("develop"),
    },
    apps,
    // 既定は書き込み先が空＝向き先ブランチの更新が1件も積まれない状態。向き先ブランチそのものを
    // 検証するテストだけが`locations`を持つ値で上書きする
    helm: { branchRef: toBranchName("release/2026-q1"), locations: [] },
    ...overrides,
  }
}

export function makePlan(
  overrides: Partial<{
    currentTag: TagName
    projectName: string
    updates: AppUpdatePlan["updates"]
  }> = {},
): AppUpdatePlan {
  const currentTag = overrides.currentTag ?? toTagName("main-build-at-20251231-000000")
  return {
    app: makeApp({
      projectId: toProjectId("1"),
      projectName: toProjectName(overrides.projectName ?? "my-app"),
    }),
    latestTag: {
      name: toTagName("main-build-at-20260101-000000"),
      branchName: toBranchName("main"),
      taggedAt: new Date(Date.UTC(2026, 0, 1)),
    },
    updates: overrides.updates ?? [
      {
        location: {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("appVersion"),
        },
        currentTag,
      },
    ],
  }
}
