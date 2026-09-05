import { type Document, type Scalar, parseDocument, visit } from "yaml"

import type { AnchorName } from "../types.js"

// Helm chart の values.yaml を操作するための処理を置く。
// 今のところは YAMLアンカーでの値の取得・書き換えのみだが、Helm chart 固有の処理
// （Chart.yaml の読み込みなど）が今後必要になった場合もここに追加する。
//
// パース・シリアライズは `yaml` パッケージのDocument（AST）を使う。`js-yaml`は
// オブジェクトとしてしか読み書きできずアンカー名やコメント・クォートスタイルを保持
// できないため不採用（`config/`側のYAML読み込み`utils/yaml.ts`も含め、リポジトリ全体で
// `yaml`パッケージに統一している）。

/**
 * 配列要素にYAMLアンカーで名前を付けた構成（例: `variables: [&anchorName value, ...]`）向け。
 * ネストの深さやキー名に関わらずドキュメント全体を探索し、指定したアンカー名を持つ
 * スカラーノードを返す。`js-yaml`と異なり`yaml`パッケージはASTでアンカー名を保持するため、
 * この「配列要素をアンカー名で指す」構成を扱える
 */
function findAnchorNode(doc: Document, anchorName: AnchorName): Scalar | undefined {
  let found: Scalar | undefined
  visit(doc, {
    Scalar(_key, node) {
      if (node.anchor === anchorName) {
        found = node
        return visit.BREAK
      }
    },
  })
  return found
}

/**
 * YAML文字列から、指定したアンカー名を持つスカラー値を取得する。
 * 該当するアンカーが存在しない場合は undefined を返す。
 */
export function getValueAtAnchor(yamlContent: string, anchorName: AnchorName): string | undefined {
  const node = findAnchorNode(parseDocument(yamlContent), anchorName)
  return node === undefined ? undefined : String(node.value)
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
  const node = findAnchorNode(doc, anchorName)
  if (node === undefined) {
    throw new Error(`values.yaml にアンカー "${anchorName}" が見つかりません`)
  }
  node.value = newValue
  return doc.toString()
}
