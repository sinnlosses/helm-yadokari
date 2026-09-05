import { getValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type { ImageTagTarget, ImageTagUpdate } from "../../../types.js"
import { toTagName } from "../../../types.js"
import { reduceAsync } from "../../../utils/sequential.js"
import type { ApplyTargetsAcc, LatestTagResolution, LoadValuesYamlContent } from "./types.js"

export type ApplyImageTagAcc = ApplyTargetsAcc<ImageTagUpdate>

/**
 * `app.chart`のうち1箇所分について、現在の値を読み取り最新タグと比較する。差分が
 * あれば書き換え内容をキャッシュに積み、`updates`にも積む（差分が無ければキャッシュの
 * 更新分だけを引き継ぎ、その箇所は`updates`に含めない）。
 *
 * 現在値が「追跡ブランチの現在のHEADを指すタグ」の場合も更新しない（T-037）。タグ名は
 * 違ってもデプロイされる中身は同じで、更新しても意味が無いMRになるため。
 */
async function applyImageTagTarget(
  loadValuesYamlContent: LoadValuesYamlContent,
  latestTag: LatestTagResolution,
  acc: ApplyImageTagAcc,
  target: ImageTagTarget,
): Promise<ApplyImageTagAcc> {
  const latestTagName = latestTag.tag.name
  const valuesYamlCache = new Map(acc.valuesYamlCache)
  const valuesYamlContent = await loadValuesYamlContent(valuesYamlCache, target.valuesPath)
  const previousTagRaw = getValueAtAnchor(valuesYamlContent, target.anchor)
  if (previousTagRaw === latestTagName) return { ...acc, valuesYamlCache }
  if (previousTagRaw !== undefined && latestTag.pointsAtTrackedHead(previousTagRaw)) {
    return { ...acc, valuesYamlCache }
  }

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
 * 複数箇所を扱うのはこの関数の責務で、呼び出し元（`build-plans.ts`）は
 * 「アプリのchart全体にイメージタグを適用する」という1つの操作として呼ぶだけでよい。
 */
export async function applyImageTagTargets(
  loadValuesYamlContent: LoadValuesYamlContent,
  latestTag: LatestTagResolution,
  acc: ApplyImageTagAcc,
  targets: readonly ImageTagTarget[],
): Promise<ApplyImageTagAcc> {
  return reduceAsync(targets, acc, (current, target) =>
    applyImageTagTarget(loadValuesYamlContent, latestTag, current, target),
  )
}
