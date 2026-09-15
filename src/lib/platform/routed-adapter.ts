import type { AccessTokenEnvName, ChartDirName, ConfigUnit, ProjectId } from "../../domain/types.js"
import type { PlatformAdapter } from "./adapter.js"

/**
 * `createRoutedAdapter()`の第2引数。`registry.yaml`の`accessTokenEnv`で宣言された名前ごとの
 * `PlatformAdapter`（`declared`）と、宣言の無いchartリポジトリが使う既定トークンのもの
 * （`fallback`。未設定なら`undefined`）。GitLab/GitHubどちらのアダプタを組み立てるかは
 * `main.ts`の`createPlatformAdapter()`が決め、ここでは1つの表としてまとめるだけ
 * （`lib/platform/`が`lib/gitlab/`・`lib/github/`をimportしないため）。
 */
export type AdaptersByAccessToken = {
  readonly declared: ReadonlyMap<AccessTokenEnvName, PlatformAdapter>
  readonly fallback: PlatformAdapter | undefined
}

/**
 * `configUnits`から`ProjectId`→使うべきアダプタの対応を組み立て、`ProjectId`を引数に取る
 * `PlatformAdapter`の各関数をその対応へ振り分けるだけの`PlatformAdapter`を1枚かぶせる。
 * `steps/`はこの戻り値を1つの`PlatformAdapter`として扱い、複数トークンで動いていることを
 * 意識しない。
 *
 * 宣言された名前のアダプタへ委譲した呼び出しの401は、そのchartリポジトリの設定ユニットだけを
 * `ERROR`に留めるため、HTTPの構造を持たない素の`Error`に読み替えて投げ直す
 * （`docs/architecture.md`「アクセストークンはchartリポジトリ単位に宣言し…」節）。宣言した
 * 環境変数の値が未設定（`declared`に無い）だったときも同じく素の`Error`にする。`fallback`
 * 経由の呼び出しは読み替えず、そのまま投げる（従来どおり`isFatalError()`が401を`FatalError`に
 * 昇格させる）。
 *
 * 宣言の無い設定ユニットがあるのに`fallback`が`undefined`のとき、または宣言された環境変数の
 * アダプタが1つも無く（`declared`が空）`fallback`も`undefined`のときは、組み立てたこの時点で
 * 例外を投げる（`config/`の読み込みエラーと同じ、実行全体の即時終了の経路）。
 */
export function createRoutedAdapter(
  configUnits: readonly ConfigUnit[],
  adapters: AdaptersByAccessToken,
): PlatformAdapter {
  assertFallbackAvailable(configUnits, adapters.fallback)
  assertDeclaredAdapterAvailable(configUnits, adapters)
  const routes = buildRoutes(configUnits, adapters)
  const representative = adapters.fallback ?? firstDeclared(adapters.declared)

  // `async`にするのは、`lookupRoute()`（表に無い`ProjectId`）の同期的な例外もPromiseの
  // rejectionにするため。`PlatformAdapter`の各関数はPromiseを返す契約なので、同期で
  // throwすると呼び出し側（`steps/`）の`.catch()`をすり抜けてしまう。
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
  | { readonly kind: "fallback"; readonly adapter: PlatformAdapter }
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
 * 宣言の無い（`accessTokenEnv === undefined`）設定ユニットが1つでもあるのに`fallback`が
 * `undefined`なら、どのchartディレクトリが既定`ACCESS_TOKEN`を要求しているかを全件並べて
 * 例外を投げる。
 */
function assertFallbackAvailable(
  configUnits: readonly ConfigUnit[],
  fallback: PlatformAdapter | undefined,
): void {
  if (fallback !== undefined) return
  const chartDirNames = [
    ...new Set(
      configUnits
        .filter((unit) => unit.accessTokenEnv === undefined)
        .map((unit) => unit.chartDirName),
    ),
  ]
  if (chartDirNames.length === 0) return
  throw new Error(
    `ACCESS_TOKEN が未設定です。次の chart ディレクトリは accessTokenEnv の宣言が無く、` +
      `既定の ACCESS_TOKEN を必要とします: ${chartDirNames.join(", ")}`,
  )
}

/**
 * `assertFallbackAvailable()`を通過した後（＝宣言の無い設定ユニットは無いか、`fallback`がある）
 * でも、宣言された環境変数のアダプタが1つも無く（`adapters.declared`が空）`fallback`も
 * `undefined`だと、代表アダプタ（`buildTagUrl`等の委譲先）を選べない。`registry.yaml`の
 * `accessTokenEnv`の宣言自体はあるのに、その環境変数の値が全chartで未設定というケース
 * （CI/CD変数の設定漏れ）なので、どのchartディレクトリがどの環境変数を要求しているかを
 * 全件並べて例外を投げる。
 */
function assertDeclaredAdapterAvailable(
  configUnits: readonly ConfigUnit[],
  adapters: AdaptersByAccessToken,
): void {
  if (adapters.fallback !== undefined) return
  if (adapters.declared.size > 0) return
  const requirements = [
    ...new Set(
      configUnits.map(
        (unit) => `[chart: ${unit.chartDirName}] ${unit.accessTokenEnv ?? "ACCESS_TOKEN"}`,
      ),
    ),
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
  adapters: AdaptersByAccessToken,
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

function resolveRoute(configUnit: ConfigUnit, adapters: AdaptersByAccessToken): Route {
  const { accessTokenEnv } = configUnit
  if (accessTokenEnv === undefined) {
    const { fallback } = adapters
    // assertFallbackAvailable() が組み立て時に例外を投げているため到達しない防御的な分岐
    if (fallback === undefined) {
      throw new Error(`chart "${configUnit.chartDirName}" の既定アクセストークンが見つかりません`)
    }
    return { kind: "fallback", adapter: fallback }
  }
  const adapter = adapters.declared.get(accessTokenEnv)
  return adapter === undefined
    ? { kind: "missing", chartDirName: configUnit.chartDirName, accessTokenEnv }
    : { kind: "declared", adapter, chartDirName: configUnit.chartDirName, accessTokenEnv }
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
 * `route`が指すアダプタへ委譲する。`declared`だけ401を読み替え、`missing`は呼び出し自体を
 * 素の`Error`に差し替える。`fallback`はそのまま投げるので、既定`ACCESS_TOKEN`の401は
 * 従来どおり`isFatalError()`で`FatalError`に昇格する。
 */
async function callRoute<T>(
  route: Route,
  invoke: (adapter: PlatformAdapter) => Promise<T>,
): Promise<T> {
  if (route.kind === "missing") {
    throw new Error(`[chart: ${route.chartDirName}] 環境変数 ${route.accessTokenEnv} が未設定です`)
  }
  if (route.kind === "fallback") {
    return invoke(route.adapter)
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

// assertDeclaredAdapterAvailable() が組み立て時に空を弾いているため、以下のthrowには到達しない
// 防御的な分岐
function firstDeclared(
  declared: ReadonlyMap<AccessTokenEnvName, PlatformAdapter>,
): PlatformAdapter {
  const first = declared.values().next().value
  if (first === undefined) {
    throw new Error("アクセストークンのアダプタが1つも指定されていません")
  }
  return first
}
