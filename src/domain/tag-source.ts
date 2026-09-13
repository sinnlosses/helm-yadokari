import type { TagSource, TagSourceKey } from "./types.js"
import { toTagSourceKey } from "./types.js"

/**
 * `TagSource`の同一性を表す値キーを組み立てる。同じ解決単位（`projectId`+`branchToSync`+
 * `tagFormat`がすべて一致）なら同じキーになるため、複数の設定ユニットにまたがるappの重複排除に使える。
 *
 * `tagFormat`まで含めるのは、`projectId`ごとの`tagFormat`一致は`validateTagFormatConsistency()`が
 * 保証しており通常は`projectId`+`branchToSync`だけで一意になるが、その保証が将来外れたときに
 * 「実行順でどちらの形式のタグになるか決まる」という壊れ方ではなく「同じappにタグが2つできる」
 * という壊れ方にするため。`projectName`は`projectId`と1:1のラベルなのでキーに入れない。
 *
 * 区切りにヌル文字を使う理由は`utils/cache.ts`の`toCacheKey()`と同じ（通常の文字列引数に
 * ほぼ現れない制御文字であり、区切りが値の中に現れて別の組み合わせと同じキーになることを防ぐ）。
 */
export function buildTagSourceKey(source: TagSource): TagSourceKey {
  return toTagSourceKey([source.projectId, source.branchToSync, source.tagFormat].join("\0"))
}
