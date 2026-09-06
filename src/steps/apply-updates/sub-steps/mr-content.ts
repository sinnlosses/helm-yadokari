import { buildCompareUrl, buildTagUrl } from "../../../lib/gitlab/web-url.js"
import type {
  AppUpdatePlan,
  ClientId,
  GitLabUrl,
  HelmTargetBranchUpdate,
  ImageTagUpdate,
  ProjectId,
  TenantId,
} from "../../../types/types.js"

/**
 * MRのタイトル・本文（Markdown）を組み立てる、外部I/Oを持たない純粋な文字列組み立て。
 * GitLab APIから解決済みのプロジェクトweb URLは呼び出し元が事前に集めて値として渡す。
 */

/**
 * 向き先ブランチの更新は`helm.chart[]`をvaluesPath一致でアプリに振り分けた結果なので、
 * 同じ書き込み先が複数アプリの計画に現れうる。件数・表示は書き込み先（valuesPath+anchorName）
 * 単位で一意にする
 */
function uniqueHelmTargetBranchUpdates(
  plans: readonly AppUpdatePlan[],
): readonly HelmTargetBranchUpdate[] {
  const byTarget = new Map(
    plans.flatMap((plan) =>
      plan.helmTargetBranchUpdates.map((update): [string, HelmTargetBranchUpdate] => [
        `${update.target.valuesPath}#${update.target.anchorName}`,
        update,
      ]),
    ),
  )
  return [...byTarget.values()]
}

/**
 * MRのタイトル。何が何件変わったかを種別ごとに示す（以前は「N app image tag(s)」と
 * 固定で、向き先ブランチだけが変わった場合もイメージタグが変わったように読めていた）。
 * 数える単位はアプリ数ではなく values.yaml の書き換え箇所数（1アプリが複数箇所を持つ
 * ケースも正しく数えるため）。`apply-updates.ts` がコミットメッセージにも流用する。
 */
export function buildMrTitle(
  tenantId: TenantId,
  clientId: ClientId,
  plans: readonly AppUpdatePlan[],
): string {
  const imageTagCount = plans.reduce((count, plan) => count + plan.updates.length, 0)
  const helmBranchCount = uniqueHelmTargetBranchUpdates(plans).length
  const parts = [
    ...(imageTagCount > 0 ? [`image tag ${imageTagCount}`] : []),
    ...(helmBranchCount > 0 ? [`helm branch ${helmBranchCount}`] : []),
  ]
  const summary = parts.length > 0 ? ` (${parts.join(", ")})` : ""
  return `Auto MR by yadokari: update ${tenantId}/${clientId}${summary}`
}

/**
 * イメージタグの更新1箇所分をテーブルの1行にする。1アプリが複数箇所を書き換える
 * 場合は同じリポジトリの行が箇所の数だけ並ぶため、ファイル・アンカーの列で区別する。
 * 比較・パイプラインはリンクテキストを付けずURLをそのまま載せ（GitLabが自動リンクする）、
 * 値が無いセルは `-` で埋める。
 */
function buildImageTagRow(webUrl: GitLabUrl, plan: AppUpdatePlan, update: ImageTagUpdate): string {
  const previousTagText = update.previousTagName
    ? `[${update.previousTagName}](${buildTagUrl(webUrl, update.previousTagName)})`
    : "(未設定)"
  const compareUrl = update.previousTagName
    ? buildCompareUrl(webUrl, update.previousTagName, plan.latestTag.name)
    : "-"
  const cells = [
    plan.app.projectName,
    `\`${plan.app.branchToSync}\``,
    `\`${update.target.valuesPath}\``,
    `\`${update.target.anchorName}\``,
    previousTagText,
    `[${plan.latestTag.name}](${buildTagUrl(webUrl, plan.latestTag.name)})`,
    compareUrl,
    plan.pipeline ? plan.pipeline.webUrl : "-",
  ]
  return `| ${cells.join(" | ")} |`
}

/**
 * Helmの向き先ブランチの更新をテーブルにする。
 * 向き先ブランチはclient単位で共通の値なので、イメージタグとは別のセクションに置く。
 * 書き込み先はイメージタグの表と同じくファイル・アンカーの2列に分ける。
 */
function buildHelmTargetBranchSection(updates: readonly HelmTargetBranchUpdate[]): string {
  return [
    "## Helmの向き先ブランチ",
    "",
    "| 旧ブランチ | 新ブランチ | ファイル | アンカー |",
    "| --- | --- | --- | --- |",
    ...updates.map((update) => {
      const previousBranchText = update.previousBranch ? `\`${update.previousBranch}\`` : "(未設定)"
      const cells = [
        previousBranchText,
        `\`${update.newBranch}\``,
        `\`${update.target.valuesPath}\``,
        `\`${update.target.anchorName}\``,
      ]
      return `| ${cells.join(" | ")} |`
    }),
  ].join("\n")
}

/**
 * 呼び出し元（`apply-updates.ts`）が`plans`に含まれる全`projectId`について事前に解決済みで
 * あることを前提とする。該当する`projectId`が無い場合はその前提が崩れているためエラーにする。
 */
function resolveWebUrl(
  webUrls: ReadonlyMap<ProjectId, GitLabUrl>,
  projectId: ProjectId,
): GitLabUrl {
  const webUrl = webUrls.get(projectId)
  if (webUrl === undefined) {
    throw new Error(`web URLが解決されていないprojectIdです: ${projectId}`)
  }
  return webUrl
}

/** イメージタグの行を持つplanだけがweb URLを必要とする（向き先ブランチの表にはリンクが無い） */
function plansWithImageTagRows(plans: readonly AppUpdatePlan[]): readonly AppUpdatePlan[] {
  return plans.filter((plan) => plan.updates.length > 0)
}

/** `buildMrDescription()`に渡す`webUrls`を解決するために必要な`projectId` */
export function webUrlProjectIds(plans: readonly AppUpdatePlan[]): readonly ProjectId[] {
  return plansWithImageTagRows(plans).map((plan) => plan.app.projectId)
}

export function buildMrDescription(
  webUrls: ReadonlyMap<ProjectId, GitLabUrl>,
  plans: readonly AppUpdatePlan[],
): string {
  const rows = plansWithImageTagRows(plans).flatMap((plan) => {
    const webUrl = resolveWebUrl(webUrls, plan.app.projectId)
    return plan.updates.map((update) => buildImageTagRow(webUrl, plan, update))
  })

  const imageTagSection = [
    "## イメージタグ",
    "",
    "| リポジトリ | 追跡ブランチ | ファイル | アンカー | 旧タグ | 新タグ | 比較 | パイプライン |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n")

  const helmUpdates = uniqueHelmTargetBranchUpdates(plans)
  return [
    ...(rows.length > 0 ? [imageTagSection] : []),
    ...(helmUpdates.length > 0 ? [buildHelmTargetBranchSection(helmUpdates)] : []),
  ].join("\n\n")
}
