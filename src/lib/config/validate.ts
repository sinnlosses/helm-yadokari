import type { AnchorTarget, ChartAndApps, ProjectId, ProjectName, TagNaming } from "../../types/types.js"

/**
 * `config.yaml` / `anchors.yaml` を読み込んだ後に、GitLabへ問い合わせなくても分かる設定ミス
 * （紐づけの矛盾・重複）を検証する。実体の有無（projectIdやブランチの実在）は
 * `scripts/lint/verify-config/` の担当。
 */

/**
 * `config.yaml`（運用値）と`anchors.yaml`（chart構造）の間で、appの紐づけに矛盾が
 * ないか検証する。どちらのファイルも`projectId`を持つため、単純な存在チェックに加えて
 * `projectName`の食い違い（コピペミス等）も検知できる
 * - config.yamlの各appに対応するprojectIdがanchors.yamlに無ければ、書き込み先が
 *   定義されていない設定ミスとして例外をスローする
 * - anchors.yamlの各appに対応するprojectIdがconfig.yamlに無ければ、使われない
 *   孤児設定として例外をスローする（appを削除した際の消し忘れに気づけるようにするため）
 * - 両方に存在するprojectIdについて、projectNameが一致しなければ例外をスローする
 */
export function validateProjectLinkage(
  configYamlPath: string,
  anchorsPath: string,
  configApps: readonly { readonly projectId: ProjectId; readonly projectName: ProjectName }[],
  anchorApps: readonly { readonly projectId: ProjectId; readonly projectName: ProjectName }[],
): void {
  const anchorByProjectId = new Map(anchorApps.map((app) => [app.projectId, app]))
  for (const app of configApps) {
    const anchorApp = anchorByProjectId.get(app.projectId)
    if (anchorApp === undefined) {
      throw new Error(
        `${configYamlPath}: app "${app.projectName}"（projectId: ${app.projectId}）に対応する設定が ${anchorsPath} に見つかりません`,
      )
    }
    if (anchorApp.projectName !== app.projectName) {
      throw new Error(
        `${configYamlPath} と ${anchorsPath} で projectId ${app.projectId} の projectName が一致しません（"${app.projectName}" / "${anchorApp.projectName}"）`,
      )
    }
  }

  const configProjectIds = new Set(configApps.map((app) => app.projectId))
  const orphanApps = anchorApps.filter((app) => !configProjectIds.has(app.projectId))
  if (orphanApps.length > 0) {
    const orphanList = orphanApps
      .map((app) => `${app.projectName}（projectId: ${app.projectId}）`)
      .join(", ")
    throw new Error(
      `${anchorsPath}: ${configYamlPath} に存在しないapp（${orphanList}）が定義されています`,
    )
  }
}

/**
 * 同じ`projectId`のappが複数の設定ユニットに登録されているとき、`tagNaming`が食い違って
 * いないか検証する。タグ命名規則はソースリポジトリ側の性質であって設定ユニットごとに
 * 変わる値ではなく、食い違ったまま実行すると`createResolveLatestTags()`のキャッシュ
 * （キーは`projectId:branchToSync`）を通じて、同じアプリの最新タグが実行順序次第で
 * 違う規則で決まってしまう（詳細は`docs/architecture.md`のタグ命名規則の置き場所を扱う節）。
 * `branchToSync`の食い違いは設定ユニット側の判断として正当なので検証しない。
 */
export function validateTagNamingConsistency(chartAndAppsList: readonly ChartAndApps[]): void {
  const seen = new Map<
    ProjectId,
    { readonly projectName: ProjectName; readonly tagNaming: TagNaming; readonly location: string }
  >()
  for (const chartAndApps of chartAndAppsList) {
    const location = `${chartAndApps.chartDirName}/${chartAndApps.unitPath}`
    for (const app of chartAndApps.apps) {
      const prior = seen.get(app.projectId)
      if (prior === undefined) {
        seen.set(app.projectId, { projectName: app.projectName, tagNaming: app.tagNaming, location })
        continue
      }
      if (JSON.stringify(prior.tagNaming) !== JSON.stringify(app.tagNaming)) {
        throw new Error(
          `app "${app.projectName}"（projectId: ${app.projectId}）の tagNaming が設定ユニット間で` +
            `食い違っています（${prior.location} と ${location}）。タグ命名規則はソースリポジトリ` +
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
  filePath: string,
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
  anchorsPath: string,
  targets: readonly LabeledTarget[],
): void {
  const seen = new Map<string, string>()
  for (const { target, label } of targets) {
    const key = `${target.valuesPath}#${target.anchorName}`
    const previousLabel = seen.get(key)
    if (previousLabel !== undefined) {
      throw new Error(
        `${anchorsPath}: 同じ書き込み先（${target.valuesPath} のアンカー "${target.anchorName}"）が複数指定されています（${previousLabel} / ${label}）`,
      )
    }
    seen.set(key, label)
  }
}
