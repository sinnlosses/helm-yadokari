import { buildNewTag, findLatestParsedTag, parseTag } from "../../../domain/tag-format.js"
import type {
  CommitSha,
  LatestTagResolution,
  TagInfo,
  TagName,
  TagSource,
} from "../../../domain/types.js"
import type { PlatformAdapter } from "../../../lib/platform/adapter.js"
import { logger } from "../../../utils/logger.js"

/**
 * `source`分の、追跡ブランチ由来の最新タグを判定する。
 *
 * タグ形式は`source.tagFormat`（`registry.yaml`の`appSpecs[].tagFormat`由来）に従う。
 *
 * このツールの目的は「追跡ブランチの最新コミットの中身をデプロイさせること」なので、
 * 「タグ名が最も新しいものを選んでからHEADと比較する」のではなく、**HEADを指すタグを直接探す**。
 * こうすることで、HEADに既にタグが付いているのに、別の（古い）
 * コミットを指すより新しい名前のタグがあるせいで無駄な新規タグを作ってしまう問題を避けられる。
 *
 * 追跡ブランチを切り替えた場合も特別扱いはしない。切り替え先のHEADにタグがあればそれを再利用する。
 * タグ名には`{branch}`が必ず含まれるため、そのタグを`values.yaml`に書けば追跡先が変わったことは名前
 * から読み取れる。「切り替えを明示するため」だけに新しいタグを作る必要はない。
 *
 * あわせて`trackedHeadTagNames`を返す（意味は`LatestTagResolution`のJSDoc参照）。
 */

export async function resolveLatestTag(
  adapter: PlatformAdapter,
  source: TagSource,
  dryRun: boolean,
): Promise<LatestTagResolution> {
  const [tags, headSha] = await Promise.all([
    adapter.listTags(source.projectId),
    adapter.getBranchHeadSha(source.projectId, source.branchToSync),
  ])
  if (headSha === undefined) {
    throw new Error(
      `追跡ブランチ "${source.branchToSync}" がプロジェクト "${source.projectName}" に見つかりません`,
    )
  }
  const trackedHeadTagNames = resolveTrackedHeadTagNames(tags, headSha, source)

  // HEADを指すタグはどれも同じコミットを指すため中身は同じだが、返す値を一意に決める
  // ためだけに、打刻日時が最も新しいものを選ぶ（決定性のための規則）。
  const latestAtHead = findLatestParsedTag(
    [...trackedHeadTagNames],
    source.branchToSync,
    source.tagFormat,
  )
  if (latestAtHead) {
    return { tag: latestAtHead, trackedHeadTagNames, origin: "existing" }
  }

  const newTag = buildNewTag(source.branchToSync, new Date(), source.tagFormat)
  if (!dryRun) {
    await adapter.createTag(source.projectId, newTag.name, source.branchToSync)
  }
  logger.info({
    event: "create_tag",
    projectName: source.projectName,
    branch: source.branchToSync,
    tag: newTag.name,
    reason: "no_tag_at_branch_head",
    dryRun,
  })
  return { tag: newTag, trackedHeadTagNames, origin: "created" }
}

/**
 * `headSha`と同じコミットを指す、現在の追跡ブランチ由来のタグ名の集合を組み立てる。
 *
 * 「現在の追跡ブランチ由来」は`source.branchToSync`と`source.tagFormat`でパースできること。
 * 追跡ブランチを切り替えた場合、切り替え前のタグ名は現在の`source.branchToSync`ではパースできないた
 * めこの集合には含まれない。結果として、HEADと同じコミットを指していても更新をスキップしない。
 */
function resolveTrackedHeadTagNames(
  tags: readonly TagInfo[],
  headSha: CommitSha,
  source: TagSource,
): ReadonlySet<TagName> {
  return new Set(
    tags
      .filter(
        (tag) =>
          tag.commitSha === headSha &&
          parseTag(tag.name, source.branchToSync, source.tagFormat) !== undefined,
      )
      .map((tag) => tag.name),
  )
}
