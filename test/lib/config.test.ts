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

function writeConfigYaml(
  chartDir: string,
  tenantId: string,
  clientId: string,
  config: string,
): void {
  writeFile(`${chartDir}/${tenantId}/${clientId}/config.yaml`, config)
}

function writeAnchorsYaml(
  chartDir: string,
  tenantId: string,
  clientId: string,
  content: string,
): void {
  writeFile(`${chartDir}/${tenantId}/${clientId}/anchors.yaml`, content)
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
  it("chart.yaml と config.yaml と anchors.yaml を読み込み ChartAndApps を返す", () => {
    writeChartYaml(
      "teamA-chart",
      `
chart:
  projectId: 888
  projectName: teamA-chart
  mrTargetBranch: develop
`,
    )
    writeConfigYaml(
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
    writeAnchorsYaml(
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

    const { chartAndAppsList } = loadConfig(tmpDir)
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
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml("teamA-chart", "tenantId1", "clientId1", "apps: []\n")
    writeChartYaml(
      "teamB-chart",
      "chart:\n  projectId: 2\n  projectName: teamB-chart\n  mrTargetBranch: main\n",
    )
    writeConfigYaml("teamB-chart", "tenantId1", "clientId1", "apps: []\n")

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList.map((g) => g.chartDir)).toEqual(["teamA-chart", "teamB-chart"])
  })

  it("同じchartディレクトリ配下の複数tenant/clientはそれぞれ別のChartAndAppsになる（T-019）", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId2",
      "apps:\n  - projectId: 2\n    projectName: app-2\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId2",
      "apps:\n  - projectId: 2\n    projectName: app-2\n    chart:\n      - valuesPath: b.yaml\n        anchor: appVersion\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId2",
      "clientId1",
      "apps:\n  - projectId: 3\n    projectName: app-3\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId2",
      "clientId1",
      "apps:\n  - projectId: 3\n    projectName: app-3\n    chart:\n      - valuesPath: c.yaml\n        anchor: appVersion\n",
    )

    const { chartAndAppsList } = loadConfig(tmpDir)
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
    writeFile("not-a-chart/readme.txt", "hello")
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml("teamA-chart", "tenantId1", "clientId1", "apps: []\n")

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList.map((g) => g.chartDir)).toEqual(["teamA-chart"])
  })

  it("config.yaml が存在しないtenant/clientディレクトリはChartAndAppsを作らない（T-019）", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    mkdirSync(join(tmpDir, "teamA-chart", "tenantId1", "clientId1"), { recursive: true })

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList).toEqual([])
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

  it("config.yaml の branchToSync が空文字のとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      'apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: ""\n',
    )
    expect(() => loadConfig(tmpDir)).toThrow("形式が不正です")
  })

  it("config.yamlのappに対応するprojectIdがanchors.yamlに無いとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )

    expect(() => loadConfig(tmpDir)).toThrow("app-1")
  })

  it("anchors.yamlにconfig.yamlに存在しないappがあるとき例外をスローする（孤児設定）", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n  - projectId: 999\n    projectName: removed-app\n    chart:\n      - valuesPath: old.yaml\n        anchor: oldVersion\n",
    )

    expect(() => loadConfig(tmpDir)).toThrow("removed-app")
  })

  it("config.yamlとanchors.yamlでprojectIdが同じでもprojectNameが一致しないとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1-typo\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n",
    )

    expect(() => loadConfig(tmpDir)).toThrow("projectName")
  })

  it("anchors.yaml の apps[].chart が空配列のとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart: []\n",
    )

    expect(() => loadConfig(tmpDir)).toThrow("形式が不正です")
  })

  it("anchors.yaml の apps[].chart[].valuesPath が無いとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - anchor: appVersion\n",
    )

    expect(() => loadConfig(tmpDir)).toThrow("形式が不正です")
  })

  it("anchors.yaml の apps[].chart[].anchor が無いとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n",
    )

    expect(() => loadConfig(tmpDir)).toThrow("形式が不正です")
  })
})

describe("loadConfig（chartの複数指定）", () => {
  it("1アプリにつきchartを複数指定できる（同一タグを複数箇所へ反映する用途）", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: my-service\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: my-service\n    chart:\n      - valuesPath: charts/webapi/values.yaml\n        anchor: appVersion\n      - valuesPath: charts/batch/values.yaml\n        anchor: batchAppsVersion\n",
    )

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList[0]?.apps[0]?.chart).toEqual([
      { valuesPath: "charts/webapi/values.yaml", anchor: "appVersion" },
      { valuesPath: "charts/batch/values.yaml", anchor: "batchAppsVersion" },
    ])
  })
})

