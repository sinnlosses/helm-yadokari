import type { AccessTokenEnvName, ChartDirName, ConfigUnit, ProjectId } from "../../domain/types.js"
import type { PlatformAdapter } from "./adapter.js"

/**
 * `ProjectId`から、そのプロジェクトを読めるトークンのアダプタを引き当てて委譲するだけの
 * `PlatformAdapter`を1枚かぶせる。呼び出し側は戻り値を1つの`PlatformAdapter`として扱い、
 * 複数トークンで動いていることを意識しない。
 *
 * `adapters`は渡される時点でトークン1本につき1つで、それぞれそのトークンで作ったAPIクライアント
 * を内側に持つ。分けてあるのは権限分離のため——トークンはグループごとに1本で、自分の
 * グループにしか届かない（`docs/architecture.md`「アクセストークンはchartリポジトリ単位に…」節）。
 *
 * 401と未設定トークンは素の`Error`に読み替え、該当chartリポジトリだけを`ERROR`に留める。
 */
export function createTokenRoutedAdapter(
  configUnits: readonly ConfigUnit[],
  adapters: ReadonlyMap<AccessTokenEnvName, PlatformAdapter>,
): PlatformAdapter {
  assertAdapterAvailable(configUnits, adapters)
  const routes = buildRoutes(configUnits, adapters)
  const representative = firstAdapter(adapters)

  // `async`にするのは、`lookupRoute()`（表に無い`ProjectId`）の同期的な例外もPromiseの
  // rejectionにするため。`PlatformAdapter`の各関数はPromiseを返す契約なので、同期で
  // throwすると呼び出し側の`.catch()`をすり抜けてしまう。
  const call = async <T>(
    projectId: ProjectId,
    invoke: (adapter: PlatformAdapter) => Promise<T>,
  ): Promise<T> => callRoute(lookupRoute(routes, projectId), invoke)

  return {
    listTags: (projectId) => call(projectId, (adapter) => adapter.listTags(projectId)),
    branchExists: (projectId, branch) =>
      call(projectId, (adapter) => adapter.branchExists(projectId, branch)),
    deleteBranch: (projectId, branch) =>
      call(projectId, (adapter) => adapter.deleteBranch(projectId, branch)),
    getBranchHeadSha: (projectId, branch) =>
      call(projectId, (adapter) => adapter.getBranchHeadSha(projectId, branch)),
    getFileContent: (projectId, filePath, ref) =>
      call(projectId, (adapter) => adapter.getFileContent(projectId, filePath, ref)),
    openMergeRequestExists: (projectId, sourceBranch) =>
      call(projectId, (adapter) => adapter.openMergeRequestExists(projectId, sourceBranch)),
    commitFileUpdates: (projectId, featureBranch, baseBranch, message, files) =>
      call(projectId, (adapter) =>
        adapter.commitFileUpdates(projectId, featureBranch, baseBranch, message, files),
      ),
    createMergeRequest: (projectId, sourceBranch, targetBranch, title, description) =>
      call(projectId, (adapter) =>
        adapter.createMergeRequest(projectId, sourceBranch, targetBranch, title, description),
      ),
    createTag: (projectId, tagName, ref) =>
      call(projectId, (adapter) => adapter.createTag(projectId, tagName, ref)),
    getProjectWebUrl: (projectId) =>
      call(projectId, (adapter) => adapter.getProjectWebUrl(projectId)),
    getLatestPipelineForRef: (projectId, ref) =>
      call(projectId, (adapter) => adapter.getLatestPipelineForRef(projectId, ref)),
    buildTagUrl: representative.buildTagUrl,
    buildCompareUrl: representative.buildCompareUrl,
    isFatalError: representative.isFatalError,
    extractHttpStatus: representative.extractHttpStatus,
  }
}

/** `ProjectId`1つが結びつくアダプタと、401・未設定を読み替えるために持ち回るchart側の情報 */
type Route =
  | {
      readonly kind: "declared"
      readonly adapter: PlatformAdapter
      readonly chartDirName: ChartDirName
      readonly accessTokenEnv: AccessTokenEnvName
    }
  | {
      readonly kind: "missing"
      readonly chartDirName: ChartDirName
      readonly accessTokenEnv: AccessTokenEnvName
    }

