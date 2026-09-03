import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { loadConfig } from "../../src/lib/config.js"

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(process.cwd(), "test-tmp-"))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true })
})

function writeFile(relativePath: string, content: string): void {
  const filePath = join(tmpDir, relativePath)
  mkdirSync(join(filePath, ".."), { recursive: true })
  writeFileSync(filePath, content, "utf-8")
}

function writeChartYaml(chartDir: string, chart: string): void {
  writeFile(`${chartDir}/chart.yaml`, chart)
}

function writeAppsYaml(chartDir: string, tenantId: string, clientId: string, apps: string): void {
  writeFile(`${chartDir}/${tenantId}/${clientId}/apps.yaml`, apps)
}

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
  it("chart.yaml と apps.yaml を読み込み ChartAndApps を返す", () => {
    writeChartYaml(
      "teamA-chart",
      `
chart:
  projectId: 888
  projectName: teamA-chart
  mrTargetBranch: develop
`,
    )
    writeAppsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      `
apps:
  - projectId: 1
    projectName: my-app
    branchToSync: main
    chart:
      valuesPath: charts/my-app/values.yaml
      imageTagKey: image.tag
`,
    )

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList).toHaveLength(1)
    expect(chartAndAppsList[0]).toEqual({
      chartDir: "teamA-chart",
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
          chart: {
            valuesPath: "charts/my-app/values.yaml",
            imageTagKey: "image.tag",
          },
        },
      ],
    })
  })

  it("複数のchartディレクトリをすべて読み込む", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeChartYaml(
      "teamB-chart",
      "chart:\n  projectId: 2\n  projectName: teamB-chart\n  mrTargetBranch: main\n",
    )

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList.map((g) => g.chartDir)).toEqual(["teamA-chart", "teamB-chart"])
  })

  it("同じchartディレクトリ配下の複数tenant/clientのapps.yamlをすべて集約する", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeAppsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    chart:\n      valuesPath: a.yaml\n      imageTagKey: image.tag\n",
    )
    writeAppsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId2",
      "apps:\n  - projectId: 2\n    projectName: app-2\n    branchToSync: main\n    chart:\n      valuesPath: b.yaml\n      imageTagKey: image.tag\n",
    )
    writeAppsYaml(
      "teamA-chart",
      "tenantId2",
      "clientId1",
      "apps:\n  - projectId: 3\n    projectName: app-3\n    branchToSync: main\n    chart:\n      valuesPath: c.yaml\n      imageTagKey: image.tag\n",
    )

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList).toHaveLength(1)
    expect(chartAndAppsList[0]?.apps.map((a) => a.projectName)).toEqual(["app-1", "app-2", "app-3"])
  })

  it("chart.yaml がないディレクトリは無視する", () => {
    writeFile("not-a-chart/readme.txt", "hello")
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList.map((g) => g.chartDir)).toEqual(["teamA-chart"])
  })

  it("apps.yaml が存在しないtenant/clientディレクトリは空扱いにする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    mkdirSync(join(tmpDir, "teamA-chart", "tenantId1", "clientId1"), { recursive: true })

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList[0]?.apps).toEqual([])
  })

  it("configディレクトリが空のとき chartAndAppsList: [] を返す", () => {
    expect(loadConfig(tmpDir)).toEqual({ chartAndAppsList: [] })
  })
})

describe("loadConfig（バリデーションエラー）", () => {
  it("chart.yaml の projectId が数値でないとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      'chart:\n  projectId: "not-a-number"\n  projectName: teamA-chart\n  mrTargetBranch: develop\n',
    )
    expect(() => loadConfig(tmpDir)).toThrow("形式が不正です")
  })

  it("chart.yaml の mrTargetBranch がないとき例外をスローする", () => {
    writeChartYaml("teamA-chart", "chart:\n  projectId: 1\n  projectName: teamA-chart\n")
    expect(() => loadConfig(tmpDir)).toThrow("形式が不正です")
  })

  it("apps.yaml の branchToSync が空文字のとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeAppsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      'apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: ""\n    chart:\n      valuesPath: a.yaml\n      imageTagKey: image.tag\n',
    )
    expect(() => loadConfig(tmpDir)).toThrow("形式が不正です")
  })

  it("apps.yaml の chart.valuesPath がないとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeAppsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    chart:\n      imageTagKey: image.tag\n",
    )
    expect(() => loadConfig(tmpDir)).toThrow("形式が不正です")
  })
})

