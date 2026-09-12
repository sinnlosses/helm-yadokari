import { mkdirSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import type { ConfigUnitPath } from "../../../src/types/types.js"
import { toChartDirName, toConfigUnitPath, toLocalPath } from "../../../src/types/types.js"
import { configYaml, registryYaml, useConfigDir } from "./fixture.js"

const dir = useConfigDir()

function unit(parentDir: string, childDir: string): ConfigUnitPath {
  return toConfigUnitPath(`${parentDir}/${childDir}`)
}

describe("loadConfig（パストラバーサル）", () => {
  it(".. を含む相対パスのとき例外をスローする", () => {
    expect(() => loadConfig(toLocalPath("../../etc/passwd"))).toThrow("CONFIG_PATH")
  })

  it(".. を含む絶対パスのとき例外をスローする", () => {
    expect(() => loadConfig(toLocalPath("/tmp/../etc/passwd"))).toThrow("CONFIG_PATH")
  })

  it("cwd() 外の絶対パスのとき例外をスローする", () => {
    expect(() => loadConfig(toLocalPath("/etc/passwd"))).toThrow("CONFIG_PATH")
  })
})

describe("loadConfig（正常系）", () => {
  it("registry.yaml と config.yaml を読み込み ConfigUnit を返す", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
          locations: [{ valuesPath: "charts/my-app/values.yaml", anchor: "appVersion" }],
        },
      ]),
    )

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits).toHaveLength(1)
    expect(configUnits[0]).toEqual({
      chartDirName: "teamA-chart",
      unitPath: "tenant1/client1",
      chartRepo: {
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
          imageTagLocations: [
            {
              valuesPath: "charts/my-app/values.yaml",
              anchorName: "appVersion",
            },
          ],
        },
      ],
      helmTargetBranch: {
        branchName: "release/2026-q1",
        locations: [
          {
            valuesPath: "charts/my-app/values.yaml",
            anchorName: "defaultHelmTargetBranch",
          },
        ],
      },
    })
  })

  it("複数のchartディレクトリをすべて読み込む", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYaml())
    dir.writeRegistryYaml(
      "teamB-chart",
      registryYaml({ projectId: 2, projectName: "teamB-chart", mrTargetBranch: "main" }),
    )
    dir.writeConfigYaml("teamB-chart", "tenant1/client1", configYaml())

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits.map((g) => g.chartDirName)).toEqual(["teamA-chart", "teamB-chart"])
  })

  it("同じchartディレクトリ配下の複数の設定ユニットはそれぞれ別のConfigUnitになる", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
          locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
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
          locations: [{ valuesPath: "b.yaml", anchor: "appVersion" }],
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
          locations: [{ valuesPath: "c.yaml", anchor: "appVersion" }],
        },
      ]),
    )

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits).toHaveLength(3)
    expect(configUnits.map((g) => [g.unitPath, g.apps.map((a) => a.projectName)])).toEqual([
      ["tenant1/client1", ["app-1"]],
      ["tenant1/client2", ["app-2"]],
      ["tenant2/client1", ["app-3"]],
    ])
  })

  it("registry.yaml がないディレクトリは無視する", () => {
    dir.writeFile("not-a-chart/readme.txt", "hello")
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYaml())

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits.map((g) => g.chartDirName)).toEqual(["teamA-chart"])
  })

  it("config.yaml が存在しないtenant/clientディレクトリはConfigUnitを作らない", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
    mkdirSync(join(dir.path, "teamA-chart", "tenant1", "client1"), { recursive: true })

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits).toEqual([])
  })

  it("configディレクトリが空のとき configUnits: [] を返す", () => {
    expect(loadConfig(dir.path)).toEqual({ configUnits: [] })
  })
})

describe("loadConfig（設定ユニットの階層）", () => {
  beforeEach(() => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
  })

  it("深さ1のディレクトリに置かれたconfig.yamlを読み込む", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits.map((g) => g.unitPath)).toEqual(["central"])
  })

  it("深さ1と深さ2の設定ユニットを同じchartディレクトリ配下に混在させられる", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYaml())

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits.map((g) => g.unitPath)).toEqual(["central", "tenant1/client1"])
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

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits.map((g) => g.unitPath)).toEqual(["central", "central2"])
  })

  it("深さ3のディレクトリにconfig.yamlがあるとき例外をスローする", () => {
    dir.writeConfigYaml("teamA-chart", "tenant1/client1/extra", configYaml())

    expect(() => loadConfig(dir.path)).toThrow("深さ")
  })

  it("深さ0（registry.yamlと同じ階層）にconfig.yamlがあるとき例外をスローする", () => {
    dir.writeFile("teamA-chart/config.yaml", configYaml())

    expect(() => loadConfig(dir.path)).toThrow("registry.yaml と同じ階層")
  })

  it("unitsで絞り込んでいても、対象外の設定ユニットの階層の誤りを検出する", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())
    dir.writeConfigYaml("teamA-chart", "tenant1/client1/extra", configYaml())

    expect(() =>
      loadConfig(dir.path, { chartDirName: undefined, units: [toConfigUnitPath("central")] }),
    ).toThrow("深さ")
  })

  it("registry.yamlが無いディレクトリの配下は走査しない（深さの検証もしない）", () => {
    dir.writeConfigYaml("not-a-chart", "tenant1/client1/extra", configYaml())

    expect(loadConfig(dir.path)).toEqual({ configUnits: [] })
  })
})

