import { existsSync } from "node:fs"
import { join } from "node:path"

import { MAX_UNIT_DEPTH, UNIT_PATH_SEPARATOR } from "../../domain/config-unit.js"
import type { ChartAndApps, ChartDirName, Config, ConfigUnitPath } from "../../types/types.js"
import { toChartDirName, toConfigUnitPath } from "../../types/types.js"
import { assertSafePath, listSubdirectories } from "../../utils/fs.js"
import { parseYamlFile } from "../../utils/yaml.js"
import { loadChartAndApps } from "./chart-and-apps.js"
import { CONFIG_YAML_FILE_NAME, REGISTRY_YAML_FILE_NAME, RegistryYamlSchema } from "./schema.js"
import { validateNoDuplicateProjectIds, validateTagFormatConsistency } from "./validate.js"

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

/** 1つのchartディレクトリと、その配下の走査で見つかった設定ユニットの`unitPath`一覧 */
type ChartUnits = {
  readonly chartDirName: ChartDirName
  readonly chartDirPath: string
  readonly unitPaths: readonly ConfigUnitPath[]
}

/** 設定ユニットのディレクトリを、chartディレクトリからの相対パスのセグメント列で表したもの */
type UnitSegments = readonly string[]

/**
 * `config/<chartディレクトリ>/registry.yaml` + `config/<chartディレクトリ>/<unitPath>/config.yaml`
 * というディレクトリ構成を読み込む。`config.yaml`を持つディレクトリが1つの設定ユニットで、
 * その深さは1〜2に限る（深さ0・深さ3以上・入れ子は`findUnitPaths()`が設定エラーとして
 * 例外をスローする）。registry.yaml のないディレクトリは配下ごと無視する。`target` を指定すると
 * 該当chart・設定ユニットのみに絞り込む。
 * `target`（`TARGET_CHART` / `TARGET_UNITS`）を明示的に指定したときに限り、指定した
 * ディレクトリ名・unitPathがtypo等でconfig/配下に見つからない場合、および絞り込み結果として
 * `chartAndAppsList`が1件も無い場合に例外をスローする（`target`未指定時は素通しで、0件でも
 * エラーにしない）。設定ユニットごとに独立した`ChartAndApps`（MRを作成する単位）を返すため、
 * 1つのchartディレクトリに複数の設定ユニットがあれば`chartAndAppsList`には複数件が並ぶ。
 * 組み立てた`chartAndAppsList`全体に対しては、同じ`projectId`のappが複数のchartリポジトリの
 * `registry.yaml`にまたがって登録されているとき`tagFormat`が食い違っていないかも検証する
 * （`validateTagFormatConsistency()`。同じchartリポジトリ配下ではtagFormatの台帳が
 * `registry.yaml`1つに集約されるため、この検証が働くのはchartリポジトリをまたぐ場合だけ）。
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

  // 走査と階層の検証は`target.units`で絞り込む前に、対象外の設定ユニットも含めて行う
  // （絞り込み実行でしか通らない検証を作らないため）。YAMLの読み込みは絞り込んだ後だけ
  const chartUnitsList = targetChartDirs.flatMap((chartDir): ChartUnits[] => {
    const chartDirPath = join(configDirPath, chartDir)
    if (!existsSync(join(chartDirPath, REGISTRY_YAML_FILE_NAME))) return []
    return [
      {
        chartDirName: toChartDirName(chartDir),
        chartDirPath,
        unitPaths: findUnitPaths(chartDirPath),
      },
    ]
  })

  const foundUnitPaths = chartUnitsList.flatMap((chartUnits) => chartUnits.unitPaths)
  const missingUnits = (target.units ?? []).filter((unit) => !foundUnitPaths.includes(unit))
  if (missingUnits.length > 0) {
    throw new Error(
      `TARGET_UNITS で指定された "${missingUnits.join(", ")}" が見つかりません` +
        `（${CONFIG_YAML_FILE_NAME} を持つディレクトリの、chartディレクトリからの相対パスを指定してください）`,
    )
  }

  const chartAndAppsList = chartUnitsList.flatMap((chartUnits) =>
    listUnitChartAndApps(chartUnits, target.units),
  )
  validateTagFormatConsistency(chartAndAppsList)

  if (isExplicitlyTargeted(target) && chartAndAppsList.length === 0) {
    throw new Error(
      "TARGET_CHART / TARGET_UNITS で絞り込んだ結果、対象となるchartが1件も見つかりませんでした。" +
        `config/ 直下のディレクトリ名を指定し、そのディレクトリに ${REGISTRY_YAML_FILE_NAME} と ${CONFIG_YAML_FILE_NAME} が` +
        `両方存在するか確認してください（実在するディレクトリ: ${formatChartDirs(chartDirs)}）`,
    )
  }

  return { chartAndAppsList }
}

/** `config/` 直下に実在するディレクトリ名の一覧を、エラーメッセージ用に整形する */
function formatChartDirs(chartDirs: readonly string[]): string {
  return chartDirs.length > 0 ? chartDirs.join(", ") : "(なし)"
}

