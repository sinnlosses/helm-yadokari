import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/steps/chart-update.js")

import type { GitlabClient } from "../../src/lib/gitlab.js"
import { updateChartGroupIfNeeded } from "../../src/steps/chart-update.js"
import { updateChartGroups } from "../../src/steps/update-chart-groups.js"
import { FatalError } from "../../src/utils/errors.js"
import { makeApp, makeChartGroup, makeHttpError } from "../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

describe("updateChartGroups", () => {
  beforeEach(() => {
    vi.mocked(updateChartGroupIfNeeded).mockResolvedValue("CREATED")
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("chartGroupsが空のとき空配列を返す", async () => {
    expect(await updateChartGroups(mockGitlab, [], 3, false)).toEqual([])
  })

  it("各chartGroupの結果を、入力順を保った配列で返す", async () => {
    vi.mocked(updateChartGroupIfNeeded).mockImplementation(async (_gitlab, chartGroup) =>
      chartGroup.chartDir === "chart-b" ? "SKIPPED" : "CREATED",
    )
    const groups = [
      { ...makeChartGroup([makeApp()]), chartDir: "chart-a" },
      { ...makeChartGroup([makeApp()]), chartDir: "chart-b" },
    ]
    expect(await updateChartGroups(mockGitlab, groups, 3, false)).toEqual(["CREATED", "SKIPPED"])
  })

  it("全chartGroupに対してdryRunを引き渡す", async () => {
    await updateChartGroups(mockGitlab, [makeChartGroup([makeApp()])], 3, true)
    expect(updateChartGroupIfNeeded).toHaveBeenCalledWith(mockGitlab, expect.anything(), true)
  })

  it("concurrencyLimitを超えて同時実行しない", async () => {
    let active = 0
    let maxActive = 0
    vi.mocked(updateChartGroupIfNeeded).mockImplementation(async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active--
      return "CREATED"
    })
    const groups = Array.from({ length: 6 }, (_, i) => ({
      ...makeChartGroup([makeApp()]),
      chartDir: `chart-${i}`,
    }))
    await updateChartGroups(mockGitlab, groups, 2, false)
    expect(maxActive).toBeLessThanOrEqual(2)
  })

  it("FatalErrorが発生したとき reject する", async () => {
    vi.mocked(updateChartGroupIfNeeded).mockRejectedValue(new FatalError(401, makeHttpError(401)))
    await expect(
      updateChartGroups(mockGitlab, [makeChartGroup([makeApp()])], 3, false),
    ).rejects.toThrow(FatalError)
  })

  it("FatalErrorが発生した後、未着手のタスクは実行しない", async () => {
    vi.mocked(updateChartGroupIfNeeded).mockImplementation(async (_gitlab, chartGroup) => {
      if (chartGroup.chartDir === "chart-0") {
        throw new FatalError(401, makeHttpError(401))
      }
      await new Promise((resolve) => setTimeout(resolve, 5))
      return "CREATED"
    })
    const groups = Array.from({ length: 5 }, (_, i) => ({
      ...makeChartGroup([makeApp()]),
      chartDir: `chart-${i}`,
    }))
    await expect(updateChartGroups(mockGitlab, groups, 1, false)).rejects.toThrow(FatalError)
    // concurrencyLimit=1のため、1件目でFatalErrorが起きた時点でキューがクリアされ、
    // 後続の4件は実行されない（呼び出しは1回だけ）。
    expect(updateChartGroupIfNeeded).toHaveBeenCalledTimes(1)
  })
})
