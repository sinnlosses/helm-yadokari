import { parseArgs } from "node:util"

import type { ConfigRootPath } from "../../src/domain/types.js"
import { toConfigRootPath } from "../../src/domain/types.js"
import type { LoadedConfig } from "../../src/lib/config/config.js"
import { DEFAULT_CONFIG_ROOT_PATH, loadConfig } from "../../src/lib/config/config.js"
import { loadAccessTokens, loadEnvConfig } from "../../src/lib/env.js"
import { createClient } from "../../src/lib/gitlab/gitlab.js"
import {
  findMissingAccessTokenProblems,
  groupByAccessTokenEnv,
  lookupAccessToken,
} from "./remote-existence/access-token-groups.js"
import { validateRemoteExistence } from "./remote-existence/remote-existence.js"

// config/ の検証スクリプト。2つのモードを持つ:
//   （既定）  ローカルのYAMLだけを見る。認証情報が不要なので全パイプラインで実行できる
//   --remote  上記に加えてGitLabへ問い合わせ、projectId・ブランチ・valuesPath・アンカーの
//             実在を検証する（読み取りのみ。タグ・ブランチ・MRは作らない）

function fail(message: string): never {
  console.error(`config ERROR: ${message}`)
  process.exit(1)
}

// typoしたフラグ（例: `--remot`）を黙って無視せず即終了させるため`strict: true`にする。
// `configRootPath`は呼び出し側（README.md/.gitlab-ci.yml/docs/smoke-test.md）が
// 誰も渡していないが、位置引数のまま`allowPositionals`で受けて既存の外部インターフェースを保つ。
function parseCliArgs(argv: readonly string[]): {
  readonly remote: boolean
  readonly configRootPath: ConfigRootPath
} {
  try {
    const { values, positionals } = parseArgs({
      args: [...argv],
      options: {
        remote: { type: "boolean", default: false },
      },
      allowPositionals: true,
      strict: true,
    })
    return {
      remote: values.remote,
      configRootPath: toConfigRootPath(positionals[0] ?? DEFAULT_CONFIG_ROOT_PATH),
    }
  } catch (err) {
    fail(`引数が不正です（${err instanceof Error ? err.message : String(err)}）`)
  }
}

const { remote, configRootPath } = parseCliArgs(process.argv.slice(2))

function loadLocally(): LoadedConfig {
  try {
    return loadConfig(configRootPath)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}

const { configUnits, accessTokenEnvNames } = loadLocally()
const appCount = configUnits.reduce((sum, configUnit) => sum + configUnit.apps.length, 0)
console.log(`config OK: ${configUnits.length} 設定ユニット, ${appCount} apps (${configRootPath})`)

if (remote) {
  // 環境変数（GITLAB_URL/ACCESS_TOKEN）を要求するのは --remote のときだけなので、
  // 読み込みもこの中で行う。認証情報が無いときは黙って成功させず、理由を明示して
  // 失敗させる（このチェックが素通りすると、存在しないアンカー・ブランチが
  // そのままマージされてしまうため）
  const env = (() => {
    try {
      return loadEnvConfig()
    } catch (err) {
      fail(
        `実在チェックを実行できません（${err instanceof Error ? err.message : String(err)}）。` +
          `GITLAB_URL と ACCESS_TOKEN を設定してください`,
      )
    }
  })()
  // このスクリプトは`GitlabClient`（gitbeaker）を直接使っており、GitHub向けの実装を
  // 持たない。`PLATFORM=github`のとき`env.platformUrl`にはGITHUB_URLの値が入っているため、
  // 気付かないままGitLabクライアントに渡すと分かりにくい失敗になる。ここで明示的に止める
  if (env.platform !== "gitlab") {
    fail(`実在チェック（--remote）は現時点で GitLab 専用です（PLATFORM=${env.platform}）`)
  }
  // chartリポジトリが宣言したトークン（accessTokenEnv）ごとにグループ分けし、グループごとに
  // クライアントを1つ作って検証する（本体の`createRoutedAdapter()`と同じ分解）。ただし本体と
  // 違い、このジョブの目的は「このMRをマージしてよいか」の判定なので、必要なトークンが1本でも
  // 欠けたら検証できたことにせず打ち切る（`docs/architecture.md`「`validate-config --remote`は
  // トークンごとに分解する」段落）
  const groups = groupByAccessTokenEnv(configUnits)
  const declaredAccessTokens = loadAccessTokens(accessTokenEnvNames)
  const missingTokenProblems = findMissingAccessTokenProblems(
    groups,
    env.accessToken,
    declaredAccessTokens,
  )
  if (missingTokenProblems.length > 0) {
    fail(
      `実在チェックを実行できません。次のアクセストークンが未設定です:\n` +
        missingTokenProblems.map((problem) => `  - ${problem}`).join("\n"),
    )
  }

  const problemsPerGroup = await Promise.all(
    groups.map((group) => {
      const token = lookupAccessToken(group, env.accessToken, declaredAccessTokens)
      if (token === undefined) {
        // findMissingAccessTokenProblems() が事前に全件検出しているため到達しない防御的な分岐
        throw new Error(
          `アクセストークンが見つかりません（${group.accessTokenEnv ?? "ACCESS_TOKEN"}）`,
        )
      }
      return validateRemoteExistence(
        createClient(env.platformUrl, token),
        group.configUnits,
        env.concurrencyLimit,
      )
    }),
  )
  const problems = problemsPerGroup.flat()
  if (problems.length > 0) {
    console.error(`config ERROR: GitLab上に存在しない設定が ${problems.length} 件あります`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }
  console.log(
    `config OK（実在チェック）: projectId・ブランチ・valuesPath・アンカーをすべて確認 (${env.platformUrl})`,
  )
}
