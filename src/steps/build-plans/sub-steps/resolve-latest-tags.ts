import { buildNewTag, findLatestParsedTag, parseTag } from "../../../domain/tag-format.js"
import type { Platform } from "../../../lib/platform/platform.js"
import type {
  AppConfig,
  BranchName,
  CommitSha,
  TagFormat,
  TagInfo,
  TagName,
} from "../../../types/types.js"
import { getOrFetchShared } from "../../../utils/cache.js"
import { logger } from "../../../utils/logger.js"
import { reduceAsync } from "../../../utils/sequential.js"
import { withAppContext } from "../../shared/step-outcome.js"
import type { AppWithLatestTag, LatestTagResolution } from "./shared/types.js"

/** 1つの設定ユニット配下の全アプリぶんの最新タグを解決する関数。バッチ全体で使い回す */
export type ResolveLatestTags = (apps: readonly AppConfig[]) => Promise<readonly AppWithLatestTag[]>

/**
 * 最新タグの解決を組み立てる。返す関数は、1つの設定ユニット配下の全アプリについて追跡ブランチ
 * 由来の最新タグを解決する。アプリを1つずつ順に処理するのはこの関数の責務で、呼び出し元
 * （`build-plans.ts`）は「この設定ユニットの全アプリの最新タグを決める」という1つの操作として
 * 呼ぶだけでよい。解決結果はアプリと対（`AppWithLatestTag`）にして返すため、後段の差分判定
 * （`stage-image-tag-updates.ts`）はどのタグがどのアプリのものかを引き当て直さずに済む。
 *
 * 解決結果をprojectId+追跡ブランチ単位でバッチ全体を通してキャッシュするのは、**同じappが
 * 複数の設定ユニットに登録されうる**ため。キャッシュが無いと同じappの解決が設定ユニットの数だけ走り、
 * HEADを指すタグが無いときはタグ作成もその回数だけ実行される（タグ名は秒精度なので、同名に
 * なれば2件目以降が失敗し、秒をまたげば同じコミットに冗長なタグが並んで設定ユニットごとに違う
 * タグ名がvalues.yamlに書かれる）。`mapWithConcurrency`により設定ユニットは並列実行される
 * ため、同時に来た同じキーの問い合わせも1回にまとめる`getOrFetchShared`を使う。
 *
 * キャッシュの寿命はこの関数が返すクロージャと同じで、バッチごとに`buildPlans()`が1つ作る。
 */
export function createResolveLatestTags(platform: Platform, dryRun: boolean): ResolveLatestTags {
  const cache = new Map<string, Promise<LatestTagResolution>>()
  return (apps) => {
    const initial: readonly AppWithLatestTag[] = []
    return reduceAsync(apps, initial, async (acc, app) => [
      ...acc,
      {
        app,
        latestTag: await withAppContext(app.projectName, () =>
          getOrFetchShared(cache, `${app.projectId}:${app.branchToSync}`, () =>
            resolveLatestTag(platform, app, dryRun),
          ),
        ),
      },
    ])
  }
}

/**
 * 1アプリ分の、追跡ブランチ由来の最新タグを判定する。タグ形式は`app.tagFormat`
 * （`registry.yaml`の`appSpecs[].tagFormat`由来）に従う。
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
 * あわせて`trackedHeadTagNames`を返す（意味は`LatestTagResolution`のJSDoc参照）。
 */
async function resolveLatestTag(
  platform: Platform,
  app: AppConfig,
  dryRun: boolean,
): Promise<LatestTagResolution> {
  const [tags, headSha] = await Promise.all([
    platform.listTags(app.projectId),
    platform.getBranchHeadSha(app.projectId, app.branchToSync),
  ])
  if (headSha === undefined) {
    throw new Error(
      `追跡ブランチ "${app.branchToSync}" がプロジェクト "${app.projectName}" に見つかりません`,
    )
  }
  const trackedHeadTagNames = resolveTrackedHeadTagNames(
    tags,
    headSha,
    app.branchToSync,
    app.tagFormat,
  )

  // HEADを指すタグはどれも同じコミットを指すため中身は同じだが、返す値を一意に決める
  // ためだけに、打刻日時が最も新しいものを選ぶ（決定性のための規則）。
  const latestAtHead = findLatestParsedTag(
    [...trackedHeadTagNames],
    app.branchToSync,
    app.tagFormat,
  )
  if (latestAtHead) {
    return { tag: latestAtHead, trackedHeadTagNames }
  }

  const newTag = buildNewTag(app.branchToSync, new Date(), app.tagFormat)
  if (!dryRun) {
    await platform.createTag(app.projectId, newTag.name, app.branchToSync)
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
 * 「現在の追跡ブランチ由来（＝`branch`と`format`でパースできる）で、かつ`headSha`と同じ
 * コミットを指すタグ名」の集合を組み立てる。追跡ブランチを切り替えた場合、切り替え前の
 * タグ名は現在の`branch`ではパースできないためこの集合には含まれない。結果として、HEADと
 * 同じコミットを指していても更新をスキップしない。
 */
function resolveTrackedHeadTagNames(
  tags: readonly TagInfo[],
  headSha: CommitSha,
  branch: BranchName,
  format: TagFormat,
): ReadonlySet<TagName> {
  return new Set(
    tags
      .filter(
        (tag) => tag.commitSha === headSha && parseTag(tag.name, branch, format) !== undefined,
      )
      .map((tag) => tag.name),
  )
}
