import type {
  AppUpdatePlan,
  BranchName,
  ClientId,
  GitLabUrl,
  HelmTargetBranchUpdate,
  ImageTagUpdate,
  ProjectId,
  TagName,
  TenantId,
} from "../../types/types.js"
import { toBranchName, toGitLabUrl } from "../../types/types.js"
import { getOrFetch } from "../../utils/cache.js"

/**
 * MRのブランチ名・タイトル・本文（Markdown）を組み立てる。外部I/Oを持たない純粋な文字列組み立て
 * だけを置き、GitLab APIの呼び出しは呼び出し元から `ResolveWebUrl` として関数で受け取る。
 */

/** プロジェクトのweb URLを解決する関数（`lib/gitlab/gitlab.ts` の `getProjectWebUrl` を注入する） */
export type ResolveWebUrl = (projectId: ProjectId) => Promise<GitLabUrl>

/**
 * 1つの`(chartリポジトリ, tenantId, clientId)`分の更新に使う固定ブランチ名。
 * 同じGitLabプロジェクト内で複数のtenantId/clientIdのMRが共存するため、IDをブランチ名に
 * 含めて分離する。
 */
export function buildUpdateBranch(tenantId: TenantId, clientId: ClientId): BranchName {
  return toBranchName(`feature/yadokari/${tenantId}/${clientId}`)
}

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
 * プロジェクトのweb URL配下のページURLを組み立てる。`webUrl`はオリジンではなく
 * **プロジェクトのパスまで含んだURL**（`https://host/group/proj`、サブパス設置なら
 * `https://host/gitlab/group/proj`）なので、`new URL(path, webUrl)`ではなく連結で組み立てる
 * （前者はベースのパスを捨ててしまう）。タグ名のエスケープもここに閉じ込め、
 * 呼び出し側が`encodeURIComponent`を書かなくて済むようにする。
 */
function buildTagUrl(webUrl: GitLabUrl, tagName: TagName): GitLabUrl {
  return toGitLabUrl(`${webUrl}/-/tags/${encodeURIComponent(tagName)}`)
}

/** 2つのタグ間の比較ページURL（`buildTagUrl()`と同じ組み立て方） */
function buildCompareUrl(webUrl: GitLabUrl, from: TagName, to: TagName): GitLabUrl {
  return toGitLabUrl(`${webUrl}/-/compare/${encodeURIComponent(from)}...${encodeURIComponent(to)}`)
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

export async function buildMrDescription(
  resolveWebUrl: ResolveWebUrl,
  plans: readonly AppUpdatePlan[],
): Promise<string> {
  const initialAcc = {
    rows: [] as readonly string[],
    webUrlCache: new Map<ProjectId, GitLabUrl>(),
  }

  const { rows } = await plans
    .filter((plan) => plan.updates.length > 0)
    .reduce(async (accPromise, plan) => {
      const acc = await accPromise
      const webUrlCache = new Map(acc.webUrlCache)
      const webUrl = await getOrFetch(webUrlCache, plan.app.projectId, () =>
        resolveWebUrl(plan.app.projectId),
      )
      return {
        rows: [
          ...acc.rows,
          ...plan.updates.map((update) => buildImageTagRow(webUrl, plan, update)),
        ],
        webUrlCache,
      }
    }, Promise.resolve(initialAcc))

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
