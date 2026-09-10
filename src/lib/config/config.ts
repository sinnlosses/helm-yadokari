import type { Config, LocalPath } from "../../types/types.js"
import { toLocalPath } from "../../types/types.js"
import { assertSafePath, listSubdirectories } from "../../utils/fs.js"
import { loadUnitChartAndApps } from "./chart-and-apps.js"
import type { ConfigTarget } from "./select-units.js"
import { NO_TARGET, assertTargetMatched, selectChartDirs, selectTargetUnits } from "./select-units.js"
import { scanChartDir } from "./unit-scan.js"
import { validateTagFormatConsistency } from "./validate.js"

/** `CONFIG_PATH`・コマンドライン引数のどちらも省略されたときに読む設定ディレクトリ */
export const DEFAULT_CONFIG_DIR_PATH: LocalPath = toLocalPath("config")

/**
 * `config/<chartディレクトリ>/registry.yaml` + `config/<chartディレクトリ>/<unitPath>/config.yaml`
 * というディレクトリ構成を読み込む。設定ユニットごとに独立した`ChartAndApps`（MRを作成する単位）を
 * 返すため、1つのchartディレクトリに複数の設定ユニットがあれば`chartAndAppsList`には複数件が並ぶ。
 * 組み立てた`chartAndAppsList`全体に対しては、同じ`projectId`のappが複数のchartリポジトリの
 * `registry.yaml`にまたがって登録されているとき`tagFormat`が食い違っていないかも検証する
 * （`validateTagFormatConsistency()`。同じchartリポジトリ配下ではtagFormatの台帳が
 * `registry.yaml`1つに集約されるため、この検証が働くのはchartリポジトリをまたぐ場合だけ）。
 * `target`（`TARGET_CHART` / `TARGET_UNITS`）を明示的に指定したときに限り、指定した
 * ディレクトリ名・unitPathがtypo等でconfig/配下に見つからない場合、および絞り込み結果として
 * `chartAndAppsList`が1件も無い場合に例外をスローする（`target`未指定時は素通しで、0件でも
 * エラーにしない）。
 */
export function loadConfig(configDirPath: LocalPath, target: ConfigTarget = NO_TARGET): Config {
  assertSafePath(configDirPath, "CONFIG_PATH")
  const allChartDirs = listSubdirectories(configDirPath)
  const chartDirs = selectChartDirs(allChartDirs, target)
  const chartUnitsList = chartDirs.flatMap((dir) => scanChartDir(configDirPath, dir))
  const selected = selectTargetUnits(chartUnitsList, target)
  const chartAndAppsList = selected.flatMap(loadUnitChartAndApps)
  validateTagFormatConsistency(chartAndAppsList)
  assertTargetMatched(target, allChartDirs, chartAndAppsList)
  return { chartAndAppsList }
}
