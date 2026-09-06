import { getValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type { AnchorTarget, ImageTagUpdate } from "../../../types/types.js"
import { toTagName } from "../../../types/types.js"
import { reduceAsync } from "../../../utils/sequential.js"
import type { ApplyTargetsAcc, LatestTagResolution, LoadValuesYamlContent } from "./shared/types.js"
import type { ValuesYamlDraft } from "./shared/values-yaml-draft.js"
import { writeValuesYamlDraft } from "./shared/values-yaml-draft.js"

export type ApplyImageTagAcc = ApplyTargetsAcc<ImageTagUpdate>

/**
 * `app.imageTagTargets`のうち1箇所分について、下書き上の現在値（反映済みタグ）と最新タグを比較する。
 * 差分があれば書き換え内容を下書きに積み、`updates`にも積む（差分が無ければ読み込んだ
 * values.yamlを下書きに残すだけで`updates`には含めない）。
 *
 * 現在値が「追跡ブランチの現在のHEADを指すタグ」の場合も更新しない。タグ名は
 * 違ってもデプロイされる中身は同じで、更新しても意味が無いMRになるため。
 */
async function applyImageTagTarget(
  loadValuesYamlContent: LoadValuesYamlContent,
  latestTag: LatestTagResolution,
  acc: ApplyImageTagAcc,
  target: AnchorTarget,
): Promise<ApplyImageTagAcc> {
  const latestTagName = latestTag.tag.name
  const { content: valuesYamlContent, draft } = await loadValuesYamlContent(
    acc.draft,
    target.valuesPath,
  )
  const previousTagRaw = getValueAtAnchor(valuesYamlContent, target.anchorName)
  const previousTagName = previousTagRaw === undefined ? undefined : toTagName(previousTagRaw)

  if (previousTagName === latestTagName) return { ...acc, draft }
  if (previousTagName !== undefined && latestTag.trackedHeadTagNames.has(previousTagName)) {
    return { ...acc, draft }
  }

  return {
    draft: writeValuesYamlDraft(
      draft,
      target.valuesPath,
      setValueAtAnchor(valuesYamlContent, target.anchorName, latestTagName),
    ),
    updates: [...acc.updates, { target, previousTagName }],
  }
}

/**
 * 1アプリの`app.imageTagTargets`（1件以上）を先頭から順に`applyImageTagTarget()`へ渡す。
 * 複数箇所を扱うのはこの関数の責務で、呼び出し元（`build-plans.ts`）は
 * 「アプリの全書き込み先にイメージタグを適用する」という1つの操作として呼ぶだけでよい。
 */
export async function applyImageTagTargets(
  loadValuesYamlContent: LoadValuesYamlContent,
  latestTag: LatestTagResolution,
  draft: ValuesYamlDraft,
  targets: readonly AnchorTarget[],
): Promise<ApplyImageTagAcc> {
  const initialAcc: ApplyImageTagAcc = { draft, updates: [] }
  return reduceAsync(targets, initialAcc, (current, target) =>
    applyImageTagTarget(loadValuesYamlContent, latestTag, current, target),
  )
}
