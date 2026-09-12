import { describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import { configYaml, registryYaml, useConfigDir } from "./fixture.js"

const dir = useConfigDir()

describe("loadConfig（スキーマ検証エラー）", () => {
  it("registry.yaml の projectId が数値でないとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      'chartToUpdate:\n  projectId: "not-a-number"\n  projectName: teamA-chart\n  mrTargetBranch: develop\nappSpecs: []\n',
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("registry.yaml の mrTargetBranch がないとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      "chartToUpdate:\n  projectId: 1\n  projectName: teamA-chart\nappSpecs: []\n",
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("registry.yaml の appSpecs がないとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      "chartToUpdate:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("config.yaml の branchToSync が空文字のとき例外をスローする", () => {
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
      'apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: ""\n    chart:\n      - valuesPath: a.yaml\n        anchor: appVersion\n',
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("config.yaml の apps[].chart が空配列のとき例外をスローする", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    chart: []\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("config.yaml の apps[].chart[].valuesPath が無いとき例外をスローする", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    chart:\n      - anchor: appVersion\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("config.yaml の apps[].chart[].anchor が無いとき例外をスローする", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    chart:\n      - valuesPath: a.yaml\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })
})

describe("loadConfig（registry.yamlのappSpecs[].tagFormat）", () => {
  const CONFIG_YAML = configYaml([
    {
      projectId: 1,
      projectName: "app-1",
      branchToSync: "main",
      chart: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
    },
  ])

  it("指定したタグ形式がそのままAppConfigまで届く", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1", tagFormat: "{date}-{time}-{branch}" }],
      ),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", CONFIG_YAML)

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.apps[0]?.tagFormat).toBe("{date}-{time}-{branch}")
  })

  it("省略したとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      "chartToUpdate:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n" +
        "appSpecs:\n  - projectId: 1\n    projectName: app-1\n",
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("tagFormat は必須です")
  })

  it.each(["{date}-{time}", "{branch}-{date}", "{branch}", "{time}", "{date}"])(
    "プレースホルダが足りないフォーマット %s は例外をスローする",
    (tagFormat) => {
      dir.writeRegistryYaml(
        "teamA-chart",
        registryYaml(
          { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
          [{ projectId: 1, projectName: "app-1", tagFormat }],
        ),
      )
      dir.writeConfigYaml("teamA-chart", "tenant1/client1", CONFIG_YAML)

      expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
    },
  )
})
