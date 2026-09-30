import { describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import type { ConfigUnitFiles } from "./fixture.js"
import { configUnitFiles, registryYaml, useConfigDir } from "./fixture.js"

const dir = useConfigDir()

describe("loadConfig（設定ユニットと registry.yaml の appSpecs[] の紐づけ）", () => {
  it("設定ユニットのapp名がregistry.yamlのappSpecs[].projectNameに無いとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
    )
    dir.writeConfigUnit(
      "teamA-chart",
      "tenant1/client1",
      configUnitFiles([
        {
          projectName: "app-1",
          branchToSync: "main",
          locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
        },
      ]),
    )

    expect(() => loadConfig(dir.path)).toThrow("app-1")
  })

  it("branchToSync にだけあるappがあるとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }, [
        { projectId: 1, projectName: "app-1" },
        { projectId: 2, projectName: "app-2" },
      ]),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", {
      versions: "branchRef: r\nbranchToSync:\n  app-1: main\n  app-2: main\n",
      locations:
        "helm:\n  - valuesPath: a.yaml\n    anchor: t\napps:\n  app-1:\n    - valuesPath: a.yaml\n      anchor: v\n",
    })

    expect(() => loadConfig(dir.path)).toThrow(/"app-2".*versions\.yaml のみ/)
  })

  it("apps にだけあるappがあるとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }, [
        { projectId: 1, projectName: "app-1" },
        { projectId: 2, projectName: "app-2" },
      ]),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", {
      versions: "branchRef: r\nbranchToSync:\n  app-1: main\n",
      locations:
        "helm:\n  - valuesPath: a.yaml\n    anchor: t\napps:\n  app-1:\n    - valuesPath: a.yaml\n      anchor: v\n  app-2:\n    - valuesPath: a.yaml\n      anchor: w\n",
    })

    expect(() => loadConfig(dir.path)).toThrow(/"app-2".*locations\.yaml のみ/)
  })

  it("registry.yamlのappSpecs[]にどの設定ユニットからも参照されないappがあってもエラーにしない", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [
          { projectId: 1, projectName: "app-1" },
          { projectId: 999, projectName: "unused-app" },
        ],
      ),
    )
    dir.writeConfigUnit(
      "teamA-chart",
      "tenant1/client1",
      configUnitFiles([
        {
          projectName: "app-1",
          branchToSync: "main",
          locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
        },
      ]),
    )

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.apps.map((a) => a.projectName)).toEqual(["app-1"])
  })
})

describe("loadConfig（重複指定の検証）", () => {
  const REGISTRY_YAML = registryYaml(
    { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
    [
      { projectId: 1, projectName: "my-app" },
      { projectId: 2, projectName: "app-two" },
    ],
  )

  it("registry.yamlに同じprojectNameのappが2件あるとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [
          { projectId: 1, projectName: "my-app" },
          { projectId: 2, projectName: "my-app" },
        ],
      ),
    )
    dir.writeConfigUnit(
      "teamA-chart",
      "tenant1/client1",
      configUnitFiles([
        {
          projectName: "my-app",
          branchToSync: "main",
          locations: [{ valuesPath: "charts/my-app/values.yaml", anchor: "myAppVersion" }],
        },
      ]),
    )

    expect(() => loadConfig(dir.path)).toThrow('projectName のappが複数あります（"my-app"）')
  })

  it("registry.yamlに同じprojectIdのappが2件あるとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [
          { projectId: 1, projectName: "my-app" },
          { projectId: 1, projectName: "my-app" },
        ],
      ),
    )
    dir.writeConfigUnit(
      "teamA-chart",
      "tenant1/client1",
      configUnitFiles([
        {
          projectName: "my-app",
          branchToSync: "main",
          locations: [{ valuesPath: "charts/my-app/values.yaml", anchor: "myAppVersion" }],
        },
      ]),
    )

    expect(() => loadConfig(dir.path)).toThrow("projectId 1")
  })

  it("別々のappが同じ valuesPath + anchor を指しているとき例外をスローする", () => {
    dir.writeRegistryYaml("teamA-chart", REGISTRY_YAML)
    dir.writeConfigUnit(
      "teamA-chart",
      "tenant1/client1",
      configUnitFiles([
        {
          projectName: "my-app",
          branchToSync: "main",
          locations: [{ valuesPath: "charts/shared/values.yaml", anchor: "sharedAnchor" }],
        },
        {
          projectName: "app-two",
          branchToSync: "main",
          locations: [{ valuesPath: "charts/shared/values.yaml", anchor: "sharedAnchor" }],
        },
      ]),
    )

    expect(() => loadConfig(dir.path)).toThrow("sharedAnchor")
  })

  it("1つのappが同じ valuesPath + anchor を2回指定しているとき例外をスローする", () => {
    dir.writeRegistryYaml("teamA-chart", REGISTRY_YAML)
    dir.writeConfigUnit(
      "teamA-chart",
      "tenant1/client1",
      configUnitFiles([
        {
          projectName: "my-app",
          branchToSync: "main",
          locations: [
            { valuesPath: "charts/my-app/values.yaml", anchor: "myAppVersion" },
            { valuesPath: "charts/my-app/values.yaml", anchor: "myAppVersion" },
          ],
        },
      ]),
    )

    expect(() => loadConfig(dir.path)).toThrow("myAppVersion")
  })

  it("イメージタグとHelm向き先ブランチが同じ valuesPath + anchor を奪い合うとき例外をスローする", () => {
    dir.writeRegistryYaml("teamA-chart", REGISTRY_YAML)
    dir.writeConfigUnit(
      "teamA-chart",
      "tenant1/client1",
      configUnitFiles(
        [
          {
            projectName: "my-app",
            branchToSync: "main",
            locations: [{ valuesPath: "charts/my-app/values.yaml", anchor: "myAppVersion" }],
          },
        ],
        {
          branchRef: "release/2026-q1",
          locations: [{ valuesPath: "charts/my-app/values.yaml", anchor: "myAppVersion" }],
        },
      ),
    )

    expect(() => loadConfig(dir.path)).toThrow("myAppVersion")
  })

  it("valuesPathが同じでもanchorが違えば読み込める", () => {
    dir.writeRegistryYaml("teamA-chart", REGISTRY_YAML)
    dir.writeConfigUnit(
      "teamA-chart",
      "tenant1/client1",
      configUnitFiles([
        {
          projectName: "my-app",
          branchToSync: "main",
          locations: [{ valuesPath: "charts/shared/values.yaml", anchor: "appOneVersion" }],
        },
        {
          projectName: "app-two",
          branchToSync: "main",
          locations: [{ valuesPath: "charts/shared/values.yaml", anchor: "appTwoVersion" }],
        },
      ]),
    )

    const { configUnits } = loadConfig(dir.path)

    expect(configUnits[0]?.apps).toHaveLength(2)
  })
})