describe("loadConfig（locationsの複数指定）", () => {
  it("1アプリにつきlocationsを複数指定できる（同一タグを複数箇所へ反映する用途）", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
          locations: [
            { valuesPath: "charts/webapi/values.yaml", anchor: "appVersion" },
            { valuesPath: "charts/batch/values.yaml", anchor: "batchAppsVersion" },
          ],
        },
      ]),
    )

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.apps[0]?.imageTagLocations).toEqual([
      { valuesPath: "charts/webapi/values.yaml", anchorName: "appVersion" },
      { valuesPath: "charts/batch/values.yaml", anchorName: "batchAppsVersion" },
    ])
  })
})

describe("loadConfig（存在しないパス）", () => {
  it("ディレクトリが存在しないとき例外をスローする", () => {
    expect(() => loadConfig(toLocalPath(join(dir.path, "nonexistent")))).toThrow()
  })
})

describe("loadConfig（target絞り込み）", () => {
  beforeEach(() => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
          locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
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
          locations: [{ valuesPath: "b.yaml", anchor: "appVersion" }],
        },
      ]),
    )
    dir.writeRegistryYaml(
      "teamB-chart",
      registryYaml(
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
          locations: [{ valuesPath: "c.yaml", anchor: "appVersion" }],
        },
      ]),
    )
  })

  it("chartDirNameを指定すると該当chartのみ返す", () => {
    const { configUnits } = loadConfig(dir.path, {
      chartDirName: toChartDirName("teamA-chart"),
      units: undefined,
    })
    expect(configUnits).toHaveLength(2)
    expect(configUnits.every((g) => g.chartDirName === "teamA-chart")).toBe(true)
    expect(configUnits.map((g) => [g.unitPath, g.apps.map((a) => a.projectName)])).toEqual([
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
    const { configUnits } = loadConfig(dir.path, {
      chartDirName: undefined,
      units: [unit("tenant1", "client1")],
    })
    expect(
      configUnits.map((g) => [g.chartDirName, g.apps.map((a) => a.projectName)]),
    ).toEqual([
      ["teamA-chart", ["app-1"]],
      ["teamB-chart", ["app-3"]],
    ])
  })

  it("unitsを複数指定すると該当する全アプリを返す", () => {
    const { configUnits } = loadConfig(dir.path, {
      chartDirName: undefined,
      units: [unit("tenant1", "client1"), unit("tenant2", "client2")],
    })
    expect(
      configUnits.map((g) => [g.chartDirName, g.unitPath, g.apps.map((a) => a.projectName)]),
    ).toEqual([
      ["teamA-chart", "tenant1/client1", ["app-1"]],
      ["teamA-chart", "tenant2/client2", ["app-2"]],
      ["teamB-chart", "tenant1/client1", ["app-3"]],
    ])
  })

  it("深さ1のunitPathで絞り込める", () => {
    dir.writeConfigYaml("teamA-chart", "central", configYaml())

    const { configUnits } = loadConfig(dir.path, {
      chartDirName: undefined,
      units: [toConfigUnitPath("central")],
    })
    expect(configUnits.map((g) => [g.chartDirName, g.unitPath])).toEqual([
      ["teamA-chart", "central"],
    ])
  })

  it("chartDirName + units を組み合わせて絞り込める", () => {
    const { configUnits } = loadConfig(dir.path, {
      chartDirName: toChartDirName("teamA-chart"),
      units: [unit("tenant2", "client2")],
    })
    expect(configUnits).toHaveLength(1)
    expect(configUnits[0]?.apps.map((a) => a.projectName)).toEqual(["app-2"])
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
  it("target未指定でregistry.yamlが無いディレクトリしか無いとき、0件のまま正常終了する（現状仕様）", () => {
    dir.writeFile("not-a-chart/readme.txt", "hello")

    expect(loadConfig(dir.path)).toEqual({ configUnits: [] })
  })

  it("chartDirNameを指定した先にregistry.yamlが無いとき例外をスローする", () => {
    // ディレクトリ自体は実在するので chartDirs.includes チェックは通過するが、
    // registry.yaml が無いため絞り込み結果が0件になる
    dir.writeFile("teamA-chart/readme.txt", "hello")

    expect(() =>
      loadConfig(dir.path, { chartDirName: toChartDirName("teamA-chart"), units: undefined }),
    ).toThrow("TARGET_CHART / TARGET_UNITS で絞り込んだ結果")
  })

  it("chartDirNameを指定した先にregistry.yamlはあるがtenant/clientが1つも無いとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )

    expect(() =>
      loadConfig(dir.path, { chartDirName: toChartDirName("teamA-chart"), units: undefined }),
    ).toThrow("TARGET_CHART / TARGET_UNITS で絞り込んだ結果")
  })

  it("unitsに指定した先にconfig.yamlが無いとき、設定ユニットが見つからない旨の例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
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
    dir.writeRegistryYaml(
      "teamB-chart",
      registryYaml({ projectId: 2, projectName: "teamB-chart", mrTargetBranch: "main" }),
    )
    dir.writeConfigYaml("teamB-chart", "tenant1/client1", configYaml())

    expect(() =>
      loadConfig(dir.path, { chartDirName: toChartDirName("teamA-chart"), units: undefined }),
    ).toThrow(/実在するディレクトリ.*teamA-chart.*teamB-chart/)
  })

  it("絞り込みで実際に1件以上ヒットしていれば例外をスローしない", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYaml())

    const { configUnits } = loadConfig(dir.path, {
      chartDirName: toChartDirName("teamA-chart"),
      units: undefined,
    })
    expect(configUnits).toHaveLength(1)
  })
})

