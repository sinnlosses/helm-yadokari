import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

// GitLabクライアントの生成そのものを通したいので、`src/lib/gitlab/api.js` ではなく
// **gitbeaker の境界**でモックする（`main.test.ts` と同居できないのはモックの範囲が違うため）。
// こうすると「新しい書き込みAPIを足したのに dry-run を考え忘れた」ケースも、
// 個々のラッパ関数を列挙し直さずに検知できる。
vi.mock("@gitbeaker/rest")
vi.mock("../src/lib/config/config.js")
vi.mock("../src/utils/logger.js")

import { Gitlab } from "@gitbeaker/rest"

import { toAccessTokenEnvName, toPlatformUrl, toReportOutputPath } from "../src/domain/types.js"
import { DEFAULT_CONFIG_ROOT_PATH, loadConfig } from "../src/lib/config/config.js"
import type { EnvConfig } from "../src/lib/env.js"
import { run } from "../src/main.js"
import { makeApp, makeConfigUnit, useTmpDir } from "./helpers.js"

const OLD_TAG = "main-build-at-20251231-000000"

/** `makeConfigUnit()`の既定の宣言。`run()`はこの名前のCI/CD変数からトークンを読む */
const TEAM_A = toAccessTokenEnvName("ACCESS_TOKEN_TEAM_A")

const reportDir = useTmpDir()

const env: EnvConfig = {
  platform: "gitlab",
  platformUrl: toPlatformUrl("https://gitlab.test"),
  configRootPath: DEFAULT_CONFIG_ROOT_PATH,
  // テストごとに作り直す一時ディレクトリを指すため、読むたびに組み立てる
  get reportOutputPath() {
    return toReportOutputPath(join(reportDir.relativePath, "report.md"))
  },
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
    Tags: { show: vi.fn(), create: vi.fn().mockResolvedValue({}) },
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
      create: vi
        .fn()
        .mockResolvedValue({ web_url: "https://gitlab.test/g/chart/-/merge_requests/1" }),
    },
    Commits: {
      allReferences: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
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
    vi.stubEnv(TEAM_A, "test-token")
    gitlab = makeFakeGitlab()
    // アロー関数は `new` できないので、コンストラクタとして呼べる関数を渡す
    vi.mocked(Gitlab).mockImplementation(function () {
      return gitlab
    } as never)
    vi.mocked(loadConfig).mockReturnValue({
      configUnits: [makeConfigUnit([makeApp()])],
      accessTokenEnvNames: [TEAM_A],
    })
  })

  it("dryRunでもレポートを書き出す（headerにdryRun: trueが載る）", async () => {
    await expect(run(env)).resolves.toBe("SUCCESS")

    expect(existsSync(env.reportOutputPath)).toBe(true)
    expect(readFileSync(env.reportOutputPath, "utf-8")).toContain("- dryRun: true")
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

  it("HEADにタグが無く新規作成予定のアプリは、計画のログでoriginがcreatedになる", async () => {
    // makeFakeGitlab()はCommits.allReferencesが空配列（＝HEADを指すタグが1件も無い）状態にしているため、
    // resolveLatestTag()は新規タグ作成の経路に入る。dry-runなので実際の作成はしない
    const { logger } = await import("../src/utils/logger.js")
    await run(env)

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "SKIPPED",
        reason: "dry_run",
        apps: expect.arrayContaining([expect.objectContaining({ origin: "created" })]),
      }),
    )
  })

  it("同じ入力で DRY_RUN=false なら書き込みが起きる（上の検証が素通りでないことの裏付け）", async () => {
    await expect(run({ ...env, dryRun: false })).resolves.toBe("SUCCESS")

    expect(gitlab.Tags.create).toHaveBeenCalled()
    expect(gitlab.Commits.create).toHaveBeenCalled()
    expect(gitlab.MergeRequests.create).toHaveBeenCalled()
  })
})
