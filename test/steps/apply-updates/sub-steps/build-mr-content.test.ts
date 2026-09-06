import { describe, expect, it } from "vitest"

import { buildMrContent } from "../../../../src/steps/apply-updates/sub-steps/build-mr-content.js"
import type {
  AppUpdatePlan,
  GitLabUrl,
  PipelineInfo,
  ProjectId,
  TagName,
} from "../../../../src/types/types.js"
import {
  toAnchorName,
  toBranchName,
  toClientId,
  toGitLabUrl,
  toProjectId,
  toProjectName,
  toTagName,
  toTenantId,
  toValuesPath,
} from "../../../../src/types/types.js"
import { makeApp } from "../../../helpers.js"

function makePlan(
  overrides: Partial<{
    pipeline: PipelineInfo
    previousTagName: TagName | undefined
    projectName: string
    updates: AppUpdatePlan["updates"]
    helmTargetBranchUpdates: AppUpdatePlan["helmTargetBranchUpdates"]
  }> = {},
): AppUpdatePlan {
  const previousTagName =
    "previousTagName" in overrides
      ? overrides.previousTagName
      : toTagName("main-build-at-20251231-000000")
  return {
    app: makeApp({
      projectId: toProjectId(1),
      projectName: toProjectName(overrides.projectName ?? "my-app"),
    }),
    latestTag: {
      name: toTagName("main-build-at-20260101-000000"),
      branchName: toBranchName("main"),
      builtAt: new Date("2026-01-01T00:00:00Z"),
    },
    pipeline: overrides.pipeline,
    updates: overrides.updates ?? [
      {
        target: {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("appVersion"),
        },
        previousTagName,
      },
    ],
    helmTargetBranchUpdates: overrides.helmTargetBranchUpdates ?? [],
  }
}

/**
 * `buildMrContent()`はタイトルと本文をまとめて返すため、各テストが見たい側だけを取り出す。
 * タイトルのテストは本文のリンクを見ないので、要求された`projectId`をすべて同じweb URLに
 * 解決するスタブで済ませる（未解決の`projectId`があると本文の組み立てが失敗するため）。
 */
async function buildTitle(plans: readonly AppUpdatePlan[]): Promise<string> {
  const content = await buildMrContent(
    toTenantId("tenantId1"),
    toClientId("clientId1"),
    plans,
    async (projectIds) =>
      new Map(projectIds.map((projectId) => [projectId, toGitLabUrl("https://example.com/g/a")])),
  )
  return content.title
}

/** 本文のテストは解決結果そのものを見たいので、渡されたMapをそのまま返す */
async function buildDescription(
  webUrls: ReadonlyMap<ProjectId, GitLabUrl>,
  plans: readonly AppUpdatePlan[],
): Promise<string> {
  const content = await buildMrContent(
    toTenantId("tenantId1"),
    toClientId("clientId1"),
    plans,
    async () => webUrls,
  )
  return content.description
}

