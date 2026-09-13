import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import type { LatestTagResolution } from "../../../../src/domain/types.js"
import {
  toAnchorName,
  toBranchName,
  toTagName,
  toValuesPath,
} from "../../../../src/domain/types.js"
import { buildPlans } from "../../../../src/steps/build-plans/build-plans.js"
import type { AppOutcome } from "../../../../src/steps/shared/step-outcome.js"
import {
  NEW_TAG,
  OLD_TAG,
  makeApp,
  makeConfigUnit,
  makeResolvedTags,
  resolvedAtHead,
  makeAdapter,
  makeAdapterWithCachedReads,
  mockBuildPlansAdapter,
} from "../../../helpers.js"

const adapter = makeAdapter()

describe("buildPlans（イメージタグの書き込み先）", () => {
  beforeEach(() => {
    mockBuildPlansAdapter(adapter)
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
    vi.mocked(adapter.getFileContent).mockResolvedValue(
      `variables:\n  - &helmVersion develop\n  - &tenant1client1AppsVersion ${OLD_TAG}\n`,
    )
    const targets = [makeConfigUnit([app])]
    const { toApply } = await buildPlans(
      makeAdapterWithCachedReads(adapter),
      targets,
      makeResolvedTags(targets),
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
    vi.mocked(adapter.getFileContent).mockImplementation(async (_projectId, filePath) => {
      if (filePath === "webapi.yaml") return `variables:\n  - &webapiVersion ${OLD_TAG}\n`
      if (filePath === "batch.yaml") return `variables:\n  - &batchVersion ${OLD_TAG}\n`
      return undefined
    })
    const targets = [makeConfigUnit([app])]
    const { toApply } = await buildPlans(
      makeAdapterWithCachedReads(adapter),
      targets,
      makeResolvedTags(targets),
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
    vi.mocked(adapter.getFileContent).mockImplementation(async (_projectId, filePath) => {
      if (filePath === "webapi.yaml") return `variables:\n  - &webapiVersion ${OLD_TAG}\n`
      if (filePath === "batch.yaml") return `variables:\n  - &batchVersion ${NEW_TAG}\n`
      return undefined
    })
    const targets = [makeConfigUnit([app])]
    const { toApply } = await buildPlans(
      makeAdapterWithCachedReads(adapter),
      targets,
      makeResolvedTags(targets),
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
      vi.mocked(adapter.getFileContent).mockResolvedValue(
        `variables:\n  - &appVersion ${OLD_TAG}\n`,
      )
      const targets = [makeConfigUnit([app])]
      const { toApply } = await buildPlans(
        makeAdapterWithCachedReads(adapter),
        targets,
        makeResolvedTags(targets),
        3,
        false,
      )
      expect(toApply[0]?.plans[0]?.updates).toHaveLength(1)
      expect(toApply[0]?.plans[0]?.updates[0]?.currentTag).toBe(OLD_TAG)
    },
  )

  it("反映済みタグが最新タグと名前は違っても、追跡ブランチのHEADを指すときは更新しない", async () => {
    // 同じコミットに古いタグと新しいタグの両方が付いている状態。タグ名は違ってもデプロイされる
    // 中身は同じなので、意味の無いMRを作らない
    const targets = [makeConfigUnit([makeApp()])]
    const { toApply, settled } = await buildPlans(
      makeAdapterWithCachedReads(adapter),
      targets,
      makeResolvedTags(targets, () => resolvedAtHead(new Set([NEW_TAG, toTagName(OLD_TAG)]))),
      3,
      false,
    )
    expect(toApply).toEqual([])
    expect(settled).toEqual(["SKIPPED"])
  })

  it("values.yamlの値がタグ名でないとき（初期値など）は更新する", async () => {
    vi.mocked(adapter.getFileContent).mockResolvedValue("variables:\n  - &appVersion placeholder\n")
    const targets = [makeConfigUnit([makeApp()])]
    const { toApply } = await buildPlans(
      makeAdapterWithCachedReads(adapter),
      targets,
      makeResolvedTags(targets),
      3,
      false,
    )
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.plans[0]?.updates[0]?.currentTag).toBe("placeholder")
  })

  it("追跡ブランチを変更したとき、反映済みタグが変更後ブランチのHEADを指していても更新する（HEAD一致によるスキップの対象外）", async () => {
    // 切り替え前後のブランチが同じコミットを指しているケース。反映済みタグ（main由来）は
    // release/2026-q2 のHEADを指すので通常なら更新しないが、現在の追跡ブランチ由来ではなく
    // trackedHeadTagNames に入らないため、追跡先が変わったことをvalues.yamlに反映する
    const switchedTag = toTagName("release-2026-q2-build-at-20260101-000000")
    const resolvedAfterSwitch: AppOutcome<LatestTagResolution> = {
      status: "ok",
      value: {
        tag: {
          name: switchedTag,
          branchName: toBranchName("release/2026-q2"),
          taggedAt: new Date(Date.UTC(2026, 0, 1)),
        },
        trackedHeadTagNames: new Set(),
      },
    }
    const targets = [makeConfigUnit([makeApp({ branchToSync: toBranchName("release/2026-q2") })])]
    const { toApply, settled } = await buildPlans(
      makeAdapterWithCachedReads(adapter),
      targets,
      makeResolvedTags(targets, () => resolvedAfterSwitch),
      3,
      false,
    )
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.plans[0]?.updates[0]?.currentTag).toBe(OLD_TAG)
    expect(toApply[0]?.files[0]?.content).toMatch(/&appVersion release-2026-q2-build-at-/)
    expect(settled).toEqual([])
  })

  it("旧タグが古いコミットを指すときは従来どおり更新する", async () => {
    // 反映済みタグは追跡ブランチ由来だが、HEADではない古いコミットを指す（＝最新タグの
    // trackedHeadTagNames に含まれない）ので、HEAD一致によるスキップにはならない
    const targets = [makeConfigUnit([makeApp()])]
    const { toApply, settled } = await buildPlans(
      makeAdapterWithCachedReads(adapter),
      targets,
      makeResolvedTags(targets),
      3,
      false,
    )
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.plans[0]?.updates[0]?.currentTag).toBe(OLD_TAG)
    expect(toApply[0]?.files[0]?.content).toContain(`&appVersion ${NEW_TAG}`)
    expect(settled).toEqual([])
  })
})
