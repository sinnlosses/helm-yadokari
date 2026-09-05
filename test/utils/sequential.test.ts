import { describe, expect, it } from "vitest"

import { reduceAsync } from "../../src/utils/sequential.js"

describe("reduceAsync", () => {
  it("前の要素の結果を次の要素に引き継いで積み上げる", async () => {
    const result = await reduceAsync([1, 2, 3], 0, async (acc, item) => acc + item)

    expect(result).toBe(6)
  })

  it("要素を先頭から順番に処理する（並列化しない）", async () => {
    const order: number[] = []
    const delays = [30, 10, 0]

    await reduceAsync(delays, 0, async (acc, delay) => {
      await new Promise((resolve) => setTimeout(resolve, delay))
      order.push(delay)
      return acc + 1
    })

    expect(order).toEqual([30, 10, 0])
  })

  it("空配列のとき初期値をそのまま返す", async () => {
    const result = await reduceAsync([], "initial", async () => "changed")

    expect(result).toBe("initial")
  })

  it("途中で例外がスローされたとき reject し、以降の要素を処理しない", async () => {
    const processed: number[] = []

    await expect(
      reduceAsync([1, 2, 3], 0, async (acc, item) => {
        if (item === 2) throw new Error("boom")
        processed.push(item)
        return acc + item
      }),
    ).rejects.toThrow("boom")
    expect(processed).toEqual([1])
  })
})
