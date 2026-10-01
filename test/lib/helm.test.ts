import { describe, expect, it } from "vitest"
import { parse as parseYaml } from "yaml"

import { toAnchorName, toValuesPath } from "../../src/domain/types.js"
import {
  getRequiredValueAtAnchor,
  lookupValueAtAnchor,
  setValueAtAnchor,
} from "../../src/lib/helm.js"

const VARIABLES_YAML = `variables:
  - &helmVersion develop
  - &tenant1client1AppsVersion main
  - &tenant1client2AppsVersion main
`

describe("lookupValueAtAnchor", () => {
  it("アンカー名に対応する値を返す", () => {
    expect(lookupValueAtAnchor(VARIABLES_YAML, toAnchorName("tenant1client1AppsVersion"))).toEqual({
      kind: "scalar",
      value: "main",
    })
  })

  it("ネストの深い位置にあるアンカーも見つける", () => {
    const yamlContent = "other:\n  nested:\n    - &deepAnchor value1\n"
    expect(lookupValueAtAnchor(yamlContent, toAnchorName("deepAnchor"))).toEqual({
      kind: "scalar",
      value: "value1",
    })
  })

  it("該当するアンカーが存在しないとき not_found を返す", () => {
    expect(lookupValueAtAnchor(VARIABLES_YAML, toAnchorName("noSuchAnchor"))).toEqual({
      kind: "not_found",
    })
  })

  it("クォートなしの数値に見える値（例: ブランチ名が数字だけ）も文字列として返す", () => {
    // yaml パッケージは `&b 2026` のようなクォートなしのスカラーを number としてパースする。
    // ここで文字列化しておかないと、versions.yaml側（versions.yamlの追跡ブランチはz.string()）の値と
    // 型が合わず比較できない
    const yamlContent = "variables:\n  - &b 2026\n"
    expect(lookupValueAtAnchor(yamlContent, toAnchorName("b"))).toEqual({
      kind: "scalar",
      value: "2026",
    })
  })

  it.each([
    ["値なし", "variables:\n  - &b\n"],
    ["チルダ", "variables:\n  - &b ~\n"],
    ["null", "variables:\n  - &b null\n"],
    ["空文字", 'variables:\n  - &b ""\n'],
  ])('値が%sのとき、空文字を返す（"null"という文字列にしない）', (_label, yamlContent) => {
    expect(lookupValueAtAnchor(yamlContent, toAnchorName("b"))).toEqual({
      kind: "scalar",
      value: "",
    })
  })

  it('引用符つきの"null"は文字列のまま返す', () => {
    expect(lookupValueAtAnchor('variables:\n  - &b "null"\n', toAnchorName("b"))).toEqual({
      kind: "scalar",
      value: "null",
    })
  })

  it("アンカーがマッピングに付いているとき（スカラーではないとき）、アンカー不在と区別できる non_scalar を返す", () => {
    const yamlContent = "group: &group\n  a: 1\n  b: 2\n"
    expect(lookupValueAtAnchor(yamlContent, toAnchorName("group"))).toEqual({ kind: "non_scalar" })
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

  it("アンカーがマッピングに付いているとき（スカラーではないとき）、アンカー不在とは区別できる例外をスローする", () => {
    const yamlContent = "group: &group\n  a: 1\n  b: 2\n"
    expect(() =>
      getRequiredValueAtAnchor(yamlContent, toAnchorName("group"), toValuesPath("values.yaml")),
    ).toThrow(
      'values.yaml のアンカー "group" はスカラー値に付いていません（マッピングまたはシーケンスに付いています） (valuesPath: values.yaml)',
    )
  })
})

describe("setValueAtAnchor", () => {
  it("アンカー名に対応する値だけを書き換え、他の要素は保持する", () => {
    const result = setValueAtAnchor(
      VARIABLES_YAML,
      toAnchorName("tenant1client1AppsVersion"),
      "release/1.2.3",
    )
    expect(lookupValueAtAnchor(result, toAnchorName("tenant1client1AppsVersion"))).toEqual({
      kind: "scalar",
      value: "release/1.2.3",
    })
    expect(lookupValueAtAnchor(result, toAnchorName("helmVersion"))).toEqual({
      kind: "scalar",
      value: "develop",
    })
    expect(lookupValueAtAnchor(result, toAnchorName("tenant1client2AppsVersion"))).toEqual({
      kind: "scalar",
      value: "main",
    })
  })

  it("該当するアンカーが存在しないとき例外をスローする", () => {
    expect(() => setValueAtAnchor(VARIABLES_YAML, toAnchorName("noSuchAnchor"), "x")).toThrow(
      "noSuchAnchor",
    )
  })

  it("アンカーがマッピングに付いているとき（スカラーではないとき）、アンカー不在とは区別できる例外をスローする", () => {
    const yamlContent = "group: &group\n  a: 1\n  b: 2\n"
    expect(() => setValueAtAnchor(yamlContent, toAnchorName("group"), "x")).toThrow(
      'values.yaml のアンカー "group" はスカラー値に付いていません（マッピングまたはシーケンスに付いています）',
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

  describe("アンカーの値以外を書き換えない", () => {
    const LONG = "x".repeat(100)
    const BASE = [
      "# header",
      "root:",
      "    deep:",
      `        long: ${LONG}`,
      "        note: keep   # comment",
      "        flow: {a: 1,   b: [1,2]}",
      "    tags:",
      "        - &target old   # trailing",
      "        - &other main",
      "",
    ].join("\n")
    const cases = [
      ["LF", (t: string) => t],
      ["CRLF", (t: string) => t.replaceAll("\n", "\r\n")],
      ["BOM付き", (t: string) => `\uFEFF${t}`],
      ["BOM付きCRLF", (t: string) => `\uFEFF${t.replaceAll("\n", "\r\n")}`],
    ] as const

    it.each(cases)("%s: 差分がアンカーの値だけになる", (_name, convert) => {
      const source = convert(BASE)
      const result = setValueAtAnchor(source, toAnchorName("target"), "release/1.2.3")
      expect(result).toBe(source.replace("&target old", "&target release/1.2.3"))
    })

    it.each([
      ['"old"', '"new"'],
      ["'old'", "'new'"],
      ["old", "new"],
    ])("元の値 %s の引用符の種類を保つ", (original, expected) => {
      const result = setValueAtAnchor(`a:\n  - &t ${original}  # c\n`, toAnchorName("t"), "new")
      expect(result).toBe(`a:\n  - &t ${expected}  # c\n`)
    })

    it.each([
      "2027",
      "true",
      "null",
      "a: b",
      "# x",
      "it's",
      "a,b",
      "[x]",
      "- y",
      "*z",
      "release/1.2.3",
    ])("特殊な値 %s も元の引用符に関わらずYAMLとして同じ値に読める", (value) => {
      for (const original of ['"old"', "'old'", "old"]) {
        for (const template of [`a:\n  - &t ${original}\n`, `a: [&t ${original}, z]\n`]) {
          const written = setValueAtAnchor(template, toAnchorName("t"), value)
          const reparsed: { a: readonly unknown[] } = parseYaml(written)
          expect(reparsed.a[0]).toBe(value)
          expect(reparsed.a).toHaveLength(template.includes("z") ? 2 : 1)
        }
      }
    })

    it.each([
      ["tag: &a\nother: 1\n", "tag: &a v\nother: 1\n"],
      ["tag: &a", "tag: &a v"],
      ["l:\n  - &a\n  - x\n", "l:\n  - &a v\n  - x\n"],
      ['tag: &a ""\n', 'tag: &a "v"\n'],
    ])("空値のアンカー %j を壊さず書き換える", (source, expected) => {
      const result = setValueAtAnchor(source, toAnchorName("a"), "v")
      expect(result).toBe(expected)
      expect(parseYaml(result)).toMatchObject(parseYaml(expected) as object)
    })

    it.each([
      ["tag: &a |\n  old\nother: 1\n", "tag: &a v\nother: 1\n"],
      ["tag: &a >-\r\n  old\r\nother: 1\r\n", "tag: &a v\r\nother: 1\r\n"],
      ["l:\n  - &a |\n    old\n  - x\n", "l:\n  - &a v\n  - x\n"],
    ])("ブロックスカラーのアンカー %j を次の行とつなげずに書き換える", (source, expected) => {
      const result = setValueAtAnchor(source, toAnchorName("a"), "v")
      expect(result).toBe(expected)
      expect(parseYaml(result)).toMatchObject(parseYaml(expected) as object)
    })
  })
})
