import { existsSync } from "node:fs"
import { join } from "node:path"

import { z } from "zod"

import { DEFAULT_TAG_TEMPLATE, validateTagFormat } from "../../domain/tag-format.js"
import type { AnchorTarget, TagNaming } from "../../types/types.js"
import {
  toAnchorName,
  toBranchName,
  toProjectId,
  toProjectName,
  toValuesPath,
} from "../../types/types.js"
import { parseYamlFile } from "../../utils/yaml.js"

/**
 * `config/` の3ファイル（`chart.yaml` / `config.yaml` / `anchors.yaml`）のZodスキーマ。
 * スキーマの仕様（何をどう書くか）は `docs/requirements.md` 4.4節が正典。
 */

export const ChartYamlSchema = z.object({
  chart: z.object({
    projectId: z.number().int().transform(toProjectId),
    projectName: z.string().min(1).transform(toProjectName),
    mrTargetBranch: z.string().min(1, "mrTargetBranch は空にできません").transform(toBranchName),
  }),
})

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
 * `apps[].tagNaming`のZodスキーマ。`mode`を判別子にする判別共用体。テンプレート文字列
 * そのものの妥当性検証（プレースホルダの過不足）は`validateTagFormat()`に委ねる。
 */
const TagNamingTemplateSchema = z.object({
  mode: z.literal("template"),
  template: z
    .string()
    .min(1, "template は空にできません")
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
    }),
})

/** `semver`モードは追加のフィールドを持たない（プレリリース除外などのオプションは設けない） */
const TagNamingSemverSchema = z.object({ mode: z.literal("semver") })

const TagNamingSchema = z.discriminatedUnion("mode", [
  TagNamingTemplateSchema,
  TagNamingSemverSchema,
])

/** `apps[].tagNaming`省略時の既定値。`docs/requirements.md` 4.1節・4.4節が正典 */
const DEFAULT_TAG_NAMING: TagNaming = { mode: "template", template: DEFAULT_TAG_TEMPLATE }

/** config.yaml側。運用値のみ（chart構造はanchors.yaml側が持つ） */
const AppOperationalSchema = z.object({
  projectId: z.number().int().transform(toProjectId),
  projectName: z.string().min(1).transform(toProjectName),
  branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
  tagNaming: TagNamingSchema.optional().transform((v) => v ?? DEFAULT_TAG_NAMING),
})

const HelmOperationalSchema = z.object({
  branchToSync: z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
})

export const ConfigYamlSchema = z.object({
  helm: HelmOperationalSchema.optional(),
  apps: z.array(AppOperationalSchema),
})

/**
 * anchors.yaml側。1app分のchart構造（`chart[]`）に加え、`config.yaml`側と紐付けて
 * 整合性検証するための`projectId`/`projectName`を重複して持つ
 */
const AnchorsAppSchema = z.object({
  projectId: z.number().int().transform(toProjectId),
  projectName: z.string().min(1).transform(toProjectName),
  chart: z.array(AnchorTargetSchema).min(1, "chart は1件以上指定してください"),
})

const AnchorsHelmSchema = z.object({
  chart: z.array(AnchorTargetSchema).min(1, "chart は1件以上指定してください"),
})

const AnchorsYamlSchema = z.object({
  helm: AnchorsHelmSchema.optional(),
  apps: z.array(AnchorsAppSchema),
})

export type AnchorsApp = z.infer<typeof AnchorsAppSchema>

export type Anchors = {
  readonly apps: readonly AnchorsApp[]
  readonly helmChart: readonly AnchorTarget[] | undefined
}

/**
 * config.yamlと同じ設定ユニットのディレクトリにある`anchors.yaml`を読み込む。
 * 存在しない場合は空扱い（その設定ユニットに1件もappが無いケースを許容するため）。
 */
export function loadAnchors(unitDirPath: string): Anchors {
  const path = join(unitDirPath, "anchors.yaml")
  if (!existsSync(path)) return { apps: [], helmChart: undefined }
  const parsed = parseYamlFile(path, AnchorsYamlSchema)
  return { apps: parsed.apps, helmChart: parsed.helm?.chart }
}
