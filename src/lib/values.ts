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
export function setValueAtPath(yamlContent: string, dotPath: string, newValue: string): string {
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
