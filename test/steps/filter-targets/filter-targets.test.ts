import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { filterTargets } from "../../../src/steps/filter-targets/filter-targets.js"
import { toChartDirName, toConfigUnitPath } from "../../../src/types/types.js"
import { FatalError } from "../../../src/utils/errors.js"
import { makeApp, makeConfigUnit, makeHttpError, makePlatform } from "../../helpers.js"

const platform = makePlatform()

describe("filterTargets", () => {
  beforeEach(() => {
    vi.mocked(platform.openMergeRequestExists).mockResolvedValue(false)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("アプリが0件の設定ユニットはsettledにSKIPPEDとして入り、targetsには含まれない", async () => {
    const group = makeConfigUnit([])
    const { targets, settled } = await filterTargets(platform, [group], 3)
    expect(targets).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("既にオープン中のMRがある設定ユニットはsettledにSKIPPEDとして入り、targetsには含まれない", async () => {
    vi.mocked(platform.openMergeRequestExists).mockResolvedValue(true)
    const group = makeConfigUnit([makeApp()])
    const { targets, settled } = await filterTargets(platform, [group], 3)
    expect(targets).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("対象の設定ユニットはtargetsに含まれ、settledは空", async () => {
    const group = makeConfigUnit([makeApp()])
    const { targets, settled } = await filterTargets(platform, [group], 3)
    expect(targets).toEqual([group])
    expect(settled).toEqual([])
  })

  it("複数の設定ユニットを判定順に振り分ける", async () => {
    const noApps = { ...makeConfigUnit([]), chartDirName: toChartDirName("no-apps") }
    const target = { ...makeConfigUnit([makeApp()]), chartDirName: toChartDirName("target") }
    const { targets, settled } = await filterTargets(platform, [noApps, target], 3)
    expect(targets).toEqual([target])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("unitPathを含むブランチでオープン中MRの有無を判定する", async () => {
    const group = makeConfigUnit([makeApp()], {
      unitPath: toConfigUnitPath("tenant1/client1"),
    })
    await filterTargets(platform, [group], 3)
    expect(platform.openMergeRequestExists).toHaveBeenCalledWith(
      group.chartRepo.projectId,
      "feature/yadokari/tenant1/client1",
    )
  })

  it("同じchartリポジトリでも異なる設定ユニットは独立して判定される（片方にオープン中MRがあっても他方はブロックしない）", async () => {
    const clientA = makeConfigUnit([makeApp()], {
      unitPath: toConfigUnitPath("tenantA/clientA"),
    })
    const clientB = makeConfigUnit([makeApp()], {
      unitPath: toConfigUnitPath("tenantB/clientB"),
    })
    vi.mocked(platform.openMergeRequestExists).mockImplementation(
      async (_projectId, branch) => branch === "feature/yadokari/tenantA/clientA",
    )
    const { targets, settled } = await filterTargets(platform, [clientA, clientB], 3)
    expect(targets).toEqual([clientB])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("401エラーのとき FatalError をスローする", async () => {
    vi.mocked(platform.openMergeRequestExists).mockRejectedValue(makeHttpError(401))
    await expect(filterTargets(platform, [makeConfigUnit([makeApp()])], 3)).rejects.toThrow(
      FatalError,
    )
  })

  it("非fatalなAPIエラーのときsettledにERRORとして入る", async () => {
    vi.mocked(platform.openMergeRequestExists).mockRejectedValue(makeHttpError(403))
    const { targets, settled } = await filterTargets(platform, [makeConfigUnit([makeApp()])], 3)
    expect(targets).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("非fatalなAPIエラーは該当設定ユニットだけをERRORにし、他の設定ユニットの処理は続行する", async () => {
    const failing = makeConfigUnit([makeApp()], {
      unitPath: toConfigUnitPath("tenantFail/clientFail"),
    })
    const ok = makeConfigUnit([makeApp()], {
      unitPath: toConfigUnitPath("tenantOk/clientOk"),
    })
    vi.mocked(platform.openMergeRequestExists).mockImplementation(async (_projectId, branch) => {
      if (branch === "feature/yadokari/tenantFail/clientFail") throw makeHttpError(403)
      return false
    })
    const { targets, settled } = await filterTargets(platform, [failing, ok], 3)
    expect(targets).toEqual([ok])
    expect(settled).toEqual(["ERROR"])
  })
})
