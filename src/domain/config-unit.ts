import type { ConfigUnitPath } from "../types/types.js"
import { toConfigUnitPath } from "../types/types.js"

const SEPARATOR = "/"

/**
 * `TARGET_UNITS`環境変数の1エントリを`ConfigUnitPath`として受け入れられる形かどうかの検証。
 * 受理するのは深さ2（`"<tenant>/<client>"`）のみで、それ以外の形の文字列には undefined を返す。
 * セグメントがGitLabブランチ名として妥当かは検証しない（`docs/requirements.md` 4.2節）。
 */
export function parseConfigUnitPath(raw: string): ConfigUnitPath | undefined {
  const parts = raw.split(SEPARATOR)
  const [first, second] = parts
  if (parts.length !== 2 || !first || !second) return undefined
  return toConfigUnitPath(raw)
}
