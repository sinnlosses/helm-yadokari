import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { buildPlans } from "../../../src/steps/build-plans/build-plans.js"
import {
  toAnchorName,
  toChartDirName,
  toConfigUnitPath,
  toProjectId,
  toProjectName,
  toValuesPath,
} from "../../../src/types/types.js"
import { FatalError } from "../../../src/utils/errors.js"
import { logger } from "../../../src/utils/logger.js"
import {
  HEAD_SHA,
  NEW_TAG,
  OLD_TAG,
  makeApp,
  makeConfigUnit,
  makeHttpError,
  makeAdapter,
  mockBuildPlansAdapter,
  newPlatformCache,
} from "../../helpers.js"

const adapter = makeAdapter()

describe("buildPlans", () => {
  beforeEach(() => {
    mockBuildPlansAdapter(adapter)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("差分がある設定ユニットはtoApplyに含まれる", async () => {
    const group = makeConfigUnit([makeApp()])
    const { toApply, settled } = await buildPlans(
      adapter,
      newPlatformCache(adapter),
      [group],
      3,
      false,
    )
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.configUnit).toBe(group)
    expect(toApply[0]?.plans[0]?.latestTag.name).toBe(NEW_TAG)
    expect(toApply[0]?.files).toEqual([
      { valuesPath: "values.yaml", content: `variables:\n  - &appVersion ${NEW_TAG}\n` },
    ])
    expect(settled).toEqual([])
  })

  it("差分がない設定ユニットはsettledにSKIPPEDとして入る", async () => {
    vi.mocked(adapter.getFileContent).mockResolvedValue(`variables:\n  - &appVersion ${NEW_TAG}\n`)
    const { toApply, settled } = await buildPlans(
      adapter,
      newPlatformCache(adapter),
      [makeConfigUnit([makeApp()])],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("差分があってもdryRunのときはsettledにSKIPPEDとして入り、toApplyには含まれない", async () => {
    const { toApply, settled } = await buildPlans(
      adapter,
      newPlatformCache(adapter),
      [makeConfigUnit([makeApp()])],
      3,
      true,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("values.yaml が見つからないときsettledにERRORとして入る", async () => {
    vi.mocked(adapter.getFileContent).mockResolvedValue(undefined)
    const { toApply, settled } = await buildPlans(
      adapter,
      newPlatformCache(adapter),
      [makeConfigUnit([makeApp()])],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("複数アプリのうち1件が失敗したとき、成功分も反映せず全体をERRORにする（オールオアナッシング）", async () => {
    const appOk = makeApp({ projectId: toProjectId("1"), projectName: toProjectName("app-ok") })
    const appFail = makeApp({ projectId: toProjectId("2"), projectName: toProjectName("app-fail") })
    vi.mocked(adapter.listTags).mockImplementation(async (projectId) => {
      if (projectId === "2") throw makeHttpError(403)
      return [{ name: NEW_TAG, commitSha: HEAD_SHA }]
    })
    const { toApply, settled } = await buildPlans(
      adapter,
      newPlatformCache(adapter),
      [makeConfigUnit([appOk, appFail])],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("同じvaluesPathを参照する複数アプリの変更を1ファイルにまとめる", async () => {
    const appA = makeApp({
      projectId: toProjectId("1"),
      projectName: toProjectName("app-a"),
      imageTagLocations: [
        {
          valuesPath: toValuesPath("shared.yaml"),
          anchorName: toAnchorName("appAVersion"),
        },
      ],
    })
    const appB = makeApp({
      projectId: toProjectId("2"),
      projectName: toProjectName("app-b"),
      imageTagLocations: [
        {
          valuesPath: toValuesPath("shared.yaml"),
          anchorName: toAnchorName("appBVersion"),
        },
      ],
    })
    vi.mocked(adapter.getFileContent).mockResolvedValue(
      `variables:\n  - &appAVersion ${OLD_TAG}\n  - &appBVersion ${OLD_TAG}\n`,
    )
    const { toApply } = await buildPlans(
      adapter,
      newPlatformCache(adapter),
      [makeConfigUnit([appA, appB])],
      3,
      false,
    )
    expect(toApply[0]?.files).toHaveLength(1)
    expect(toApply[0]?.files[0]?.content).toContain(`&appAVersion ${NEW_TAG}`)
    expect(toApply[0]?.files[0]?.content).toContain(`&appBVersion ${NEW_TAG}`)
  })

  it("401エラーのとき FatalError をスローする", async () => {
    vi.mocked(adapter.listTags).mockRejectedValue(makeHttpError(401))
    await expect(
      buildPlans(adapter, newPlatformCache(adapter), [makeConfigUnit([makeApp()])], 3, false),
    ).rejects.toThrow(FatalError)
  })

  it("非fatalなAPIエラーのときsettledにERRORとして入る", async () => {
    vi.mocked(adapter.listTags).mockRejectedValue(makeHttpError(403))
    const { toApply, settled } = await buildPlans(
      adapter,
      newPlatformCache(adapter),
      [makeConfigUnit([makeApp()])],
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["ERROR"])
  })

  it("非fatalなAPIエラーは該当設定ユニットだけをERRORにし、他の設定ユニットの処理は続行する", async () => {
    const appFail = makeApp({ projectId: toProjectId("1"), projectName: toProjectName("app-fail") })
    const appOk = makeApp({ projectId: toProjectId("2"), projectName: toProjectName("app-ok") })
    const failing = { ...makeConfigUnit([appFail]), chartDirName: toChartDirName("failing") }
    const ok = { ...makeConfigUnit([appOk]), chartDirName: toChartDirName("ok") }
    vi.mocked(adapter.listTags).mockImplementation(async (projectId) => {
      if (projectId === "1") throw makeHttpError(403)
      return [{ name: NEW_TAG, commitSha: HEAD_SHA }]
    })
    const { toApply, settled } = await buildPlans(
      adapter,
      newPlatformCache(adapter),
      [failing, ok],
      3,
      false,
    )
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.configUnit).toBe(ok)
    expect(settled).toEqual(["ERROR"])
  })

  it("values.yaml が見つからないときのエラーメッセージにアプリ名が含まれる", async () => {
    vi.mocked(adapter.getFileContent).mockResolvedValue(undefined)
    const app = makeApp({ projectName: toProjectName("test-app-name") })
    await buildPlans(adapter, newPlatformCache(adapter), [makeConfigUnit([app])], 3, false)
    expect(vi.mocked(logger.error)).toHaveBeenCalled()
    const errorCall = vi.mocked(logger.error).mock.calls[0]?.[0]
    expect(errorCall?.reason).toContain("test-app-name")
  })

  it("同じvalues.yamlを指す複数の設定ユニットでは読み込みを1回にまとめ、片方の書き換えを他方に見せない", async () => {
    const original = `variables:\n  - &appVersion ${OLD_TAG}\n  - &otherVersion ${OLD_TAG}\n`
    vi.mocked(adapter.getFileContent).mockResolvedValue(original)
    // 同じchartディレクトリ配下の別tenant/client（chart.projectIdは既定値で共通）が
    // 同じvalues.yamlの別アンカーを書き換える構成(docs/requirements.md 4.2節の既知の制限)
    const makeGroup = (unit: string, anchorName: string) =>
      makeConfigUnit(
        [
          makeApp({
            imageTagLocations: [
              {
                valuesPath: toValuesPath("values.yaml"),
                anchorName: toAnchorName(anchorName),
              },
            ],
          }),
        ],
        { unitPath: toConfigUnitPath(unit) },
      )

    const { toApply } = await buildPlans(
      adapter,
      newPlatformCache(adapter),
      [makeGroup("clientA", "appVersion"), makeGroup("clientB", "otherVersion")],
      3,
      false,
    )

    expect(adapter.getFileContent).toHaveBeenCalledOnce()
    expect(toApply[0]?.files).toEqual([
      {
        valuesPath: "values.yaml",
        content: `variables:\n  - &appVersion ${NEW_TAG}\n  - &otherVersion ${OLD_TAG}\n`,
      },
    ])
    expect(toApply[1]?.files).toEqual([
      {
        valuesPath: "values.yaml",
        content: `variables:\n  - &appVersion ${OLD_TAG}\n  - &otherVersion ${NEW_TAG}\n`,
      },
    ])
  })
})
