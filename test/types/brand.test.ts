import { describe, expect, it } from "vitest"

import { toConfigRootPath } from "../../src/types/types.js"

describe("toConfigRootPath", () => {
  it(".. を含む相対パスのとき例外をスローする", () => {
    expect(() => toConfigRootPath("../../etc/passwd")).toThrow("CONFIG_PATH")
  })

  it(".. を含む絶対パスのとき例外をスローする", () => {
    expect(() => toConfigRootPath("/tmp/../etc/passwd")).toThrow("CONFIG_PATH")
  })

  it("cwd() 外の絶対パスのとき例外をスローする", () => {
    expect(() => toConfigRootPath("/etc/passwd")).toThrow("CONFIG_PATH")
  })

  it("label を指定すると、そのラベルでエラーメッセージを出す", () => {
    expect(() => toConfigRootPath("/etc/passwd", "設定ディレクトリ")).toThrow("設定ディレクトリ")
  })
})
