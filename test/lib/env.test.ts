import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  loadEnv,
  loadEnvConfig,
  loadOptionalEnv,
  parseConcurrencyLimit,
  parseConfigRootPath,
  parseTargetChart,
  parseTargetUnits,
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

describe("parseConfigRootPath", () => {
  let tmpDir = ""

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true })
    tmpDir = ""
  })

  it("未指定のとき デフォルトの config ディレクトリを返す", () => {
    expect(parseConfigRootPath(undefined)).toBe("config")
  })

  it("実在するディレクトリを指定したときそのまま返す", () => {
    tmpDir = mkdtempSync(join(process.cwd(), "test-tmp-"))
    const relativePath = tmpDir.slice(process.cwd().length + 1)
    expect(parseConfigRootPath(relativePath)).toBe(relativePath)
  })

  it("パストラバーサルのとき例外をスローし、メッセージに CONFIG_ROOT_PATH と指定値を含む", () => {
    expect(() => parseConfigRootPath("../../etc/passwd")).toThrow("CONFIG_ROOT_PATH")
    expect(() => parseConfigRootPath("../../etc/passwd")).toThrow("../../etc/passwd")
  })

  it("存在しないディレクトリのとき例外をスローし、メッセージに CONFIG_ROOT_PATH と指定値を含む", () => {
    expect(() => parseConfigRootPath("config-does-not-exist-xyz")).toThrow("CONFIG_ROOT_PATH")
    expect(() => parseConfigRootPath("config-does-not-exist-xyz")).toThrow(
      "config-does-not-exist-xyz",
    )
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

describe("parseTargetChart", () => {
  it("未指定のとき undefined を返す（空文字のディレクトリ名にはしない）", () => {
    expect(parseTargetChart(undefined)).toBeUndefined()
  })

  it("指定されたディレクトリ名をそのまま返す", () => {
    expect(parseTargetChart("teamA-chart")).toBe("teamA-chart")
  })
})

describe("parseTargetUnits", () => {
  it("未指定のとき undefined を返す", () => {
    expect(parseTargetUnits(undefined)).toBeUndefined()
  })

  it("深さ2のunitPathを1件の配列に分解する", () => {
    expect(parseTargetUnits("tenant1/client1")).toEqual(["tenant1/client1"])
  })

  it("深さ1のunitPathを受け入れる", () => {
    expect(parseTargetUnits("central")).toEqual(["central"])
  })

  it("深さ1と深さ2を混ぜて指定できる", () => {
    expect(parseTargetUnits("central,tenant1/client1")).toEqual(["central", "tenant1/client1"])
  })

  it("カンマ区切りで複数件を配列に分解する", () => {
    expect(parseTargetUnits("tenant1/client1,tenant2/client2")).toEqual([
      "tenant1/client1",
      "tenant2/client2",
    ])
  })

  it("各エントリ前後の空白を無視する", () => {
    expect(parseTargetUnits(" tenant1/client1 , tenant2/client2 ")).toEqual([
      "tenant1/client1",
      "tenant2/client2",
    ])
  })

  it("深さ3以上のエントリがあるとき例外をスローする", () => {
    expect(() => parseTargetUnits("tenant1/client1/extra")).toThrow("TARGET_UNITS")
  })

  it("複数件のうち1件でも不正な形式のとき例外をスローする", () => {
    expect(() => parseTargetUnits("tenant1/client1,tenant2/")).toThrow("TARGET_UNITS")
  })
})

describe("loadEnvConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("必須の環境変数だけが設定されているとき、省略可能な項目に既定値を入れる", () => {
    vi.stubEnv("GITLAB_URL", "https://gitlab.example.com")
    vi.stubEnv("ACCESS_TOKEN", "token")
    vi.stubEnv("CONFIG_ROOT_PATH", undefined)
    vi.stubEnv("CONCURRENCY_LIMIT", undefined)
    vi.stubEnv("DRY_RUN", undefined)
    vi.stubEnv("TARGET_CHART", undefined)
    vi.stubEnv("TARGET_UNITS", undefined)

    expect(loadEnvConfig()).toEqual({
      platformUrl: "https://gitlab.example.com",
      accessToken: "token",
      configRootPath: "config",
      concurrencyLimit: 3,
      dryRun: false,
      targetChart: undefined,
      targetUnits: undefined,
    })
  })

  it('DRY_RUN は文字列 "true" のときだけ dryRun を立てる', () => {
    vi.stubEnv("GITLAB_URL", "https://gitlab.example.com")
    vi.stubEnv("ACCESS_TOKEN", "token")

    vi.stubEnv("DRY_RUN", "true")
    expect(loadEnvConfig().dryRun).toBe(true)

    vi.stubEnv("DRY_RUN", "1")
    expect(loadEnvConfig().dryRun).toBe(false)
  })
})
