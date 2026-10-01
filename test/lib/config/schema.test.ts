import { describe, expect, it } from "vitest"

import { loadConfig } from "../../../src/lib/config/config.js"
import type { GroupFixture } from "./fixture.js"
import { DEFAULT_TAG_FORMAT, configUnitFiles, registryYaml, useConfigDir } from "./fixture.js"

const dir = useConfigDir()

describe("loadConfig（スキーマ検証エラー）", () => {
  it("registry.yaml の projectId が空文字のとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      'chart:\n  projectId: ""\n  projectName: teamA-chart\n  mrTargetBranch: develop\napps: []\n',
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("registry.yaml の mrTargetBranch がないとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\napps: []\n",
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("registry.yaml の apps がないとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n",
    )
    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })

  it("versions.yaml の apps のブランチ名が空文字のとき例外をスローする", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYaml(
        { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
        [{ projectId: 1, projectName: "app-1" }],
      ),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", {
      versions: 'helm: release/2026-q1\napps:\n  app-1: ""\n',
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
      versions: "helm: release/2026-q1\napps:\n  app-1: main\n",
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
      versions: "helm: release/2026-q1\napps:\n  app-1: main\n",
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
      versions: "helm: release/2026-q1\napps:\n  app-1: main\n",
      locations: "helm:\n  - valuesPath: a.yaml\n    anchor: t\napps:\n  app-1:\n    - valuesPath: a.yaml\n",
    })

    expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
  })
})

describe("loadConfig（registry.yamlのapps[].tagFormat）", () => {
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
      "chart:\n  projectId: 1\n  projectName: teamA-chart\n  mrTargetBranch: develop\n" +
        "apps:\n  - projectId: 1\n    projectName: app-1\n",
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("tagFormat は必須です")
  })

  it.each(["{date}-{time}"])(
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
      "chart:\n" +
        "  projectId: 888\n" +
        "  projectName: teamA-chart\n" +
        "  mrTargetBranch: develop\n" +
        "apps:\n" +
        "  - projectId: 1\n" +
        "    projectName: app-1\n" +
        `    tagFormat: '${DEFAULT_TAG_FORMAT}'\n`,
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("accessTokenEnv は必須です")
  })

  it.each(["ACCESS_TOKEN"])(
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

  it("宣言したgroup.idとgroup.nameがそのままConfigUnitまで届く", () => {
    writeRegistryWithGroup({ id: 4242, name: "team-a-group/sub" })

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.group.id).toBe("4242")
    expect(configUnits[0]?.group.name).toBe("team-a-group/sub")
  })

  it("group.id を文字列で書いても読める", () => {
    writeRegistryWithGroup({ id: '"4242"', name: "team-a-group" })

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.group.id).toBe("4242")
  })

  it("group を書いていない registry.yaml は設定エラーになる（所属の照合を黙ってすり抜けないようにするため）", () => {
    dir.writeRegistryYaml("teamA-chart", registryYamlWithoutGroupBlock(""))
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("group は必須です")
  })

  it("group.id を書いていない registry.yaml は設定エラーになる", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYamlWithoutGroupBlock("group:\n  name: team-a-group\n"),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("group.id は必須です")
  })

  it("group.name を書いていない registry.yaml は設定エラーになる", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      registryYamlWithoutGroupBlock("group:\n  id: 4242\n"),
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", CONFIG_YAML)

    expect(() => loadConfig(dir.path)).toThrow("group.name は必須です")
  })

  it.each(["team-a-group", "0", "-1", "42abc"])(
    "group.id が数値のIDでない（%s）とき例外をスローする",
    (groupId) => {
      writeRegistryWithGroup({ id: `"${groupId}"`, name: "team-a-group" })

      expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
    },
  )

  it.each(["/team-a-group", "team-a-group/", "team-a-group//sub", "team a group"])(
    "group.name が不正なフルパス（%s）のとき例外をスローする",
    (groupName) => {
      writeRegistryWithGroup({ id: 4242, name: `"${groupName}"` })

      expect(() => loadConfig(dir.path)).toThrow("形式が不正です")
    },
  )
})

/** `group`ブロックだけを差し替えられるregistry.yaml。書き漏らしそのものを検証するテスト専用 */
function registryYamlWithoutGroupBlock(groupBlock: string): string {
  return (
    "accessTokenEnv: ACCESS_TOKEN_TEAM_A\n" +
    groupBlock +
    "chart:\n" +
    "  projectId: 888\n" +
    "  projectName: teamA-chart\n" +
    "  mrTargetBranch: develop\n" +
    "apps:\n" +
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
    expect(configUnits[0]?.chart.projectId).toBe("100")
    expect(configUnits[0]?.apps[0]?.projectId).toBe("100")
  })

  it("registry.yaml の projectId が文字列（GitHubのowner/repo）でも読める", () => {
    dir.writeRegistryYaml(
      "teamA-chart",
      'accessTokenEnv: ACCESS_TOKEN_TEAM_A\n' +
        'group:\n  id: 10\n  name: team-a-group\n' +
        'chart:\n  projectId: "owner/repo"\n  projectName: teamA-chart\n' +
        '  mrTargetBranch: develop\n' +
        'apps:\n  - projectId: "owner/repo"\n    projectName: app-1\n' +
        `    tagFormat: '${DEFAULT_TAG_FORMAT}'\n`,
    )
    dir.writeConfigUnit("teamA-chart", "tenant1/client1", {
      versions: "helm: release/2026-q1\napps:\n  app-1: main\n",
      locations: "helm:\n  - valuesPath: a.yaml\n    anchor: defaultHelmTargetBranch\napps:\n  app-1:\n    - valuesPath: a.yaml\n      anchor: appVersion\n",
    })

    const { configUnits } = loadConfig(dir.path)
    expect(configUnits[0]?.chart.projectId).toBe("owner/repo")
    expect(configUnits[0]?.apps[0]?.projectId).toBe("owner/repo")
  })
})

describe("loadConfig（知らないキー）", () => {
  const REGISTRY = registryYaml(
    { projectId: 1, projectName: "teamA-chart", mrTargetBranch: "develop" },
    [{ projectId: 1, projectName: "app-1" }],
  )
  const VERSIONS = "helm: release/2026-q1\napps:\n  app-1: main\n"
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
      { registry: REGISTRY.replace("  name:", "  extra: 1\n  name:") },
      "registry.yaml",
    ],
    [
      "registry.yaml の chart",
      { registry: REGISTRY.replace("  mrTargetBranch:", "  extra: 1\n  mrTargetBranch:") },
      "registry.yaml",
    ],
    [
      "registry.yaml の apps[]",
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

  it("versions.yaml に旧キー branchRef を書くと設定エラーになる", () => {
    const versions = "branchRef: release/2026-q1\napps:\n  app-1: main\n"
    expect(() => load({ versions })).toThrow("versions.yaml")
    expect(() => load({ versions })).toThrow("branchRef")
  })

  it("versions.yaml に旧キー helmBranchRef・appBranchToSync を書くと設定エラーになる", () => {
    const versions = "helmBranchRef: release/2026-q1\nappBranchToSync:\n  app-1: main\n"
    expect(() => load({ versions })).toThrow("versions.yaml")
    expect(() => load({ versions })).toThrow("helmBranchRef")
  })

  it("versions.yaml に旧キー branchToSync を書くと設定エラーになる", () => {
    const versions = "helm: release/2026-q1\nbranchToSync:\n  app-1: main\n"
    expect(() => load({ versions })).toThrow("versions.yaml")
    expect(() => load({ versions })).toThrow("branchToSync")
  })
})
