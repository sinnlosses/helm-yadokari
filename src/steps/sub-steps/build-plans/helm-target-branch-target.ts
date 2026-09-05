import { getValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type {
  HelmTargetBranchConfig,
  HelmTargetBranchTarget,
  HelmTargetBranchUpdate,
} from "../../../types.js"
import { toBranchName } from "../../../types.js"
import { reduceAsync } from "../../../utils/sequential.js"
import type { ApplyTargetsAcc, BranchExists, LoadValuesYamlContent } from "./types.js"

export type ApplyHelmTargetsAcc = ApplyTargetsAcc<HelmTargetBranchUpdate>

/**
 * `helmTargetBranch.targets`のうち1箇所分について、現在の値を読み取り設定値（`branch`）と
 * 比較する。差分があれば、書き込み前にそのブランチがchartリポジトリ上に実在するか
 * （`branchExists()`）検証したうえで書き換え内容をキャッシュに積み、`updates`にも積む
 * （差分が無ければ`updates`に含めない）。
 */
async function applyHelmTargetBranchTarget(
  branchExists: BranchExists,
  loadValuesYamlContent: LoadValuesYamlContent,
  helmTargetBranch: HelmTargetBranchConfig,
  acc: ApplyHelmTargetsAcc,
  target: HelmTargetBranchTarget,
): Promise<ApplyHelmTargetsAcc> {
  const { branch } = helmTargetBranch
  const valuesYamlCache = new Map(acc.valuesYamlCache)
  const valuesYamlContent = await loadValuesYamlContent(valuesYamlCache, target.valuesPath)
  const previousBranchRaw = getValueAtAnchor(valuesYamlContent, target.anchor)
  if (previousBranchRaw === branch) return { ...acc, valuesYamlCache }

  if (!(await branchExists(branch))) {
    throw new Error(`向き先ブランチ "${branch}" がchartリポジトリに見つかりません`)
  }

  valuesYamlCache.set(target.valuesPath, setValueAtAnchor(valuesYamlContent, target.anchor, branch))
  return {
    valuesYamlCache,
    modifiedValuesPaths: new Set(acc.modifiedValuesPaths).add(target.valuesPath),
    updates: [
      ...acc.updates,
      {
        target,
        previousBranch:
          previousBranchRaw === undefined ? undefined : toBranchName(previousBranchRaw),
        newBranch: branch,
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
  acc: ApplyHelmTargetsAcc,
): Promise<ApplyHelmTargetsAcc> {
  return reduceAsync(helmTargetBranch.targets, acc, (current, target) =>
    applyHelmTargetBranchTarget(
      branchExists,
      loadValuesYamlContent,
      helmTargetBranch,
      current,
      target,
    ),
  )
}
