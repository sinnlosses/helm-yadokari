import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { logger } from "../../src/utils/logger.js"

describe("logger", () => {
  let lastLog = ""
  let lastWarn = ""
  let lastError = ""
  let logSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    lastLog = ""
    lastWarn = ""
    lastError = ""
    logSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
      lastLog = String(args[0])
    })
    warnSpy = vi.spyOn(console, "warn").mockImplementation((...args) => {
      lastWarn = String(args[0])
    })
    errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
      lastError = String(args[0])
    })
  })

  afterEach(() => {
    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe("info", () => {
    it("level: info を含む JSON を出力する", () => {
      logger.info({ event: "test" })
      const output = JSON.parse(lastLog)
      expect(output.level).toBe("info")
    })

    it("渡したフィールドを含む", () => {
      logger.info({ event: "test", projectId: 1 })
      const output = JSON.parse(lastLog)
      expect(output.event).toBe("test")
      expect(output.projectId).toBe(1)
    })

    it("timestamp フィールドを含む", () => {
      logger.info({ event: "test" })
      const output = JSON.parse(lastLog)
      expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it("console.log を使う", () => {
      logger.info({ event: "test" })
      expect(logSpy).toHaveBeenCalledOnce()
      expect(errorSpy).not.toHaveBeenCalled()
    })
  })

  describe("warn", () => {
    it("level: warn を含む JSON を出力する", () => {
      logger.warn({ event: "test" })
      const output = JSON.parse(lastWarn)
      expect(output.level).toBe("warn")
    })

    it("console.warn を使う", () => {
      logger.warn({ event: "test" })
      expect(warnSpy).toHaveBeenCalledOnce()
      expect(logSpy).not.toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
    })
  })

  describe("error", () => {
    it("level: error を含む JSON を出力する", () => {
      logger.error({ event: "test" })
      const output = JSON.parse(lastError)
      expect(output.level).toBe("error")
    })

    it("console.error を使う", () => {
      logger.error({ event: "test" })
      expect(errorSpy).toHaveBeenCalledOnce()
      expect(logSpy).not.toHaveBeenCalled()
    })
  })

  describe("redact", () => {
    it("token キーの値を [REDACTED] に置換する", () => {
      logger.info({ event: "test", token: "secret-value" })
      const output = JSON.parse(lastLog)
      expect(output.token).toBe("[REDACTED]")
    })

    it("access_token キーの値を [REDACTED] に置換する", () => {
      logger.info({ event: "test", access_token: "my-token" })
      const output = JSON.parse(lastLog)
      expect(output.access_token).toBe("[REDACTED]")
    })

    it("authorization キーの値を [REDACTED] に置換する", () => {
      logger.error({ event: "test", authorization: "Bearer xyz" })
      const output = JSON.parse(lastError)
      expect(output.authorization).toBe("[REDACTED]")
    })

    it("password キーの値を [REDACTED] に置換する", () => {
      logger.info({ event: "test", password: "hunter2" })
      const output = JSON.parse(lastLog)
      expect(output.password).toBe("[REDACTED]")
    })

    it("secret キーの値を [REDACTED] に置換する", () => {
      logger.info({ event: "test", secret: "shh" })
      const output = JSON.parse(lastLog)
      expect(output.secret).toBe("[REDACTED]")
    })

    it("センシティブでないキーはそのまま出力する", () => {
      logger.info({ event: "mr_created", projectId: 1, result: "CREATED" })
      const output = JSON.parse(lastLog)
      expect(output.event).toBe("mr_created")
      expect(output.projectId).toBe(1)
      expect(output.result).toBe("CREATED")
    })

    it("キーの大文字小文字を区別しない", () => {
      logger.info({ event: "test", ACCESS_TOKEN: "top-secret" })
      const output = JSON.parse(lastLog)
      expect(output.ACCESS_TOKEN).toBe("[REDACTED]")
    })
  })
})
