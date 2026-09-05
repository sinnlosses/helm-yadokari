import { loadConfig } from "../../src/lib/config.js"
import type { Config } from "../../src/types.js"

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
  // 環境変数（GITLAB_URL/ACCESS_TOKEN）を要求するため、--remote のときだけ読み込む。
  // 認証情報が無いときは黙って成功させず、理由を明示して失敗させる（このチェックが
  // 素通りすると、存在しないアンカー・ブランチがそのままマージされてしまうため）
  const gitlabEnv = await import("../../src/lib/env.js").catch((err: unknown) => {
    fail(
      `実在チェックを実行できません（${err instanceof Error ? err.message : String(err)}）。` +
        `GITLAB_URL と ACCESS_TOKEN を設定してください`,
    )
  })
  const { createClient } = await import("../../src/lib/gitlab/gitlab.js")
  const { verifyConfigExistence } = await import("../../src/lib/verify-config.js")

  const { ACCESS_TOKEN, GITLAB_URL } = gitlabEnv
  const problems = await verifyConfigExistence(
    createClient(GITLAB_URL, ACCESS_TOKEN),
    chartAndAppsList,
  )
  if (problems.length > 0) {
    console.error(`config ERROR: GitLab上に存在しない設定が ${problems.length} 件あります`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }
  console.log(
    `config OK（実在チェック）: projectId・ブランチ・valuesPath・アンカーをすべて確認 (${GITLAB_URL})`,
  )
}
