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
import { toAnchorName, toCommitSha, toTagName, toValuesPath } from "../../../../src/types/types.js"
import { makeApp, makeChartAndApps } from "../../../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

const OLD_TAG = "main-build-at-20251231-000000"
const NEW_TAG = toTagName("main-build-at-20260101-000000")
const HEAD_SHA = toCommitSha("head-sha")

describe("buildPlans（イメージタグの書き込み先）", () => {
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

  it("chart.anchorで指定したアンカーの値だけを取得・書き換える", async () => {
    const app = makeApp({
      imageTagTargets: [
        {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("tenant1client1AppsVersion"),
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
      imageTagTargets: [
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
    const webapiFile = toApply[0]?.files.find((f) => f.valuesPath === "webapi.yaml")
    const batchFile = toApply[0]?.files.find((f) => f.valuesPath === "batch.yaml")
    expect(webapiFile?.content).toContain(`&webapiVersion ${NEW_TAG}`)
    expect(batchFile?.content).toContain(`&batchVersion ${NEW_TAG}`)
  })

  it("複数のchartのうち一部だけ差分があるとき、差分がある箇所だけをupdatesに含める", async () => {
    const app = makeApp({
      imageTagTargets: [
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
    expect(toApply[0]?.files[0]?.valuesPath).toBe("webapi.yaml")
  })

  it(
    "同じvaluesPath+anchorが1アプリのchartに2回現れても、2箇所目は下書きの現在値" +
      "（＝1箇所目の書き換え後の値）を読むためupdatesは1件だけになる" +
      "（本来この設定は loadConfig() の validateNoDuplicateTargets() で例外になり、" +
      "buildPlans() まで到達しない）",
    async () => {
      const app = makeApp({
        imageTagTargets: [
          { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("appVersion") },
          { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("appVersion") },
        ],
      })
      vi.mocked(getFileContent).mockResolvedValue(`variables:\n  - &appVersion ${OLD_TAG}\n`)
      const { toApply } = await buildPlans(
        mockGitlab,
        [makeChartAndApps([app])],
        3,
        false,
        DEFAULT_TAG_FORMAT,
      )
      expect(toApply[0]?.plans[0]?.updates).toHaveLength(1)
      expect(toApply[0]?.plans[0]?.updates[0]?.previousTagName).toBe(OLD_TAG)
    },
  )
})
