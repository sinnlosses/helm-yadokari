import type { AnchorTarget, BranchName, HelmTargetBranchConfig } from "../../types/types.js"

/**
 * config.yamlの`helm.branchToSync`（書き込む値）とanchors.yamlの`helm.chart[]`
 * （書き込み先の`valuesPath`+`anchor`一覧）を、app単位の`HelmTargetBranchConfig`に振り分ける。
 * 振り分けは`helm.chart[].valuesPath`とapp自身の`chart[].valuesPath`の一致で行う（どのappの
 * values.yamlに書き込むかを、app側に専用フィールドを持たせず`valuesPath`だけで判定する）。
 * Helmの向き先ブランチは「1client内のapps全体で共通」という前提（T-013）のため、
 * `branchToSync`が指定されている場合は、そのconfig.yaml配下の全アプリの全`chart[].valuesPath`が
 * `helm.chart[]`でカバーされている必要がある（1つでも漏れていれば、そのvaluesPathだけ
 * 更新対象から漏れてしまう設定ミスとして例外をスローする）。`branchToSync`と`helm.chart[]`は
 * 片方だけの指定も設定ミスとして例外をスローする
 */
export function resolveHelmTargetBranch(
  configYamlPath: string,
  anchorsPath: string,
  branchToSync: BranchName | undefined,
  helmChart: readonly AnchorTarget[] | undefined,
  projectName: string,
  chart: readonly AnchorTarget[],
): HelmTargetBranchConfig | undefined {
  if (branchToSync === undefined && helmChart === undefined) return undefined
  if (branchToSync === undefined) {
    throw new Error(
      `${anchorsPath}: helm.chart が指定されていますが、${configYamlPath} の helm.branchToSync がありません`,
    )
  }
  if (helmChart === undefined) {
    throw new Error(
      `${configYamlPath}: helm.branchToSync が指定されていますが、${anchorsPath} の helm.chart がありません`,
    )
  }

  const appValuesPaths = [...new Set(chart.map((target) => target.valuesPath))]
  const uncoveredValuesPaths = appValuesPaths.filter(
    (valuesPath) => !helmChart.some((target) => target.valuesPath === valuesPath),
  )
  if (uncoveredValuesPaths.length > 0) {
    throw new Error(
      `${anchorsPath}: helm.branchToSync が指定されていますが、app "${projectName}" の valuesPath（${uncoveredValuesPaths.join(", ")}）が helm.chart[] に見つかりません（Helmの向き先ブランチはclient内の全appで共通のため、全appのvaluesPathを helm.chart[] に含めてください）`,
    )
  }

  const targets = helmChart.filter((target) => appValuesPaths.includes(target.valuesPath))
  return { branch: branchToSync, targets }
}
