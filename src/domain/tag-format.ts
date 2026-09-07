import type { BranchName, ParsedTag, TagFormat, TagName } from "../types/types.js"
import { toTagFormat, toTagName } from "../types/types.js"

const REQUIRED_PLACEHOLDERS: readonly string[] = ["branch", "date", "time"]
const PLACEHOLDER_PATTERN = /\{(branch|date|time)\}/g
const ANY_PLACEHOLDER_PATTERN = /\{([^}]*)\}/g

export const DEFAULT_TAG_FORMAT: TagFormat = toTagFormat("{branch}-build-at-{date}-{time}")

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * `TAG_FORMAT`（タグ命名規則のテンプレート）の妥当性を検証する。`{branch}`/`{date}`/`{time}`
 * をちょうど1回ずつ含む必要があり、それ以外のプレースホルダは許可しない。
 */
export function validateTagFormat(raw: string): TagFormat {
  const unknownPlaceholders = [...raw.matchAll(ANY_PLACEHOLDER_PATTERN)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined && !REQUIRED_PLACEHOLDERS.includes(name))
  if (unknownPlaceholders.length > 0) {
    throw new Error(
      `TAG_FORMAT に未知のプレースホルダがあります: ${unknownPlaceholders.join(", ")}` +
        `（使えるのは {branch}/{date}/{time} のみです）: "${raw}"`,
    )
  }

  for (const placeholder of REQUIRED_PLACEHOLDERS) {
    const count = [...raw.matchAll(new RegExp(`\\{${placeholder}\\}`, "g"))].length
    if (count !== 1) {
      throw new Error(`TAG_FORMAT には {${placeholder}} をちょうど1回含めてください: "${raw}"`)
    }
  }

  return toTagFormat(raw)
}

/**
 * `format`のプレースホルダを埋めてタグ名を組み立てる。`{branch}`は呼び出し元が渡した
 * `branch`（"/"を"-"に置換済み）、`{date}`/`{time}`は呼び出し元が渡した値にそのまま置換する。
 */
function fillTagFormat(
  format: TagFormat,
  branch: BranchName,
  datePart: string,
  timePart: string,
): string {
  const branchLiteral = branch.replaceAll("/", "-")
  return format.replace(PLACEHOLDER_PATTERN, (_, placeholder: string) => {
    if (placeholder === "branch") return branchLiteral
    if (placeholder === "date") return datePart
    return timePart
  })
}

/**
 * `format`と`branch`から、タグ名をパースするための正規表現を組み立てる。`{branch}`は
 * `branch`の具体値（"/"を"-"に置換済み）へのリテラル一致、`{date}`/`{time}`は名前付き
 * キャプチャグループにする。プレースホルダ以外の部分はリテラルとしてエスケープする。
 */
function compileTagPattern(format: TagFormat, branch: BranchName): RegExp {
  const branchLiteral = branch.replaceAll("/", "-")
  let source = "^"
  let lastIndex = 0
  for (const match of format.matchAll(PLACEHOLDER_PATTERN)) {
    const index = match.index
    source += escapeRegExp(format.slice(lastIndex, index))
    const placeholder = match[1]
    if (placeholder === "branch") {
      source += escapeRegExp(branchLiteral)
    } else if (placeholder === "date") {
      source += "(?<date>\\d{8})"
    } else {
      source += "(?<time>\\d{6})"
    }
    lastIndex = index + match[0].length
  }
  source += escapeRegExp(format.slice(lastIndex))
  source += "$"
  return new RegExp(source)
}

export function parseTag(
  tagName: TagName,
  branch: BranchName,
  format: TagFormat,
): ParsedTag | undefined {
  const match = compileTagPattern(format, branch).exec(tagName)
  const datePart = match?.groups?.["date"]
  const timePart = match?.groups?.["time"]
  if (!datePart || !timePart) return undefined

  const year = Number(datePart.slice(0, 4))
  const month = Number(datePart.slice(4, 6))
  const day = Number(datePart.slice(6, 8))
  const hour = Number(timePart.slice(0, 2))
  const minute = Number(timePart.slice(2, 4))
  const second = Number(timePart.slice(4, 6))

  return {
    name: tagName,
    branchName: branch,
    builtAt: new Date(Date.UTC(year, month - 1, day, hour, minute, second)),
  }
}

/**
 * 現在時刻を元に、`format`に従った新しいタグを組み立てる（GitLab上への作成はしない、名前の生成のみ）。
 */
export function buildNewTag(branch: BranchName, now: Date, format: TagFormat): ParsedTag {
  const pad = (n: number) => String(n).padStart(2, "0")
  const datePart = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`
  const timePart = `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`
  return {
    name: toTagName(fillTagFormat(format, branch, datePart, timePart)),
    branchName: branch,
    builtAt: now,
  }
}

/**
 * 渡されたタグ名のうち、指定ブランチ由来（＝`branch`と`format`でパースできる）のものの中から、
 * 最も新しい builtAt を持つものを返す。該当するタグがひとつもない場合は undefined を返す。
 * 呼び出し元は「タグ一覧全体」だけでなく、「HEADを指すタグの集合」のような絞り込み済みの
 * タグ名リストを渡すこともある（`resolveLatestTag()`）。
 */
export function findLatestParsedTag(
  tagNames: readonly TagName[],
  branch: BranchName,
  format: TagFormat,
): ParsedTag | undefined {
  return tagNames
    .map((name) => parseTag(name, branch, format))
    .filter((tag): tag is ParsedTag => tag !== undefined)
    .reduce<ParsedTag | undefined>((latest, current) => {
      if (!latest) return current
      return current.builtAt > latest.builtAt ? current : latest
    }, undefined)
}
