import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/lib/gitlab/gitlab.js")
vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import type { GitlabClient } from "../../src/lib/gitlab/gitlab.js"
import {
  createTag,
  getFileContent,
  getLatestPipelineForRef,
  listTagNames,
} from "../../src/lib/gitlab/gitlab.js"
import { buildPlans } from "../../src/steps/build-plans.js"
import { toProjectId, toProjectName } from "../../src/types.js"
import { FatalError } from "../../src/utils/errors.js"
import { makeApp, makeChartGroup, makeHttpError } from "../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

const OLD_TAG = "main-build-at-20251231-000000"
const NEW_TAG = "main-build-at-20260101-000000"

describe("buildPlans", () => {
  beforeEach(() => {
    vi.mocked(listTagNames).mockResolvedValue([NEW_TAG])
    vi.mocked(getFileContent).mockResolvedValue(`image:\n  tag: ${OLD_TAG}\n`)
    vi.mocked(getLatestPipelineForRef).mockResolvedValue(undefined)
    vi.mocked(createTag).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("差分があるchartグループはtoApplyに含まれる", async () => {
    const group = makeChartGroup([makeApp()])
    const { toApply, settled } = await buildPlans(mockGitlab, [group], 3, false)
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.chartGroup).toBe(group)
    expect(toApply[0]?.plans[0]?.latestTag.name).toBe(NEW_TAG)
    expect(toApply[0]?.files).toEqual([
      { filePath: "values.yaml", content: `image:\n  tag: ${NEW_TAG}\n` },
    ])
    expect(settled).toEqual([])
  })

  it("差分がないchartグループはsettledにSKIPPEDとして入る", async () => {
    vi.mocked(getFileContent).mockResolvedValue(`image:\n  tag: ${NEW_TAG}\n`)
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
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartGroup([makeApp()])],
      3,
      true,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("追跡ブランチ由来のタグが見つからないとき、新しいタグを作成してtoApplyに含める", async () => {
    vi.mocked(listTagNames).mockResolvedValue(["other-branch-build-at-20260101-000000"])
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartGroup([makeApp()])],
      3,
      false,
    )
    expect(createTag).toHaveBeenCalledOnce()
    expect(vi.mocked(createTag).mock.calls[0]?.[3]).toBe("main")
    expect(toApply).toHaveLength(1)
    expect(settled).toEqual([])
  })

  it("dryRun=true のとき、タグが見つからなくても実際のタグ作成はしない", async () => {
    vi.mocked(listTagNames).mockResolvedValue(["other-branch-build-at-20260101-000000"])
    await buildPlans(mockGitlab, [makeChartGroup([makeApp()])], 3, true)
    expect(createTag).not.toHaveBeenCalled()
  })

  it("タグ作成APIが403エラーを投げたときsettledにERRORとして入る", async () => {
    vi.mocked(listTagNames).mockResolvedValue(["other-branch-build-at-20260101-000000"])
    vi.mocked(createTag).mockRejectedValue(makeHttpError(403))
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartGroup([makeApp()])],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("values.yaml が見つからないときsettledにERRORとして入る", async () => {
    vi.mocked(getFileContent).mockResolvedValue(undefined)
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartGroup([makeApp()])],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("複数アプリのうち1件が失敗したとき、成功分も反映せず全体をERRORにする（オールオアナッシング）", async () => {
    const appOk = makeApp({ projectId: toProjectId(1), projectName: toProjectName("app-ok") })
    const appFail = makeApp({ projectId: toProjectId(2), projectName: toProjectName("app-fail") })
    vi.mocked(listTagNames).mockImplementation(async (_client, projectId) => {
      if (projectId === 2) throw makeHttpError(403)
      return [NEW_TAG]
    })
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartGroup([appOk, appFail])],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("同じvaluesPathを参照する複数アプリの変更を1ファイルにまとめる", async () => {
    const appA = makeApp({
      projectId: toProjectId(1),
      projectName: toProjectName("app-a"),
      chart: { valuesPath: "shared.yaml", imageTagKey: "appA.tag" },
    })
    const appB = makeApp({
      projectId: toProjectId(2),
      projectName: toProjectName("app-b"),
      chart: { valuesPath: "shared.yaml", imageTagKey: "appB.tag" },
    })
    vi.mocked(getFileContent).mockResolvedValue(
      `appA:\n  tag: ${OLD_TAG}\nappB:\n  tag: ${OLD_TAG}\n`,
    )
    const { toApply } = await buildPlans(mockGitlab, [makeChartGroup([appA, appB])], 3, false)
    expect(toApply[0]?.files).toHaveLength(1)
    expect(toApply[0]?.files[0]?.content).toContain(`appA:\n  tag: ${NEW_TAG}`)
    expect(toApply[0]?.files[0]?.content).toContain(`appB:\n  tag: ${NEW_TAG}`)
  })

  it("401エラーのとき FatalError をスローする", async () => {
    vi.mocked(listTagNames).mockRejectedValue(makeHttpError(401))
    await expect(buildPlans(mockGitlab, [makeChartGroup([makeApp()])], 3, false)).rejects.toThrow(
      FatalError,
    )
  })

  it("非fatalなAPIエラーのときsettledにERRORとして入る", async () => {
    vi.mocked(listTagNames).mockRejectedValue(makeHttpError(403))
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
