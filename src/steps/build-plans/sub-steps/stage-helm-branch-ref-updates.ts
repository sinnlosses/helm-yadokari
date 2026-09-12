import { getRequiredValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type { AnchorLocation, HelmConfig, HelmBranchRefUpdate } from "../../../types/types.js"
import { toBranchName } from "../../../types/types.js"
import { reduceAsync } from "../../../utils/sequential.js"
import type { StageUpdatesAcc } from "./shared/types.js"
import type { ValuesYamlDraft, ValuesYamlSource } from "./shared/values-yaml-draft.js"
import { readValuesYamlDraft, writeValuesYamlDraft } from "./shared/values-yaml-draft.js"

export type StageHelmBranchRefUpdatesAcc = StageUpdatesAcc<HelmBranchRefUpdate>

/**
 * 1設定ユニットの`helm.locations`（1件以上）を先頭から順に`stageHelmBranchRefUpdate()`へ
 * 渡す。複数箇所を扱うのはこの関数の責務で、呼び出し元（`build-plans.ts`）は
 * 「Helmの向き先ブランチを適用する」という1つの操作として呼ぶだけでよい。
 */
export async function stageHelmBranchRefUpdates(
  source: ValuesYamlSource,
  helm: HelmConfig,
  draft: ValuesYamlDraft,
): Promise<StageHelmBranchRefUpdatesAcc> {
  const initialAcc: StageHelmBranchRefUpdatesAcc = { draft, updates: [] }
  return reduceAsync(helm.locations, initialAcc, (current, location) =>
    stageHelmBranchRefUpdate(source, helm, current, location),
  )
}

/**
 * `helm.locations`のうち1箇所分について、現在の値を読み取り設定値（`branchRef`）と
 * 比較する。差分があれば、書き込み前にそのブランチがchartリポジトリ上に実在するか検証した
 * うえで書き換え内容を下書きに積み、`updates`にも積む（差分が無ければ`updates`に含めない）。
 *
 * 実在確認は`source`のバッチキャッシュ越しに行う。値の読み込み（`readValuesYamlDraft()`）と
 * 同じ`source`を使うので、問い合わせ先を決める情報がこの関数の中で1つに揃う。
 */
async function stageHelmBranchRefUpdate(
  source: ValuesYamlSource,
  helm: HelmConfig,
  acc: StageHelmBranchRefUpdatesAcc,
  location: AnchorLocation,
): Promise<StageHelmBranchRefUpdatesAcc> {
  const { branchRef } = helm
  const { valuesYamlContent, draft } = await readValuesYamlDraft(
    source,
    acc.draft,
    location.valuesPath,
  )
  const currentBranchRaw = getRequiredValueAtAnchor(
    valuesYamlContent,
    location.anchorName,
    location.valuesPath,
  )
  if (currentBranchRaw === branchRef) return { ...acc, draft }

  const { platformCache, chart } = source
  if (!(await platformCache.branchExists(chart.projectId, branchRef))) {
    throw new Error(
      `向き先ブランチ "${branchRef}" がchartリポジトリに見つかりません (valuesPath: ${location.valuesPath}, anchor: ${location.anchorName})`,
    )
  }

  return {
    draft: writeValuesYamlDraft(
      draft,
      location.valuesPath,
      setValueAtAnchor(valuesYamlContent, location.anchorName, branchRef),
    ),
    updates: [
      ...acc.updates,
      {
        location,
        currentBranch: toBranchName(currentBranchRaw),
      },
    ],
  }
}
