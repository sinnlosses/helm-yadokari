import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../src/steps/apply-updates/sub-steps/build-mr-content.js")
vi.mock("../../../src/steps/apply-updates/sub-steps/collect-mr-entries.js")
vi.mock("../../../src/steps/apply-updates/sub-steps/submit-merge-request.js")
vi.mock("../../../src/domain/feature-branch.js")
vi.mock("../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { buildFeatureBranch } from "../../../src/domain/feature-branch.js"
import { applyUpdates } from "../../../src/steps/apply-updates/apply-updates.js"
import { buildMrContent } from "../../../src/steps/apply-updates/sub-steps/build-mr-content.js"
import { collectMrEntries } from "../../../src/steps/apply-updates/sub-steps/collect-mr-entries.js"
import type { MrEntries } from "../../../src/steps/apply-updates/sub-steps/shared/types.js"
import { submitMergeRequest } from "../../../src/steps/apply-updates/sub-steps/submit-merge-request.js"
import type { ConfigUnitUpdateTarget } from "../../../src/types/types.js"
import { toAnchorName, toBranchName, toTagName, toValuesPath } from "../../../src/types/types.js"
import { FatalError } from "../../../src/utils/errors.js"
import { makeApp, makeConfigUnit, makeHttpError, mockGitlab, newBatchCache } from "../../helpers.js"

const MR_ENTRIES: MrEntries = { imageTags: [], helmBranches: [] }

const MR_CONTENT = {
  title: "Auto MR by yadokari: update tenant1/client1 1 app image tag(s)",
  description: "### my-app\n...",
}

const NEW_TAG = {
  name: toTagName("main-build-at-20260101-000000"),
  branchName: toBranchName("main"),
  builtAt: new Date(Date.UTC(2026, 0, 1)),
}

function makeTarget(): ConfigUnitUpdateTarget {
  return {
    configUnit: makeConfigUnit([makeApp()]),
    plans: [
      {
        app: makeApp(),
        latestTag: NEW_TAG,
        updates: [
          {
            location: {
              valuesPath: toValuesPath("values.yaml"),
              anchorName: toAnchorName("appVersion"),
            },
            previousTagName: toTagName("prev"),
          },
        ],
      },
    ],
    helmTargetBranchUpdates: [],
    files: [{ valuesPath: toValuesPath("values.yaml"), content: "image:\n  tag: x\n" }],
  }
}

describe("applyUpdates", () => {
  beforeEach(() => {
    vi.mocked(submitMergeRequest).mockResolvedValue(undefined)
    vi.mocked(collectMrEntries).mockResolvedValue(MR_ENTRIES)
    vi.mocked(buildMrContent).mockReturnValue(MR_CONTENT)
    vi.mocked(buildFeatureBranch).mockReturnValue(toBranchName("feature/yadokari/tenant1/client1"))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("成功したとき 'CREATED' を返す", async () => {
    expect(await applyUpdates(mockGitlab, newBatchCache(), [makeTarget()], 3)).toEqual(["CREATED"])
    expect(submitMergeRequest).toHaveBeenCalledOnce()
  })

  it("collectMrEntriesの結果からbuildMrContentを呼び、その結果をMR送信に渡す", async () => {
    const target = makeTarget()
    await applyUpdates(mockGitlab, newBatchCache(), [target], 3)
    expect(collectMrEntries).toHaveBeenCalledWith(
      expect.anything(),
      target.plans,
      target.helmTargetBranchUpdates,
    )
    expect(buildMrContent).toHaveBeenCalledWith(target.configUnit.unitPath, MR_ENTRIES)
    expect(vi.mocked(submitMergeRequest).mock.calls[0]?.[3]).toBe(MR_CONTENT)
  })

  it("unitPathを含む固定ブランチ名でMRを送る", async () => {
    await applyUpdates(mockGitlab, newBatchCache(), [makeTarget()], 3)
    expect(vi.mocked(submitMergeRequest).mock.calls[0]?.[2]).toBe(
      "feature/yadokari/tenant1/client1",
    )
  })

  it("設定ユニットのchartRepo設定と書き換え済みファイルをそのまま渡す", async () => {
    const target = makeTarget()
    await applyUpdates(mockGitlab, newBatchCache(), [target], 3)
    expect(vi.mocked(submitMergeRequest).mock.calls[0]?.[1]).toBe(target.configUnit.chartRepo)
    expect(vi.mocked(submitMergeRequest).mock.calls[0]?.[4]).toBe(target.files)
  })

  it("401エラーのとき FatalError をスローする", async () => {
    vi.mocked(submitMergeRequest).mockRejectedValue(makeHttpError(401))
    await expect(applyUpdates(mockGitlab, newBatchCache(), [makeTarget()], 3)).rejects.toThrow(
      FatalError,
    )
  })

  it("非fatalなエラーのとき 'ERROR' を返す", async () => {
    vi.mocked(submitMergeRequest).mockRejectedValue(makeHttpError(403))
    expect(await applyUpdates(mockGitlab, newBatchCache(), [makeTarget()], 3)).toEqual(["ERROR"])
  })

  it("複数targetの結果を入力順を保った配列で返す", async () => {
    vi.mocked(submitMergeRequest)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(makeHttpError(403))
    expect(
      await applyUpdates(mockGitlab, newBatchCache(), [makeTarget(), makeTarget()], 3),
    ).toEqual(["CREATED", "ERROR"])
  })
})
