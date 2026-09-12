import type {
  BranchName,
  PlatformUrl,
  PipelineInfo,
  ProjectId,
  TagName,
  ValuesPath,
} from "../../types/types.js"
import { cacheByArgs } from "../../utils/cache.js"
import type { PlatformAdapter } from "./adapter.js"

/**
 * 実行1回（バッチ）を通して使い回す、`PlatformAdapter`への読み取りのキャッシュ。`runProcess()`が
 * `withCachedReads()`で1回だけ包み、返した値を全stepへ同じインスタンスとして渡す
 * （寿命＝バッチ1回ぶん）。キャッシュ済みの読み取りは`adapter.cached.*`、生の読み取りは
 * `adapter.*`として同じ値の上に同居するため、呼び出し側はどちらを呼んでいるかを変数名では
 * なく`.cached`の有無で読める。
 *
 * **ここに並べた読み取りだけがキャッシュされる。** 載せてよいのは「このツール自身の書き込み
 * （タグ作成・コミット・MR作成・ブランチ削除）ではバッチ中に値が変わらない読み取り」だけで、
 * `listTags`（`createTag`で変わる）・`openMergeRequestExists`（`createMergeRequest`で
 * 変わる）・固定ブランチを作り直すときの存在確認（`submitMergeRequest()`。削除と再作成をまたぐ）
 * は載せられない。それらは`PlatformAdapter`の生の関数を直接呼ぶ。判断の経緯は`docs/architecture.md`
 * 「PlatformAdapterへの問い合わせのキャッシュは〜」節。
 *
 * `branchExists`は生とキャッシュ済みの両方が要る唯一のメンバー。`submitMergeRequest()`は
 * 固定ブランチの削除と再作成をまたぐため`adapter.branchExists`（生）を呼び、
 * `stageHelmBranchRefUpdate()`はバッチ中不変な向き先ブランチの実在確認なので
 * `adapter.cached.branchExists`を呼ぶ。同じ名前の関数が`PlatformAdapter`本体とこの
 * `CachedReads`の両方に並ぶのは意図的で、生とキャッシュ済みのどちらを求めているかを
 * 呼び出し側の1行で示す。
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

/** `PlatformAdapter`にキャッシュ済みの読み取り（`cached`）を1つだけ足した値の型 */
export type PlatformAdapterWithCachedReads = PlatformAdapter & {
  readonly cached: CachedReads
}

/**
 * `adapter`をキャッシュ済みの読み取り（`cached`）で包む。`runProcess()`がバッチの最初に
 * 1回だけ呼び、返した値を全stepへ引数で渡す。
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