/**
 * 宣言された環境変数のアダプタが1つも無い（`adapters`が空）と、代表アダプタ（`buildTagUrl`等の
 * 委譲先）を選べない。`registry.yaml`の`accessTokenEnv`の宣言自体はあるのに、その環境変数の値が
 * 全chartで未設定というケース（CI/CD変数の設定漏れ）なので、どのchartディレクトリがどの
 * 環境変数を要求しているかを全件並べて例外を投げる。chartリポジトリ単位の`ERROR`に落とせるのは、
 * 他に1本でも読めるトークンがあるときだけ。
 */
function assertAdapterAvailable(
  configUnits: readonly ConfigUnit[],
  adapters: ReadonlyMap<AccessTokenEnvName, PlatformAdapter>,
): void {
  if (adapters.size > 0) return
  const requirements = [
    ...new Set(configUnits.map((unit) => `[chart: ${unit.chartDirName}] ${unit.accessTokenEnv}`)),
  ]
  throw new Error(
    "アクセストークンが1つも読めません。次の chart ディレクトリが要求する環境変数を " +
      `Settings > CI/CD > Variables（ローカルなら .env）に設定してください: ${requirements.join(", ")}`,
  )
}

/**
 * `configUnits`（`chartRepo.projectId`と`apps[].projectId`）から`ProjectId`→`Route`の表を作る。
 * 同じ`ProjectId`が複数の設定ユニットから参照されても、`accessTokenEnv`は
 * `validateAccessTokenEnvConsistency()`が一致を保証しているため、先勝ちでよい。
 */
function buildRoutes(
  configUnits: readonly ConfigUnit[],
  adapters: ReadonlyMap<AccessTokenEnvName, PlatformAdapter>,
): ReadonlyMap<ProjectId, Route> {
  const routes = new Map<ProjectId, Route>()
  for (const configUnit of configUnits) {
    const route = resolveRoute(configUnit, adapters)
    for (const projectId of projectIdsOf(configUnit)) {
      if (!routes.has(projectId)) routes.set(projectId, route)
    }
  }
  return routes
}

function resolveRoute(
  configUnit: ConfigUnit,
  adapters: ReadonlyMap<AccessTokenEnvName, PlatformAdapter>,
): Route {
  const { chartDirName, accessTokenEnv } = configUnit
  const adapter = adapters.get(accessTokenEnv)
  return adapter === undefined
    ? { kind: "missing", chartDirName, accessTokenEnv }
    : { kind: "declared", adapter, chartDirName, accessTokenEnv }
}

function projectIdsOf(configUnit: ConfigUnit): readonly ProjectId[] {
  return [configUnit.chartRepo.projectId, ...configUnit.apps.map((app) => app.projectId)]
}

function lookupRoute(routes: ReadonlyMap<ProjectId, Route>, projectId: ProjectId): Route {
  const route = routes.get(projectId)
  if (route === undefined) {
    throw new Error(`projectId "${projectId}" に対応するアクセストークンの割り当てが見つかりません`)
  }
  return route
}

/**
 * `route`が指すアダプタへ委譲し、401を素の`Error`に読み替える。`missing`（宣言した環境変数が
 * 未設定）は呼び出し自体を素の`Error`に差し替える。
 */
async function callRoute<T>(
  route: Route,
  invoke: (adapter: PlatformAdapter) => Promise<T>,
): Promise<T> {
  if (route.kind === "missing") {
    throw new Error(`[chart: ${route.chartDirName}] 環境変数 ${route.accessTokenEnv} が未設定です`)
  }
  try {
    return await invoke(route.adapter)
  } catch (err) {
    if (route.adapter.extractHttpStatus(err) !== 401) throw err
    throw new Error(
      `[chart: ${route.chartDirName}] 環境変数 ${route.accessTokenEnv} のトークンで HTTP 401 が返りました`,
      { cause: err },
    )
  }
}

// assertAdapterAvailable() が組み立て時に空を弾いているため、以下のthrowには到達しない
// 防御的な分岐
function firstAdapter(adapters: ReadonlyMap<AccessTokenEnvName, PlatformAdapter>): PlatformAdapter {
  const first = adapters.values().next().value
  if (first === undefined) {
    throw new Error("アクセストークンのアダプタが1つも指定されていません")
  }
  return first
}
