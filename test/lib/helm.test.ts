import { describe, expect, it } from "vitest"
import { parse as parseYaml } from "yaml"

import { getRequiredValueAtAnchor, getValueAtAnchor, setValueAtAnchor } from "../../src/lib/helm.js"
import { toAnchorName, toValuesPath } from "../../src/types/types.js"

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

  it("クォートなしの数値に見える値（例: ブランチ名が数字だけ）も文字列として返す", () => {
    // yaml パッケージは `&b 2026` のようなクォートなしのスカラーを number としてパースする。
    // ここで文字列化しておかないと、config.yaml側（branchToSyncはz.string()）の値と
    // 型が合わず比較できない
    const yamlContent = "variables:\n  - &b 2026\n"
    expect(getValueAtAnchor(yamlContent, toAnchorName("b"))).toBe("2026")
  })
})

describe("getRequiredValueAtAnchor", () => {
  it("該当するアンカーが存在しないとき、valuesPathを含む例外をスローする", () => {
    expect(() =>
      getRequiredValueAtAnchor(
        VARIABLES_YAML,
        toAnchorName("noSuchAnchor"),
        toValuesPath("values.yaml"),
      ),
    ).toThrow('values.yaml にアンカー "noSuchAnchor" が見つかりません (valuesPath: values.yaml)')
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

  it("数値に見える値（例: ブランチ名が数字だけ）を書き戻しても、文字列として読み取れる", () => {
    // 元のスカラーがクォートなしの数値としてパースされるケース（&b 2026 は yaml パッケージ上
    // number になる）。setValueAtAnchor は文字列として代入するため、再パース時に数値へ
    // 化けないようクォートが付くが、getRequiredValueAtAnchor で読み戻した値は文字列のまま保たれる
    const yamlContent = "variables:\n  - &b 2026\n"
    const written = setValueAtAnchor(yamlContent, toAnchorName("b"), "2027")
    expect(getRequiredValueAtAnchor(written, toAnchorName("b"), toValuesPath("values.yaml"))).toBe(
      "2027",
    )
    // yaml.parse()（このライブラリ自身のプレーンなパーサ）で素直に読んでも number に化けず、
    // 文字列として保たれていることを確認する（getRequiredValueAtAnchor側のString()変換に
    // 頼らない検証）
    const reparsed: { variables: readonly unknown[] } = parseYaml(written)
    expect(reparsed.variables[0]).toBe("2027")
    expect(typeof reparsed.variables[0]).toBe("string")
  })
})
