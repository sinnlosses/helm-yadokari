import type { PlatformAdapter } from "../../../lib/platform/adapter.js"
import type { BranchName, ChartRepoConfig, FileUpdate } from "../../../types/types.js"
import type { MrContent } from "./shared/types.js"

/**
 * 書き換えたファイルを固定ブランチへ1コミットで積み、MRを作成する。
 *
 * 固定ブランチが既に残っていれば削除し、`mrTargetBranch`から必ず作り直す。過去の実行で
 * 積んだ変更が新しいMRの差分に紛れ込まないようにするため。オープン中のMRがこのブランチに
 * 無いことは`filterTargets`が確認済みなので、無条件に削除してよい。
 *
 * コミットメッセージにはMRのタイトルをそのまま使う。
 */
export async function submitMergeRequest(
  adapter: PlatformAdapter,
  chart: ChartRepoConfig,
  featureBranch: BranchName,
  content: MrContent,
  files: readonly FileUpdate[],
): Promise<void> {
  if (await adapter.branchExists(chart.projectId, featureBranch)) {
    await adapter.deleteBranch(chart.projectId, featureBranch)
  }
  await adapter.commitFileUpdates(
    chart.projectId,
    featureBranch,
    chart.mrTargetBranch,
    content.title,
    files,
  )
  await adapter.createMergeRequest(
    chart.projectId,
    featureBranch,
    chart.mrTargetBranch,
    content.title,
    content.description,
  )
}
