import type { BranchName, ProjectId, ValuesPath } from "../../types/types.js"
import { getOrFetchShared } from "../../utils/cache.js"
import { type GitlabClient, branchExists, getFileContent, projectExists } from "../gitlab/gitlab.js"

/**
 * 実在チェック（`verify-config.ts`）がGitLabへ投げる問い合わせのキャッシュ層。
 * 同じプロジェクト・ブランチ・values.yamlは複数のclient/appから参照されるため、
 * 1回の検証実行で共有する1つのインスタンスにまとめて問い合わせ回数を抑える。
 */

/** values.yamlの取得結果。キャッシュ値に undefined を持てないためオブジェクトで包む */
type FileResult = { readonly content: string | undefined }

export type RemoteCache = {
  /** プロジェクトが存在し参照できるか */
  readonly hasProject: (projectId: ProjectId) => Promise<boolean>
  /** 指定プロジェクトに指定ブランチが存在するか */
  readonly hasBranch: (projectId: ProjectId, branch: BranchName) => Promise<boolean>
  /** 指定ブランチ時点の values.yaml の内容（存在しなければ `content: undefined`） */
  readonly loadValuesYaml: (
    projectId: ProjectId,
    ref: BranchName,
    valuesPath: ValuesPath,
  ) => Promise<FileResult>
}

export function newRemoteCache(gitlab: GitlabClient): RemoteCache {
  // chartAndApps単位の並列実行から同時に呼ばれるため、値ではなくPromiseを共有する（T-042）
  const projects = new Map<ProjectId, Promise<boolean>>()
  const branches = new Map<string, Promise<boolean>>()
  const files = new Map<string, Promise<FileResult>>()

  return {
    hasProject: (projectId) =>
      getOrFetchShared(projects, projectId, () => projectExists(gitlab, projectId)),
    hasBranch: (projectId, branch) =>
      getOrFetchShared(branches, `${projectId}#${branch}`, () =>
        branchExists(gitlab, projectId, branch),
      ),
    loadValuesYaml: (projectId, ref, valuesPath) =>
      getOrFetchShared(files, `${projectId}#${ref}#${valuesPath}`, async () => ({
        content: await getFileContent(gitlab, projectId, valuesPath, ref),
      })),
  }
}
