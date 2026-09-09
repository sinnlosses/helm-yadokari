import type { ChartDirName, ConfigUnitPath } from "../types/types.js"
import { toConfigUnitPath } from "../types/types.js"

/** `unitPath` のセグメントの区切り（ディレクトリの区切りをそのまま使う） */
export const UNIT_PATH_SEPARATOR = "/"

/**
 * `unitPath`（設定ユニットのディレクトリのchartディレクトリからの相対パス）に許す深さの上限。
 * 下限（深さ1）は「セグメントが空でないこと」の検証に含まれる。
 */
export const MAX_UNIT_DEPTH = 2

/**
 * `TARGET_UNITS`環境変数の1エントリを`ConfigUnitPath`として受け入れられる形かどうかの検証。
 * 受理するのは深さ1〜2で、それ以外の深さと空のセグメントを含むものには undefined を返す
 * （深さの制約は `docs/requirements.md` 4.4節）。
 * セグメントがGitLabブランチ名として妥当かは検証しない（同 4.2節）。
 */
export function parseConfigUnitPath(raw: string): ConfigUnitPath | undefined {
  const segments = raw.split(UNIT_PATH_SEPARATOR)
  if (segments.length > MAX_UNIT_DEPTH) return undefined
  if (segments.some((segment) => segment.length === 0)) return undefined
  return toConfigUnitPath(raw)
}

/**
 * 「どの設定ユニットで起きたか」を人に見せる表示用の文字列（`<chartDirName>/<unitPath>`）を
 * 組み立てる。ログ・エラーメッセージ・検証結果の報告でのみ使う表示専用の値のため、
 * 取り違えうる識別子ではなく素の`string`として返す。
 */
export function buildConfigUnitLocation(
  chartDirName: ChartDirName,
  unitPath: ConfigUnitPath,
): string {
  return `${chartDirName}${UNIT_PATH_SEPARATOR}${unitPath}`
}
