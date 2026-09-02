import { existsSync } from "node:fs"
import { join } from "node:path"

import { z } from "zod"

import type { AppConfig, ChartGroup, Config } from "../types.js"
import { toBranchName, toProjectId, toProjectName } from "../types.js"
import { assertSafePath, listSubdirectories } from "../utils/fs.js"
import { parseYamlFile } from "../utils/yaml.js"

const ChartYamlSchema = z.object({
  chart: z.object({
    projectId: z.number().int().transform(toProjectId),
    projectName: z.string().min(1).transform(toProjectName),
    mrTargetBranch: z.string().min(1, "mrTargetBranch は空にできません").transform(toBranchName),
  }),
})

const AppConfigSchema = z.object({
  projectId: z.number().int().transform(toProjectId),
  projectName: z.string().min(1).transform(toProjectName),
  branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
  chart: z.object({
    valuesPath: z.string().min(1, "valuesPath は空にできません"),
    imageTagKey: z.string().min(1, "imageTagKey は空にできません"),
  }),
})

const AppsYamlSchema = z.object({
  apps: z.array(AppConfigSchema),
})

/**
 * apps.yaml は `<chartDir>/<tenantId>/<clientId>/apps.yaml` の2階層固定で配置される。
 * 該当ファイルが存在しない tenant/client は空扱いとする。
 */
function loadApps(chartDirPath: string): AppConfig[] {
  return listSubdirectories(chartDirPath).flatMap((tenantId) => {
    const tenantDirPath = join(chartDirPath, tenantId)
    return listSubdirectories(tenantDirPath).flatMap((clientId) => {
      const appsYamlPath = join(tenantDirPath, clientId, "apps.yaml")
      if (!existsSync(appsYamlPath)) return []
      return parseYamlFile(appsYamlPath, AppsYamlSchema).apps
    })
  })
}

/**
 * `config/<chartディレクトリ>/chart.yaml` + `config/<chartディレクトリ>/<tenantId>/<clientId>/apps.yaml`
 * という2階層固定のディレクトリ構成を再帰的に読み込む。chart.yaml のないディレクトリは無視する。
 */
export function loadConfig(configPath?: string): Config {
  const path = configPath ?? "config"
  assertSafePath(path, "CONFIG_PATH")

  const chartGroups = listSubdirectories(path)
    .map((chartDir): ChartGroup | undefined => {
      const chartDirPath = join(path, chartDir)
      const chartYamlPath = join(chartDirPath, "chart.yaml")
      if (!existsSync(chartYamlPath)) return undefined
      const { chart } = parseYamlFile(chartYamlPath, ChartYamlSchema)
      return { chartDir, chart, apps: loadApps(chartDirPath) }
    })
    .filter((group): group is ChartGroup => group !== undefined)

  return { chartGroups }
}
