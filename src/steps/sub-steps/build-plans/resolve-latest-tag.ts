import {
  type GitlabClient,
  createTag,
  getBranchHeadSha,
  listTags,
} from "../../../lib/gitlab/gitlab.js"
import { buildNewTag, findLatestParsedTag } from "../../../lib/gitlab/tag.js"
import type { AppConfig, TagFormat } from "../../../types.js"
import { logger } from "../../../utils/logger.js"
import type { LatestTagResolution } from "./types.js"

/**
 * 追跡ブランチ由来の最新タグを判定する。追跡ブランチの現在のHEADコミットと一致する
 * 既存タグが無い場合（1件も見つからない場合に加え、見つかった最新タグが追跡ブランチの
 * 進行にビハインドしている場合を含む）は、このツール自身が追跡ブランチの最新コミットに
 * 対して新しいタグを作成し、それを最新タグとして扱う（dryRun のときは実際の作成は
 * スキップし、作成予定のタグ名だけを使う）。タグの命名規則は`tagFormat`（`TAG_FORMAT`
 * 環境変数由来）に従う。
 *
 * あわせて`pointsAtTrackedHead`（values.yamlの現在値が追跡ブランチのHEADを指すタグかの判定）
 * を返す。中身が同じコミットなら、より新しい名前のタグがあっても更新しないため（T-037）。
 */
export async function resolveLatestTag(
  gitlab: GitlabClient,
  app: AppConfig,
  dryRun: boolean,
  tagFormat: TagFormat,
): Promise<LatestTagResolution> {
  const [tags, headSha] = await Promise.all([
    listTags(gitlab, app.projectId),
    getBranchHeadSha(gitlab, app.projectId, app.branchToSync),
  ])
  const pointsAtTrackedHead = (currentValue: string): boolean =>
    headSha !== undefined &&
    tags.some((tag) => tag.name === currentValue && tag.commitSha === headSha)

  const existingTag = findLatestParsedTag(
    tags.map((tag) => tag.name),
    app.branchToSync,
    tagFormat,
  )
  const existingTagCommitSha = tags.find((tag) => tag.name === existingTag?.name)?.commitSha
  if (existingTag && existingTagCommitSha === headSha) {
    return { tag: existingTag, pointsAtTrackedHead }
  }

  const newTag = buildNewTag(app.branchToSync, new Date(), tagFormat)
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
  return { tag: newTag, pointsAtTrackedHead }
}
