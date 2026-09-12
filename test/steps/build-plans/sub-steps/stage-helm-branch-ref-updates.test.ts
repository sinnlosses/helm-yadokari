import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { buildPlans } from "../../../../src/steps/build-plans/build-plans.js"
import {
  toAnchorName,
  toBranchName,
  toConfigUnitPath,
  toValuesPath,
} from "../../../../src/types/types.js"
import { logger } from "../../../../src/utils/logger.js"
import {
  NEW_TAG,
  makeApp,
  makeConfigUnit,
  makePlatform,
  mockBuildPlansPlatform,
  newPlatformCache,
} from "../../../helpers.js"

const platform = makePlatform()

describe("buildPlans（Helmの向き先ブランチ）", () => {
  beforeEach(() => {
    mockBuildPlansPlatform(platform)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("helmが現在値と異なるとき、helmBranchRefUpdateに含めて書き換える", async () => {
    const app = makeApp()
    const helm = {
      branchRef: toBranchName("release/2026-q1"),
      locations: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(platform.getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    const { toApply } = await buildPlans(
      platform,
      newPlatformCache(platform),
      [makeConfigUnit([app], { helm })],
      3,
      false,
    )
    expect(toApply[0]?.helmBranchRefUpdates).toEqual([
      {
        location: { valuesPath: "values.yaml", anchorName: "targetBranch" },
        currentBranch: "release/2025-q4",
      },
    ])
    expect(toApply[0]?.files[0]?.content).toContain("&targetBranch release/2026-q1")
  })

  it("helmが現在値と同じで、chart側も差分が無いとき、そのアプリはSKIPPEDになる", async () => {
    const app = makeApp()
    const helm = {
      branchRef: toBranchName("release/2026-q1"),
      locations: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(platform.getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2026-q1\n`,
    )
    const { toApply, settled } = await buildPlans(
      platform,
      newPlatformCache(platform),
      [makeConfigUnit([app], { helm })],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("chart側の差分は無くhelmのみ差分があるとき、アプリの計画は作らずMR対象にする", async () => {
    const app = makeApp()
    const helm = {
      branchRef: toBranchName("release/2026-q1"),
      locations: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(platform.getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    const { toApply } = await buildPlans(
      platform,
      newPlatformCache(platform),
      [makeConfigUnit([app], { helm })],
      3,
      false,
    )
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.plans).toEqual([])
    expect(toApply[0]?.helmBranchRefUpdates).toHaveLength(1)
  })

  it("指定した向き先ブランチがchartリポジトリに存在しないとき、その設定ユニット全体をERRORにする", async () => {
    const app = makeApp()
    const helm = {
      branchRef: toBranchName("release/2026-q1"),
      locations: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(platform.getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    vi.mocked(platform.branchExists).mockResolvedValue(false)
    const { toApply, settled } = await buildPlans(
      platform,
      newPlatformCache(platform),
      [makeConfigUnit([app], { helm })],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("向き先ブランチの存在確認は、chartリポジトリのprojectIdに対して行う", async () => {
    const app = makeApp()
    const helm = {
      branchRef: toBranchName("release/2026-q1"),
      locations: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(platform.getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    const group = makeConfigUnit([app], { helm })
    await buildPlans(platform, newPlatformCache(platform), [group], 3, false)
    expect(platform.branchExists).toHaveBeenCalledWith(group.chartRepo.projectId, "release/2026-q1")
  })

  it("向き先ブランチが見つからないときのエラーメッセージにブランチ名、valuesPath、anchorが含まれる", async () => {
    const helm = {
      branchRef: toBranchName("release/2026-q1"),
      locations: [
        {
          valuesPath: toValuesPath("helm/values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(platform.getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    vi.mocked(platform.branchExists).mockResolvedValue(false)
    await buildPlans(
      platform,
      newPlatformCache(platform),
      [makeConfigUnit([makeApp()], { helm })],
      3,
      false,
    )
    expect(vi.mocked(logger.error)).toHaveBeenCalled()
    const errorCall = vi.mocked(logger.error).mock.calls[0]?.[0]
    expect(errorCall?.reason).toContain("release/2026-q1")
    expect(errorCall?.reason).toContain("helm/values.yaml")
    expect(errorCall?.reason).toContain("targetBranch")
  })

  it("同じchartRepo.projectId・同じブランチ名の向き先ブランチ確認は、複数の設定ユニットにまたがってもGitLab APIへの問い合わせを1回にまとめる", async () => {
    const helm = {
      branchRef: toBranchName("release/2026-q1"),
      locations: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(platform.getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    // 同じchartディレクトリ配下の別tenant/client（chart.projectIdは既定値で共通）
    const groupA = makeConfigUnit([makeApp()], {
      unitPath: toConfigUnitPath("tenant1/clientA"),
      helm,
    })
    const groupB = makeConfigUnit([makeApp()], {
      unitPath: toConfigUnitPath("tenant1/clientB"),
      helm,
    })
    await buildPlans(platform, newPlatformCache(platform), [groupA, groupB], 3, false)
    expect(platform.branchExists).toHaveBeenCalledTimes(1)
  })
})
