import { describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import { configYaml, registryYaml, useConfigDir } from "./fixture.js"

const dir = useConfigDir()

describe("loadConfig（config.yaml と registry.yaml の appSpecs[] の紐づけ）", () => {
  it("config.yamlのappに対応するprojectIdがregistry.yamlのappSpecs[]に無いとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" }),
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

    expect(() => loadConfig(dir.path)).toThrow("app-1")
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

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.apps.map((a) => a.projectName)).toEqual(["app-1"])
  })

  it("config.yamlとregistry.yamlでprojectIdが同じでもprojectNameが一致しないとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1-typo" }],
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

    expect(() => loadConfig(dir.path)).toThrow("projectName")
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

  it("config.yamlに同じprojectIdのappが2件あるとき例外をスローする", () => {
    dir.writeRegistryYaml("teamA-chart", REGISTRY_YAML)
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
          projectName: "my-app",
          branchToSync: "main",
          locations: [{ valuesPath: "charts/my-app/values.yaml", anchor: "myAppVersion" }],
        },
        {
          projectId: 1,
          projectName: "my-app",
          branchToSync: "develop",
          locations: [{ valuesPath: "charts/my-app/values.yaml", anchor: "myAppVersion" }],
        },
      ]),
    )

    expect(() => loadConfig(dir.path)).toThrow("projectId 1")
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
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
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
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
          projectName: "my-app",
          branchToSync: "main",
          locations: [{ valuesPath: "charts/shared/values.yaml", anchor: "sharedAnchor" }],
        },
        {
          projectId: 2,
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
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
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
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml(
        [
          {
            projectId: 1,
            projectName: "my-app",
            branchToSync: "main",
            locations: [{ valuesPath: "charts/my-app/values.yaml", anchor: "myAppVersion" }],
          },
        ],
        {
          branchToSync: "release/2026-q1",
          locations: [{ valuesPath: "charts/my-app/values.yaml", anchor: "myAppVersion" }],
        },
      ),
    )

    expect(() => loadConfig(dir.path)).toThrow("myAppVersion")
  })

  it("valuesPathが同じでもanchorが違えば読み込める", () => {
    dir.writeRegistryYaml("teamA-chart", REGISTRY_YAML)
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 1,
          projectName: "my-app",
          branchToSync: "main",
          locations: [{ valuesPath: "charts/shared/values.yaml", anchor: "appOneVersion" }],
        },
        {
          projectId: 2,
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

describe("loadConfig（複数のchartリポジトリにまたがるtagFormatの食い違い）", () => {
  const configYamlFor = (branchToSync: string): string =>
    configYaml([
      {
        projectId: 1,
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
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYamlFor("main"))
    dir.writeRegistryYaml(
      "teamB-chart",
      registryYaml(
        { projectId: 889, projectName: "teamB-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app", tagFormat: "{date}-{time}-{branch}" }],
      ),
    )
    dir.writeConfigYaml("teamB-chart", "tenant1/client1", configYamlFor("develop"))

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
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYamlFor("main"))
    dir.writeRegistryYaml(
      "teamB-chart",
      registryYaml(
        { projectId: 889, projectName: "teamB-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "my-app", tagFormat: "{date}-{time}-{branch}" }],
      ),
    )
    dir.writeConfigYaml("teamB-chart", "tenant1/client1", configYamlFor("develop"))

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
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", configYamlFor("main"))
    dir.writeConfigYaml("teamA-chart", "tenant1/client2", configYamlFor("develop"))

    const { configUnits } = loadConfig(dir.path)

    expect(configUnits).toHaveLength(2)
    expect(configUnits.every((g) => g.apps[0]?.tagFormat === "{date}-{time}-{branch}")).toBe(
      true,
    )
  })
})
