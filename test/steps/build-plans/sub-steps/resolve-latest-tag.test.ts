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
import { DEFAULT_TAG_FORMAT, validateTagFormat } from "../../../../src/lib/gitlab/tag.js"
import { buildPlans } from "../../../../src/steps/build-plans/build-plans.js"
import { resolveLatestTag } from "../../../../src/steps/build-plans/sub-steps/resolve-latest-tag.js"
import { toBranchName, toTagName } from "../../../../src/types/types.js"
import { makeApp, makeChartAndApps, makeHttpError } from "../../../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

const OLD_TAG = "main-build-at-20251231-000000"
const NEW_TAG = toTagName("main-build-at-20260101-000000")
const HEAD_SHA = "head-sha"

describe("buildPlans（タグの解決・自動作成）", () => {
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

  it("追跡ブランチを変更したとき、反映済みタグが変更後ブランチのHEADを指していても更新する（T-037のスキップ対象外）", async () => {
    // 切り替え前後のブランチが同じコミットを指しているケース。反映済みタグ（main由来）は
    // release/2026-q2 のHEADを指すのでT-037なら更新しないが、追跡先が変わったことを
    // values.yamlに反映するため更新する
    vi.mocked(listTags).mockResolvedValue([{ name: toTagName(OLD_TAG), commitSha: HEAD_SHA }])
    const app = makeApp({ branchToSync: toBranchName("release/2026-q2") })
    const { toApply, settled } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([app])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )
    expect(createTag).toHaveBeenCalledOnce()
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.plans[0]?.updates[0]?.previousTag).toBe(OLD_TAG)
    expect(toApply[0]?.files[0]?.content).toMatch(/&appVersion release-2026-q2-build-at-/)
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

  it("旧タグが追跡ブランチのHEADと同じコミットを指すとき、より新しいタグがあっても更新しない", async () => {
    // 同じコミットに古いタグと新しいタグの両方が付いている状態
    vi.mocked(listTags).mockResolvedValue([
      { name: toTagName(OLD_TAG), commitSha: HEAD_SHA },
      { name: NEW_TAG, commitSha: HEAD_SHA },
    ])

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

  it("旧タグが古いコミットを指すときは従来どおり更新する", async () => {
    vi.mocked(listTags).mockResolvedValue([
      { name: toTagName(OLD_TAG), commitSha: "older-sha" },
      { name: NEW_TAG, commitSha: HEAD_SHA },
    ])

    const { toApply } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )

    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.plans[0]?.updates[0]?.previousTag).toBe(OLD_TAG)
  })

  it("values.yamlの値がタグ名でないとき（初期値など）は更新する", async () => {
    vi.mocked(getFileContent).mockResolvedValue("variables:\n  - &appVersion placeholder\n")
    vi.mocked(listTags).mockResolvedValue([{ name: NEW_TAG, commitSha: HEAD_SHA }])

    const { toApply } = await buildPlans(
      mockGitlab,
      [makeChartAndApps([makeApp()])],
      3,
      false,
      DEFAULT_TAG_FORMAT,
    )

    expect(toApply).toHaveLength(1)
  })
})

describe("resolveLatestTag（trackedHeadTagNamesの中身、T-049）", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("追跡ブランチ由来かつHEADと同じコミットを指すタグ名だけを含む", async () => {
    // 同じコミット(HEAD_SHA)を指すタグが2件あるが、他ブランチ由来のものはパースできないため
    // 集合には含まれない。コミットが違うタグ（OLD_TAG）も含まれない
    vi.mocked(listTags).mockResolvedValue([
      { name: NEW_TAG, commitSha: HEAD_SHA },
      { name: toTagName("other-branch-build-at-20260101-000000"), commitSha: HEAD_SHA },
      { name: toTagName(OLD_TAG), commitSha: "older-sha" },
    ])
    vi.mocked(getBranchHeadSha).mockResolvedValue(HEAD_SHA)

    const result = await resolveLatestTag(mockGitlab, makeApp(), false, DEFAULT_TAG_FORMAT, [
      NEW_TAG,
    ])

    expect([...result.trackedHeadTagNames]).toEqual([NEW_TAG])
  })

  it("追跡ブランチを切り替えた直後は、切り替え前のタグ名がHEADと同じコミットを指していても含まない", async () => {
    // release/2026-q2 に切り替えた直後、切り替え前(main)のタグがrelease/2026-q2のHEADと
    // たまたま同じコミットを指しているケース。tagFormatではrelease/2026-q2由来として
    // パースできないため、trackedHeadTagNamesは空になる（T-043）
    vi.mocked(listTags).mockResolvedValue([{ name: toTagName(OLD_TAG), commitSha: HEAD_SHA }])
    vi.mocked(getBranchHeadSha).mockResolvedValue(HEAD_SHA)
    const app = makeApp({ branchToSync: toBranchName("release/2026-q2") })

    const result = await resolveLatestTag(mockGitlab, app, false, DEFAULT_TAG_FORMAT, [
      toTagName(OLD_TAG),
    ])

    expect(result.trackedHeadTagNames.size).toBe(0)
  })
})
