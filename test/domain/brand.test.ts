import { describe, expect, it } from "vitest"

import {
  toAccessTokenEnvName,
  toConfigRootPath,
  toReportOutputPath,
} from "../../src/domain/types.js"

describe("toAccessTokenEnvName", () => {
  it('"ACCESS_TOKEN_" に続けて英大文字・数字・アンダースコアの名前を受け入れる', () => {
    expect(toAccessTokenEnvName("ACCESS_TOKEN_TEAM_A")).toBe("ACCESS_TOKEN_TEAM_A")
    expect(toAccessTokenEnvName("ACCESS_TOKEN_1")).toBe("ACCESS_TOKEN_1")
  })

  it("接尾辞なしの ACCESS_TOKEN（既定トークン）のとき例外をスローする", () => {
    expect(() => toAccessTokenEnvName("ACCESS_TOKEN")).toThrow("accessTokenEnv")
  })

  it("接頭辞が ACCESS_TOKEN_ でない名前のとき例外をスローする", () => {
    expect(() => toAccessTokenEnvName("RENOVATE_TOKEN")).toThrow("accessTokenEnv")
  })

  it("小文字を含む名前のとき例外をスローする", () => {
    expect(() => toAccessTokenEnvName("ACCESS_TOKEN_team_a")).toThrow("accessTokenEnv")
  })

  it("ACCESS_TOKEN_ の直後に何も続かないとき例外をスローする", () => {
    expect(() => toAccessTokenEnvName("ACCESS_TOKEN_")).toThrow("accessTokenEnv")
  })
})

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
