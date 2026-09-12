import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../src/lib/gitlab/gitlab.js")
vi.mock("../src/lib/config/config.js")
vi.mock("../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { loadConfig } from "../src/lib/config/config.js"
import { DEFAULT_CONFIG_DIR_PATH } from "../src/lib/config/config.js"
import type { EnvConfig } from "../src/lib/env.js"
import {
  commitFileUpdates,
  createClient,
  createMergeRequest,
  getBranchHeadSha,
  getFileContent,
  getLatestPipelineForRef,
  getProjectWebUrl,
  listTags,
  openMergeRequestExists,
} from "../src/lib/gitlab/gitlab.js"
import { run } from "../src/main.js"
import { toAccessToken, toCommitSha, toGitLabUrl, toTagName } from "../src/types/types.js"
import { FatalError } from "../src/utils/errors.js"
import { makeApp, makeConfigUnit, makeHttpError, mockGitlab } from "./helpers.js"

const env: EnvConfig = {
  gitlabUrl: toGitLabUrl("https://gitlab.test"),
  accessToken: toAccessToken("test-token"),
  configDirPath: DEFAULT_CONFIG_DIR_PATH,
  concurrencyLimit: 3,
  dryRun: false,
  targetChart: undefined,
  targetUnits: undefined,
}

const OLD_TAG = "main-build-at-20251231-000000"
const NEW_TAG = toTagName("main-build-at-20260101-000000")
const HEAD_SHA = toCommitSha("head-sha")

describe("run", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReturnValue(mockGitlab)
    vi.mocked(loadConfig).mockReturnValue({ configUnits: [] })
    vi.mocked(listTags).mockResolvedValue([{ name: NEW_TAG, commitSha: HEAD_SHA }])
    vi.mocked(getBranchHeadSha).mockResolvedValue(HEAD_SHA)
    vi.mocked(getFileContent).mockResolvedValue(`variables:\n  - &appVersion ${OLD_TAG}\n`)
    vi.mocked(openMergeRequestExists).mockResolvedValue(false)
    vi.mocked(getLatestPipelineForRef).mockResolvedValue(undefined)
    vi.mocked(getProjectWebUrl).mockResolvedValue(toGitLabUrl("https://gitlab.test/group/my-app"))
    vi.mocked(commitFileUpdates).mockResolvedValue(undefined)
    vi.mocked(createMergeRequest).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /** summary イベントに載った設定ユニット単位の件数 */
  async function summaryCounts(): Promise<unknown> {
    const { logger } = await import("../src/utils/logger.js")
    const call = vi
      .mocked(logger.info)
      .mock.calls.map(([entry]) => entry as Record<string, unknown>)
      .find((entry) => entry["event"] === "summary")
    return call && { CREATED: call["CREATED"], SKIPPED: call["SKIPPED"], ERROR: call["ERROR"] }
  }

  it('configUnitsがないとき "SUCCESS" を返し、件数は全て0になる', async () => {
    await expect(run(env)).resolves.toBe("SUCCESS")
    await expect(summaryCounts()).resolves.toEqual({ CREATED: 0, SKIPPED: 0, ERROR: 0 })
  })

  it("全件 CREATED のとき正しい件数を集計する", async () => {
    vi.mocked(loadConfig).mockReturnValue({
      configUnits: [makeConfigUnit([makeApp()]), makeConfigUnit([makeApp()])],
    })
    await expect(run(env)).resolves.toBe("SUCCESS")
    await expect(summaryCounts()).resolves.toEqual({ CREATED: 2, SKIPPED: 0, ERROR: 0 })
  })

  it("FatalErrorが発生したとき reject する", async () => {
    vi.mocked(loadConfig).mockReturnValue({ configUnits: [makeConfigUnit([makeApp()])] })
    vi.mocked(listTags).mockRejectedValue(makeHttpError(401))
    await expect(run(env)).rejects.toThrow(FatalError)
  })

  it('ERROR が1件以上あるとき "PARTIAL_FAILURE" を返す', async () => {
    vi.mocked(loadConfig).mockReturnValue({ configUnits: [makeConfigUnit([makeApp()])] })
    vi.mocked(listTags).mockRejectedValue(makeHttpError(403))
    await expect(run(env)).resolves.toBe("PARTIAL_FAILURE")
  })

  it("createClient に GITLAB_URL と ACCESS_TOKEN を渡す", async () => {
    await run(env)
    expect(createClient).toHaveBeenCalledWith("https://gitlab.test", "test-token")
  })

  it("loadConfig に CONFIG_PATH と TARGET_CHART/TARGET_UNITS由来のtargetを渡す", async () => {
    await run(env)
    expect(loadConfig).toHaveBeenCalledWith(DEFAULT_CONFIG_DIR_PATH, {
      chartDirName: undefined,
      units: undefined,
    })
  })

  it("run_start / summary / run_end イベントをログ出力する", async () => {
    const { logger } = await import("../src/utils/logger.js")
    await run(env)
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({ event: "run_start" }),
    )
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({ event: "summary", CREATED: 0, SKIPPED: 0, ERROR: 0 }),
    )
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({ event: "run_end", durationMs: expect.any(Number) }),
    )
  })
})
