import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { toAccessTokenEnvName } from "../../src/domain/types.js"
import {
  loadAccessTokens,
  loadEnv,
  loadEnvConfig,
  loadOptionalEnv,
  parseConcurrencyLimit,
  parseConfigRootPath,
  parsePlatform,
  parseReportOutputPath,
  parseTargetChart,
  parseTargetUnits,
  validateGithubUrl,
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

describe("validateGithubUrl", () => {
  it("https:// の URL を受け入れる", () => {
    expect(validateGithubUrl("https://github.example.com")).toBe("https://github.example.com")
  })

  it("URLとして不正な文字列のとき例外をスローする", () => {
    expect(() => validateGithubUrl("not a url")).toThrow("GITHUB_URL")
  })

  it("http/https以外のスキームのとき例外をスローする", () => {
    expect(() => validateGithubUrl("ftp://github.example.com")).toThrow("GITHUB_URL")
  })
})

describe("parsePlatform", () => {
  it('未指定のとき既定値 "gitlab" を返す', () => {
    expect(parsePlatform(undefined)).toBe("gitlab")
  })

  it('"gitlab" を指定するとそのまま返す', () => {
    expect(parsePlatform("gitlab")).toBe("gitlab")
  })

  it('"github" を指定するとそのまま返す', () => {
    expect(parsePlatform("github")).toBe("github")
  })

  it("未知の値のとき例外をスローし、メッセージに PLATFORM と指定値を含む", () => {
    expect(() => parsePlatform("bitbucket")).toThrow("PLATFORM")
    expect(() => parsePlatform("bitbucket")).toThrow("bitbucket")
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

describe("parseReportOutputPath", () => {
  let tmpDir = ""

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true })
    tmpDir = ""
  })

  it("未指定のとき デフォルトの出力パスを返す", () => {
    expect(parseReportOutputPath(undefined)).toBe("report/report.md")
  })

  it("指定されたパスをそのまま返す（これから書き出すファイルなので実在チェックはしない）", () => {
    expect(parseReportOutputPath("out/summary.md")).toBe("out/summary.md")
  })

  it("実在するディレクトリを指しても例外をスローしない", () => {
    tmpDir = mkdtempSync(join(process.cwd(), "test-tmp-"))
    const relativePath = join(tmpDir.slice(process.cwd().length + 1), "report.md")
    expect(parseReportOutputPath(relativePath)).toBe(relativePath)
  })

  it("パストラバーサルのとき例外をスローし、メッセージに REPORT_OUTPUT_PATH と指定値を含む", () => {
    expect(() => parseReportOutputPath("../../etc/passwd")).toThrow("REPORT_OUTPUT_PATH")
    expect(() => parseReportOutputPath("../../etc/passwd")).toThrow("../../etc/passwd")
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
    vi.stubEnv("PLATFORM", undefined)
    vi.stubEnv("GITLAB_URL", "https://gitlab.example.com")
    vi.stubEnv("CONFIG_ROOT_PATH", undefined)
    vi.stubEnv("REPORT_OUTPUT_PATH", undefined)
    vi.stubEnv("CONCURRENCY_LIMIT", undefined)
    vi.stubEnv("DRY_RUN", undefined)
    vi.stubEnv("TARGET_CHART", undefined)
    vi.stubEnv("TARGET_UNITS", undefined)

    expect(loadEnvConfig()).toEqual({
      platform: "gitlab",
      platformUrl: "https://gitlab.example.com",
      configRootPath: "config",
      reportOutputPath: "report/report.md",
      concurrencyLimit: 3,
      dryRun: false,
      targetChart: undefined,
      targetUnits: undefined,
    })
  })

  it('DRY_RUN は文字列 "true" のときだけ dryRun を立てる', () => {
    vi.stubEnv("GITLAB_URL", "https://gitlab.example.com")

    vi.stubEnv("DRY_RUN", "true")
    expect(loadEnvConfig().dryRun).toBe(true)

    vi.stubEnv("DRY_RUN", "1")
    expect(loadEnvConfig().dryRun).toBe(false)
  })

  it("PLATFORM未指定のとき gitlab 扱いで GITLAB_URL を読む（GITHUB_URLは無視）", () => {
    vi.stubEnv("PLATFORM", undefined)
    vi.stubEnv("GITLAB_URL", "https://gitlab.example.com")
    vi.stubEnv("GITHUB_URL", "https://github.example.com")

    const env = loadEnvConfig()
    expect(env.platform).toBe("gitlab")
    expect(env.platformUrl).toBe("https://gitlab.example.com")
  })

  it("PLATFORM=github のとき GITHUB_URL を読み、GITLAB_URLは無視する", () => {
    vi.stubEnv("PLATFORM", "github")
    vi.stubEnv("GITHUB_URL", "https://github.example.com")
    vi.stubEnv("GITLAB_URL", "https://gitlab.example.com")

    const env = loadEnvConfig()
    expect(env.platform).toBe("github")
    expect(env.platformUrl).toBe("https://github.example.com")
  })

  it("PLATFORM=github で GITHUB_URL が未設定のとき例外をスローする", () => {
    vi.stubEnv("PLATFORM", "github")
    vi.stubEnv("GITHUB_URL", undefined)
    vi.stubEnv("GITLAB_URL", "https://gitlab.example.com")

    expect(() => loadEnvConfig()).toThrow("GITHUB_URL")
  })

  it("PLATFORM が未知の値のとき例外をスローする", () => {
    vi.stubEnv("PLATFORM", "bitbucket")
    vi.stubEnv("GITLAB_URL", "https://gitlab.example.com")

    expect(() => loadEnvConfig()).toThrow("PLATFORM")
  })
})

describe("loadAccessTokens", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("宣言された名前ごとに設定済みのトークンをMapに詰めて返す", () => {
    vi.stubEnv("ACCESS_TOKEN_TEAM_A", "token-a")
    vi.stubEnv("ACCESS_TOKEN_TEAM_B", "token-b")

    const tokens = loadAccessTokens([
      toAccessTokenEnvName("ACCESS_TOKEN_TEAM_A"),
      toAccessTokenEnvName("ACCESS_TOKEN_TEAM_B"),
    ])

    expect(tokens.get(toAccessTokenEnvName("ACCESS_TOKEN_TEAM_A"))).toBe("token-a")
    expect(tokens.get(toAccessTokenEnvName("ACCESS_TOKEN_TEAM_B"))).toBe("token-b")
  })

  it("未設定の名前は例外にせず表から落とす（1グループの付け替え漏れで実行全体を失敗させないため）", () => {
    vi.stubEnv("ACCESS_TOKEN_TEAM_A", "token-a")
    vi.stubEnv("ACCESS_TOKEN_TEAM_B", undefined)

    const tokens = loadAccessTokens([
      toAccessTokenEnvName("ACCESS_TOKEN_TEAM_A"),
      toAccessTokenEnvName("ACCESS_TOKEN_TEAM_B"),
    ])

    expect(tokens.size).toBe(1)
    expect(tokens.has(toAccessTokenEnvName("ACCESS_TOKEN_TEAM_B"))).toBe(false)
  })

  it("空配列を渡すと空のMapを返す", () => {
    expect(loadAccessTokens([]).size).toBe(0)
  })
})
