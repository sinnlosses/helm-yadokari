import type { PlatformUrl, TagName } from "../../types/types.js"
import { toPlatformUrl } from "../../types/types.js"

/**
 * リポジトリのweb URL配下のページURLを組み立てる。`webUrl`はオリジンではなく
 * **リポジトリのパスまで含んだURL**（`https://github.com/owner/repo`、GHESなら
 * `https://ghe.example.com/owner/repo`）なので、`new URL(path, webUrl)`ではなく連結で
 * 組み立てる（前者はベースのパスを捨ててしまう）。タグ名のエスケープもここに閉じ込め、
 * 呼び出し側が`encodeURIComponent`を書かなくて済むようにする。
 *
 * GitHubにはGitLabの`/-/tags/X`に対応する「タグ1件のページ」が無く、リリースのページ
 * （`/releases/tag/X`）が一番近い。リリースが作られていないタグでも、そのタグのコミットと
 * 直前のタグからの差分が表示される。
 */
export function buildTagUrl(webUrl: PlatformUrl, tagName: TagName): PlatformUrl {
  return toPlatformUrl(`${webUrl}/releases/tag/${encodeURIComponent(tagName)}`)
}

/** 2つのタグ間の比較ページURL（`buildTagUrl()`と同じ組み立て方） */
export function buildCompareUrl(webUrl: PlatformUrl, from: TagName, to: TagName): PlatformUrl {
  return toPlatformUrl(`${webUrl}/compare/${encodeURIComponent(from)}...${encodeURIComponent(to)}`)
}