describe("loadConfig（存在しないパス）", () => {
  it("ディレクトリが存在しないとき例外をスローする", () => {
    expect(() => loadConfig(join(tmpDir, "nonexistent"))).toThrow()
  })
})

describe("loadConfig（target絞り込み）", () => {
  beforeEach(() => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeAppsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    chart:\n      valuesPath: a.yaml\n      imageTagKey: image.tag\n",
    )
    writeAppsYaml(
      "teamA-chart",
      "tenantId2",
      "clientId2",
      "apps:\n  - projectId: 2\n    projectName: app-2\n    branchToSync: main\n    chart:\n      valuesPath: b.yaml\n      imageTagKey: image.tag\n",
    )
    writeChartYaml(
      "teamB-chart",
      "chart:\n  projectId: 2\n  projectName: teamB-chart\n  mrTargetBranch: main\n",
    )
    writeAppsYaml(
      "teamB-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 3\n    projectName: app-3\n    branchToSync: main\n    chart:\n      valuesPath: c.yaml\n      imageTagKey: image.tag\n",
    )
  })

  it("chartDirを指定すると該当chartのみ返す", () => {
    const { chartAndAppsList } = loadConfig(tmpDir, { chartDir: "teamA-chart" })
    expect(chartAndAppsList).toHaveLength(1)
    expect(chartAndAppsList[0]?.chartDir).toBe("teamA-chart")
    expect(chartAndAppsList[0]?.apps.map((a) => a.projectName)).toEqual(["app-1", "app-2"])
  })

  it("存在しないchartDirを指定すると例外をスローする", () => {
    expect(() => loadConfig(tmpDir, { chartDir: "no-such-chart" })).toThrow("TARGET_CHART_DIR")
  })

  it("clientsを1件指定すると該当アプリのみ返す（chart横断）", () => {
    const { chartAndAppsList } = loadConfig(tmpDir, {
      clients: [{ tenantId: "tenantId1", clientId: "clientId1" }],
    })
    expect(chartAndAppsList.map((g) => [g.chartDir, g.apps.map((a) => a.projectName)])).toEqual([
      ["teamA-chart", ["app-1"]],
      ["teamB-chart", ["app-3"]],
    ])
  })

  it("clientsを複数指定すると該当する全アプリを返す", () => {
    const { chartAndAppsList } = loadConfig(tmpDir, {
      clients: [
        { tenantId: "tenantId1", clientId: "clientId1" },
        { tenantId: "tenantId2", clientId: "clientId2" },
      ],
    })
    expect(chartAndAppsList.map((g) => [g.chartDir, g.apps.map((a) => a.projectName)])).toEqual([
      ["teamA-chart", ["app-1", "app-2"]],
      ["teamB-chart", ["app-3"]],
    ])
  })

  it("chartDir + clients を組み合わせて絞り込める", () => {
    const { chartAndAppsList } = loadConfig(tmpDir, {
      chartDir: "teamA-chart",
      clients: [{ tenantId: "tenantId2", clientId: "clientId2" }],
    })
    expect(chartAndAppsList).toHaveLength(1)
    expect(chartAndAppsList[0]?.apps.map((a) => a.projectName)).toEqual(["app-2"])
  })

  it("存在しないtenantId/clientIdの組み合わせのとき例外をスローする", () => {
    expect(() =>
      loadConfig(tmpDir, { clients: [{ tenantId: "tenantId1", clientId: "no-such-client" }] }),
    ).toThrow("TARGET_CLIENT")
  })

  it("chartDirは存在するがclientsが一致しないとき例外をスローする", () => {
    expect(() =>
      loadConfig(tmpDir, {
        chartDir: "teamA-chart",
        clients: [{ tenantId: "tenantId1", clientId: "clientId2" }],
      }),
    ).toThrow("TARGET_CLIENT")
  })

  it("複数指定したclientsのうち1件でも見つからないとき例外をスローし、見つからなかったものを明示する", () => {
    expect(() =>
      loadConfig(tmpDir, {
        clients: [
          { tenantId: "tenantId1", clientId: "clientId1" },
          { tenantId: "no-such-tenant", clientId: "no-such-client" },
        ],
      }),
    ).toThrow("no-such-tenant/no-such-client")
  })
})
