import type {
  AppUpdatePlan,
  GitLabUrl,
  HelmTargetBranchUpdate,
  ImageTagUpdate,
  PipelineInfo,
} from "../../../../types/types.js"

/**
 * MR本文のイメージタグ表の1行分。1アプリが複数箇所を書き換える場合は同じ`plan`の
 * エントリが箇所の数だけ並ぶ。`webUrl`は`update`のリンク（タグ・比較）に使う解決済みの値。
 * `pipeline`はGitLab上に本当にパイプラインが無い（または403）場合に`undefined`になる。
 */
export type ImageTagEntry = {
  readonly plan: AppUpdatePlan
  readonly update: ImageTagUpdate
  readonly webUrl: GitLabUrl
  readonly pipeline: PipelineInfo | undefined
}

/**
 * 1つのMRに載せる項目。`collectMrEntries()`が組み立て、`buildMrContent()`が
 * タイトルと本文にする。タイトルの件数と本文のテーブルの行を同じ配列から数えるための形。
 */
export type MrEntries = {
  readonly imageTags: readonly ImageTagEntry[]
  readonly helmBranches: readonly HelmTargetBranchUpdate[]
}

/**
 * MRのタイトルと本文（Markdown）。`buildMrContent()`が組み立て、`submitMergeRequest()`が
 * MRとコミットメッセージに使う。
 */
export type MrContent = {
  readonly title: string
  readonly description: string
}
