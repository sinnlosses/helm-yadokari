import type { BranchName, ChartConfig, FileUpdate, PlatformUrl } from "../../../domain/types.js"
import type { PlatformAdapter } from "../../../lib/platform/adapter.js"
import type { MrContent } from "./shared/types.js"

/**
 * 書き換えたファイルを固定ブランチへ1コミットで積み、MRを作成する。
 *
 * 固定ブランチが既に残っていれば削除し、`mrTargetBranch`から必ず作り直す。過去の実行で
 * 積んだ変更が新しいMRの差分に紛れ込まないようにするため。オープン中のMRがこのブランチに
 * 無いことは`filterTargets`が確認済みなので、無条件に削除してよい。
 *
 * コミットメッセージにはMRのタイトルをそのまま使う。作成したMRのURLを返す。
 */
export async function submitMergeRequest(
  adapter: PlatformAdapter,
  chart: ChartConfig,
  featureBranch: BranchName,
  content: MrContent,
  files: readonly FileUpdate[],
): Promise<PlatformUrl> {
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
  return adapter.createMergeRequest(
    chart.projectId,
    featureBranch,
    chart.mrTargetBranch,
    content.title,
    content.description,
  )
}
