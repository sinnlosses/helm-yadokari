import { isFeatureBranch } from "../../src/domain/feature-branch.js"
import { findLatestParsedTag, parseTag, validateTagFormat } from "../../src/domain/tag-format.js"
import { loadEnvConfig } from "../../src/lib/env.js"
import { createClient } from "../../src/lib/gitlab/gitlab.js"
import { toBranchName, toTagName } from "../../src/types/types.js"

// 実機スモークテスト（docs/smoke-test.md）用のフィクスチャ操作スクリプト。
//
//   setup  … シードタグ・Helmの向き先ブランチ（release/2026-q1）・各設定ユニットの
//            values.yaml を初期状態でmainに用意する。何度実行してもよい
//   reset  … このツールが作った固定ブランチ（feature/yadokari/*）のオープン中MRをクローズし、
//            ブランチを削除する。次の検証をやり直せる状態に戻す
//
// 既定はdry-run（何をするかを表示するだけ）。実際に反映するには --apply を付ける。
// 対象プロジェクトは事故防止のため必ず環境変数（SMOKE_CHART_PROJECT_ID /
// SMOKE_QA_SPRINT_PROJECT_ID / SMOKE_DEVELOP_CLIENT_PROJECT_ID）で明示する。
// SMOKE_CHART2_PROJECT_ID（chartリポジトリ2、複数chart構成の確認用）だけは未設定でもよい。
// 未設定なら chartリポジトリ2 向けの操作を丸ごとスキップし、chartリポジトリ1だけの
// 既存シナリオが引き続き動く（chartリポジトリ2はsmoke-fixture.tsでは作成しない。手で作る前提）。
//
// setup --broken-anchor … charts/smoke-tenant2/client2/values.yaml から
// t2c2QaSprintVersion アンカーを抜いた状態でシードする。config/ 側は正しいままGitLab側だけ
// 期待と違う状態を作り、パス3（部分失敗）の client2 だけを ERROR にするためのモード。
// 検証後は必ず setup（オプションなし）で正常な状態に戻すこと。

const HELM_TARGET_BRANCH = "release/2026-q1"

// config/yadokari-smoke-test-chart/ の sample-qa-sprint / sample-develop-client に
// 書いてある tagFormat と同じ値。ここが食い違うとシードタグを最新判定できなくなる
const SEED_TAG_FORMAT = validateTagFormat("{branch}-build-at-{date}-{time}")

/**
 * 環境変数からprojectIdを読み取る。未設定・非整数の場合は理由を出して即終了する。
 * 対象プロジェクトを取り違えると誤ったGitLabプロジェクトに書き込んでしまうため、
 * chart・ソースリポジトリのどちらも既定値を持たせずこの関数経由での明示を必須にしている。
 */
function requireProjectId(envVarName: string, description: string): number {
  const raw = process.env[envVarName]
  if (!raw?.trim()) {
    console.error(`環境変数 ${envVarName}（${description}のprojectId）が未設定です`)
    process.exit(1)
  }
  const projectId = Number(raw)
  if (!Number.isInteger(projectId)) {
    console.error(`${envVarName} は整数で指定してください: "${raw}"`)
    process.exit(1)
  }
  return projectId
}

/**
 * chartリポジトリ2用。未設定の場合だけ`requireProjectId`と違い理由を出さず`undefined`を返す
 * （chartリポジトリ2は複数chart構成の確認用シナリオにしか使わず、無くても既存シナリオが
 * 動く必要があるため）。値はあるが非整数の場合は`requireProjectId`と同様に即終了する。
 */
function optionalProjectId(envVarName: string): number | undefined {
  const raw = process.env[envVarName]
  if (!raw?.trim()) return undefined
  const projectId = Number(raw)
  if (!Number.isInteger(projectId)) {
    console.error(`${envVarName} は整数で指定してください: "${raw}"`)
    process.exit(1)
  }
  return projectId
}

const [command] = process.argv.slice(2)
const apply = process.argv.includes("--apply")
const brokenAnchor = process.argv.includes("--broken-anchor")

