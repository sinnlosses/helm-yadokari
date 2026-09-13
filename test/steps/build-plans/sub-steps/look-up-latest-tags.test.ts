import { describe, expect, it } from "vitest"

import { buildTagSourceKey } from "../../../../src/domain/tag-source.js"
import { toProjectId, toProjectName } from "../../../../src/domain/types.js"
import { lookUpLatestTags } from "../../../../src/steps/build-plans/sub-steps/look-up-latest-tags.js"
import { makeApp, resolvedAtHead } from "../../../helpers.js"

describe("lookUpLatestTags", () => {
  it("解決済みの最新タグをappごとに引き当てて返す", () => {
    const appA = makeApp({ projectId: toProjectId("1"), projectName: toProjectName("app-a") })
    const appB = makeApp({ projectId: toProjectId("2"), projectName: toProjectName("app-b") })
    const resolvedA = resolvedAtHead()
    const resolvedB = resolvedAtHead()
    const resolvedTags = new Map([
      [buildTagSourceKey(appA), resolvedA],
      [buildTagSourceKey(appB), resolvedB],
    ])

    expect(lookUpLatestTags([appA, appB], resolvedTags)).toEqual([
      { app: appA, latestTag: resolvedA.status === "ok" ? resolvedA.value : undefined },
      { app: appB, latestTag: resolvedB.status === "ok" ? resolvedB.value : undefined },
    ])
  })

  it("解決が失敗しているappがあるとき、持ち回ってきた例外を投げ直す", () => {
    const app = makeApp()
    const error = new Error("解決に失敗")
    const resolvedTags = new Map([[buildTagSourceKey(app), { status: "failed" as const, error }]])

    expect(() => lookUpLatestTags([app], resolvedTags)).toThrow(error)
  })
})