describe("loadConfig（helmTargetBranch）", () => {
  it("anchors.yamlのhelm.chart[].valuesPathがappのchart[].valuesPathと一致すると、appのhelmTargetBranchにマージされる", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\nhelm:\n  chart:\n    - valuesPath: a.yaml\n      anchor: targetBranch\n",
    )

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList[0]?.apps[0]?.helmTargetBranch).toEqual({
      branch: "release/2026-q1",
      targets: [{ valuesPath: "a.yaml", anchor: "targetBranch" }],
    })
  })

  it("どちらにも無いとき、app.helmTargetBranchはundefinedになる", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n",
    )

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList[0]?.apps[0]?.helmTargetBranch).toBeUndefined()
  })

  it("config.yamlのhelm.branchToSyncはあるがanchors.yamlのhelm.chartが無いとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n",
    )

    expect(() => loadConfig(tmpDir)).toThrow("helm.branchToSync")
  })

  it("anchors.yamlのhelm.chartはあるがconfig.yamlのhelm.branchToSyncが無いとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\nhelm:\n  chart:\n    - valuesPath: a.yaml\n      anchor: targetBranch\n",
    )

    expect(() => loadConfig(tmpDir)).toThrow("helm.chart")
  })

  it("helm.chartが空配列のとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\nhelm:\n  chart: []\n",
    )

    expect(() => loadConfig(tmpDir)).toThrow("形式が不正です")
  })

  it("helmが指定されているのに、一部のappのvaluesPathがhelm.chart[]に無いとき例外をスローする", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n  - projectId: 2\n    projectName: app-2\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n  - projectId: 2\n    projectName: app-2\n    chart:\n      - valuesPath: b.yaml\n        anchor: appVersion\nhelm:\n  chart:\n    - valuesPath: a.yaml\n      anchor: targetBranch\n",
    )

    expect(() => loadConfig(tmpDir)).toThrow("app-2")
  })

  it("helmが指定されているとき、全appのvaluesPathがhelm.chart[]でカバーされていれば読み込める", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n  - projectId: 2\n    projectName: app-2\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n  - projectId: 2\n    projectName: app-2\n    chart:\n      - valuesPath: b.yaml\n        anchor: appVersion\nhelm:\n  chart:\n    - valuesPath: a.yaml\n      anchor: targetBranchA\n    - valuesPath: b.yaml\n      anchor: targetBranchB\n",
    )

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList[0]?.apps[0]?.helmTargetBranch).toBeDefined()
    expect(chartAndAppsList[0]?.apps[1]?.helmTargetBranch).toBeDefined()
  })

  it("1アプリのchart内で複数のvaluesPathがそれぞれhelm.chart[]と一致すると、helmTargetBranch.targetsに複数含める", () => {
    writeChartYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "helm:\n  branchToSync: release/2026-q1\napps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: webapi.yaml\n        anchor: webapiVersion\n      - valuesPath: batch.yaml\n        anchor: batchVersion\nhelm:\n  chart:\n    - valuesPath: webapi.yaml\n      anchor: webapiTargetBranch\n    - valuesPath: batch.yaml\n      anchor: batchTargetBranch\n",
    )

    const { chartAndAppsList } = loadConfig(tmpDir)
    expect(chartAndAppsList[0]?.apps[0]?.helmTargetBranch).toEqual({
      branch: "release/2026-q1",
      targets: [
        { valuesPath: "webapi.yaml", anchor: "webapiTargetBranch" },
        { valuesPath: "batch.yaml", anchor: "batchTargetBranch" },
      ],
    })
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
    writeConfigYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n",
    )
    writeConfigYaml(
      "teamA-chart",
      "tenantId2",
      "clientId2",
      "apps:\n  - projectId: 2\n    projectName: app-2\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamA-chart",
      "tenantId2",
      "clientId2",
      "apps:\n  - projectId: 2\n    projectName: app-2\n    chart:\n      - valuesPath: b.yaml\n        anchor: appVersion\n",
    )
    writeChartYaml(
      "teamB-chart",
      "chart:\n  projectId: 2\n  projectName: teamB-chart\n  mrTargetBranch: main\n",
    )
    writeConfigYaml(
      "teamB-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 3\n    projectName: app-3\n    branchToSync: main\n",
    )
    writeAnchorsYaml(
      "teamB-chart",
      "tenantId1",
      "clientId1",
      "apps:\n  - projectId: 3\n    projectName: app-3\n    chart:\n      - valuesPath: c.yaml\n        anchor: appVersion\n",
    )
  })

  it("chartDirを指定すると該当chartのみ返す", () => {
    const { chartAndAppsList } = loadConfig(tmpDir, { chartDir: "teamA-chart" })
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

describe("loadConfig（重複指定の検証）", () => {
  const CHART_YAML = `
chart:
  projectId: 888
  projectName: teamA-chart
  mrTargetBranch: develop
`

  it("config.yamlに同じprojectIdのappが2件あるとき例外をスローする", () => {
    writeChartYaml("teamA-chart", CHART_YAML)
    writeConfigYaml(
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
    writeAnchorsYaml(
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

    expect(() => loadConfig(tmpDir)).toThrow("projectId 1")
  })

  it("anchors.yamlに同じprojectIdのappが2件あるとき例外をスローする", () => {
    writeChartYaml("teamA-chart", CHART_YAML)
    writeConfigYaml(
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
    writeAnchorsYaml(
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

    expect(() => loadConfig(tmpDir)).toThrow("projectId 1")
  })

  it("別々のappが同じ valuesPath + anchor を指しているとき例外をスローする", () => {
    writeChartYaml("teamA-chart", CHART_YAML)
    writeConfigYaml(
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
    writeAnchorsYaml(
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

    expect(() => loadConfig(tmpDir)).toThrow("sharedAnchor")
  })

  it("1つのappが同じ valuesPath + anchor を2回指定しているとき例外をスローする", () => {
    writeChartYaml("teamA-chart", CHART_YAML)
    writeConfigYaml(
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
    writeAnchorsYaml(
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

    expect(() => loadConfig(tmpDir)).toThrow("myAppVersion")
  })

  it("イメージタグとHelm向き先ブランチが同じ valuesPath + anchor を奪い合うとき例外をスローする", () => {
    writeChartYaml("teamA-chart", CHART_YAML)
    writeConfigYaml(
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
    writeAnchorsYaml(
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

    expect(() => loadConfig(tmpDir)).toThrow("myAppVersion")
  })

  it("valuesPathが同じでもanchorが違えば読み込める", () => {
    writeChartYaml("teamA-chart", CHART_YAML)
    writeConfigYaml(
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
    writeAnchorsYaml(
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

    const { chartAndAppsList } = loadConfig(tmpDir)

    expect(chartAndAppsList[0]?.apps).toHaveLength(2)
  })
})
