import { describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import { useConfigDir } from "./fixture.js"

const dir = useConfigDir()

describe("loadConfig（config.yaml と anchors.yaml の紐づけ）", () => {
  it("config.yamlのappに対応するprojectIdがanchors.yamlに無いとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("app-1")
  })

  it("anchors.yamlにconfig.yamlに存在しないappがあるとき例外をスローする（孤児設定）", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n  - projectId: 999\n    projectName: removed-app\n    chart:\n      - valuesPath: old.yaml\n        anchor: oldVersion\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("removed-app")
  })

  it("config.yamlとanchors.yamlでprojectIdが同じでもprojectNameが一致しないとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1-typo\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("projectName")
  })
})

describe("loadConfig（重複指定の検証）", () => {
  const CHART_YAML = `
chart:
  projectId: 888
  projectName: teamA-chart
  mrTargetBranch: develop
`

  it("config.yamlに同じprojectIdのappが2件あるとき例外をスローする", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: my-app
    branchToSync: main
  - projectId: 1
    projectName: my-app
    branchToSync: develop
`,
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: my-app
    chart:
      - valuesPath: charts/my-app/values.yaml
        anchor: myAppVersion
`,
    )

    expect(() => loadConfig(dir.path)).toThrow("projectId 1")
  })

  it("anchors.yamlに同じprojectIdのappが2件あるとき例外をスローする", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: my-app
    branchToSync: main
`,
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: my-app
    chart:
      - valuesPath: charts/my-app/values.yaml
        anchor: myAppVersion
  - projectId: 1
    projectName: my-app
    chart:
      - valuesPath: charts/my-app/values.yaml
        anchor: otherAnchor
`,
    )

    expect(() => loadConfig(dir.path)).toThrow("projectId 1")
  })

  it("別々のappが同じ valuesPath + anchor を指しているとき例外をスローする", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: app-one
    branchToSync: main
  - projectId: 2
    projectName: app-two
    branchToSync: main
`,
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: app-one
    chart:
      - valuesPath: charts/shared/values.yaml
        anchor: sharedAnchor
  - projectId: 2
    projectName: app-two
    chart:
      - valuesPath: charts/shared/values.yaml
        anchor: sharedAnchor
`,
    )

    expect(() => loadConfig(dir.path)).toThrow("sharedAnchor")
  })

  it("1つのappが同じ valuesPath + anchor を2回指定しているとき例外をスローする", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: my-app
    branchToSync: main
`,
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: my-app
    chart:
      - valuesPath: charts/my-app/values.yaml
        anchor: myAppVersion
      - valuesPath: charts/my-app/values.yaml
        anchor: myAppVersion
`,
    )

    expect(() => loadConfig(dir.path)).toThrow("myAppVersion")
  })

  it("イメージタグとHelm向き先ブランチが同じ valuesPath + anchor を奪い合うとき例外をスローする", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
helm:
  branchToSync: release/2026-q1
apps:
  - projectId: 1
    projectName: my-app
    branchToSync: main
`,
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: my-app
    chart:
      - valuesPath: charts/my-app/values.yaml
        anchor: myAppVersion
helm:
  chart:
    - valuesPath: charts/my-app/values.yaml
      anchor: myAppVersion
`,
    )

    expect(() => loadConfig(dir.path)).toThrow("myAppVersion")
  })

  it("valuesPathが同じでもanchorが違えば読み込める", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: app-one
    branchToSync: main
  - projectId: 2
    projectName: app-two
    branchToSync: main
`,
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: app-one
    chart:
      - valuesPath: charts/shared/values.yaml
        anchor: appOneVersion
  - projectId: 2
    projectName: app-two
    chart:
      - valuesPath: charts/shared/values.yaml
        anchor: appTwoVersion
`,
    )

    const { chartAndAppsList } = loadConfig(dir.path)

    expect(chartAndAppsList[0]?.apps).toHaveLength(2)
  })
})
