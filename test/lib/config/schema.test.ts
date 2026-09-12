import { describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import { DEFAULT_TAG_FORMAT, configYaml, registryYaml, useConfigDir } from "./fixture.js"

const dir = useConfigDir()

describe("loadConfig（スキーマ検証エラー）", () => {
  it("registry.yaml の projectId が空文字のとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      'chartToUpdate:\n  projectId: ""\n  projectName: teamA-chart\n  mrTargetBranch: develop\nappSpecs: []\n',
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
      'apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: ""\n    locations:\n      - valuesPath: a.yaml\n        anchor: appVersion\n',
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("config.yaml の apps[].locations が空配列のとき例外をスローする", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    locations: []\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("config.yaml の apps[].locations[].valuesPath が無いとき例外をスローする", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    locations:\n      - anchor: appVersion\n",
    )

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("config.yaml の apps[].locations[].anchor が無いとき例外をスローする", () => {
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
      "apps:\n  - projectId: 1\n    projectName: app-1\n    branchToSync: main\n    locations:\n      - valuesPath: a.yaml\n",
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
      locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
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

describe("loadConfig（projectIdの数値/文字列両対応）", () => {
  it("registry.yaml と config.yaml の projectId が数値（GitLabのプロジェクトID）でも読める", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 100, projectName: "teamA-chart", mrTargetBranch: "develop" }, [
        { projectId: 100, projectName: "app-1" },
      ]),
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      configYaml([
        {
          projectId: 100,
          projectName: "app-1",
          branchToSync: "main",
          locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
        },
      ]),
    )

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.chartRepo.projectId).toBe("100")
    expect(configUnits[0]?.apps[0]?.projectId).toBe("100")
  })

  it("registry.yaml と config.yaml の projectId が文字列（GitHubのowner/repo）でも読める", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      'chartToUpdate:\n  projectId: "owner/repo"\n  projectName: teamA-chart\n' +
        '  mrTargetBranch: develop\n' +
        'appSpecs:\n  - projectId: "owner/repo"\n    projectName: app-1\n' +
        `    tagFormat: '${DEFAULT_TAG_FORMAT}'\n`,
    )
    dir.writeConfigYaml(
      "teamA-chart",
      "tenant1/client1",
      'helm:\n  branchRef: release/2026-q1\n  locations:\n    - valuesPath: a.yaml\n      anchor: defaultHelmTargetBranch\n' +
        'apps:\n  - projectId: "owner/repo"\n    projectName: app-1\n    branchToSync: main\n' +
        '    locations:\n      - valuesPath: a.yaml\n        anchor: appVersion\n',
    )

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.chartRepo.projectId).toBe("owner/repo")
    expect(configUnits[0]?.apps[0]?.projectId).toBe("owner/repo")
  })
})
