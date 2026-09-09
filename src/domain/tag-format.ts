import type { BranchName, ParsedTag, TagFormat, TagName } from "../types/types.js"
import { toTagFormat, toTagName } from "../types/types.js"

const REQUIRED_PLACEHOLDERS: readonly string[] = ["branch", "date", "time"]
// どちらもキャプチャグループを持たせない。読むのはマッチ全体（`{...}`）だけで、グループを
// 置くと「必ず参加するのに型は `string | undefined`」という実体のない分岐が呼び出し側に増える。
const PLACEHOLDER_PATTERN = /\{(?:branch|date|time)\}/g
const ANY_PLACEHOLDER_PATTERN = /\{[^}]*\}/g

// タグ名の{date}/{time}はJST（UTC+9固定）で組み立て・解釈する。日本にサマータイムは無いため
// オフセット計算で足りる（buildNewTagで足してparseTagで引く、単純に対称）。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * タグ形式のテンプレート文字列（`registry.yaml`の`appSpecs[].tagFormat`）の妥当性を検証する。
 * `{branch}`/`{date}`/`{time}` をちょうど1回ずつ含む必要があり、それ以外のプレースホルダは
 * 許可しない。並び順と区切り文字は自由。
 */
export function validateTagFormat(raw: string): TagFormat {
  const unknownPlaceholders = [...raw.matchAll(ANY_PLACEHOLDER_PATTERN)]
    .map((match) => match[0].slice(1, -1))
    .filter((name) => !REQUIRED_PLACEHOLDERS.includes(name))
  if (unknownPlaceholders.length > 0) {
    throw new Error(
      `tagFormat に未知のプレースホルダがあります: ${unknownPlaceholders.join(", ")}` +
        `（使えるのは {branch}/{date}/{time} のみです）: "${raw}"`,
    )
  }

  for (const placeholder of REQUIRED_PLACEHOLDERS) {
    const count = [...raw.matchAll(new RegExp(`\\{${placeholder}\\}`, "g"))].length
    if (count !== 1) {
      throw new Error(`tagFormat には {${placeholder}} をちょうど1回含めてください: "${raw}"`)
    }
  }

  return toTagFormat(raw)
}

/**
 * タグ名をタグ形式に照らして読み取る。読み取れない（＝そのappの候補にならない）タグには
 * undefinedを返す。`{branch}`が必ず含まれるため、追跡ブランチ由来かどうかもここで決まる。
 */
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
    builtAt: new Date(Date.UTC(year, month - 1, day, hour, minute, second) - JST_OFFSET_MS),
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

/**
 * 現在時刻を元に、`format`に従った新しいタグを組み立てる（GitLab上への作成はしない、名前の生成のみ）。
 */
export function buildNewTag(branch: BranchName, now: Date, format: TagFormat): ParsedTag {
  const pad = (n: number) => String(n).padStart(2, "0")
  const jst = new Date(now.getTime() + JST_OFFSET_MS)
  const datePart = `${jst.getUTCFullYear()}${pad(jst.getUTCMonth() + 1)}${pad(jst.getUTCDate())}`
  const timePart = `${pad(jst.getUTCHours())}${pad(jst.getUTCMinutes())}${pad(jst.getUTCSeconds())}`
  return {
    name: toTagName(fillTagFormat(format, branch, datePart, timePart)),
    branchName: branch,
    // タグ名は秒精度なので、打刻日時もミリ秒を切り捨てる（同じタグ名をparseTagした
    // 結果と一致させるため）
    builtAt: new Date(Math.floor(now.getTime() / 1000) * 1000),
  }
}

/**
 * `format`と`branch`から、タグ名をパースするための正規表現を組み立てる。`{branch}`は
 * `branch`をタグ名の中での表現に変換した値（`toBranchLiteralInTag()`）へのリテラル一致、
 * `{date}`/`{time}`は名前付きキャプチャグループにする。プレースホルダ以外の部分は
 * リテラルとしてエスケープする。
 */
function compileTagPattern(format: TagFormat, branch: BranchName): RegExp {
  const branchLiteral = toBranchLiteralInTag(branch)
  const toPatternPart = (placeholder: string): string => {
    if (placeholder === "{branch}") return escapeRegExp(branchLiteral)
    if (placeholder === "{date}") return "(?<date>\\d{8})"
    return "(?<time>\\d{6})"
  }

  // 各プレースホルダの直前のリテラル部分（エスケープ済み）とプレースホルダの変換結果を
  // 順に畳み込み、最後に末尾の残りリテラルを足す。`lastIndex`は「直前のプレースホルダの
  // 終端」で、次のリテラルの切り出し開始位置になる
  const { source, lastIndex } = [...format.matchAll(PLACEHOLDER_PATTERN)].reduce(
    (acc, match) => ({
      source:
        acc.source +
        escapeRegExp(format.slice(acc.lastIndex, match.index)) +
        toPatternPart(match[0]),
      lastIndex: match.index + match[0].length,
    }),
    { source: "^", lastIndex: 0 },
  )

  return new RegExp(`${source}${escapeRegExp(format.slice(lastIndex))}$`)
}

/**
 * `format`のプレースホルダを埋めてタグ名を組み立てる。`{branch}`はタグ名の中での表現
 * （`toBranchLiteralInTag()`。`compileTagPattern()`と同じもの）に変換して埋め、
 * `{date}`/`{time}`は呼び出し元が渡した値にそのまま置換する。
 */
function fillTagFormat(
  format: TagFormat,
  branch: BranchName,
  datePart: string,
  timePart: string,
): string {
  const branchLiteral = toBranchLiteralInTag(branch)
  return format.replace(PLACEHOLDER_PATTERN, (placeholder) => {
    if (placeholder === "{branch}") return branchLiteral
    if (placeholder === "{date}") return datePart
    return timePart
  })
}

function toBranchLiteralInTag(branch: BranchName): string {
  return branch.replaceAll("/", "-")
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
