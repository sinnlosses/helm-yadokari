import type { BranchName } from "../types.js"
import { toBranchName } from "../types.js"

/** 全chartリポジトリで共通の固定ブランチ名。chartリポジトリ単位で1つのMRに集約するため使い回す */
export const UPDATE_BRANCH: BranchName = toBranchName("yadokari/update")
