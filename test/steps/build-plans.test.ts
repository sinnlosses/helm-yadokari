import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/steps/update-plan.js")
vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import type { GitlabClient } from "../../src/lib/gitlab.js"
import { buildPlans } from "../../src/steps/build-plans.js"
import { buildChartUpdate } from "../../src/steps/update-plan.js"
import { toBranchName, toTagName } from "../../src/types.js"
import { FatalError } from "../../src/utils/errors.js"
import { makeApp, makeChartGroup, makeHttpError } from "../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

const NEW_TAG = {
  name: toTagName("main-build-at-20260101-000000"),
  branch: toBranchName("main"),
  builtAt: new Date("2026-01-01T00:00:00Z"),
}

function makePlan(overrides: Partial<{ previousTag: string }> = {}) {
  return {
    app: makeApp(),
    previousTag: overrides.previousTag ? toTagName(overrides.previousTag) : undefined,
    latestTag: NEW_TAG,
    pipelineUrl: undefined,
    pipelineStatus: undefined,
  }
}

describe("buildPlans", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("差分があるchartグループはtoApplyに含まれる", async () => {
    vi.mocked(buildChartUpdate).mockResolvedValue({
      plans: [makePlan()],
      files: [{ filePath: "values.yaml", content: "image:\n  tag: x\n" }],
    })
    const group = makeChartGroup([makeApp()])
    const { toApply, settled } = await buildPlans(mockGitlab, [group], 3, false)
    expect(toApply).toEqual([
      {
        chartGroup: group,
        plans: [makePlan()],
        files: [{ filePath: "values.yaml", content: "image:\n  tag: x\n" }],
      },
    ])
    expect(settled).toEqual([])
  })

  it("差分がないchartグループはsettledにSKIPPEDとして入る", async () => {
    vi.mocked(buildChartUpdate).mockResolvedValue({ plans: [], files: [] })
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartGroup([makeApp()])],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("差分があってもdryRunのときはsettledにSKIPPEDとして入り、toApplyには含まれない", async () => {
    vi.mocked(buildChartUpdate).mockResolvedValue({
      plans: [makePlan()],
      files: [{ filePath: "values.yaml", content: "x" }],
    })
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartGroup([makeApp()])],
      3,
      true,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("401エラーのとき FatalError をスローする", async () => {
    vi.mocked(buildChartUpdate).mockRejectedValue(makeHttpError(401))
    await expect(buildPlans(mockGitlab, [makeChartGroup([makeApp()])], 3, false)).rejects.toThrow(
      FatalError,
    )
  })

  it("非fatalなエラーのときsettledにERRORとして入る", async () => {
    vi.mocked(buildChartUpdate).mockRejectedValue(new Error("boom"))
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartGroup([makeApp()])],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })
})
