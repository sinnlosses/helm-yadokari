import type { Config, LocalPath } from "../../types/types.js"
import { toLocalPath } from "../../types/types.js"
import { assertSafePath, listSubdirectories } from "../../utils/fs.js"
import { findConfigUnits } from "./find-config-units.js"
import { loadConfigUnits } from "./load-config-unit.js"
import type { ConfigTarget } from "./limit-to-target.js"
import { NO_TARGET, assertTargetMatched, selectChartDirs, selectTargetConfigUnits } from "./limit-to-target.js"
import { validateTagFormatConsistency } from "./validate.js"

/** `CONFIG_PATH`・コマンドライン引数のどちらも省略されたときに読む設定ディレクトリ */
export const DEFAULT_CONFIG_DIR_PATH: LocalPath = toLocalPath("config")

/**
 * `config/<chartディレクトリ>/registry.yaml` + `config/<chartディレクトリ>/<unitPath>/config.yaml`
 * というディレクトリ構成を読み込む。`target`（`TARGET_CHART` / `TARGET_UNITS`）を明示的に
 * 指定したときだけ、該当が無ければ例外をスローする（未指定時は0件でもエラーにしない）。
 */
export function loadConfig(configDirPath: LocalPath, target: ConfigTarget = NO_TARGET): Config {
  assertSafePath(configDirPath, "CONFIG_PATH")
  const allChartDirs = listSubdirectories(configDirPath)
  const chartDirs = selectChartDirs(allChartDirs, target)
  const chartUnitsList = chartDirs.flatMap((dir) => findConfigUnits(configDirPath, dir))
  const selected = selectTargetConfigUnits(chartUnitsList, target)
  const configUnits = selected.flatMap(loadConfigUnits)
  validateTagFormatConsistency(configUnits)
  assertTargetMatched(target, allChartDirs, configUnits)
  return { configUnits }
}
