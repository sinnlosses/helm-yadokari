import { parseArgs } from "node:util"

import { AccessLevel } from "@gitbeaker/rest"

import { loadEnvConfig } from "../../src/lib/env.js"
import { createClient } from "../../src/lib/gitlab/api.js"
import { extractHttpStatus } from "../../src/lib/gitlab/errors.js"
import { toErrorMessage } from "../../src/utils/errors.js"
import {
  ACCESS_TOKEN_ENV_NAME,
  buildAppConfigYamlContent,
  buildRegistryYamlContent,
  buildTokenSkipGuidance,
  buildValuesYamlContent,
  CHART_DIR_NAME,
  CHART_PROJECT_NAME,
  computeExpiresAt,
  CONFIG_UNIT_DIR,
  defaultTokenName,
  GROUP_TOKEN_NAME,
  HELM_TARGET_BRANCH,
  SEED_TAG,
  SOURCE_PROJECT_NAME,
  TOKEN_SCOPES,
  VALUES_PATH,
} from "./group-fixture-content.js"

// docs/smoke-test.md「パス5: 複数グループ（宣言トークン）」の2グループ目（グループB）を
// 用意するスクリプト。scripts/smoke/smoke-fixture.ts は既存プロジェクトにしか書かない設計
// （事故時の影響を既存プロジェクトへの書き込みに留めるため）なので、グループ・プロジェクトの
// 新規作成はここに隔離し、smoke-fixture.ts 自体は変更しない。書き込む内容（values.yaml・
// config/の2ファイル・トークン名の組み立て）は group-fixture-content.ts にある。
//
//   provision --group-path <path> [--group-name <name>] [--use-existing-group] [--skip-token] [--apply]
//     トップレベルグループ<path>を作り、その下にchartリポジトリ（yadokari-smoke-test-chart-b）と
//     ソースリポジトリ（sample-smoke-b-app）を作成する。最後にGroup Access Tokenを発行し、
//     グループID・projectId・トークン値・config/へ置くYAMLの中身を表示する
//   token --group-path <path> [--name <name>] [--apply]
//     既存グループ（グループA用を想定）に同じ条件のGroup Access Tokenを発行して表示する
//
// 既定はdry-run（何をするかを表示するだけ）。実際に反映するには --apply を付ける。
// `ACCESS_TOKEN`（.env）には `api` スコープの個人PATを使うこと。グループ作成・トークン発行が
// `api` スコープでしかできないAPIのため（Group/Project Access Tokenでは操作できない）。
//
// 安全策: provision は --group-path のグループが既に存在すれば何もせず中止する
// （既存リソースには書き込まない）。--use-existing-group 指定時はこれを反転し、グループが
// 存在しない場合に中止する。このスクリプトは既存プロジェクトに一切書き込まず、新しい
// プロジェクトを名前（yadokari-smoke-test-chart-b / sample-smoke-b-app）で作るだけなので、
// 安全策として足りるのはその2名との衝突確認であり、グループに無関係な既存プロジェクトが
// あっても中止しない（衝突すれば中止する）。削除機能は持たない。
//
// gitlab.com はAPIからのトップレベルグループ作成を許可しない（403）。また gitlab.com の
// Free プランでは Group/Project Access Token を発行できない（Premium以上限定。self-managedは
// 全ティア可）。この2点により、gitlab.com では UI でグループを作ったうえで
// --use-existing-group --skip-token を付けて実行する運用になる（詳細は docs/smoke-test.md
// 「2グループ目（パス5）に必要なもの」）。

const USAGE =
  "usage: tsx scripts/smoke/provision-group.ts provision --group-path <path> " +
  "[--group-name <name>] [--use-existing-group] [--skip-token] [--apply]\n" +
  "       tsx scripts/smoke/provision-group.ts token --group-path <path> " +
  "[--name <name>] [--apply]"

type ParsedArgs =
  | {
      readonly command: "provision"
      readonly groupPath: string
      readonly groupName: string
      readonly useExistingGroup: boolean
      readonly skipToken: boolean
      readonly apply: boolean
    }
  | {
      readonly command: "token"
      readonly groupPath: string
      readonly name: string
      readonly apply: boolean
    }

