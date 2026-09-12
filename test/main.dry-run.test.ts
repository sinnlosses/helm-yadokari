import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// GitLabクライアントの生成そのものを通したいので、`src/lib/gitlab/gitlab.js` ではなく
// **gitbeaker の境界**でモックする（`main.test.ts` と同居できないのはモックの範囲が違うため）。
// こうすると「新しい書き込みAPIを足したのに dry-run を考え忘れた」ケースも、
// 個々のラッパ関数を列挙し直さずに検知できる。
vi.mock("@gitbeaker/rest")
vi.mock("../src/lib/config/config.js")
vi.mock("../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { Gitlab } from "@gitbeaker/rest"

import { DEFAULT_CONFIG_ROOT_PATH, loadConfig } from "../src/lib/config/config.js"
import type { EnvConfig } from "../src/lib/env.js"
import { run } from "../src/main.js"
import { toAccessToken, toPlatformUrl } from "../src/types/types.js"
import { makeApp, makeConfigUnit } from "./helpers.js"

const OLD_TAG = "main-build-at-20251231-000000"

const env: EnvConfig = {
  platform: "gitlab",
  platformUrl: toPlatformUrl("https://gitlab.test"),
  accessToken: toAccessToken("test-token"),
  configRootPath: DEFAULT_CONFIG_ROOT_PATH,
  concurrencyLimit: 3,
  dryRun: true,
  targetChart: undefined,
  targetUnits: undefined,
}

/**
 * 追跡ブランチのHEADを指すタグが1本も無く（＝タグを作る経路に入る）、values.yamlの現在値が
 * 古い（＝コミットとMRを作る経路に入る）状態。dryRunでなければ書き込みが必ず起きる入力にする。
 */
function makeFakeGitlab() {
  return {
    Tags: { all: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}) },
    Branches: {
      show: vi.fn().mockResolvedValue({ commit: { id: "head-sha" } }),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    RepositoryFiles: {
      show: vi.fn().mockResolvedValue({
        content: Buffer.from(`variables:\n  - &appVersion ${OLD_TAG}\n`).toString("base64"),
      }),
    },
    MergeRequests: {
      all: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
    Commits: { create: vi.fn().mockResolvedValue({}) },
    Projects: { show: vi.fn().mockResolvedValue({ web_url: "https://gitlab.test/g/my-app" }) },
    Pipelines: {
      showLatest: vi.fn().mockResolvedValue({ web_url: "https://gitlab.test/g/my-app/-/p/1" }),
    },
  }
}

/** GitLabの状態を変える呼び出し。ここに挙げたものが dry-run で1回も呼ばれてはいけない */
function writeCalls(gitlab: ReturnType<typeof makeFakeGitlab>) {
  return {
    "Tags.create": gitlab.Tags.create,
    "Branches.remove": gitlab.Branches.remove,
    "Commits.create": gitlab.Commits.create,
    "MergeRequests.create": gitlab.MergeRequests.create,
  }
}

describe("run（DRY_RUN=true）", () => {
  let gitlab: ReturnType<typeof makeFakeGitlab>

  beforeEach(() => {
    gitlab = makeFakeGitlab()
    // アロー関数は `new` できないので、コンストラクタとして呼べる関数を渡す
    vi.mocked(Gitlab).mockImplementation(function () {
      return gitlab
    } as never)
    vi.mocked(loadConfig).mockReturnValue({
      configUnits: [makeConfigUnit([makeApp()])],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("GitLabの状態を変える呼び出しが1つも起きない", async () => {
    await expect(run(env)).resolves.toBe("SUCCESS")

    for (const [name, call] of Object.entries(writeCalls(gitlab))) {
      expect(call, `${name} が呼ばれた`).not.toHaveBeenCalled()
    }
  })

  it("dry_run を理由にSKIPPEDとして計上する（更新予定が有るのに書かなかったことの裏付け）", async () => {
    const { logger } = await import("../src/utils/logger.js")
    await run(env)

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ result: "SKIPPED", reason: "dry_run" }),
    )
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "summary", CREATED: 0, SKIPPED: 1, ERROR: 0 }),
    )
  })

  it("同じ入力で DRY_RUN=false なら書き込みが起きる（上の検証が素通りでないことの裏付け）", async () => {
    await expect(run({ ...env, dryRun: false })).resolves.toBe("SUCCESS")

    expect(gitlab.Tags.create).toHaveBeenCalled()
    expect(gitlab.Commits.create).toHaveBeenCalled()
    expect(gitlab.MergeRequests.create).toHaveBeenCalled()
  })
})
