import { describe, expect, it } from "vitest"

import { timed } from "../../src/utils/timer.js"

describe("timed", () => {
  it("fn の戻り値を返す", async () => {
    const { value } = await timed(async () => 42)
    expect(value).toBe(42)
  })
})
