import { mkdirSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import type { ConfigUnitPath } from "../../../src/types/types.js"
import { toChartDirName, toConfigUnitPath } from "../../../src/types/types.js"
import { chartYaml, configYaml, useConfigDir } from "./fixture.js"

const dir = useConfigDir()

function unit(parentDir: string, childDir: string): ConfigUnitPath {
  return toConfigUnitPath(`${parentDir}/${childDir}`)
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
  it("chart.yaml と config.yaml を読み込み ChartAndApps を返す", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app" }],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
          projectName: "my-app",
          branchToSync: "main",
          chart: [{ valuesPath: "charts/my-app/values.yaml", anchor: "appVersion" }],
        },
      ]),
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList).toHaveLength(1)
    expect(chartAndAppsList[0]).toEqual({
      chartDirName: "teamA-chart",
      unitPath: "tenant1/client1",
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
          tagFormat: "{branch}-build-at-{date}-{time}",
          imageTagTargets: [
            {
              valuesPath: "charts/my-app/values.yaml",
              anchorName: "appVersion",
            },
          ],
        },
      ],
    })
  })

  it("複数のchartディレクトリをすべて読み込む", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYaml())
    dir.writeChartYaml(
      "teamB-chart",
      chartYaml({ projectId: 2, projectName: "teamB-chart", mrTargetBranch: "main" }),
    )
    dir.writeConfigYaml("teamB-chart", "tenant1/client1", configYaml())

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList.map((g) => g.chartDirName)).toEqual(["teamA-chart", "teamB-chart"])
  })

  it("同じchartディレクトリ配下の複数の設定ユニットはそれぞれ別のChartAndAppsになる", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [
          { projectId: 1, projectName: "app-1" },
          { projectId: 2, projectName: "app-2" },
          { projectId: 3, projectName: "app-3" },
        ],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
          projectName: "app-1",
          branchToSync: "main",
          chart: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
        },
      ]),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client2",
      configYaml([
        {
          projectId: 2,
          projectName: "app-2",
          branchToSync: "main",
          chart: [{ valuesPath: "b.yaml", anchor: "appVersion" }],
        },
      ]),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant2/client1",
      configYaml([
        {
          projectId: 3,
          projectName: "app-3",
          branchToSync: "main",
          chart: [{ valuesPath: "c.yaml", anchor: "appVersion" }],
        },
      ]),
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList).toHaveLength(3)
    expect(chartAndAppsList.map((g) => [g.unitPath, g.apps.map((a) => a.projectName)])).toEqual([
      ["tenant1/client1", ["app-1"]],
      ["tenant1/client2", ["app-2"]],
      ["tenant2/client1", ["app-3"]],
    ])
  })

  it("chart.yaml がないディレクトリは無視する", () => {
    dir.writeFile("not-a-chart/readme.txt", "hello")
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYaml())

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList.map((g) => g.chartDirName)).toEqual(["teamA-chart"])
  })

  it("config.yaml が存在しないtenant/clientディレクトリはChartAndAppsを作らない", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
    mkdirSync(join(dir.path, "teamA-chart", "tenant1", "client1"), { recursive: true })

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList).toEqual([])
  })

  it("configディレクトリが空のとき chartAndAppsList: [] を返す", () => {
    expect(loadConfig(dir.path)).toEqual({ chartAndAppsList: [] })
  })
})

describe("loadConfig（設定ユニットの階層）", () => {
  beforeEach(() => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
  })

  it("深さ1のディレクトリに置かれたconfig.yamlを読み込む", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList.map((g) => g.unitPath)).toEqual(["central"])
  })

  it("深さ1と深さ2の設定ユニットを同じchartディレクトリ配下に混在させられる", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYaml())

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList.map((g) => g.unitPath)).toEqual(["central", "tenant1/client1"])
  })

  it("設定ユニットが入れ子になっているとき例外をスローする", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())
    dir.writeConfigYaml("teamA-chart", "central/sub", configYaml())

    expect(() => loadConfig(dir.path)).toThrow("入れ子")
  })

  it("入れ子の例外メッセージに親子両方のunitPathを含める", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())
    dir.writeConfigYaml("teamA-chart", "central/sub", configYaml())

    expect(() => loadConfig(dir.path)).toThrow(/"central".*"central\/sub"/)
  })

  it("兄弟同士で名前が前方一致していても入れ子とはみなさない", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())
    dir.writeConfigYaml("teamA-chart", "central2", configYaml())

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList.map((g) => g.unitPath)).toEqual(["central", "central2"])
  })

  it("深さ3のディレクトリにconfig.yamlがあるとき例外をスローする", () => {
    dir.writeConfigYaml("teamA-chart", "tenant1/client1/extra", configYaml())

    expect(() => loadConfig(dir.path)).toThrow("深さ")
  })

  it("深さ0（chart.yamlと同じ階層）にconfig.yamlがあるとき例外をスローする", () => {
    dir.writeFile("teamA-chart/config.yaml", configYaml())

    expect(() => loadConfig(dir.path)).toThrow("chart.yaml と同じ階層")
  })

  it("unitsで絞り込んでいても、対象外の設定ユニットの階層の誤りを検出する", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())
    dir.writeConfigYaml("teamA-chart", "tenant1/client1/extra", configYaml())

    expect(() =>
      loadConfig(dir.path, { chartDirName: undefined, units: [toConfigUnitPath("central")] }),
    ).toThrow("深さ")
  })

  it("chart.yamlが無いディレクトリの配下は走査しない（深さの検証もしない）", () => {
    dir.writeConfigYaml("not-a-chart", "tenant1/client1/extra", configYaml())

    expect(loadConfig(dir.path)).toEqual({ chartAndAppsList: [] })
  })
})

