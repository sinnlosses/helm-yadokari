import {
  type GitlabClient,
  createTag,
  getBranchHeadSha,
  listTags,
} from "../../../lib/gitlab/gitlab.js"
import { buildNewTag, findLatestParsedTag, parseTag } from "../../../lib/gitlab/tag.js"
import type { AppConfig, BranchName, TagFormat, TagName } from "../../../types.js"
import { toTagName } from "../../../types.js"
import { logger } from "../../../utils/logger.js"
import type { LatestTagResolution } from "./types.js"

/**
 * `values.yaml`に反映済みのタグが、現在の追跡ブランチ由来ではない箇所があるかを判定する。
 * タグ名には`{branch}`が必ず含まれるため、追跡ブランチを切り替えると反映済みタグは
 * パースできなくなる（`TAG_FORMAT`を変更した場合も同様）。まだ何も反映されていない箇所
 * （`undefined`）は、この後の書き込み自体が失敗するため対象に含めない。
 */
function hasTagFromOtherBranch(
  previousTags: readonly (TagName | undefined)[],
  branch: BranchName,
  tagFormat: TagFormat,
): boolean {
  return previousTags.some(
    (tag) => tag !== undefined && parseTag(tag, branch, tagFormat) === undefined,
  )
}

/**
 * 追跡ブランチ由来の最新タグを判定する。次のいずれかの場合は、このツール自身が追跡ブランチの
 * 最新コミットに対して新しいタグを作成し、それを最新タグとして扱う（dryRun のときは実際の
 * 作成はスキップし、作成予定のタグ名だけを使う）。タグの命名規則は`tagFormat`
 * （`TAG_FORMAT`環境変数由来）に従う。
 *
 * - 追跡ブランチの現在のHEADコミットと一致する既存タグが無い（1件も見つからない場合に加え、
 *   見つかった最新タグが追跡ブランチの進行にビハインドしている場合を含む）
 * - `values.yaml`への反映済みタグが現在の追跡ブランチ由来でない（＝追跡ブランチを切り替えた）。
 *   この場合はHEADと一致する既存タグがあっても、切り替えを明示するため新しいタグを作る
 *
 * あわせて`pointsAtTrackedHead`（values.yamlの現在値が追跡ブランチのHEADを指すタグかの判定）
 * を返す。中身が同じコミットなら、より新しい名前のタグがあっても更新しないため（T-037）。
 */
export async function resolveLatestTag(
  gitlab: GitlabClient,
  app: AppConfig,
  dryRun: boolean,
  tagFormat: TagFormat,
  previousTags: readonly (TagName | undefined)[],
): Promise<LatestTagResolution> {
  const [tags, headSha] = await Promise.all([
    listTags(gitlab, app.projectId),
    getBranchHeadSha(gitlab, app.projectId, app.branchToSync),
  ])
  // 追跡ブランチを切り替えた場合は、現在値が同じコミットを指していても追従先が変わったことを
  // values.yamlに反映したいので、「現在の追跡ブランチ由来のタグであること」も条件に含める
  const pointsAtTrackedHead = (currentValue: string): boolean =>
    headSha !== undefined &&
    parseTag(toTagName(currentValue), app.branchToSync, tagFormat) !== undefined &&
    tags.some((tag) => tag.name === currentValue && tag.commitSha === headSha)

  const existingTag = findLatestParsedTag(
    tags.map((tag) => tag.name),
    app.branchToSync,
    tagFormat,
  )
  const existingTagCommitSha = tags.find((tag) => tag.name === existingTag?.name)?.commitSha
  const branchChanged = hasTagFromOtherBranch(previousTags, app.branchToSync, tagFormat)
  if (!branchChanged && existingTag && existingTagCommitSha === headSha) {
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
    reason: branchChanged ? "tracked_branch_changed" : "no_tag_at_branch_head",
    dryRun,
  })
  return { tag: newTag, pointsAtTrackedHead }
}
