import { z } from "zod"

import { validateTagFormat } from "../../domain/tag-format.js"
import type { AnchorLocation } from "../../types/types.js"
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

/** chartリポジトリ単位の設定ファイル名 */
export const REGISTRY_YAML_FILE_NAME = "registry.yaml"

/** 設定ユニット単位の設定ファイル名 */
export const CONFIG_YAML_FILE_NAME = "config.yaml"

/**
 * `apps[].locations[]`（イメージタグの書き込み先）と`helm.locations[]`（Helm向き先ブランチの
 * 書き込み先）はどちらも`valuesPath`+`anchor`という同じ形なので、スキーマも共有する
 * （型側も`AnchorLocation`を共有している）
 */
const AnchorLocationSchema = z
  .object({
    valuesPath: z.string().min(1, "valuesPath は空にできません").transform(toValuesPath),
    anchor: z.string().min(1, "anchor は空にできません").transform(toAnchorName),
  })
  .transform((v): AnchorLocation => ({ valuesPath: v.valuesPath, anchorName: v.anchor }))

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
 * config.yaml側の1app分。運用値（`branchToSync`）と書き込み位置（`locations[]`）の両方を持つ。
 * `tagFormat`は持たず、`registry.yaml`の`appSpecs[]`から`projectId`で引く
 */
const AppSchema = z.object({
  projectId: z.number().int().transform(toProjectId),
  projectName: z.string().min(1).transform(toProjectName),
  branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
  locations: z.array(AnchorLocationSchema).min(1, "locations は1件以上指定してください"),
})

export type ConfigApp = z.infer<typeof AppSchema>

/**
 * chartリポジトリは「値を定義するブランチ」と「値を受け取ってk8sリソースを構築するブランチ」の
 * 2ブランチ構成である、という前提のため`helm`自体を必須にする。書き込む値（`branchRef`）と
 * 書き込み先（`locations[]`）も両方揃って初めて意味を持つので、片方だけの指定はここで設定エラーに
 * なる（`docs/requirements.md` 4.4節）。
 */
const HelmSchema = z.object(
  {
    branchRef: z
      .string({
        error: "helm.branchRef は必須です（helm.locations とセットで指定してください）",
      })
      .min(1, "helm.branchRef は空にできません")
      .transform(toBranchName),
    locations: z
      .array(AnchorLocationSchema, {
        error: "helm.locations は必須です（helm.branchRef とセットで指定してください）",
      })
      .min(1, "helm.locations は1件以上指定してください"),
  },
  {
    error:
      "helm は必須です。chartリポジトリは値を定義するブランチとk8sリソースを構築するブランチの " +
      "2ブランチ構成のため、config.yaml に helm.branchRef（向き先ブランチ名）と " +
      "helm.locations[]（書き込み先の valuesPath + anchor）を書いてください",
  },
)

export type HelmConfig = z.infer<typeof HelmSchema>

export const ConfigYamlSchema = z.object({
  helm: HelmSchema,
  apps: z.array(AppSchema),
})
