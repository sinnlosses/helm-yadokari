import { describe, expect, it, vi } from "vitest"

import {
  toAccessTokenEnvName,
  toBranchName,
  toChartDirName,
  toProjectId,
  toProjectName,
} from "../../../src/domain/types.js"
import type { ChartRepoConfig } from "../../../src/domain/types.js"
import type { AdaptersByAccessToken } from "../../../src/lib/platform/routed-adapter.js"
import { createRoutedAdapter } from "../../../src/lib/platform/routed-adapter.js"
import { makeAdapter, makeApp, makeConfigUnit, makeHttpError } from "../../helpers.js"

const TEAM_B = toAccessTokenEnvName("ACCESS_TOKEN_TEAM_B")
const TEAM_C = toAccessTokenEnvName("ACCESS_TOKEN_TEAM_C")

/** `makeConfigUnit()`が固定で使う`chartRepo.projectId`を、テストごとのProjectIdに差し替える */
function chartRepoFor(projectId: ReturnType<typeof toProjectId>): ChartRepoConfig {
  return { projectId, projectName: toProjectName("chart"), mrTargetBranch: toBranchName("develop") }
}

describe("createRoutedAdapter", () => {
  it("accessTokenEnvの宣言が無い設定ユニットのProjectIdはfallbackへ振り分ける", async () => {
    const fallback = makeAdapter()
    const projectId = toProjectId("1")
    vi.mocked(fallback.listTags).mockResolvedValue([])
    const configUnit = makeConfigUnit([makeApp({ projectId })], {
      chartRepo: chartRepoFor(projectId),
    })
    const adapters: AdaptersByAccessToken = { declared: new Map(), fallback }

    const adapter = createRoutedAdapter([configUnit], adapters)
    await adapter.listTags(projectId)

    expect(fallback.listTags).toHaveBeenCalledWith(projectId)
  })

  it("accessTokenEnvが宣言された設定ユニットのProjectIdはそのトークンのアダプタへ振り分ける", async () => {
    const fallback = makeAdapter()
    const teamBAdapter = makeAdapter()
    const projectId = toProjectId("2")
    vi.mocked(teamBAdapter.listTags).mockResolvedValue([])
    const configUnit = makeConfigUnit([makeApp({ projectId })], {
      chartRepo: chartRepoFor(projectId),
      accessTokenEnv: TEAM_B,
    })
    const adapters: AdaptersByAccessToken = {
      declared: new Map([[TEAM_B, teamBAdapter]]),
      fallback,
    }

    const adapter = createRoutedAdapter([configUnit], adapters)
    await adapter.listTags(projectId)

    expect(teamBAdapter.listTags).toHaveBeenCalledWith(projectId)
    expect(fallback.listTags).not.toHaveBeenCalled()
  })

  it("対応表に無いProjectIdを呼ぶと例外を投げる", async () => {
    const fallback = makeAdapter()
    const configUnit = makeConfigUnit([makeApp({ projectId: toProjectId("1") })], {
      chartRepo: chartRepoFor(toProjectId("1")),
    })
    const adapter = createRoutedAdapter([configUnit], { declared: new Map(), fallback })

    await expect(adapter.listTags(toProjectId("999"))).rejects.toThrow("999")
  })

  it("宣言の無い設定ユニットがあるのにfallbackが無いと組み立て時に例外を投げる", () => {
    const configUnit = makeConfigUnit([makeApp()], {
      chartDirName: toChartDirName("no-token-chart"),
    })

    expect(() =>
      createRoutedAdapter([configUnit], { declared: new Map(), fallback: undefined }),
    ).toThrow("no-token-chart")
  })

  it("宣言トークンのアダプタが401を返すと、chart名・環境変数名・HTTP 401を含む素のErrorに読み替える", async () => {
    const teamBAdapter = makeAdapter()
    const projectId = toProjectId("2")
    vi.mocked(teamBAdapter.listTags).mockRejectedValue(makeHttpError(401))
    const configUnit = makeConfigUnit([makeApp({ projectId })], {
      chartDirName: toChartDirName("team-b-chart"),
      chartRepo: chartRepoFor(projectId),
      accessTokenEnv: TEAM_B,
    })
    const adapters: AdaptersByAccessToken = {
      declared: new Map([[TEAM_B, teamBAdapter]]),
      fallback: undefined,
    }
    const adapter = createRoutedAdapter([configUnit], adapters)

    const err: unknown = await adapter.listTags(projectId).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toMatch(/team-b-chart/)
    expect((err as Error).message).toMatch(/ACCESS_TOKEN_TEAM_B/)
    expect((err as Error).message).toMatch(/HTTP 401/)
    // 読み替え後はHTTPの構造を持たないため、isFatalError / extractHttpStatus が自然に偽・undefinedになる
    expect(adapter.extractHttpStatus(err)).toBeUndefined()
    expect(adapter.isFatalError(err)).toBe(false)
  })

  it("宣言した環境変数が未設定（declaredに無い）だと呼び出しで素のErrorを投げる", async () => {
    const projectId = toProjectId("3")
    const configUnit = makeConfigUnit([makeApp({ projectId })], {
      chartDirName: toChartDirName("team-c-chart"),
      chartRepo: chartRepoFor(projectId),
      accessTokenEnv: TEAM_C,
    })
    // 代表（buildTagUrl等）を解決できるよう、他に動くアダプタが最低1つある状態にする
    // （このテストが確かめたいのはteam-c向けの呼び出しだけが失敗すること）
    const adapters: AdaptersByAccessToken = { declared: new Map(), fallback: makeAdapter() }
    const adapter = createRoutedAdapter([configUnit], adapters)

    const err: unknown = await adapter.listTags(projectId).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toMatch(/team-c-chart/)
    expect((err as Error).message).toMatch(/ACCESS_TOKEN_TEAM_C/)
  })

  it("fallback経由の401は読み替えずそのまま投げる", async () => {
    const fallback = makeAdapter()
    const projectId = toProjectId("1")
    vi.mocked(fallback.listTags).mockRejectedValue(makeHttpError(401))
    const configUnit = makeConfigUnit([makeApp({ projectId })], {
      chartRepo: chartRepoFor(projectId),
    })
    const adapter = createRoutedAdapter([configUnit], { declared: new Map(), fallback })

    const err: unknown = await adapter.listTags(projectId).catch((e: unknown) => e)
    expect(adapter.extractHttpStatus(err)).toBe(401)
    expect(adapter.isFatalError(err)).toBe(true)
  })

  it("buildTagUrl・buildCompareUrl・isFatalError・extractHttpStatusはfallbackを代表にする", () => {
    const fallback = makeAdapter()
    const teamBAdapter = makeAdapter()
    const configUnit = makeConfigUnit([makeApp()])
    const adapter = createRoutedAdapter([configUnit], {
      declared: new Map([[TEAM_B, teamBAdapter]]),
      fallback,
    })

    expect(adapter.buildTagUrl).toBe(fallback.buildTagUrl)
    expect(adapter.buildCompareUrl).toBe(fallback.buildCompareUrl)
    expect(adapter.isFatalError).toBe(fallback.isFatalError)
    expect(adapter.extractHttpStatus).toBe(fallback.extractHttpStatus)
  })

  it("fallbackが無いときはdeclaredの先頭を代表にする", () => {
    const teamBAdapter = makeAdapter()
    const projectId = toProjectId("2")
    const configUnit = makeConfigUnit([makeApp({ projectId })], {
      chartRepo: chartRepoFor(projectId),
      accessTokenEnv: TEAM_B,
    })
    const adapter = createRoutedAdapter([configUnit], {
      declared: new Map([[TEAM_B, teamBAdapter]]),
      fallback: undefined,
    })

    expect(adapter.buildTagUrl).toBe(teamBAdapter.buildTagUrl)
  })
})
