import { z } from "zod"

import { validateTagFormat } from "../../domain/tag-format.js"
import type { AnchorLocation, ProjectName } from "../../domain/types.js"
import {
  toAccessTokenEnvName,
  toAnchorName,
  toBranchName,
  toGroupId,
  toGroupName,
  toProjectId,
  toProjectName,
  toValuesPath,
} from "../../domain/types.js"

/**
 * `config/` の3種のファイル（`registry.yaml` / `versions.yaml` / `locations.yaml`）のZodスキーマ。
 * スキーマの仕様（何をどう書くか）は `docs/requirements.md` 4.4節が正典。
 */

/** chartリポジトリ単位の設定ファイル名 */
export const REGISTRY_YAML_FILE_NAME = "registry.yaml"

/** 設定ユニット単位の設定ファイル名（よく触る値） */
export const VERSIONS_YAML_FILE_NAME = "versions.yaml"

/** 設定ユニット単位の設定ファイル名（`values.yaml`内の書き込み位置） */
export const LOCATIONS_YAML_FILE_NAME = "locations.yaml"

/**
 * `apps.<名前>[]`（イメージタグの書き込み先）と`helm[]`（Helm向き先ブランチの
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
 * `projectId`はGitLabの数値IDとGitHubの`owner/repo`の両方を受け、`ProjectId`（文字列）へ
 * 寄せる。既存の`config/`のYAML（数値表記）を書き換えずに済ませるための書式
 */
const ProjectIdSchema = z
  .union([z.number().int(), z.string().min(1)])
  .transform((v) => toProjectId(String(v)))

/**
 * `registry.yaml`の`appSpecs[].tagFormat`のZodスキーマ。
 *
 * 既定値は持たせず必須にしているのは、ソースリポジトリごとに実際のタグ形式が違い、
 * 既定に当てはまらないappを黙って取りこぼすより明示させるほうが安全なため。
 * テンプレート文字列そのものの妥当性検証（プレースホルダの過不足）は`validateTagFormat()`に委ねる。
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
 * registry.yaml側の1app分。
 *
 * ソースリポジトリのタグ形式（`tagFormat`）の台帳。
 * 設定ユニット側は`projectName`で引く
 */
const AppSpecSchema = z.object({
  projectId: ProjectIdSchema,
  projectName: z.string().min(1).transform(toProjectName),
  tagFormat: TagFormatSchema,
})

export type AppSpec = z.infer<typeof AppSpecSchema>

/**
 * `registry.yaml`トップレベルの`accessTokenEnv`。
 *
 * 必須にしているのは、書き漏らしたchartリポジトリが黙ってより広い権限のトークンへ流れる形を残さない
 * ため（`config/`は各チームがMRを送るセルフサービス方式なので、書き漏れは設定エラーで落とす）。
 * 名前の形式検証は`toAccessTokenEnvName()`（`domain/brand.ts`）に封じ込めてある
 */
const AccessTokenEnvNameSchema = z
  .string({
    error:
      "accessTokenEnv は必須です。registry.yaml のトップレベルに、このchartリポジトリの操作に " +
      "使うトークンが入っている環境変数名を書いてください（例: 'ACCESS_TOKEN_TEAM_A'）",
  })
  .transform((raw, ctx) => {
    try {
      return toAccessTokenEnvName(raw)
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : String(error),
      })
      return z.NEVER
    }
  })

/**
 * `registry.yaml`トップレベルの`group.groupId`（このchartリポジトリと、その配下の設定ユニットが
 * 追跡するソースリポジトリが属するGitLabのグループの数値ID）。
 *
 * `chartToUpdate`・`appSpecs[]`の`projectId`と同じく数値・文字列の両方を受ける
 * （既存の`config/`のYAMLの書き方に合わせるため）。形式検証は`toGroupId()`
 * （`domain/brand.ts`）に封じ込めてある
 */
const GroupIdSchema = z
  .union([z.number().int(), z.string().min(1)], {
    error:
      "group.groupId は必須です。registry.yaml の group に、このchartリポジトリとソースリポジトリが " +
      "属する GitLab グループの数値ID（グループのトップページに表示されるグループID）を " +
      "書いてください",
  })
  .transform((raw, ctx) => {
    try {
      return toGroupId(String(raw))
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : String(error),
      })
      return z.NEVER
    }
  })

