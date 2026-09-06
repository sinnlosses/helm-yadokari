import { loadConfig } from "../../src/lib/config/config.js"
import { loadEnvConfig } from "../../src/lib/env.js"
import { createClient } from "../../src/lib/gitlab/gitlab.js"
import type { Config } from "../../src/types/types.js"
import { verifyConfigExistence } from "./verify-config/verify-config.js"

// config/ の検証スクリプト。2つのモードを持つ:
//   （既定）  ローカルのYAMLだけを見る。認証情報が不要なので全パイプラインで実行できる
//   --remote  上記に加えてGitLabへ問い合わせ、projectId・ブランチ・valuesPath・アンカーの
//             実在を検証する（読み取りのみ。タグ・ブランチ・MRは作らない）

const args = process.argv.slice(2)
const remote = args.includes("--remote")
const configPath = args.find((arg) => !arg.startsWith("--"))

function fail(message: string): never {
  console.error(`config ERROR: ${message}`)
  process.exit(1)
}

function loadLocally(): Config {
  try {
    return loadConfig(configPath)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}

const { chartAndAppsList } = loadLocally()
const appCount = chartAndAppsList.reduce((sum, chartAndApps) => sum + chartAndApps.apps.length, 0)
const where = configPath ?? "config"
console.log(`config OK: ${chartAndAppsList.length} chart groups, ${appCount} apps (${where})`)

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

  const problems = await verifyConfigExistence(
    createClient(env.gitlabUrl, env.accessToken),
    chartAndAppsList,
    env.concurrencyLimit,
  )
  if (problems.length > 0) {
    console.error(`config ERROR: GitLab上に存在しない設定が ${problems.length} 件あります`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }
  console.log(
    `config OK（実在チェック）: projectId・ブランチ・valuesPath・アンカーをすべて確認 (${env.gitlabUrl})`,
  )
}
