import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/lib/gitlab/gitlab.js")
vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import type { GitlabClient } from "../../src/lib/gitlab/gitlab.js"
import {
  branchExists,
  createTag,
  getBranchHeadSha,
  getFileContent,
  getLatestPipelineForRef,
  listTags,
} from "../../src/lib/gitlab/gitlab.js"
import { DEFAULT_TAG_FORMAT, validateTagFormat } from "../../src/lib/gitlab/tag.js"
import { buildPlans } from "../../src/steps/build-plans.js"
import {
  toAnchorName,
  toBranchName,
  toProjectId,
  toProjectName,
  toTagName,
  toValuesPath,
} from "../../src/types.js"
import { FatalError } from "../../src/utils/errors.js"
import { makeApp, makeChartAndApps, makeHttpError } from "../helpers.js"

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
      { filePath: "values.yaml", content: `variables:\n  - &appVersion ${NEW_TAG}\n` },
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

  it("tagFormatにカスタムフォーマットを渡すと、その形式で新しいタグを作成する", async () => {
    const customFormat = validateTagFormat("{date}-{time}-{branch}")
    vi.mocked(listTags).mockResolvedValue([
      { name: toTagName("other-branch-build-at-20260101-000000"), commitSha: HEAD_SHA },
    ])
    const { toApply } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      false,
      customFormat,
    )
    expect(vi.mocked(createTag).mock.calls[0]?.[2]).toMatch(/^\d{8}-\d{6}-main$/)
    expect(toApply[0]?.plans[0]?.latestTag.name).toMatch(/^\d{8}-\d{6}-main$/)
  })

  it("追跡ブランチ由来のタグが見つからないとき、新しいタグを作成してtoApplyに含める", async () => {
    vi.mocked(listTags).mockResolvedValue([
      { name: toTagName("other-branch-build-at-20260101-000000"), commitSha: HEAD_SHA },
    ])
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(createTag).toHaveBeenCalledOnce()
    expect(vi.mocked(createTag).mock.calls[0]?.[3]).toBe("main")
    expect(toApply).toHaveLength(1)
    expect(settled).toEqual([])
  })

  it("追跡ブランチ由来の最新タグが追跡ブランチの現在のHEADコミットにビハインドしているとき、新しいタグを作成する", async () => {
    // タグ名は一致するが、コミットSHAが現在のブランチHEADと異なる
    // （＝タグ作成後に追跡ブランチへ新しいコミットが積まれた）ケース
    vi.mocked(listTags).mockResolvedValue([{ name: NEW_TAG, commitSha: "old-sha" }])
    vi.mocked(getBranchHeadSha).mockResolvedValue("new-sha")
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(createTag).toHaveBeenCalledOnce()
    expect(toApply).toHaveLength(1)
    expect(settled).toEqual([])
  })

  it("反映済みタグが追跡ブランチ由来のとき、HEADと一致する既存タグを再利用して新しいタグは作らない", async () => {
    const { toApply } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(createTag).not.toHaveBeenCalled()
    expect(toApply[0]?.plans[0]?.latestTag.name).toBe(NEW_TAG)
  })

  it("追跡ブランチを変更したとき、既存タグがHEADと一致していても新しいタグを作成する", async () => {
    // values.yaml に反映済みのタグ（main由来）が、変更後の追跡ブランチ（release/2026-q2）
    // 由来ではないケース。既存の release/2026-q2 由来タグはHEADと一致しているが、
    // 追跡ブランチの切り替えを明示するため新しいタグを作る
    const existingTag = toTagName("release-2026-q2-build-at-20260101-000000")
    vi.mocked(listTags).mockResolvedValue([{ name: existingTag, commitSha: HEAD_SHA }])
    const app = makeApp({ branchToSync: toBranchName("release/2026-q2") })
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([app])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(createTag).toHaveBeenCalledOnce()
    expect(vi.mocked(createTag).mock.calls[0]?.[3]).toBe("release/2026-q2")
    const latestTagName = toApply[0]?.plans[0]?.latestTag.name
    expect(latestTagName).toMatch(/^release-2026-q2-build-at-\d{8}-\d{6}$/)
    expect(latestTagName).not.toBe(existingTag)
    expect(settled).toEqual([])
  })

  it("dryRun=true のとき、追跡ブランチを変更していても実際のタグ作成はしない", async () => {
    vi.mocked(listTags).mockResolvedValue([
      { name: toTagName("release-2026-q2-build-at-20260101-000000"), commitSha: HEAD_SHA },
    ])
    const app = makeApp({ branchToSync: toBranchName("release/2026-q2") })
    await buildPlans(mockGitlab, [makeChartAndApps([app])], 3, true, DEFAULT_TAG_FORMAT)
    expect(createTag).not.toHaveBeenCalled()
  })

  it("反映済みタグが読めない（アンカーが無い）ときは、タグを作らずERRORにする", async () => {
    vi.mocked(getFileContent).mockResolvedValue(`variables:\n  - &otherVersion ${OLD_TAG}\n`)
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(createTag).not.toHaveBeenCalled()
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("dryRun=true のとき、タグが見つからなくても実際のタグ作成はしない", async () => {
    vi.mocked(listTags).mockResolvedValue([
      { name: toTagName("other-branch-build-at-20260101-000000"), commitSha: HEAD_SHA },
    ])
    await buildPlans(mockGitlab, [makeChartAndApps([makeApp()])], 3, true, DEFAULT_TAG_FORMAT)
    expect(createTag).not.toHaveBeenCalled()
  })

  it("タグ作成APIが403エラーを投げたときsettledにERRORとして入る", async () => {
    vi.mocked(listTags).mockResolvedValue([
      { name: toTagName("other-branch-build-at-20260101-000000"), commitSha: HEAD_SHA },
    ])
    vi.mocked(createTag).mockRejectedValue(makeHttpError(403))
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
          anchor: toAnchorName("appAVersion"),
        },
      ],
    })
    const appB = makeApp({
      projectId: toProjectId(2),
      projectName: toProjectName("app-b"),
      chart: [
        {
          valuesPath: toValuesPath("shared.yaml"),
          anchor: toAnchorName("appBVersion"),
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

  it("chart.anchorで指定したアンカーの値だけを取得・書き換える", async () => {
    const app = makeApp({
      chart: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchor: toAnchorName("tenant1client1AppsVersion"),
        },
      ],
    })
    vi.mocked(getFileContent).mockResolvedValue(
      `variables:\n  - &helmVersion develop\n  - &tenant1client1AppsVersion ${OLD_TAG}\n`,
    )
    const { toApply } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([app])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply[0]?.files[0]?.content).toContain(`&tenant1client1AppsVersion ${NEW_TAG}`)
    expect(toApply[0]?.files[0]?.content).toContain("&helmVersion develop")
  })

  it("1アプリに複数のchartを指定すると、同じ最新タグを複数箇所へ反映する", async () => {
    const app = makeApp({
      chart: [
        {
          valuesPath: toValuesPath("webapi.yaml"),
          anchor: toAnchorName("webapiVersion"),
        },
        {
          valuesPath: toValuesPath("batch.yaml"),
          anchor: toAnchorName("batchVersion"),
        },
      ],
    })
    vi.mocked(getFileContent).mockImplementation(async (_client, _projectId, filePath) => {
      if (filePath === "webapi.yaml") return `variables:\n  - &webapiVersion ${OLD_TAG}\n`
      if (filePath === "batch.yaml") return `variables:\n  - &batchVersion ${OLD_TAG}\n`
      return undefined
    })
    const { toApply } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([app])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply[0]?.plans[0]?.updates).toHaveLength(2)
    expect(toApply[0]?.files).toHaveLength(2)
    const webapiFile = toApply[0]?.files.find((f) => f.filePath === "webapi.yaml")
    const batchFile = toApply[0]?.files.find((f) => f.filePath === "batch.yaml")
    expect(webapiFile?.content).toContain(`&webapiVersion ${NEW_TAG}`)
    expect(batchFile?.content).toContain(`&batchVersion ${NEW_TAG}`)
  })

  it("複数のchartのうち一部だけ差分があるとき、差分がある箇所だけをupdatesに含める", async () => {
    const app = makeApp({
      chart: [
        {
          valuesPath: toValuesPath("webapi.yaml"),
          anchor: toAnchorName("webapiVersion"),
        },
        {
          valuesPath: toValuesPath("batch.yaml"),
          anchor: toAnchorName("batchVersion"),
        },
      ],
    })
    vi.mocked(getFileContent).mockImplementation(async (_client, _projectId, filePath) => {
      if (filePath === "webapi.yaml") return `variables:\n  - &webapiVersion ${OLD_TAG}\n`
      if (filePath === "batch.yaml") return `variables:\n  - &batchVersion ${NEW_TAG}\n`
      return undefined
    })
    const { toApply } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([app])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(toApply[0]?.plans[0]?.updates).toHaveLength(1)
    expect(toApply[0]?.plans[0]?.updates[0]?.target.valuesPath).toBe("webapi.yaml")
    expect(toApply[0]?.files).toHaveLength(1)
    expect(toApply[0]?.files[0]?.filePath).toBe("webapi.yaml")
  })

  it("helmTargetBranchが現在値と異なるとき、helmTargetBranchUpdateに含めて書き換える", async () => {
    const app = makeApp({
      helmTargetBranch: {
        branch: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("values.yaml"),
            anchor: toAnchorName("targetBranch"),
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
        target: { valuesPath: "values.yaml", anchor: "targetBranch" },
        previousBranch: "release/2025-q4",
        newBranch: "release/2026-q1",
      },
    ])
    expect(toApply[0]?.files[0]?.content).toContain("&targetBranch release/2026-q1")
  })

  it("helmTargetBranchが現在値と同じで、chart側も差分が無いとき、そのアプリはSKIPPEDになる", async () => {
    const app = makeApp({
      helmTargetBranch: {
        branch: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("values.yaml"),
            anchor: toAnchorName("targetBranch"),
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
        branch: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("values.yaml"),
            anchor: toAnchorName("targetBranch"),
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
        branch: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("values.yaml"),
            anchor: toAnchorName("targetBranch"),
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
        branch: toBranchName("release/2026-q1"),
        targets: [
          {
            valuesPath: toValuesPath("values.yaml"),
            anchor: toAnchorName("targetBranch"),
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
})
