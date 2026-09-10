import { existsSync } from "node:fs"
import { join } from "node:path"

import { MAX_UNIT_DEPTH, UNIT_PATH_SEPARATOR } from "../../domain/config-unit.js"
import type { ChartDirName, ConfigUnitPath, LocalPath } from "../../types/types.js"
import { toChartDirName, toConfigUnitPath, toLocalPath } from "../../types/types.js"
import { listSubdirectories } from "../../utils/fs.js"
import { CONFIG_YAML_FILE_NAME, REGISTRY_YAML_FILE_NAME } from "./schema.js"

/** 1つのchartディレクトリと、その配下の走査で見つかった設定ユニットの`unitPath`一覧 */
export type ChartUnits = {
  readonly chartDirName: ChartDirName
  readonly chartDirPath: LocalPath
  readonly unitPaths: readonly ConfigUnitPath[]
}

/** 設定ユニットのディレクトリを、chartディレクトリからの相対パスのセグメント列で表したもの */
type UnitSegments = readonly string[]

/**
 * 1つのchartディレクトリを走査し、`config.yaml`を持つディレクトリ（＝設定ユニット）の
 * `unitPath`一覧を集める（階層の検証込み。`findUnitPaths()`が深さ・入れ子の設定エラーを
 * 例外でスローする）。`registry.yaml`が無いディレクトリは配下ごと無視する（走査対象の
 * chartとみなさない）。
 */
export function scanChartDir(configDirPath: LocalPath, chartDir: string): readonly ChartUnits[] {
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
 * 1つのchartディレクトリ配下から、`config.yaml`を持つディレクトリ（＝設定ユニット）の
 * `unitPath`を集める。深さ0・深さ3以上・入れ子はいずれも設定エラーとして例外をスローする
 * （`docs/requirements.md` 4.4節。なぜ走査を深さで打ち切らないかは`docs/architecture.md`）。
 */
function findUnitPaths(chartDirPath: LocalPath): readonly ConfigUnitPath[] {
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
function collectUnitSegments(dirPath: LocalPath, segments: UnitSegments): readonly UnitSegments[] {
  const here = existsSync(join(dirPath, CONFIG_YAML_FILE_NAME)) ? [segments] : []
  const deeper = listSubdirectories(dirPath).flatMap((childDir) =>
    collectUnitSegments(toLocalPath(join(dirPath, childDir)), [...segments, childDir]),
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