describe("buildMrContent（タイトル）", async () => {
  const helmUpdate = {
    target: { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
    previousBranch: toBranchName("release/2025-q4"),
    newBranch: toBranchName("release/2026-q1"),
  }

  it("イメージタグの書き換え箇所数を種別つきで含む", async () => {
    expect(await buildTitle([makePlan(), makePlan()])).toBe(
      "Auto MR by yadokari: update tenantId1/clientId1 (image tag 2)",
    )
  })

  it("1アプリが複数箇所を書き換える場合はアプリ数ではなく箇所数を数える", async () => {
    const plan = makePlan({
      updates: [
        {
          target: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("x") },
          previousTagName: undefined,
        },
        {
          target: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("y") },
          previousTagName: undefined,
        },
        {
          target: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("z") },
          previousTagName: undefined,
        },
      ],
    })

    expect(await buildTitle([plan])).toBe(
      "Auto MR by yadokari: update tenantId1/clientId1 (image tag 3)",
    )
  })

  it("イメージタグとHelm向き先ブランチの両方があるとき、種別ごとに件数を出す", async () => {
    const plan = makePlan({ helmTargetBranchUpdates: [helmUpdate] })

    expect(await buildTitle([plan])).toBe(
      "Auto MR by yadokari: update tenantId1/clientId1 (image tag 1, helm branch 1)",
    )
  })

  it("Helm向き先ブランチだけが変わるとき、image tag と表示しない", async () => {
    const plan = makePlan({ updates: [], helmTargetBranchUpdates: [helmUpdate] })

    expect(await buildTitle([plan])).toBe(
      "Auto MR by yadokari: update tenantId1/clientId1 (helm branch 1)",
    )
  })

  it("同じ向き先ブランチの書き換え箇所が複数アプリに割り当てられていても重複して数えない", async () => {
    const plans = [
      makePlan({ updates: [], helmTargetBranchUpdates: [helmUpdate] }),
      makePlan({ projectName: "other-app", updates: [], helmTargetBranchUpdates: [helmUpdate] }),
    ]

    expect(await buildTitle(plans)).toBe(
      "Auto MR by yadokari: update tenantId1/clientId1 (helm branch 1)",
    )
  })

  it("0件のときは件数の括弧を付けない", async () => {
    expect(await buildTitle([])).toBe("Auto MR by yadokari: update tenantId1/clientId1")
  })
})