/**
 * `registry.yaml`トップレベルの`group.groupName`（`groupId`が指すグループのフルパス）。
 *
 * `appSpecs[].projectName`と同じく人が読むためのラベルで、所属の照合は`groupId`で行う。
 * それでも必須にしているのは、IDだけでは設定を読む人がどのグループを指しているか分からず、
 * グループがリネームされたことにも気づけないため（実在チェックがGitLab上の現在のフルパスと
 * 突き合わせる）。形式検証は`toGroupName()`（`domain/brand.ts`）に封じ込めてある
 */
const GroupNameSchema = z
  .string({
    error:
      "group.groupName は必須です。registry.yaml の group に、groupId が指す GitLab グループの " +
      "フルパスを書いてください（例: 'my-group' / 'my-group/sub-group'）",
  })
  .transform((raw, ctx) => {
    try {
      return toGroupName(raw)
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : String(error),
      })
      return z.NEVER
    }
  })

/**
 * `registry.yaml`トップレベルの`group`。
 *
 * 必須にしているのは`accessTokenEnv`と同じ理由で、書き漏らしたchartリポジトリが黙って
 * 所属の照合をすり抜ける形を残さないため。`accessTokenEnv`が「どのトークンを使うか」の宣言なのに
 * 対し、こちらは「そのトークンがどこまで届いてよいか」の宣言にあたる
 */
const GroupSchema = z.object(
  {
    groupId: GroupIdSchema,
    groupName: GroupNameSchema,
  },
  {
    error:
      "group は必須です。registry.yaml のトップレベルに、このchartリポジトリとソースリポジトリが " +
      "属する GitLab グループの groupId（数値ID）と groupName（フルパス）を書いてください",
  },
)

export const RegistryYamlSchema = z.object({
  accessTokenEnv: AccessTokenEnvNameSchema,
  group: GroupSchema,
  chartToUpdate: z.object({
    projectId: ProjectIdSchema,
    projectName: z.string().min(1).transform(toProjectName),
    mrTargetBranch: z.string().min(1, "mrTargetBranch は空にできません").transform(toBranchName),
  }),
  appSpecs: z.array(AppSpecSchema),
})

/** app名をキーにしたマップ。キーは`registry.yaml`の`appSpecs[].projectName`と突き合わせる */
function appMapSchema<T extends z.ZodType>(value: T) {
  return z
    .record(z.string().min(1, "app名は空にできません"), value)
    .transform(
      (record): ReadonlyMap<ProjectName, z.output<T>> =>
        new Map(Object.entries(record).map(([name, v]) => [toProjectName(name), v])),
    )
}

/** `versions.yaml`のZodスキーマ */
export const VersionsYamlSchema = z.object({
  branchRef: z
    .string({
      error:
        "branchRef は必須です。versions.yaml に、Helmの向き先ブランチ名を書いてください" +
        "（locations.yaml の helm[] とセットで指定します）",
    })
    .min(1, "branchRef は空にできません")
    .transform(toBranchName),
  branchToSync: appMapSchema(
    z.string().min(1, "branchToSync は空にできません").transform(toBranchName),
  ),
})

const AppLocationsSchema = z.array(AnchorLocationSchema).min(1, "apps の各appは1件以上指定してください")

/**
 * `locations.yaml`のZodスキーマ。
 *
 * chartリポジトリは「値を定義するブランチ」と「値を受け取ってk8sリソースを構築するブランチ」の
 * 2ブランチ構成という前提のため、`helm[]`は必須（`docs/requirements.md` 4.4節）
 */
export const LocationsYamlSchema = z.object({
  helm: z
    .array(AnchorLocationSchema, {
      error:
        "helm は必須です。locations.yaml に、Helmの向き先ブランチの書き込み先" +
        "（valuesPath + anchor）を書いてください（versions.yaml の branchRef とセットで指定します）",
    })
    .min(1, "helm は1件以上指定してください"),
  apps: appMapSchema(AppLocationsSchema),
})