describe("loadConfig（chartの複数指定）", () => {
  it("1アプリにつきchartを複数指定できる（同一タグを複数箇所へ反映する用途）", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-service" }],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
          projectName: "my-service",
          branchToSync: "main",
          chart: [
            { valuesPath: "charts/webapi/values.yaml", anchor: "appVersion" },
            { valuesPath: "charts/batch/values.yaml", anchor: "batchAppsVersion" },
          ],
        },
      ]),
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.apps[0]?.imageTagTargets).toEqual([
      { valuesPath: "charts/webapi/values.yaml", anchorName: "appVersion" },
      { valuesPath: "charts/batch/values.yaml", anchorName: "batchAppsVersion" },
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
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [
          { projectId: 1, projectName: "app-1" },
          { projectId: 2, projectName: "app-2" },
        ],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
          projectName: "app-1",
          branchToSync: "main",
          chart: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
        },
      ]),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant2/client2",
      configYaml([
        {
          projectId: 2,
          projectName: "app-2",
          branchToSync: "main",
          chart: [{ valuesPath: "b.yaml", anchor: "appVersion" }],
        },
      ]),
    )
    dir.writeChartYaml(
      "teamB-chart",
      chartYaml(
        { projectId: 2, projectName: "teamB-chart", mrTargetBranch: "main" },
        [{ projectId: 3, projectName: "app-3" }],
      ),
    )
    dir.writeConfigYaml(
      "teamB-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 3,
          projectName: "app-3",
          branchToSync: "main",
          chart: [{ valuesPath: "c.yaml", anchor: "appVersion" }],
        },
      ]),
    )
  })

  it("chartDirNameを指定すると該当chartのみ返す", () => {
    const { chartAndAppsList } = loadConfig(dir.path, {
      chartDirName: toChartDirName("teamA-chart"),
      units: undefined,
    })
    expect(chartAndAppsList).toHaveLength(2)
    expect(chartAndAppsList.every((g) => g.chartDirName === "teamA-chart")).toBe(true)
    expect(chartAndAppsList.map((g) => [g.unitPath, g.apps.map((a) => a.projectName)])).toEqual([
      ["tenant1/client1", ["app-1"]],
      ["tenant2/client2", ["app-2"]],
    ])
  })

  it("存在しないchartDirNameを指定すると例外をスローする", () => {
    expect(() =>
      loadConfig(dir.path, { chartDirName: toChartDirName("no-such-chart"), units: undefined }),
    ).toThrow("TARGET_CHART")
  })

  it("存在しないchartDirNameを指定した例外メッセージに実在するディレクトリ名の一覧を含める", () => {
    expect(() =>
      loadConfig(dir.path, { chartDirName: toChartDirName("no-such-chart"), units: undefined }),
    ).toThrow(/config\/ 直下のディレクトリ名を指定してください.*teamA-chart.*teamB-chart/)
  })

  it("unitsを1件指定すると該当アプリのみ返す（chart横断）", () => {
    const { chartAndAppsList } = loadConfig(dir.path, {
      chartDirName: undefined,
      units: [unit("tenant1", "client1")],
    })
    expect(
      chartAndAppsList.map((g) => [g.chartDirName, g.apps.map((a) => a.projectName)]),
    ).toEqual([
      ["teamA-chart", ["app-1"]],
      ["teamB-chart", ["app-3"]],
    ])
  })

  it("unitsを複数指定すると該当する全アプリを返す", () => {
    const { chartAndAppsList } = loadConfig(dir.path, {
      chartDirName: undefined,
      units: [unit("tenant1", "client1"), unit("tenant2", "client2")],
    })
    expect(
      chartAndAppsList.map((g) => [g.chartDirName, g.unitPath, g.apps.map((a) => a.projectName)]),
    ).toEqual([
      ["teamA-chart", "tenant1/client1", ["app-1"]],
      ["teamA-chart", "tenant2/client2", ["app-2"]],
      ["teamB-chart", "tenant1/client1", ["app-3"]],
    ])
  })

  it("深さ1のunitPathで絞り込める", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())

    const { chartAndAppsList } = loadConfig(dir.path, {
      chartDirName: undefined,
      units: [toConfigUnitPath("central")],
    })
    expect(chartAndAppsList.map((g) => [g.chartDirName, g.unitPath])).toEqual([
      ["teamA-chart", "central"],
    ])
  })

  it("chartDirName + units を組み合わせて絞り込める", () => {
    const { chartAndAppsList } = loadConfig(dir.path, {
      chartDirName: toChartDirName("teamA-chart"),
      units: [unit("tenant2", "client2")],
    })
    expect(chartAndAppsList).toHaveLength(1)
    expect(chartAndAppsList[0]?.apps.map((a) => a.projectName)).toEqual(["app-2"])
  })

  it("存在しないunitPathを指定したとき例外をスローする", () => {
    expect(() =>
      loadConfig(dir.path, { chartDirName: undefined, units: [unit("tenant1", "no-such-client")] }),
    ).toThrow("TARGET_UNITS")
  })

  it("chartDirNameは存在するがunitsが一致しないとき例外をスローする", () => {
    expect(() =>
      loadConfig(dir.path, {
        chartDirName: toChartDirName("teamA-chart"),
        units: [unit("tenant1", "client2")],
      }),
    ).toThrow("TARGET_UNITS")
  })

  it("複数指定したunitsのうち1件でも見つからないとき例外をスローし、見つからなかったものを明示する", () => {
    expect(() =>
      loadConfig(dir.path, {
        chartDirName: undefined,
        units: [unit("tenant1", "client1"), unit("no-such-tenant", "no-such-client")],
      }),
    ).toThrow("no-such-tenant/no-such-client")
  })
})

