import { getRequiredValueAtAnchor, setValueAtAnchor } from "../../../lib/helm.js"
import type {
  AnchorLocation,
  AppUpdatePlan,
  ImageTagUpdate,
  ParsedTag,
  TagName,
} from "../../../types/types.js"
import { toTagName } from "../../../types/types.js"
import { logger } from "../../../utils/logger.js"
import { reduceAsync } from "../../../utils/sequential.js"
import { withAppContext } from "../../shared/step-outcome.js"
import type { AppWithLatestTag, StageUpdatesAcc } from "./shared/types.js"
import type { ValuesYamlDraft, ValuesYamlSource } from "./shared/values-yaml-draft.js"
import { readValuesYamlDraft, writeValuesYamlDraft } from "./shared/values-yaml-draft.js"

/** 差分があったアプリの更新計画と、全アプリ分を積み終えた下書き */
export type StageImageTagUpdatesResult = {
  readonly plans: readonly AppUpdatePlan[]
  readonly draft: ValuesYamlDraft
}

type StageAppImageTagUpdatesAcc = StageUpdatesAcc<ImageTagUpdate>

/**
 * 1つの設定ユニット配下の全アプリについて、イメージタグの更新を1つの下書きに積み上げる。
 *
 * 同じvalues.yamlを参照する複数アプリ・複数箇所の変更が1つの下書きに積み重なるよう、
 * アプリは並列化せず1つずつ処理する。
 */
export async function stageImageTagUpdates(
  source: ValuesYamlSource,
  appsWithLatestTag: readonly AppWithLatestTag[],
): Promise<StageImageTagUpdatesResult> {
  const initialResult: StageImageTagUpdatesResult = { plans: [], draft: new Map() }
  return reduceAsync(appsWithLatestTag, initialResult, (result, appWithLatestTag) =>
    withAppContext(appWithLatestTag.app.projectName, () =>
      stageAppImageTagUpdates(source, result, appWithLatestTag),
    ),
  )
}

/**
 * 1アプリの`app.imageTagLocations`（1件以上）を先頭から順に`stageImageTagUpdate()`へ渡し、
 * 差分が1件でもあれば`AppUpdatePlan`を1件積む。差分が無ければ理由をログに出し、下書きだけを
 * 引き継ぐ（読み込んだvalues.yamlは次のアプリで使い回せる）。
 */
async function stageAppImageTagUpdates(
  source: ValuesYamlSource,
  result: StageImageTagUpdatesResult,
  { app, latestTag }: AppWithLatestTag,
): Promise<StageImageTagUpdatesResult> {
  const tag = latestTag.tag
  const initialAcc: StageAppImageTagUpdatesAcc = { draft: result.draft, updates: [] }
  const { draft, updates } = await reduceAsync(app.imageTagLocations, initialAcc, (acc, location) =>
    stageImageTagUpdate(source, tag, latestTag.trackedHeadTagNames, acc, location),
  )

  if (updates.length === 0) {
    logger.info({
      event: "check_app",
      projectName: app.projectName,
      result: "SKIPPED",
      reason: "already_up_to_date",
      tag: tag.name,
    })
    return { plans: result.plans, draft }
  }

  const plan: AppUpdatePlan = { app, latestTag: tag, updates }
  return { plans: [...result.plans, plan], draft }
}

/**
 * `app.imageTagLocations`のうち1箇所分について、下書き上の現在値（反映済みタグ）と最新タグを比較する。
 * 差分があれば書き換え内容を下書きに積み、`updates`にも積む（差分が無ければ読み込んだ
 * values.yamlを下書きに残すだけで`updates`には含めない）。
 *
 * 現在値が「追跡ブランチの現在のHEADを指すタグ」の場合も更新しない。タグ名は
 * 違ってもデプロイされる中身は同じで、更新しても意味が無いMRになるため。
 */
async function stageImageTagUpdate(
  source: ValuesYamlSource,
  latestTag: ParsedTag,
  trackedHeadTagNames: ReadonlySet<TagName>,
  acc: StageAppImageTagUpdatesAcc,
  location: AnchorLocation,
): Promise<StageAppImageTagUpdatesAcc> {
  const latestTagName = latestTag.name
  const { valuesYamlContent, draft } = await readValuesYamlDraft(
    source,
    acc.draft,
    location.valuesPath,
  )
  const currentTagName = toTagName(
    getRequiredValueAtAnchor(valuesYamlContent, location.anchorName, location.valuesPath),
  )

  // タグ名が同じ、またはタグ名は違っても追跡ブランチのHEADを指す（＝デプロイされる中身が同じ）ならスキップする
  if (currentTagName === latestTagName || trackedHeadTagNames.has(currentTagName)) {
    return { ...acc, draft }
  }

  return {
    draft: writeValuesYamlDraft(
      draft,
      location.valuesPath,
      setValueAtAnchor(valuesYamlContent, location.anchorName, latestTagName),
    ),
    updates: [...acc.updates, { location, currentTag: currentTagName }],
  }
}
