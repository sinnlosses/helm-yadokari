import type {
  BranchName,
  PlatformUrl,
  PipelineInfo,
  ProjectId,
  TagName,
  ValuesPath,
} from "../../types/types.js"
import { cacheByArgs } from "../../utils/cache.js"
import {
  type GitlabClient,
  branchExists as branchExistsOnGitlab,
  getFileContent as getFileContentOnGitlab,
  getLatestPipelineForRef as getLatestPipelineForRefOnGitlab,
  getProjectWebUrl as getProjectWebUrlOnGitlab,
} from "./gitlab.js"

/**
 * 実行1回（バッチ）を通して使い回す、GitLabへの読み取りのキャッシュ。`runProcess()`が1つだけ
 * 作り、必要なstepへ引数で渡す（寿命＝バッチ1回ぶん）。
 *
 * **ここに並べた読み取りだけがキャッシュされる。** 載せてよいのは「このツール自身の書き込み
 * （タグ作成・コミット・MR作成・ブランチ削除）ではバッチ中に値が変わらない読み取り」だけで、
 * `listTags`（`createTag`で変わる）・`openMergeRequestExists`（`createMergeRequest`で変わる）・
 * 固定ブランチを作り直すときの存在確認（`submitMergeRequest()`。削除と再作成をまたぐ）は載せられない。それらは
 * `gitlab.ts`の生の関数を直接呼ぶ。判断の経緯は`docs/architecture.md`
 * 「GitLabへの問い合わせのキャッシュは`lib/gitlab/`に列挙し〜」節。
 */
export type GitlabBatchCache = {
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
   * 登録されていても`Projects.show`はバッチ全体で1回に収束する。
   */
  readonly getProjectWebUrl: (projectId: ProjectId) => Promise<PlatformUrl>

  /**
   * このツールが書き込むのは固定ブランチだけで、読み先の`mrTargetBranch`はバッチ中に変わらない
   * ため載せている。返すのは**常にGitLab上の内容**で、書き換え中の内容は設定ユニット単位の
   * 下書き（`ValuesYamlDraft`）にしか載らない。
   */
  readonly getFileContent: (
    projectId: ProjectId,
    filePath: ValuesPath,
    ref: BranchName,
  ) => Promise<string | undefined>
}

export function createGitlabBatchCache(gitlab: GitlabClient): GitlabBatchCache {
  return {
    branchExists: cacheByArgs((projectId: ProjectId, branch: BranchName) =>
      branchExistsOnGitlab(gitlab, projectId, branch),
    ),
    getLatestPipelineForRef: cacheByArgs((projectId: ProjectId, ref: TagName) =>
      getLatestPipelineForRefOnGitlab(gitlab, projectId, ref),
    ),
    getProjectWebUrl: cacheByArgs((projectId: ProjectId) =>
      getProjectWebUrlOnGitlab(gitlab, projectId),
    ),
    getFileContent: cacheByArgs((projectId: ProjectId, filePath: ValuesPath, ref: BranchName) =>
      getFileContentOnGitlab(gitlab, projectId, filePath, ref),
    ),
  }
}
