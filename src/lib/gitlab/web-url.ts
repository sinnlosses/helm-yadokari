import type { PlatformUrl, TagName } from "../../types/types.js"
import { toPlatformUrl } from "../../types/types.js"

/**
 * プロジェクトのweb URL配下のページURLを組み立てる。`webUrl`はオリジンではなく
 * **プロジェクトのパスまで含んだURL**（`https://host/group/proj`、サブパス設置なら
 * `https://host/gitlab/group/proj`）なので、`new URL(path, webUrl)`ではなく連結で組み立てる
 * （前者はベースのパスを捨ててしまう）。タグ名のエスケープもここに閉じ込め、
 * 呼び出し側が`encodeURIComponent`を書かなくて済むようにする。
 */
export function buildTagUrl(webUrl: PlatformUrl, tagName: TagName): PlatformUrl {
  return toPlatformUrl(`${webUrl}/-/tags/${encodeURIComponent(tagName)}`)
}

/** 2つのタグ間の比較ページURL（`buildTagUrl()`と同じ組み立て方） */
export function buildCompareUrl(webUrl: PlatformUrl, from: TagName, to: TagName): PlatformUrl {
  return toPlatformUrl(
    `${webUrl}/-/compare/${encodeURIComponent(from)}...${encodeURIComponent(to)}`,
  )
}