if (command !== "setup" && command !== "reset") {
  console.error(
    "usage: tsx scripts/smoke/smoke-fixture.ts <setup|reset> [--apply] [--broken-anchor]",
  )
  process.exit(1)
}
if (brokenAnchor && command !== "setup") {
  console.error("--broken-anchor は setup でのみ指定できます")
  process.exit(1)
}

const projectId = requireProjectId("SMOKE_CHART_PROJECT_ID", "スモークテスト用chartリポジトリ")
const chart2ProjectId = optionalProjectId("SMOKE_CHART2_PROJECT_ID")

/**
 * values.yaml のシード値には「実在する、かつ最新より古いタグ」を使う。
 * `placeholder` のような架空の値だと、MR本文の旧タグリンク（`/-/tags/...`）と比較リンクが
 * 存在しないタグを指してしまい、初回のMRだけ壊れた見た目になるため。
 * projectIdは環境変数名が `config/yadokari-smoke-test-chart/` 側の projectName
 * （`sample-qa-sprint` / `sample-develop-client`）と対応するように名付けている。
 * 実際に読むのは`setup`のときだけ（`reset`はchartリポジトリしか触らない）なので、
 * ここには環境変数名だけを持たせ、値の要求は`ensureSeedTags()`で行う。
 */
const SEED_TAGS = {
  qaSprint: {
    projectIdEnvVar: "SMOKE_QA_SPRINT_PROJECT_ID",
    label: "ソースリポジトリ sample-qa-sprint",
    branch: "main",
    tag: "main-build-at-20260903-171213",
  },
  developClient: {
    projectIdEnvVar: "SMOKE_DEVELOP_CLIENT_PROJECT_ID",
    label: "ソースリポジトリ sample-develop-client",
    branch: "main",
    tag: "main-build-at-20260101-000000",
  },
} as const

/**
 * chartリポジトリ1の各設定ユニットのvalues.yamlの初期状態。アンカー名は
 * `config/yadokari-smoke-test-chart/`の`apps[].locations[].anchor`・`helm.locations[].anchor`と
 * 一致させる（食い違うと書き込み先が見つからずその設定ユニットが`ERROR`になる）。
 * `anchor-app`の`helmVersion`はこのツールが読み書きしないアンカーだが、chartリポジトリ側の
 * 実物にあるものなので、上書きで消さないようここにも書く。
 * 向き先ブランチのシード値は`client1`（`values-extra.yaml`含む）だけ`main`
 * （＝`HELM_TARGET_BRANCH`と差分があり更新される）にし、`client2`と`anchor-app`は
 * `HELM_TARGET_BRANCH`と同じ値にする。後者2つは向き先ブランチが差分なしになるので
 * 「image tag更新のみ」というシナリオ（docs/smoke-test.md）を保てる。
 * `values-extra.yaml`は「1つのappが複数の`valuesPath`に書き込む」シナリオ用
 * （`t2c1QaSprintVersionExtra` / `t2c1HelmTargetBranchExtra`）。
 *
 * `brokenAnchor`が`true`のときだけ、`client2`の`t2c2QaSprintVersion`アンカーを抜いた版を
 * 返す（パス3・部分失敗用のシード。`config/`側は正しいままGitLab側だけ期待と違う状態を作り、
 * `client2`だけが`ERROR`になる）。既定（`setup`にオプションを付けない場合）は`false`なので
 * 壊れた状態にはならない。
 */
function buildChart1SeedFiles(useBrokenAnchor: boolean): Record<string, string> {
  const t2c2QaSprintLine = useBrokenAnchor
    ? ""
    : `  - &t2c2QaSprintVersion ${SEED_TAGS.qaSprint.tag}\n`
  return {
    "charts/anchor-app/values.yaml": `variables:\n  - &helmVersion develop\n  - &tenantId1client1AppsVersion ${SEED_TAGS.qaSprint.tag}\n  - &smokeTestTargetBranch ${HELM_TARGET_BRANCH}\n`,
    "charts/smoke-tenant2/client1/values.yaml": `variables:\n  - &t2c1QaSprintVersion ${SEED_TAGS.qaSprint.tag}\n  - &t2c1DevelopClientVersion ${SEED_TAGS.developClient.tag}\n  - &t2c1HelmTargetBranch main\n`,
    "charts/smoke-tenant2/client1/values-extra.yaml": `variables:\n  - &t2c1QaSprintVersionExtra ${SEED_TAGS.qaSprint.tag}\n  - &t2c1HelmTargetBranchExtra main\n`,
    "charts/smoke-tenant2/client2/values.yaml": `variables:\n${t2c2QaSprintLine}  - &t2c2DevelopClientVersion ${SEED_TAGS.developClient.tag}\n  - &t2c2HelmTargetBranch ${HELM_TARGET_BRANCH}\n`,
  }
}

