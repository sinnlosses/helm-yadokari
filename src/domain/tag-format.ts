import type {
  BranchName,
  ParsedTag,
  TagFormat,
  TagName,
  TagNaming,
  TagOrderKey,
} from "../types/types.js"
import { toTagFormat, toTagName } from "../types/types.js"

const REQUIRED_PLACEHOLDERS: readonly string[] = ["branch", "date"]
const OPTIONAL_PLACEHOLDERS: readonly string[] = ["time"]
const PLACEHOLDER_PATTERN = /\{(branch|date|time)\}/g
const ANY_PLACEHOLDER_PATTERN = /\{([^}]*)\}/g

/**
 * semver 2.0.0 の文法。先頭の`v`は任意で版としては無視し、プレリリース（`-`以降）と
 * ビルドメタデータ（`+`以降）を分けて取り出す。
 */
const SEMVER_PATTERN =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/

const NUMERIC_IDENTIFIER_PATTERN = /^\d+$/

// タグ名の{date}/{time}はJST（UTC+9固定）で組み立て・解釈する。日本にサマータイムは無いため
// オフセット計算で足りる（buildNewTagで足してparseTagで引く、単純に対称）。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

declare const creatableTagNamingBrand: unique symbol

/**
 * タグを自動作成できる命名規則（＝`{time}`を含む`template`）。`canCreateTag()`だけが生み出す。
 * 「テンプレートが`{time}`を含む」という条件は型の形では表せないため、検査を通ったことを
 * ブランドで表し、`buildNewTag()`の引数をこの型に限ることで検査漏れを型で防ぐ。
 */
export type CreatableTagNaming = Extract<TagNaming, { mode: "template" }> & {
  readonly [creatableTagNamingBrand]: never
}

/** `tagNaming.template`（`config.yaml`の`apps[].tagNaming`）を省略したときの既定値 */
export const DEFAULT_TAG_TEMPLATE: TagFormat = toTagFormat("{branch}-build-at-{date}-{time}")

/**
 * タグ命名規則のテンプレート文字列（`config.yaml`の`apps[].tagNaming.template`）の妥当性を
 * 検証する。`{branch}`と`{date}`はちょうど1回、`{time}`は0回か1回だけ含められ、それ以外の
 * プレースホルダは許可しない。
 */
export function validateTagFormat(raw: string): TagFormat {
  const knownPlaceholders = [...REQUIRED_PLACEHOLDERS, ...OPTIONAL_PLACEHOLDERS]
  const unknownPlaceholders = [...raw.matchAll(ANY_PLACEHOLDER_PATTERN)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined && !knownPlaceholders.includes(name))
  if (unknownPlaceholders.length > 0) {
    throw new Error(
      `tagNaming.template に未知のプレースホルダがあります: ${unknownPlaceholders.join(", ")}` +
        `（使えるのは {branch}/{date}/{time} のみです）: "${raw}"`,
    )
  }

  for (const placeholder of REQUIRED_PLACEHOLDERS) {
    if (countPlaceholder(raw, placeholder) !== 1) {
      throw new Error(
        `tagNaming.template には {${placeholder}} をちょうど1回含めてください: "${raw}"`,
      )
    }
  }
  for (const placeholder of OPTIONAL_PLACEHOLDERS) {
    if (countPlaceholder(raw, placeholder) > 1) {
      throw new Error(`tagNaming.template の {${placeholder}} は多くても1回までです: "${raw}"`)
    }
  }

  return toTagFormat(raw)
}

/**
 * タグ名を命名規則に照らして読み取る。読み取れない（＝そのappの候補にならない）タグには
 * undefinedを返す。`template`モードでは`branch`由来としてパースできるかどうかで判定し、
 * `semver`モードではタグ名に追跡ブランチが現れないためsemverとして読めるかどうかだけを見る
 * （由来の判定はHEADコミットを指しているかどうかで行う。`resolve-latest-tags.ts`）。
 */
