import type { AppUpdatePlan, ValuesPath } from "../../../types.js"

/** `build-plans.ts`のvalues.yamlキャッシュ（chartAndApps単位で共有）を経由して内容を取得する関数 */
export type LoadValuesYamlContent = (
  cache: Map<ValuesPath, string>,
  valuesPath: ValuesPath,
) => Promise<string>

/**
 * 1つのchartAndApps分の更新計画を組み立てる過程のアキュムレータ。`build-plans.ts`の
 * `buildChartUpdate()`がアプリを1つずつ処理するたびに更新し、`app-update-plan.ts`の
 * `buildAppUpdatePlan()`との間で受け渡しする。
 */
export type BuildChartUpdateAcc = {
  readonly plans: readonly AppUpdatePlan[]
  readonly valuesYamlCache: ReadonlyMap<ValuesPath, string>
  readonly modifiedValuesPaths: ReadonlySet<ValuesPath>
}
