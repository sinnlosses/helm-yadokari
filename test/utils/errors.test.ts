import { describe, expect, it } from "vitest"

import { FatalError, toErrorMessage } from "../../src/utils/errors.js"

describe("FatalError", () => {
  it("cause が Error のとき message を引き継ぐ", () => {
    const err = new FatalError(401, new Error("Unauthorized"))
    expect(err.message).toBe("Unauthorized")
    expect(err.httpStatus).toBe(401)
  })

  it("cause が Error でないとき String() に変換した値を message にする", () => {
    const err = new FatalError(500, "raw string cause")
    expect(err.message).toBe("raw string cause")
    expect(err.httpStatus).toBe(500)
  })

  it("httpStatus が undefined のとき保持する", () => {
    const err = new FatalError(undefined, new Error("ECONNREFUSED"))
    expect(err.httpStatus).toBeUndefined()
  })
})

describe("toErrorMessage", () => {
  it("Error インスタンスのとき message を返す", () => {
    expect(toErrorMessage(new Error("something went wrong"))).toBe("something went wrong")
  })

  it("Error でない値のとき String() に変換して返す", () => {
    expect(toErrorMessage("raw string")).toBe("raw string")
    expect(toErrorMessage(42)).toBe("42")
    expect(toErrorMessage(null)).toBe("null")
  })
})
