import type { BranchName, ParsedTag } from "../types.js"
import { toTagName } from "../types.js"

const TAG_SUFFIX_PATTERN = /^(\d{8})-(\d{6})$/

/**
 * タグ命名規則: `${branchの"/"を"-"に置換した値}-build-at-${yyyymmdd}-${hhmmss}`
 */
export function buildTagPrefix(branch: BranchName): string {
  return `${branch.replaceAll("/", "-")}-build-at-`
}

export function parseTag(tagName: string, branch: BranchName): ParsedTag | undefined {
  const prefix = buildTagPrefix(branch)
  if (!tagName.startsWith(prefix)) return undefined

  const suffix = tagName.slice(prefix.length)
  const match = TAG_SUFFIX_PATTERN.exec(suffix)
  if (!match) return undefined

  const datePart = match[1]
  const timePart = match[2]
  if (!datePart || !timePart) return undefined

  const year = Number(datePart.slice(0, 4))
  const month = Number(datePart.slice(4, 6))
  const day = Number(datePart.slice(6, 8))
  const hour = Number(timePart.slice(0, 2))
  const minute = Number(timePart.slice(2, 4))
  const second = Number(timePart.slice(4, 6))

  return {
    name: toTagName(tagName),
    branch,
    builtAt: new Date(Date.UTC(year, month - 1, day, hour, minute, second)),
  }
}

/**
 * 指定ブランチ由来のタグの中から、最も新しい builtAt を持つものを返す。
 * 該当するタグがひとつもない場合は undefined を返す。
 */
export function findLatestParsedTag(
  tagNames: readonly string[],
  branch: BranchName,
): ParsedTag | undefined {
  return tagNames
    .map((name) => parseTag(name, branch))
    .filter((tag): tag is ParsedTag => tag !== undefined)
    .reduce<ParsedTag | undefined>((latest, current) => {
      if (!latest) return current
      return current.builtAt > latest.builtAt ? current : latest
    }, undefined)
}
