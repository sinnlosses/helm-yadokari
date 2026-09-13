import { describe, expect, it } from "vitest"

import { toConfigRootPath, toReportOutputPath } from "../../src/domain/types.js"

describe("toConfigRootPath", () => {
  it(".. を含む相対パスのとき例外をスローする", () => {
    expect(() => toConfigRootPath("../../etc/passwd")).toThrow("CONFIG_ROOT_PATH")
  })

  it(".. を含む絶対パスのとき例外をスローする", () => {
    expect(() => toConfigRootPath("/tmp/../etc/passwd")).toThrow("CONFIG_ROOT_PATH")
  })

  it("cwd() 外の絶対パスのとき例外をスローする", () => {
    expect(() => toConfigRootPath("/etc/passwd")).toThrow("CONFIG_ROOT_PATH")
  })

  it("label を指定すると、そのラベルでエラーメッセージを出す", () => {
    expect(() => toConfigRootPath("/etc/passwd", "設定ディレクトリ")).toThrow("設定ディレクトリ")
  })
})

describe("toReportOutputPath", () => {
  it(".. を含む相対パスのとき例外をスローする", () => {
    expect(() => toReportOutputPath("../../etc/passwd")).toThrow("REPORT_OUTPUT_PATH")
  })

  it("cwd() 外の絶対パスのとき例外をスローする", () => {
    expect(() => toReportOutputPath("/etc/passwd")).toThrow("REPORT_OUTPUT_PATH")
  })

  it("label を指定すると、そのラベルでエラーメッセージを出す", () => {
    expect(() => toReportOutputPath("/etc/passwd", "レポート出力先")).toThrow("レポート出力先")
  })

  it("実在しないパスでも例外をスローしない（これから書き出すファイルのため）", () => {
    expect(() => toReportOutputPath("report/does-not-exist-yet.md")).not.toThrow()
  })
})
