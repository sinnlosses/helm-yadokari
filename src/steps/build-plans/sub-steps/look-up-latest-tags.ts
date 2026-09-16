import { buildTagSourceKey } from "../../../domain/tag-source.js"
import type {
  AppConfig,
  AppWithLatestTag,
  LatestTagResolution,
  TagSourceKey,
} from "../../../domain/types.js"
import type { AppOutcome } from "../../shared/step-outcome.js"

/**
 * `resolveTags()`が解決済みの最新タグから、この設定ユニットのappぶんを引き当てる。
 *
 * 解決は設定ユニットをまたいで一意化されているため、
 * 1つのappの失敗はそのappを含むすべての設定ユニットのERRORになる。
 */

export function lookUpLatestTags(
  apps: readonly AppConfig[],
  resolvedTags: ReadonlyMap<TagSourceKey, AppOutcome<LatestTagResolution>>,
): readonly AppWithLatestTag[] {
  return apps.map((app) => {
    const resolved = resolvedTags.get(buildTagSourceKey(app))
    if (resolved === undefined) {
      throw new Error(`アプリ "${app.projectName}" の最新タグが解決されていません`)
    }
    // 値として持ち回ってきた例外をここで投げ直し、ERROR判定と記録を既存の`withHandling()`に任せる
    if (resolved.status === "failed") throw resolved.error
    return { app, latestTag: resolved.value }
  })
}
