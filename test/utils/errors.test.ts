import { describe, expect, it } from "vitest"

import { FatalError, toErrorMessage, toErrorStack } from "../../src/utils/errors.js"

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

  it("context を渡さないとき空で持つ", () => {
    expect(new FatalError(500, new Error("boom")).context).toEqual({})
  })

  it("withContext は元を変えずに context を足した新しい FatalError を返し、既にある値を残す", () => {
    const cause = new Error("boom")
    const original = new FatalError(503, cause, { appProjectName: "my-app", chartDirName: "inner" })

    const enriched = original.withContext({ chartDirName: "outer", unitPath: "my-unit" })

    expect(enriched).not.toBe(original)
    expect(enriched.context).toEqual({
      appProjectName: "my-app",
      chartDirName: "inner",
      unitPath: "my-unit",
    })
    expect(original.context).toEqual({ appProjectName: "my-app", chartDirName: "inner" })
    expect(enriched.httpStatus).toBe(503)
    expect(enriched.cause).toBe(cause)
    expect(enriched.message).toBe("boom")
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

describe("toErrorStack", () => {
  it("Error でない値のとき undefined を返す", () => {
    expect(toErrorStack("raw string")).toBeUndefined()
  })

  it("cause の Error のスタックを Caused by: でつなぐ", () => {
    const inner = new Error("inner failure")
    const outer = new Error("outer failure", { cause: inner })

    const stack = toErrorStack(outer)

    expect(stack).toContain(outer.stack)
    expect(stack).toContain(`\nCaused by: ${inner.stack}`)
  })

  it("Error でない cause は辿らず中身も載せない", () => {
    const err = new Error("boom", { cause: { request: { headers: { token: "secret-token" } } } })

    expect(toErrorStack(err)).toBe(err.stack)
  })

  it("stack を持たない Error は名前とメッセージで代える", () => {
    const err = new Error("no stack")
    delete err.stack

    expect(toErrorStack(err)).toBe("Error: no stack")
  })

  it("循環した cause は一度見た Error で止める", () => {
    const a = new Error("a")
    const b = new Error("b", { cause: a })
    a.cause = b

    expect(toErrorStack(a)?.split("Caused by: ")).toHaveLength(2)
  })
})
