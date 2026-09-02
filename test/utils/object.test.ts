import { describe, expect, it } from "vitest"

import { isPlainObject } from "../../src/utils/object.js"

describe("isPlainObject", () => {
  it("プレーンオブジェクトのとき true を返す", () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
  })

  it("配列のとき false を返す", () => {
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject([1, 2, 3])).toBe(false)
  })

  it("null のとき false を返す", () => {
    expect(isPlainObject(null)).toBe(false)
  })

  it("プリミティブ値のとき false を返す", () => {
    expect(isPlainObject("string")).toBe(false)
    expect(isPlainObject(42)).toBe(false)
    expect(isPlainObject(true)).toBe(false)
    expect(isPlainObject(undefined)).toBe(false)
  })
})
