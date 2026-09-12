import { describe, expect, it } from "vitest"

import { toConfigDirPath } from "../../src/types/types.js"

describe("toConfigDirPath", () => {
  it(".. を含む相対パスのとき例外をスローする", () => {
    expect(() => toConfigDirPath("../../etc/passwd")).toThrow("CONFIG_PATH")
  })

  it(".. を含む絶対パスのとき例外をスローする", () => {
    expect(() => toConfigDirPath("/tmp/../etc/passwd")).toThrow("CONFIG_PATH")
  })

  it("cwd() 外の絶対パスのとき例外をスローする", () => {
    expect(() => toConfigDirPath("/etc/passwd")).toThrow("CONFIG_PATH")
  })

  it("label を指定すると、そのラベルでエラーメッセージを出す", () => {
    expect(() => toConfigDirPath("/etc/passwd", "設定ディレクトリ")).toThrow("設定ディレクトリ")
  })
})
