import type { FileUpdate, ValuesPath } from "../../../../types/types.js"

/**
 * 1つのvaluesPathについての下書き状態。`content`は現在の内容（fetch直後は書き換え前、
 * 書き換え後は書き換え後の内容）、`modified`はこのchartAndAppsの処理中に1箇所でも
 * 書き換えたかどうか。
 */
export type ValuesYamlEntry = {
  readonly content: string
  readonly modified: boolean
}

/**
 * 1つのchartAndAppsを処理する間の「values.yamlの下書き状態」。valuesPathごとに現在の内容と
 * 書き換えたかどうかを1つのMapにまとめて持つ。
 *
 * 以前は`valuesYamlCache`（内容のキャッシュ）と`modifiedValuesPaths`（書き換えた印）を
 * 別々に持ち回っており、`build-plans.ts`の`buildAppUpdatePlan()`が段階ごとに2フィールドを
 * 手作業で詰め替えていた。また「書き換えた印は付いているのに内容が無い」組み合わせを型で
 * 防げず、`buildFileUpdates()`が実行時のinternal errorでチェックしていた。書き換え後の内容と
 * 「書き換えた」印を常に同じエントリに乗せることで、その組み合わせが型上あり得なくする。
 */
export type ValuesYamlDraft = ReadonlyMap<ValuesPath, ValuesYamlEntry>

/** 書き換え後の内容を積んだ新しい下書きを返す（引数の下書きは変更しない） */
export function writeValuesYamlDraft(
  draft: ValuesYamlDraft,
  valuesPath: ValuesPath,
  content: string,
): ValuesYamlDraft {
  return new Map(draft).set(valuesPath, { content, modified: true })
}

/**
 * GitLabから読んだ内容を書き換え扱いせずに積んだ新しい下書きを返す（引数の下書きは変更しない）。
 * `modified`なエントリが`writeValuesYamlDraft()`経由でしか生まれないことを、
 * 読み込み用の入口を分けることで保っている。
 */
export function cacheValuesYamlDraft(
  draft: ValuesYamlDraft,
  valuesPath: ValuesPath,
  content: string,
): ValuesYamlDraft {
  return new Map(draft).set(valuesPath, { content, modified: false })
}

/**
 * 書き換えのあったファイルだけを取り出す。`modified`なエントリは`writeValuesYamlDraft()`
 * を経由してしか作られず必ず`content`を伴うため、以前存在した「書き換えたのに内容が無い」
 * internal errorはこの型設計では起こり得ない。
 */
export function toFileUpdates(draft: ValuesYamlDraft): readonly FileUpdate[] {
  return [...draft.entries()]
    .filter(([, entry]) => entry.modified)
    .map(([valuesPath, entry]) => ({ valuesPath, content: entry.content }))
}
