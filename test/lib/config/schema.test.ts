import { describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import type { GroupFixture } from "./fixture.js"
import { DEFAULT_TAG_FORMAT, configUnitFiles, registryYaml, useConfigDir } from "./fixture.js"

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

  it("versions.yaml の branchToSync が空文字のとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", {
      versions: 'helmBranchRef: release/2026-q1\nbranchToSync:\n  app-1: ""\n',
      locations: "helm:\n  - valuesPath: a.yaml\n    anchor: t\napps:\n  app-1:\n    - valuesPath: a.yaml\n      anchor: appVersion\n",
    })
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("locations.yaml の apps の書き込み先が空配列のとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", {
      versions: "helmBranchRef: release/2026-q1\nbranchToSync:\n  app-1: main\n",
      locations: "helm:\n  - valuesPath: a.yaml\n    anchor: t\napps:\n  app-1: []\n",
    })

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("locations.yaml の apps の valuesPath が無いとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", {
      versions: "helmBranchRef: release/2026-q1\nbranchToSync:\n  app-1: main\n",
      locations: "helm:\n  - valuesPath: a.yaml\n    anchor: t\napps:\n  app-1:\n    - anchor: appVersion\n",
    })

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("locations.yaml の apps の anchor が無いとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", {
      versions: "helmBranchRef: release/2026-q1\nbranchToSync:\n  app-1: main\n",
      locations: "helm:\n  - valuesPath: a.yaml\n    anchor: t\napps:\n  app-1:\n    - valuesPath: a.yaml\n",
    })

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })
})

describe("loadConfig（registry.yamlのappSpecs[].tagFormat）", () => {
  const CONFIG_YAML = configUnitFiles([
    {
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
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.apps[0]?.tagFormat).toBe("{date}-{time}-{branch}")
  })

  it("省略したとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      "chartToUpdate:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n" +
        "appSpecs:\n  - projectId: 1\n    projectName: app-1\n",
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

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
      dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

      expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
    },
  )
})

describe("loadConfig（registry.yamlのaccessTokenEnv）", () => {
  const CONFIG_YAML = configUnitFiles([
    {
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
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

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
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

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
      dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

      expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
    },
  )
})

describe("loadConfig（registry.yamlのgroup）", () => {
  const CONFIG_YAML = configUnitFiles([
    {
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
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)
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
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("group は必須です")
  })

  it("groupId を書いていない registry.yaml は設定エラーになる", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYamlWithoutGroupBlock("group:\n  groupName: team-a-group\n"),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("group.groupId は必須です")
  })

  it("groupName を書いていない registry.yaml は設定エラーになる", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYamlWithoutGroupBlock("group:\n  groupId: 4242\n"),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

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
  it("registry.yaml の projectId が数値（GitLabのプロジェクトID）でも読める", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml({ projectId: 100, projectName: "teamA-chart", mrTargetBranch: "develop" }, [
        { projectId: 100, projectName: "app-1" },
      ]),
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
    expect(configUnits[0]?.chartRepo.projectId).toBe("100")
    expect(configUnits[0]?.apps[0]?.projectId).toBe("100")
  })

  it("registry.yaml の projectId が文字列（GitHubのowner/repo）でも読める", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      'accessTokenEnv: ACCESS_TOKEN_TEAM_A\n' +
        'group:\n  groupId: 10\n  groupName: team-a-group\n' +
        'chartToUpdate:\n  projectId: "owner/repo"\n  projectName: teamA-chart\n' +
        '  mrTargetBranch: develop\n' +
        'appSpecs:\n  - projectId: "owner/repo"\n    projectName: app-1\n' +
        `    tagFormat: '${DEFAULT_TAG_FORMAT}'\n`,
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", {
      versions: "helmBranchRef: release/2026-q1\nbranchToSync:\n  app-1: main\n",
      locations: "helm:\n  - valuesPath: a.yaml\n    anchor: defaultHelmTargetBranch\napps:\n  app-1:\n    - valuesPath: a.yaml\n      anchor: appVersion\n",
    })

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.chartRepo.projectId).toBe("owner/repo")
    expect(configUnits[0]?.apps[0]?.projectId).toBe("owner/repo")
  })
})

describe("loadConfig（知らないキー）", () => {
  const REGISTRY = registryYaml(
    { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
    [{ projectId: 1, projectName: "app-1" }],
  )
  const VERSIONS = "helmBranchRef: release/2026-q1\nbranchToSync:\n  app-1: main\n"
  const LOCATIONS =
    "helm:\n  - valuesPath: a.yaml\n    anchor: t\napps:\n  app-1:\n    - valuesPath: a.yaml\n      anchor: appVersion\n"

  const load = (files: { registry?: string; versions?: string; locations?: string }) => {
    dir.writeRegistryYaml("teamA-chart", files.registry ?? REGISTRY)
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", {
      versions: files.versions ?? VERSIONS,
      locations: files.locations ?? LOCATIONS,
    })
    return loadConfig(dir.path)
  }

  it("正常な設定は読める（下のテストの土台）", () => {
    expect(() => load({})).not.toThrow()
  })

  it.each([
    ["registry.yaml のトップレベル", { registry: REGISTRY + "extra: 1\n" }, "registry.yaml"],
    [
      "registry.yaml の group",
      { registry: REGISTRY.replace("  groupName:", "  extra: 1\n  groupName:") },
      "registry.yaml",
    ],
    [
      "registry.yaml の chartToUpdate",
      { registry: REGISTRY.replace("  mrTargetBranch:", "  extra: 1\n  mrTargetBranch:") },
      "registry.yaml",
    ],
    [
      "registry.yaml の appSpecs[]",
      { registry: REGISTRY.replace("    tagFormat:", "    extra: 1\n    tagFormat:") },
      "registry.yaml",
    ],
    ["versions.yaml のトップレベル", { versions: VERSIONS + "extra: 1\n" }, "versions.yaml"],
    ["locations.yaml のトップレベル", { locations: LOCATIONS + "extra: 1\n" }, "locations.yaml"],
    [
      "locations.yaml の helm[]",
      { locations: LOCATIONS.replace("    anchor: t\n", "    anchor: t\n    extra: 1\n") },
      "locations.yaml",
    ],
    [
      "locations.yaml の apps.<app>[]",
      { locations: LOCATIONS.replace("      anchor: appVersion\n", "      anchor: appVersion\n      extra: 1\n") },
      "locations.yaml",
    ],
  ])("%s に知らないキーがあると設定エラーになる", (_label, files, fileName) => {
    expect(() => load(files)).toThrow(fileName)
    expect(() => load(files)).toThrow("extra")
  })

  it("versions.yaml に helm: を書く（キーを書くファイルの取り違え）と設定エラーになる", () => {
    const versions = VERSIONS + "helm:\n  - valuesPath: a.yaml\n    anchor: t\n"
    expect(() => load({ versions })).toThrow("versions.yaml")
    expect(() => load({ versions })).toThrow("helm")
  })

  it("versions.yaml に旧キー branchRef を書くと設定エラーになる", () => {
    const versions = "branchRef: release/2026-q1\nbranchToSync:\n  app-1: main\n"
    expect(() => load({ versions })).toThrow("versions.yaml")
    expect(() => load({ versions })).toThrow("branchRef")
  })
})
