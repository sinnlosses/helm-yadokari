import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/lib/gitlab.js")
vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import {
  commitFileUpdates,
  createMergeRequest,
  createTag,
  getFileContent,
  getLatestPipelineForRef,
  getProjectWebUrl,
  listTagNames,
  openMergeRequestExists,
} from "../../src/lib/gitlab.js"
import type { GitlabClient } from "../../src/lib/gitlab.js"
import { updateChartGroupIfNeeded } from "../../src/steps/chart-update.js"
import { toProjectId, toProjectName } from "../../src/types.js"
import { FatalError } from "../../src/utils/errors.js"
import { makeApp, makeChartGroup, makeHttpError } from "../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

const OLD_TAG = "main-build-at-20251231-000000"
const NEW_TAG = "main-build-at-20260101-000000"

describe("updateChartGroupIfNeeded", () => {
  beforeEach(() => {
    vi.mocked(listTagNames).mockResolvedValue([NEW_TAG])
    vi.mocked(getFileContent).mockResolvedValue(`image:\n  tag: ${OLD_TAG}\n`)
    vi.mocked(openMergeRequestExists).mockResolvedValue(false)
    vi.mocked(getLatestPipelineForRef).mockResolvedValue({
      status: "success",
      webUrl: "https://gitlab.test/p/1",
    })
    vi.mocked(getProjectWebUrl).mockResolvedValue("https://gitlab.test/group/my-app")
    vi.mocked(commitFileUpdates).mockResolvedValue(undefined)
    vi.mocked(createMergeRequest).mockResolvedValue(undefined)
    vi.mocked(createTag).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("アプリが0件のとき 'SKIPPED' を返す", async () => {
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([]))).toBe("SKIPPED")
    expect(commitFileUpdates).not.toHaveBeenCalled()
  })

  it("既にオープン中のMRがあるとき 'SKIPPED' を返す", async () => {
    vi.mocked(openMergeRequestExists).mockResolvedValue(true)
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))).toBe("SKIPPED")
    expect(commitFileUpdates).not.toHaveBeenCalled()
  })

  it("全アプリが最新タグと反映済みタグ一致のとき 'SKIPPED' を返す", async () => {
    vi.mocked(getFileContent).mockResolvedValue(`image:\n  tag: ${NEW_TAG}\n`)
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))).toBe("SKIPPED")
    expect(commitFileUpdates).not.toHaveBeenCalled()
  })

  it("個々のアプリが最新タグと一致しているとき、そのアプリ単位でログ出力する", async () => {
    const { logger } = await import("../../src/utils/logger.js")
    vi.mocked(getFileContent).mockResolvedValue(`image:\n  tag: ${NEW_TAG}\n`)
    await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "check_app",
        projectName: "my-app",
        result: "SKIPPED",
        reason: "already_up_to_date",
      }),
    )
  })

  it("差分があり dryRun=true のとき 'SKIPPED' を返しMRを作成しない", async () => {
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]), true)).toBe(
      "SKIPPED",
    )
    expect(commitFileUpdates).not.toHaveBeenCalled()
    expect(createMergeRequest).not.toHaveBeenCalled()
  })

  it("差分があるとき 'CREATED' を返しコミットとMRを作成する", async () => {
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))).toBe("CREATED")
    expect(commitFileUpdates).toHaveBeenCalledOnce()
    expect(createMergeRequest).toHaveBeenCalledOnce()
  })

  it("固定ブランチ名でコミット・MRを作成する", async () => {
    await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))
    expect(vi.mocked(commitFileUpdates).mock.calls[0]?.[2]).toBe("yadokari/update")
    expect(vi.mocked(createMergeRequest).mock.calls[0]?.[2]).toBe("yadokari/update")
  })

  it("mrTargetBranch をベースブランチ・MR作成先として使う", async () => {
    await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))
    expect(vi.mocked(commitFileUpdates).mock.calls[0]?.[3]).toBe("develop")
    expect(vi.mocked(createMergeRequest).mock.calls[0]?.[3]).toBe("develop")
  })

  it("追跡ブランチ由来のタグが見つからないとき、新しいタグを作成して 'CREATED' を返す", async () => {
    vi.mocked(listTagNames).mockResolvedValue(["other-branch-build-at-20260101-000000"])
    vi.mocked(getFileContent).mockResolvedValue("image:\n  tag: some-old-tag\n")
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))).toBe("CREATED")
    expect(createTag).toHaveBeenCalledOnce()
    expect(vi.mocked(createTag).mock.calls[0]?.[3]).toBe("main")
    expect(commitFileUpdates).toHaveBeenCalledOnce()
  })

  it("dryRun=true のとき、タグが見つからなくても実際のタグ作成はしない", async () => {
    vi.mocked(listTagNames).mockResolvedValue(["other-branch-build-at-20260101-000000"])
    vi.mocked(getFileContent).mockResolvedValue("image:\n  tag: some-old-tag\n")
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]), true)).toBe(
      "SKIPPED",
    )
    expect(createTag).not.toHaveBeenCalled()
    expect(commitFileUpdates).not.toHaveBeenCalled()
  })

  it("タグ作成APIが403エラーを投げたとき 'ERROR' を返す", async () => {
    vi.mocked(listTagNames).mockResolvedValue(["other-branch-build-at-20260101-000000"])
    vi.mocked(createTag).mockRejectedValue(makeHttpError(403))
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))).toBe("ERROR")
    expect(commitFileUpdates).not.toHaveBeenCalled()
  })

  it("values.yaml が見つからないとき 'ERROR' を返す", async () => {
    vi.mocked(getFileContent).mockResolvedValue(undefined)
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))).toBe("ERROR")
  })

  it("複数アプリのうち1件が失敗したとき、成功分も反映せず全体を'ERROR'にする（オールオアナッシング）", async () => {
    const appOk = makeApp({ projectId: toProjectId(1), projectName: toProjectName("app-ok") })
    const appFail = makeApp({ projectId: toProjectId(2), projectName: toProjectName("app-fail") })
    vi.mocked(listTagNames).mockImplementation(async (_client, projectId) => {
      if (projectId === 2) throw makeHttpError(403)
      return [NEW_TAG]
    })
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([appOk, appFail]))).toBe(
      "ERROR",
    )
    expect(commitFileUpdates).not.toHaveBeenCalled()
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
    await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([appA, appB]))
    const files = vi.mocked(commitFileUpdates).mock.calls[0]?.[5]
    expect(files).toHaveLength(1)
    expect(files?.[0]?.content).toContain(`appA:\n  tag: ${NEW_TAG}`)
    expect(files?.[0]?.content).toContain(`appB:\n  tag: ${NEW_TAG}`)
  })

  it("401エラーのとき FatalError をスローする", async () => {
    vi.mocked(listTagNames).mockRejectedValue(makeHttpError(401))
    await expect(updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))).rejects.toThrow(
      FatalError,
    )
  })

  it("非fatalなAPIエラーのとき 'ERROR' を返す", async () => {
    vi.mocked(listTagNames).mockRejectedValue(makeHttpError(403))
    expect(await updateChartGroupIfNeeded(mockGitlab, makeChartGroup([makeApp()]))).toBe("ERROR")
  })
})
