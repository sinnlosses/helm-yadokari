import { type GitlabClient, getFileContent } from "../../../../lib/gitlab/gitlab.js"
import type { ChartRepoConfig, FileUpdate, ValuesPath } from "../../../../types/types.js"

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

/** 下書きに無いvalues.yamlの取得元。chartリポジトリ1つ分の読み込み先を束ねただけの値 */
export type ValuesYamlSource = {
  readonly gitlab: GitlabClient
  readonly chart: ChartRepoConfig
}

/** `readValuesYamlDraft()`の結果。読み込んだ内容と、その内容を載せた下書き */
export type DraftValuesYaml = {
  readonly content: string
  readonly draft: ValuesYamlDraft
}

/**
 * values.yamlの現在値を下書き優先で取り出す。下書きに無いときだけGitLabから読むため、
 * 同じchartAndApps内の別アプリが既に書き換えた内容がそのまま次のアプリへ引き継がれる。
 * 渡した下書きは変更せず、読み込み結果を載せた新しい下書きを返す。
 */
export async function readValuesYamlDraft(
  source: ValuesYamlSource,
  draft: ValuesYamlDraft,
  valuesPath: ValuesPath,
): Promise<DraftValuesYaml> {
  const cached = draft.get(valuesPath)
  if (cached !== undefined) return { content: cached.content, draft }

  const { gitlab, chart } = source
  const content = await getFileContent(gitlab, chart.projectId, valuesPath, chart.mrTargetBranch)
  if (content === undefined) {
    throw new Error(`values.yaml が見つかりません: ${valuesPath}`)
  }
  return { content, draft: cacheValuesYamlDraft(draft, valuesPath, content) }
}

/** 書き換え後の内容を積んだ新しい下書きを返す（引数の下書きは変更しない） */
export function writeValuesYamlDraft(
  draft: ValuesYamlDraft,
  valuesPath: ValuesPath,
  content: string,
): ValuesYamlDraft {
  return new Map(draft).set(valuesPath, { content, modified: true })
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

/**
 * GitLabから読んだ内容を書き換え扱いせずに積んだ新しい下書きを返す。`modified`なエントリが
 * `writeValuesYamlDraft()`経由でしか生まれないことを、読み込み用の入口を分けることで保っている。
 */
function cacheValuesYamlDraft(
  draft: ValuesYamlDraft,
  valuesPath: ValuesPath,
  content: string,
): ValuesYamlDraft {
  return new Map(draft).set(valuesPath, { content, modified: false })
}