/**
 * typoしたフラグを黙って無視せず即終了させるため`strict: true`にする
 * （scripts/smoke/smoke-fixture.ts の parseCliArgs と同じ方針）。
 */
function parseCliArgs(argv: readonly string[]): ParsedArgs {
  try {
    const { values, positionals } = parseArgs({
      args: [...argv],
      options: {
        "group-path": { type: "string" },
        "group-name": { type: "string" },
        name: { type: "string" },
        "use-existing-group": { type: "boolean", default: false },
        "skip-token": { type: "boolean", default: false },
        apply: { type: "boolean", default: false },
      },
      allowPositionals: true,
      strict: true,
    })

    const command = positionals[0]
    const groupPath = values["group-path"]
    if (groupPath === undefined || groupPath.trim() === "") {
      console.error("provision-group ERROR: --group-path は必須です")
      console.error(USAGE)
      process.exit(1)
    }
    const apply = values.apply

    if (command === "provision") {
      const groupNameRaw = values["group-name"]
      const groupName = groupNameRaw?.trim() ? groupNameRaw : groupPath
      return {
        command,
        groupPath,
        groupName,
        useExistingGroup: values["use-existing-group"],
        skipToken: values["skip-token"],
        apply,
      }
    }
    if (command === "token") {
      const nameRaw = values.name
      const name = nameRaw?.trim() ? nameRaw : defaultTokenName(groupPath)
      return { command, groupPath, name, apply }
    }
    console.error(USAGE)
    process.exit(1)
  } catch (err) {
    console.error(`provision-group ERROR: 引数が不正です（${toErrorMessage(err)}）`)
    console.error(USAGE)
    process.exit(1)
  }
}

const parsedArgs = parseCliArgs(process.argv.slice(2))

const env = loadEnvConfig()
// smoke-fixture.tsと同じ理由で GitLab 専用（gitbeakerのクライアントAPIを直接叩くため）
if (env.platform !== "gitlab") {
  console.error(
    `provision-group ERROR: このスクリプトは現時点で GitLab 専用です（PLATFORM=${env.platform}）`,
  )
  process.exit(1)
}
if (env.accessToken === undefined) {
  console.error(
    "provision-group ERROR: ACCESS_TOKEN が未設定です（api スコープの個人PATを設定してください）",
  )
  process.exit(1)
}
const gitlab = createClient(env.platformUrl, env.accessToken)

/** グループが実在するか。取得できなければ理由を問わず「無い」として扱う */
async function groupExists(groupPath: string): Promise<boolean> {
  try {
    await gitlab.Groups.show(groupPath)
    return true
  } catch {
    return false
  }
}

/**
 * `--use-existing-group`向け。グループが存在し、かつこれから作る2プロジェクト
 * （`CHART_PROJECT_NAME`・`SOURCE_PROJECT_NAME`）と同じpathのプロジェクトを直下に
 * 持たないことを確認してgroupIdを返す。存在しない、または名前が衝突する場合は中止する。
 * このスクリプトは既存プロジェクトに一切書き込まず新しいプロジェクトを名前で作るだけなので、
 * 安全策として足りるのはこの2名との衝突確認であり、無関係な既存プロジェクトの有無は問わない
 * （サブグループ配下までは見ない。新規作成時の`groupExists()`チェックと対になる）
 */
async function requireExistingGroupWithoutProjectNameConflict(groupPath: string): Promise<number> {
  const group = await gitlab.Groups.show(groupPath).catch(() => undefined)
  if (group === undefined) {
    console.error(
      `provision-group ERROR: --use-existing-group が指定されましたが、` +
        `グループ ${groupPath} が見つかりません`,
    )
    process.exit(1)
  }

  const projects = await gitlab.Groups.allProjects(groupPath, { simple: true })
  const conflict = projects.find(
    (project) => project.path === CHART_PROJECT_NAME || project.path === SOURCE_PROJECT_NAME,
  )
  if (conflict !== undefined) {
    console.error(
      `provision-group ERROR: グループ ${groupPath} には既に ${conflict.path}` +
        `（id: ${conflict.id}）があります。既存プロジェクトには書き込まないため中止します`,
    )
    process.exit(1)
  }

  return Number(group.id)
}

/** GroupAccessTokenの発行がgitlab.com Freeプランの制約で拒否されたときの応答か */
function isTokenPermissionError(error: unknown): boolean {
  const status = extractHttpStatus(error)
  return status === 400 || status === 403
}

