import type { AppConfig, ConfigUnit, LatestTagResolution, TagSource } from "../../domain/types.js"
import type { PlatformAdapter } from "../../lib/platform/adapter.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { type AppOutcome, settleApp } from "../shared/step-outcome.js"
import { resolveLatestTag } from "./sub-steps/resolve-latest-tag.js"

/** 1つの`TagSource`と、それを共有するapp。`targets`をソース軸に束ね直した1件分 */
type TagSourceGroup = {
  readonly source: TagSource
  readonly apps: readonly AppConfig[]
}

/**
 * 全設定ユニットのappを最新タグの解決単位（`TagSource`）へ一意化し、単位ごとに1回だけ解決する。
 * 解決結果は`targets`のappのオブジェクト参照から引ける形で返し、どの設定ユニットのERRORに
 * するかは受け取った側（`buildPlans()`）が決める。このstepはappの失敗も`AppOutcome`として
 * 返すだけで、設定ユニット単位の結果（`settled`）を持たない。
 *
 * **一意化はこのstepの効率化ではなく正しさのためにある。** 同じappは複数の設定ユニットに
 * 登録されうるが、解決は「HEADを指すタグが無ければ作る」という**書き込み**を含むため、
 * 設定ユニットごとに解決すると同じコミットに冗長なタグが並ぶ（タグ名は秒精度なので、
 * 同名になれば2件目以降が失敗し、秒をまたげば設定ユニットごとに違うタグ名がvalues.yamlに
 * 書かれる）。ソース軸と設定ユニット軸の交差をstepの境界に出すことで、この重複排除が
 * バッチ寿命のキャッシュではなく集合演算になっている。
 *
 * `concurrencyLimit`は他のstepと同じ値を使うが、このstepだけは適用単位が設定ユニットではなく
 * 一意化した解決単位になる。
 */
export async function resolveTags(
  adapter: PlatformAdapter,
  targets: readonly ConfigUnit[],
  concurrencyLimit: number,
  dryRun: boolean,
): Promise<ReadonlyMap<AppConfig, AppOutcome<LatestTagResolution>>> {
  const resolved = await mapWithConcurrency(
    groupByTagSource(targets),
    concurrencyLimit,
    async ({ source, apps }) => ({
      apps,
      outcome: await settleApp(adapter, source.projectName, () =>
        resolveLatestTag(adapter, source, dryRun),
      ),
    }),
  )
  return new Map(
    resolved.flatMap(({ apps, outcome }) =>
      apps.map((app): readonly [AppConfig, AppOutcome<LatestTagResolution>] => [app, outcome]),
    ),
  )
}

/**
 * 全設定ユニットのappを`TagSource`ごとに束ねる。同じ解決単位のappは1つのグループに入るため、
 * グループの数がそのまま解決の回数になる。
 *
 * キーの区切りにヌル文字を使う理由は`utils/cache.ts`の`toCacheKey()`と同じ。`projectName`は
 * `projectId`と1:1のラベルなのでキーに入れない。`tagFormat`まで含めるのは、`projectId`ごとの
 * `tagFormat`一致は`validateTagFormatConsistency()`が保証しており通常は`projectId`+
 * `branchToSync`だけで一意になるが、その保証が将来外れたときに「実行順でどちらの形式のタグに
 * なるか決まる」という壊れ方ではなく「同じappにタグが2つできる」という壊れ方にするため。
 */
function groupByTagSource(targets: readonly ConfigUnit[]): readonly TagSourceGroup[] {
  const groups = new Map<string, TagSourceGroup>()
  for (const app of targets.flatMap((configUnit) => configUnit.apps)) {
    const key = [app.projectId, app.branchToSync, app.tagFormat].join("\0")
    const group = groups.get(key)
    groups.set(
      key,
      group === undefined
        ? { source: toTagSource(app), apps: [app] }
        : { ...group, apps: [...group.apps, app] },
    )
  }
  return [...groups.values()]
}

function toTagSource(app: AppConfig): TagSource {
  return {
    projectId: app.projectId,
    projectName: app.projectName,
    branchToSync: app.branchToSync,
    tagFormat: app.tagFormat,
  }
}
