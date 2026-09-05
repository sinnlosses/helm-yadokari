import { describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import { useConfigDir } from "./fixture.js"

const dir = useConfigDir()

describe("loadConfig（スキーマ検証エラー）", () => {
  it("chart.yaml の projectId が数値でないとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      'chart:\n  projectId: "not-a-number"\n  projectName: teamA-chart\n  mrTargetBranch: develop\n',
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("chart.yaml の mrTargetBranch がないとき例外をスローする", () => {
    dir.writeChartYaml("teamA-chart", "chart:\n  projectId: 1\n  projectName: teamA-chart\n")
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("config.yaml の branchToSync が空文字のとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      'apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: ""\n',
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("anchors.yaml の apps[].chart が空配列のとき例外をスローする", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart: []\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("anchors.yaml の apps[].chart[].valuesPath が無いとき例外をスローする", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - anchor: appVersion\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("anchors.yaml の apps[].chart[].anchor が無いとき例外をスローする", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })
})
