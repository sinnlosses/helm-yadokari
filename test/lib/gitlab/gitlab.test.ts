import { Gitlab } from "@gitbeaker/rest"
import { describe, expect, it, vi } from "vitest"

import type { GitlabClient } from "../../../src/lib/gitlab/gitlab.js"
import {
  UPDATE_BRANCH,
  branchExists,
  buildMrDescription,
  buildMrTitle,
  commitFileUpdates,
  createClient,
  createMergeRequest,
  createTag,
  getFileContent,
  getLatestPipelineForRef,
  getProjectWebUrl,
  listTagNames,
  openMergeRequestExists,
} from "../../../src/lib/gitlab/gitlab.js"
import type { AppUpdatePlan, PipelineInfo } from "../../../src/types.js"
import {
  toBranchName,
  toGitLabUrl,
  toProjectId,
  toProjectName,
  toTagName,
  toValuesPath,
} from "../../../src/types.js"
import { makeApp, makeHttpError } from "../../helpers.js"

function makeClient(
  overrides: Partial<{
    Tags: { all: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
    Branches: { show: ReturnType<typeof vi.fn> }
    RepositoryFiles: { show: ReturnType<typeof vi.fn> }
    MergeRequests: { all: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
    Commits: { create: ReturnType<typeof vi.fn> }
    Pipelines: { showLatest: ReturnType<typeof vi.fn> }
    Projects: { show: ReturnType<typeof vi.fn> }
  }>,
): GitlabClient {
  return {
    Tags: { all: vi.fn(), create: vi.fn(), ...overrides.Tags },
    Branches: { show: vi.fn(), ...overrides.Branches },
    RepositoryFiles: { show: vi.fn(), ...overrides.RepositoryFiles },
    MergeRequests: { all: vi.fn(), create: vi.fn(), ...overrides.MergeRequests },
    Commits: { create: vi.fn(), ...overrides.Commits },
    Pipelines: { showLatest: vi.fn(), ...overrides.Pipelines },
    Projects: { show: vi.fn(), ...overrides.Projects },
  } as unknown as GitlabClient
}

describe("createClient", () => {
  it("Gitlab インスタンスを返す", () => {
    const client = createClient(toGitLabUrl("https://gitlab.example.com"), "test-token")
    expect(client).toBeInstanceOf(Gitlab)
  })
})

describe("listTagNames", () => {
  it("タグ名の一覧を返す", async () => {
    const client = makeClient({
      Tags: {
        all: vi
          .fn()
          .mockResolvedValue([
            { name: "main-build-at-20260101-000000" },
            { name: "main-build-at-20260201-000000" },
          ]),
        create: vi.fn(),
      },
    })
    expect(await listTagNames(client, toProjectId(1))).toEqual([
      "main-build-at-20260101-000000",
      "main-build-at-20260201-000000",
    ])
  })
})

describe("branchExists", () => {
  it("ブランチが存在するとき true を返す", async () => {
    const client = makeClient({ Branches: { show: vi.fn().mockResolvedValue({}) } })
    expect(await branchExists(client, toProjectId(1), toBranchName("main"))).toBe(true)
  })

  it("404 のとき false を返す", async () => {
    const client = makeClient({
      Branches: { show: vi.fn().mockRejectedValue(makeHttpError(404)) },
    })
    expect(await branchExists(client, toProjectId(1), toBranchName("nonexistent"))).toBe(false)
  })

  it("404 以外のエラーは再スローする", async () => {
    const err = makeHttpError(500)
    const client = makeClient({ Branches: { show: vi.fn().mockRejectedValue(err) } })
    await expect(branchExists(client, toProjectId(1), toBranchName("main"))).rejects.toBe(err)
  })
})

describe("getFileContent", () => {
  it("base64デコードした内容を返す", async () => {
    const content = Buffer.from("image:\n  tag: v1.0.0\n", "utf-8").toString("base64")
    const client = makeClient({
      RepositoryFiles: { show: vi.fn().mockResolvedValue({ content }) },
    })
    expect(
      await getFileContent(
        client,
        toProjectId(1),
        toValuesPath("values.yaml"),
        toBranchName("main"),
      ),
    ).toBe("image:\n  tag: v1.0.0\n")
  })

  it("404のとき undefined を返す", async () => {
    const client = makeClient({
      RepositoryFiles: { show: vi.fn().mockRejectedValue(makeHttpError(404)) },
    })
    expect(
      await getFileContent(
        client,
        toProjectId(1),
        toValuesPath("values.yaml"),
        toBranchName("main"),
      ),
    ).toBeUndefined()
  })

  it("404以外のエラーは再スローする", async () => {
    const err = makeHttpError(500)
    const client = makeClient({ RepositoryFiles: { show: vi.fn().mockRejectedValue(err) } })
    await expect(
      getFileContent(client, toProjectId(1), toValuesPath("values.yaml"), toBranchName("main")),
    ).rejects.toBe(err)
  })
})

describe("openMergeRequestExists", () => {
  it("オープン中のMRが存在するとき true を返す", async () => {
    const client = makeClient({
      MergeRequests: { all: vi.fn().mockResolvedValue([{ iid: 1 }]), create: vi.fn() },
    })
    expect(
      await openMergeRequestExists(client, toProjectId(1), toBranchName("yadokari/update")),
    ).toBe(true)
  })

  it("オープン中のMRがないとき false を返す", async () => {
    const client = makeClient({
      MergeRequests: { all: vi.fn().mockResolvedValue([]), create: vi.fn() },
    })
    expect(
      await openMergeRequestExists(client, toProjectId(1), toBranchName("yadokari/update")),
    ).toBe(false)
  })

  it("正しいパラメータで MergeRequests.all を呼び出す", async () => {
    const allFn = vi.fn().mockResolvedValue([])
    const client = makeClient({ MergeRequests: { all: allFn, create: vi.fn() } })
    await openMergeRequestExists(client, toProjectId(42), toBranchName("yadokari/update"))
    expect(allFn).toHaveBeenCalledWith({
      projectId: 42,
      sourceBranch: "yadokari/update",
      state: "opened",
    })
  })
})

describe("commitFileUpdates", () => {
  it("ブランチが存在しないとき startBranch を指定してコミットする", async () => {
    const createFn = vi.fn().mockResolvedValue({})
    const client = makeClient({
      Branches: { show: vi.fn().mockRejectedValue(makeHttpError(404)) },
      Commits: { create: createFn },
    })
    await commitFileUpdates(
      client,
      toProjectId(1),
      toBranchName("yadokari/update"),
      toBranchName("develop"),
      "chore: update",
      [{ filePath: toValuesPath("values.yaml"), content: "image:\n  tag: v2\n" }],
    )
    expect(createFn).toHaveBeenCalledWith(
      1,
      "yadokari/update",
      "chore: update",
      [{ action: "update", filePath: "values.yaml", content: "image:\n  tag: v2\n" }],
      { startBranch: "develop" },
    )
  })

  it("ブランチが既に存在するとき startBranch を指定せずコミットする", async () => {
    const createFn = vi.fn().mockResolvedValue({})
    const client = makeClient({
      Branches: { show: vi.fn().mockResolvedValue({}) },
      Commits: { create: createFn },
    })
    await commitFileUpdates(
      client,
      toProjectId(1),
      toBranchName("yadokari/update"),
      toBranchName("develop"),
      "chore: update",
      [{ filePath: toValuesPath("values.yaml"), content: "image:\n  tag: v2\n" }],
    )
    expect(createFn).toHaveBeenCalledWith(
      1,
      "yadokari/update",
      "chore: update",
      [{ action: "update", filePath: "values.yaml", content: "image:\n  tag: v2\n" }],
      {},
    )
  })

  it("複数ファイルのactionsをまとめて送る", async () => {
    const createFn = vi.fn().mockResolvedValue({})
    const client = makeClient({
      Branches: { show: vi.fn().mockResolvedValue({}) },
      Commits: { create: createFn },
    })
    await commitFileUpdates(
      client,
      toProjectId(1),
      toBranchName("yadokari/update"),
      toBranchName("develop"),
      "chore: update",
      [
        { filePath: toValuesPath("a/values.yaml"), content: "a" },
        { filePath: toValuesPath("b/values.yaml"), content: "b" },
      ],
    )
    const actions = createFn.mock.calls[0]?.[3]
    expect(actions).toHaveLength(2)
  })
})

describe("createMergeRequest", () => {
  it("正しい引数で MergeRequests.create を呼び出す", async () => {
    const createFn = vi.fn().mockResolvedValue({})
    const client = makeClient({ MergeRequests: { all: vi.fn(), create: createFn } })
    await createMergeRequest(
      client,
      toProjectId(1),
      toBranchName("yadokari/update"),
      toBranchName("develop"),
      "chore: update app versions",
      "description body",
    )
    expect(createFn).toHaveBeenCalledWith(
      1,
      "yadokari/update",
      "develop",
      "chore: update app versions",
      {
        description: "description body",
      },
    )
  })
})

describe("getLatestPipelineForRef", () => {
  it("最新パイプラインの status と webUrl を返す", async () => {
    const client = makeClient({
      Pipelines: {
        showLatest: vi
          .fn()
          .mockResolvedValue({ status: "success", web_url: "https://gitlab.example.com/p/1" }),
      },
    })
    expect(
      await getLatestPipelineForRef(
        client,
        toProjectId(1),
        toTagName("main-build-at-20260101-000000"),
      ),
    ).toEqual({
      status: "success",
      webUrl: "https://gitlab.example.com/p/1",
    })
  })

  it("パイプラインが存在しない(404)とき undefined を返す", async () => {
    const client = makeClient({
      Pipelines: { showLatest: vi.fn().mockRejectedValue(makeHttpError(404)) },
    })
    expect(
      await getLatestPipelineForRef(
        client,
        toProjectId(1),
        toTagName("main-build-at-20260101-000000"),
      ),
    ).toBeUndefined()
  })

  it("パイプラインが1件も無いプロジェクトの(403)のとき undefined を返す", async () => {
    // GitLab実機で確認済みの挙動: pipelines/latestは該当プロジェクトにパイプラインが
    // 1件も無い場合、404ではなく403を返す。パイプライン情報はMR本文への参考情報に
    // すぎず更新処理の必須条件ではないため、404と同様に「パイプライン無し」として扱う
    const client = makeClient({
      Pipelines: { showLatest: vi.fn().mockRejectedValue(makeHttpError(403)) },
    })
    expect(
      await getLatestPipelineForRef(
        client,
        toProjectId(1),
        toTagName("main-build-at-20260101-000000"),
      ),
    ).toBeUndefined()
  })

  it("404/403以外のエラーは再スローする", async () => {
    const err = makeHttpError(500)
    const client = makeClient({ Pipelines: { showLatest: vi.fn().mockRejectedValue(err) } })
    await expect(
      getLatestPipelineForRef(client, toProjectId(1), toTagName("main-build-at-20260101-000000")),
    ).rejects.toBe(err)
  })
})

describe("createTag", () => {
  it("正しい引数で Tags.create を呼び出す", async () => {
    const createFn = vi.fn().mockResolvedValue({})
    const client = makeClient({ Tags: { all: vi.fn(), create: createFn } })
    await createTag(
      client,
      toProjectId(1),
      toTagName("main-build-at-20260101-000000"),
      toBranchName("main"),
    )
    expect(createFn).toHaveBeenCalledWith(1, "main-build-at-20260101-000000", "main")
  })

  it("エラーは再スローする", async () => {
    const err = makeHttpError(422)
    const client = makeClient({ Tags: { all: vi.fn(), create: vi.fn().mockRejectedValue(err) } })
    await expect(
      createTag(
        client,
        toProjectId(1),
        toTagName("main-build-at-20260101-000000"),
        toBranchName("main"),
      ),
    ).rejects.toBe(err)
  })
})

describe("getProjectWebUrl", () => {
  it("プロジェクトの web_url を返す", async () => {
    const client = makeClient({
      Projects: {
        show: vi.fn().mockResolvedValue({ web_url: "https://gitlab.example.com/group/app" }),
      },
    })
    expect(await getProjectWebUrl(client, toProjectId(1))).toBe(
      toGitLabUrl("https://gitlab.example.com/group/app"),
    )
  })
})

describe("UPDATE_BRANCH", () => {
  it("固定のブランチ名を持つ", () => {
    expect(UPDATE_BRANCH).toBe("yadokari/update")
  })
})

function makePlan(overrides: Partial<{ pipeline: PipelineInfo }> = {}): AppUpdatePlan {
  return {
    app: makeApp({ projectId: toProjectId(1), projectName: toProjectName("my-app") }),
    previousTag: toTagName("main-build-at-20251231-000000"),
    latestTag: {
      name: toTagName("main-build-at-20260101-000000"),
      branch: toBranchName("main"),
      builtAt: new Date("2026-01-01T00:00:00Z"),
    },
    pipeline: overrides.pipeline,
  }
}

describe("buildMrTitle", () => {
  it("更新対象アプリ数を含むタイトルを組み立てる", () => {
    expect(buildMrTitle([makePlan(), makePlan()])).toBe("chore: update 2 app image tag(s)")
  })

  it("0件のときも組み立てる", () => {
    expect(buildMrTitle([])).toBe("chore: update 0 app image tag(s)")
  })
})

describe("buildMrDescription", () => {
  it("アプリ名・旧タグ→新タグ・打刻日時を含む", async () => {
    const client = makeClient({
      Projects: {
        show: vi.fn().mockResolvedValue({ web_url: "https://gitlab.example.com/g/my-app" }),
      },
    })
    const description = await buildMrDescription(client, [makePlan()])
    expect(description).toContain("my-app")
    expect(description).toContain("main-build-at-20251231-000000")
    expect(description).toContain("main-build-at-20260101-000000")
    expect(description).toContain("2026-01-01T00:00:00.000Z")
  })

  it("パイプライン情報があるとき、その状態とリンクを含める", async () => {
    const client = makeClient({
      Projects: {
        show: vi.fn().mockResolvedValue({ web_url: "https://gitlab.example.com/g/my-app" }),
      },
    })
    const description = await buildMrDescription(client, [
      makePlan({
        pipeline: { webUrl: toGitLabUrl("https://gitlab.example.com/p/1"), status: "success" },
      }),
    ])
    expect(description).toContain("success")
    expect(description).toContain("https://gitlab.example.com/p/1")
  })

  it("パイプライン情報がないとき、見つからない旨を含める", async () => {
    const client = makeClient({
      Projects: {
        show: vi.fn().mockResolvedValue({ web_url: "https://gitlab.example.com/g/my-app" }),
      },
    })
    const description = await buildMrDescription(client, [makePlan()])
    expect(description).toContain("見つかりません")
  })

  it("同じプロジェクトの web_url 取得は1回だけ呼び出す", async () => {
    const showFn = vi.fn().mockResolvedValue({ web_url: "https://gitlab.example.com/g/my-app" })
    const client = makeClient({ Projects: { show: showFn } })
    await buildMrDescription(client, [makePlan(), makePlan()])
    expect(showFn).toHaveBeenCalledOnce()
  })
})
