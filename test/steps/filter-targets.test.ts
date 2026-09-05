import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/lib/gitlab/gitlab.js")
vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import type { GitlabClient } from "../../src/lib/gitlab/gitlab.js"
import { openMergeRequestExists } from "../../src/lib/gitlab/gitlab.js"
import { filterTargets } from "../../src/steps/filter-targets.js"
import { toChartDirName } from "../../src/types.js"
import { FatalError } from "../../src/utils/errors.js"
import { makeApp, makeChartAndApps, makeHttpError } from "../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

describe("filterTargets", () => {
  beforeEach(() => {
    vi.mocked(openMergeRequestExists).mockResolvedValue(false)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("アプリが0件のchartAndAppsはsettledにSKIPPEDとして入り、targetsには含まれない", async () => {
    const group = makeChartAndApps([])
    const { targets, settled } = await filterTargets(mockGitlab, [group], 3)
    expect(targets).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("既にオープン中のMRがあるchartAndAppsはsettledにSKIPPEDとして入り、targetsには含まれない", async () => {
    vi.mocked(openMergeRequestExists).mockResolvedValue(true)
    const group = makeChartAndApps([makeApp()])
    const { targets, settled } = await filterTargets(mockGitlab, [group], 3)
    expect(targets).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("対象のchartAndAppsはtargetsに含まれ、settledは空", async () => {
    const group = makeChartAndApps([makeApp()])
    const { targets, settled } = await filterTargets(mockGitlab, [group], 3)
    expect(targets).toEqual([group])
    expect(settled).toEqual([])
  })

  it("複数chartAndAppsを判定順に振り分ける", async () => {
    const noApps = { ...makeChartAndApps([]), chartDir: toChartDirName("no-apps") }
    const target = { ...makeChartAndApps([makeApp()]), chartDir: toChartDirName("target") }
    const { targets, settled } = await filterTargets(mockGitlab, [noApps, target], 3)
    expect(targets).toEqual([target])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("401エラーのとき FatalError をスローする", async () => {
    vi.mocked(openMergeRequestExists).mockRejectedValue(makeHttpError(401))
    await expect(filterTargets(mockGitlab, [makeChartAndApps([makeApp()])], 3)).rejects.toThrow(
      FatalError,
    )
  })

  it("非fatalなAPIエラーのときsettledにERRORとして入る", async () => {
    vi.mocked(openMergeRequestExists).mockRejectedValue(makeHttpError(403))
    const { targets, settled } = await filterTargets(mockGitlab, [makeChartAndApps([makeApp()])], 3)
    expect(targets).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })
})
