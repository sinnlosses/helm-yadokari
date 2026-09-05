import { describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import { useConfigDir } from "./fixture.js"

const dir = useConfigDir()

describe("loadConfig（helmTargetBranch）", () => {
  it("anchors.yamlのhelm.chart[].valuesPathがappのchart[].valuesPathと一致すると、appのhelmTargetBranchにマージされる", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\nhelm:\n  chart:\n    - valuesPath: a.yaml\n      anchor: targetBranch\n",
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.apps[0]?.helmTargetBranch).toEqual({
      branch: "release/2026-q1",
      targets: [{ valuesPath: "a.yaml", anchor: "targetBranch" }],
    })
  })

  it("どちらにも無いとき、app.helmTargetBranchはundefinedになる", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n",
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.apps[0]?.helmTargetBranch).toBeUndefined()
  })

  it("config.yamlのhelm.branchToSyncはあるがanchors.yamlのhelm.chartが無いとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("helm.branchToSync")
  })

  it("anchors.yamlのhelm.chartはあるがconfig.yamlのhelm.branchToSyncが無いとき例外をスローする", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\nhelm:\n  chart:\n    - valuesPath: a.yaml\n      anchor: targetBranch\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("helm.chart")
  })

  it("helm.chartが空配列のとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\nhelm:\n  chart: []\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("helmが指定されているのに、一部のappのvaluesPathがhelm.chart[]に無いとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n  - projectId: 2\n    projectName: app-2\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n  - projectId: 2\n    projectName: app-2\n    chart:\n      - valuesPath: b.yaml\n        anchor: appVersion\nhelm:\n  chart:\n    - valuesPath: a.yaml\n      anchor: targetBranch\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("app-2")
  })

  it("helmが指定されているとき、全appのvaluesPathがhelm.chart[]でカバーされていれば読み込める", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n  - projectId: 2\n    projectName: app-2\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n  - projectId: 2\n    projectName: app-2\n    chart:\n      - valuesPath: b.yaml\n        anchor: appVersion\nhelm:\n  chart:\n    - valuesPath: a.yaml\n      anchor: targetBranchA\n    - valuesPath: b.yaml\n      anchor: targetBranchB\n",
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.apps[0]?.helmTargetBranch).toBeDefined()
    expect(chartAndAppsList[0]?.apps[1]?.helmTargetBranch).toBeDefined()
  })

  it("1アプリのchart内で複数のvaluesPathがそれぞれhelm.chart[]と一致すると、helmTargetBranch.targetsに複数含める", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: webapi.yaml\n        anchor: webapiVersion\n      - valuesPath: batch.yaml\n        anchor: batchVersion\nhelm:\n  chart:\n    - valuesPath: webapi.yaml\n      anchor: webapiTargetBranch\n    - valuesPath: batch.yaml\n      anchor: batchTargetBranch\n",
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.apps[0]?.helmTargetBranch).toEqual({
      branch: "release/2026-q1",
      targets: [
        { valuesPath: "webapi.yaml", anchor: "webapiTargetBranch" },
        { valuesPath: "batch.yaml", anchor: "batchTargetBranch" },
      ],
    })
  })
})
