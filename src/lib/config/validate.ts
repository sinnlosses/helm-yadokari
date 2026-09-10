import { buildConfigUnitLocation } from "../../domain/config-unit.js"
import type {
  AnchorTarget,
  ChartAndApps,
  LocalPath,
  ProjectId,
  ProjectName,
  TagFormat,
} from "../../types/types.js"
import type { AppSpec, ConfigApp } from "./schema.js"

/**
 * `registry.yaml` / `config.yaml` を読み込んだ後に、GitLabへ問い合わせなくても分かる設定ミス
 * （紐づけの矛盾・重複）を検証する。実体の有無（projectIdやブランチの実在）は
 * `scripts/lint/remote-existence/` の担当。
 */

/** `config.yaml`のapp1件と、`projectId`で引き当てた`registry.yaml`の`appSpecs[]`1件の組 */
export type LinkedApp = {
  readonly app: ConfigApp
  readonly appSpec: AppSpec
}

/**
 * `config.yaml`（運用値＋chart構造）の各appを、同じchartリポジトリの`registry.yaml`の`appSpecs[]`
 * （タグ形式の台帳）と`projectId`で突き合わせ、組にして返す。どちらのファイルも`projectId`を持つため、
 * 単純な存在チェックに加えて`projectName`の食い違い（コピペミス等）も検知できる
 * - config.yamlの各appに対応するprojectIdがregistry.yamlの`appSpecs[]`に無ければ、`tagFormat`が
 *   引けず最新タグを判定できない設定ミスとして例外をスローする
 * - 両方に存在するprojectIdについて、projectNameが一致しなければ例外をスローする
 * - `registry.yaml`の`appSpecs[]`にだけあってどの設定ユニットからも参照されないappは
 *   エラーにしない（そのchartリポジトリで一時的に更新対象から外している状態を許すため）
 *
 * 検証だけして捨てるのではなく組を返すのは、呼び出し元が同じ突き合わせをもう一度やらずに
 * 済ませるため。2回引くと、ここを通った時点で起こりえない「見つからない」を型と分岐に持つことになる。
 */
export function resolveProjectLinkage(
  configYamlPath: LocalPath,
  registryYamlPath: LocalPath,
  configApps: readonly ConfigApp[],
  appSpecs: readonly AppSpec[],
): readonly LinkedApp[] {
  const appSpecByProjectId = new Map(appSpecs.map((appSpec) => [appSpec.projectId, appSpec]))
  return configApps.map((app) => {
    const appSpec = appSpecByProjectId.get(app.projectId)
    if (appSpec === undefined) {
      throw new Error(
        `${configYamlPath}: app "${app.projectName}"（projectId: ${app.projectId}）に対応する設定が ${registryYamlPath} に見つかりません`,
      )
    }
    if (appSpec.projectName !== app.projectName) {
      throw new Error(
        `${configYamlPath} と ${registryYamlPath} で projectId ${app.projectId} の projectName が一致しません（"${app.projectName}" / "${appSpec.projectName}"）`,
      )
    }
    return { app, appSpec }
  })
}

/**
 * 同じ`projectId`のappが複数の設定ユニットに登録されているとき、`tagFormat`が食い違って
 * いないか検証する。タグ形式はソースリポジトリ側の性質であって設定ユニットごとに
 * 変わる値ではなく、食い違ったまま実行すると`createResolveLatestTags()`のキャッシュ
 * （キーは`projectId:branchToSync`）を通じて、同じアプリの最新タグが実行順序次第で
 * 違う形式で決まってしまう（詳細は`docs/architecture.md`のタグ形式の置き場所を扱う節）。
 * `branchToSync`の食い違いは設定ユニット側の判断として正当なので検証しない。
 */
export function validateTagFormatConsistency(chartAndAppsList: readonly ChartAndApps[]): void {
  const seen = new Map<
    ProjectId,
    { readonly projectName: ProjectName; readonly tagFormat: TagFormat; readonly location: string }
  >()
  for (const chartAndApps of chartAndAppsList) {
    const location = buildConfigUnitLocation(chartAndApps.chartDirName, chartAndApps.unitPath)
    for (const app of chartAndApps.apps) {
      const prior = seen.get(app.projectId)
      if (prior === undefined) {
        seen.set(app.projectId, { projectName: app.projectName, tagFormat: app.tagFormat, location })
        continue
      }
      if (prior.tagFormat !== app.tagFormat) {
        throw new Error(
          `app "${app.projectName}"（projectId: ${app.projectId}）の tagFormat が設定ユニット間で` +
            `食い違っています（${prior.location} と ${location}）。タグ形式はソースリポジトリ` +
            `側の性質のため、どの設定ユニットに登録する場合も同じ値にしてください`,
        )
      }
    }
  }
}

/**
 * 同じ`projectId`のappが1ファイル内に複数書かれていないか検証する。CLIは`projectId`を
 * キーに2ファイルを突き合わせるため、重複していると片方の設定が黙って無視され、
 * 同じ書き込み先へ別々のタグを順番に書いて最後の値だけが残る。
 */
export function validateNoDuplicateProjectIds(
  filePath: LocalPath,
  apps: readonly { readonly projectId: ProjectId; readonly projectName: ProjectName }[],
): void {
  const seen = new Set<ProjectId>()
  const duplicated = apps.filter((app) => {
    if (seen.has(app.projectId)) return true
    seen.add(app.projectId)
    return false
  })
  if (duplicated.length > 0) {
    const list = [...new Set(duplicated.map((app) => `projectId ${app.projectId}`))].join(", ")
    throw new Error(`${filePath}: 同じappが複数回定義されています（${list}）`)
  }
}

/** `valuesPath`+`anchorName`の組を、エラーメッセージ用のラベル付きで表す */
export type LabeledTarget = { readonly target: AnchorTarget; readonly label: string }

/**
 * 1つの設定ユニット内で、同じ`valuesPath`+`anchorName`（＝values.yamlの同じ1箇所）を複数の設定が
 * 書き込み先にしていないか検証する。重複していると後から処理した側の値だけが残り、
 * MRには両方を更新したように表示されるため、静かに誤った結果になる。
 * イメージタグ用（`apps[].chart[]`）と向き先ブランチ用（`helm.chart[]`）の衝突も対象にする。
 */
export function validateNoDuplicateTargets(
  filePath: LocalPath,
  targets: readonly LabeledTarget[],
): void {
  const seen = new Map<string, string>()
  for (const { target, label } of targets) {
    const key = `${target.valuesPath}#${target.anchorName}`
    const previousLabel = seen.get(key)
    if (previousLabel !== undefined) {
      throw new Error(
        `${filePath}: 同じ書き込み先（${target.valuesPath} のアンカー "${target.anchorName}"）が複数指定されています（${previousLabel} / ${label}）`,
      )
    }
    seen.set(key, label)
  }
}
