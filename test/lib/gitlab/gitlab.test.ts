import { Gitlab } from "@gitbeaker/rest"
import { describe, expect, it, vi } from "vitest"

import type { GitlabClient } from "../../../src/lib/gitlab/gitlab.js"
import {
  branchExists,
  commitFileUpdates,
  createClient,
  createMergeRequest,
  createTag,
  deleteBranch,
  getBranchHeadSha,
  getFileContent,
  getLatestPipelineForRef,
  getProjectWebUrl,
  listTags,
  openMergeRequestExists,
} from "../../../src/lib/gitlab/gitlab.js"
import {
  toBranchName,
  toGitLabUrl,
  toProjectId,
  toTagName,
  toValuesPath,
} from "../../../src/types.js"
import { makeHttpError } from "../../helpers.js"

function makeClient(
  overrides: Partial<{
    Tags: { all: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
    Branches: { show: ReturnType<typeof vi.fn>; remove?: ReturnType<typeof vi.fn> }
    RepositoryFiles: { show: ReturnType<typeof vi.fn> }
    MergeRequests: { all: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
    Commits: { create: ReturnType<typeof vi.fn> }
    Pipelines: { showLatest: ReturnType<typeof vi.fn> }
    Projects: { show: ReturnType<typeof vi.fn> }
  }>,
): GitlabClient {
  return {
    Tags: { all: vi.fn(), create: vi.fn(), ...overrides.Tags },
    Branches: { show: vi.fn(), remove: vi.fn(), ...overrides.Branches },
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

describe("listTags", () => {
  it("タグ名とコミットSHAの一覧を返す", async () => {
    const client = makeClient({
      Tags: {
        all: vi.fn().mockResolvedValue([
          { name: "main-build-at-20260101-000000", commit: { id: "sha1" } },
          { name: "main-build-at-20260201-000000", commit: { id: "sha2" } },
        ]),
        create: vi.fn(),
      },
    })
    expect(await listTags(client, toProjectId(1))).toEqual([
      { name: "main-build-at-20260101-000000", commitSha: "sha1" },
      { name: "main-build-at-20260201-000000", commitSha: "sha2" },
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

describe("getBranchHeadSha", () => {
  it("ブランチのHEADコミットSHAを返す", async () => {
    const client = makeClient({
      Branches: { show: vi.fn().mockResolvedValue({ commit: { id: "abc123" } }) },
    })
    expect(await getBranchHeadSha(client, toProjectId(1), toBranchName("main"))).toBe("abc123")
  })

  it("ブランチが存在しない(404)とき undefined を返す", async () => {
    const client = makeClient({
      Branches: { show: vi.fn().mockRejectedValue(makeHttpError(404)) },
    })
    expect(
      await getBranchHeadSha(client, toProjectId(1), toBranchName("nonexistent")),
    ).toBeUndefined()
  })

  it("404以外のエラーは再スローする", async () => {
    const err = makeHttpError(500)
    const client = makeClient({ Branches: { show: vi.fn().mockRejectedValue(err) } })
    await expect(getBranchHeadSha(client, toProjectId(1), toBranchName("main"))).rejects.toBe(err)
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
  function makeRepositoryFilesShow(existingPaths: readonly string[]) {
    return vi.fn().mockImplementation((_projectId: number, filePath: string) => {
      if (!existingPaths.includes(filePath)) return Promise.reject(makeHttpError(404))
      return Promise.resolve({ content: Buffer.from("existing").toString("base64") })
    })
  }

  it("ブランチが存在しないとき、削除せずbaseBranchから新規作成する", async () => {
    const createFn = vi.fn().mockResolvedValue({})
    const removeFn = vi.fn().mockResolvedValue(undefined)
    const client = makeClient({
      Branches: { show: vi.fn().mockRejectedValue(makeHttpError(404)), remove: removeFn },
      RepositoryFiles: { show: makeRepositoryFilesShow(["values.yaml"]) },
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
    expect(removeFn).not.toHaveBeenCalled()
    expect(createFn).toHaveBeenCalledWith(
      1,
      "yadokari/update",
      "chore: update",
      [{ action: "update", filePath: "values.yaml", content: "image:\n  tag: v2\n" }],
      { startBranch: "develop" },
    )
  })

  it("ブランチが既に存在するとき、削除してからbaseBranchを起点に作り直す（T-021、オープン中MRが無いことは呼び出し元で確認済みの前提）", async () => {
    const createFn = vi.fn().mockResolvedValue({})
    const removeFn = vi.fn().mockResolvedValue(undefined)
    const client = makeClient({
      Branches: { show: vi.fn().mockResolvedValue({}), remove: removeFn },
      RepositoryFiles: { show: makeRepositoryFilesShow(["values.yaml"]) },
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
    expect(removeFn).toHaveBeenCalledWith(1, "yadokari/update")
    expect(createFn).toHaveBeenCalledWith(
      1,
      "yadokari/update",
      "chore: update",
      [{ action: "update", filePath: "values.yaml", content: "image:\n  tag: v2\n" }],
      { startBranch: "develop" },
    )
  })

  it("actionの判定は常にbaseBranch側のファイル存在有無で行う（残留ブランチの状態に依存しない）", async () => {
    const createFn = vi.fn().mockResolvedValue({})
    const repositoryFilesShow = makeRepositoryFilesShow(["values.yaml"])
    const client = makeClient({
      Branches: {
        show: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue(undefined),
      },
      RepositoryFiles: { show: repositoryFilesShow },
      Commits: { create: createFn },
    })
    await commitFileUpdates(
      client,
      toProjectId(1),
      toBranchName("yadokari/update"),
      toBranchName("develop"),
      "chore: update",
      [{ filePath: toValuesPath("new/values.yaml"), content: "image:\n  tag: v2\n" }],
    )
    expect(repositoryFilesShow).toHaveBeenCalledWith(1, "new/values.yaml", "develop")
    expect(createFn).toHaveBeenCalledWith(
      1,
      "yadokari/update",
      "chore: update",
      [{ action: "create", filePath: "new/values.yaml", content: "image:\n  tag: v2\n" }],
      { startBranch: "develop" },
    )
  })

  it("複数ファイルで存在有無が混在するとき、ファイルごとに正しいactionを設定する", async () => {
    const createFn = vi.fn().mockResolvedValue({})
    const client = makeClient({
      Branches: {
        show: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue(undefined),
      },
      RepositoryFiles: { show: makeRepositoryFilesShow(["a/values.yaml"]) },
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
    expect(actions).toEqual([
      { action: "update", filePath: "a/values.yaml", content: "a" },
      { action: "create", filePath: "b/values.yaml", content: "b" },
    ])
  })
})

describe("deleteBranch", () => {
  it("正しい引数で Branches.remove を呼び出す", async () => {
    const removeFn = vi.fn().mockResolvedValue(undefined)
    const client = makeClient({ Branches: { show: vi.fn(), remove: removeFn } })
    await deleteBranch(client, toProjectId(1), toBranchName("yadokari/update"))
    expect(removeFn).toHaveBeenCalledWith(1, "yadokari/update")
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
  it("最新パイプラインの webUrl を返す", async () => {
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
    ).toEqual({ webUrl: "https://gitlab.example.com/p/1" })
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
