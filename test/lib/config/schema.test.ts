import { describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import type { GroupFixture } from "./fixture.js"
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

describe("loadConfig（registry.yamlのaccessTokenEnv）", () => {
  const CONFIG_YAML = configYaml([
    {
      projectId: 1,
      projectName: "app-1",
      branchToSync: "main",
      locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
    },
  ])

  it("宣言した環境変数名がそのままConfigUnitまで届く", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
        "ACCESS_TOKEN_TEAM_A",
      ),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", CONFIG_YAML)

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.accessTokenEnv).toBe("ACCESS_TOKEN_TEAM_A")
  })

  it("accessTokenEnv を書いていない registry.yaml は設定エラーになる（書き漏れが広い権限のトークンへ流れないようにするため）", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      "chartToUpdate:\n" +
        "  projectId: 888\n" +
        "  projectName: teamA-chart\n" +
        "  mrTargetBranch: develop\n" +
        "appSpecs:\n" +
        "  - projectId: 1\n" +
        "    projectName: app-1\n" +
        `    tagFormat: '${DEFAULT_TAG_FORMAT}'\n`,
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("accessTokenEnv は必須です")
  })

  it.each(["ACCESS_TOKEN", "RENOVATE_TOKEN", "ACCESS_TOKEN_team_a", "ACCESS_TOKEN_"])(
    "不正な名前 %s のとき例外をスローする",
    (accessTokenEnv) => {
      dir.writeRegistryYaml(
        "teamA-chart",
        registryYaml(
          { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
          [{ projectId: 1, projectName: "app-1" }],
          accessTokenEnv,
        ),
      )
      dir.writeConfigYaml("teamA-chart", "tenant1/client1", CONFIG_YAML)

      expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
    },
  )
})

describe("loadConfig（registry.yamlのgroup）", () => {
  const CONFIG_YAML = configYaml([
    {
      projectId: 1,
      projectName: "app-1",
      branchToSync: "main",
      locations: [{ valuesPath: "a.yaml", anchor: "appVersion" }],
    },
  ])

  /** `group`だけを差し替えたregistry.yamlを書き、`loadConfig()`にかけられる状態にする */
  function writeRegistryWithGroup(group: GroupFixture): void {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 888, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
        "ACCESS_TOKEN_TEAM_A",
        group,
      ),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", CONFIG_YAML)
  }

  it("宣言したgroupIdとgroupNameがそのままConfigUnitまで届く", () => {
    writeRegistryWithGroup({ groupId: 4242, groupName: "team-a-group/sub" })

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.groupId).toBe("4242")
    expect(configUnits[0]?.groupName).toBe("team-a-group/sub")
  })

  it("groupId を文字列で書いても読める", () => {
    writeRegistryWithGroup({ groupId: '"4242"', groupName: "team-a-group" })

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.groupId).toBe("4242")
  })

  it("group を書いていない registry.yaml は設定エラーになる（所属の照合を黙ってすり抜けないようにするため）", () => {
    dir.writeRegistryYaml("teamA-chart", registryYamlWithoutGroupBlock(""))
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("group は必須です")
  })

  it("groupId を書いていない registry.yaml は設定エラーになる", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYamlWithoutGroupBlock("group:\n  groupName: team-a-group\n"),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("group.groupId は必須です")
  })

  it("groupName を書いていない registry.yaml は設定エラーになる", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYamlWithoutGroupBlock("group:\n  groupId: 4242\n"),
    )
    dir.writeConfigYaml("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("group.groupName は必須です")
  })

  it.each(["team-a-group", "0", "-1", "42abc"])(
    "groupId が数値のIDでない（%s）とき例外をスローする",
    (groupId) => {
      writeRegistryWithGroup({ groupId: `"${groupId}"`, groupName: "team-a-group" })

      expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
    },
  )

  it.each(["/team-a-group", "team-a-group/", "team-a-group//sub", "team a group"])(
    "groupName が不正なフルパス（%s）のとき例外をスローする",
    (groupName) => {
      writeRegistryWithGroup({ groupId: 4242, groupName: `"${groupName}"` })

      expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
    },
  )
})

/** `group`ブロックだけを差し替えられるregistry.yaml。書き漏らしそのものを検証するテスト専用 */
function registryYamlWithoutGroupBlock(groupBlock: string): string {
  return (
    "accessTokenEnv: ACCESS_TOKEN_TEAM_A\n" +
    groupBlock +
    "chartToUpdate:\n" +
    "  projectId: 888\n" +
    "  projectName: teamA-chart\n" +
    "  mrTargetBranch: develop\n" +
    "appSpecs:\n" +
    "  - projectId: 1\n" +
    "    projectName: app-1\n" +
    `    tagFormat: '${DEFAULT_TAG_FORMAT}'\n`
  )
}

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
      'accessTokenEnv: ACCESS_TOKEN_TEAM_A\n' +
        'group:\n  groupId: 10\n  groupName: team-a-group\n' +
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
