import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_TAG_FORMAT } from "../../src/domain/tag-format.js"
import {
  loadEnv,
  loadEnvConfig,
  loadOptionalEnv,
  parseConcurrencyLimit,
  parseConfigDirPath,
  parseTagFormat,
  parseTargetChart,
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

describe("parseConfigDirPath", () => {
  let tmpDir = ""

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true })
    tmpDir = ""
  })

  it("未指定のとき デフォルトの config ディレクトリを返す", () => {
    expect(parseConfigDirPath(undefined)).toBe("config")
  })

  it("実在するディレクトリを指定したときそのまま返す", () => {
    tmpDir = mkdtempSync(join(process.cwd(), "test-tmp-"))
    const relativePath = tmpDir.slice(process.cwd().length + 1)
    expect(parseConfigDirPath(relativePath)).toBe(relativePath)
  })

  it("パストラバーサルのとき例外をスローし、メッセージに CONFIG_PATH と指定値を含む", () => {
    expect(() => parseConfigDirPath("../../etc/passwd")).toThrow("CONFIG_PATH")
    expect(() => parseConfigDirPath("../../etc/passwd")).toThrow("../../etc/passwd")
  })

  it("存在しないディレクトリのとき例外をスローし、メッセージに CONFIG_PATH と指定値を含む", () => {
    expect(() => parseConfigDirPath("config-does-not-exist-xyz")).toThrow("CONFIG_PATH")
    expect(() => parseConfigDirPath("config-does-not-exist-xyz")).toThrow(
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

describe("parseTargetChart", () => {
  it("未指定のとき undefined を返す（空文字のディレクトリ名にはしない）", () => {
    expect(parseTargetChart(undefined)).toBeUndefined()
  })

  it("指定されたディレクトリ名をそのまま返す", () => {
    expect(parseTargetChart("teamA-chart")).toBe("teamA-chart")
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
    expect(() => parseTargetClients("tenantId1")).toThrow("TARGET_CLIENTS")
  })

  it("複数件のうち1件でも不正な形式のとき例外をスローする", () => {
    expect(() => parseTargetClients("tenantId1/clientId1,tenantId2")).toThrow("TARGET_CLIENTS")
  })
})

describe("loadEnvConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("必須の環境変数だけが設定されているとき、省略可能な項目に既定値を入れる", () => {
    vi.stubEnv("GITLAB_URL", "https://gitlab.example.com")
    vi.stubEnv("ACCESS_TOKEN", "token")
    vi.stubEnv("CONFIG_PATH", undefined)
    vi.stubEnv("CONCURRENCY_LIMIT", undefined)
    vi.stubEnv("DRY_RUN", undefined)
    vi.stubEnv("TAG_FORMAT", undefined)
    vi.stubEnv("TARGET_CHART", undefined)
    vi.stubEnv("TARGET_CLIENTS", undefined)

    expect(loadEnvConfig()).toEqual({
      gitlabUrl: "https://gitlab.example.com",
      accessToken: "token",
      configDirPath: "config",
      concurrencyLimit: 3,
      dryRun: false,
      targetChart: undefined,
      targetClients: undefined,
      tagFormat: DEFAULT_TAG_FORMAT,
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
