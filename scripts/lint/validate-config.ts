import { parseArgs } from "node:util"

import type { LoadedConfig } from "../../src/lib/config/config.js"
import { DEFAULT_CONFIG_ROOT_PATH, loadConfig } from "../../src/lib/config/config.js"
import { loadEnvConfig } from "../../src/lib/env.js"
import { createClient } from "../../src/lib/gitlab/gitlab.js"
import type { ConfigRootPath } from "../../src/types/types.js"
import { toConfigRootPath } from "../../src/types/types.js"
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

const { configUnits } = loadLocally()
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

  const problems = await validateRemoteExistence(
    createClient(env.platformUrl, env.accessToken),
    configUnits,
    env.concurrencyLimit,
  )
  if (problems.length > 0) {
    console.error(`config ERROR: GitLab上に存在しない設定が ${problems.length} 件あります`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }
  console.log(
    `config OK（実在チェック）: projectId・ブランチ・valuesPath・アンカーをすべて確認 (${env.platformUrl})`,
  )
}
