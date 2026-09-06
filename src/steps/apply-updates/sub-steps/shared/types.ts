import type {
  AppUpdatePlan,
  GitLabUrl,
  HelmTargetBranchUpdate,
  ImageTagUpdate,
} from "../../../../types/types.js"

/**
 * MR本文のイメージタグ表の1行分。1アプリが複数箇所を書き換える場合は同じ`plan`の
 * エントリが箇所の数だけ並ぶ。`webUrl`は`update`のリンク（タグ・比較）に使う解決済みの値。
 */
export type ImageTagEntry = {
  readonly plan: AppUpdatePlan
  readonly update: ImageTagUpdate
  readonly webUrl: GitLabUrl
}

/**
 * 1つのMRに載せる項目。`collectMrEntries()`が組み立て、`buildMrContent()`が
 * タイトルと本文にする。タイトルの件数と本文のテーブルの行を同じ配列から数えるための形。
 */
export type MrEntries = {
  readonly imageTags: readonly ImageTagEntry[]
  readonly helmBranches: readonly HelmTargetBranchUpdate[]
}
