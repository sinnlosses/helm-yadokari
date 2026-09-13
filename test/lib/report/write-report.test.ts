import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { toReportOutputPath } from "../../../src/domain/types.js"
import { writeReport } from "../../../src/lib/report/write-report.js"

describe("writeReport", () => {
  let tmpDir = ""

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
    tmpDir = ""
  })

  it("指定パスにMarkdownをそのまま書き出す", () => {
    tmpDir = mkdtempSync(join(process.cwd(), "test-tmp-write-report-"))
    const relativePath = join(tmpDir.slice(process.cwd().length + 1), "report.md")
    const path = toReportOutputPath(relativePath)

    writeReport(path, "# report\n")

    expect(existsSync(path)).toBe(true)
    expect(readFileSync(path, "utf-8")).toBe("# report\n")
  })

  it("親ディレクトリが無ければ作ってから書き出す", () => {
    tmpDir = mkdtempSync(join(process.cwd(), "test-tmp-write-report-"))
    const relativePath = join(tmpDir.slice(process.cwd().length + 1), "nested", "dir", "report.md")
    const path = toReportOutputPath(relativePath)

    writeReport(path, "# nested\n")

    expect(existsSync(path)).toBe(true)
    expect(readFileSync(path, "utf-8")).toBe("# nested\n")
  })
})
