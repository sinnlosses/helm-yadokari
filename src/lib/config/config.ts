import { existsSync } from "node:fs"
import { join } from "node:path"

import type {
  ChartAndApps,
  ChartDirName,
  ChartRepoConfig,
  Config,
  ConfigUnitPath,
} from "../../types/types.js"
import { toChartDirName, toConfigUnitPath } from "../../types/types.js"
import { assertSafePath, listSubdirectories } from "../../utils/fs.js"
import { parseYamlFile } from "../../utils/yaml.js"
import { loadChartAndApps } from "./chart-and-apps.js"
import { ChartYamlSchema } from "./schema.js"

/** `CONFIG_PATH`・コマンドライン引数のどちらも省略されたときに読む設定ディレクトリ */
export const DEFAULT_CONFIG_DIR_PATH = "config"

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
 * `config/<chartディレクトリ>/chart.yaml` + `config/<chartディレクトリ>/<unitPath>/config.yaml`
 * （+ 同じディレクトリの`anchors.yaml`）という2階層固定のディレクトリ構成を再帰的に
 * 読み込む。chart.yaml のないディレクトリは無視する。`target` を指定すると該当chart・
 * 設定ユニットのみに絞り込む。`target`（`TARGET_CHART` / `TARGET_UNITS`）を明示的に指定した
 * ときに限り、指定したディレクトリ名・unitPathがtypo等でconfig/配下に見つからない場合、
 * および絞り込み結果として`chartAndAppsList`が1件も無い場合（該当ディレクトリに
 * `chart.yaml`や`config.yaml`が無い場合を含む）に例外をスローする（`target`未指定時は
 * 素通しで、0件でもエラーにしない）。設定ユニットごとに独立した`ChartAndApps`
 * （MRを作成する単位）を返すため、1つのchartディレクトリに複数の設定ユニットがあれば
 * `chartAndAppsList`には複数件が並ぶ。
 */
export function loadConfig(configDirPath: string, target: ConfigTarget = NO_TARGET): Config {
  assertSafePath(configDirPath, "CONFIG_PATH")

  const chartDirs = listSubdirectories(configDirPath)
  if (target.chartDirName && !chartDirs.includes(target.chartDirName)) {
    throw new Error(
      `TARGET_CHART で指定された "${target.chartDirName}" が config/ 配下に見つかりません。` +
        `config/ 直下のディレクトリ名を指定してください（実在するディレクトリ: ${formatChartDirs(chartDirs)}）`,
    )
  }
  const targetChartDirs = target.chartDirName ? [target.chartDirName] : chartDirs

  const missingUnits = (target.units ?? []).filter(
    (unit) => !unitDirExists(configDirPath, targetChartDirs, unit),
  )
  if (missingUnits.length > 0) {
    throw new Error(`TARGET_UNITS で指定された "${missingUnits.join(", ")}" が見つかりません`)
  }

  const chartAndAppsList = targetChartDirs.flatMap((chartDir): ChartAndApps[] => {
    const chartDirPath = join(configDirPath, chartDir)
    const chartYamlPath = join(chartDirPath, "chart.yaml")
    if (!existsSync(chartYamlPath)) return []
    const { chart } = parseYamlFile(chartYamlPath, ChartYamlSchema)
    return listUnitChartAndApps(chartDirPath, toChartDirName(chartDir), chart, target)
  })

  if (isExplicitlyTargeted(target) && chartAndAppsList.length === 0) {
    throw new Error(
      "TARGET_CHART / TARGET_UNITS で絞り込んだ結果、対象となるchartが1件も見つかりませんでした。" +
        "config/ 直下のディレクトリ名を指定し、そのディレクトリに chart.yaml と config.yaml が" +
        `両方存在するか確認してください（実在するディレクトリ: ${formatChartDirs(chartDirs)}）`,
    )
  }

  return { chartAndAppsList }
}

/** `config/` 直下に実在するディレクトリ名の一覧を、エラーメッセージ用に整形する */
function formatChartDirs(chartDirs: readonly string[]): string {
  return chartDirs.length > 0 ? chartDirs.join(", ") : "(なし)"
}

/** 指定chart群のいずれかの配下に、指定unitPathのディレクトリが存在するか */
function unitDirExists(
  configDirPath: string,
  chartDirs: readonly string[],
  unit: ConfigUnitPath,
): boolean {
  return chartDirs.some((chartDir) => existsSync(join(configDirPath, chartDir, unit)))
}

/**
 * 1つのchartディレクトリ配下の`<tenant>/<client>/`を走査し、`target`で絞り込んだうえで
 * 各ディレクトリを`loadChartAndApps()`に渡す。ここが持つのはディレクトリ構成の走査と
 * 絞り込みだけで、設定ファイルの読み込み・結合は`chart-and-apps.ts`が持つ。
 */
function listUnitChartAndApps(
  chartDirPath: string,
  chartDirName: ChartDirName,
  chart: ChartRepoConfig,
  target: ConfigTarget,
): ChartAndApps[] {
  const tenantDirs = listSubdirectories(chartDirPath).filter(
    (tenantDir) => !target.units || target.units.some((unit) => unit.startsWith(`${tenantDir}/`)),
  )
  return tenantDirs.flatMap((tenantDir) => {
    const tenantDirPath = join(chartDirPath, tenantDir)
    const clientDirs = listSubdirectories(tenantDirPath).filter(
      (clientDir) =>
        !target.units || target.units.includes(toConfigUnitPath(`${tenantDir}/${clientDir}`)),
    )
    return clientDirs.flatMap((clientDir): ChartAndApps[] => {
      const chartAndApps = loadChartAndApps(
        join(tenantDirPath, clientDir),
        chartDirName,
        toConfigUnitPath(`${tenantDir}/${clientDir}`),
        chart,
      )
      return chartAndApps ? [chartAndApps] : []
    })
  })
}

/** `target` で明示的に絞り込みが指定されているか（`TARGET_CHART` / `TARGET_UNITS` のいずれか） */
function isExplicitlyTargeted(target: ConfigTarget): boolean {
  return target.chartDirName !== undefined || target.units !== undefined
}
