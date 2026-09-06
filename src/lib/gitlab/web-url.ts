import type { GitLabUrl, TagName } from "../../types/types.js"
import { toGitLabUrl } from "../../types/types.js"

/**
 * プロジェクトのweb URL配下のページURLを組み立てる。`webUrl`はオリジンではなく
 * **プロジェクトのパスまで含んだURL**（`https://host/group/proj`、サブパス設置なら
 * `https://host/gitlab/group/proj`）なので、`new URL(path, webUrl)`ではなく連結で組み立てる
 * （前者はベースのパスを捨ててしまう）。タグ名のエスケープもここに閉じ込め、
 * 呼び出し側が`encodeURIComponent`を書かなくて済むようにする。
 */
export function buildTagUrl(webUrl: GitLabUrl, tagName: TagName): GitLabUrl {
  return toGitLabUrl(`${webUrl}/-/tags/${encodeURIComponent(tagName)}`)
}

/** 2つのタグ間の比較ページURL（`buildTagUrl()`と同じ組み立て方） */
export function buildCompareUrl(webUrl: GitLabUrl, from: TagName, to: TagName): GitLabUrl {
  return toGitLabUrl(`${webUrl}/-/compare/${encodeURIComponent(from)}...${encodeURIComponent(to)}`)
}
