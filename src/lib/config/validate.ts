import type { AnchorTarget, ProjectId, ProjectName } from "../../types/types.js"

/**
 * `config.yaml` / `anchors.yaml` を読み込んだ後に、GitLabへ問い合わせなくても分かる設定ミス
 * （紐づけの矛盾・重複）を検証する。実体の有無（projectIdやブランチの実在）は
 * `lib/verify-config/` の担当（T-032）。
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
 * 同じ`projectId`のappが1ファイル内に複数書かれていないか検証する。CLIは`projectId`を
 * キーに2ファイルを突き合わせるため、重複していると片方の設定が黙って無視され、
 * 同じ書き込み先へ別々のタグを順番に書いて最後の値だけが残る（T-032）。
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

/** `valuesPath`+`anchor`の組を、エラーメッセージ用のラベル付きで表す */
export type LabeledTarget = { readonly target: AnchorTarget; readonly label: string }

/**
 * 1つのclient内で、同じ`valuesPath`+`anchor`（＝values.yamlの同じ1箇所）を複数の設定が
 * 書き込み先にしていないか検証する。重複していると後から処理した側の値だけが残り、
 * MRには両方を更新したように表示されるため、静かに誤った結果になる（T-032）。
 * イメージタグ用（`apps[].chart[]`）と向き先ブランチ用（`helm.chart[]`）の衝突も対象にする。
 */
export function validateNoDuplicateTargets(
  anchorsPath: string,
  targets: readonly LabeledTarget[],
): void {
  const seen = new Map<string, string>()
  for (const { target, label } of targets) {
    const key = `${target.valuesPath}#${target.anchor}`
    const previousLabel = seen.get(key)
    if (previousLabel !== undefined) {
      throw new Error(
        `${anchorsPath}: 同じ書き込み先（${target.valuesPath} のアンカー "${target.anchor}"）が複数指定されています（${previousLabel} / ${label}）`,
      )
    }
    seen.set(key, label)
  }
}
