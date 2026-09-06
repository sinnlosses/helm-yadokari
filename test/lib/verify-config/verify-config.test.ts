import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../src/lib/gitlab/gitlab.js")

import type { GitlabClient } from "../../../src/lib/gitlab/gitlab.js"
import { branchExists, getFileContent, projectExists } from "../../../src/lib/gitlab/gitlab.js"
import { verifyConfigExistence } from "../../../src/lib/verify-config/verify-config.js"
import {
  toAnchorName,
  toBranchName,
  toProjectId,
  toProjectName,
  toValuesPath,
} from "../../../src/types/types.js"
import { makeApp, makeChartAndApps } from "../../helpers.js"

const mockGitlab = {} as unknown as GitlabClient

const VALUES_YAML = `variables:\n  - &appVersion main-build-at-20260101-000000\n  - &targetBranch main\n`

describe("verifyConfigExistence", () => {
  beforeEach(() => {
    vi.mocked(projectExists).mockResolvedValue(true)
    vi.mocked(branchExists).mockResolvedValue(true)
    vi.mocked(getFileContent).mockResolvedValue(VALUES_YAML)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("すべて実在するとき問題を1件も返さない", async () => {
    const problems = await verifyConfigExistence(mockGitlab, [makeChartAndApps([makeApp()])], 3)

    expect(problems).toEqual([])
  })

  it("chartリポジトリのprojectIdが存在しないとき問題として返す", async () => {
    vi.mocked(projectExists).mockImplementation(async (_gitlab, projectId) => projectId !== 100)

    const problems = await verifyConfigExistence(mockGitlab, [makeChartAndApps([makeApp()])], 3)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("100")
  })

  it("アプリのprojectIdが存在しないとき問題として返す", async () => {
    vi.mocked(projectExists).mockImplementation(async (_gitlab, projectId) => projectId !== 1)

    const problems = await verifyConfigExistence(mockGitlab, [makeChartAndApps([makeApp()])], 3)

    expect(problems.join("\n")).toContain("my-app")
  })

  it("mrTargetBranchが存在しないとき問題として返す", async () => {
    vi.mocked(branchExists).mockImplementation(
      async (_gitlab, _projectId, branch) => branch !== "develop",
    )

    const problems = await verifyConfigExistence(mockGitlab, [makeChartAndApps([makeApp()])], 3)

    expect(problems.join("\n")).toContain("mrTargetBranch")
  })

  it("追跡ブランチ（branchToSync）が存在しないとき問題として返す", async () => {
    vi.mocked(branchExists).mockImplementation(
      async (_gitlab, _projectId, branch) => branch !== "main",
    )

    const problems = await verifyConfigExistence(mockGitlab, [makeChartAndApps([makeApp()])], 3)

    expect(problems.join("\n")).toContain("branchToSync")
  })

  it("valuesPathのファイルが存在しないとき問題として返す", async () => {
    vi.mocked(getFileContent).mockResolvedValue(undefined)

    const problems = await verifyConfigExistence(mockGitlab, [makeChartAndApps([makeApp()])], 3)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("values.yaml")
  })

  it("アンカーがvalues.yamlに存在しないとき問題として返す", async () => {
    const app = makeApp({
      chart: [
        { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("noSuchAnchor") },
      ],
    })

    const problems = await verifyConfigExistence(mockGitlab, [makeChartAndApps([app])], 3)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("noSuchAnchor")
  })

  it("Helmの向き先ブランチが存在しないとき問題として返す", async () => {
    const app = makeApp({
      helmTargetBranch: {
        branchName: toBranchName("release/ghost"),
        targets: [
          { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
        ],
      },
    })
    vi.mocked(branchExists).mockImplementation(
      async (_gitlab, _projectId, branch) => branch !== "release/ghost",
    )

    const problems = await verifyConfigExistence(mockGitlab, [makeChartAndApps([app])], 3)

    expect(problems.join("\n")).toContain("release/ghost")
  })

  it("複数の問題をまとめて返す（最初の1件で止まらない）", async () => {
    vi.mocked(getFileContent).mockResolvedValue(undefined)
    const apps = [
      makeApp({ chart: [{ valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("x") }] }),
      makeApp({ chart: [{ valuesPath: toValuesPath("b.yaml"), anchorName: toAnchorName("y") }] }),
    ]

    const problems = await verifyConfigExistence(mockGitlab, [makeChartAndApps(apps)], 3)

    expect(problems).toHaveLength(2)
  })

  it("同じvalues.yamlは1回だけ取得する（複数箇所でキャッシュを共有する）", async () => {
    const app = makeApp({
      chart: [
        { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("appVersion") },
        { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
      ],
    })

    await verifyConfigExistence(mockGitlab, [makeChartAndApps([app])], 3)

    expect(vi.mocked(getFileContent)).toHaveBeenCalledTimes(1)
  })

  it("複数chartAndAppsを並列に検証しても、問題は入力順で返る", async () => {
    vi.mocked(projectExists).mockImplementation(async (_gitlab, projectId) => projectId !== 2)
    const first = makeChartAndApps([
      makeApp({ projectId: toProjectId(2), projectName: toProjectName("app-first") }),
    ])
    const second = makeChartAndApps([
      makeApp({ projectId: toProjectId(3), projectName: toProjectName("app-second") }),
    ])

    const problems = await verifyConfigExistence(mockGitlab, [first, second], 3)

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("app-first")
  })
})
