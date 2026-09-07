import { type GitlabClient, getFileContent } from "../../../../lib/gitlab/gitlab.js"
import type { ChartRepoConfig, FileUpdate, ValuesPath } from "../../../../types/types.js"

/**
 * 1つのvaluesPathについての下書き状態。`modified`が指すのはこのchartAndAppsの処理中に
 * 書き換えたかどうかで、GitLabから読んだだけのエントリは`false`のまま。
 */
export type ValuesYamlEntry = {
  readonly content: string
  readonly modified: boolean
}

/**
 * 1つのchartAndAppsを処理する間の「values.yamlの下書き状態」。書き換え後の内容と「書き換えた」
 * 印を常に同じエントリに乗せるため、「印は付いているのに内容が無い」組み合わせが型上あり得ない。
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
 * を経由してしか作られず、必ず`content`を伴う。
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
