import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { toReportOutputPath } from "../../../src/domain/types.js"
import { writeReport } from "../../../src/lib/report/write-report.js"
import { useTmpDir } from "../../helpers.js"

describe("writeReport", () => {
  const tmpDir = useTmpDir()

  it("指定パスにMarkdownをそのまま書き出す", () => {
    const relativePath = join(tmpDir.relativePath, "report.md")
    const path = toReportOutputPath(relativePath)

    writeReport(path, "# report\n")

    expect(existsSync(path)).toBe(true)
    expect(readFileSync(path, "utf-8")).toBe("# report\n")
  })

  it("親ディレクトリが無ければ作ってから書き出す", () => {
    const relativePath = join(tmpDir.relativePath, "nested", "dir", "report.md")
    const path = toReportOutputPath(relativePath)

    writeReport(path, "# nested\n")

    expect(existsSync(path)).toBe(true)
    expect(readFileSync(path, "utf-8")).toBe("# nested\n")
  })
})