describe("loadConfig（絞り込み結果が0件のときの検知）", () => {
  it("target未指定でchart.yamlが無いディレクトリしか無いとき、0件のまま正常終了する（現状仕様）", () => {
    dir.writeFile("not-a-chart/readme.txt", "hello")

    expect(loadConfig(dir.path)).toEqual({ chartAndAppsList: [] })
  })

  it("chartDirNameを指定した先にchart.yamlが無いとき例外をスローする", () => {
    // ディレクトリ自体は実在するので chartDirs.includes チェックは通過するが、
    // chart.yaml が無いため絞り込み結果が0件になる
    dir.writeFile("teamA-chart/readme.txt", "hello")

    expect(() =>
      loadConfig(dir.path, { chartDirName: toChartDirName("teamA-chart"), units: undefined }),
    ).toThrow("TARGET_CHART / TARGET_UNITS で絞り込んだ結果")
  })

  it("chartDirNameを指定した先にchart.yamlはあるがtenant/clientが1つも無いとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )

    expect(() =>
      loadConfig(dir.path, { chartDirName: toChartDirName("teamA-chart"), units: undefined }),
    ).toThrow("TARGET_CHART / TARGET_UNITS で絞り込んだ結果")
  })

  it("unitsに指定した先にconfig.yamlが無いとき、設定ユニットが見つからない旨の例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
    // config.yaml を置かず、ディレクトリだけ実在させる。ディレクトリの有無ではなく
    // 「config.yaml を持つディレクトリか」で判定するため TARGET_UNITS のエラーになる
    mkdirSync(join(dir.path, "teamA-chart", "tenant1", "client1"), { recursive: true })

    expect(() =>
      loadConfig(dir.path, { chartDirName: undefined, units: [unit("tenant1", "client1")] }),
    ).toThrow("TARGET_UNITS")
  })

  it("0件エラーのメッセージに実在するディレクトリ名の一覧を含める", () => {
    dir.writeFile("teamA-chart/readme.txt", "hello")
    dir.writeChartYaml(
      "teamB-chart",
      chartYaml({ projectId: 2, projectName: "teamB-chart", mrTargetBranch: "main" }),
    )
    dir.writeConfigYaml("teamB-chart", "tenant1/client1", configYaml())

    expect(() =>
      loadConfig(dir.path, { chartDirName: toChartDirName("teamA-chart"), units: undefined }),
    ).toThrow(/実在するディレクトリ.*teamA-chart.*teamB-chart/)
  })

  it("絞り込みで実際に1件以上ヒットしていれば例外をスローしない", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYaml())

    const { chartAndAppsList } = loadConfig(dir.path, {
      chartDirName: toChartDirName("teamA-chart"),
      units: undefined,
    })
    expect(chartAndAppsList).toHaveLength(1)
  })
})

