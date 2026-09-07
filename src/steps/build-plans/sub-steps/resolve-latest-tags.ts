import { buildNewTag, findLatestParsedTag, parseTag } from "../../../domain/tag-format.js"
import {
  type GitlabClient,
  createTag,
  getBranchHeadSha,
  listTags,
} from "../../../lib/gitlab/gitlab.js"
import type {
  AppConfig,
  BranchName,
  CommitSha,
  TagFormat,
  TagInfo,
  TagName,
} from "../../../types/types.js"
import { logger } from "../../../utils/logger.js"
import { reduceAsync } from "../../../utils/sequential.js"
import { withAppContext } from "../../shared/step-outcome.js"
import type { AppWithLatestTag, LatestTagResolution } from "./shared/types.js"

/**
 * 1つのchartAndApps配下の全アプリについて、追跡ブランチ由来の最新タグを解決する。アプリを
 * 1つずつ順に処理するのはこの関数の責務で、呼び出し元（`build-plans.ts`）は「このclientの
 * 全アプリの最新タグを決める」という1つの操作として呼ぶだけでよい。
 *
 * 解決結果はアプリと対（`AppWithLatestTag`）にして返す。後段の差分判定
 * （`stage-image-tag-updates.ts`）がどのタグがどのアプリのものかを引き当て直さずに済むため。
 *
 * タグ作成という副作用を持つため、アプリ間で順序が入れ替わらないよう並列化しない。
 */
export async function resolveLatestTags(
  gitlab: GitlabClient,
  apps: readonly AppConfig[],
  dryRun: boolean,
  tagFormat: TagFormat,
): Promise<readonly AppWithLatestTag[]> {
  const initial: readonly AppWithLatestTag[] = []
  return reduceAsync(apps, initial, async (acc, app) => [
    ...acc,
    {
      app,
      latestTag: await withAppContext(app.projectName, () =>
        resolveLatestTag(gitlab, app, dryRun, tagFormat),
      ),
    },
  ])
}

/**
 * 1アプリ分の、追跡ブランチ由来の最新タグを判定する。追跡ブランチの現在のHEADコミットを指すタグが
 * 1件も無い場合は、このツール自身がHEADコミットに新しいタグを作成し、それを最新タグとして
 * 扱う（dryRun のときは実際の作成はスキップし、作成予定のタグ名だけを使う）。タグの命名規則は
 * `tagFormat`（`TAG_FORMAT`環境変数由来）に従う。
 *
 * このツールの目的は「追跡ブランチの最新コミットの中身をデプロイさせること」なので、
 * 「タグ名が最も新しいものを選んでからHEADと比較する」のではなく、**HEADを指すタグを
 * 直接探す**。こうすることで、HEADに既にタグが付いているのに、別の（古い）コミットを
 * 指すより新しい名前のタグがあるせいで無駄な新規タグを作ってしまう問題を避けられる。
 *
 * 追跡ブランチを切り替えた場合も特別扱いはしない。切り替え先のHEADにタグがあればそれを
 * 再利用する。タグ名には`{branch}`が必ず含まれるため、そのタグを`values.yaml`に書けば
 * 追跡先が変わったことは名前から読み取れる。「切り替えを明示するため」だけに新しいタグを
 * 作る必要はない。
 *
 * あわせて`trackedHeadTagNames`（values.yamlの現在値が追跡ブランチのHEADを指すタグかどうかの
 * 判定に使う集合）を返す。現在値がこの集合に含まれるなら、より新しい名前のタグがあっても
 * 更新しないため。切り替え前のタグ名は現在の`branch`ではパースできずこの集合に入らないので、
 * 切り替え時は同じコミットを指していても更新される（判定は`stage-image-tag-updates.ts`側）。
 */
async function resolveLatestTag(
  gitlab: GitlabClient,
  app: AppConfig,
  dryRun: boolean,
  tagFormat: TagFormat,
): Promise<LatestTagResolution> {
  const [tags, headSha] = await Promise.all([
    listTags(gitlab, app.projectId),
    getBranchHeadSha(gitlab, app.projectId, app.branchToSync),
  ])
  if (headSha === undefined) {
    throw new Error(
      `追跡ブランチ "${app.branchToSync}" がプロジェクト "${app.projectName}" に見つかりません`,
    )
  }
  const trackedHeadTagNames = resolveTrackedHeadTagNames(tags, headSha, app.branchToSync, tagFormat)

  if (trackedHeadTagNames.size > 0) {
    // HEADを指すタグはどれも同じコミットを指すため中身は同じだが、返す値を一意に決める
    // ためだけに、タグ名から読み取った日時が最も新しいものを選ぶ（決定性のための規則）。
    const latestAtHead = findLatestParsedTag([...trackedHeadTagNames], app.branchToSync, tagFormat)
    if (latestAtHead) {
      return { tag: latestAtHead, trackedHeadTagNames }
    }
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
    reason: "no_tag_at_branch_head",
    dryRun,
  })
  return { tag: newTag, trackedHeadTagNames }
}

/**
 * 「現在の追跡ブランチ由来（＝`branch`と`tagFormat`でパースできる）で、かつ`headSha`と
 * 同じコミットを指すタグ名」の集合を組み立てる。
 * 追跡ブランチを切り替えた場合、切り替え前のタグ名は現在の`branch`ではパースできないため
 * この集合には含まれない。結果として、HEADと同じコミットを指していても更新をスキップしない。
 */
function resolveTrackedHeadTagNames(
  tags: readonly TagInfo[],
  headSha: CommitSha,
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
