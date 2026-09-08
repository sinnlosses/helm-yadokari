import { describe, expect, it } from "vitest"

import { parseConfigUnitPath } from "../../src/domain/config-unit.js"

describe("parseConfigUnitPath", () => {
  it("セグメントに空白を含んでいても、空でなければ受け入れる（文字種の検証はしない）", () => {
    // GitLabブランチ名として不正な文字の検証はここでは行わず、ブランチ作成APIのエラーに
    // 委ねる（docs/requirements.md 4.2節）
    expect(parseConfigUnitPath("tenant 1/client 1")).toBe("tenant 1/client 1")
  })
})
