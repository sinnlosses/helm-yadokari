import { describe, expect, it } from "vitest"

import type { ConfigUnitReport, ConfigUnitUpdateOutcome } from "../../../src/domain/types.js"
import { toChartDirName, toConfigUnitPath, toProjectName } from "../../../src/domain/types.js"
import { formatReport } from "../../../src/lib/report/format-report.js"

/** 本番の`toConfigUnitReport()`と同じ「識別情報 + outcome」の組み立て方に揃える（`as`を使わずに済む） */
function makeReport(
  outcome: ConfigUnitUpdateOutcome,
  unitPath = "tenant1/client1",
): ConfigUnitReport {
  return {
    chartDirName: toChartDirName("teamA-chart"),
    unitPath: toConfigUnitPath(unitPath),
    chartProjectName: toProjectName("teamA-chart"),
    ...outcome,
  }
}

describe("formatReport", () => {
  it("ヘッダに実行時刻・所要時間・dryRun・件数サマリを載せる", () => {
    const markdown = formatReport(
      {
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        durationMs: 1234,
        dryRun: false,
        counts: { CREATED: 1, SKIPPED: 2, ERROR: 3 },
      },
      [],
    )

    expect(markdown).toContain("- 実行時刻: 2026-01-01T00:00:00.000Z")
    expect(markdown).toContain("- 所要時間: 1234ms")
    expect(markdown).toContain("- dryRun: false")
    expect(markdown).toContain("- 件数: CREATED 1 / SKIPPED 2 / ERROR 3")
  })

  it("dryRun:trueのときヘッダにそのまま反映する", () => {
    const markdown = formatReport(
      {
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        durationMs: 0,
        dryRun: true,
        counts: { CREATED: 0, SKIPPED: 0, ERROR: 0 },
      },
      [],
    )

    expect(markdown).toContain("- dryRun: true")
  })

  it("設定ユニット1件につき1行、chart / unit / 結果 / 理由の表を作る", () => {
    const markdown = formatReport(
      {
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        durationMs: 0,
        dryRun: false,
        counts: { CREATED: 1, SKIPPED: 1, ERROR: 0 },
      },
      [
        makeReport({ result: "CREATED", reason: undefined }),
        makeReport({ result: "SKIPPED", reason: "no_diff" }, "tenant2/client2"),
      ],
    )

    expect(markdown).toContain("| chart | unit | 結果 | 理由 |")
    expect(markdown).toContain("| teamA-chart | tenant1/client1 | CREATED | - |")
    expect(markdown).toContain("| teamA-chart | tenant2/client2 | SKIPPED | no_diff |")
  })

  it("ERRORの理由に含まれる`|`と改行を、表が崩れない形に直す", () => {
    const markdown = formatReport(
      {
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        durationMs: 0,
        dryRun: false,
        counts: { CREATED: 0, SKIPPED: 0, ERROR: 1 },
      },
      [makeReport({ result: "ERROR", reason: "httpStatus: 400, message: a|b\nc" })],
    )

    const row = markdown.split("\n").find((line) => line.startsWith("| teamA-chart"))
    expect(row).toBe(
      "| teamA-chart | tenant1/client1 | ERROR | httpStatus: 400, message: a\\|b c |",
    )
  })

  it("reportsが空でも表のヘッダ行は出す", () => {
    const markdown = formatReport(
      {
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        durationMs: 0,
        dryRun: false,
        counts: { CREATED: 0, SKIPPED: 0, ERROR: 0 },
      },
      [],
    )

    expect(markdown).toContain("| chart | unit | 結果 | 理由 |")
  })
})
