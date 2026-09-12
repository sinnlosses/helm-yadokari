import type { ChartDirName, ConfigUnit, ConfigUnitPath } from "../../types/types.js"
import { CONFIG_YAML_FILE_NAME, REGISTRY_YAML_FILE_NAME } from "./schema.js"
import type { ChartDirUnits } from "./find-config-units.js"

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
export const NO_TARGET: ConfigTarget = { chartDirName: undefined, units: undefined }

/**
 * `target.chartDirName`（`TARGET_CHART`）で走査するchartディレクトリを1件に絞り込む。
 * 省略時は`config/`直下の全chartディレクトリを返す。
 */
export function selectChartDirs(chartDirs: readonly string[], target: ConfigTarget): readonly string[] {
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
 * `target.units`（`TARGET_UNITS`）で設定ユニットを絞り込む。階層の検証（`findConfigUnits()`）は
 * 対象外の設定ユニットも含めて既に済んでいるため、ここでは走査結果の`unitPath`との照合だけを行う。
 * 指定した`unitPath`が1件でも見つからなければ例外をスローする。
 */
export function selectTargetConfigUnits(
  chartUnitsList: readonly ChartDirUnits[],
  target: ConfigTarget,
): readonly ChartDirUnits[] {
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
 * `target`を明示的に指定したのに絞り込み結果（`configUnits`）が0件のとき例外をスローする。
 * `target`未指定時は0件でもエラーにしない（`config/`が空でも正常終了する現状仕様）。
 */
export function assertTargetMatched(
  target: ConfigTarget,
  chartDirs: readonly string[],
  configUnits: readonly ConfigUnit[],
): void {
  if (isExplicitlyTargeted(target) && configUnits.length === 0) {
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
