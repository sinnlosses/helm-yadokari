import { type Document, type Scalar, isScalar, parseDocument, visit } from "yaml"

import type { AnchorName, ValuesPath } from "../types/types.js"

// Helm chart の values.yaml を操作するための処理を置く。
// 今のところは YAMLアンカーでの値の取得・書き換えのみだが、Helm chart 固有の処理
// （Chart.yaml の読み込みなど）が今後必要になった場合もここに追加する。

/**
 * アンカーの値を引いた結果。`docs/requirements.md` 4.4節は values.yaml の
 * アンカーをスカラー値に付ける構成を前提としており、それ以外（マッピング・シーケンスに
 * 付いている）は前提が崩れた設定ミスとして「アンカー自体が無い」場合と区別する。
 */
export type AnchorValueLookup =
  | { readonly kind: "not_found" }
  | { readonly kind: "non_scalar" }
  | { readonly kind: "scalar"; readonly value: string }

/**
 * YAML文字列から、指定したアンカー名を持つスカラー値を引く。値が取れない理由（アンカー自体が
 * 無い / スカラー以外に付いている）を呼び出し元が区別できるよう、値そのものではなく
 * `AnchorValueLookup`を返す。`config/`側の設定ミスを1件目で止めず、理由ごとに違う文言で
 * 全問題を集めたい `verify-config.ts` 向け。
 */
export function lookupValueAtAnchor(
  yamlContent: string,
  anchorName: AnchorName,
): AnchorValueLookup {
  const lookup = findAnchorNode(parseDocument(yamlContent), anchorName)
  return lookup.kind === "scalar" ? { kind: "scalar", value: String(lookup.node.value) } : lookup
}

/**
 * YAML文字列から、指定したアンカー名を持つスカラー値を取得する。
 * 該当するアンカーが存在しない場合、およびアンカーがスカラー以外（マッピング・シーケンス）に
 * 付いている場合は例外を投げる（メッセージで区別する）。chartリポジトリ側のvalues.yamlから
 * アンカーが消えた・想定と違う位置に付け直されたケース向けで、config/側の設定ミス検知には
 * `lookupValueAtAnchor()`を使う。
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
 * YAML文字列内の、指定したアンカー名を持つスカラー値だけを書き換え、更新後のYAML文字列を返す。
 * ASTノードを直接書き換えて再シリアライズするため、他の要素・インデント・アンカー記法自体は
 * そのまま維持される。
 */
export function setValueAtAnchor(
  yamlContent: string,
  anchorName: AnchorName,
  newValue: string,
): string {
  const doc = parseDocument(yamlContent)
  const lookup = findAnchorNode(doc, anchorName)
  if (lookup.kind === "scalar") {
    lookup.node.value = newValue
    return doc.toString()
  }
  if (lookup.kind === "non_scalar") {
    throw new Error(
      `values.yaml のアンカー "${anchorName}" はスカラー値に付いていません（マッピングまたはシーケンスに付いています）`,
    )
  }
  throw new Error(`values.yaml にアンカー "${anchorName}" が見つかりません`)
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
 * ネストの深さやキー名に関わらずドキュメント全体を探索し、指定したアンカー名を持つノードを探す。
 * スカラー以外のノード種別（マッピング・シーケンス）も見つけたうえで区別できるよう、
 * `Scalar` に限定せず全ノード種別を対象に探索する。
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
