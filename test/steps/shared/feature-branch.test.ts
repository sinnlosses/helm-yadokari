import { describe, expect, it } from "vitest"

import { buildFeatureBranch } from "../../../src/steps/shared/feature-branch.js"
import { toClientId, toTenantId } from "../../../src/types/types.js"

describe("buildFeatureBranch", () => {
  it("tenantId/clientIdを含むブランチ名を組み立てる", () => {
    expect(buildFeatureBranch(toTenantId("tenantId1"), toClientId("clientId1"))).toBe(
      "feature/yadokari/tenantId1/clientId1",
    )
  })
})
