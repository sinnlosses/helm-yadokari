import { existsSync } from "node:fs"
import { join } from "node:path"

import type { ChartAndApps, ChartDirName, Config, ConfigUnitPath, LocalPath } from "../../types/types.js"
import { toChartDirName, toLocalPath } from "../../types/types.js"
import { assertSafePath, listSubdirectories } from "../../utils/fs.js"
import type { ChartUnits } from "./chart-and-apps.js"
import { loadUnitChartAndApps } from "./chart-and-apps.js"
import { CONFIG_YAML_FILE_NAME, REGISTRY_YAML_FILE_NAME } from "./schema.js"
import { findUnitPaths } from "./unit-scan.js"
import { validateTagFormatConsistency } from "./validate.js"

/** `CONFIG_PATH`・コマンドライン引数のどちらも省略されたときに読む設定ディレクトリ */
export const DEFAULT_CONFIG_DIR_PATH: LocalPath = toLocalPath("config")

/**
 * 特定のchartディレクトリ・特定の設定ユニット（複数可）に処理対象を絞り込むためのフィルタ。
 * 手動トリガー時に全chart/全設定ユニットではなく一部だけを実行したい場合に使う
 * （`TARGET_CHART` / `TARGET_UNITS` 環境変数由来）。
 */
export type ConfigTarget = {
  readonly chartDirName: ChartDirName | undefined
  readonly units: readonly ConfigUnitPath[] | undefined
}

/** `target` を省略したとき（全chart・全設定ユニットを対象にする）の既定値 */
const NO_TARGET: ConfigTarget = { chartDirName: undefined, units: undefined }

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

/**
 * `target.chartDirName`（`TARGET_CHART`）で走査するchartディレクトリを1件に絞り込む。
 * 省略時は`config/`直下の全chartディレクトリを返す。
 */
function selectChartDirs(chartDirs: readonly string[], target: ConfigTarget): readonly string[] {
  if (target.chartDirName === undefined) return chartDirs
  if (!chartDirs.includes(target.chartDirName)) {
    throw new Error(
      `TARGET_CHART で指定された "${target.chartDirName}" が config/ 配下に見つかりません。` +
        `config/ 直下のディレクトリ名を指定してください（実在するディレクトリ: ${formatChartDirs(chartDirs)}）`,
    )
  }
  return [target.chartDirName]
}

/**
 * 1つのchartディレクトリを走査し、`config.yaml`を持つディレクトリ（＝設定ユニット）の
 * `unitPath`一覧を集める（階層の検証込み。`findUnitPaths()`が深さ・入れ子の設定エラーを
 * 例外でスローする）。`registry.yaml`が無いディレクトリは配下ごと無視する（走査対象の
 * chartとみなさない）。
 */
function scanChartDir(configDirPath: LocalPath, chartDir: string): readonly ChartUnits[] {
  const chartDirPath = toLocalPath(join(configDirPath, chartDir))
  if (!existsSync(join(chartDirPath, REGISTRY_YAML_FILE_NAME))) return []
  return [
    {
      chartDirName: toChartDirName(chartDir),
      chartDirPath,
      unitPaths: findUnitPaths(chartDirPath),
    },
  ]
}

/**
 * `target.units`（`TARGET_UNITS`）で設定ユニットを絞り込む。階層の検証（`scanChartDir()`）は
 * 対象外の設定ユニットも含めて既に済んでいるため、ここでは走査結果の`unitPath`との照合だけを行う。
 * 指定した`unitPath`が1件でも見つからなければ例外をスローする。
 */
function selectTargetUnits(
  chartUnitsList: readonly ChartUnits[],
  target: ConfigTarget,
): readonly ChartUnits[] {
  const { units } = target
  if (units === undefined) return chartUnitsList

  const foundUnitPaths = chartUnitsList.flatMap((chartUnits) => chartUnits.unitPaths)
  const missingUnits = units.filter((unit) => !foundUnitPaths.includes(unit))
  if (missingUnits.length > 0) {
    throw new Error(
      `TARGET_UNITS で指定された "${missingUnits.join(", ")}" が見つかりません` +
        `（${CONFIG_YAML_FILE_NAME} を持つディレクトリの、chartディレクトリからの相対パスを指定してください）`,
    )
  }

  return chartUnitsList.map((chartUnits) => ({
    ...chartUnits,
    unitPaths: chartUnits.unitPaths.filter((unitPath) => units.includes(unitPath)),
  }))
}

/**
 * `target`を明示的に指定したのに絞り込み結果（`chartAndAppsList`）が0件のとき例外をスローする。
 * `target`未指定時は0件でもエラーにしない（`config/`が空でも正常終了する現状仕様）。
 */
function assertTargetMatched(
  target: ConfigTarget,
  chartDirs: readonly string[],
  chartAndAppsList: readonly ChartAndApps[],
): void {
  if (isExplicitlyTargeted(target) && chartAndAppsList.length === 0) {
    throw new Error(
      "TARGET_CHART / TARGET_UNITS で絞り込んだ結果、対象となるchartが1件も見つかりませんでした。" +
        `config/ 直下のディレクトリ名を指定し、そのディレクトリに ${REGISTRY_YAML_FILE_NAME} と ${CONFIG_YAML_FILE_NAME} が` +
        `両方存在するか確認してください（実在するディレクトリ: ${formatChartDirs(chartDirs)}）`,
    )
  }
}

/** `target` で明示的に絞り込みが指定されているか（`TARGET_CHART` / `TARGET_UNITS` のいずれか） */
function isExplicitlyTargeted(target: ConfigTarget): boolean {
  return target.chartDirName !== undefined || target.units !== undefined
}

/** `config/` 直下に実在するディレクトリ名の一覧を、エラーメッセージ用に整形する */
function formatChartDirs(chartDirs: readonly string[]): string {
  return chartDirs.length > 0 ? chartDirs.join(", ") : "(なし)"
}
