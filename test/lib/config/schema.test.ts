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
      'apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: ""\n    tagFormat: "{branch}-build-at-{date}-{time}"\n',
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("anchors.yaml の apps[].chart が空配列のとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    tagFormat: '{branch}-build-at-{date}-{time}'\n",
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    tagFormat: '{branch}-build-at-{date}-{time}'\n",
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    tagFormat: '{branch}-build-at-{date}-{time}'\n",
    )
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })
})

describe("loadConfig（apps[].tagFormat）", () => {
  const CHART_YAML =
    "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n"
  const ANCHORS_YAML =
    "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n"
  const APP_YAML = "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n"

  it("指定したタグ形式がそのままAppConfigまで届く", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      `${APP_YAML}    tagFormat: '{date}-{time}-{branch}'\n`,
    )
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1", ANCHORS_YAML)

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.apps[0]?.tagFormat).toBe("{date}-{time}-{branch}")
  })

  it("省略したとき例外をスローする", () => {
    dir.writeChartYaml("teamA-chart", CHART_YAML)
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", APP_YAML)
    dir.writeAnchorsYaml("teamA-chart", "tenant1/client1", ANCHORS_YAML)

    expect(() => loadConfig(dir.path)).toThrow("tagFormat は必須です")
  })

  it.each(["{date}-{time}", "{branch}-{date}", "{branch}", "{time}", "{date}"])(
    "プレースホルダが足りないフォーマット %s は例外をスローする",
    (tagFormat) => {
      dir.writeChartYaml("teamA-chart", CHART_YAML)
      dir.writeConfigYaml(
        "teamA-chart",
        "tenant1/client1",
        `${APP_YAML}    tagFormat: '${tagFormat}'\n`,
      )
      dir.writeAnchorsYaml("teamA-chart", "tenant1/client1", ANCHORS_YAML)

      expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
    },
  )
})
