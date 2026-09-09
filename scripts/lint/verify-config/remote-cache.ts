import {
  type GitlabClient,
  branchExists,
  getFileContent,
  projectExists,
} from "../../../src/lib/gitlab/gitlab.js"
import type { BranchName, ProjectId, ValuesPath } from "../../../src/types/types.js"
import { cacheByArgs } from "../../../src/utils/cache.js"

/**
 * 実在チェック（`verify-config.ts`）がGitLabへ投げる問い合わせのキャッシュ層。
 * 同じプロジェクト・ブランチ・values.yamlは複数の設定ユニット/appから参照されるため、
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
  return {
    hasProject: cacheByArgs((projectId: ProjectId) => projectExists(gitlab, projectId)),
    hasBranch: cacheByArgs((projectId: ProjectId, branch: BranchName) =>
      branchExists(gitlab, projectId, branch),
    ),
    loadValuesYaml: cacheByArgs(
      async (
        projectId: ProjectId,
        ref: BranchName,
        valuesPath: ValuesPath,
      ): Promise<FileResult> => ({
        content: await getFileContent(gitlab, projectId, valuesPath, ref),
      }),
    ),
  }
}
