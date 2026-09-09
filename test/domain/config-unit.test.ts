import { describe, expect, it } from "vitest"

import { buildConfigUnitLocation, parseConfigUnitPath } from "../../src/domain/config-unit.js"
import { toChartDirName, toConfigUnitPath } from "../../src/types/types.js"

describe("parseConfigUnitPath", () => {
  it("セグメントに空白を含んでいても、空でなければ受け入れる（文字種の検証はしない）", () => {
    // GitLabブランチ名として不正な文字の検証はここでは行わず、ブランチ作成APIのエラーに
    // 委ねる（docs/requirements.md 4.2節）
    expect(parseConfigUnitPath("tenant 1/client 1")).toBe("tenant 1/client 1")
  })
})

describe("buildConfigUnitLocation", () => {
  it("chartディレクトリ名とunitPathを、unitPath内と同じ区切りでつなぐ", () => {
    // この文字列はエラーメッセージと検証結果の報告にそのまま出るので、書式を固定する
    expect(
      buildConfigUnitLocation(toChartDirName("teamA-chart"), toConfigUnitPath("tenant2/client1")),
    ).toBe("teamA-chart/tenant2/client1")
  })

  it("深さ1の設定ユニットでも同じ形になる", () => {
    expect(
      buildConfigUnitLocation(toChartDirName("teamB-chart"), toConfigUnitPath("my-unit")),
    ).toBe("teamB-chart/my-unit")
  })
})
