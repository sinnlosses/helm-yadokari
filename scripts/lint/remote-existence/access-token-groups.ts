import type { AccessToken, AccessTokenEnvName, ConfigUnit } from "../../../src/domain/types.js"

/**
 * `accessTokenEnv`が同じ設定ユニットをまとめたグループ。`validate-config.ts`の`--remote`が
 * グループごとにクライアントを1つ作って`validateRemoteExistence()`を呼ぶために使う
 * （`docs/architecture.md`「アクセストークンはchartリポジトリ単位に宣言し…」節の
 * 「`validate-config --remote`はトークンごとに分解する」段落）。
 */
export type AccessTokenGroup = {
  readonly accessTokenEnv: AccessTokenEnvName
  readonly configUnits: readonly ConfigUnit[]
}

/** `configUnits`を`accessTokenEnv`でグループ分けする。返す順序は各グループが最初に現れた順 */
export function groupByAccessTokenEnv(
  configUnits: readonly ConfigUnit[],
): readonly AccessTokenGroup[] {
  const map = new Map<AccessTokenEnvName, ConfigUnit[]>()
  for (const configUnit of configUnits) {
    const group = map.get(configUnit.accessTokenEnv)
    if (group === undefined) {
      map.set(configUnit.accessTokenEnv, [configUnit])
    } else {
      group.push(configUnit)
    }
  }
  return [...map.entries()].map(([accessTokenEnv, units]) => ({
    accessTokenEnv,
    configUnits: units,
  }))
}

/**
 * グループが宣言した環境変数のアクセストークンを引く。見つからなければ`undefined`を返す
 * （本体の`loadAccessTokens()`と同じく、ここでは投げない）。
 */
export function lookupAccessToken(
  group: AccessTokenGroup,
  declaredAccessTokens: ReadonlyMap<AccessTokenEnvName, AccessToken>,
): AccessToken | undefined {
  return declaredAccessTokens.get(group.accessTokenEnv)
}

/**
 * 必要なアクセストークンが未設定のグループを集め、chart ディレクトリ名と環境変数名を含む
 * 文字列の配列で返す（無ければ空配列）。本体の`loadAccessTokens()`（未設定の名前を黙って
 * 表から落とす）とは異なり、`validate-config --remote`は必要なトークンが1本でも欠けたら
 * 検証自体を打ち切るため、ここでは黙って落とさず全件報告する（`docs/architecture.md`
 * 「`validate-config --remote`はトークンごとに分解する」段落）。
 */
export function findMissingAccessTokenProblems(
  groups: readonly AccessTokenGroup[],
  declaredAccessTokens: ReadonlyMap<AccessTokenEnvName, AccessToken>,
): readonly string[] {
  return groups.flatMap((group) => {
    if (lookupAccessToken(group, declaredAccessTokens) !== undefined) return []
    const chartDirNames = [...new Set(group.configUnits.map((unit) => unit.chartDirName))]
    return chartDirNames.map(
      (chartDirName) => `[chart: ${chartDirName}] 環境変数 ${group.accessTokenEnv} が未設定です`,
    )
  })
}
