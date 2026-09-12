import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/lib/gitlab/gitlab.js")

import { validateRemoteExistence } from "../../../../scripts/lint/remote-existence/remote-existence.js"
import { branchExists, getFileContent, projectExists } from "../../../../src/lib/gitlab/gitlab.js"
import {
  toAnchorName,
  toBranchName,
  toConfigUnitPath,
  toProjectId,
  toProjectName,
  toValuesPath,
} from "../../../../src/types/types.js"
import { makeApp, makeConfigUnit, mockGitlab } from "../../../helpers.js"

const VALUES_YAML = `variables:\n  - &appVersion main-build-at-20260101-000000\n  - &targetBranch main\n`

describe("validateRemoteExistence", () => {
  beforeEach(() => {
    vi.mocked(projectExists).mockResolvedValue(true)
    vi.mocked(branchExists).mockResolvedValue(true)
    vi.mocked(getFileContent).mockResolvedValue(VALUES_YAML)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("すべて実在するとき問題を1件も返さない", async () => {
    const problems = await validateRemoteExistence(mockGitlab, [makeConfigUnit([makeApp()])], 3)

    expect(problems).toEqual([])
  })

  it("1件の検証が例外で落ちても他の設定ユニットの検証を続け、問題として返す", async () => {
    const failing = makeConfigUnit([makeApp({ projectId: toProjectId(2) })], {
      unitPath: toConfigUnitPath("tenant1/client2"),
    })
    vi.mocked(projectExists).mockImplementation(async (_gitlab, projectId) => {
      if (projectId === 2) throw new Error("想定外のエラー")
      return true
    })

    const problems = await validateRemoteExistence(
      mockGitlab,
      [failing, makeConfigUnit([makeApp()])],
      3,
    )

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("client2")
    expect(problems[0]).toContain("想定外のエラー")
  })

  it("chartリポジトリのprojectIdが存在しないとき問題として返す", async () => {
    vi.mocked(projectExists).mockImplementation(async (_gitlab, projectId) => projectId !== 100)

    const problems = await validateRemoteExistence(mockGitlab, [makeConfigUnit([makeApp()])], 3)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("100")
  })

  it("アプリのprojectIdが存在しないとき問題として返す", async () => {
    vi.mocked(projectExists).mockImplementation(async (_gitlab, projectId) => projectId !== 1)

    const problems = await validateRemoteExistence(mockGitlab, [makeConfigUnit([makeApp()])], 3)

    expect(problems.join("\n")).toContain("my-app")
  })

  it("mrTargetBranchが存在しないとき問題として返す", async () => {
    vi.mocked(branchExists).mockImplementation(
      async (_gitlab, _projectId, branch) => branch !== "develop",
    )

    const problems = await validateRemoteExistence(mockGitlab, [makeConfigUnit([makeApp()])], 3)

    expect(problems.join("\n")).toContain("mrTargetBranch")
  })

  it("追跡ブランチ（branchToSync）が存在しないとき問題として返す", async () => {
    vi.mocked(branchExists).mockImplementation(
      async (_gitlab, _projectId, branch) => branch !== "main",
    )

    const problems = await validateRemoteExistence(mockGitlab, [makeConfigUnit([makeApp()])], 3)

    expect(problems.join("\n")).toContain("branchToSync")
  })

  it("valuesPathのファイルが存在しないとき問題として返す", async () => {
    vi.mocked(getFileContent).mockResolvedValue(undefined)

    const problems = await validateRemoteExistence(mockGitlab, [makeConfigUnit([makeApp()])], 3)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("values.yaml")
  })

  it("アンカーがvalues.yamlに存在しないとき問題として返す", async () => {
    const app = makeApp({
      imageTagLocations: [
        { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("noSuchAnchor") },
      ],
    })

    const problems = await validateRemoteExistence(mockGitlab, [makeConfigUnit([app])], 3)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("noSuchAnchor")
  })

  it("アンカーがスカラー以外に付いているとき、アンカー不在とは違う文言で問題として返す", async () => {
    vi.mocked(getFileContent).mockResolvedValue("group: &appVersion\n  a: 1\n")
    const app = makeApp({
      imageTagLocations: [
        { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("appVersion") },
      ],
    })

    const problems = await validateRemoteExistence(mockGitlab, [makeConfigUnit([app])], 3)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("スカラー値に付いていません")
  })

  it("Helmの向き先ブランチが存在しないとき問題として返す", async () => {
    const helmTargetBranch = {
      branchName: toBranchName("release/ghost"),
      locations: [
        { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
      ],
    }
    vi.mocked(branchExists).mockImplementation(
      async (_gitlab, _projectId, branch) => branch !== "release/ghost",
    )

    const problems = await validateRemoteExistence(
      mockGitlab,
      [makeConfigUnit([makeApp()], { helmTargetBranch })],
      3,
    )

    expect(problems.join("\n")).toContain("release/ghost")
  })

  it("Helmの向き先ブランチの問題は、アプリの数だけ重複して報告しない", async () => {
    const helmTargetBranch = {
      branchName: toBranchName("release/ghost"),
      locations: [
        { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
      ],
    }
    vi.mocked(branchExists).mockImplementation(
      async (_gitlab, _projectId, branch) => branch !== "release/ghost",
    )
    const apps = [
      makeApp({ projectId: toProjectId(1), projectName: toProjectName("app-1") }),
      makeApp({ projectId: toProjectId(2), projectName: toProjectName("app-2") }),
    ]

    const problems = await validateRemoteExistence(
      mockGitlab,
      [makeConfigUnit(apps, { helmTargetBranch })],
      3,
    )

    expect(problems.filter((problem) => problem.includes("release/ghost"))).toHaveLength(1)
  })

  it("複数の問題をまとめて返す（最初の1件で止まらない）", async () => {
    vi.mocked(getFileContent).mockResolvedValue(undefined)
    const apps = [
      makeApp({
        imageTagLocations: [{ valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("x") }],
      }),
      makeApp({
        imageTagLocations: [{ valuesPath: toValuesPath("b.yaml"), anchorName: toAnchorName("y") }],
      }),
    ]

    const problems = await validateRemoteExistence(mockGitlab, [makeConfigUnit(apps)], 3)

    expect(problems).toHaveLength(2)
  })

  it("同じvalues.yamlは1回だけ取得する（複数箇所でキャッシュを共有する）", async () => {
    const app = makeApp({
      imageTagLocations: [
        { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("appVersion") },
        { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
      ],
    })

    await validateRemoteExistence(mockGitlab, [makeConfigUnit([app])], 3)

    expect(vi.mocked(getFileContent)).toHaveBeenCalledTimes(1)
  })

  it("複数の設定ユニットを並列に検証しても、問題は入力順で返る", async () => {
    vi.mocked(projectExists).mockImplementation(async (_gitlab, projectId) => projectId !== 2)
    const first = makeConfigUnit([
      makeApp({ projectId: toProjectId(2), projectName: toProjectName("app-first") }),
    ])
    const second = makeConfigUnit([
      makeApp({ projectId: toProjectId(3), projectName: toProjectName("app-second") }),
    ])

    const problems = await validateRemoteExistence(mockGitlab, [first, second], 3)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("app-first")
  })
})
