import { getValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type { ImageTagTarget, ImageTagUpdate, TagName, ValuesPath } from "../../../types.js"
import { toTagName } from "../../../types.js"
import { reduceAsync } from "../../../utils/sequential.js"
import type { ApplyTargetsAcc, LatestTagResolution, LoadValuesYamlContent } from "./types.js"

export type ApplyImageTagAcc = ApplyTargetsAcc<ImageTagUpdate>

export type CurrentImageTags = {
  readonly valuesYamlCache: ReadonlyMap<ValuesPath, string>
  /** `targets`と同じ並び。該当アンカーが無い箇所は`undefined`（＝反映済みタグ無し） */
  readonly previousTags: readonly (TagName | undefined)[]
}

/**
 * `app.chart`の各箇所に現在反映されているタグを読み取る。書き換えはせず、`resolveLatestTag()`が
 * 「反映済みタグが今の追跡ブランチ由来か」を判定するための入力を作るのが目的。読み込んだ
 * values.yamlは`valuesYamlCache`に載せて返すので、後続の`applyImageTagTargets()`が再取得することはない。
 */
export async function readCurrentImageTags(
  loadValuesYamlContent: LoadValuesYamlContent,
  cache: ReadonlyMap<ValuesPath, string>,
  targets: readonly ImageTagTarget[],
): Promise<CurrentImageTags> {
  const valuesYamlCache = new Map(cache)
  const previousTags = await reduceAsync<ImageTagTarget, readonly (TagName | undefined)[]>(
    targets,
    [],
    async (tags, target) => {
      const valuesYamlContent = await loadValuesYamlContent(valuesYamlCache, target.valuesPath)
      const previousTagRaw = getValueAtAnchor(valuesYamlContent, target.anchor)
      return [...tags, previousTagRaw === undefined ? undefined : toTagName(previousTagRaw)]
    },
  )
  return { valuesYamlCache, previousTags }
}

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
