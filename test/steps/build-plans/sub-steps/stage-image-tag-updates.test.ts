import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { buildPlans } from "../../../../src/steps/build-plans/build-plans.js"
import { toAnchorName, toValuesPath } from "../../../../src/types/types.js"
import {
  NEW_TAG,
  OLD_TAG,
  makeApp,
  makeConfigUnit,
  makePlatform,
  mockBuildPlansPlatform,
  newPlatformCache,
} from "../../../helpers.js"

const platform = makePlatform()

describe("buildPlans（イメージタグの書き込み先）", () => {
  beforeEach(() => {
    mockBuildPlansPlatform(platform)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("locations.anchorで指定したアンカーの値だけを取得・書き換える", async () => {
    const app = makeApp({
      imageTagLocations: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("tenant1client1AppsVersion"),
        },
      ],
    })
    vi.mocked(platform.getFileContent).mockResolvedValue(
      `variables:\n  - &helmVersion develop\n  - &tenant1client1AppsVersion ${OLD_TAG}\n`,
    )
    const { toApply } = await buildPlans(
      platform,
      newPlatformCache(platform),
      [makeConfigUnit([app])],
      3,
      false,
    )
    expect(toApply[0]?.files[0]?.content).toContain(`&tenant1client1AppsVersion ${NEW_TAG}`)
    expect(toApply[0]?.files[0]?.content).toContain("&helmVersion develop")
  })

  it("1アプリに複数のlocationsを指定すると、同じ最新タグを複数箇所へ反映する", async () => {
    const app = makeApp({
      imageTagLocations: [
        {
          valuesPath: toValuesPath("webapi.yaml"),
          anchorName: toAnchorName("webapiVersion"),
        },
        {
          valuesPath: toValuesPath("batch.yaml"),
          anchorName: toAnchorName("batchVersion"),
        },
      ],
    })
    vi.mocked(platform.getFileContent).mockImplementation(async (_projectId, filePath) => {
      if (filePath === "webapi.yaml") return `variables:\n  - &webapiVersion ${OLD_TAG}\n`
      if (filePath === "batch.yaml") return `variables:\n  - &batchVersion ${OLD_TAG}\n`
      return undefined
    })
    const { toApply } = await buildPlans(
      platform,
      newPlatformCache(platform),
      [makeConfigUnit([app])],
      3,
      false,
    )
    expect(toApply[0]?.plans[0]?.updates).toHaveLength(2)
    expect(toApply[0]?.files).toHaveLength(2)
    const webapiFile = toApply[0]?.files.find((f) => f.valuesPath === "webapi.yaml")
    const batchFile = toApply[0]?.files.find((f) => f.valuesPath === "batch.yaml")
    expect(webapiFile?.content).toContain(`&webapiVersion ${NEW_TAG}`)
    expect(batchFile?.content).toContain(`&batchVersion ${NEW_TAG}`)
  })

  it("複数のlocationsのうち一部だけ差分があるとき、差分がある箇所だけをupdatesに含める", async () => {
    const app = makeApp({
      imageTagLocations: [
        {
          valuesPath: toValuesPath("webapi.yaml"),
          anchorName: toAnchorName("webapiVersion"),
        },
        {
          valuesPath: toValuesPath("batch.yaml"),
          anchorName: toAnchorName("batchVersion"),
        },
      ],
    })
    vi.mocked(platform.getFileContent).mockImplementation(async (_projectId, filePath) => {
      if (filePath === "webapi.yaml") return `variables:\n  - &webapiVersion ${OLD_TAG}\n`
      if (filePath === "batch.yaml") return `variables:\n  - &batchVersion ${NEW_TAG}\n`
      return undefined
    })
    const { toApply } = await buildPlans(
      platform,
      newPlatformCache(platform),
      [makeConfigUnit([app])],
      3,
      false,
    )
    expect(toApply[0]?.plans[0]?.updates).toHaveLength(1)
    expect(toApply[0]?.plans[0]?.updates[0]?.location.valuesPath).toBe("webapi.yaml")
    expect(toApply[0]?.files).toHaveLength(1)
    expect(toApply[0]?.files[0]?.valuesPath).toBe("webapi.yaml")
  })

  it(
    "同じvaluesPath+anchorが1アプリのlocationsに2回現れても、2箇所目は下書きの現在値" +
      "（＝1箇所目の書き換え後の値）を読むためupdatesは1件だけになる" +
      "（本来この設定は loadConfig() の validateNoDuplicateLocations() で例外になり、" +
      "buildPlans() まで到達しない）",
    async () => {
      const app = makeApp({
        imageTagLocations: [
          { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("appVersion") },
          { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("appVersion") },
        ],
      })
      vi.mocked(platform.getFileContent).mockResolvedValue(
        `variables:\n  - &appVersion ${OLD_TAG}\n`,
      )
      const { toApply } = await buildPlans(
        platform,
        newPlatformCache(platform),
        [makeConfigUnit([app])],
        3,
        false,
      )
      expect(toApply[0]?.plans[0]?.updates).toHaveLength(1)
      expect(toApply[0]?.plans[0]?.updates[0]?.currentTag).toBe(OLD_TAG)
    },
  )
})
