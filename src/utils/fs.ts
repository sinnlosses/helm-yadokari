import { readdirSync } from "node:fs"
import { resolve, sep } from "node:path"

/**
 * 指定パスが cwd() 配下に収まっているかを検証する。`..` を含む相対パスや
 * cwd() 外を指す絶対パスなど、パストラバーサルを試みるパスは例外をスローする。
 * label はエラーメッセージ内でそのパスを何と呼ぶか（例: "CONFIG_PATH"）を指定する。
 */
export function assertSafePath(inputPath: string, label = "パス"): void {
  const cwd = process.cwd()
  const resolved = resolve(cwd, inputPath)
  if (resolved !== cwd && !resolved.startsWith(cwd + sep)) {
    throw new Error(`${label} にパストラバーサルは使用できません: "${inputPath}"`)
  }
}

/**
 * 指定ディレクトリ直下のサブディレクトリ名を、アルファベット順にソートして返す。
 */
export function listSubdirectories(dirPath: string): string[] {
  return readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}
