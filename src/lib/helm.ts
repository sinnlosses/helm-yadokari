/**
 * Helm chart の values.yaml を操作するための処理を置く。
 *
 * Chart.yaml の読み込みなど、Helm chart 固有の処理もここに入る。
 */

import { type Document, Scalar, isScalar, parseDocument, stringify, visit } from "yaml"

import type { AnchorName, ValuesPath } from "../domain/types.js"

/**
 * アンカーの値を引いた結果。
 *
 * `docs/requirements.md` 4.4節は values.yaml のアンカーをスカラー値に付ける構成を前提としており、
 * それ以外（マッピング・シーケンスに付いている）は前提が崩れた設定ミスとして「アンカー自体が無い」
 * 場合と区別する。
 */
export type AnchorValueLookup =
  | { readonly kind: "not_found" }
  | { readonly kind: "non_scalar" }
  | { readonly kind: "scalar"; readonly value: string }

/**
 * YAML文字列から、指定したアンカー名を持つスカラー値を引く。
 *
 * 値が取れない理由（アンカー自体が無い / スカラー以外に付いている）を呼び出し元が区別できるよう、
 * 値そのものではなく`AnchorValueLookup`を返す。`config/`側の設定ミスを1件目で止めず、
 * 理由ごとに違う文言で全問題を集めたい `remote-existence.ts` 向け。
 *
 * 値が null（`&a`だけ・`~`・`null`）のときは空文字を返す。
 */
export function lookupValueAtAnchor(
  yamlContent: string,
  anchorName: AnchorName,
): AnchorValueLookup {
  const lookup = findAnchorNode(parseDocument(yamlContent), anchorName)
  if (lookup.kind !== "scalar") return lookup
  return { kind: "scalar", value: lookup.node.value === null ? "" : String(lookup.node.value) }
}

/**
 * YAML文字列から、指定したアンカー名を持つスカラー値を取得する。
 *
 * 該当するアンカーが存在しない場合、およびアンカーがスカラー以外（マッピング・シーケンス）
 * に付いている場合は例外を投げる（メッセージで区別する）。
 * chartリポジトリ側のvalues.yamlからアンカーが消えた・想定と違う位置に付け直されたケース向けで、
 * config/側の設定ミス検知には`lookupValueAtAnchor()`を使う。
 */
export function getRequiredValueAtAnchor(
  yamlContent: string,
  anchorName: AnchorName,
  valuesPath: ValuesPath,
): string {
  const lookup = lookupValueAtAnchor(yamlContent, anchorName)
  if (lookup.kind === "scalar") return lookup.value
  if (lookup.kind === "non_scalar") {
    throw new Error(
      `values.yaml のアンカー "${anchorName}" はスカラー値に付いていません（マッピングまたはシーケンスに付いています） (valuesPath: ${valuesPath})`,
    )
  }
  throw new Error(
    `values.yaml にアンカー "${anchorName}" が見つかりません (valuesPath: ${valuesPath})`,
  )
}

/**
 * YAML文字列内の、指定したアンカー名を持つスカラー値の部分だけを置き換え、更新後のYAML文字列を返す。
 *
 * それ以外の部分（改行コード・BOM・インデント・コメント・他の値の書式）はバイト単位で保たれる。
 * 元の値の引用符の種類は保つが、新しい値が引用符なしではYAMLとして別の値に読まれる場合は
 * 引用符を付ける。値が空のアンカー（`- &a`）には、アンカー名との間に半角スペースを1つ挟んで書く。
 */
export function setValueAtAnchor(
  yamlContent: string,
  anchorName: AnchorName,
  newValue: string,
): string {
  const lookup = findAnchorNode(parseDocument(yamlContent), anchorName)
  if (lookup.kind === "scalar") {
    const { range, type } = lookup.node
    if (range === undefined || range === null) {
      throw new Error(`values.yaml のアンカー "${anchorName}" の位置を特定できません`)
    }
    const [start, end] = range
    const separator = start === end ? " " : ""
    // ブロックスカラー（`|`・`>`）の区間は末尾の改行まで含むので、それを残さないと次の行とつながる
    const trailingBreaks = /(?:\r?\n)*$/.exec(yamlContent.slice(start, end))?.[0] ?? ""
    return (
      yamlContent.slice(0, start) +
      separator +
      formatScalar(type, newValue) +
      trailingBreaks +
      yamlContent.slice(end)
    )
  }
  if (lookup.kind === "non_scalar") {
    throw new Error(
      `values.yaml のアンカー "${anchorName}" はスカラー値に付いていません（マッピングまたはシーケンスに付いています）`,
    )
  }
  throw new Error(`values.yaml にアンカー "${anchorName}" が見つかりません`)
}

function formatScalar(originalType: Scalar["type"], value: string): string {
  if (originalType === Scalar.QUOTE_SINGLE && !value.includes("\n")) {
    return `'${value.replaceAll("'", "''")}'`
  }
  if (originalType === Scalar.QUOTE_DOUBLE) return JSON.stringify(value)
  const plain = stringify(value, { lineWidth: 0 }).trimEnd()
  // flow形式の中ではこれらの文字が区切りとして読まれるため、平文では書かない
  return plain.includes("\n") || /[,[\]{}]/.test(plain) ? JSON.stringify(value) : plain
}

/**
 * `findAnchorNode()` の探索結果。書き換え（`setValueAtAnchor()`）はノードそのものを必要とするため、
 * 値に変換済みの`AnchorValueLookup`ではなくASTノードを持つ。
 */
type AnchorLookup =
  | { readonly kind: "not_found" }
  | { readonly kind: "non_scalar" }
  | { readonly kind: "scalar"; readonly node: Scalar }

/**
 * 配列要素にYAMLアンカーで名前を付けた構成（例: `variables: [&anchorName value, ...]`）向け。
 *
 * ネストの深さやキー名に関わらずドキュメント全体を探索し、指定したアンカー名を持つノードを探す。
 * スカラー以外のノード種別（マッピング・シーケンス）も見つけたうえで区別できるよう、
 * `Scalar`に限定せず全ノード種別を対象に探索する。
 */
function findAnchorNode(doc: Document, anchorName: AnchorName): AnchorLookup {
  let result: AnchorLookup = { kind: "not_found" }
  visit(doc, {
    Node(_key, node) {
      if (node.anchor !== anchorName) {
        // yaml の visit() は戻り値 undefined を「探索を続ける」と解釈する契約。
        return undefined
      }
      result = isScalar(node) ? { kind: "scalar", node } : { kind: "non_scalar" }
      return visit.BREAK
    },
  })
  return result
}
