import { z } from "zod"

import { validateTagFormat } from "../../domain/tag-format.js"
import type { AnchorTarget } from "../../types/types.js"
import {
  toAnchorName,
  toBranchName,
  toProjectId,
  toProjectName,
  toValuesPath,
} from "../../types/types.js"

/**
 * `config/` の2ファイル（`registry.yaml` / `config.yaml`）のZodスキーマ。
 * スキーマの仕様（何をどう書くか）は `docs/requirements.md` 4.4節が正典。
 */

/**
 * `apps[].chart[]`（イメージタグの書き込み先）と`helm.chart[]`（Helm向き先ブランチの
 * 書き込み先）はどちらも`valuesPath`+`anchor`という同じ形なので、スキーマも共有する
 * （型側も`AnchorTarget`を共有している）
 */
const AnchorTargetSchema = z
  .object({
    valuesPath: z.string().min(1, "valuesPath は空にできません").transform(toValuesPath),
    anchor: z.string().min(1, "anchor は空にできません").transform(toAnchorName),
  })
  .transform((v): AnchorTarget => ({ valuesPath: v.valuesPath, anchorName: v.anchor }))

/**
 * `registry.yaml`の`appSpecs[].tagFormat`のZodスキーマ。既定値は持たせず必須にしているのは、
 * ソースリポジトリごとに実際のタグ形式が違い、既定に当てはまらないappを黙って取りこぼすより
 * 明示させるほうが安全なため。テンプレート文字列そのものの妥当性検証（プレースホルダの
 * 過不足）は`validateTagFormat()`に委ねる。
 */
const TagFormatSchema = z
  .string({
    error:
      "tagFormat は必須です。registry.yaml の appSpecs[] に、ソースリポジトリのタグ形式を " +
      "{branch}/{date}/{time} で書いてください（例: '{branch}-build-at-{date}-{time}'）",
  })
  .transform((raw, ctx) => {
    try {
      return validateTagFormat(raw)
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : String(error),
      })
      return z.NEVER
    }
  })

/**
 * registry.yaml側の1app分。ソースリポジトリのタグ形式（`tagFormat`）の台帳で、
 * `projectId`をキーに`config.yaml`側の`apps[]`と結合する。`projectName`は
 * `config.yaml`側と食い違っていないかの検証用に重複して持つ
 */
const AppSpecSchema = z.object({
  projectId: z.number().int().transform(toProjectId),
  projectName: z.string().min(1).transform(toProjectName),
  tagFormat: TagFormatSchema,
})

export type AppSpec = z.infer<typeof AppSpecSchema>

export const RegistryYamlSchema = z.object({
  chartToUpdate: z.object({
    projectId: z.number().int().transform(toProjectId),
    projectName: z.string().min(1).transform(toProjectName),
    mrTargetBranch: z.string().min(1, "mrTargetBranch は空にできません").transform(toBranchName),
  }),
  appSpecs: z.array(AppSpecSchema),
})

/**
 * config.yaml側の1app分。運用値（`branchToSync`）とchart構造（`chart[]`）の両方を持つ。
 * `tagFormat`は持たず、`registry.yaml`の`appSpecs[]`から`projectId`で引く
 */
const AppSchema = z.object({
  projectId: z.number().int().transform(toProjectId),
  projectName: z.string().min(1).transform(toProjectName),
  branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
  chart: z.array(AnchorTargetSchema).min(1, "chart は1件以上指定してください"),
})

/**
 * `branchToSync`・`chart`のどちらも省略可能にしているのは、`helm`オブジェクト自体が
 * 丸ごと省略可能な設定だから。片方だけの指定を設定エラーにする判定（両方揃って初めて
 * 意味を持つ）はスキーマではなく`chart-and-apps.ts`の`resolveHelmTargetBranch()`が担う
 */
const HelmSchema = z.object({
  branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName).optional(),
  chart: z.array(AnchorTargetSchema).min(1, "chart は1件以上指定してください").optional(),
})

export const ConfigYamlSchema = z.object({
  helm: HelmSchema.optional(),
  apps: z.array(AppSchema),
})
