import { describe, expect, it } from "vitest"

import { parseConfigUnitPath } from "../../src/domain/config-unit.js"

describe("parseConfigUnitPath", () => {
  it("深さ2の文字列をConfigUnitPathとして受け入れる", () => {
    expect(parseConfigUnitPath("tenant1/client1")).toBe("tenant1/client1")
  })

  it("区切り文字がないとき undefined を返す", () => {
    expect(parseConfigUnitPath("tenant1")).toBeUndefined()
  })

  it("区切り文字が2つ以上あるとき undefined を返す", () => {
    expect(parseConfigUnitPath("tenant1/client1/extra")).toBeUndefined()
  })

  it("先頭セグメントが空のとき undefined を返す", () => {
    expect(parseConfigUnitPath("/client1")).toBeUndefined()
  })

  it("末尾セグメントが空のとき undefined を返す", () => {
    expect(parseConfigUnitPath("tenant1/")).toBeUndefined()
  })

  it("セグメントに空白を含んでいても、空でなければ受け入れる（文字種の検証はしない）", () => {
    // GitLabブランチ名として不正な文字の検証はここでは行わず、ブランチ作成APIのエラーに
    // 委ねる（docs/requirements.md 4.2節）
    expect(parseConfigUnitPath("tenant 1/client 1")).toBe("tenant 1/client 1")
  })
})
