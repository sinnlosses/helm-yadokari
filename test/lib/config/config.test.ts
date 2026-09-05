import { mkdirSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import { useConfigDir } from "./fixture.js"

const dir = useConfigDir()

describe("loadConfig（パストラバーサル）", () => {
  it(".. を含む相対パスのとき例外をスローする", () => {
    expect(() => loadConfig("../../etc/passwd")).toThrow("CONFIG_PATH")
  })

  it(".. を含む絶対パスのとき例外をスローする", () => {
    expect(() => loadConfig("/tmp/../etc/passwd")).toThrow("CONFIG_PATH")
  })

  it("cwd() 外の絶対パスのとき例外をスローする", () => {
    expect(() => loadConfig("/etc/passwd")).toThrow("CONFIG_PATH")
  })
})

describe("loadConfig（正常系）", () => {
  it("chart.yaml と config.yaml と anchors.yaml を読み込み ChartAndApps を返す", () => {
    dir.writeChartYaml(
      "teamA-chart",
      `
chart:
  projectId: 888
  projectName: teamA-chart
  mrTargetBranch: develop
`,
    )
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
        anchor: appVersion
`,
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList).toHaveLength(1)
    expect(chartAndAppsList[0]).toEqual({
      chartDir: "teamA-chart",
      tenantId: "tenantId1",
      clientId: "clientId1",
      chart: {
        projectId: 888,
        projectName: "teamA-chart",
        mrTargetBranch: "develop",
      },
      apps: [
        {
          projectId: 1,
          projectName: "my-app",
          branchToSync: "main",
          chart: [
            {
              valuesPath: "charts/my-app/values.yaml",
              anchor: "appVersion",
            },
          ],
        },
      ],
    })
  })

  it("複数のchartディレクトリをすべて読み込む", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml("teamA-chart", "tenantId1", "clientId1", "apps: []\n")
    dir.writeChartYaml(
      "teamB-chart",
      "chart:\n  projectId: 2\n  projectName: teamB-chart\n  mrTargetBranch: main\n",
    )
    dir.writeConfigYaml("teamB-chart", "tenantId1", "clientId1", "apps: []\n")

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList.map((g) => g.chartDir)).toEqual(["teamA-chart", "teamB-chart"])
  })

  it("同じchartディレクトリ配下の複数tenant/clientはそれぞれ別のChartAndAppsになる（T-019）", () => {
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
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId2",
      "apps:\n  - projectId: 2\n    projectName: app-2\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId2",
      "apps:\n  - projectId: 2\n    projectName: app-2\n    chart:\n      - valuesPath: b.yaml\n        anchor: appVersion\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId2",
      "clientId1",
      "apps:\n  - projectId: 3\n    projectName: app-3\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId2",
      "clientId1",
      "apps:\n  - projectId: 3\n    projectName: app-3\n    chart:\n      - valuesPath: c.yaml\n        anchor: appVersion\n",
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList).toHaveLength(3)
    expect(
      chartAndAppsList.map((g) => [g.tenantId, g.clientId, g.apps.map((a) => a.projectName)]),
    ).toEqual([
      ["tenantId1", "clientId1", ["app-1"]],
      ["tenantId1", "clientId2", ["app-2"]],
      ["tenantId2", "clientId1", ["app-3"]],
    ])
  })

  it("chart.yaml がないディレクトリは無視する", () => {
    dir.writeFile("not-a-chart/readme.txt", "hello")
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml("teamA-chart", "tenantId1", "clientId1", "apps: []\n")

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList.map((g) => g.chartDir)).toEqual(["teamA-chart"])
  })

  it("config.yaml が存在しないtenant/clientディレクトリはChartAndAppsを作らない（T-019）", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    mkdirSync(join(dir.path, "teamA-chart", "tenantId1", "clientId1"), { recursive: true })

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList).toEqual([])
  })

  it("configディレクトリが空のとき chartAndAppsList: [] を返す", () => {
    expect(loadConfig(dir.path)).toEqual({ chartAndAppsList: [] })
  })
})

describe("loadConfig（chartの複数指定）", () => {
  it("1アプリにつきchartを複数指定できる（同一タグを複数箇所へ反映する用途）", () => {
    dir.writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: my-service\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: my-service\n    chart:\n      - valuesPath: charts/webapi/values.yaml\n        anchor: appVersion\n      - valuesPath: charts/batch/values.yaml\n        anchor: batchAppsVersion\n",
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.apps[0]?.chart).toEqual([
      { valuesPath: "charts/webapi/values.yaml", anchor: "appVersion" },
      { valuesPath: "charts/batch/values.yaml", anchor: "batchAppsVersion" },
    ])
  })
})

describe("loadConfig（存在しないパス）", () => {
  it("ディレクトリが存在しないとき例外をスローする", () => {
    expect(() => loadConfig(join(dir.path, "nonexistent"))).toThrow()
  })
})

describe("loadConfig（target絞り込み）", () => {
  beforeEach(() => {
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
    dir.writeConfigYaml(
      "teamA-chart",
      "tenantId2",
      "clientId2",
      "apps:\n  - projectId: 2\n    projectName: app-2\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamA-chart",
      "tenantId2",
      "clientId2",
      "apps:\n  - projectId: 2\n    projectName: app-2\n    chart:\n      - valuesPath: b.yaml\n        anchor: appVersion\n",
    )
    dir.writeChartYaml(
      "teamB-chart",
      "chart:\n  projectId: 2\n  projectName: teamB-chart\n  mrTargetBranch: main\n",
    )
    dir.writeConfigYaml(
      "teamB-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 3\n    projectName: app-3\n    branchToSync: main\n",
    )
    dir.writeAnchorsYaml(
      "teamB-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 3\n    projectName: app-3\n    chart:\n      - valuesPath: c.yaml\n        anchor: appVersion\n",
    )
  })

  it("chartDirを指定すると該当chartのみ返す", () => {
    const { chartAndAppsList } = loadConfig(dir.path, { chartDir: "teamA-chart" })
    expect(chartAndAppsList).toHaveLength(2)
    expect(chartAndAppsList.every((g) => g.chartDir === "teamA-chart")).toBe(true)
    expect(
      chartAndAppsList.map((g) => [g.tenantId, g.clientId, g.apps.map((a) => a.projectName)]),
    ).toEqual([
      ["tenantId1", "clientId1", ["app-1"]],
      ["tenantId2", "clientId2", ["app-2"]],
    ])
  })

  it("存在しないchartDirを指定すると例外をスローする", () => {
    expect(() => loadConfig(dir.path, { chartDir: "no-such-chart" })).toThrow("TARGET_CHART_DIR")
  })

  it("clientsを1件指定すると該当アプリのみ返す（chart横断）", () => {
    const { chartAndAppsList } = loadConfig(dir.path, {
      clients: [{ tenantId: "tenantId1", clientId: "clientId1" }],
    })
    expect(chartAndAppsList.map((g) => [g.chartDir, g.apps.map((a) => a.projectName)])).toEqual([
      ["teamA-chart", ["app-1"]],
      ["teamB-chart", ["app-3"]],
    ])
  })

  it("clientsを複数指定すると該当する全アプリを返す", () => {
    const { chartAndAppsList } = loadConfig(dir.path, {
      clients: [
        { tenantId: "tenantId1", clientId: "clientId1" },
        { tenantId: "tenantId2", clientId: "clientId2" },
      ],
    })
    expect(
      chartAndAppsList.map((g) => [
        g.chartDir,
        g.tenantId,
        g.clientId,
        g.apps.map((a) => a.projectName),
      ]),
    ).toEqual([
      ["teamA-chart", "tenantId1", "clientId1", ["app-1"]],
      ["teamA-chart", "tenantId2", "clientId2", ["app-2"]],
      ["teamB-chart", "tenantId1", "clientId1", ["app-3"]],
    ])
  })

  it("chartDir + clients を組み合わせて絞り込める", () => {
    const { chartAndAppsList } = loadConfig(dir.path, {
      chartDir: "teamA-chart",
      clients: [{ tenantId: "tenantId2", clientId: "clientId2" }],
    })
    expect(chartAndAppsList).toHaveLength(1)
    expect(chartAndAppsList[0]?.apps.map((a) => a.projectName)).toEqual(["app-2"])
  })

  it("存在しないtenantId/clientIdの組み合わせのとき例外をスローする", () => {
    expect(() =>
      loadConfig(dir.path, { clients: [{ tenantId: "tenantId1", clientId: "no-such-client" }] }),
    ).toThrow("TARGET_CLIENT")
  })

  it("chartDirは存在するがclientsが一致しないとき例外をスローする", () => {
    expect(() =>
      loadConfig(dir.path, {
        chartDir: "teamA-chart",
        clients: [{ tenantId: "tenantId1", clientId: "clientId2" }],
      }),
    ).toThrow("TARGET_CLIENT")
  })

  it("複数指定したclientsのうち1件でも見つからないとき例外をスローし、見つからなかったものを明示する", () => {
    expect(() =>
      loadConfig(dir.path, {
        clients: [
          { tenantId: "tenantId1", clientId: "clientId1" },
          { tenantId: "no-such-tenant", clientId: "no-such-client" },
        ],
      }),
    ).toThrow("no-such-tenant/no-such-client")
  })
})
