import { describe, expect, it } from "vitest"

import {
  loadEnv,
  loadOptionalEnv,
  parseConcurrencyLimit,
  parseTagFormat,
  parseTargetClients,
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

describe("parseTagFormat", () => {
  it("未指定のときデフォルトのフォーマットを返す", () => {
    expect(parseTagFormat(undefined)).toBe("{branch}-build-at-{date}-{time}")
  })

  it("指定されたフォーマットを検証して返す", () => {
    expect(parseTagFormat("{date}-{time}-{branch}")).toBe("{date}-{time}-{branch}")
  })

  it("不正なフォーマットのとき例外をスローする", () => {
    expect(() => parseTagFormat("{branch}-{date}")).toThrow("TAG_FORMAT")
  })
})

describe("parseTargetClients", () => {
  it("未指定のとき undefined を返す", () => {
    expect(parseTargetClients(undefined)).toBeUndefined()
  })

  it('"<tenantId>/<clientId>" 形式の文字列を1件の配列に分解する', () => {
    expect(parseTargetClients("tenantId1/clientId1")).toEqual([
      { tenantId: "tenantId1", clientId: "clientId1" },
    ])
  })

  it("カンマ区切りで複数件を配列に分解する", () => {
    expect(parseTargetClients("tenantId1/clientId1,tenantId2/clientId2")).toEqual([
      { tenantId: "tenantId1", clientId: "clientId1" },
      { tenantId: "tenantId2", clientId: "clientId2" },
    ])
  })

  it("各エントリ前後の空白を無視する", () => {
    expect(parseTargetClients(" tenantId1/clientId1 , tenantId2/clientId2 ")).toEqual([
      { tenantId: "tenantId1", clientId: "clientId1" },
      { tenantId: "tenantId2", clientId: "clientId2" },
    ])
  })

  it("区切り文字がないエントリがあるとき例外をスローする", () => {
    expect(() => parseTargetClients("tenantId1")).toThrow("TARGET_CLIENT")
  })

  it("区切り文字が2つ以上あるエントリがあるとき例外をスローする", () => {
    expect(() => parseTargetClients("tenantId1/clientId1/extra")).toThrow("TARGET_CLIENT")
  })

  it("複数件のうち1件でも不正な形式のとき例外をスローする", () => {
    expect(() => parseTargetClients("tenantId1/clientId1,tenantId2")).toThrow("TARGET_CLIENT")
  })

  it("tenantIdが空のとき例外をスローする", () => {
    expect(() => parseTargetClients("/clientId1")).toThrow("TARGET_CLIENT")
  })

  it("clientIdが空のとき例外をスローする", () => {
    expect(() => parseTargetClients("tenantId1/")).toThrow("TARGET_CLIENT")
  })
})
