import { getValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type {
  AnchorTarget,
  HelmTargetBranchConfig,
  HelmTargetBranchUpdate,
} from "../../../types/types.js"
import { toBranchName } from "../../../types/types.js"
import { reduceAsync } from "../../../utils/sequential.js"
import type { StageUpdatesAcc, BranchExists, ReadDraftValuesYaml } from "./shared/types.js"
import type { ValuesYamlDraft } from "./shared/values-yaml-draft.js"
import { writeValuesYamlDraft } from "./shared/values-yaml-draft.js"

export type StageHelmTargetBranchUpdatesAcc = StageUpdatesAcc<HelmTargetBranchUpdate>

/**
 * 1アプリの`helmTargetBranch.targets`（1件以上）を先頭から順に`stageHelmTargetBranchUpdate()`へ
 * 渡す。複数箇所を扱うのはこの関数の責務で、呼び出し元（`build-plans.ts`）は
 * 「アプリのHelm向き先ブランチを適用する」という1つの操作として呼ぶだけでよい。
 */
export async function stageHelmTargetBranchUpdates(
  branchExists: BranchExists,
  readDraftValuesYaml: ReadDraftValuesYaml,
  helmTargetBranch: HelmTargetBranchConfig,
  draft: ValuesYamlDraft,
): Promise<StageHelmTargetBranchUpdatesAcc> {
  const initialAcc: StageHelmTargetBranchUpdatesAcc = { draft, updates: [] }
  return reduceAsync(helmTargetBranch.targets, initialAcc, (current, target) =>
    stageHelmTargetBranchUpdate(
      branchExists,
      readDraftValuesYaml,
      helmTargetBranch,
      current,
      target,
    ),
  )
}

/**
 * `helmTargetBranch.targets`のうち1箇所分について、現在の値を読み取り設定値（`branchName`）と
 * 比較する。差分があれば、書き込み前にそのブランチがchartリポジトリ上に実在するか
 * （`branchExists()`）検証したうえで書き換え内容を下書きに積み、`updates`にも積む
 * （差分が無ければ`updates`に含めない）。
 */
async function stageHelmTargetBranchUpdate(
  branchExists: BranchExists,
  readDraftValuesYaml: ReadDraftValuesYaml,
  helmTargetBranch: HelmTargetBranchConfig,
  acc: StageHelmTargetBranchUpdatesAcc,
  target: AnchorTarget,
): Promise<StageHelmTargetBranchUpdatesAcc> {
  const { branchName } = helmTargetBranch
  const { content: valuesYamlContent, draft } = await readDraftValuesYaml(
    acc.draft,
    target.valuesPath,
  )
  const previousBranchRaw = getValueAtAnchor(valuesYamlContent, target.anchorName)
  if (previousBranchRaw === branchName) return { ...acc, draft }

  if (!(await branchExists(branchName))) {
    throw new Error(
      `向き先ブランチ "${branchName}" がchartリポジトリに見つかりません (valuesPath: ${target.valuesPath}, anchor: ${target.anchorName})`,
    )
  }

  return {
    draft: writeValuesYamlDraft(
      draft,
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
