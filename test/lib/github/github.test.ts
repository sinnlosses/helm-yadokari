import { Octokit } from "@octokit/rest"
import { describe, expect, it, vi } from "vitest"

import type { GithubClient } from "../../../src/lib/github/github.js"
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
} from "../../../src/lib/github/github.js"
import {
  toAccessToken,
  toBranchName,
  toPlatformUrl,
  toProjectId,
  toTagName,
  toValuesPath,
} from "../../../src/types/types.js"

type MockFn = ReturnType<typeof vi.fn>

/** Octokitは`RequestError.status`にHTTPステータスを直接持つ（gitbeakerとは位置が違う） */
const makeHttpError = (status: number): Error => Object.assign(new Error("HTTP Error"), { status })

function makeClient(
  overrides: Partial<{
    paginate: MockFn
    repos: Partial<Record<"listTags" | "getBranch" | "getContent" | "get" | "getCommit", MockFn>>
    git: Partial<Record<"deleteRef" | "createRef" | "createTree" | "createCommit", MockFn>>
    pulls: Partial<Record<"list" | "create", MockFn>>
    actions: Partial<Record<"listWorkflowRunsForRepo", MockFn>>
  }> = {},
): GithubClient {
  return {
    paginate: overrides.paginate ?? vi.fn(),
    rest: {
      repos: {
        listTags: vi.fn(),
        getBranch: vi.fn(),
        getContent: vi.fn(),
        get: vi.fn(),
        getCommit: vi.fn(),
        ...overrides.repos,
      },
      git: {
        deleteRef: vi.fn(),
        createRef: vi.fn(),
        createTree: vi.fn(),
        createCommit: vi.fn(),
        ...overrides.git,
      },
      pulls: { list: vi.fn(), create: vi.fn(), ...overrides.pulls },
      actions: { listWorkflowRunsForRepo: vi.fn(), ...overrides.actions },
    },
  } as unknown as GithubClient
}

const PROJECT_ID = toProjectId("acme/chart")
const VALUES_PATH = toValuesPath("values.yaml")

describe("createClient", () => {
  it("Octokit インスタンスを返す", () => {
    const client = createClient(toPlatformUrl("https://api.github.com"), toAccessToken("t"))
    expect(client).toBeInstanceOf(Octokit)
  })

  it("GHES の baseUrl をそのまま使う", () => {
    const client = createClient(toPlatformUrl("https://ghe.example.com/api/v3"), toAccessToken("t"))
    expect(client.request.endpoint.DEFAULTS.baseUrl).toBe("https://ghe.example.com/api/v3")
  })

  it("末尾のスラッシュを落として baseUrl の二重スラッシュを防ぐ", () => {
    const client = createClient(toPlatformUrl("https://api.github.com/"), toAccessToken("t"))
    expect(client.request.endpoint.DEFAULTS.baseUrl).toBe("https://api.github.com")
  })
})

describe("projectId の分割", () => {
  it("owner/repo 以外の形式はどの値が原因か分かるエラーにする", async () => {
    const client = makeClient()
    await expect(listTags(client, toProjectId("1"))).rejects.toThrow('"1"')
  })

  it("セグメントが3つ以上あるときもエラーにする", async () => {
    const client = makeClient()
    await expect(listTags(client, toProjectId("acme/group/chart"))).rejects.toThrow("owner/repo")
  })
})

describe("listTags", () => {
  it("タグ名とコミットSHAの一覧を返す", async () => {
    const paginate = vi.fn().mockResolvedValue([
      { name: "main-build-at-20260101-000000", commit: { sha: "sha1" } },
      { name: "main-build-at-20260201-000000", commit: { sha: "sha2" } },
    ])
    expect(await listTags(makeClient({ paginate }), PROJECT_ID)).toEqual([
      { name: "main-build-at-20260101-000000", commitSha: "sha1" },
      { name: "main-build-at-20260201-000000", commitSha: "sha2" },
    ])
  })

  it("自動ページングが無いので paginate に最大ページサイズで渡す", async () => {
    const paginate = vi.fn().mockResolvedValue([])
    const client = makeClient({ paginate })
    await listTags(client, PROJECT_ID)
    expect(paginate).toHaveBeenCalledWith(client.rest.repos.listTags, {
      owner: "acme",
      repo: "chart",
      per_page: 100,
    })
  })
})

