import { getValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type {
  AnchorTarget,
  HelmTargetBranchConfig,
  HelmTargetBranchUpdate,
} from "../../../types/types.js"
import { toBranchName } from "../../../types/types.js"
import { reduceAsync } from "../../../utils/sequential.js"
import type { ApplyTargetsAcc, BranchExists, LoadValuesYamlContent } from "./types.js"
import type { ValuesYamlDraft } from "./values-yaml-draft.js"
import { writeValuesYamlDraft } from "./values-yaml-draft.js"

export type ApplyHelmTargetsAcc = ApplyTargetsAcc<HelmTargetBranchUpdate>

/**
 * `helmTargetBranch.targets`のうち1箇所分について、現在の値を読み取り設定値（`branchName`）と
 * 比較する。差分があれば、書き込み前にそのブランチがchartリポジトリ上に実在するか
 * （`branchExists()`）検証したうえで書き換え内容を下書きに積み、`updates`にも積む
 * （差分が無ければ`updates`に含めない）。
 */
async function applyHelmTargetBranchTarget(
  branchExists: BranchExists,
  loadValuesYamlContent: LoadValuesYamlContent,
  helmTargetBranch: HelmTargetBranchConfig,
  acc: ApplyHelmTargetsAcc,
  target: AnchorTarget,
): Promise<ApplyHelmTargetsAcc> {
  const { branchName } = helmTargetBranch
  const draftCopy = new Map(acc.draft)
  const valuesYamlContent = await loadValuesYamlContent(draftCopy, target.valuesPath)
  const previousBranchRaw = getValueAtAnchor(valuesYamlContent, target.anchorName)
  if (previousBranchRaw === branchName) return { ...acc, draft: draftCopy }

  if (!(await branchExists(branchName))) {
    throw new Error(
      `向き先ブランチ "${branchName}" がchartリポジトリに見つかりません (valuesPath: ${target.valuesPath}, anchor: ${target.anchorName})`,
    )
  }

  return {
    draft: writeValuesYamlDraft(
      draftCopy,
      target.valuesPath,
      setValueAtAnchor(valuesYamlContent, target.anchorName, branchName),
    ),
    updates: [
      ...acc.updates,
      {
        target,
        previousBranch:
          previousBranchRaw === undefined ? undefined : toBranchName(previousBranchRaw),
        newBranch: branchName,
      },
    ],
  }
}

/**
 * 1アプリの`helmTargetBranch.targets`（1件以上）を先頭から順に`applyHelmTargetBranchTarget()`へ
 * 渡す。複数箇所を扱うのはこの関数の責務で、呼び出し元（`build-plans.ts`）は
 * 「アプリのHelm向き先ブランチを適用する」という1つの操作として呼ぶだけでよい。
 */
export async function applyHelmTargetBranchTargets(
  branchExists: BranchExists,
  loadValuesYamlContent: LoadValuesYamlContent,
  helmTargetBranch: HelmTargetBranchConfig,
  draft: ValuesYamlDraft,
): Promise<ApplyHelmTargetsAcc> {
  const initialAcc: ApplyHelmTargetsAcc = { draft, updates: [] }
  return reduceAsync(helmTargetBranch.targets, initialAcc, (current, target) =>
    applyHelmTargetBranchTarget(
      branchExists,
      loadValuesYamlContent,
      helmTargetBranch,
      current,
      target,
    ),
  )
}
