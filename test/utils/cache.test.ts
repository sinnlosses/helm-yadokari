import { describe, expect, it, vi } from "vitest"

import { cacheByArgs } from "../../src/utils/cache.js"

describe("cacheByArgs", () => {
  it("区切り文字が引数の値に現れても、引数の切れ目が違えば別のキーになる", async () => {
    // 区切りが値の中に現れうる文字（"#" や "-" など）だと、`("a#b", "c")` と `("a", "b#c")` が
    // 同じキーに潰れて、片方の結果がもう片方に返る。ヌル文字を区切りに選んでいる理由がこれ
    const read = vi.fn(async (ref: string, path: string) => `${ref}|${path}`)
    const cached = cacheByArgs(read)

    expect(await cached("a#b", "c")).toBe("a#b|c")
    expect(await cached("a", "b#c")).toBe("a|b#c")
    expect(read).toHaveBeenCalledTimes(2)
  })
})
