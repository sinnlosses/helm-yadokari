import type {
  BranchName,
  PlatformUrl,
  PipelineInfo,
  ProjectId,
  TagName,
  ValuesPath,
} from "../../types/types.js"
import { cacheByArgs } from "../../utils/cache.js"
import type { Platform } from "./platform.js"

/**
 * 実行1回（バッチ）を通して使い回す、`Platform`への読み取りのキャッシュ。`runProcess()`が
 * 1つだけ作り、必要なstepへ引数で渡す（寿命＝バッチ1回ぶん）。
 *
 * **ここに並べた読み取りだけがキャッシュされる。** 載せてよいのは「このツール自身の書き込み
 * （タグ作成・コミット・MR作成・ブランチ削除）ではバッチ中に値が変わらない読み取り」だけで、
 * `listTags`（`createTag`で変わる）・`openMergeRequestExists`（`createMergeRequest`で
 * 変わる）・固定ブランチを作り直すときの存在確認（`submitMergeRequest()`。削除と再作成をまたぐ）
 * は載せられない。それらは`Platform`の生の関数を直接呼ぶ。判断の経緯は`docs/architecture.md`
 * 「GitLabへの問い合わせのキャッシュは〜」節。
 */
export type PlatformBatchCache = {
  /**
   * このツールが作り直すのは固定ブランチ（`feature/yadokari/...`）だけで、問い合わせ対象の
   * chartの向き先ブランチはバッチ中に変わらないため載せている。
   */
  readonly branchExists: (projectId: ProjectId, branch: BranchName) => Promise<boolean>

  /**
   * このツールが作ったタグには後からパイプラインが現れうるが、これはMR本文への参考情報でしかなく、
   * 同じタグについて設定ユニットごとに違う答えを載せるほうが困る。1回に収束させる側を選んで載せている。
   */
  readonly getLatestPipelineForRef: (
    projectId: ProjectId,
    ref: TagName,
  ) => Promise<PipelineInfo | undefined>

  /**
   * プロジェクトの移動・改名でしか変わらない値なので載せている。同じappが複数の設定ユニットに
   * 登録されていても`getProjectWebUrl`はバッチ全体で1回に収束する。
   */
  readonly getProjectWebUrl: (projectId: ProjectId) => Promise<PlatformUrl>

  /**
   * このツールが書き込むのは固定ブランチだけで、読み先の`mrTargetBranch`はバッチ中に変わらない
   * ため載せている。返すのは**常にリモート上の内容**で、書き換え中の内容は設定ユニット単位の
   * 下書き（`ValuesYamlDraft`）にしか載らない。
   */
  readonly getFileContent: (
    projectId: ProjectId,
    filePath: ValuesPath,
    ref: BranchName,
  ) => Promise<string | undefined>
}

export function createPlatformBatchCache(platform: Platform): PlatformBatchCache {
  return {
    branchExists: cacheByArgs((projectId: ProjectId, branch: BranchName) =>
      platform.branchExists(projectId, branch),
    ),
    getLatestPipelineForRef: cacheByArgs((projectId: ProjectId, ref: TagName) =>
      platform.getLatestPipelineForRef(projectId, ref),
    ),
    getProjectWebUrl: cacheByArgs((projectId: ProjectId) => platform.getProjectWebUrl(projectId)),
    getFileContent: cacheByArgs((projectId: ProjectId, filePath: ValuesPath, ref: BranchName) =>
      platform.getFileContent(projectId, filePath, ref),
    ),
  }
}
