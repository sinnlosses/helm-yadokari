import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { buildTagSourceKey } from "../../../src/domain/tag-source.js"
import {
  toBranchName,
  toCommitSha,
  toConfigUnitPath,
  toProjectId,
  toProjectName,
  toTagName,
} from "../../../src/domain/types.js"
import { buildPlans } from "../../../src/steps/build-plans/build-plans.js"
import { resolveTags } from "../../../src/steps/resolve-tags/resolve-tags.js"
import { FatalError } from "../../../src/utils/errors.js"
import { logger } from "../../../src/utils/logger.js"
import {
  HEAD_SHA,
  NEW_TAG,
  OLD_TAG,
  makeAdapter,
  makeAdapterWithCachedReads,
  makeApp,
  makeConfigUnit,
  makeHttpError,
  mockBuildPlansAdapter,
} from "../../helpers.js"

const adapter = makeAdapter()

describe("resolveTags（解決の単位ごとに1回だけ解決する）", () => {
  beforeEach(() => {
    vi.mocked(adapter.getBranchHeadSha).mockResolvedValue(HEAD_SHA)
    vi.mocked(adapter.createTag).mockResolvedValue(undefined)
    // HEADを指すタグが1件も無い状態にして、タグの自動作成を走らせる
    vi.mocked(adapter.listTags).mockResolvedValue([
      { name: toTagName(OLD_TAG), commitSha: toCommitSha("older-sha") },
    ])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("同じapp（projectId+追跡ブランチ+tagFormat）が複数の設定ユニットに登録されていても解決は1回だけ行う", async () => {
    // タグ名は秒精度なので、設定ユニットごとにタグを作ると同名で2件目以降が失敗するか、
    // 秒をまたいで同じコミットに冗長なタグが並ぶ
    const appA = makeApp()
    const appB = makeApp()
    const appC = makeApp()
    const targets = [
      makeConfigUnit([appA], { unitPath: toConfigUnitPath("tenant1/clientA") }),
      makeConfigUnit([appB], { unitPath: toConfigUnitPath("tenant1/clientB") }),
      makeConfigUnit([appC], { unitPath: toConfigUnitPath("tenant1/clientC") }),
    ]

    const resolvedTags = await resolveTags(adapter, targets, 3, false)

    expect(adapter.listTags).toHaveBeenCalledTimes(1)
    expect(adapter.getBranchHeadSha).toHaveBeenCalledTimes(1)
    expect(adapter.createTag).toHaveBeenCalledTimes(1)
    // 別インスタンスのapp（appA/appB/appC）でも同じ解決単位を表す値キーは1件にまとまり、
    // 3つの設定ユニットのappすべてがその1件を引き当てられる
    expect(resolvedTags.size).toBe(1)
    const outcome = resolvedTags.get(buildTagSourceKey(appA))
    expect(outcome).toBeDefined()
    expect(resolvedTags.get(buildTagSourceKey(appB))).toBe(outcome)
    expect(resolvedTags.get(buildTagSourceKey(appC))).toBe(outcome)
  })

  it("追跡ブランチが違えば別々に解決する", async () => {
    const targets = [
      makeConfigUnit([makeApp()], { unitPath: toConfigUnitPath("tenant1/clientA") }),
      makeConfigUnit([makeApp({ branchToSync: toBranchName("release/2026-q2") })], {
        unitPath: toConfigUnitPath("tenant1/clientB"),
      }),
    ]

    await resolveTags(adapter, targets, 3, false)

    expect(adapter.listTags).toHaveBeenCalledTimes(2)
    expect(adapter.createTag).toHaveBeenCalledTimes(2)
  })
})

describe("resolveTags（解決の失敗）", () => {
  beforeEach(() => {
    mockBuildPlansAdapter(adapter)
    vi.mocked(adapter.getBranchHeadSha).mockResolvedValue(HEAD_SHA)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("1つのappの解決が失敗したとき、そのappを含む全設定ユニットがERRORになり、他の設定ユニットは続行する", async () => {
    const appFail = makeApp({ projectId: toProjectId("1"), projectName: toProjectName("app-fail") })
    const appOk = makeApp({ projectId: toProjectId("2"), projectName: toProjectName("app-ok") })
    const targets = [
      makeConfigUnit([appFail], { unitPath: toConfigUnitPath("tenant1/clientA") }),
      makeConfigUnit([appFail], { unitPath: toConfigUnitPath("tenant1/clientB") }),
      makeConfigUnit([appOk], { unitPath: toConfigUnitPath("tenant1/clientC") }),
    ]
    vi.mocked(adapter.listTags).mockImplementation(async (projectId) => {
      if (projectId === "1") throw makeHttpError(403)
      return [{ name: NEW_TAG, commitSha: HEAD_SHA }]
    })

    const resolvedTags = await resolveTags(adapter, targets, 3, false)
    const { toApply, settled } = await buildPlans(
      makeAdapterWithCachedReads(adapter),
      targets,
      resolvedTags,
      3,
      false,
    )

    expect(settled).toEqual(["ERROR", "ERROR"])
    expect(toApply).toHaveLength(1)
    expect(toApply[0]?.configUnit).toBe(targets[2])
    // 失敗したappの解決は設定ユニットごとに再試行しない（再試行はクライアント層のwithRetry()が持つ）
    expect(adapter.listTags).toHaveBeenCalledTimes(2)
    // どのappで失敗したかは、値として持ち回った後もERRORログに残る
    expect(vi.mocked(logger.error).mock.calls[0]?.[0]?.reason).toContain("app-fail")
  })

  it("401エラーのとき FatalError を投げ、未着手の解決を実行しない", async () => {
    const targets = [
      makeConfigUnit([makeApp({ projectId: toProjectId("1") })]),
      makeConfigUnit([makeApp({ projectId: toProjectId("2") })]),
    ]
    vi.mocked(adapter.listTags).mockRejectedValue(makeHttpError(401))

    await expect(resolveTags(adapter, targets, 1, false)).rejects.toThrow(FatalError)
    expect(adapter.listTags).toHaveBeenCalledTimes(1)
  })

  it("5xxエラーのとき FatalError を投げる", async () => {
    vi.mocked(adapter.listTags).mockRejectedValue(makeHttpError(503))

    await expect(resolveTags(adapter, [makeConfigUnit([makeApp()])], 3, false)).rejects.toThrow(
      FatalError,
    )
  })
})
