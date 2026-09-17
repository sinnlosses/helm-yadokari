import type {
  BranchName,
  GroupId,
  GroupPath,
  ProjectId,
  ValuesPath,
} from "../../../src/domain/types.js"
import {
  type GitlabClient,
  branchExists,
  getFileContent,
  getGroupPath,
  getProjectGroupPath,
} from "../../../src/lib/gitlab/api.js"
import { cacheByArgs } from "../../../src/utils/cache.js"

/**
 * 実在チェック（`remote-existence.ts`）がGitLabへ投げる問い合わせのキャッシュ層。
 * 同じプロジェクト・ブランチ・values.yamlは複数の設定ユニット/appから参照されるため、
 * 1回の検証実行で共有する1つのインスタンスにまとめて問い合わせ回数を抑える。
 */

export type RemoteCache = {
  /**
   * 宣言されたグループIDのフルパス（存在しない・参照できないときは`undefined`）。
   *
   * `registry.yaml`単位の値なので、同じchartディレクトリ配下の設定ユニットが何件あっても
   * 問い合わせは1回で済む
   */
  readonly lookupGroupPath: (groupId: GroupId) => Promise<GroupPath | undefined>
  /** プロジェクトが属するグループ（存在しない・参照できないときは`undefined`） */
  readonly lookupProjectGroupPath: (projectId: ProjectId) => Promise<GroupPath | undefined>
  /** 指定プロジェクトに指定ブランチが存在するか */
  readonly hasBranch: (projectId: ProjectId, branch: BranchName) => Promise<boolean>
  /** 指定ブランチ時点の values.yaml の内容（存在しなければ `undefined`） */
  readonly loadValuesYaml: (
    projectId: ProjectId,
    ref: BranchName,
    valuesPath: ValuesPath,
  ) => Promise<string | undefined>
}

export function newRemoteCache(gitlab: GitlabClient): RemoteCache {
  return {
    lookupGroupPath: cacheByArgs((groupId: GroupId) => getGroupPath(gitlab, groupId)),
    lookupProjectGroupPath: cacheByArgs((projectId: ProjectId) =>
      getProjectGroupPath(gitlab, projectId),
    ),
    hasBranch: cacheByArgs((projectId: ProjectId, branch: BranchName) =>
      branchExists(gitlab, projectId, branch),
    ),
    loadValuesYaml: cacheByArgs((projectId: ProjectId, ref: BranchName, valuesPath: ValuesPath) =>
      getFileContent(gitlab, projectId, valuesPath, ref),
    ),
  }
}
