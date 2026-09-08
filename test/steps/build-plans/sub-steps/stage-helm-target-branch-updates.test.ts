import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/lib/gitlab/gitlab.js")
vi.mock("../../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import { branchExists, getFileContent } from "../../../../src/lib/gitlab/gitlab.js"
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
  makeChartAndApps,
  mockBuildPlansGitlab,
  mockGitlab,
  newBatchCache,
} from "../../../helpers.js"

describe("buildPlans（Helmの向き先ブランチ）", () => {
  beforeEach(() => {
    mockBuildPlansGitlab()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("helmTargetBranchが現在値と異なるとき、helmTargetBranchUpdateに含めて書き換える", async () => {
    const app = makeApp()
    const helmTargetBranch = {
      branchName: toBranchName("release/2026-q1"),
      targets: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    const { toApply } = await buildPlans(
      mockGitlab,
      newBatchCache(),
      [makeChartAndApps([app], { helmTargetBranch })],
      3,
      false,
    )
    expect(toApply[0]?.helmTargetBranchUpdates).toEqual([
      {
        target: { valuesPath: "values.yaml", anchorName: "targetBranch" },
        previousBranch: "release/2025-q4",
        newBranch: "release/2026-q1",
      },
    ])
    expect(toApply[0]?.files[0]?.content).toContain("&targetBranch release/2026-q1")
  })

  it("helmTargetBranchが現在値と同じで、chart側も差分が無いとき、そのアプリはSKIPPEDになる", async () => {
    const app = makeApp()
    const helmTargetBranch = {
      branchName: toBranchName("release/2026-q1"),
      targets: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2026-q1\n`,
    )
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      newBatchCache(),
      [makeChartAndApps([app], { helmTargetBranch })],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("chart側の差分は無くhelmTargetBranchのみ差分があるとき、アプリの計画は作らずMR対象にする", async () => {
    const app = makeApp()
    const helmTargetBranch = {
      branchName: toBranchName("release/2026-q1"),
      targets: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    const { toApply } = await buildPlans(
      mockGitlab,
      newBatchCache(),
      [makeChartAndApps([app], { helmTargetBranch })],
      3,
      false,
    )
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.plans).toEqual([])
    expect(toApply[0]?.helmTargetBranchUpdates).toHaveLength(1)
  })

  it("指定した向き先ブランチがchartリポジトリに存在しないとき、そのchartAndApps全体をERRORにする", async () => {
    const app = makeApp()
    const helmTargetBranch = {
      branchName: toBranchName("release/2026-q1"),
      targets: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    vi.mocked(branchExists).mockResolvedValue(false)
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      newBatchCache(),
      [makeChartAndApps([app], { helmTargetBranch })],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("向き先ブランチの存在確認は、chartリポジトリのprojectIdに対して行う", async () => {
    const app = makeApp()
    const helmTargetBranch = {
      branchName: toBranchName("release/2026-q1"),
      targets: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    const group = makeChartAndApps([app], { helmTargetBranch })
    await buildPlans(mockGitlab, newBatchCache(), [group], 3, false)
    expect(branchExists).toHaveBeenCalledWith(mockGitlab, group.chart.projectId, "release/2026-q1")
  })

  it("向き先ブランチが見つからないときのエラーメッセージにブランチ名、valuesPath、anchorが含まれる", async () => {
    const helmTargetBranch = {
      branchName: toBranchName("release/2026-q1"),
      targets: [
        {
          valuesPath: toValuesPath("helm/values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    vi.mocked(branchExists).mockResolvedValue(false)
    await buildPlans(
      mockGitlab,
      newBatchCache(),
      [makeChartAndApps([makeApp()], { helmTargetBranch })],
      3,
      false,
    )
    expect(vi.mocked(logger.error)).toHaveBeenCalled()
    const errorCall = vi.mocked(logger.error).mock.calls[0]?.[0]
    expect(errorCall?.reason).toContain("release/2026-q1")
    expect(errorCall?.reason).toContain("helm/values.yaml")
    expect(errorCall?.reason).toContain("targetBranch")
  })

  it("同じchart.projectId・同じブランチ名の向き先ブランチ確認は、複数chartAndAppsにまたがってもGitLab APIへの問い合わせを1回にまとめる", async () => {
    const helmTargetBranch = {
      branchName: toBranchName("release/2026-q1"),
      targets: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("targetBranch"),
        },
      ],
    }
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    // 同じchartディレクトリ配下の別tenant/client（chart.projectIdは既定値で共通）
    const groupA = makeChartAndApps([makeApp()], {
      unitPath: toConfigUnitPath("tenant1/clientA"),
      helmTargetBranch,
    })
    const groupB = makeChartAndApps([makeApp()], {
      unitPath: toConfigUnitPath("tenant1/clientB"),
      helmTargetBranch,
    })
    await buildPlans(mockGitlab, newBatchCache(), [groupA, groupB], 3, false)
    expect(branchExists).toHaveBeenCalledTimes(1)
  })
})
