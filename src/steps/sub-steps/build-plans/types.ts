import type { AppUpdatePlan, BranchName, ParsedTag, ValuesPath } from "../../../types.js"

/** `build-plans.ts`のvalues.yamlキャッシュ（chartAndApps単位で共有）を経由して内容を取得する関数 */
export type LoadValuesYamlContent = (
  cache: Map<ValuesPath, string>,
  valuesPath: ValuesPath,
) => Promise<string>

/**
 * 指定ブランチがchartリポジトリに実在するかを返す関数。`build-plans.ts`側でGitLabクライアント・
 * chartのprojectId・chartAndApps単位のキャッシュを閉じ込めて組み立てるため、サブステップ側は
 * GitLabを知らずにブランチの実在確認だけを依頼できる（`LoadValuesYamlContent`と同じ考え方）。
 */
export type BranchExists = (branch: BranchName) => Promise<boolean>

/**
 * 1アプリ分の「最新タグの判定結果」。`resolveLatestTag()`が組み立て、イメージタグの
 * 差分判定（`image-tag-target.ts`）が使う。
 *
 * `pointsAtTrackedHead`は、values.yamlに書かれている現在値が「追跡ブランチの現在のHEADを
 * 指すタグ」かどうかを返す。true なら、たとえより新しい名前のタグが存在してもデプロイされる
 * 中身は変わらないため更新しない（T-037）。
 */
export type LatestTagResolution = {
  readonly tag: ParsedTag
  readonly pointsAtTrackedHead: (currentValue: string) => boolean
}

/**
 * 1アプリ分の書き換え箇所（target）を1つずつ処理する間のアキュムレータ。イメージタグ側と
 * Helm向き先ブランチ側で`updates`の要素型だけが違うため、型引数`U`で共有する（T-024）。
 * `valuesYamlCache`/`modifiedValuesPaths`はchartAndApps単位で引き継ぐ。
 */
export type ApplyTargetsAcc<U> = {
  readonly valuesYamlCache: ReadonlyMap<ValuesPath, string>
  readonly modifiedValuesPaths: ReadonlySet<ValuesPath>
  readonly updates: readonly U[]
}

/**
 * 1つのchartAndApps分の更新計画を組み立てる過程のアキュムレータ。`build-plans.ts`の
 * `buildPlan()`がアプリを1つずつ処理するたびに更新し、同ファイル内の
 * 非公開関数`buildAppUpdatePlan()`との間で受け渡しする。
 */
export type BuildChartUpdateAcc = {
  readonly plans: readonly AppUpdatePlan[]
  readonly valuesYamlCache: ReadonlyMap<ValuesPath, string>
  readonly modifiedValuesPaths: ReadonlySet<ValuesPath>
}
