import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../src/lib/gitlab/gitlab.js")
vi.mock("../src/lib/config.js")
vi.mock("../src/lib/env.js", () => ({
  GITLAB_URL: "https://gitlab.test",
  ACCESS_TOKEN: "test-token",
  CONFIG_PATH: undefined,
  CONCURRENCY_LIMIT: 3,
  DRY_RUN: false,
  TARGET_CHART_DIR: undefined,
  TARGET_CLIENT: undefined,
}))
vi.mock("../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import { loadConfig } from "../src/lib/config.js"
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
import type { GitlabClient } from "../src/lib/gitlab/gitlab.js"
import { process as processFn, run } from "../src/main.js"
import { toGitLabUrl, toTagName } from "../src/types.js"
import { FatalError } from "../src/utils/errors.js"
import { makeApp, makeChartAndApps, makeHttpError } from "./helpers.js"

const mockGitlab = {} as unknown as GitlabClient

const OLD_TAG = "main-build-at-20251231-000000"
const NEW_TAG = toTagName("main-build-at-20260101-000000")
const HEAD_SHA = "head-sha"

describe("process", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReturnValue(mockGitlab)
    vi.mocked(loadConfig).mockReturnValue({ chartAndAppsList: [] })
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

  it("chartAndAppsListがないとき resolve する", async () => {
    await expect(processFn()).resolves.toEqual({ CREATED: 0, SKIPPED: 0, ERROR: 0 })
  })

  it("全件 CREATED のとき正しい件数を返す", async () => {
    vi.mocked(loadConfig).mockReturnValue({
      chartAndAppsList: [makeChartAndApps([makeApp()]), makeChartAndApps([makeApp()])],
    })
    await expect(processFn()).resolves.toEqual({ CREATED: 2, SKIPPED: 0, ERROR: 0 })
  })

  it("FatalErrorが発生したとき reject する", async () => {
    vi.mocked(loadConfig).mockReturnValue({ chartAndAppsList: [makeChartAndApps([makeApp()])] })
    vi.mocked(listTags).mockRejectedValue(makeHttpError(401))
    await expect(processFn()).rejects.toThrow(FatalError)
  })

  it("createClient に GITLAB_URL と ACCESS_TOKEN を渡す", async () => {
    await processFn()
    expect(createClient).toHaveBeenCalledWith("https://gitlab.test", "test-token")
  })

  it("loadConfig に CONFIG_PATH と TARGET_CHART_DIR/TARGET_CLIENT由来のtargetを渡す", async () => {
    await processFn()
    expect(loadConfig).toHaveBeenCalledWith(undefined, {
      chartDir: undefined,
      clients: undefined,
    })
  })
})

describe("run", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReturnValue(mockGitlab)
    vi.mocked(loadConfig).mockReturnValue({ chartAndAppsList: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('ERROR がないとき "SUCCESS" を返す', async () => {
    await expect(run()).resolves.toBe("SUCCESS")
  })

  it('ERROR が1件以上あるとき "PARTIAL_FAILURE" を返す', async () => {
    vi.mocked(loadConfig).mockReturnValue({ chartAndAppsList: [makeChartAndApps([makeApp()])] })
    vi.mocked(listTags).mockRejectedValue(makeHttpError(403))
    await expect(run()).resolves.toBe("PARTIAL_FAILURE")
  })

  it("run_start / summary / run_end イベントをログ出力する", async () => {
    const { logger } = await import("../src/utils/logger.js")
    await run()
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({ event: "run_start" }),
    )
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({ event: "summary", CREATED: 0, SKIPPED: 0, ERROR: 0 }),
    )
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.objectContaining({ event: "run_end", duration_ms: expect.any(Number) }),
    )
  })
})