describe("loadConfig（helmTargetBranch）", () => {
  it("config.yamlのhelm.chart[].valuesPathがappのchart[].valuesPathと一致すると、appのhelmTargetBranchにマージされる", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml(
        [
          {
            projectId: 1,
            projectName: "app-1",
            branchToSync: "main",
            chart: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
          },
        ],
        { branchToSync: "release/2026-q1", chart: [{ valuesPath: "a.yaml", anchor: "targetBranch" }] },
      ),
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.helmTargetBranch).toEqual({
      branchName: "release/2026-q1",
      targets: [{ valuesPath: "a.yaml", anchorName: "targetBranch" }],
    })
  })

  it("どちらにも無いとき、helmTargetBranchはundefinedになる", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
          projectName: "app-1",
          branchToSync: "main",
          chart: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
        },
      ]),
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.helmTargetBranch).toBeUndefined()
  })

  it("helm.branchToSyncはあるがhelm.chartが無いとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml(
        [
          {
            projectId: 1,
            projectName: "app-1",
            branchToSync: "main",
            chart: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
          },
        ],
        { branchToSync: "release/2026-q1" },
      ),
    )

    expect(() => loadConfig(dir.path)).toThrow("helm.chart")
  })

  it("helm.chartはあるがhelm.branchToSyncが無いとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
          projectName: "app-1",
          branchToSync: "main",
          chart: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
        },
      ]) + "helm:\n  chart:\n    - valuesPath: a.yaml\n      anchor: targetBranch\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("helm.branchToSync")
  })

  it("helm.chartが空配列のとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      "helm:\n  branchToSync: release/2026-q1\n  chart: []\n" +
        configYaml([
          {
            projectId: 1,
            projectName: "app-1",
            branchToSync: "main",
            chart: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
          },
        ]),
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("helmが指定されているのに、一部のappのvaluesPathがhelm.chart[]に無いとき例外をスローする", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [
          { projectId: 1, projectName: "app-1" },
          { projectId: 2, projectName: "app-2" },
        ],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml(
        [
          {
            projectId: 1,
            projectName: "app-1",
            branchToSync: "main",
            chart: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
          },
          {
            projectId: 2,
            projectName: "app-2",
            branchToSync: "main",
            chart: [{ valuesPath: "b.yaml", anchor: "appVersion" }],
          },
        ],
        { branchToSync: "release/2026-q1", chart: [{ valuesPath: "a.yaml", anchor: "targetBranch" }] },
      ),
    )

    expect(() => loadConfig(dir.path)).toThrow("app-2")
  })

  it("helmが指定されているとき、全appのvaluesPathがhelm.chart[]でカバーされていれば読み込める", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [
          { projectId: 1, projectName: "app-1" },
          { projectId: 2, projectName: "app-2" },
        ],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml(
        [
          {
            projectId: 1,
            projectName: "app-1",
            branchToSync: "main",
            chart: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
          },
          {
            projectId: 2,
            projectName: "app-2",
            branchToSync: "main",
            chart: [{ valuesPath: "b.yaml", anchor: "appVersion" }],
          },
        ],
        {
          branchToSync: "release/2026-q1",
          chart: [
            { valuesPath: "a.yaml", anchor: "targetBranchA" },
            { valuesPath: "b.yaml", anchor: "targetBranchB" },
          ],
        },
      ),
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.helmTargetBranch?.targets).toEqual([
      { valuesPath: "a.yaml", anchorName: "targetBranchA" },
      { valuesPath: "b.yaml", anchorName: "targetBranchB" },
    ])
  })

  it("1アプリのchart内で複数のvaluesPathがそれぞれhelm.chart[]と一致すると、helmTargetBranch.targetsに複数含める", () => {
    dir.writeChartYaml(
      "teamA-chart",
      chartYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml(
        [
          {
            projectId: 1,
            projectName: "app-1",
            branchToSync: "main",
            chart: [
              { valuesPath: "webapi.yaml", anchor: "webapiVersion" },
              { valuesPath: "batch.yaml", anchor: "batchVersion" },
            ],
          },
        ],
        {
          branchToSync: "release/2026-q1",
          chart: [
            { valuesPath: "webapi.yaml", anchor: "webapiTargetBranch" },
            { valuesPath: "batch.yaml", anchor: "batchTargetBranch" },
          ],
        },
      ),
    )

    const { chartAndAppsList } = loadConfig(dir.path)
    expect(chartAndAppsList[0]?.helmTargetBranch).toEqual({
      branchName: "release/2026-q1",
      targets: [
        { valuesPath: "webapi.yaml", anchorName: "webapiTargetBranch" },
        { valuesPath: "batch.yaml", anchorName: "batchTargetBranch" },
      ],
    })
  })
})
