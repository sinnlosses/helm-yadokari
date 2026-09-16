import { buildTagSourceKey } from "../../domain/tag-source.js"
import type {
  AppConfig,
  ConfigUnit,
  LatestTagResolution,
  TagSource,
  TagSourceKey,
} from "../../domain/types.js"
import type { PlatformAdapter } from "../../lib/platform/adapter.js"
import { mapWithConcurrency } from "../../utils/parallel.js"
import { type AppOutcome, settleApp } from "../shared/step-outcome.js"
import { resolveLatestTag } from "./sub-steps/resolve-latest-tag.js"

/**
 * 全設定ユニットのappを解決単位（`TagSource`）へ一意化し、単位ごとに1回だけ解決する。
 *
 * このstepはappの失敗も`AppOutcome`として返すだけで、設定ユニット単位の結果（`settled`）は
 * 持たない。どの設定ユニットのERRORにするかは受け取った側が決める。
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
): Promise<ReadonlyMap<TagSourceKey, AppOutcome<LatestTagResolution>>> {
  const resolved = await mapWithConcurrency(
    groupByTagSource(targets),
    concurrencyLimit,
    async (source): Promise<readonly [TagSourceKey, AppOutcome<LatestTagResolution>]> => [
      buildTagSourceKey(source),
      await settleApp(adapter, source.projectName, () => resolveLatestTag(adapter, source, dryRun)),
    ],
  )
  return new Map(resolved)
}

/**
 * 全設定ユニットのappを`TagSource`ごとに一意化する。同じ解決単位のappは1件にまとまるため、
 * 返す件数がそのまま解決の回数になる。
 */
function groupByTagSource(targets: readonly ConfigUnit[]): readonly TagSource[] {
  const sources = new Map<TagSourceKey, TagSource>(
    targets
      .flatMap((configUnit) => configUnit.apps)
      .map((app) => [buildTagSourceKey(app), toTagSource(app)]),
  )
  return [...sources.values()]
}

function toTagSource(app: AppConfig): TagSource {
  return {
    projectId: app.projectId,
    projectName: app.projectName,
    branchToSync: app.branchToSync,
    tagFormat: app.tagFormat,
  }
}
