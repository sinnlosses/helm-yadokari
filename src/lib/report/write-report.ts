import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

import type { ReportOutputPath } from "../../domain/types.js"
import { toReportOutputPath } from "../../domain/types.js"

/**
 * `REPORT_OUTPUT_PATH`未指定時の既定値。GitLabのartifactsは`$CI_PROJECT_DIR`配下のパスしか
 * 回収しないため、作業ディレクトリからの相対パスにする。
 */
export const DEFAULT_REPORT_OUTPUT_PATH: ReportOutputPath = toReportOutputPath("report/report.md")

/**
 * 整形済みのMarkdownを`path`へ書き出す。親ディレクトリが無ければ作る
 * （`path`はこれから書き出すファイルなので、`parseConfigRootPath()`と違い実在チェックはできない）。
 */
export function writeReport(path: ReportOutputPath, markdown: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, markdown)
}
