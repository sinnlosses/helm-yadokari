import { type GitlabClient, branchExists } from "../../../lib/gitlab/gitlab.js"
import { getValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type {
  BranchName,
  HelmTargetBranchTarget,
  HelmTargetBranchUpdate,
  ProjectId,
  ValuesPath,
} from "../../../types.js"
import { toBranchName } from "../../../types.js"
import { getOrFetch } from "../../../utils/cache.js"
import type { LoadValuesYamlContent } from "./chart-update.js"

export type ApplyHelmTargetsAcc = {
  readonly valuesYamlCache: ReadonlyMap<ValuesPath, string>
  readonly modifiedValuesPaths: ReadonlySet<ValuesPath>
  readonly updates: readonly HelmTargetBranchUpdate[]
}

/**
 * `app.helmTargetBranch.targets`のうち1箇所分について、現在の値を読み取り設定値（`branch`）と
 * 比較する。差分があれば、書き込み前にそのブランチがchartリポジトリ上に実在するか検証したうえで
 * 書き換え内容をキャッシュに積み、`updates`にも積む（差分が無ければ`updates`に含めない）。
 * ブランチ存在チェックは同一ブランチ名につき1回だけになるよう`branchExistsCache`で共有する。
 */
export async function applyHelmTargetBranchTarget(
  gitlab: GitlabClient,
  chartProjectId: ProjectId,
  branchExistsCache: Map<BranchName, boolean>,
  loadValuesYamlContent: LoadValuesYamlContent,
  branch: BranchName,
  acc: ApplyHelmTargetsAcc,
  target: HelmTargetBranchTarget,
): Promise<ApplyHelmTargetsAcc> {
  const valuesYamlCache = new Map(acc.valuesYamlCache)
  const valuesYamlContent = await loadValuesYamlContent(valuesYamlCache, target.valuesPath)
  const previousBranchRaw = getValueAtAnchor(valuesYamlContent, target.anchor)
  if (previousBranchRaw === branch) return { ...acc, valuesYamlCache }

  const exists = await getOrFetch(branchExistsCache, branch, () =>
    branchExists(gitlab, chartProjectId, branch),
  )
  if (!exists) {
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
