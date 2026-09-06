import {
  type GitlabClient,
  createTag,
  getBranchHeadSha,
  listTags,
} from "../../../lib/gitlab/gitlab.js"
import { buildNewTag, findLatestParsedTag, parseTag } from "../../../lib/gitlab/tag.js"
import type { AppConfig, BranchName, TagFormat, TagInfo, TagName } from "../../../types/types.js"
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
 * 「現在の追跡ブランチ由来（＝`branch`と`tagFormat`でパースできる）で、かつ`headSha`と
 * 同じコミットを指すタグ名」の集合を組み立てる（T-049でクロージャからデータに置き換えた）。
 * 追跡ブランチを切り替えた場合、切り替え前のタグ名は現在の`branch`ではパースできないため
 * この集合には含まれない。結果として、HEADと同じコミットを指していても更新をスキップしない
 * （T-043）。`headSha`が`undefined`（＝ブランチ自体が存在しない）のときは常に空集合になる。
 */
function resolveTrackedHeadTagNames(
  tags: readonly TagInfo[],
  headSha: string | undefined,
  branch: BranchName,
  tagFormat: TagFormat,
): ReadonlySet<TagName> {
  return new Set(
    tags
      .filter(
        (tag) => tag.commitSha === headSha && parseTag(tag.name, branch, tagFormat) !== undefined,
      )
      .map((tag) => tag.name),
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
 * あわせて`trackedHeadTagNames`（values.yamlの現在値が追跡ブランチのHEADを指すタグかどうかの
 * 判定に使う集合）を返す。現在値がこの集合に含まれるなら、より新しい名前のタグがあっても
 * 更新しないため（T-037）。
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
  const trackedHeadTagNames = resolveTrackedHeadTagNames(tags, headSha, app.branchToSync, tagFormat)

  const existingTag = findLatestParsedTag(
    tags.map((tag) => tag.name),
    app.branchToSync,
    tagFormat,
  )
  const existingTagCommitSha = tags.find((tag) => tag.name === existingTag?.name)?.commitSha
  const branchChanged = hasTagFromOtherBranch(previousTags, app.branchToSync, tagFormat)
  if (!branchChanged && existingTag && existingTagCommitSha === headSha) {
    return { tag: existingTag, trackedHeadTagNames }
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
  return { tag: newTag, trackedHeadTagNames }
}
