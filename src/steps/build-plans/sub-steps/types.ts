import type { BranchName, ValuesPath } from "../../../types/types.js"
import type { ValuesYamlDraft, ValuesYamlEntry } from "./values-yaml-draft.js"

/** `build-plans.ts`のvalues.yaml下書き（chartAndApps単位で共有）を経由して内容を取得する関数 */
export type LoadValuesYamlContent = (
  cache: Map<ValuesPath, ValuesYamlEntry>,
  valuesPath: ValuesPath,
) => Promise<string>

/**
 * 指定ブランチがchartリポジトリに実在するかを返す関数。`build-plans.ts`側でGitLabクライアント・
 * chartのprojectId・chartAndApps単位のキャッシュを閉じ込めて組み立てるため、サブステップ側は
 * GitLabを知らずにブランチの実在確認だけを依頼できる（`LoadValuesYamlContent`と同じ考え方）。
 */
export type BranchExists = (branch: BranchName) => Promise<boolean>

/**
 * 1アプリ分の書き換え箇所（target）を1つずつ処理する間のアキュムレータ。イメージタグ側と
 * Helm向き先ブランチ側で`updates`の要素型だけが違うため、型引数`U`で共有する。
 * `draft`はchartAndApps単位で引き継ぐ。以前は`valuesYamlCache`/`modifiedValuesPaths`の
 * 2フィールドだったが、`ValuesYamlDraft`1つにまとめた。
 */
export type ApplyTargetsAcc<U> = {
  readonly draft: ValuesYamlDraft
  readonly updates: readonly U[]
}
