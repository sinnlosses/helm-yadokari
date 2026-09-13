import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { validateTagFormat } from "../../../../src/domain/tag-format.js"
import { toBranchName, toCommitSha, toTagName } from "../../../../src/domain/types.js"
import { resolveLatestTag } from "../../../../src/steps/resolve-tags/sub-steps/resolve-latest-tag.js"
import { HEAD_SHA, NEW_TAG, OLD_TAG, makeAdapter, makeTagSource } from "../../../helpers.js"

const adapter = makeAdapter()

describe("resolveLatestTag", () => {
  beforeEach(() => {
    vi.mocked(adapter.listTags).mockResolvedValue([{ name: NEW_TAG, commitSha: HEAD_SHA }])
    vi.mocked(adapter.getBranchHeadSha).mockResolvedValue(HEAD_SHA)
    vi.mocked(adapter.createTag).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("HEADと一致する既存タグを再利用して新しいタグは作らない", async () => {
    const resolution = await resolveLatestTag(adapter, makeTagSource(), false)

    expect(resolution.tag.name).toBe(NEW_TAG)
    expect(adapter.createTag).not.toHaveBeenCalled()
  })

  it("追跡ブランチ由来のタグが見つからないとき、追跡ブランチに新しいタグを作成する", async () => {
    vi.mocked(adapter.listTags).mockResolvedValue([
      { name: toTagName("other-branch-build-at-20260101-000000"), commitSha: HEAD_SHA },
    ])

    const resolution = await resolveLatestTag(adapter, makeTagSource(), false)

    expect(adapter.createTag).toHaveBeenCalledOnce()
    expect(vi.mocked(adapter.createTag).mock.calls[0]?.[1]).toBe(resolution.tag.name)
    expect(vi.mocked(adapter.createTag).mock.calls[0]?.[2]).toBe("main")
  })

  it("tagFormatに別の形式を渡すと、その形式で新しいタグを作成する", async () => {
    vi.mocked(adapter.listTags).mockResolvedValue([])
    const source = makeTagSource({ tagFormat: validateTagFormat("{date}-{time}-{branch}") })

    const resolution = await resolveLatestTag(adapter, source, false)

    expect(resolution.tag.name).toMatch(/^\d{8}-\d{6}-main$/)
    expect(vi.mocked(adapter.createTag).mock.calls[0]?.[1]).toMatch(/^\d{8}-\d{6}-main$/)
  })

  it("最新タグが追跡ブランチの現在のHEADコミットにビハインドしているとき、新しいタグを作成する", async () => {
    // タグ名はパースできるが、コミットSHAが現在のブランチHEADと異なる
    // （＝タグ作成後に追跡ブランチへ新しいコミットが積まれた）ケース
    vi.mocked(adapter.listTags).mockResolvedValue([
      { name: NEW_TAG, commitSha: toCommitSha("old-sha") },
    ])

    await resolveLatestTag(adapter, makeTagSource(), false)

    expect(adapter.createTag).toHaveBeenCalledOnce()
  })

  it("HEADを指すタグが複数あるとき、タグ名の日時が最も新しいものを返す（決定性のための規則）", async () => {
    // いずれもHEADと同じコミットを指すため中身は同じだが、どれを返すかは決定性のために
    // タグ名の日時で決める。新規タグ作成は発生しない。
    vi.mocked(adapter.listTags).mockResolvedValue([
      { name: toTagName(OLD_TAG), commitSha: HEAD_SHA },
      { name: NEW_TAG, commitSha: HEAD_SHA },
    ])

    const resolution = await resolveLatestTag(adapter, makeTagSource(), false)

    expect(resolution.tag.name).toBe(NEW_TAG)
    expect(adapter.createTag).not.toHaveBeenCalled()
  })

  it("HEADに既存タグがあれば、別コミットを指すより新しい名前のタグがあっても新規タグを作らない", async () => {
    // OLD_TAG は現在のHEADを指しているが、タグ名の日時としては古い。NEW_TAG はタグ名の
    // 日時としては新しいが、HEADではない別コミットを指している（例: HEADへのタグ付け後、
    // 別ブランチや過去のコミットに対して後からタグが打たれたケース）。
    vi.mocked(adapter.listTags).mockResolvedValue([
      { name: toTagName(OLD_TAG), commitSha: HEAD_SHA },
      { name: NEW_TAG, commitSha: toCommitSha("other-commit-sha") },
    ])

    const resolution = await resolveLatestTag(adapter, makeTagSource(), false)

    expect(resolution.tag.name).toBe(OLD_TAG)
    expect(adapter.createTag).not.toHaveBeenCalled()
  })

  it("追跡ブランチを変更したとき、変更後ブランチのHEADに既存タグがあればそれを再利用する", async () => {
    // 切り替えを明示するためだけの新規タグは作らない（タグ名に切り替え後のブランチ名が
    // 入るため、values.yaml から追跡先が変わったことは読み取れる）
    const existingTag = toTagName("release-2026-q2-build-at-20260101-000000")
    vi.mocked(adapter.listTags).mockResolvedValue([{ name: existingTag, commitSha: HEAD_SHA }])
    const source = makeTagSource({ branchToSync: toBranchName("release/2026-q2") })

    const resolution = await resolveLatestTag(adapter, source, false)

    expect(resolution.tag.name).toBe(existingTag)
    expect(adapter.createTag).not.toHaveBeenCalled()
  })

  it("dryRun=true のとき、HEADにタグが無くても実際のタグ作成はしない", async () => {
    // 作成予定の名前だけを使って以降の判定を続ける
    vi.mocked(adapter.listTags).mockResolvedValue([])

    const resolution = await resolveLatestTag(adapter, makeTagSource(), true)

    expect(adapter.createTag).not.toHaveBeenCalled()
    expect(resolution.tag.branchName).toBe("main")
  })

  it("追跡ブランチが存在しないとき、タグを作成せずエラーを投げる", async () => {
    vi.mocked(adapter.getBranchHeadSha).mockResolvedValue(undefined)

    await expect(resolveLatestTag(adapter, makeTagSource(), false)).rejects.toThrow(
      /追跡ブランチ "main"/,
    )
    expect(adapter.createTag).not.toHaveBeenCalled()
  })
})

describe("resolveLatestTag（trackedHeadTagNamesの中身）", () => {
  beforeEach(() => {
    vi.mocked(adapter.getBranchHeadSha).mockResolvedValue(HEAD_SHA)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("追跡ブランチ由来かつHEADと同じコミットを指すタグ名だけを含む", async () => {
    // 同じコミット(HEAD_SHA)を指すタグが2件あるが、他ブランチ由来のものはパースできないため
    // 集合には含まれない。コミットが違うタグ（OLD_TAG）も含まれない
    vi.mocked(adapter.listTags).mockResolvedValue([
      { name: NEW_TAG, commitSha: HEAD_SHA },
      { name: toTagName("other-branch-build-at-20260101-000000"), commitSha: HEAD_SHA },
      { name: toTagName(OLD_TAG), commitSha: toCommitSha("older-sha") },
    ])

    const resolution = await resolveLatestTag(adapter, makeTagSource(), false)

    expect([...resolution.trackedHeadTagNames]).toEqual([NEW_TAG])
  })

  it("追跡ブランチを切り替えた直後は、切り替え前のタグ名がHEADと同じコミットを指していても含まない", async () => {
    // release/2026-q2 に切り替えた直後、切り替え前(main)のタグがrelease/2026-q2のHEADと
    // たまたま同じコミットを指しているケース。tagFormatではrelease/2026-q2由来として
    // パースできないため、trackedHeadTagNamesは空になる（＝反映済みタグがHEADを指していても
    // 更新をスキップしない）
    vi.mocked(adapter.listTags).mockResolvedValue([
      { name: toTagName(OLD_TAG), commitSha: HEAD_SHA },
    ])
    const source = makeTagSource({ branchToSync: toBranchName("release/2026-q2") })

    const resolution = await resolveLatestTag(adapter, source, false)

    expect(resolution.trackedHeadTagNames.size).toBe(0)
  })
})
