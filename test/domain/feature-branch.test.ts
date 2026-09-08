import { describe, expect, it } from "vitest"

import { buildFeatureBranch, isFeatureBranch } from "../../src/domain/feature-branch.js"
import { toConfigUnitPath } from "../../src/types/types.js"

describe("buildFeatureBranch", () => {
  it("unitPathを含むブランチ名を組み立てる", () => {
    expect(buildFeatureBranch(toConfigUnitPath("tenant1/client1"))).toBe(
      "feature/yadokari/tenant1/client1",
    )
  })

  it("深さ1のunitPathでも、そのまま1階層のブランチ名にする", () => {
    expect(buildFeatureBranch(toConfigUnitPath("central"))).toBe("feature/yadokari/central")
  })
})

describe("isFeatureBranch", () => {
  it("buildFeatureBranchが組み立てたブランチ名を判定できる", () => {
    expect(isFeatureBranch(buildFeatureBranch(toConfigUnitPath("tenant1/client1")))).toBe(true)
  })

  it("このツールが作ったものではないブランチ名を除外する", () => {
    expect(isFeatureBranch("main")).toBe(false)
    expect(isFeatureBranch("feature/other/tenant1/client1")).toBe(false)
  })
})