/**
 * chartリポジトリ2用。`sample-qa-sprint`を`sharedQaSprintVersion`として登録し、
 * 「同じappが複数のchartリポジトリにまたがって登録された状態」を作る。向き先ブランチは
 * `HELM_TARGET_BRANCH`と同じ値にして差分なしにし、image tag更新だけでMRができるようにする。
 */
const CHART2_SEED_FILES: Record<string, string> = {
  "charts/shared-app/values.yaml": `variables:\n  - &sharedQaSprintVersion ${SEED_TAGS.qaSprint.tag}\n  - &sharedHelmTargetBranch ${HELM_TARGET_BRANCH}\n`,
}

const env = loadEnvConfig()
const gitlab = createClient(env.gitlabUrl, env.accessToken)
const project = await gitlab.Projects.show(projectId)
console.log(`対象(chart1): ${String(project.path_with_namespace)} (${env.gitlabUrl})`)
if (chart2ProjectId !== undefined) {
  const project2 = await gitlab.Projects.show(chart2ProjectId)
  console.log(`対象(chart2): ${String(project2.path_with_namespace)} (${env.gitlabUrl})`)
} else {
  console.log("対象(chart2): SMOKE_CHART2_PROJECT_ID 未設定のためスキップ")
}
console.log(apply ? "モード: --apply（実際に反映します）" : "モード: dry-run（--apply で反映）")
// 壊れたシードかどうかはファイル名の一覧に出ないため、モード行の隣で明示する
// （dry-runを見てから--applyする運用なので、見分けが付かないと取り違えて書き込みうる）
if (brokenAnchor) {
  console.log(
    "シード: --broken-anchor（charts/smoke-tenant2/client2/values.yaml から " +
      "t2c2QaSprintVersion を抜いた版。tenant2/client2 が ERROR になる）",
  )
}

/**
 * シード値に使うタグがソースリポジトリに実在することを保証する。無い場合は追跡ブランチの
 * 先頭に作成する（スモークテスト用リポジトリはコミットが少なく、古いコミットを選べない
 * ことがあるため）。シードタグより新しいタグが1件も無いと「差分なし」でシナリオが
 * 成立しないので、その場合は警告する。
 */
async function ensureSeedTags(): Promise<void> {
  for (const { projectIdEnvVar, label, branch, tag } of Object.values(SEED_TAGS)) {
    const sourceProjectId = requireProjectId(projectIdEnvVar, label)
    const tags = await gitlab.Tags.all(sourceProjectId)
    const names = tags.map((t) => String(t.name))
    if (names.includes(tag)) {
      console.log(`- シードタグ ${tag}（project ${sourceProjectId}）: 既に存在`)
    } else {
      console.log(`- シードタグ ${tag} を project ${sourceProjectId} の ${branch} に作成`)
      if (apply) await gitlab.Tags.create(sourceProjectId, tag, branch)
    }
    const branchName = toBranchName(branch)
    const seedTag = parseTag(toTagName(tag), branchName, SEED_TAG_FORMAT)
    const latestTag = findLatestParsedTag(names.map(toTagName), branchName, SEED_TAG_FORMAT)
    const hasNewerTag =
      seedTag !== undefined && latestTag !== undefined && latestTag.builtAt > seedTag.builtAt
    if (!hasNewerTag) {
      console.log(
        `  ⚠ project ${sourceProjectId} に ${tag} より新しいタグがありません。` +
          `このままだと差分なし（SKIPPED）になります`,
      )
    }
  }
}