export function parseTag(
  tagName: TagName,
  branch: BranchName,
  naming: TagNaming,
): ParsedTag | undefined {
  return naming.mode === "template"
    ? parseTemplateTag(tagName, branch, naming.template)
    : parseSemverTag(tagName, branch)
}

/**
 * 2つのタグの新しさを比べる（正なら`a`が新しい）。**タグの新しさを判断する唯一の入口**で、
 * 呼び出し側が順序キーの中身を読んで比べることはしない。順序キーが同値のときはタグ名の
 * 降順（＝ASCII順で大きいほうを新しいとみなす）で決め、必ず1件に絞れるようにする。
 */
export function compareTags(a: ParsedTag, b: ParsedTag): number {
  const byOrderKey = compareOrderKeys(a.orderKey, b.orderKey)
  return byOrderKey !== 0 ? byOrderKey : compareSegments(a.name, b.name)
}

/**
 * 渡されたタグ名のうち、命名規則で読み取れるものの中から最も新しいものを返す。該当する
 * タグがひとつもない場合は undefined を返す。呼び出し元は「タグ一覧全体」だけでなく、
 * 「HEADを指すタグの集合」のような絞り込み済みのタグ名リストを渡すこともある
 * （`resolveLatestTag()`）。
 */
export function findLatestParsedTag(
  tagNames: readonly TagName[],
  branch: BranchName,
  naming: TagNaming,
): ParsedTag | undefined {
  return tagNames
    .map((name) => parseTag(name, branch, naming))
    .filter((tag): tag is ParsedTag => tag !== undefined)
    .reduce<ParsedTag | undefined>((latest, current) => {
      if (!latest) return current
      return compareTags(current, latest) > 0 ? current : latest
    }, undefined)
}

/**
 * このツール自身がタグを作れる命名規則かどうかを判定する。作れるのは`{time}`を含む
 * `template`モードだけで、それ以外は生成名が秒単位で一意にならず、HEADが進むたびに
 * 既存タグと同名になって作成に失敗する（`docs/requirements.md` 4.1節）。
 */
export function canCreateTag(naming: TagNaming): naming is CreatableTagNaming {
  return naming.mode === "template" && countPlaceholder(naming.template, "time") === 1
}

/**
 * 現在時刻を元に、`naming`に従った新しいタグを組み立てる（GitLab上への作成はしない、名前の生成のみ）。
 */
export function buildNewTag(branch: BranchName, now: Date, naming: CreatableTagNaming): ParsedTag {
  const pad = (n: number) => String(n).padStart(2, "0")
  const jst = new Date(now.getTime() + JST_OFFSET_MS)
  const datePart = `${jst.getUTCFullYear()}${pad(jst.getUTCMonth() + 1)}${pad(jst.getUTCDate())}`
  const timePart = `${pad(jst.getUTCHours())}${pad(jst.getUTCMinutes())}${pad(jst.getUTCSeconds())}`
  return {
    name: toTagName(fillTagFormat(naming.template, branch, datePart, timePart)),
    branchName: branch,
    // タグ名は秒精度なので、順序キーもミリ秒を切り捨てる（同じタグ名をparseTagした
    // 結果と一致させるため）
    orderKey: [Math.floor(now.getTime() / 1000) * 1000],
  }
}

/**
 * `template`モードのタグ名を読み取る。`{time}`を含まないフォーマットでは時刻を0時0分0秒と
 * みなし、順序キーは日付までの精度になる。
 */
function parseTemplateTag(
  tagName: TagName,
  branch: BranchName,
  format: TagFormat,
): ParsedTag | undefined {
  const match = compileTagPattern(format, branch).exec(tagName)
  const datePart = match?.groups?.["date"]
  if (!datePart) return undefined
  const timePart = match?.groups?.["time"] ?? "000000"

  const year = Number(datePart.slice(0, 4))
  const month = Number(datePart.slice(4, 6))
  const day = Number(datePart.slice(6, 8))
  const hour = Number(timePart.slice(0, 2))
  const minute = Number(timePart.slice(2, 4))
  const second = Number(timePart.slice(4, 6))
  const builtAt = new Date(Date.UTC(year, month - 1, day, hour, minute, second) - JST_OFFSET_MS)

  return { name: tagName, branchName: branch, orderKey: [builtAt.getTime()] }
}