describe("branchExists", () => {
  it("ブランチが存在するとき true を返す", async () => {
    const client = makeClient({ repos: { getBranch: vi.fn().mockResolvedValue({ data: {} }) } })
    expect(await branchExists(client, PROJECT_ID, toBranchName("main"))).toBe(true)
  })

  it("404 のとき false を返す", async () => {
    const client = makeClient({
      repos: { getBranch: vi.fn().mockRejectedValue(makeHttpError(404)) },
    })
    expect(await branchExists(client, PROJECT_ID, toBranchName("nope"))).toBe(false)
  })

  it("404 以外のエラーは再スローする", async () => {
    const err = makeHttpError(500)
    const client = makeClient({ repos: { getBranch: vi.fn().mockRejectedValue(err) } })
    await expect(branchExists(client, PROJECT_ID, toBranchName("main"))).rejects.toBe(err)
  })
})

describe("deleteBranch", () => {
  it("refs/ を含まない heads/<branch> で ref を削除する", async () => {
    const deleteRef = vi.fn().mockResolvedValue({})
    await deleteBranch(makeClient({ git: { deleteRef } }), PROJECT_ID, toBranchName("yad/update"))
    expect(deleteRef).toHaveBeenCalledWith({
      owner: "acme",
      repo: "chart",
      ref: "heads/yad/update",
    })
  })
})

describe("getBranchHeadSha", () => {
  it("ブランチのHEADコミットSHAを返す", async () => {
    const client = makeClient({
      repos: { getBranch: vi.fn().mockResolvedValue({ data: { commit: { sha: "abc123" } } }) },
    })
    expect(await getBranchHeadSha(client, PROJECT_ID, toBranchName("main"))).toBe("abc123")
  })

  it("ブランチが存在しない(404)とき undefined を返す", async () => {
    const client = makeClient({
      repos: { getBranch: vi.fn().mockRejectedValue(makeHttpError(404)) },
    })
    expect(await getBranchHeadSha(client, PROJECT_ID, toBranchName("nope"))).toBeUndefined()
  })
})

describe("getFileContent", () => {
  it("base64デコードした内容を返す", async () => {
    const content = Buffer.from("image:\n  tag: v1.0.0\n", "utf-8").toString("base64")
    const client = makeClient({
      repos: {
        getContent: vi
          .fn()
          .mockResolvedValue({ data: { type: "file", encoding: "base64", content } }),
      },
    })
    expect(await getFileContent(client, PROJECT_ID, VALUES_PATH, toBranchName("main"))).toBe(
      "image:\n  tag: v1.0.0\n",
    )
  })

  it("404のとき undefined を返す", async () => {
    const client = makeClient({
      repos: { getContent: vi.fn().mockRejectedValue(makeHttpError(404)) },
    })
    expect(
      await getFileContent(client, PROJECT_ID, VALUES_PATH, toBranchName("main")),
    ).toBeUndefined()
  })

  it("1MB超（encoding: none）は空文字を返さずエラーにする", async () => {
    const client = makeClient({
      repos: {
        getContent: vi
          .fn()
          .mockResolvedValue({ data: { type: "file", encoding: "none", content: "" } }),
      },
    })
    await expect(
      getFileContent(client, PROJECT_ID, VALUES_PATH, toBranchName("main")),
    ).rejects.toThrow("1MB")
  })

  it("パスがディレクトリのときエラーにする", async () => {
    const client = makeClient({
      repos: { getContent: vi.fn().mockResolvedValue({ data: [{ type: "file" }] }) },
    })
    await expect(
      getFileContent(client, PROJECT_ID, VALUES_PATH, toBranchName("main")),
    ).rejects.toThrow("ファイルではありません")
  })
})

describe("openMergeRequestExists", () => {
  it("オープン中のPRが存在するとき true を返す", async () => {
    const client = makeClient({
      pulls: { list: vi.fn().mockResolvedValue({ data: [{ number: 1 }] }) },
    })
    expect(await openMergeRequestExists(client, PROJECT_ID, toBranchName("yad/update"))).toBe(true)
  })

  it("オープン中のPRがないとき false を返す", async () => {
    const client = makeClient({ pulls: { list: vi.fn().mockResolvedValue({ data: [] }) } })
    expect(await openMergeRequestExists(client, PROJECT_ID, toBranchName("yad/update"))).toBe(false)
  })

  it("head は owner:ブランチ名 の形で絞り込む", async () => {
    const list = vi.fn().mockResolvedValue({ data: [] })
    await openMergeRequestExists(makeClient({ pulls: { list } }), PROJECT_ID, toBranchName("yad/u"))
    expect(list).toHaveBeenCalledWith({
      owner: "acme",
      repo: "chart",
      head: "acme:yad/u",
      state: "open",
    })
  })
})

