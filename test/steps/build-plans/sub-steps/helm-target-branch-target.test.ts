import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/lib/gitlab/gitlab.js")
vi.mock("../../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import type { GitlabClient } from "../../../../src/lib/gitlab/gitlab.js"
import {
  branchExists,
  createTag,
  getBranchHeadSha,
  getFileContent,
  getLatestPipelineForRef,
  listTags,
} from "../../../../src/lib/gitlab/gitlab.js"
import { DEFAULT_TAG_FORMAT } from "../../../../src/lib/tag-format.js"
import { buildPlans } from "../../../../src/steps/build-plans/build-plans.js"
import {
  toAnchorName,
  toBranchName,
  toClientId,
  toCommitSha,
  toProjectName,
  toTagName,
  toValuesPath,
} from "../../../../src/types/types.js"
import { logger } from "../../../../src/utils/logger.js"
import { makeApp, makeChartAndApps } from "../../../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

const OLD_TAG = "main-build-at-20251231-000000"
const NEW_TAG = toTagName("main-build-at-20260101-000000")
const HEAD_SHA = toCommitSha("head-sha")

describe("buildPlans（Helmの向き先ブランチ）", () => {
  beforeEach(() => {
    vi.mocked(listTags).mockResolvedValue([{ name: NEW_TAG, commitSha: HEAD_SHA }])
    vi.mocked(getBranchHeadSha).mockResolvedValue(HEAD_SHA)
    vi.mocked(getFileContent).mockResolvedValue(`variables:\n  - &appVersion ${OLD_TAG}\n`)
    vi.mocked(getLatestPipelineForRef).mockResolvedValue(undefined)
    vi.mocked(createTag).mockResolvedValue(undefined)
    vi.mocked(branchExists).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("helmTargetBranchが現在値と異なるとき、helmTargetBranchUpdateに含めて書き換える", async () => {
    const app = makeApp({
      helmTargetBranch: {
        branchName: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("values.yaml"),
            anchorName: toAnchorName("targetBranch"),
          },
        ],
      },
    })
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    const { toApply } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([app])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply[0]?.plans[0]?.helmTargetBranchUpdates).toEqual([
      {
        target: { valuesPath: "values.yaml", anchorName: "targetBranch" },
        previousBranch: "release/2025-q4",
        newBranch: "release/2026-q1",
      },
    ])
    expect(toApply[0]?.files[0]?.content).toContain("&targetBranch release/2026-q1")
  })

  it("helmTargetBranchが現在値と同じで、chart側も差分が無いとき、そのアプリはSKIPPEDになる", async () => {
    const app = makeApp({
      helmTargetBranch: {
        branchName: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("values.yaml"),
            anchorName: toAnchorName("targetBranch"),
          },
        ],
      },
    })
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2026-q1\n`,
    )
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([app])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("chart側の差分は無くhelmTargetBranchのみ差分があるとき、そのアプリの計画を作成する", async () => {
    const app = makeApp({
      helmTargetBranch: {
        branchName: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("values.yaml"),
            anchorName: toAnchorName("targetBranch"),
          },
        ],
      },
    })
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    const { toApply } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([app])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.plans[0]?.updates).toEqual([])
    expect(toApply[0]?.plans[0]?.helmTargetBranchUpdates).toHaveLength(1)
  })

  it("指定した向き先ブランチがchartリポジトリに存在しないとき、そのchartAndApps全体をERRORにする", async () => {
    const app = makeApp({
      helmTargetBranch: {
        branchName: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("values.yaml"),
            anchorName: toAnchorName("targetBranch"),
          },
        ],
      },
    })
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    vi.mocked(branchExists).mockResolvedValue(false)
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([app])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("向き先ブランチの存在確認は、chartリポジトリのprojectIdに対して行う", async () => {
    const app = makeApp({
      helmTargetBranch: {
        branchName: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("values.yaml"),
            anchorName: toAnchorName("targetBranch"),
          },
        ],
      },
    })
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    const group = makeChartAndApps([app])
    await buildPlans(mockGitlab, [group], 3, false, DEFAULT_TAG_FORMAT)
    expect(branchExists).toHaveBeenCalledWith(mockGitlab, group.chart.projectId, "release/2026-q1")
  })

  it("向き先ブランチが見つからないときのエラーメッセージにアプリ名、valuesPath、anchorが含まれる", async () => {
    const app = makeApp({
      projectName: toProjectName("my-test-app"),
      helmTargetBranch: {
        branchName: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("helm/values.yaml"),
            anchorName: toAnchorName("targetBranch"),
          },
        ],
      },
    })
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appVersion ${NEW_TAG}\n  - &targetBranch release/2025-q4\n`,
    )
    vi.mocked(branchExists).mockResolvedValue(false)
    await buildPlans(mockGitlab, [makeChartAndApps([app])], 3, false, DEFAULT_TAG_FORMAT)
    expect(vi.mocked(logger.error)).toHaveBeenCalled()
    const errorCall = vi.mocked(logger.error).mock.calls[0]?.[0]
    expect(errorCall?.reason).toContain("my-test-app")
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
    const groupA = makeChartAndApps([makeApp({ helmTargetBranch })], {
      clientId: toClientId("clientA"),
    })
    const groupB = makeChartAndApps([makeApp({ helmTargetBranch })], {
      clientId: toClientId("clientB"),
    })
    await buildPlans(mockGitlab, [groupA, groupB], 3, false, DEFAULT_TAG_FORMAT)
    expect(branchExists).toHaveBeenCalledTimes(1)
  })
})
