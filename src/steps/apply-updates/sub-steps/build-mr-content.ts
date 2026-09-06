import { buildCompareUrl, buildTagUrl } from "../../../lib/gitlab/web-url.js"
import type { ClientId, HelmTargetBranchUpdate, TenantId } from "../../../types/types.js"
import type { ImageTagEntry, MrEntries } from "./shared/types.js"

/**
 * MRのタイトルと本文（Markdown）
 */
export type MrContent = {
  readonly title: string
  readonly description: string
}

/**
 * 1つの`(chartリポジトリ, tenantId, clientId)`分のMRのタイトルと本文を組み立てる
 */
export function buildMrContent(
  tenantId: TenantId,
  clientId: ClientId,
  entries: MrEntries,
): MrContent {
  return {
    title: buildMrTitle(tenantId, clientId, entries),
    description: buildMrDescription(entries),
  }
}

/**
 * MRのタイトル。何が何件変わったかを種別ごとに示す（以前は「N app image tag(s)」と
 * 固定で、向き先ブランチだけが変わった場合もイメージタグが変わったように読めていた）。
 * 数える単位はアプリ数ではなく values.yaml の書き換え箇所数で、本文のテーブルの行と
 * 同じ配列を数える。
 */
function buildMrTitle(tenantId: TenantId, clientId: ClientId, entries: MrEntries): string {
  const parts = [
    ...(entries.imageTags.length > 0 ? [`image tag ${entries.imageTags.length}`] : []),
    ...(entries.helmBranches.length > 0 ? [`helm branch ${entries.helmBranches.length}`] : []),
  ]
  const summary = parts.length > 0 ? ` (${parts.join(", ")})` : ""
  return `Auto MR by yadokari: update ${tenantId}/${clientId}${summary}`
}

function buildMrDescription(entries: MrEntries): string {
  return [
    ...(entries.imageTags.length > 0 ? [buildImageTagSection(entries.imageTags)] : []),
    ...(entries.helmBranches.length > 0
      ? [buildHelmTargetBranchSection(entries.helmBranches)]
      : []),
  ].join("\n\n")
}

/**
 * イメージタグの更新をテーブルにする。1アプリが複数箇所を書き換える場合は同じリポジトリの
 * 行が箇所の数だけ並ぶため、ファイル・アンカーの列で区別する。比較・パイプラインは
 * リンクテキストを付けずURLをそのまま載せ（GitLabが自動リンクする）、値が無いセルは `-` で埋める。
 */
function buildImageTagSection(entries: readonly ImageTagEntry[]): string {
  return [
    "## イメージタグ",
    "",
    "| リポジトリ | 追跡ブランチ | ファイル | アンカー | 旧タグ | 新タグ | 比較 | パイプライン |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...entries.map(({ plan, update, webUrl }) => {
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
    }),
  ].join("\n")
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
