import type { BranchName, GitLabUrl, PipelineInfo, ProjectId, TagName } from "../../types/types.js"
import { getOrFetchShared } from "../../utils/cache.js"
import {
  type GitlabClient,
  branchExists as branchExistsOnGitlab,
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
 * `commitFileUpdates()`内のブランチ存在確認（削除と再作成をまたぐ）は載せられない。それらは
 * `gitlab.ts`の生の関数を直接呼ぶ。判断の経緯は`docs/architecture.md`
 * 「GitLabへの問い合わせのキャッシュは`lib/gitlab/`に列挙し〜」節。
 */
export type GitlabBatchCache = {
  /**
   * 指定プロジェクトに指定ブランチが存在するか。このツールが作り直すのは固定ブランチ
   * （`feature/yadokari/...`）だけで、問い合わせ対象のchartの向き先ブランチはバッチ中に
   * 変わらないため載せている。
   */
  readonly branchExists: (projectId: ProjectId, branch: BranchName) => Promise<boolean>

  /**
   * 指定したタグに紐づく最新のパイプライン（無ければ`undefined`）。このツールが作ったタグには
   * 後からパイプラインが現れうるが、これはMR本文への参考情報でしかなく、同じタグについて
   * clientごとに違う答えを載せるほうが困る。1回に収束させる側を選んで載せている。
   */
  readonly getLatestPipelineForRef: (
    projectId: ProjectId,
    ref: TagName,
  ) => Promise<PipelineInfo | undefined>

  /**
   * プロジェクトのweb URL。プロジェクトの移動・改名でしか変わらない値なので載せている。
   * 同じappが複数clientに登録されていても`Projects.show`はバッチ全体で1回に収束する。
   */
  readonly getProjectWebUrl: (projectId: ProjectId) => Promise<GitLabUrl>
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
  }
}

/** キャッシュキーに使える引数の型。`join()`で文字列にできるものだけを受け付ける */
type CacheKeyPart = string | number

/**
 * 読み取り1つをキャッシュ付きの関数にする。キーは引数から機械的に組み立てるので、呼び出し側が
 * テンプレート文字列を手書きしなくてよい。読み取りごとに`Map`を分けるため、別の読み取りとの
 * キー衝突は起こらない。`mapWithConcurrency`により同じキーの問い合わせが同時に来るので、
 * 値ではなく実行中のPromiseを共有する`getOrFetchShared()`を使う。
 *
 * 値を箱に入れてから載せるのは、`getOrFetchShared()`が「未キャッシュ」の判定に`undefined`を
 * 使うため。箱越しなら`undefined`を返す読み取り（`getFileContent`・`getLatestPipelineForRef`）も
 * そのまま載せられる。
 */
function cacheByArgs<A extends readonly CacheKeyPart[], V>(
  read: (...args: A) => Promise<V>,
): (...args: A) => Promise<V> {
  const store = new Map<string, Promise<{ readonly value: V }>>()
  return async (...args: A) => {
    const boxed = await getOrFetchShared(store, toCacheKey(args), async () => ({
      value: await read(...args),
    }))
    return boxed.value
  }
}

/**
 * 引数からキャッシュキーを組み立てる。区切りにヌル文字を使うのは、プロジェクトID・ブランチ名・
 * ファイルパスのいずれにも現れない文字だから（区切りが値の中に現れると、引数の切れ目が違う
 * 組み合わせが同じキーになる）。
 */
function toCacheKey(args: readonly CacheKeyPart[]): string {
  return args.join("\0")
}
