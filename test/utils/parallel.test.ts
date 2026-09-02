import { describe, expect, it, vi } from "vitest"

import { FatalError } from "../../src/utils/errors.js"
import { mapWithConcurrency } from "../../src/utils/parallel.js"
import { makeHttpError } from "../helpers.js"

describe("mapWithConcurrency", () => {
  it("空配列のとき空配列を返す", async () => {
    expect(await mapWithConcurrency([], 3, async (n) => n)).toEqual([])
  })

  it("各要素にfnを適用し、入力順を保った配列で返す", async () => {
    const result = await mapWithConcurrency([1, 2, 3], 3, async (n) => n * 10)
    expect(result).toEqual([10, 20, 30])
  })

  it("concurrencyLimitを超えて同時実行しない", async () => {
    let active = 0
    let maxActive = 0
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active--
    })
    expect(maxActive).toBeLessThanOrEqual(2)
  })

  it("FatalErrorが発生したとき reject する", async () => {
    await expect(
      mapWithConcurrency([1], 3, async () => {
        throw new FatalError(401, makeHttpError(401))
      }),
    ).rejects.toThrow(FatalError)
  })

  it("FatalErrorが発生した後、未着手の要素にはfnを呼び出さない", async () => {
    const fn = vi.fn().mockImplementation(async (n: number) => {
      if (n === 0) throw new FatalError(401, makeHttpError(401))
      await new Promise((resolve) => setTimeout(resolve, 5))
      return n
    })
    await expect(mapWithConcurrency([0, 1, 2, 3, 4], 1, fn)).rejects.toThrow(FatalError)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("非FatalErrorはそのままrejectする", async () => {
    const err = new Error("boom")
    await expect(
      mapWithConcurrency([1], 3, async () => {
        throw err
      }),
    ).rejects.toBe(err)
  })
})
