import type {
  BranchName,
  PlatformUrl,
  PipelineInfo,
  ProjectId,
  TagName,
  ValuesPath,
} from "../../domain/types.js"
import { cacheByArgs } from "../../utils/cache.js"
import type { PlatformAdapter } from "./adapter.js"

/**
 * `PlatformAdapter`への読み取りのキャッシュ。
 *
 * バッチの最初に`withCachedReads()`で1回だけ包み、
 * 同じインスタンスを最後まで持ち回る（寿命＝バッチ1回）。キャッシュ済みは`adapter.cached.*`、生は
 * `adapter.*`として同じ値に同居するので、どちらを呼んでいるかは`.cached`の有無で読める。
 *
 * **載せてよいのは、このツール自身の書き込み（タグ作成・コミット・MR作成・ブランチ削除）
 * でバッチ中に値が変わらない読み取りだけ。** `listTags`は`createTag`で、`openMergeRequestExists`は
 * `createMergeRequest`で、固定ブランチの存在確認は削除と再作成で変わるので載せられない。
 * 判断の経緯は`docs/architecture.md`「PlatformAdapterへの問い合わせのキャッシュは〜」節。
 *
 * `branchExists`だけは両方に並ぶ。削除と再作成をまたぐ確認は生、
 * バッチ中不変な向き先ブランチの実在確認はキャッシュ済みを呼ぶ。
 */

export type CachedReads = {
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
   * 読み先の`mrTargetBranch`はバッチ中に変わらないため載せている。
   *
   * このツールが書き込むのは固定ブランチだけ。返すのは**常にリモート上の内容**で、
   * 書き換え中の内容は設定ユニット単位の下書き（`ValuesYamlDraft`）にしか載らない。
   */
  readonly getFileContent: (
    projectId: ProjectId,
    filePath: ValuesPath,
    ref: BranchName,
  ) => Promise<string | undefined>
}

/** `PlatformAdapter`にキャッシュ済みの読み取り（`cached`）を1つだけ足した値の型 */
export type PlatformAdapterWithCachedReads = PlatformAdapter & {
  readonly cached: CachedReads
}

/**
 * `adapter`をキャッシュ済みの読み取り（`cached`）で包む。バッチの最初に1回だけ呼び、
 * 返した値を最後まで引数で持ち回る。
 */
export function withCachedReads(adapter: PlatformAdapter): PlatformAdapterWithCachedReads {
  return {
    ...adapter,
    cached: {
      branchExists: cacheByArgs((projectId: ProjectId, branch: BranchName) =>
        adapter.branchExists(projectId, branch),
      ),
      getLatestPipelineForRef: cacheByArgs((projectId: ProjectId, ref: TagName) =>
        adapter.getLatestPipelineForRef(projectId, ref),
      ),
      getProjectWebUrl: cacheByArgs((projectId: ProjectId) => adapter.getProjectWebUrl(projectId)),
      getFileContent: cacheByArgs((projectId: ProjectId, filePath: ValuesPath, ref: BranchName) =>
        adapter.getFileContent(projectId, filePath, ref),
      ),
    },
  }
}