describe("buildMrContent（本文）", async () => {
  const makeWebUrls = (webUrl = "https://gitlab.example.com/g/my-app") =>
    new Map([[toProjectId(1), toGitLabUrl(webUrl)]])
  const helmUpdate = {
    target: { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
    previousBranch: toBranchName("release/2025-q4"),
    newBranch: toBranchName("release/2026-q1"),
  }

  it("イメージタグの更新をテーブルで表示する（指定の列順）", async () => {
    const description = await buildDescription(makeWebUrls(), [makePlan()])

    expect(description).toContain("## イメージタグ")
    expect(description).toContain(
      "| リポジトリ | 追跡ブランチ | ファイル | アンカー | 旧タグ | 新タグ | 比較 | パイプライン |",
    )
    const row = description.split("\n").find((line) => line.includes("my-app"))
    expect(row).toContain("[main-build-at-20251231-000000](")
    expect(row).toContain("[main-build-at-20260101-000000](")
    expect(row).toContain(
      "https://gitlab.example.com/g/my-app/-/compare/main-build-at-20251231-000000...main-build-at-20260101-000000",
    )
  })

  it("比較のリンクはURLをそのまま表示する", async () => {
    const description = await buildDescription(makeWebUrls(), [makePlan()])

    expect(description).not.toContain("[比較]")
  })

  it("1アプリが複数箇所を書き換えるとき、箇所ごとに行を出す", async () => {
    const description = await buildDescription(makeWebUrls(), [
      makePlan({
        updates: [
          {
            target: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("x") },
            previousTagName: toTagName("main-build-at-20251231-000000"),
          },
          {
            target: { valuesPath: toValuesPath("b.yaml"), anchorName: toAnchorName("y") },
            previousTagName: undefined,
          },
        ],
      }),
    ])

    const rows = description.split("\n").filter((line) => line.includes("my-app"))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain("| `a.yaml` | `x` |")
    expect(rows[1]).toContain("| `b.yaml` | `y` |")
  })

  it("書き込み先はファイルとアンカーの2列に分ける", async () => {
    const description = await buildDescription(makeWebUrls(), [makePlan()])

    const row = description.split("\n").find((line) => line.includes("my-app"))
    expect(row).toContain("| `values.yaml` | `appVersion` |")
  })

  it("そのアプリの設定（追跡ブランチ）を列に出す", async () => {
    const description = await buildDescription(makeWebUrls(), [makePlan()])

    const row = description.split("\n").find((line) => line.includes("my-app"))
    expect(row).toContain("| my-app | `main` |")
  })

  it("打刻日時の列は出さない", async () => {
    const description = await buildDescription(makeWebUrls(), [makePlan()])

    expect(description).not.toContain("打刻日時")
    expect(description).not.toContain("2026-01-01 09:00:00")
  })

  it("パイプラインは状態を出さず、URLをそのまま表示する", async () => {
    const description = await buildDescription(makeWebUrls(), [
      makePlan({
        pipeline: { webUrl: toGitLabUrl("https://gitlab.example.com/p/1") },
      }),
    ])

    const row = description.split("\n").find((line) => line.includes("my-app"))
    expect(row).toContain("| https://gitlab.example.com/p/1 |")
    expect(description).not.toContain("[パイプライン]")
    expect(description).not.toContain("success")
  })

  it("パイプラインが無いとき - にする", async () => {
    const description = await buildDescription(makeWebUrls(), [makePlan()])

    expect(description).not.toContain("見つかりません")
    expect(description.split("\n").find((line) => line.includes("my-app"))).toMatch(/\| - \|$/)
  })

  it("旧タグが未設定のとき (未設定) と表示し、比較は - にする", async () => {
    const description = await buildDescription(makeWebUrls(), [
      makePlan({ previousTagName: undefined }),
    ])

    const row = description.split("\n").find((line) => line.includes("my-app"))
    expect(row).toContain("(未設定)")
    expect(description).not.toContain("/-/compare/")
  })

  it("向き先ブランチの更新は別セクションのテーブルにする", async () => {
    const description = await buildDescription(makeWebUrls(), [
      makePlan({ helmTargetBranchUpdates: [helmUpdate] }),
    ])

    const helmSectionIndex = description.indexOf("## Helmの向き先ブランチ")
    expect(helmSectionIndex).toBeGreaterThan(description.indexOf("## イメージタグ"))
    const helmSection = description.slice(helmSectionIndex)
    expect(helmSection).toContain("| 旧ブランチ | 新ブランチ | ファイル | アンカー |")
    expect(helmSection).toContain("`release/2025-q4`")
    expect(helmSection).toContain("`release/2026-q1`")
    expect(helmSection).toContain("| `values.yaml` | `targetBranch` |")
    expect(description.slice(0, helmSectionIndex)).not.toContain("release/2026-q1")
  })

  it("向き先ブランチの旧ブランチが未設定のとき (未設定) と表示する", async () => {
    const description = await buildDescription(makeWebUrls(), [
      makePlan({
        helmTargetBranchUpdates: [{ ...helmUpdate, previousBranch: undefined }],
      }),
    ])

    expect(description).toContain("(未設定)")
    expect(description).toContain("`release/2026-q1`")
  })

  it("向き先ブランチの更新が無いとき、そのセクションを出さない", async () => {
    const description = await buildDescription(makeWebUrls(), [makePlan()])

    expect(description).not.toContain("向き先ブランチ")
  })

  it("イメージタグに差分が無いアプリは行に出さず、全アプリ差分なしならセクションごと出さない", async () => {
    const description = await buildDescription(makeWebUrls(), [
      makePlan({
        projectName: "helm-only-app",
        updates: [],
        helmTargetBranchUpdates: [helmUpdate],
      }),
    ])

    expect(description).not.toContain("helm-only-app")
    expect(description).not.toContain("## イメージタグ")
    expect(description).toContain("## Helmの向き先ブランチ")
  })

  it("同じ書き込み先の向き先ブランチ更新が複数アプリにあっても1行にまとめる", async () => {
    const description = await buildDescription(makeWebUrls(), [
      makePlan({ updates: [], helmTargetBranchUpdates: [helmUpdate] }),
      makePlan({ projectName: "other-app", updates: [], helmTargetBranchUpdates: [helmUpdate] }),
    ])

    expect(description.split("targetBranch")).toHaveLength(2)
  })
})
