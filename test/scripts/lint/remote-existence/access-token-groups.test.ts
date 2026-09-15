import { describe, expect, it } from "vitest"

import {
  findMissingAccessTokenProblems,
  groupByAccessTokenEnv,
} from "../../../../scripts/lint/remote-existence/access-token-groups.js"
import {
  toAccessToken,
  toAccessTokenEnvName,
  toChartDirName,
} from "../../../../src/domain/types.js"
import { makeApp, makeConfigUnit } from "../../../helpers.js"

const TEAM_B = toAccessTokenEnvName("ACCESS_TOKEN_TEAM_B")
const TEAM_C = toAccessTokenEnvName("ACCESS_TOKEN_TEAM_C")

describe("groupByAccessTokenEnv", () => {
  it("同じ accessTokenEnv を宣言した設定ユニットを1つのグループにまとめる", () => {
    const unit1 = makeConfigUnit([makeApp()], {
      chartDirName: toChartDirName("chart-1"),
      accessTokenEnv: TEAM_B,
    })
    const unit2 = makeConfigUnit([makeApp()], {
      chartDirName: toChartDirName("chart-2"),
      accessTokenEnv: TEAM_B,
    })

    const groups = groupByAccessTokenEnv([unit1, unit2])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.accessTokenEnv).toBe(TEAM_B)
    expect(groups[0]?.configUnits).toEqual([unit1, unit2])
  })

  it("別々の accessTokenEnv は別々のグループに分ける", () => {
    const teamB = makeConfigUnit([makeApp()], {
      chartDirName: toChartDirName("chart-2"),
      accessTokenEnv: TEAM_B,
    })
    const teamC = makeConfigUnit([makeApp()], {
      chartDirName: toChartDirName("chart-3"),
      accessTokenEnv: TEAM_C,
    })

    const groups = groupByAccessTokenEnv([teamB, teamC])

    expect(groups.map((group) => group.accessTokenEnv)).toEqual([TEAM_B, TEAM_C])
    expect(groups[0]?.configUnits).toEqual([teamB])
    expect(groups[1]?.configUnits).toEqual([teamC])
  })
})

describe("findMissingAccessTokenProblems", () => {
  it("必要なトークンが揃っていれば空配列を返す", () => {
    const teamB = makeConfigUnit([makeApp()], {
      chartDirName: toChartDirName("chart-2"),
      accessTokenEnv: TEAM_B,
    })
    const groups = groupByAccessTokenEnv([teamB])

    const problems = findMissingAccessTokenProblems(
      groups,
      new Map([[TEAM_B, toAccessToken("team-b-token")]]),
    )

    expect(problems).toEqual([])
  })

  it("宣言された環境変数が未設定なら、chart名と環境変数名を含めて報告する", () => {
    const groups = groupByAccessTokenEnv([
      makeConfigUnit([makeApp()], {
        chartDirName: toChartDirName("chart-2"),
        accessTokenEnv: TEAM_B,
      }),
    ])

    const problems = findMissingAccessTokenProblems(groups, new Map())

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("chart-2")
    expect(problems[0]).toContain("ACCESS_TOKEN_TEAM_B")
  })

  it("複数のchartが同じ未設定トークンを必要としても、chartごとに1件ずつ報告する", () => {
    const groups = groupByAccessTokenEnv([
      makeConfigUnit([makeApp()], {
        chartDirName: toChartDirName("chart-2"),
        accessTokenEnv: TEAM_B,
      }),
      makeConfigUnit([makeApp()], {
        chartDirName: toChartDirName("chart-3"),
        accessTokenEnv: TEAM_B,
      }),
    ])

    const problems = findMissingAccessTokenProblems(groups, new Map())

    expect(problems.filter((problem) => problem.includes("ACCESS_TOKEN_TEAM_B"))).toHaveLength(2)
  })
})