async function provision(
  groupPath: string,
  groupName: string,
  apply: boolean,
  useExistingGroup: boolean,
  skipToken: boolean,
): Promise<void> {
  const existingGroupId = useExistingGroup
    ? await requireExistingGroupWithoutProjectNameConflict(groupPath)
    : undefined
  if (existingGroupId !== undefined) {
    console.log(
      `- 既存グループ ${groupPath}（id: ${existingGroupId}）を使う` +
        `（同名プロジェクトが無いことを確認）`,
    )
  } else {
    if (await groupExists(groupPath)) {
      console.error(
        `provision-group ERROR: グループ ${groupPath} は既に存在します。既存リソースには書き込まないため中止します`,
      )
      process.exit(1)
    }
    console.log(`- グループ ${groupPath}（name: ${groupName}, visibility: private）を作成`)
  }

  const expiresAt = computeExpiresAt(new Date())
  console.log(
    `- chartリポジトリ ${groupPath}/${CHART_PROJECT_NAME} を作成（private・main・README初期化）`,
  )
  console.log(
    `- ソースリポジトリ ${groupPath}/${SOURCE_PROJECT_NAME} を作成（private・main・README初期化）`,
  )
  console.log(`- [chart] ブランチ ${HELM_TARGET_BRANCH} を main から作成`)
  console.log(
    `- [chart] ${VALUES_PATH} をmainにコミット` +
      `（smokeBAppVersion=${SEED_TAG} / smokeBHelmTargetBranch=${HELM_TARGET_BRANCH}）`,
  )
  console.log(`- [source] README初期化コミット（main）にシードタグ ${SEED_TAG} を作成`)
  console.log(`- [source] main にもう1コミット積み、HEADをシードタグより先に進める`)
  if (skipToken) {
    console.log("- Group Access Token の発行はスキップ（--skip-token）")
  } else {
    console.log(
      `- Group Access Token ${GROUP_TOKEN_NAME} を発行` +
        `（scopes: ${TOKEN_SCOPES.join(",")} / role: Developer / 有効期限: ${expiresAt}）`,
    )
  }

  if (!apply) return

  const groupId =
    existingGroupId ??
    Number((await gitlab.Groups.create(groupName, groupPath, { visibility: "private" })).id)

  const chartProject = await gitlab.Projects.create({
    name: CHART_PROJECT_NAME,
    path: CHART_PROJECT_NAME,
    namespaceId: groupId,
    visibility: "private",
    defaultBranch: "main",
    initializeWithReadme: true,
  })
  const chartProjectId = Number(chartProject.id)

  const sourceProject = await gitlab.Projects.create({
    name: SOURCE_PROJECT_NAME,
    path: SOURCE_PROJECT_NAME,
    namespaceId: groupId,
    visibility: "private",
    defaultBranch: "main",
    initializeWithReadme: true,
  })
  const sourceProjectId = Number(sourceProject.id)

  await gitlab.Branches.create(chartProjectId, HELM_TARGET_BRANCH, "main")
  await gitlab.Commits.create(chartProjectId, "main", "smoke test: seed values.yaml for group B", [
    { action: "create", filePath: VALUES_PATH, content: buildValuesYamlContent(SEED_TAG) },
  ])

  // README初期化直後のmainのHEADがシードタグの指すコミットになる。この直後にもう1コミット
  // 積むことで、HEADはシードタグより新しく・HEADにタグ形式のタグが無い状態を作る
  // （docs/requirements.md 4.1節「タグ自動作成」の前提。CLIがこの状態を見て新しいタグを作る）
  await gitlab.Tags.create(sourceProjectId, SEED_TAG, "main")
  await gitlab.Commits.create(sourceProjectId, "main", "smoke test: advance HEAD past seed tag", [
    {
      action: "create",
      filePath: "SMOKE_MARKER.md",
      content: "helm-yadokari docs/smoke-test.md パス5用のソースリポジトリ\n",
    },
  ])

  console.log("")
  console.log("=== 作成結果 ===")
  console.log(`グループID: ${groupId}`)
  console.log(`chartプロジェクトID: ${chartProjectId}`)
  console.log(`ソースプロジェクトID: ${sourceProjectId}`)

  if (skipToken) {
    console.log("")
    console.log(buildTokenSkipGuidance())
  } else {
    const token = await issueGroupAccessToken(groupId, expiresAt)
    console.log(`トークン値（この場でしか取得できません。すぐに控えてください）: ${token.token}`)
    console.log("")
    console.log(".env に追記する行:")
    console.log(`${ACCESS_TOKEN_ENV_NAME}=${token.token}`)
  }

  console.log("")
  console.log(`config/${CHART_DIR_NAME}/registry.yaml:`)
  console.log(buildRegistryYamlContent(chartProjectId, sourceProjectId))
  console.log(`config/${CHART_DIR_NAME}/${CONFIG_UNIT_DIR}/config.yaml:`)
  console.log(buildAppConfigYamlContent(sourceProjectId))
}

