import { getValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type { AnchorTarget, ImageTagUpdate, TagName } from "../../../types.js"
import { toTagName } from "../../../types.js"
import { reduceAsync } from "../../../utils/sequential.js"
import type { ApplyTargetsAcc, LatestTagResolution, LoadValuesYamlContent } from "./types.js"
import type { ValuesYamlDraft } from "./values-yaml-draft.js"
import { writeValuesYamlDraft } from "./values-yaml-draft.js"

export type ApplyImageTagAcc = ApplyTargetsAcc<ImageTagUpdate>

export type CurrentImageTags = {
  readonly draft: ValuesYamlDraft
  /** `targets`と同じ並び。該当アンカーが無い箇所は`undefined`（＝反映済みタグ無し） */
  readonly previousTags: readonly (TagName | undefined)[]
}

/**
 * `app.chart`の各箇所に現在反映されているタグを読み取る。書き換えはせず、`resolveLatestTag()`が
 * 「反映済みタグが今の追跡ブランチ由来か」を判定するための入力を作るのが目的。読み込んだ
 * values.yamlは下書きに載せて返すので、後続の`applyImageTagTargets()`が再取得することはない。
 *
 * ここで返す`previousTags`は`applyImageTagTargets()`にもそのまま渡し、同じアンカーを
 * `getValueAtAnchor()`で二重に読むのを避ける（T-048）。この使い回しは、1つのclient内で
 * 同じ`valuesPath`+`anchor`が複数回書き込み先にならないことが`loadConfig()`時点で保証されて
 * いる（`config/validate.ts`の`validateNoDuplicateTargets()`、T-032）前提の上に成り立つ。
 * この前提が崩れて`app.chart`内に同じアンカーが2回以上現れると、後続のtargetは
 * 「直前のtargetが書き換えた後の値」ではなくここで読んだ書き換え前の値を`previousTag`として
 * 使ってしまい、実際には1箇所しか変わっていないのに2件のupdatesが記録される
 * （回帰テスト: `test/steps/sub-steps/build-plans/image-tag-target.test.ts`）。
 */
export async function readCurrentImageTags(
  loadValuesYamlContent: LoadValuesYamlContent,
  draft: ValuesYamlDraft,
  targets: readonly AnchorTarget[],
): Promise<CurrentImageTags> {
  const draftCopy = new Map(draft)
  const previousTags = await reduceAsync<AnchorTarget, readonly (TagName | undefined)[]>(
    targets,
    [],
    async (tags, target) => {
      const valuesYamlContent = await loadValuesYamlContent(draftCopy, target.valuesPath)
      const previousTagRaw = getValueAtAnchor(valuesYamlContent, target.anchor)
      return [...tags, previousTagRaw === undefined ? undefined : toTagName(previousTagRaw)]
    },
  )
  return { draft: draftCopy, previousTags }
}

/**
 * `app.chart`のうち1箇所分について、`previousTag`（`readCurrentImageTags()`が読んだ
 * 反映済みタグ）と最新タグを比較する。差分があれば書き換え内容を下書きに積み、
 * `updates`にも積む（差分が無ければ`acc`をそのまま返し、values.yamlの再読み込みもしない）。
 *
 * `previousTag`は呼び出し時点で読み取り済みの値であり、ここで`getValueAtAnchor()`を
 * 呼び直すことはしない（T-048、前提は`readCurrentImageTags()`のJSDoc参照）。
 *
 * 現在値が「追跡ブランチの現在のHEADを指すタグ」の場合も更新しない（T-037）。タグ名は
 * 違ってもデプロイされる中身は同じで、更新しても意味が無いMRになるため。
 */
async function applyImageTagTarget(
  loadValuesYamlContent: LoadValuesYamlContent,
  latestTag: LatestTagResolution,
  acc: ApplyImageTagAcc,
  target: AnchorTarget,
  previousTag: TagName | undefined,
): Promise<ApplyImageTagAcc> {
  const latestTagName = latestTag.tag.name
  if (previousTag === latestTagName) return acc
  if (previousTag !== undefined && latestTag.trackedHeadTagNames.has(previousTag)) {
    return acc
  }

  const draftCopy = new Map(acc.draft)
  const valuesYamlContent = await loadValuesYamlContent(draftCopy, target.valuesPath)
  return {
    draft: writeValuesYamlDraft(
      draftCopy,
      target.valuesPath,
      setValueAtAnchor(valuesYamlContent, target.anchor, latestTagName),
    ),
    updates: [...acc.updates, { target, previousTag }],
  }
}

/**
 * 1アプリの`app.chart`（1件以上）を先頭から順に`applyImageTagTarget()`へ渡す。
 * 複数箇所を扱うのはこの関数の責務で、呼び出し元（`build-plans.ts`）は
 * 「アプリのchart全体にイメージタグを適用する」という1つの操作として呼ぶだけでよい。
 *
 * `previousTags`は`readCurrentImageTags()`が返したものを`targets`と同じ並びでそのまま渡す
 * （T-048）。
 */
export async function applyImageTagTargets(
  loadValuesYamlContent: LoadValuesYamlContent,
  latestTag: LatestTagResolution,
  draft: ValuesYamlDraft,
  targets: readonly AnchorTarget[],
  previousTags: readonly (TagName | undefined)[],
): Promise<ApplyImageTagAcc> {
  const targetsWithPreviousTag = targets.map((target, index) => ({
    target,
    previousTag: previousTags[index],
  }))
  const initialAcc: ApplyImageTagAcc = { draft, updates: [] }
  return reduceAsync(targetsWithPreviousTag, initialAcc, (current, { target, previousTag }) =>
    applyImageTagTarget(loadValuesYamlContent, latestTag, current, target, previousTag),
  )
}
