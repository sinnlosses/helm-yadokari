import { loadEnvConfig } from "../../src/lib/env.js"
import { createClient } from "../../src/lib/gitlab/gitlab.js"

// 実機スモークテスト（docs/smoke-test.md）用のフィクスチャ操作スクリプト。
//
//   setup  … シードタグ・Helmの向き先ブランチ（release/2026-q1）・tenant2の各clientの
//            values.yaml を初期状態でmainに用意する。何度実行してもよい
//   reset  … このツールが作った固定ブランチ（feature/yadokari/*）のオープン中MRをクローズし、
//            ブランチを削除する。次の検証をやり直せる状態に戻す
//
// 既定はdry-run（何をするかを表示するだけ）。実際に反映するには --apply を付ける。
// 対象プロジェクトは事故防止のため必ず SMOKE_CHART_PROJECT_ID で明示する。

const HELM_TARGET_BRANCH = "release/2026-q1"

/**
 * values.yaml のシード値には「実在する、かつ最新より古いタグ」を使う。
 * `placeholder` のような架空の値だと、MR本文の旧タグリンク（`/-/tags/...`）と比較リンクが
 * 存在しないタグを指してしまい、初回のMRだけ壊れた見た目になるため。
 */
const SEED_TAGS = {
  qaSprint: { projectId: 82861978, branch: "main", tag: "main-build-at-20260903-171213" },
  developClient: { projectId: 82861977, branch: "main", tag: "main-build-at-20260101-000000" },
} as const

const SEED_FILES: Record<string, string> = {
  "charts/smoke-tenant2/client1/values.yaml": `variables:\n  - &t2c1QaSprintVersion ${SEED_TAGS.qaSprint.tag}\n  - &t2c1DevelopClientVersion ${SEED_TAGS.developClient.tag}\n  - &t2c1HelmTargetBranch main\n`,
  "charts/smoke-tenant2/client2/values.yaml": `variables:\n  - &t2c2QaSprintVersion ${SEED_TAGS.qaSprint.tag}\n  - &t2c2DevelopClientVersion ${SEED_TAGS.developClient.tag}\n`,
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

const env = loadEnvConfig()
const gitlab = createClient(env.gitlabUrl, env.accessToken)
const project = await gitlab.Projects.show(projectId)
console.log(`対象: ${String(project.path_with_namespace)} (${env.gitlabUrl})`)
console.log(apply ? "モード: --apply（実際に反映します）" : "モード: dry-run（--apply で反映）")

/**
 * シード値に使うタグがソースリポジトリに実在することを保証する。無い場合は追跡ブランチの
 * 先頭に作成する（スモークテスト用リポジトリはコミットが少なく、古いコミットを選べない
 * ことがあるため）。シードタグより新しいタグが1件も無いと「差分なし」でシナリオが
 * 成立しないので、その場合は警告する。
 */
async function ensureSeedTags(): Promise<void> {
  for (const { projectId: sourceProjectId, branch, tag } of Object.values(SEED_TAGS)) {
    const tags = await gitlab.Tags.all(sourceProjectId)
    const names = tags.map((t) => String(t.name))
    if (names.includes(tag)) {
      console.log(`- シードタグ ${tag}（project ${sourceProjectId}）: 既に存在`)
    } else {
      console.log(`- シードタグ ${tag} を project ${sourceProjectId} の ${branch} に作成`)
      if (apply) await gitlab.Tags.create(sourceProjectId, tag, branch)
    }
    const hasNewerTag = names.some((name) => name > tag)
    if (!hasNewerTag) {
      console.log(
        `  ⚠ project ${sourceProjectId} に ${tag} より新しいタグがありません。` +
          `このままだと差分なし（SKIPPED）になります`,
      )
    }
  }
}

async function setup(): Promise<void> {
  await ensureSeedTags()
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
