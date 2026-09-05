import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/lib/gitlab/gitlab.js")
vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import type { GitlabClient } from "../../src/lib/gitlab/gitlab.js"
import {
  buildMrDescription,
  buildMrTitle,
  commitFileUpdates,
  createMergeRequest,
} from "../../src/lib/gitlab/gitlab.js"
import { applyUpdates } from "../../src/steps/apply-updates.js"
import type { ChartUpdateTarget } from "../../src/types.js"
import { toAnchorName, toBranchName, toTagName, toValuesPath } from "../../src/types.js"
import { FatalError } from "../../src/utils/errors.js"
import { makeApp, makeChartAndApps, makeHttpError } from "../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

const NEW_TAG = {
  name: toTagName("main-build-at-20260101-000000"),
  branch: toBranchName("main"),
  builtAt: new Date("2026-01-01T00:00:00Z"),
}

function makeTarget(): ChartUpdateTarget {
  return {
    chartAndApps: makeChartAndApps([makeApp()]),
    plans: [
      {
        app: makeApp(),
        latestTag: NEW_TAG,
        pipeline: undefined,
        updates: [
          {
            target: {
              valuesPath: toValuesPath("values.yaml"),
              anchor: toAnchorName("appVersion"),
            },
            previousTag: undefined,
          },
        ],
        helmTargetBranchUpdates: [],
      },
    ],
    files: [{ filePath: toValuesPath("values.yaml"), content: "image:\n  tag: x\n" }],
  }
}

describe("applyUpdates", () => {
  beforeEach(() => {
    vi.mocked(commitFileUpdates).mockResolvedValue(undefined)
    vi.mocked(createMergeRequest).mockResolvedValue(undefined)
    vi.mocked(buildMrTitle).mockReturnValue("Auto MR by yadokari: update 1 app image tag(s)")
    vi.mocked(buildMrDescription).mockResolvedValue("### my-app\n...")
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("成功したとき 'CREATED' を返す", async () => {
    expect(await applyUpdates(mockGitlab, [makeTarget()], 3)).toEqual(["CREATED"])
    expect(commitFileUpdates).toHaveBeenCalledOnce()
    expect(createMergeRequest).toHaveBeenCalledOnce()
  })

  it("buildMrTitle/buildMrDescriptionの結果をコミット・MR作成に渡す", async () => {
    const target = makeTarget()
    await applyUpdates(mockGitlab, [target], 3)
    expect(buildMrTitle).toHaveBeenCalledWith(target.plans)
    expect(buildMrDescription).toHaveBeenCalledWith(mockGitlab, target.plans)
    expect(vi.mocked(commitFileUpdates).mock.calls[0]?.[4]).toBe(
      "Auto MR by yadokari: update 1 app image tag(s)",
    )
    expect(vi.mocked(createMergeRequest).mock.calls[0]?.[4]).toBe(
      "Auto MR by yadokari: update 1 app image tag(s)",
    )
    expect(vi.mocked(createMergeRequest).mock.calls[0]?.[5]).toBe("### my-app\n...")
  })

  it("固定ブランチ名でコミット・MRを作成する", async () => {
    await applyUpdates(mockGitlab, [makeTarget()], 3)
    expect(vi.mocked(commitFileUpdates).mock.calls[0]?.[2]).toBe("yadokari/update")
    expect(vi.mocked(createMergeRequest).mock.calls[0]?.[2]).toBe("yadokari/update")
  })

  it("mrTargetBranch をベースブランチ・MR作成先として使う", async () => {
    const target = makeTarget()
    await applyUpdates(mockGitlab, [target], 3)
    expect(vi.mocked(commitFileUpdates).mock.calls[0]?.[3]).toBe(
      target.chartAndApps.chart.mrTargetBranch,
    )
    expect(vi.mocked(createMergeRequest).mock.calls[0]?.[3]).toBe(
      target.chartAndApps.chart.mrTargetBranch,
    )
  })

  it("401エラーのとき FatalError をスローする", async () => {
    vi.mocked(commitFileUpdates).mockRejectedValue(makeHttpError(401))
    await expect(applyUpdates(mockGitlab, [makeTarget()], 3)).rejects.toThrow(FatalError)
  })

  it("非fatalなエラーのとき 'ERROR' を返す", async () => {
    vi.mocked(commitFileUpdates).mockRejectedValue(makeHttpError(403))
    expect(await applyUpdates(mockGitlab, [makeTarget()], 3)).toEqual(["ERROR"])
  })

  it("複数targetの結果を入力順を保った配列で返す", async () => {
    vi.mocked(commitFileUpdates)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(makeHttpError(403))
    expect(await applyUpdates(mockGitlab, [makeTarget(), makeTarget()], 3)).toEqual([
      "CREATED",
      "ERROR",
    ])
  })
})
