import { describe, expect, it } from "vitest"

import { buildMrContent } from "../../../../src/steps/apply-updates/sub-steps/build-mr-content.js"
import type { MrEntries } from "../../../../src/steps/apply-updates/sub-steps/shared/types.js"
import type { AppUpdatePlan, GitLabUrl } from "../../../../src/types/types.js"
import {
  toAnchorName,
  toBranchName,
  toClientId,
  toGitLabUrl,
  toTenantId,
  toValuesPath,
} from "../../../../src/types/types.js"
import { makePlan } from "../../../helpers.js"

const defaultWebUrl = toGitLabUrl("https://gitlab.example.com/g/my-app")

const helmUpdate = {
  target: { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
  previousBranch: toBranchName("release/2025-q4"),
  newBranch: toBranchName("release/2026-q1"),
}

/**
 * `collectMrEntries()`が返す形をplansから素直に組み立てる。重複排除は`collectMrEntries()`の
 * 責務なのでここでは行わず、渡されたものをそのまま並べる。
 */
function entriesOf(plans: readonly AppUpdatePlan[], webUrl: GitLabUrl = defaultWebUrl): MrEntries {
  return {
    imageTags: plans.flatMap((plan) => plan.updates.map((update) => ({ plan, update, webUrl }))),
    helmBranches: plans.flatMap((plan) => plan.helmTargetBranchUpdates),
  }
}

const buildTitle = (entries: MrEntries): string =>
  buildMrContent(toTenantId("tenantId1"), toClientId("clientId1"), entries).title

const buildDescription = (entries: MrEntries): string =>
  buildMrContent(toTenantId("tenantId1"), toClientId("clientId1"), entries).description

describe("buildMrContent（タイトル）", () => {
  it("イメージタグの書き換え箇所数を種別つきで含む", () => {
    expect(buildTitle(entriesOf([makePlan(), makePlan()]))).toBe(
      "Auto MR by yadokari: update tenantId1/clientId1 (image tag 2)",
    )
  })

  it("1アプリが複数箇所を書き換える場合はアプリ数ではなく箇所数を数える", () => {
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

    expect(buildTitle(entriesOf([plan]))).toBe(
      "Auto MR by yadokari: update tenantId1/clientId1 (image tag 3)",
    )
  })

  it("イメージタグとHelm向き先ブランチの両方があるとき、種別ごとに件数を出す", () => {
    const plan = makePlan({ helmTargetBranchUpdates: [helmUpdate] })

    expect(buildTitle(entriesOf([plan]))).toBe(
      "Auto MR by yadokari: update tenantId1/clientId1 (image tag 1, helm branch 1)",
    )
  })

  it("Helm向き先ブランチだけが変わるとき、image tag と表示しない", () => {
    const plan = makePlan({ updates: [], helmTargetBranchUpdates: [helmUpdate] })

    expect(buildTitle(entriesOf([plan]))).toBe(
      "Auto MR by yadokari: update tenantId1/clientId1 (helm branch 1)",
    )
  })

  it("件数は本文のテーブルの行数と同じ配列から数える", () => {
    const entries = entriesOf([makePlan({ helmTargetBranchUpdates: [helmUpdate] })])
    const { title, description } = buildMrContent(
      toTenantId("tenantId1"),
      toClientId("clientId1"),
      entries,
    )

    expect(title).toContain("image tag 1")
    expect(description.split("\n").filter((line) => line.includes("my-app"))).toHaveLength(1)
  })

  it("0件のときは件数の括弧を付けない", () => {
    expect(buildTitle(entriesOf([]))).toBe("Auto MR by yadokari: update tenantId1/clientId1")
  })
})

describe("buildMrContent（本文）", () => {
  it("イメージタグの更新をテーブルで表示する（指定の列順）", () => {
    const description = buildDescription(entriesOf([makePlan()]))

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

  it("比較のリンクはURLをそのまま表示する", () => {
    expect(buildDescription(entriesOf([makePlan()]))).not.toContain("[比較]")
  })

  it("1アプリが複数箇所を書き換えるとき、箇所ごとに行を出す", () => {
    const description = buildDescription(
      entriesOf([
        makePlan({
          updates: [
            {
              target: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("x") },
              previousTagName: undefined,
            },
            {
              target: { valuesPath: toValuesPath("b.yaml"), anchorName: toAnchorName("y") },
              previousTagName: undefined,
            },
          ],
        }),
      ]),
    )

    const rows = description.split("\n").filter((line) => line.includes("my-app"))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain("| `a.yaml` | `x` |")
    expect(rows[1]).toContain("| `b.yaml` | `y` |")
  })

  it("書き込み先はファイルとアンカーの2列に分ける", () => {
    const description = buildDescription(entriesOf([makePlan()]))

    const row = description.split("\n").find((line) => line.includes("my-app"))
    expect(row).toContain("| `values.yaml` | `appVersion` |")
  })

  it("そのアプリの設定（追跡ブランチ）を列に出す", () => {
    const description = buildDescription(entriesOf([makePlan()]))

    const row = description.split("\n").find((line) => line.includes("my-app"))
    expect(row).toContain("| my-app | `main` |")
  })

  it("打刻日時の列は出さない", () => {
    const description = buildDescription(entriesOf([makePlan()]))

    expect(description).not.toContain("打刻日時")
    expect(description).not.toContain("2026-01-01 09:00:00")
  })

  it("パイプラインは状態を出さず、URLをそのまま表示する", () => {
    const description = buildDescription(
      entriesOf([
        makePlan({ pipeline: { webUrl: toGitLabUrl("https://gitlab.example.com/p/1") } }),
      ]),
    )

    const row = description.split("\n").find((line) => line.includes("my-app"))
    expect(row).toContain("| https://gitlab.example.com/p/1 |")
    expect(description).not.toContain("[パイプライン]")
    expect(description).not.toContain("success")
  })

  it("パイプラインが無いとき - にする", () => {
    const description = buildDescription(entriesOf([makePlan()]))

    expect(description).not.toContain("見つかりません")
    expect(description.split("\n").find((line) => line.includes("my-app"))).toMatch(/\| - \|$/)
  })

  it("旧タグが未設定のとき (未設定) と表示し、比較は - にする", () => {
    const description = buildDescription(entriesOf([makePlan({ previousTagName: undefined })]))

    const row = description.split("\n").find((line) => line.includes("my-app"))
    expect(row).toContain("(未設定)")
    expect(description).not.toContain("/-/compare/")
  })

  it("向き先ブランチの更新は別セクションのテーブルにする", () => {
    const description = buildDescription(
      entriesOf([makePlan({ helmTargetBranchUpdates: [helmUpdate] })]),
    )

    const helmSectionIndex = description.indexOf("## Helmの向き先ブランチ")
    expect(helmSectionIndex).toBeGreaterThan(description.indexOf("## イメージタグ"))
    const helmSection = description.slice(helmSectionIndex)
    expect(helmSection).toContain("| 旧ブランチ | 新ブランチ | ファイル | アンカー |")
    expect(helmSection).toContain("`release/2025-q4`")
    expect(helmSection).toContain("`release/2026-q1`")
    expect(helmSection).toContain("| `values.yaml` | `targetBranch` |")
    expect(description.slice(0, helmSectionIndex)).not.toContain("release/2026-q1")
  })

  it("向き先ブランチの旧ブランチが未設定のとき (未設定) と表示する", () => {
    const description = buildDescription(
      entriesOf([
        makePlan({ helmTargetBranchUpdates: [{ ...helmUpdate, previousBranch: undefined }] }),
      ]),
    )

    expect(description).toContain("(未設定)")
    expect(description).toContain("`release/2026-q1`")
  })

  it("向き先ブランチの更新が無いとき、そのセクションを出さない", () => {
    expect(buildDescription(entriesOf([makePlan()]))).not.toContain("向き先ブランチ")
  })

  it("イメージタグの行が1件も無いとき、そのセクションごと出さない", () => {
    const description = buildDescription(
      entriesOf([
        makePlan({
          projectName: "helm-only-app",
          updates: [],
          helmTargetBranchUpdates: [helmUpdate],
        }),
      ]),
    )

    expect(description).not.toContain("helm-only-app")
    expect(description).not.toContain("## イメージタグ")
    expect(description).toContain("## Helmの向き先ブランチ")
  })
})
