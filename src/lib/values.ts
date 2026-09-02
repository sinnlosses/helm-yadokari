import { dump as dumpYaml, load as parseYaml } from "js-yaml"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * YAML文字列から dotパス（例: "image.tag"）で指定した値を取得する。
 * パスが存在しない、または途中がオブジェクトでない場合は undefined を返す。
 */
export function getValueAtPath(yamlContent: string, dotPath: string): string | undefined {
  const doc = parseYaml(yamlContent)
  if (!isPlainObject(doc)) return undefined

  let current: unknown = doc
  for (const key of dotPath.split(".")) {
    if (!isPlainObject(current)) return undefined
    current = current[key]
  }
  return current === undefined || current === null ? undefined : String(current)
}

/**
 * YAML文字列の dotパスで指定した値を書き換え、更新後のYAML文字列を返す。
 * js-yaml で構文木ではなくオブジェクトとして読み書きするため、コメントや
 * キーの書式（クォート等）は保持されない。
 */
export function setValueAtPath(yamlContent: string, dotPath: string, newValue: string): string {
  const doc = parseYaml(yamlContent)
  if (!isPlainObject(doc)) {
    throw new Error(`values.yaml のルートがオブジェクトではありません: "${dotPath}"`)
  }

  const keys = dotPath.split(".")
  const lastKey = keys.at(-1)
  if (lastKey === undefined) throw new Error(`dotパスが空です: "${dotPath}"`)

  let current: Record<string, unknown> = doc
  for (const key of keys.slice(0, -1)) {
    const next = current[key]
    if (!isPlainObject(next)) {
      throw new Error(`values.yaml にパス "${dotPath}" が存在しません（"${key}" で不整合）`)
    }
    current = next
  }
  if (!(lastKey in current)) {
    throw new Error(`values.yaml にパス "${dotPath}" が存在しません`)
  }
  current[lastKey] = newValue

  return dumpYaml(doc)
}