/**
 * 1つのchartディレクトリ配下から、`config.yaml`を持つディレクトリ（＝設定ユニット）の
 * `unitPath`を集める。深さ0・深さ3以上・入れ子はいずれも設定エラーとして例外をスローする
 * （`docs/requirements.md` 4.4節。なぜ走査を深さで打ち切らないかは`docs/architecture.md`）。
 */
function findUnitPaths(chartDirPath: string): readonly ConfigUnitPath[] {
  const unitSegmentsList = collectUnitSegments(chartDirPath, [])

  if (unitSegmentsList.some((segments) => segments.length === 0)) {
    throw new Error(
      `${join(chartDirPath, CONFIG_YAML_FILE_NAME)}: ${CONFIG_YAML_FILE_NAME} が ${REGISTRY_YAML_FILE_NAME} と同じ階層にあります` +
        `（設定ユニットは chartディレクトリから数えて深さ1〜${MAX_UNIT_DEPTH} のディレクトリに置いてください）`,
    )
  }

  const tooDeep = unitSegmentsList.find((segments) => segments.length > MAX_UNIT_DEPTH)
  if (tooDeep !== undefined) {
    throw new Error(
      `${join(chartDirPath, ...tooDeep, CONFIG_YAML_FILE_NAME)}: 設定ユニットのディレクトリが深すぎます` +
        `（深さ${tooDeep.length}）。${CONFIG_YAML_FILE_NAME} は chartディレクトリから数えて` +
        `深さ1〜${MAX_UNIT_DEPTH} のディレクトリに置いてください`,
    )
  }

  const nested = findNestedPair(unitSegmentsList)
  if (nested !== undefined) {
    throw new Error(
      `${chartDirPath}: 設定ユニット "${nested.parent.join(UNIT_PATH_SEPARATOR)}" の配下に設定ユニット ` +
        `"${nested.child.join(UNIT_PATH_SEPARATOR)}" があり、入れ子になっています。入れ子だと固定ブランチ名 ` +
        `feature/yadokari/<unitPath> 同士がプレフィックス関係になり、Gitのrefが同一リポジトリに` +
        `共存できません`,
    )
  }

  return unitSegmentsList.map((segments) => toConfigUnitPath(segments.join(UNIT_PATH_SEPARATOR)))
}

/**
 * `config.yaml`を持つディレクトリを、深さの上限を設けず再帰的に集める。上限で打ち切らないのは、
 * 深すぎる位置に置かれた`config.yaml`を「見つからなかった」ではなく設定エラーとして
 * 報告するため。YAMLは読まず`config.yaml`の有無だけを見る。
 */
function collectUnitSegments(dirPath: string, segments: UnitSegments): readonly UnitSegments[] {
  const here = existsSync(join(dirPath, CONFIG_YAML_FILE_NAME)) ? [segments] : []
  const deeper = listSubdirectories(dirPath).flatMap((childDir) =>
    collectUnitSegments(join(dirPath, childDir), [...segments, childDir]),
  )
  return [...here, ...deeper]
}

/** 入れ子になっている設定ユニットの組（親が子の`unitPath`の先頭部分）を1件だけ返す */
function findNestedPair(
  unitSegmentsList: readonly UnitSegments[],
): { readonly parent: UnitSegments; readonly child: UnitSegments } | undefined {
  for (const child of unitSegmentsList) {
    const parent = unitSegmentsList.find((candidate) => isPrefixOf(candidate, child))
    if (parent !== undefined) return { parent, child }
  }
  return undefined
}

/** `a` が `b` より浅く、かつ `b` の先頭のセグメントが全て `a` と一致するか */
function isPrefixOf(a: UnitSegments, b: UnitSegments): boolean {
  return a.length < b.length && a.every((segment, index) => segment === b[index])
}

/**
 * 1つのchartディレクトリの`registry.yaml`を読み、`target.units`で絞り込んだ設定ユニットを
 * `loadChartAndApps()`に渡す。ここが持つのは走査結果の絞り込みだけで、設定ファイルの
 * 読み込み・結合は`chart-and-apps.ts`が持つ。`registry.yaml`の`appSpecs[]`（タグ形式の台帳）は
 * 1つのchartディレクトリで共有されるため、重複チェックもここで1回だけ行う。
 */
function listUnitChartAndApps(
  chartUnits: ChartUnits,
  units: readonly ConfigUnitPath[] | undefined,
): ChartAndApps[] {
  const registryYamlPath = join(chartUnits.chartDirPath, REGISTRY_YAML_FILE_NAME)
  const { chartToUpdate: chart, appSpecs } = parseYamlFile(registryYamlPath, RegistryYamlSchema)
  validateNoDuplicateProjectIds(registryYamlPath, appSpecs)
  return chartUnits.unitPaths
    .filter((unitPath) => !units || units.includes(unitPath))
    .map((unitPath) =>
      loadChartAndApps(
        join(chartUnits.chartDirPath, unitPath),
        chartUnits.chartDirName,
        unitPath,
        chart,
        appSpecs,
        registryYamlPath,
      ),
    )
}

/** `target` で明示的に絞り込みが指定されているか（`TARGET_CHART` / `TARGET_UNITS` のいずれか） */
function isExplicitlyTargeted(target: ConfigTarget): boolean {
  return target.chartDirName !== undefined || target.units !== undefined
}
