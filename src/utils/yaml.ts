import { readFileSync } from "node:fs"

import { parse as parseYamlString } from "yaml"
import type { z } from "zod"

/**
 * YAMLファイルを読み込み、指定した Zod スキーマでバリデーションする。
 * 失敗した場合は、ファイルパスとスキーマエラーの内容を含む例外をスローする。
 */
export function parseYamlFile<T>(filePath: string, schema: z.ZodType<T>): T {
  const raw = parseYamlString(readFileSync(filePath, "utf-8"))
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new Error(`${filePath} の形式が不正です: ${result.error.message}`)
  }
  return result.data
}