/**
 * 発行が400/403（gitlab.com Freeプランの制約）で失敗した場合は、それまでに作成した
 * グループ・プロジェクトを残したまま案内を表示して終了コード1で終わる（作り直しは不要）。
 * それ以外のエラーはmain()側の共通ハンドラに委ねる。
 */
async function issueGroupAccessToken(groupId: number, expiresAt: string) {
  try {
    return await gitlab.GroupAccessTokens.create(
      groupId,
      GROUP_TOKEN_NAME,
      [...TOKEN_SCOPES],
      expiresAt,
      { accessLevel: AccessLevel.DEVELOPER },
    )
  } catch (err) {
    if (!isTokenPermissionError(err)) throw err
    console.error("")
    console.error(buildTokenSkipGuidance())
    console.error("")
    console.error(
      "これまでに作成したグループ・プロジェクトはそのまま残っています。作り直す必要はありません。" +
        "--skip-token を付けて再実行すれば、このグループを --use-existing-group で使い続けられます。",
    )
    process.exit(1)
  }
}

async function issueToken(groupPath: string, name: string, apply: boolean): Promise<void> {
  const expiresAt = computeExpiresAt(new Date())
  console.log(
    `- グループ ${groupPath} に Group Access Token ${name} を発行` +
      `（scopes: ${TOKEN_SCOPES.join(",")} / role: Developer / 有効期限: ${expiresAt}）`,
  )

  if (!apply) return

  // resourceIdはグループのnamespace pathをそのまま渡せる（GitLab APIがIDと同様に受け付ける）ため、
  // provisionと違いグループIDを事前に引く必要がない
  const token = await gitlab.GroupAccessTokens.create(
    groupPath,
    name,
    [...TOKEN_SCOPES],
    expiresAt,
    {
      accessLevel: AccessLevel.DEVELOPER,
    },
  )

  console.log("")
  console.log(`トークン値（この場でしか取得できません。すぐに控えてください）: ${token.token}`)
  console.log(`有効期限: ${expiresAt}`)
  console.log(".env に追記する行の例（宣言先のchartに合わせて名前を選んでください）:")
  console.log(`ACCESS_TOKEN_<GROUP>=${token.token}`)
}

/**
 * GitLabへ問い合わせる処理はすべてこの中から呼ぶ。gitbeakerの例外は`cause`にリクエスト
 * （＝`private-token`ヘッダ）を抱えたままなので、捕まえずにNodeの既定のエラー表示まで
 * 到達させるとアクセストークンが生のまま端末に出る（smoke-fixture.tsのmain()と同じ理由）。
 */
async function main(): Promise<void> {
  console.log(`GitLabインスタンス: ${env.platformUrl}`)
  console.log(
    parsedArgs.apply ? "モード: --apply（実際に反映します）" : "モード: dry-run（--apply で反映）",
  )

  if (parsedArgs.command === "provision") {
    await provision(
      parsedArgs.groupPath,
      parsedArgs.groupName,
      parsedArgs.apply,
      parsedArgs.useExistingGroup,
      parsedArgs.skipToken,
    )
  } else {
    await issueToken(parsedArgs.groupPath, parsedArgs.name, parsedArgs.apply)
  }
  console.log(parsedArgs.apply ? "完了" : "dry-run 完了（--apply を付けると実行します）")
}

try {
  await main()
} catch (err) {
  console.error(`provision-group ERROR: ${toErrorMessage(err)}`)
  process.exit(1)
}
