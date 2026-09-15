import { describe, expect, it, vi } from "vitest"

import {
  toAccessTokenEnvName,
  toBranchName,
  toChartDirName,
  toProjectId,
  toProjectName,
} from "../../../src/domain/types.js"
import type { ChartRepoConfig } from "../../../src/domain/types.js"
import { createRoutedAdapter } from "../../../src/lib/platform/routed-adapter.js"
import { makeAdapter, makeApp, makeConfigUnit, makeHttpError } from "../../helpers.js"

const TEAM_B = toAccessTokenEnvName("ACCESS_TOKEN_TEAM_B")
const TEAM_C = toAccessTokenEnvName("ACCESS_TOKEN_TEAM_C")

/** `makeConfigUnit()`が固定で使う`chartRepo.projectId`を、テストごとのProjectIdに差し替える */
function chartRepoFor(projectId: ReturnType<typeof toProjectId>): ChartRepoConfig {
  return { projectId, projectName: toProjectName("chart"), mrTargetBranch: toBranchName("develop") }
}

describe("createRoutedAdapter", () => {
  it("設定ユニットのProjectIdを、それが宣言したaccessTokenEnvのアダプタへ振り分ける", async () => {
    const teamBAdapter = makeAdapter()
    const teamCAdapter = makeAdapter()
    const projectIdB = toProjectId("2")
    const projectIdC = toProjectId("3")
    vi.mocked(teamBAdapter.listTags).mockResolvedValue([])
    const configUnitB = makeConfigUnit([makeApp({ projectId: projectIdB })], {
      chartRepo: chartRepoFor(projectIdB),
      accessTokenEnv: TEAM_B,
    })
    const configUnitC = makeConfigUnit([makeApp({ projectId: projectIdC })], {
      chartRepo: chartRepoFor(projectIdC),
      accessTokenEnv: TEAM_C,
    })

    const adapter = createRoutedAdapter(
      [configUnitB, configUnitC],
      new Map([
        [TEAM_B, teamBAdapter],
        [TEAM_C, teamCAdapter],
      ]),
    )
    await adapter.listTags(projectIdB)

    expect(teamBAdapter.listTags).toHaveBeenCalledWith(projectIdB)
    expect(teamCAdapter.listTags).not.toHaveBeenCalled()
  })

  it("対応表に無いProjectIdを呼ぶと例外を投げる", async () => {
    const projectId = toProjectId("1")
    const configUnit = makeConfigUnit([makeApp({ projectId })], {
      chartRepo: chartRepoFor(projectId),
      accessTokenEnv: TEAM_B,
    })
    const adapter = createRoutedAdapter([configUnit], new Map([[TEAM_B, makeAdapter()]]))

    await expect(adapter.listTags(toProjectId("999"))).rejects.toThrow("999")
  })

  it("読めたトークンが1つも無いと、chart名と環境変数名を並べた例外を組み立て時に投げる", () => {
    const projectIdA = toProjectId("10")
    const projectIdB = toProjectId("20")
    const configUnitA = makeConfigUnit([makeApp({ projectId: projectIdA })], {
      chartDirName: toChartDirName("yadokari-smoke-test-chart"),
      chartRepo: chartRepoFor(projectIdA),
      accessTokenEnv: toAccessTokenEnvName("ACCESS_TOKEN_SMOKE"),
    })
    const configUnitB = makeConfigUnit([makeApp({ projectId: projectIdB })], {
      chartDirName: toChartDirName("yadokari-smoke-test-chart2"),
      chartRepo: chartRepoFor(projectIdB),
      accessTokenEnv: toAccessTokenEnvName("ACCESS_TOKEN_SMOKE"),
    })

    expect(() => createRoutedAdapter([configUnitA, configUnitB], new Map())).toThrow(
      /yadokari-smoke-test-chart\].*ACCESS_TOKEN_SMOKE.*yadokari-smoke-test-chart2\].*ACCESS_TOKEN_SMOKE/s,
    )
  })

  it("401は、chart名・環境変数名・HTTP 401を含む素のErrorに読み替える", async () => {
    const teamBAdapter = makeAdapter()
    const projectId = toProjectId("2")
    vi.mocked(teamBAdapter.listTags).mockRejectedValue(makeHttpError(401))
    const configUnit = makeConfigUnit([makeApp({ projectId })], {
      chartDirName: toChartDirName("team-b-chart"),
      chartRepo: chartRepoFor(projectId),
      accessTokenEnv: TEAM_B,
    })
    const adapter = createRoutedAdapter([configUnit], new Map([[TEAM_B, teamBAdapter]]))

    const err: unknown = await adapter.listTags(projectId).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toMatch(/team-b-chart/)
    expect((err as Error).message).toMatch(/ACCESS_TOKEN_TEAM_B/)
    expect((err as Error).message).toMatch(/HTTP 401/)
    // 読み替え後はHTTPの構造を持たないため、isFatalError / extractHttpStatus が自然に偽・undefinedになる
    expect(adapter.extractHttpStatus(err)).toBeUndefined()
    expect(adapter.isFatalError(err)).toBe(false)
  })

  it("5xxは読み替えずそのまま投げる（プラットフォーム側の障害は従来どおり即時終了させるため）", async () => {
    const teamBAdapter = makeAdapter()
    const projectId = toProjectId("2")
    vi.mocked(teamBAdapter.listTags).mockRejectedValue(makeHttpError(503))
    const configUnit = makeConfigUnit([makeApp({ projectId })], {
      chartRepo: chartRepoFor(projectId),
      accessTokenEnv: TEAM_B,
    })
    const adapter = createRoutedAdapter([configUnit], new Map([[TEAM_B, teamBAdapter]]))

    const err: unknown = await adapter.listTags(projectId).catch((e: unknown) => e)
    expect(adapter.extractHttpStatus(err)).toBe(503)
    expect(adapter.isFatalError(err)).toBe(true)
  })

  it("宣言した環境変数が未設定（表に無い）だと呼び出しで素のErrorを投げる", async () => {
    const projectIdB = toProjectId("2")
    const projectIdC = toProjectId("3")
    // 代表（buildTagUrl等）を解決できるよう、他に読めたトークンが最低1つある状態にする
    // （このテストが確かめたいのはteam-c向けの呼び出しだけが失敗すること）
    const configUnitB = makeConfigUnit([makeApp({ projectId: projectIdB })], {
      chartRepo: chartRepoFor(projectIdB),
      accessTokenEnv: TEAM_B,
    })
    const configUnitC = makeConfigUnit([makeApp({ projectId: projectIdC })], {
      chartDirName: toChartDirName("team-c-chart"),
      chartRepo: chartRepoFor(projectIdC),
      accessTokenEnv: TEAM_C,
    })
    const adapter = createRoutedAdapter(
      [configUnitB, configUnitC],
      new Map([[TEAM_B, makeAdapter()]]),
    )

    const err: unknown = await adapter.listTags(projectIdC).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toMatch(/team-c-chart/)
    expect((err as Error).message).toMatch(/ACCESS_TOKEN_TEAM_C/)
  })

  it("buildTagUrl・buildCompareUrl・isFatalError・extractHttpStatusは表の先頭を代表にする", () => {
    const teamBAdapter = makeAdapter()
    const teamCAdapter = makeAdapter()
    const projectId = toProjectId("2")
    const configUnit = makeConfigUnit([makeApp({ projectId })], {
      chartRepo: chartRepoFor(projectId),
      accessTokenEnv: TEAM_B,
    })
    const adapter = createRoutedAdapter(
      [configUnit],
      new Map([
        [TEAM_B, teamBAdapter],
        [TEAM_C, teamCAdapter],
      ]),
    )

    expect(adapter.buildTagUrl).toBe(teamBAdapter.buildTagUrl)
    expect(adapter.buildCompareUrl).toBe(teamBAdapter.buildCompareUrl)
    expect(adapter.isFatalError).toBe(teamBAdapter.isFatalError)
    expect(adapter.extractHttpStatus).toBe(teamBAdapter.extractHttpStatus)
  })
})