/** `HELM_TARGET_BRANCH` が対象プロジェクトの `main` から派生していなければ作成する */
async function ensureTargetBranch(targetProjectId: number, label: string): Promise<void> {
  const branches = await gitlab.Branches.all(targetProjectId)
  const names = branches.map((branch) => String(branch.name))
  if (names.includes(HELM_TARGET_BRANCH)) {
    console.log(`- [${label}] ブランチ ${HELM_TARGET_BRANCH}: 既に存在（変更なし）`)
  } else {
    console.log(`- [${label}] ブランチ ${HELM_TARGET_BRANCH} を main から作成`)
    if (apply) await gitlab.Branches.create(targetProjectId, HELM_TARGET_BRANCH, "main")
  }
}

/** 指定したプロジェクトの `main` に、指定したvalues.yaml群を初期状態で用意する */
async function seedFiles(
  targetProjectId: number,
  label: string,
  files: Record<string, string>,
): Promise<void> {
  const actions = await Promise.all(
    Object.entries(files).map(async ([filePath, content]) => {
      const exists = await fileExists(targetProjectId, filePath)
      return { action: exists ? ("update" as const) : ("create" as const), filePath, content }
    }),
  )
  for (const action of actions) {
    console.log(`- [${label}] ${action.action} ${action.filePath}（初期値に戻す）`)
  }
  if (apply) {
    await gitlab.Commits.create(
      targetProjectId,
      "main",
      "smoke test: reset seeded values.yaml",
      actions,
    )
  }
}

/** `main` にファイルがあるか。取得できなければ理由を問わず無いものとして扱う（`create`で作り直す） */
async function fileExists(targetProjectId: number, filePath: string): Promise<boolean> {
  try {
    await gitlab.RepositoryFiles.show(targetProjectId, filePath, "main")
    return true
  } catch {
    return false
  }
}

async function setup(): Promise<void> {
  await ensureSeedTags()
  await ensureTargetBranch(projectId, "chart1")
  await seedFiles(projectId, "chart1", buildChart1SeedFiles(brokenAnchor))

  if (chart2ProjectId !== undefined) {
    await ensureTargetBranch(chart2ProjectId, "chart2")
    await seedFiles(chart2ProjectId, "chart2", CHART2_SEED_FILES)
  } else {
    console.log("- [chart2] SMOKE_CHART2_PROJECT_ID 未設定のためスキップ")
  }
}

/** オープン中MRのクローズと固定ブランチの削除。chartリポジトリしか触らないので単独で呼べる */
async function resetProject(targetProjectId: number, label: string): Promise<void> {
  const mergeRequests = await gitlab.MergeRequests.all({
    projectId: targetProjectId,
    state: "opened",
  })
  const targets = mergeRequests.filter((mr) => isFeatureBranch(String(mr.source_branch)))
  for (const mr of targets) {
    console.log(`- [${label}] MR !${mr.iid}（${String(mr.source_branch)}）をクローズ`)
    if (apply) {
      await gitlab.MergeRequests.edit(targetProjectId, Number(mr.iid), { stateEvent: "close" })
    }
  }

  const branches = await gitlab.Branches.all(targetProjectId)
  const staleBranches = branches.map((branch) => String(branch.name)).filter(isFeatureBranch)
  for (const name of staleBranches) {
    console.log(`- [${label}] ブランチ ${name} を削除`)
    if (apply) await gitlab.Branches.remove(targetProjectId, name)
  }

  if (targets.length === 0 && staleBranches.length === 0) {
    console.log(`- [${label}] 片付ける対象はありません`)
  }
}

async function reset(): Promise<void> {
  await resetProject(projectId, "chart1")
  if (chart2ProjectId !== undefined) {
    await resetProject(chart2ProjectId, "chart2")
  } else {
    console.log("- [chart2] SMOKE_CHART2_PROJECT_ID 未設定のためスキップ")
  }
}

await (command === "setup" ? setup() : reset())
console.log(apply ? "完了" : "dry-run 完了（--apply を付けると実行します）")
