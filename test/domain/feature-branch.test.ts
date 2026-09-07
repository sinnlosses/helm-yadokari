import { describe, expect, it } from "vitest"

import { buildFeatureBranch, isFeatureBranch } from "../../src/domain/feature-branch.js"
import { toClientId, toTenantId } from "../../src/types/types.js"

describe("buildFeatureBranch", () => {
  it("tenantId/clientIdを含むブランチ名を組み立てる", () => {
    expect(buildFeatureBranch(toTenantId("tenantId1"), toClientId("clientId1"))).toBe(
      "feature/yadokari/tenantId1/clientId1",
    )
  })
})

describe("isFeatureBranch", () => {
  it("buildFeatureBranchが組み立てたブランチ名を判定できる", () => {
    expect(
      isFeatureBranch(buildFeatureBranch(toTenantId("tenantId1"), toClientId("clientId1"))),
    ).toBe(true)
  })

  it("このツールが作ったものではないブランチ名を除外する", () => {
    expect(isFeatureBranch("main")).toBe(false)
    expect(isFeatureBranch("feature/other/tenantId1/clientId1")).toBe(false)
  })
})
