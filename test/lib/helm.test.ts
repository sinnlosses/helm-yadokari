import { describe, expect, it } from "vitest"

import { getValueAtAnchor, setValueAtAnchor } from "../../src/lib/helm.js"
import { toAnchorName } from "../../src/types/types.js"

const VARIABLES_YAML = `variables:
  - &helmVersion develop
  - &tenant1client1AppsVersion main
  - &tenant1client2AppsVersion main
`

describe("getValueAtAnchor", () => {
  it("アンカー名に対応する値を返す", () => {
    expect(getValueAtAnchor(VARIABLES_YAML, toAnchorName("tenant1client1AppsVersion"))).toBe("main")
  })

  it("ネストの深い位置にあるアンカーも見つける", () => {
    const yamlContent = "other:\n  nested:\n    - &deepAnchor value1\n"
    expect(getValueAtAnchor(yamlContent, toAnchorName("deepAnchor"))).toBe("value1")
  })

  it("該当するアンカーが存在しないとき undefined を返す", () => {
    expect(getValueAtAnchor(VARIABLES_YAML, toAnchorName("noSuchAnchor"))).toBeUndefined()
  })
})

describe("setValueAtAnchor", () => {
  it("アンカー名に対応する値だけを書き換え、他の要素は保持する", () => {
    const result = setValueAtAnchor(
      VARIABLES_YAML,
      toAnchorName("tenant1client1AppsVersion"),
      "release/1.2.3",
    )
    expect(getValueAtAnchor(result, toAnchorName("tenant1client1AppsVersion"))).toBe(
      "release/1.2.3",
    )
    expect(getValueAtAnchor(result, toAnchorName("helmVersion"))).toBe("develop")
    expect(getValueAtAnchor(result, toAnchorName("tenant1client2AppsVersion"))).toBe("main")
  })

  it("アンカー記法自体は書き換え後も維持される", () => {
    const result = setValueAtAnchor(
      VARIABLES_YAML,
      toAnchorName("tenant1client1AppsVersion"),
      "release/1.2.3",
    )
    expect(result).toContain("&tenant1client1AppsVersion release/1.2.3")
  })

  it("該当するアンカーが存在しないとき例外をスローする", () => {
    expect(() => setValueAtAnchor(VARIABLES_YAML, toAnchorName("noSuchAnchor"), "x")).toThrow(
      "noSuchAnchor",
    )
  })
})
