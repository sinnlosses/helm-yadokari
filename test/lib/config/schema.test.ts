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
    dir.writeConfigYaml("teamA-chart", "tenant1/client1",
      'apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: ""\n',
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("anchors.yaml の apps[].chart が空配列のとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart: []\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("anchors.yaml の apps[].chart[].valuesPath が無いとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - anchor: appVersion\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("anchors.yaml の apps[].chart[].anchor が無いとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })
})

describe("loadConfig（apps[].tagNaming）", () => {
  const CHART_YAML =
    "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n"
  const ANCHORS_YAML =
    "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n"

  it("省略時は mode: template の既定テンプレートになる", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1", ANCHORS_YAML)

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.apps[0]?.tagNaming).toEqual({
      mode: "template",
      template: "{branch}-build-at-{date}-{time}",
    })
  })

  it("指定したテンプレートがそのままAppConfigまで届く", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n" +
        "    tagNaming:\n      mode: template\n      template: '{date}-{time}-{branch}'\n",
    )
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1", ANCHORS_YAML)

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.apps[0]?.tagNaming).toEqual({
      mode: "template",
      template: "{date}-{time}-{branch}",
    })
  })

  it("templateに{branch}を含まないとき例外をスローする", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n" +
        "    tagNaming:\n      mode: template\n      template: '{date}-{time}'\n",
    )
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1", ANCHORS_YAML)

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("サポート外のmode（semver）を指定すると例外をスローする", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n" +
        "    tagNaming:\n      mode: semver\n",
    )
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1", ANCHORS_YAML)

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("未知のmodeを指定すると例外をスローする", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n" +
        "    tagNaming:\n      mode: yolo\n",
    )
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1", ANCHORS_YAML)

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })
})