describe("loadConfig（helmTargetBranch）", () => {
  it("config.yamlのhelm.locations[].valuesPathがappのlocations[].valuesPathと一致すると、appのhelmTargetBranchにマージされる", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
            locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
          },
        ],
        { branchToSync: "release/2026-q1", locations: [{ valuesPath: "a.yaml", anchor: "targetBranch" }] },
      ),
    )

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.helmTargetBranch).toEqual({
      branchName: "release/2026-q1",
      locations: [{ valuesPath: "a.yaml", anchorName: "targetBranch" }],
    })
  })

  it("helm自体が無いとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    // `configYaml()` は省略時に既定の helm を補うので、helm が無い状態はYAMLを直接書く
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    locations:\n      - valuesPath: a.yaml\n        anchor: appVersion\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("helm は必須です")
  })

  it("helm.branchToSyncはあるがhelm.locationsが無いとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
            locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
          },
        ],
        { branchToSync: "release/2026-q1" },
      ),
    )

    expect(() => loadConfig(dir.path)).toThrow("helm.locations")
  })

  it("helm.locationsはあるがhelm.branchToSyncが無いとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
          locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
        },
      ], { locations: [{ valuesPath: "a.yaml", anchor: "targetBranch" }] }),
    )

    expect(() => loadConfig(dir.path)).toThrow("helm.branchToSync")
  })

  it("helm.locationsが空配列のとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
            locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
          },
        ],
        { branchToSync: "release/2026-q1", locations: [] },
      ),
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("helmが指定されているのに、一部のappのvaluesPathがhelm.locations[]に無いとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
            locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
          },
          {
            projectId: 2,
            projectName: "app-2",
            branchToSync: "main",
            locations: [{ valuesPath: "b.yaml", anchor: "appVersion" }],
          },
        ],
        { branchToSync: "release/2026-q1", locations: [{ valuesPath: "a.yaml", anchor: "targetBranch" }] },
      ),
    )

    expect(() => loadConfig(dir.path)).toThrow("app-2")
  })

  it("helmが指定されているとき、全appのvaluesPathがhelm.locations[]でカバーされていれば読み込める", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
            locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
          },
          {
            projectId: 2,
            projectName: "app-2",
            branchToSync: "main",
            locations: [{ valuesPath: "b.yaml", anchor: "appVersion" }],
          },
        ],
        {
          branchToSync: "release/2026-q1",
          locations: [
            { valuesPath: "a.yaml", anchor: "targetBranchA" },
            { valuesPath: "b.yaml", anchor: "targetBranchB" },
          ],
        },
      ),
    )

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.helmTargetBranch?.locations).toEqual([
      { valuesPath: "a.yaml", anchorName: "targetBranchA" },
      { valuesPath: "b.yaml", anchorName: "targetBranchB" },
    ])
  })

  it("1アプリのlocations内で複数のvaluesPathがそれぞれhelm.locations[]と一致すると、helmTargetBranch.locationsに複数含める", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
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
            locations: [
              { valuesPath: "webapi.yaml", anchor: "webapiVersion" },
              { valuesPath: "batch.yaml", anchor: "batchVersion" },
            ],
          },
        ],
        {
          branchToSync: "release/2026-q1",
          locations: [
            { valuesPath: "webapi.yaml", anchor: "webapiTargetBranch" },
            { valuesPath: "batch.yaml", anchor: "batchTargetBranch" },
          ],
        },
      ),
    )

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.helmTargetBranch).toEqual({
      branchName: "release/2026-q1",
      locations: [
        { valuesPath: "webapi.yaml", anchorName: "webapiTargetBranch" },
        { valuesPath: "batch.yaml", anchorName: "batchTargetBranch" },
      ],
    })
  })
})
