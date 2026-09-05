import { ACCESS_TOKEN, GITLAB_URL } from "../../src/lib/env.js"
import { createClient } from "../../src/lib/gitlab/gitlab.js"

// 実機スモークテスト（docs/smoke-test.md）用のフィクスチャ操作スクリプト。
//
//   setup  … Helmの向き先ブランチ（release/2026-q1）と、tenant2の各clientのvalues.yamlを
//            初期値（placeholder / main）でmainに用意する。何度実行してもよい
//   reset  … このツールが作った固定ブランチ（feature/yadokari/*）のオープン中MRをクローズし、
//            ブランチを削除する。次の検証をやり直せる状態に戻す
//
// 既定はdry-run（何をするかを表示するだけ）。実際に反映するには --apply を付ける。
// 対象プロジェクトは事故防止のため必ず SMOKE_CHART_PROJECT_ID で明示する。

const HELM_TARGET_BRANCH = "release/2026-q1"
const SEED_FILES: Record<string, string> = {
  "charts/smoke-tenant2/client1/values.yaml":
    "variables:\n  - &t2c1QaSprintVersion placeholder\n  - &t2c1DevelopClientVersion placeholder\n  - &t2c1HelmTargetBranch main\n",
  "charts/smoke-tenant2/client2/values.yaml":
    "variables:\n  - &t2c2QaSprintVersion placeholder\n  - &t2c2DevelopClientVersion placeholder\n",
}

const [command] = process.argv.slice(2)
const apply = process.argv.includes("--apply")

if (command !== "setup" && command !== "reset") {
  console.error("usage: tsx scripts/smoke/smoke-fixture.ts <setup|reset> [--apply]")
  process.exit(1)
}

const rawProjectId = process.env["SMOKE_CHART_PROJECT_ID"]
if (!rawProjectId?.trim()) {
  console.error(
    "環境変数 SMOKE_CHART_PROJECT_ID（スモークテスト用chartリポジトリのprojectId）が未設定です",
  )
  process.exit(1)
}
const projectId = Number(rawProjectId)
if (!Number.isInteger(projectId)) {
  console.error(`SMOKE_CHART_PROJECT_ID は整数で指定してください: "${rawProjectId}"`)
  process.exit(1)
}

const gitlab = createClient(GITLAB_URL, ACCESS_TOKEN)
const project = await gitlab.Projects.show(projectId)
console.log(`対象: ${String(project.path_with_namespace)} (${GITLAB_URL})`)
console.log(apply ? "モード: --apply（実際に反映します）" : "モード: dry-run（--apply で反映）")

async function setup(): Promise<void> {
  const branches = await gitlab.Branches.all(projectId)
  const names = branches.map((branch) => String(branch.name))
  if (names.includes(HELM_TARGET_BRANCH)) {
    console.log(`- ブランチ ${HELM_TARGET_BRANCH}: 既に存在（変更なし）`)
  } else {
    console.log(`- ブランチ ${HELM_TARGET_BRANCH} を main から作成`)
    if (apply) await gitlab.Branches.create(projectId, HELM_TARGET_BRANCH, "main")
  }

  const actions = await Promise.all(
    Object.entries(SEED_FILES).map(async ([filePath, content]) => {
      const exists = await gitlab.RepositoryFiles.show(projectId, filePath, "main").then(
        () => true,
        () => false,
      )
      return { action: exists ? ("update" as const) : ("create" as const), filePath, content }
    }),
  )
  for (const action of actions) console.log(`- ${action.action} ${action.filePath}（初期値に戻す）`)
  if (apply) {
    await gitlab.Commits.create(
      projectId,
      "main",
      "smoke test: reset tenant2 client values.yaml",
      actions,
    )
  }
}

async function reset(): Promise<void> {
  const mergeRequests = await gitlab.MergeRequests.all({ projectId, state: "opened" })
  const targets = mergeRequests.filter((mr) =>
    String(mr.source_branch).startsWith("feature/yadokari/"),
  )
  for (const mr of targets) {
    console.log(`- MR !${mr.iid}（${String(mr.source_branch)}）をクローズ`)
    if (apply) await gitlab.MergeRequests.edit(projectId, Number(mr.iid), { stateEvent: "close" })
  }

  const branches = await gitlab.Branches.all(projectId)
  const staleBranches = branches
    .map((branch) => String(branch.name))
    .filter((name) => name.startsWith("feature/yadokari/"))
  for (const name of staleBranches) {
    console.log(`- ブランチ ${name} を削除`)
    if (apply) await gitlab.Branches.remove(projectId, name)
  }

  if (targets.length === 0 && staleBranches.length === 0) {
    console.log("- 片付ける対象はありません")
  }
}

await (command === "setup" ? setup() : reset())
console.log(apply ? "完了" : "dry-run 完了（--apply を付けると実行します）")
