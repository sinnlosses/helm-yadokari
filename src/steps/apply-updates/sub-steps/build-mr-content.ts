import type { Platform } from "../../../lib/platform/platform.js"
import type { BranchName, ConfigUnitPath, HelmBranchRefUpdate } from "../../../types/types.js"
import type { ImageTagEntry, MrContent, MrEntries } from "./shared/types.js"

/**
 * 1つの`(chartリポジトリ, 設定ユニット)`分のMRのタイトルと本文を組み立てる
 */
export function buildMrContent(
  platform: Platform,
  unitPath: ConfigUnitPath,
  entries: MrEntries,
): MrContent {
  return {
    title: buildMrTitle(unitPath, entries),
    description: buildMrDescription(platform, entries),
  }
}

/**
 * MRのタイトル。何が何件変わったかを種別ごとに示す。数える単位はアプリ数ではなく
 * values.yaml の書き換え箇所数で、本文のテーブルの行と同じ配列を数える。
 */
function buildMrTitle(unitPath: ConfigUnitPath, entries: MrEntries): string {
  const parts = [
    ...(entries.imageTags.length > 0 ? [`image tag ${entries.imageTags.length}`] : []),
    ...(entries.helmBranches.length > 0 ? [`helm branch ${entries.helmBranches.length}`] : []),
  ]
  const summary = parts.length > 0 ? ` (${parts.join(", ")})` : ""
  return `Auto MR by yadokari: update ${unitPath}${summary}`
}

function buildMrDescription(platform: Platform, entries: MrEntries): string {
  return [
    ...(entries.imageTags.length > 0 ? [buildImageTagSection(platform, entries.imageTags)] : []),
    ...(entries.helmBranches.length > 0
      ? [buildHelmBranchRefSection(entries.helmBranches, entries.helmBranchRef)]
      : []),
  ].join("\n\n")
}

/**
 * イメージタグの更新をテーブルにする。1アプリが複数箇所を書き換える場合は同じリポジトリの
 * 行が箇所の数だけ並ぶため、ファイル・アンカーの列で区別する。比較・パイプラインは
 * リンクテキストを付けずURLをそのまま載せ（GitLabが自動リンクする）、値が無いセルは `-` で埋める。
 */
function buildImageTagSection(platform: Platform, entries: readonly ImageTagEntry[]): string {
  return [
    "## イメージタグ",
    "",
    "| リポジトリ | 追跡ブランチ | ファイル | アンカー | 旧タグ | 新タグ | 比較 | パイプライン |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...entries.map(({ plan, update, webUrl, pipeline }) => {
      const cells = [
        plan.app.projectName,
        `\`${plan.app.branchToSync}\``,
        `\`${update.location.valuesPath}\``,
        `\`${update.location.anchorName}\``,
        `[${update.currentTag}](${platform.buildTagUrl(webUrl, update.currentTag)})`,
        `[${plan.latestTag.name}](${platform.buildTagUrl(webUrl, plan.latestTag.name)})`,
        platform.buildCompareUrl(webUrl, update.currentTag, plan.latestTag.name),
        pipeline ? pipeline.webUrl : "-",
      ]
      return `| ${cells.join(" | ")} |`
    }),
  ].join("\n")
}

/**
 * Helmの向き先ブランチの更新をテーブルにする。
 * 向き先ブランチは設定ユニット単位で共通の値なので、イメージタグとは別のセクションに置く。
 * 書き込み先はイメージタグの表と同じくファイル・アンカーの2列に分ける。
 * 新ブランチの列は全行が同じ`branchRef`になる。
 */
function buildHelmBranchRefSection(
  updates: readonly HelmBranchRefUpdate[],
  branchRef: BranchName,
): string {
  return [
    "## Helmの向き先ブランチ",
    "",
    "| 旧ブランチ | 新ブランチ | ファイル | アンカー |",
    "| --- | --- | --- | --- |",
    ...updates.map((update) => {
      const cells = [
        `\`${update.currentBranch}\``,
        `\`${branchRef}\``,
        `\`${update.location.valuesPath}\``,
        `\`${update.location.anchorName}\``,
      ]
      return `| ${cells.join(" | ")} |`
    }),
  ].join("\n")
}
