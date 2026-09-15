import { describe, expect, it } from "vitest"

import {
  buildAppConfigYamlContent,
  buildRegistryYamlContent,
  buildTokenSkipGuidance,
  buildValuesYamlContent,
  computeExpiresAt,
  defaultTokenName,
} from "../../../scripts/smoke/group-fixture-content.js"

describe("buildValuesYamlContent", () => {
  it("smokeBAppVersion・smokeBHelmTargetBranchの2アンカーを持つvariables配列を返す", () => {
    const content = buildValuesYamlContent("main-build-at-20260101-000000")

    expect(content).toBe(
      "variables:\n" +
        "  - &smokeBAppVersion main-build-at-20260101-000000\n" +
        "  - &smokeBHelmTargetBranch release/2026-q1\n",
    )
  })
})

describe("buildRegistryYamlContent", () => {
  it("accessTokenEnv・chartToUpdate・appSpecsを含むregistry.yamlを返す", () => {
    const content = buildRegistryYamlContent(111, 222)

    expect(content).toBe(
      "accessTokenEnv: ACCESS_TOKEN_SMOKE_B\n" +
        "chartToUpdate:\n" +
        '  projectId: "111"\n' +
        "  projectName: yadokari-smoke-test-chart-b\n" +
        "  mrTargetBranch: main\n" +
        "appSpecs:\n" +
        '  - projectId: "222"\n' +
        "    projectName: sample-smoke-b-app\n" +
        '    tagFormat: "{branch}-build-at-{date}-{time}"\n',
    )
  })
})

describe("buildAppConfigYamlContent", () => {
  it("helm.locationsとapps[].locationsの両方に同じvaluesPathを持つconfig.yamlを返す", () => {
    const content = buildAppConfigYamlContent(222)

    expect(content).toBe(
      "helm:\n" +
        "  branchRef: release/2026-q1\n" +
        "  locations:\n" +
        "    - valuesPath: charts/smoke-b-app/values.yaml\n" +
        "      anchor: smokeBHelmTargetBranch\n" +
        "apps:\n" +
        '  - projectId: "222"\n' +
        "    projectName: sample-smoke-b-app\n" +
        "    branchToSync: main\n" +
        "    locations:\n" +
        "      - valuesPath: charts/smoke-b-app/values.yaml\n" +
        "        anchor: smokeBAppVersion\n",
    )
  })
})

describe("computeExpiresAt", () => {
  it("90日後の日付をyyyy-mm-dd形式で返す", () => {
    expect(computeExpiresAt(new Date("2026-09-15T00:00:00Z"))).toBe("2026-12-14")
  })

  it("年をまたぐ場合も繰り上がる", () => {
    expect(computeExpiresAt(new Date("2026-12-01T00:00:00Z"))).toBe("2027-03-01")
  })
})

describe("buildTokenSkipGuidance", () => {
  it("Free プランの制約と.envに足す行のひな型を含む", () => {
    const guidance = buildTokenSkipGuidance()

    expect(guidance).toContain("Free")
    expect(guidance).toContain("ACCESS_TOKEN_SMOKE_B")
    expect(guidance).toContain("ACCESS_TOKEN_SMOKE_B=<read_api+write_repositoryスコープ以上のPAT>")
  })
})

describe("defaultTokenName", () => {
  it("スラッシュを含まないパスはそのまま yadokari- を付ける", () => {
    expect(defaultTokenName("yadokari-smoke-b")).toBe("yadokari-yadokari-smoke-b")
  })

  it("サブグループを含むパスは最後のセグメントを使う", () => {
    expect(defaultTokenName("sinnlosses-group/sub-group")).toBe("yadokari-sub-group")
  })

  it("末尾にスラッシュがあっても最後の意味のあるセグメントを使う", () => {
    expect(defaultTokenName("sinnlosses-group/")).toBe("yadokari-sinnlosses-group")
  })
})