describe("loadConfig（複数のchartリポジトリにまたがるaccessTokenEnvの整合性）", () => {
  const configYamlFor = (projectName: string): ConfigUnitFiles =>
    configUnitFiles([
      {
        projectName,
        branchToSync: "main",
        locations: [{ valuesPath: `${projectName}.yaml`, anchor: "appVersion" }],
      },
    ])

  it("同じprojectIdのappが別々のchartリポジトリで違うaccessTokenEnvを宣言しているとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app" }],
        "ACCESS_TOKEN_TEAM_A",
      ),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", configYamlFor("my-app"))
    dir.writeRegistryYaml(
      "teamB-chart",
      registryYaml(
        { projectId: 889, projectName: "teamB-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app" }],
        "ACCESS_TOKEN_TEAM_B",
      ),
    )
    dir.writeConfigUnit("teamB-chart", "tenant1/client1", configYamlFor("my-app"))

    expect(() => loadConfig(dir.path)).toThrow("accessTokenEnv")
  })

  it("同じaccessTokenEnvを宣言していれば複数のchartリポジトリにまたがっても読み込める", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app" }],
        "ACCESS_TOKEN_TEAM_A",
      ),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", configYamlFor("my-app"))
    dir.writeRegistryYaml(
      "teamB-chart",
      registryYaml(
        { projectId: 889, projectName: "teamB-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app" }],
        "ACCESS_TOKEN_TEAM_A",
      ),
    )
    dir.writeConfigUnit("teamB-chart", "tenant1/client1", configYamlFor("my-app"))

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits).toHaveLength(2)
  })

  it("chartToUpdate.projectIdが別chartのappSpecs[].projectIdと衝突しているとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [],
        "ACCESS_TOKEN_TEAM_A",
      ),
    )
    dir.writeConfigUnit("teamA-chart", "central", configUnitFiles())
    dir.writeRegistryYaml(
      "teamB-chart",
      registryYaml(
        { projectId: 889, projectName: "teamB-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "shared-app" }],
        "ACCESS_TOKEN_TEAM_B",
      ),
    )
    dir.writeConfigUnit("teamB-chart", "tenant1/client1", configYamlFor("shared-app"))

    expect(() => loadConfig(dir.path)).toThrow("accessTokenEnv")
  })
})

describe("loadConfig（複数のchartリポジトリにまたがるtagFormatの食い違い）", () => {
  const configYamlFor = (branchToSync: string): ConfigUnitFiles =>
    configUnitFiles([
      {
        projectName: "my-app",
        branchToSync,
        locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
      },
    ])

  it("同じprojectIdのappが別々のchartリポジトリで違うtagFormatを指定しているとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app", tagFormat: "{branch}-build-at-{date}-{time}" }],
      ),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", configYamlFor("main"))
    dir.writeRegistryYaml(
      "teamB-chart",
      registryYaml(
        { projectId: 889, projectName: "teamB-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app", tagFormat: "{date}-{time}-{branch}" }],
      ),
    )
    dir.writeConfigUnit("teamB-chart", "tenant1/client1", configYamlFor("develop"))

    expect(() => loadConfig(dir.path)).toThrow("tagFormat")
  })

  it("同じprojectIdのappが別々のchartリポジトリで違うbranchToSyncを指定していても、tagFormatが同じなら読み込める", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app", tagFormat: "{date}-{time}-{branch}" }],
      ),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", configYamlFor("main"))
    dir.writeRegistryYaml(
      "teamB-chart",
      registryYaml(
        { projectId: 889, projectName: "teamB-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app", tagFormat: "{date}-{time}-{branch}" }],
      ),
    )
    dir.writeConfigUnit("teamB-chart", "tenant1/client1", configYamlFor("develop"))

    const { configUnits } = loadConfig(dir.path)

    expect(configUnits).toHaveLength(2)
  })

  it("同じchartリポジトリ配下の複数の設定ユニットは同じtagFormatの台帳を共有するため食い違いようが無い", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app", tagFormat: "{date}-{time}-{branch}" }],
      ),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", configYamlFor("main"))
    dir.writeConfigUnit("teamA-chart", "tenant1/client2", configYamlFor("develop"))

    const { configUnits } = loadConfig(dir.path)

    expect(configUnits).toHaveLength(2)
    expect(configUnits.every((g) => g.apps[0]?.tagFormat === "{date}-{time}-{branch}")).toBe(
      true,
    )
  })
})
