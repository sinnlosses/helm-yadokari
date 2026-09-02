import {
  type FileUpdate,
  type GitlabClient,
  createTag,
  getFileContent,
  getLatestPipelineForRef,
  listTagNames,
} from "../lib/gitlab.js"
import { buildNewTag, findLatestParsedTag } from "../lib/tag.js"
import { getValueAtPath, setValueAtPath } from "../lib/values.js"
import type { AppConfig, AppUpdatePlan, BranchName, ParsedTag, ProjectId } from "../types.js"
import { toTagName } from "../types.js"
import { logger } from "../utils/logger.js"

/**
 * 追跡ブランチ由来の最新タグを判定する。1件も見つからない場合は、このツール自身が
 * 追跡ブランチの最新コミットに対して新しいタグを作成し、それを最新タグとして扱う
 * （dryRun のときは実際の作成はスキップし、作成予定のタグ名だけを使う）。
 */
async function resolveLatestTag(
  gitlab: GitlabClient,
  app: AppConfig,
  dryRun: boolean,
): Promise<ParsedTag> {
  const tags = await listTagNames(gitlab, app.projectId)
  const existingTag = findLatestParsedTag(tags, app.branchToSync)
  if (existingTag) return existingTag

  const newTag = buildNewTag(app.branchToSync, new Date())
  if (!dryRun) {
    await createTag(gitlab, app.projectId, newTag.name, app.branchToSync)
  }
  logger.info({
    event: "create_tag",
    projectName: app.projectName,
    branch: app.branchToSync,
    tag: newTag.name,
    dryRun,
  })
  return newTag
}

/**
 * 各アプリの最新タグを判定し、反映済みタグと異なるアプリだけを更新計画に含める。
 * 同じ values.yaml を参照する複数アプリの変更は、同一ファイル内に積み重ねてまとめる。
 */
export async function buildChartUpdate(
  gitlab: GitlabClient,
  chartProjectId: ProjectId,
  baseBranch: BranchName,
  apps: readonly AppConfig[],
  dryRun: boolean,
): Promise<{ plans: AppUpdatePlan[]; files: FileUpdate[] }> {
  const contentCache = new Map<string, string>()
  const modifiedPaths = new Set<string>()

  async function loadContent(path: string): Promise<string> {
    const cached = contentCache.get(path)
    if (cached !== undefined) return cached
    const content = await getFileContent(gitlab, chartProjectId, path, baseBranch)
    if (content === undefined) {
      throw new Error(`values.yaml が見つかりません: ${path}`)
    }
    contentCache.set(path, content)
    return content
  }

  const plans: AppUpdatePlan[] = []

  for (const app of apps) {
    const latestTag = await resolveLatestTag(gitlab, app, dryRun)

    const content = await loadContent(app.chart.valuesPath)
    const currentTag = getValueAtPath(content, app.chart.imageTagKey)
    if (currentTag === latestTag.name) {
      logger.info({
        event: "check_app",
        projectName: app.projectName,
        result: "SKIPPED",
        reason: "already_up_to_date",
        tag: latestTag.name,
      })
      continue
    }

    const pipeline = await getLatestPipelineForRef(gitlab, app.projectId, latestTag.name)
    plans.push({
      app,
      previousTag: currentTag === undefined ? undefined : toTagName(currentTag),
      latestTag,
      pipelineUrl: pipeline?.webUrl,
      pipelineStatus: pipeline?.status,
    })
    contentCache.set(
      app.chart.valuesPath,
      setValueAtPath(content, app.chart.imageTagKey, latestTag.name),
    )
    modifiedPaths.add(app.chart.valuesPath)
  }

  const files: FileUpdate[] = [...modifiedPaths].map((filePath) => {
    const content = contentCache.get(filePath)
    if (content === undefined) {
      throw new Error(`internal error: missing content for ${filePath}`)
    }
    return { filePath, content }
  })

  return { plans, files }
}
