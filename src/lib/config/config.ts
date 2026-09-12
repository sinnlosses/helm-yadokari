import type { ConfigRootPath, ConfigUnit, LocalPath } from "../../types/types.js"
import { toConfigRootPath } from "../../types/types.js"
import { listSubdirectories } from "../../utils/fs.js"
import type { ChartDirUnits } from "./find-config-units.js"
import { findConfigUnits } from "./find-config-units.js"
import { loadConfigUnits } from "./load-config-unit.js"
import type { ConfigTarget } from "./limit-to-target.js"
import { NO_TARGET, assertTargetMatched, selectChartDirs, selectTargetConfigUnits } from "./limit-to-target.js"
import { validateTagFormatConsistency } from "./validate.js"

/** `CONFIG_ROOT_PATH`・コマンドライン引数のどちらも省略されたときに読む設定ディレクトリ */
export const DEFAULT_CONFIG_ROOT_PATH: ConfigRootPath = toConfigRootPath("config")

/**
 * `config/`配下を読み込んだ結果。`configUnits`だけを持つ形にしてあるのは、
 * chartリポジトリ横断のグローバル設定を将来足すときに戻り値の形を変えずに済ませるため。
 */
export type LoadedConfig = {
  readonly configUnits: readonly ConfigUnit[]
}

/**
 * `config/<chartディレクトリ>/registry.yaml` + `config/<chartディレクトリ>/<unitPath>/config.yaml`
 * というディレクトリ構成を読み込む。`target`（`TARGET_CHART` / `TARGET_UNITS`）を明示的に
 * 指定したときだけ、該当が無ければ例外をスローする（未指定時は0件でもエラーにしない）。
 */
export function loadConfig(configRootPath: ConfigRootPath, target: ConfigTarget = NO_TARGET): LoadedConfig {
  const allChartDirs = listSubdirectories(configRootPath)

  const targetUnits = selectTargetUnits(configRootPath, allChartDirs, target)
  const configUnits = targetUnits.flatMap(loadConfigUnits)
  validateTagFormatConsistency(configUnits)
  assertTargetMatched(target, allChartDirs, configUnits)

  return { configUnits }
}

/**
 * `config/`配下を走査して見つけた設定ユニットのうち、`target`に合致するものだけを返す。
 * `allChartDirs`を呼び出し側から受け取るのは、絞り込む前の一覧が`assertTargetMatched()`の
 * エラーメッセージにも要るため。
 */
function selectTargetUnits(
  configRootPath: LocalPath,
  allChartDirs: readonly string[],
  target: ConfigTarget,
): readonly ChartDirUnits[] {
  const chartDirs = selectChartDirs(allChartDirs, target)
  const chartUnitsList = chartDirs.flatMap((dir) => findConfigUnits(configRootPath, dir))
  return selectTargetConfigUnits(chartUnitsList, target)
}