describe("commitFileUpdates", () => {
  const FILES = [
    { valuesPath: VALUES_PATH, content: "image:\n  tag: v2\n" },
    { valuesPath: toValuesPath("charts/api/values.yaml"), content: "image:\n  tag: v3\n" },
  ]

  const makeGitMocks = (
    overrides: Partial<Record<"createTree" | "createCommit" | "createRef", MockFn>> = {},
  ) => ({
    createTree: vi.fn().mockResolvedValue({ data: { sha: "tree-sha" } }),
    createCommit: vi.fn().mockResolvedValue({ data: { sha: "commit-sha" } }),
    createRef: vi.fn().mockResolvedValue({}),
    ...overrides,
  })

  const makeCommitClient = (git: ReturnType<typeof makeGitMocks>): GithubClient =>
    makeClient({
      repos: {
        getBranch: vi.fn().mockResolvedValue({
          data: { commit: { sha: "base-commit-sha", commit: { tree: { sha: "base-tree-sha" } } } },
        }),
      },
      git,
    })

  it("複数ファイルを1つのtree・1つのコミットにまとめる", async () => {
    const git = makeGitMocks()
    await commitFileUpdates(
      makeCommitClient(git),
      PROJECT_ID,
      toBranchName("yad/update"),
      toBranchName("develop"),
      "chore: update",
      FILES,
    )
    expect(git.createTree).toHaveBeenCalledTimes(1)
    expect(git.createTree).toHaveBeenCalledWith({
      owner: "acme",
      repo: "chart",
      base_tree: "base-tree-sha",
      tree: [
        { path: "values.yaml", mode: "100644", type: "blob", content: "image:\n  tag: v2\n" },
        {
          path: "charts/api/values.yaml",
          mode: "100644",
          type: "blob",
          content: "image:\n  tag: v3\n",
        },
      ],
    })
    expect(git.createCommit).toHaveBeenCalledTimes(1)
    expect(git.createRef).toHaveBeenCalledTimes(1)
  })

  it("baseBranch のHEADを親にしたコミットを featureBranch として作る", async () => {
    const git = makeGitMocks()
    await commitFileUpdates(
      makeCommitClient(git),
      PROJECT_ID,
      toBranchName("yad/update"),
      toBranchName("develop"),
      "chore: update",
      FILES,
    )
    expect(git.createCommit).toHaveBeenCalledWith({
      owner: "acme",
      repo: "chart",
      message: "chore: update",
      tree: "tree-sha",
      parents: ["base-commit-sha"],
    })
    expect(git.createRef).toHaveBeenCalledWith({
      owner: "acme",
      repo: "chart",
      ref: "refs/heads/yad/update",
      sha: "commit-sha",
    })
  })

  it("途中で失敗したときは ref を作らない（ブランチが中途半端に生えない）", async () => {
    const err = makeHttpError(422)
    const git = makeGitMocks({ createCommit: vi.fn().mockRejectedValue(err) })
    await expect(
      commitFileUpdates(
        makeCommitClient(git),
        PROJECT_ID,
        toBranchName("yad/update"),
        toBranchName("develop"),
        "chore: update",
        FILES,
      ),
    ).rejects.toBe(err)
    expect(git.createRef).not.toHaveBeenCalled()
  })
})

describe("createMergeRequest", () => {
  it("正しい引数で pulls.create を呼び出す", async () => {
    const create = vi.fn().mockResolvedValue({})
    await createMergeRequest(
      makeClient({ pulls: { create } }),
      PROJECT_ID,
      toBranchName("yad/update"),
      toBranchName("develop"),
      "chore: update app versions",
      "description body",
    )
    expect(create).toHaveBeenCalledWith({
      owner: "acme",
      repo: "chart",
      head: "yad/update",
      base: "develop",
      title: "chore: update app versions",
      body: "description body",
    })
  })
})

