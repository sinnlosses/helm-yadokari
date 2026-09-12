import { describe, expect, it } from "vitest"

import { buildMrContent } from "../../../../src/steps/apply-updates/sub-steps/build-mr-content.js"
import type { MrEntries } from "../../../../src/steps/apply-updates/sub-steps/shared/types.js"
import type {
  AppUpdatePlan,
  GitLabUrl,
  HelmBranchRefUpdate,
  PipelineInfo,
} from "../../../../src/types/types.js"
import {
  toAnchorName,
  toBranchName,
  toConfigUnitPath,
  toGitLabUrl,
  toTagName,
  toValuesPath,
} from "../../../../src/types/types.js"
import { makePlan } from "../../../helpers.js"

const defaultWebUrl = toGitLabUrl("https://gitlab.example.com/g/my-app")

const helmBranchRef = toBranchName("release/2026-q1")

const helmUpdate = {
  location: { valuesPath: toValuesPath("values.yaml"), anchorName: toAnchorName("targetBranch") },
  currentBranch: toBranchName("release/2025-q4"),
}

/** `collectMrEntries()`が返す形を組み立てる。向き先ブランチはclient単位なのでplansとは別に渡す */
function entriesOf(
  plans: readonly AppUpdatePlan[],
  helmBranches: readonly HelmBranchRefUpdate[] = [],
  webUrl: GitLabUrl = defaultWebUrl,
  pipeline: PipelineInfo | undefined = undefined,
): MrEntries {
  return {
    imageTags: plans.flatMap((plan) =>
      plan.updates.map((update) => ({ plan, update, webUrl, pipeline })),
    ),
    helmBranches,
    helmBranchRef,
  }
}

const UNIT_PATH = toConfigUnitPath("tenant1/client1")

const buildTitle = (entries: MrEntries): string => buildMrContent(UNIT_PATH, entries).title

const buildDescription = (entries: MrEntries): string =>
  buildMrContent(UNIT_PATH, entries).description

describe("buildMrContent（タイトル）", () => {
  it("イメージタグの書き換え箇所数を種別つきで含む", () => {
    expect(buildTitle(entriesOf([makePlan(), makePlan()]))).toBe(
      "Auto MR by yadokari: update tenant1/client1 (image tag 2)",
    )
  })

  it("1アプリが複数箇所を書き換える場合はアプリ数ではなく箇所数を数える", () => {
    const plan = makePlan({
      updates: [
        {
          location: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("x") },
          currentTag: toTagName("prev"),
        },
        {
          location: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("y") },
          currentTag: toTagName("prev"),
        },
        {
          location: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("z") },
          currentTag: toTagName("prev"),
        },
      ],
    })

    expect(buildTitle(entriesOf([plan]))).toBe(
      "Auto MR by yadokari: update tenant1/client1 (image tag 3)",
    )
  })

  it("イメージタグとHelm向き先ブランチの両方があるとき、種別ごとに件数を出す", () => {
    const plan = makePlan()

    expect(buildTitle(entriesOf([plan], [helmUpdate]))).toBe(
      "Auto MR by yadokari: update tenant1/client1 (image tag 1, helm branch 1)",
    )
  })

  it("Helm向き先ブランチだけが変わるとき、image tag と表示しない", () => {
    expect(buildTitle(entriesOf([], [helmUpdate]))).toBe(
      "Auto MR by yadokari: update tenant1/client1 (helm branch 1)",
    )
  })

  it("件数は本文のテーブルの行数と同じ配列から数える", () => {
    const entries = entriesOf([makePlan()], [helmUpdate])
    const { title, description } = buildMrContent(UNIT_PATH, entries)

    expect(title).toContain("image tag 1")
    expect(description.split("\n").filter((line) => line.includes("my-app"))).toHaveLength(1)
  })

  it("0件のときは件数の括弧を付けない", () => {
    expect(buildTitle(entriesOf([]))).toBe("Auto MR by yadokari: update tenant1/client1")
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
              location: { valuesPath: toValuesPath("a.yaml"), anchorName: toAnchorName("x") },
              currentTag: toTagName("prev"),
            },
            {
              location: { valuesPath: toValuesPath("b.yaml"), anchorName: toAnchorName("y") },
              currentTag: toTagName("prev"),
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
      entriesOf([makePlan()], [], defaultWebUrl, {
        webUrl: toGitLabUrl("https://gitlab.example.com/p/1"),
      }),
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

  it("向き先ブランチの更新は別セクションのテーブルにする", () => {
    const description = buildDescription(entriesOf([makePlan()], [helmUpdate]))

    const helmSectionIndex = description.indexOf("## Helmの向き先ブランチ")
    expect(helmSectionIndex).toBeGreaterThan(description.indexOf("## イメージタグ"))
    const helmSection = description.slice(helmSectionIndex)
    expect(helmSection).toContain("| 旧ブランチ | 新ブランチ | ファイル | アンカー |")
    expect(helmSection).toContain("`release/2025-q4`")
    expect(helmSection).toContain("`release/2026-q1`")
    expect(helmSection).toContain("| `values.yaml` | `targetBranch` |")
    expect(description.slice(0, helmSectionIndex)).not.toContain("release/2026-q1")
  })

  it("向き先ブランチの更新が無いとき、そのセクションを出さない", () => {
    expect(buildDescription(entriesOf([makePlan()]))).not.toContain("向き先ブランチ")
  })

  it("イメージタグの行が1件も無いとき、そのセクションごと出さない", () => {
    const description = buildDescription(entriesOf([], [helmUpdate]))

    expect(description).not.toContain("## イメージタグ")
    expect(description).toContain("## Helmの向き先ブランチ")
  })
})
