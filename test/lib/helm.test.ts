import { describe, expect, it } from "vitest"

import { getValueAtPath, setValueAtPath } from "../../src/lib/helm.js"
import { toDotPath } from "../../src/types.js"

describe("getValueAtPath", () => {
  it("トップレベルのキーの値を返す", () => {
    expect(getValueAtPath("tag: v1.0.0\n", toDotPath("tag"))).toBe("v1.0.0")
  })

  it("ネストしたdotパスの値を返す", () => {
    expect(getValueAtPath("image:\n  tag: v1.0.0\n", toDotPath("image.tag"))).toBe("v1.0.0")
  })

  it("深くネストしたdotパスの値を返す", () => {
    expect(getValueAtPath("a:\n  b:\n    c: v1.0.0\n", toDotPath("a.b.c"))).toBe("v1.0.0")
  })

  it("パスが存在しないとき undefined を返す", () => {
    expect(getValueAtPath("image:\n  tag: v1.0.0\n", toDotPath("image.repository"))).toBeUndefined()
  })

  it("途中のキーがオブジェクトでないとき undefined を返す", () => {
    expect(getValueAtPath("image: v1.0.0\n", toDotPath("image.tag"))).toBeUndefined()
  })

  it("数値やbooleanの値は文字列に変換して返す", () => {
    expect(getValueAtPath("image:\n  tag: 123\n", toDotPath("image.tag"))).toBe("123")
  })
})

describe("setValueAtPath", () => {
  it("トップレベルのキーの値を書き換える", () => {
    const result = setValueAtPath("tag: v1.0.0\nother: keep\n", toDotPath("tag"), "v2.0.0")
    expect(getValueAtPath(result, toDotPath("tag"))).toBe("v2.0.0")
    expect(getValueAtPath(result, toDotPath("other"))).toBe("keep")
  })

  it("ネストしたdotパスの値を書き換える", () => {
    const result = setValueAtPath(
      "image:\n  repository: my-app\n  tag: v1.0.0\n",
      toDotPath("image.tag"),
      "v2.0.0",
    )
    expect(getValueAtPath(result, toDotPath("image.tag"))).toBe("v2.0.0")
    expect(getValueAtPath(result, toDotPath("image.repository"))).toBe("my-app")
  })

  it("パスが存在しないとき例外をスローする", () => {
    expect(() =>
      setValueAtPath("image:\n  tag: v1.0.0\n", toDotPath("image.missing.deep"), "x"),
    ).toThrow("image.missing.deep")
  })

  it("途中のキーがオブジェクトでないとき例外をスローする", () => {
    expect(() => setValueAtPath("image: v1.0.0\n", toDotPath("image.tag"), "v2.0.0")).toThrow(
      "image.tag",
    )
  })
})
