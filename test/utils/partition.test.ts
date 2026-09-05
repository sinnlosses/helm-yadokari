import { describe, expect, it } from "vitest"

import { left, partitionMap, right } from "../../src/utils/partition.js"

type Outcome = { status: "kept"; value: number } | { status: "settled"; reason: string }

const split = (outcome: Outcome) =>
  outcome.status === "kept" ? left(outcome.value) : right(outcome.reason)

describe("partitionMap", () => {
  it("left/right それぞれに取り出した値を積む", () => {
    const outcomes: Outcome[] = [
      { status: "kept", value: 1 },
      { status: "settled", reason: "skipped" },
      { status: "kept", value: 2 },
    ]

    expect(partitionMap(outcomes, split)).toEqual({ left: [1, 2], right: ["skipped"] })
  })

  it("入力順を保つ", () => {
    const outcomes: Outcome[] = [
      { status: "settled", reason: "a" },
      { status: "settled", reason: "b" },
      { status: "kept", value: 10 },
      { status: "settled", reason: "c" },
    ]

    expect(partitionMap(outcomes, split)).toEqual({ left: [10], right: ["a", "b", "c"] })
  })

  it("空配列のとき left/right とも空配列を返す", () => {
    expect(partitionMap([], split)).toEqual({ left: [], right: [] })
  })

  it("片側に1件も振り分けられない場合も、もう片側は正しく積まれる", () => {
    const outcomes: Outcome[] = [
      { status: "kept", value: 1 },
      { status: "kept", value: 2 },
    ]

    expect(partitionMap(outcomes, split)).toEqual({ left: [1, 2], right: [] })
  })

  it("入力配列を変更しない", () => {
    const outcomes: Outcome[] = [
      { status: "kept", value: 1 },
      { status: "settled", reason: "skipped" },
    ]

    partitionMap(outcomes, split)

    expect(outcomes).toEqual([
      { status: "kept", value: 1 },
      { status: "settled", reason: "skipped" },
    ])
  })
})
