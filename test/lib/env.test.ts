import { describe, expect, it } from "vitest"

import {
  loadEnv,
  loadOptionalEnv,
  parseConcurrencyLimit,
  validateGitlabUrl,
} from "../../src/lib/env.js"

describe("loadEnv", () => {
  it("設定済みの環境変数の値を返す", () => {
    process.env["TEST_LOAD_ENV"] = "value"
    expect(loadEnv("TEST_LOAD_ENV")).toBe("value")
    delete process.env["TEST_LOAD_ENV"]
  })

  it("未設定のとき例外をスローする", () => {
    delete process.env["TEST_LOAD_ENV_MISSING"]
    expect(() => loadEnv("TEST_LOAD_ENV_MISSING")).toThrow("TEST_LOAD_ENV_MISSING")
  })

  it("空文字のとき例外をスローする", () => {
    process.env["TEST_LOAD_ENV_EMPTY"] = "   "
    expect(() => loadEnv("TEST_LOAD_ENV_EMPTY")).toThrow("TEST_LOAD_ENV_EMPTY")
    delete process.env["TEST_LOAD_ENV_EMPTY"]
  })
})

describe("loadOptionalEnv", () => {
  it("未設定のとき undefined を返す", () => {
    delete process.env["TEST_OPTIONAL_ENV"]
    expect(loadOptionalEnv("TEST_OPTIONAL_ENV")).toBeUndefined()
  })

  it("空文字のとき undefined を返す", () => {
    process.env["TEST_OPTIONAL_ENV"] = ""
    expect(loadOptionalEnv("TEST_OPTIONAL_ENV")).toBeUndefined()
    delete process.env["TEST_OPTIONAL_ENV"]
  })

  it("設定済みのとき値を返す", () => {
    process.env["TEST_OPTIONAL_ENV"] = "value"
    expect(loadOptionalEnv("TEST_OPTIONAL_ENV")).toBe("value")
    delete process.env["TEST_OPTIONAL_ENV"]
  })
})

describe("validateGitlabUrl", () => {
  it("https:// の URL を受け入れる", () => {
    expect(validateGitlabUrl("https://gitlab.example.com")).toBe("https://gitlab.example.com")
  })

  it("http:// の URL を受け入れる", () => {
    expect(validateGitlabUrl("http://gitlab.internal")).toBe("http://gitlab.internal")
  })

  it("URLとして不正な文字列のとき例外をスローする", () => {
    expect(() => validateGitlabUrl("not a url")).toThrow("GITLAB_URL")
  })

  it("http/https以外のスキームのとき例外をスローする", () => {
    expect(() => validateGitlabUrl("ftp://gitlab.example.com")).toThrow("GITLAB_URL")
  })
})

describe("parseConcurrencyLimit", () => {
  it("未指定のとき デフォルト値 3 を返す", () => {
    expect(parseConcurrencyLimit(undefined)).toBe(3)
  })

  it("1〜20の整数文字列を数値に変換する", () => {
    expect(parseConcurrencyLimit("5")).toBe(5)
    expect(parseConcurrencyLimit("1")).toBe(1)
    expect(parseConcurrencyLimit("20")).toBe(20)
  })

  it("0以下のとき例外をスローする", () => {
    expect(() => parseConcurrencyLimit("0")).toThrow("CONCURRENCY_LIMIT")
  })

  it("21以上のとき例外をスローする", () => {
    expect(() => parseConcurrencyLimit("21")).toThrow("CONCURRENCY_LIMIT")
  })

  it("非整数のとき例外をスローする", () => {
    expect(() => parseConcurrencyLimit("1.5")).toThrow("CONCURRENCY_LIMIT")
  })

  it("数値に変換できない文字列のとき例外をスローする", () => {
    expect(() => parseConcurrencyLimit("abc")).toThrow("CONCURRENCY_LIMIT")
  })
})
