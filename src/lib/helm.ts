import { dump as dumpYaml, load as parseYaml } from "js-yaml"

import type { DotPath } from "../types.js"
import { isPlainObject } from "../utils/object.js"

// Helm chart の values.yaml を操作するための処理を置く。
// 今のところは dotパスでの値の取得・書き換えのみだが、Helm chart 固有の処理
// （Chart.yaml の読み込みなど）が今後必要になった場合もここに追加する。

/**
 * YAML文字列から dotパス（例: "image.tag"）で指定した値を取得する。
 * パスが存在しない、または途中がオブジェクトでない場合は undefined を返す。
 */
export function getValueAtPath(yamlContent: string, dotPath: DotPath): string | undefined {
  const doc = parseYaml(yamlContent)
  if (!isPlainObject(doc)) return undefined

  const value = dotPath.split(".").reduce<unknown>((current, key) => {
    return isPlainObject(current) ? current[key] : undefined
  }, doc)
  return value === undefined || value === null ? undefined : String(value)
}

/**
 * YAML文字列の dotパスで指定した値を書き換え、更新後のYAML文字列を返す。
 * js-yaml で構文木ではなくオブジェクトとして読み書きするため、コメントや
 * キーの書式（クォート等）は保持されない。
 */
export function setValueAtPath(yamlContent: string, dotPath: DotPath, newValue: string): string {
  const doc = parseYaml(yamlContent)
  if (!isPlainObject(doc)) {
    throw new Error(`values.yaml のルートがオブジェクトではありません: "${dotPath}"`)
  }

  const keys = dotPath.split(".")
  const lastKey = keys.at(-1)
  if (lastKey === undefined) throw new Error(`dotパスが空です: "${dotPath}"`)

  const target = keys.slice(0, -1).reduce<Record<string, unknown>>((current, key) => {
    const next = current[key]
    if (!isPlainObject(next)) {
      throw new Error(`values.yaml にパス "${dotPath}" が存在しません（"${key}" で不整合）`)
    }
    return next
  }, doc)
  if (!(lastKey in target)) {
    throw new Error(`values.yaml にパス "${dotPath}" が存在しません`)
  }
  target[lastKey] = newValue

  return dumpYaml(doc)
}
