import { getValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type { ImageTagTarget, ImageTagUpdate, TagName, ValuesPath } from "../../../types.js"
import { toTagName } from "../../../types.js"
import type { LoadValuesYamlContent } from "./types.js"

export type ApplyTargetsAcc = {
  readonly valuesYamlCache: ReadonlyMap<ValuesPath, string>
  readonly modifiedValuesPaths: ReadonlySet<ValuesPath>
  readonly updates: readonly ImageTagUpdate[]
}

/**
 * `app.chart`のうち1箇所分について、現在の値を読み取り最新タグと比較する。差分が
 * あれば書き換え内容をキャッシュに積み、`updates`にも積む（差分が無ければキャッシュの
 * 更新分だけを引き継ぎ、その箇所は`updates`に含めない）。
 */
async function applyImageTagTarget(
  loadValuesYamlContent: LoadValuesYamlContent,
  latestTagName: TagName,
  acc: ApplyTargetsAcc,
  target: ImageTagTarget,
): Promise<ApplyTargetsAcc> {
  const valuesYamlCache = new Map(acc.valuesYamlCache)
  const valuesYamlContent = await loadValuesYamlContent(valuesYamlCache, target.valuesPath)
  const previousTagRaw = getValueAtAnchor(valuesYamlContent, target.anchor)
  if (previousTagRaw === latestTagName) return { ...acc, valuesYamlCache }

  valuesYamlCache.set(
    target.valuesPath,
    setValueAtAnchor(valuesYamlContent, target.anchor, latestTagName),
  )
  return {
    valuesYamlCache,
    modifiedValuesPaths: new Set(acc.modifiedValuesPaths).add(target.valuesPath),
    updates: [
      ...acc.updates,
      { target, previousTag: previousTagRaw === undefined ? undefined : toTagName(previousTagRaw) },
    ],
  }
}

/**
 * 1アプリの`app.chart`（1件以上）を先頭から順に`applyImageTagTarget()`へ渡す。
 * 複数箇所を扱うのはこの関数の責務で、呼び出し元（`app-update-plan.ts`）は
 * 「アプリのchart全体にイメージタグを適用する」という1つの操作として呼ぶだけでよい。
 */
export async function applyImageTagTargets(
  loadValuesYamlContent: LoadValuesYamlContent,
  latestTagName: TagName,
  acc: ApplyTargetsAcc,
  targets: readonly ImageTagTarget[],
): Promise<ApplyTargetsAcc> {
  return targets.reduce(
    (accPromise, target) =>
      accPromise.then((current) =>
        applyImageTagTarget(loadValuesYamlContent, latestTagName, current, target),
      ),
    Promise.resolve(acc),
  )
}
