import { type Document, type Scalar, parseDocument, visit } from "yaml"

import type { AnchorName, DotPath, ImageTagLocation } from "../types.js"

// Helm chart の values.yaml を操作するための処理を置く。
// 今のところは dotパス/YAMLアンカーでの値の取得・書き換えのみだが、Helm chart 固有の処理
// （Chart.yaml の読み込みなど）が今後必要になった場合もここに追加する。
//
// パース・シリアライズは `yaml` パッケージのDocument（AST）で統一する。`js-yaml`は
// オブジェクトとしてしか読み書きできずアンカー名やコメント・クォートスタイルを保持
// できないため、以前はdotパス用（js-yaml）とアンカー用（yaml）で2ライブラリ併用して
// いたが、`yaml`のgetIn()/setIn()/hasIn()がdotパス的なキー配列での操作もサポートして
// いるため統一した（副産物として、書き換え対象以外のコメント・クォートスタイルも
// 概ね保持されるようになった）。

/**
 * YAML文字列から dotパス（例: "image.tag"）で指定した値を取得する。
 * パスが存在しない、または途中がオブジェクトでない場合は undefined を返す。
 */
export function getValueAtPath(yamlContent: string, dotPath: DotPath): string | undefined {
  const doc = parseDocument(yamlContent)
  const keys = dotPath.split(".")
  if (!doc.hasIn(keys)) return undefined

  const value: unknown = doc.getIn(keys)
  return value === undefined || value === null ? undefined : String(value)
}

/**
 * YAML文字列の dotパスで指定した値を書き換え、更新後のYAML文字列を返す。
 * ASTノードを直接書き換えて再シリアライズするため、書き換え対象以外のコメントや
 * クォートスタイルは概ね保持される。
 */
export function setValueAtPath(yamlContent: string, dotPath: DotPath, newValue: string): string {
  const doc = parseDocument(yamlContent)
  const keys = dotPath.split(".")
  if (!doc.hasIn(keys)) {
    throw new Error(`values.yaml にパス "${dotPath}" が存在しません`)
  }
  doc.setIn(keys, newValue)
  return doc.toString()
}

/**
 * 配列要素にYAMLアンカーで名前を付けた構成（例: `variables: [&anchorName value, ...]`）向け。
 * ネストの深さやキー名に関わらずドキュメント全体を探索し、指定したアンカー名を持つ
 * スカラーノードを返す。`js-yaml`と異なり`yaml`パッケージはASTでアンカー名を保持するため、
 * dotパスでは表現できない「配列要素をアンカー名で指す」構成を扱える
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
 * そのまま維持される（`setValueAtPath`と異なり、書き換え対象以外の書式が壊れない）。
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

/**
 * `chart.imageTagKey`（dotパス）/`chart.imageTagAnchor`（YAMLアンカー名）のうち
 * 指定されている方に応じて、values.yaml内のイメージタグの値を取得する
 */
export function getImageTag(yamlContent: string, location: ImageTagLocation): string | undefined {
  return "imageTagKey" in location
    ? getValueAtPath(yamlContent, location.imageTagKey)
    : getValueAtAnchor(yamlContent, location.imageTagAnchor)
}

/** {@link getImageTag} と対になる書き込み版 */
export function setImageTag(
  yamlContent: string,
  location: ImageTagLocation,
  newValue: string,
): string {
  return "imageTagKey" in location
    ? setValueAtPath(yamlContent, location.imageTagKey, newValue)
    : setValueAtAnchor(yamlContent, location.imageTagAnchor, newValue)
}
