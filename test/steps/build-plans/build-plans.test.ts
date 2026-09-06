import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../src/lib/gitlab/gitlab.js")
vi.mock("../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import type { GitlabClient } from "../../../src/lib/gitlab/gitlab.js"
import {
  branchExists,
  createTag,
  getBranchHeadSha,
  getFileContent,
  getLatestPipelineForRef,
  listTags,
} from "../../../src/lib/gitlab/gitlab.js"
import { DEFAULT_TAG_FORMAT, validateTagFormat } from "../../../src/lib/tag-format.js"
import { buildPlans } from "../../../src/steps/build-plans/build-plans.js"
import {
  toAnchorName,
  toChartDirName,
  toProjectId,
  toProjectName,
  toTagName,
  toValuesPath,
} from "../../../src/types/types.js"
import { FatalError } from "../../../src/utils/errors.js"
import { logger } from "../../../src/utils/logger.js"
import { makeApp, makeChartAndApps, makeHttpError } from "../../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

const OLD_TAG = "main-build-at-20251231-000000"
const NEW_TAG = toTagName("main-build-at-20260101-000000")
const HEAD_SHA = "head-sha"

describe("buildPlans", () => {
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

  it("差分があるchartAndAppsはtoApplyに含まれる", async () => {
    const group = makeChartAndApps([makeApp()])
    const { toApply, settled } = await buildPlans(mockGitlab, [group], 3, false, DEFAULT_TAG_FORMAT)
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.chartAndApps).toBe(group)
    expect(toApply[0]?.plans[0]?.latestTag.name).toBe(NEW_TAG)
    expect(toApply[0]?.files).toEqual([
      { valuesPath: "values.yaml", content: `variables:\n  - &appVersion ${NEW_TAG}\n` },
    ])
    expect(settled).toEqual([])
  })

  it("差分がないchartAndAppsはsettledにSKIPPEDとして入る", async () => {
    vi.mocked(getFileContent).mockResolvedValue(`variables:\n  - &appVersion ${NEW_TAG}\n`)
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("差分があってもdryRunのときはsettledにSKIPPEDとして入り、toApplyには含まれない", async () => {
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      true,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("values.yaml が見つからないときsettledにERRORとして入る", async () => {
    vi.mocked(getFileContent).mockResolvedValue(undefined)
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("複数アプリのうち1件が失敗したとき、成功分も反映せず全体をERRORにする（オールオアナッシング）", async () => {
    const appOk = makeApp({ projectId: toProjectId(1), projectName: toProjectName("app-ok") })
    const appFail = makeApp({ projectId: toProjectId(2), projectName: toProjectName("app-fail") })
    vi.mocked(listTags).mockImplementation(async (_client, projectId) => {
      if (projectId === 2) throw makeHttpError(403)
      return [{ name: NEW_TAG, commitSha: HEAD_SHA }]
    })
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([appOk, appFail])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("同じvaluesPathを参照する複数アプリの変更を1ファイルにまとめる", async () => {
    const appA = makeApp({
      projectId: toProjectId(1),
      projectName: toProjectName("app-a"),
      chart: [
        {
          valuesPath: toValuesPath("shared.yaml"),
          anchorName: toAnchorName("appAVersion"),
        },
      ],
    })
    const appB = makeApp({
      projectId: toProjectId(2),
      projectName: toProjectName("app-b"),
      chart: [
        {
          valuesPath: toValuesPath("shared.yaml"),
          anchorName: toAnchorName("appBVersion"),
        },
      ],
    })
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &appAVersion ${OLD_TAG}\n  - &appBVersion ${OLD_TAG}\n`,
    )
    const { toApply } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([appA, appB])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply[0]?.files).toHaveLength(1)
    expect(toApply[0]?.files[0]?.content).toContain(`&appAVersion ${NEW_TAG}`)
    expect(toApply[0]?.files[0]?.content).toContain(`&appBVersion ${NEW_TAG}`)
  })

  it("401エラーのとき FatalError をスローする", async () => {
    vi.mocked(listTags).mockRejectedValue(makeHttpError(401))
    await expect(
      buildPlans(mockGitlab, [makeChartAndApps([makeApp()])], 3, false, DEFAULT_TAG_FORMAT),
    ).rejects.toThrow(FatalError)
  })

  it("非fatalなAPIエラーのときsettledにERRORとして入る", async () => {
    vi.mocked(listTags).mockRejectedValue(makeHttpError(403))
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("非fatalなAPIエラーは該当chartAndAppsだけをERRORにし、他のchartAndAppsの処理は続行する", async () => {
    const appFail = makeApp({ projectId: toProjectId(1), projectName: toProjectName("app-fail") })
    const appOk = makeApp({ projectId: toProjectId(2), projectName: toProjectName("app-ok") })
    const failing = { ...makeChartAndApps([appFail]), chartDirName: toChartDirName("failing") }
    const ok = { ...makeChartAndApps([appOk]), chartDirName: toChartDirName("ok") }
    vi.mocked(listTags).mockImplementation(async (_client, projectId) => {
      if (projectId === 1) throw makeHttpError(403)
      return [{ name: NEW_TAG, commitSha: HEAD_SHA }]
    })
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [failing, ok],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.chartAndApps).toBe(ok)
    expect(settled).toEqual(["ERROR"])
  })

  it("dryRunのときgetLatestPipelineForRefを呼ばない", async () => {
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      true,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
    expect(vi.mocked(getLatestPipelineForRef)).not.toHaveBeenCalled()
  })

  it("values.yaml が見つからないときのエラーメッセージにアプリ名が含まれる", async () => {
    vi.mocked(getFileContent).mockResolvedValue(undefined)
    const app = makeApp({ projectName: toProjectName("test-app-name") })
    await buildPlans(mockGitlab, [makeChartAndApps([app])], 3, false, DEFAULT_TAG_FORMAT)
    expect(vi.mocked(logger.error)).toHaveBeenCalled()
    const errorCall = vi.mocked(logger.error).mock.calls[0]?.[0]
    expect(errorCall?.reason).toContain("test-app-name")
  })
})