/**
 * `semver`モードのタグ名を読み取る。順序キーは semver 2.0.0 §11 の優先順位規則をそのまま
 * 表す（メジャー・マイナー・パッチの数値、プレリリースの有無、プレリリース識別子の並び）。
 * ビルドメタデータは順序に影響しないため順序キーに入れない。
 */
function parseSemverTag(tagName: TagName, branch: BranchName): ParsedTag | undefined {
  const [, major, minor, patch, prerelease] = SEMVER_PATTERN.exec(tagName) ?? []
  if (major === undefined || minor === undefined || patch === undefined) return undefined

  // プレリリース付きは同じ版のリリースより低い優先順位（§11.3）なので、識別子の並びより
  // 先に「プレリリースでないこと」を比べる
  const orderKey: TagOrderKey = [
    Number(major),
    Number(minor),
    Number(patch),
    prerelease === undefined ? 1 : 0,
    ...toPrereleaseSegments(prerelease),
  ]
  return { name: tagName, branchName: branch, orderKey }
}

/**
 * プレリリースの識別子を順序キーの要素に変換する。数字だけの識別子は数値として比較し
 * （§11.4.1）、それ以外はASCII順で比較する（§11.4.2）。
 */
function toPrereleaseSegments(prerelease: string | undefined): TagOrderKey {
  if (prerelease === undefined) return []
  return prerelease
    .split(".")
    .map((identifier) =>
      NUMERIC_IDENTIFIER_PATTERN.test(identifier) ? Number(identifier) : identifier,
    )
}

/** 順序キー同士を左から順に比べる。要素が尽きた側を小さいとみなす（§11.4.4） */
function compareOrderKeys(a: TagOrderKey, b: TagOrderKey): number {
  const length = Math.max(a.length, b.length)
  const comparisons = Array.from({ length }, (_, i) => compareSegments(a[i], b[i]))
  return comparisons.find((comparison) => comparison !== 0) ?? 0
}

/**
 * 順序キーの要素1つ分を比べる。数値と文字列が並んだ場合は数値を小さいものとして扱う
 * （semverの「数字だけの識別子は英数字の識別子より低い」＝§11.4.3）。文字列同士は
 * ロケール非依存のASCII順で比べる。
 */
function compareSegments(a: number | string | undefined, b: number | string | undefined): number {
  if (a === undefined || b === undefined) {
    return a === b ? 0 : a === undefined ? -1 : 1
  }
  if (typeof a === "number" && typeof b === "number") return Math.sign(a - b)
  if (typeof a === "number") return -1
  if (typeof b === "number") return 1
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * `format`と`branch`から、タグ名をパースするための正規表現を組み立てる。`{branch}`は
 * `branch`の具体値（"/"を"-"に置換済み）へのリテラル一致、`{date}`/`{time}`は名前付き
 * キャプチャグループにする。プレースホルダ以外の部分はリテラルとしてエスケープする。
 */
function compileTagPattern(format: TagFormat, branch: BranchName): RegExp {
  const branchLiteral = branch.replaceAll("/", "-")
  const toPatternPart = (placeholder: string | undefined): string => {
    if (placeholder === "branch") return escapeRegExp(branchLiteral)
    if (placeholder === "date") return "(?<date>\\d{8})"
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
        toPatternPart(match[1]),
      lastIndex: match.index + match[0].length,
    }),
    { source: "^", lastIndex: 0 },
  )

  return new RegExp(`${source}${escapeRegExp(format.slice(lastIndex))}$`)
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

/** 検証前の生文字列も数えられるよう、引数は`TagFormat`ではなく`string`で受ける */
function countPlaceholder(format: string, placeholder: string): number {
  return [...format.matchAll(new RegExp(`\\{${placeholder}\\}`, "g"))].length
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