describe("createTag", () => {
  it("ブランチのHEADを引いてから refs/tags/ を作る", async () => {
    const createRef = vi.fn().mockResolvedValue({})
    const client = makeClient({
      repos: { getBranch: vi.fn().mockResolvedValue({ data: { commit: { sha: "head-sha" } } }) },
      git: { createRef },
    })
    await createTag(
      client,
      PROJECT_ID,
      toTagName("main-build-at-20260101-000000"),
      toBranchName("main"),
    )
    expect(createRef).toHaveBeenCalledWith({
      owner: "acme",
      repo: "chart",
      ref: "refs/tags/main-build-at-20260101-000000",
      sha: "head-sha",
    })
  })

  it("作成元ブランチが無いときは ref を作らずエラーにする", async () => {
    const createRef = vi.fn()
    const client = makeClient({
      repos: { getBranch: vi.fn().mockRejectedValue(makeHttpError(404)) },
      git: { createRef },
    })
    await expect(
      createTag(client, PROJECT_ID, toTagName("main-build-at-20260101-000000"), toBranchName("x")),
    ).rejects.toThrow('"x"')
    expect(createRef).not.toHaveBeenCalled()
  })

  it("エラーは再スローする", async () => {
    const err = makeHttpError(422)
    const client = makeClient({
      repos: { getBranch: vi.fn().mockResolvedValue({ data: { commit: { sha: "head-sha" } } }) },
      git: { createRef: vi.fn().mockRejectedValue(err) },
    })
    await expect(
      createTag(client, PROJECT_ID, toTagName("main-build-at-20260101-000000"), toBranchName("m")),
    ).rejects.toBe(err)
  })
})

describe("getProjectWebUrl", () => {
  it("repos.get が返した html_url を返す", async () => {
    const client = makeClient({
      repos: { get: vi.fn().mockResolvedValue({ data: { html_url: "https://github.com/a/c" } }) },
    })
    expect(await getProjectWebUrl(client, PROJECT_ID)).toBe(toPlatformUrl("https://github.com/a/c"))
  })

  it("html_url がURLとして不正なら、その値をMR本文に載せる前にエラーにする", async () => {
    const client = makeClient({
      repos: { get: vi.fn().mockResolvedValue({ data: { html_url: "not a url" } }) },
    })
    await expect(getProjectWebUrl(client, PROJECT_ID)).rejects.toThrow("html_url")
  })
})

describe("getLatestPipelineForRef", () => {
  const TAG = toTagName("main-build-at-20260101-000000")

  it("タグをコミットに解決してから head_sha で実行を引き、先頭の webUrl を返す", async () => {
    const listRuns = vi.fn().mockResolvedValue({
      data: { workflow_runs: [{ html_url: "https://github.com/a/c/runs/1" }] },
    })
    const client = makeClient({
      repos: { getCommit: vi.fn().mockResolvedValue({ data: { sha: "tag-sha" } }) },
      actions: { listWorkflowRunsForRepo: listRuns },
    })
    expect(await getLatestPipelineForRef(client, PROJECT_ID, TAG)).toEqual({
      webUrl: "https://github.com/a/c/runs/1",
    })
    expect(listRuns).toHaveBeenCalledWith({
      owner: "acme",
      repo: "chart",
      head_sha: "tag-sha",
      per_page: 1,
    })
  })

  it("実行が1件も無いとき undefined を返す", async () => {
    const client = makeClient({
      repos: { getCommit: vi.fn().mockResolvedValue({ data: { sha: "tag-sha" } }) },
      actions: {
        listWorkflowRunsForRepo: vi.fn().mockResolvedValue({ data: { workflow_runs: [] } }),
      },
    })
    expect(await getLatestPipelineForRef(client, PROJECT_ID, TAG)).toBeUndefined()
  })

  it("タグが存在しない(404)とき undefined を返す", async () => {
    const client = makeClient({
      repos: { getCommit: vi.fn().mockRejectedValue(makeHttpError(404)) },
    })
    expect(await getLatestPipelineForRef(client, PROJECT_ID, TAG)).toBeUndefined()
  })

  it("404以外のエラーは再スローする", async () => {
    const err = makeHttpError(500)
    const client = makeClient({ repos: { getCommit: vi.fn().mockRejectedValue(err) } })
    await expect(getLatestPipelineForRef(client, PROJECT_ID, TAG)).rejects.toBe(err)
  })
})
