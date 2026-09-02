import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/lib/gitlab.js")
vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import type { GitlabClient } from "../../src/lib/gitlab.js"
import { openMergeRequestExists } from "../../src/lib/gitlab.js"
import { filterTargets } from "../../src/steps/filter-targets.js"
import { FatalError } from "../../src/utils/errors.js"
import { makeApp, makeChartGroup, makeHttpError } from "../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

describe("filterTargets", () => {
  beforeEach(() => {
    vi.mocked(openMergeRequestExists).mockResolvedValue(false)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("アプリが0件のchartグループはsettledにSKIPPEDとして入り、targetsには含まれない", async () => {
    const group = makeChartGroup([])
    const { targets, settled } = await filterTargets(mockGitlab, [group], 3)
    expect(targets).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("既にオープン中のMRがあるchartグループはsettledにSKIPPEDとして入り、targetsには含まれない", async () => {
    vi.mocked(openMergeRequestExists).mockResolvedValue(true)
    const group = makeChartGroup([makeApp()])
    const { targets, settled } = await filterTargets(mockGitlab, [group], 3)
    expect(targets).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("対象のchartグループはtargetsに含まれ、settledは空", async () => {
    const group = makeChartGroup([makeApp()])
    const { targets, settled } = await filterTargets(mockGitlab, [group], 3)
    expect(targets).toEqual([group])
    expect(settled).toEqual([])
  })

  it("複数chartグループを判定順に振り分ける", async () => {
    const noApps = { ...makeChartGroup([]), chartDir: "no-apps" }
    const target = { ...makeChartGroup([makeApp()]), chartDir: "target" }
    const { targets, settled } = await filterTargets(mockGitlab, [noApps, target], 3)
    expect(targets).toEqual([target])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("401エラーのとき FatalError をスローする", async () => {
    vi.mocked(openMergeRequestExists).mockRejectedValue(makeHttpError(401))
    await expect(filterTargets(mockGitlab, [makeChartGroup([makeApp()])], 3)).rejects.toThrow(
      FatalError,
    )
  })

  it("非fatalなAPIエラーのときsettledにERRORとして入る", async () => {
    vi.mocked(openMergeRequestExists).mockRejectedValue(makeHttpError(403))
    const { targets, settled } = await filterTargets(mockGitlab, [makeChartGroup([makeApp()])], 3)
    expect(targets).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })
})
