import { vi } from "vitest"

import { validateTagFormat } from "../src/domain/tag-format.js"
import { buildTagSourceKey } from "../src/domain/tag-source.js"
import type {
  AppConfig,
  AppUpdatePlan,
  ConfigUnit,
  LatestTagResolution,
  TagName,
  TagSource,
  TagSourceKey,
} from "../src/domain/types.js"
import {
  toAnchorName,
  toBranchName,
  toChartDirName,
  toCommitSha,
  toConfigUnitPath,
  toProjectId,
  toProjectName,
  toTagName,
  toValuesPath,
} from "../src/domain/types.js"
import { extractHttpStatus, isFatalError } from "../src/lib/gitlab/errors.js"
import type { GitlabClient } from "../src/lib/gitlab/gitlab.js"
import type { PlatformAdapter } from "../src/lib/platform/adapter.js"
import type { PlatformAdapterWithCachedReads } from "../src/lib/platform/cached-reads.js"
import { withCachedReads } from "../src/lib/platform/cached-reads.js"
import type { AppOutcome } from "../src/steps/shared/step-outcome.js"

export const makeHttpError = (status: number): Error =>
  new Error("HTTP Error", { cause: { response: { status } } })

/**
 * `vi.mock()`でモックしたGitLabクライアントの置き換え先。実体は使われないため空オブジェクトで
 * 足りる。`as`を使う箇所をここ1つに閉じ込めるためテスト側では組み立てない。
 * `main.test.ts`のように`lib/gitlab/gitlab.js`ごとモックする層のテストでのみ使う
 * （`createClient`の戻り値の置き換え先）。`steps/`のテストは`PlatformAdapter`を直接偽装する
 * `makeAdapter()`を使うため、`GitlabClient`を組み立てる必要が無い。
 */
export const mockGitlab = {} as unknown as GitlabClient

/**
 * `steps/`のテストが受け取る`PlatformAdapter`の偽物。API呼び出しの13関数を`vi.fn()`にした状態で返すため、
 * 各テストは`vi.mocked(adapter.X)`でその場ごとに返り値・実装を差し替えられる。
 * `overrides`は個別の関数を丸ごと差し替えたいとき（稀）に使う。
 *
 * エラー分類の2関数だけは`vi.fn()`にせずGitLab版の実物を入れる。`makeHttpError()`が組み立てるのが
 * gitbeaker形のエラーで、`steps/`のテストが確かめたいのは「401はFatalError、403はERROR」という
 * 振り分けそのものだからである。
 */
export function makeAdapter(overrides: Partial<PlatformAdapter> = {}): PlatformAdapter {
  return {
    listTags: vi.fn(),
    branchExists: vi.fn(),
    deleteBranch: vi.fn(),
    getBranchHeadSha: vi.fn(),
    getFileContent: vi.fn(),
    openMergeRequestExists: vi.fn(),
    commitFileUpdates: vi.fn(),
    createMergeRequest: vi.fn(),
    createTag: vi.fn(),
    getProjectWebUrl: vi.fn(),
    getLatestPipelineForRef: vi.fn(),
    buildTagUrl: vi.fn(),
    buildCompareUrl: vi.fn(),
    isFatalError,
    extractHttpStatus,
    ...overrides,
  }
}

/**
 * `buildPlans()`等に渡す、キャッシュ済みの読み取り（`cached`）付きの`PlatformAdapter`。
 * キャッシュの仕組みは本物（`withCachedReads()`）で、包む対象の`adapter`（`makeAdapter()`の
 * 偽物）だけをテスト側が用意する。**呼び出しごとに作り直す**こと。同じ`adapter`を渡していても、
 * ここで包み直さないとキャッシュしたMapが前のテスト・前の呼び出しから持ち越されてしまう。
 */
export function makeAdapterWithCachedReads(
  adapter: PlatformAdapter,
): PlatformAdapterWithCachedReads {
  return withCachedReads(adapter)
}

/** テストのapp（`makeApp()`）のタグ形式。実際に使われている2形式のうちの1つ */
const BUILD_AT_FORMAT = validateTagFormat("{branch}-build-at-{date}-{time}")

export const OLD_TAG = "main-build-at-20251231-000000"
export const NEW_TAG = toTagName("main-build-at-20260101-000000")
export const HEAD_SHA = toCommitSha("head-sha")

/**
 * `buildPlans()`を通すテストの既定のモック。values.yamlの現在値が`OLD_TAG`（＝`makeResolvedTags()`の
 * 既定の解決結果との差分が1件出る）状態にする。個別のテストは必要なものだけ上書きする。
 * タグの解決は`buildPlans()`の外（`resolveTags()`）で済んでいるため、タグ関連の関数は含めない。
 */
export function mockBuildPlansAdapter(adapter: PlatformAdapter): void {
  vi.mocked(adapter.getFileContent).mockResolvedValue(`variables:\n  - &appVersion ${OLD_TAG}\n`)
  vi.mocked(adapter.getLatestPipelineForRef).mockResolvedValue(undefined)
  vi.mocked(adapter.branchExists).mockResolvedValue(true)
}

/**
 * `resolveTags()`が返す成功の解決結果。既定は追跡ブランチのHEADに`NEW_TAG`だけが付いている
 * （＝`origin: "existing"`の）状態で、HEADに別名のタグも付いている状態を作りたいテストだけ
 * `trackedHeadTagNames`を渡す。
 */
export function resolvedAtHead(
  trackedHeadTagNames: ReadonlySet<TagName> = new Set([NEW_TAG]),
): AppOutcome<LatestTagResolution> {
  return {
    status: "ok",
    value: {
      tag: {
        name: NEW_TAG,
        branchName: toBranchName("main"),
        taggedAt: new Date(Date.UTC(2026, 0, 1)),
      },
      trackedHeadTagNames,
      origin: "existing",
    },
  }
}

/**
 * `buildPlans()`に渡す解決済みの最新タグ。`resolveTags()`が返すマップと同じく解決単位の
 * 値キー（`TagSourceKey`）で引けるので、`buildPlans()`へ渡すのと同じ`configUnits`から
 * 組み立てること。既定は全appが`NEW_TAG`に解決できた状態で、失敗や別のタグを混ぜたいテストだけ
 * `outcomeFor`を渡す。
 */
export function makeResolvedTags(
  configUnits: readonly ConfigUnit[],
  outcomeFor: (app: AppConfig) => AppOutcome<LatestTagResolution> = () => resolvedAtHead(),
): ReadonlyMap<TagSourceKey, AppOutcome<LatestTagResolution>> {
  return new Map(
    configUnits.flatMap((configUnit) =>
      configUnit.apps.map((app): readonly [TagSourceKey, AppOutcome<LatestTagResolution>] => [
        buildTagSourceKey(app),
        outcomeFor(app),
      ]),
    ),
  )
}

export function makeApp(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    projectId: toProjectId("1"),
    projectName: toProjectName("my-app"),
    branchToSync: toBranchName("main"),
    tagFormat: BUILD_AT_FORMAT,
    imageTagLocations: [
      {
        valuesPath: toValuesPath("values.yaml"),
        anchorName: toAnchorName("appVersion"),
      },
    ],
    ...overrides,
  }
}

/** `resolveLatestTag()`に渡す解決の単位。`makeApp()`と同じappを`TagSource`として表したもの */
export function makeTagSource(overrides: Partial<TagSource> = {}): TagSource {
  return {
    projectId: toProjectId("1"),
    projectName: toProjectName("my-app"),
    branchToSync: toBranchName("main"),
    tagFormat: BUILD_AT_FORMAT,
    ...overrides,
  }
}

export function makeConfigUnit(
  apps: AppConfig[],
  overrides: Partial<Pick<ConfigUnit, "chartDirName" | "unitPath" | "helm">> = {},
): ConfigUnit {
  return {
    chartDirName: toChartDirName("teamA-chart"),
    unitPath: toConfigUnitPath("tenant1/client1"),
    chartRepo: {
      projectId: toProjectId("100"),
      projectName: toProjectName("teamA-chart"),
      mrTargetBranch: toBranchName("develop"),
    },
    apps,
    // 既定は書き込み先が空＝向き先ブランチの更新が1件も積まれない状態。向き先ブランチそのものを
    // 検証するテストだけが`locations`を持つ値で上書きする
    helm: { branchRef: toBranchName("release/2026-q1"), locations: [] },
    accessTokenEnv: undefined,
    ...overrides,
  }
}

export function makePlan(
  overrides: Partial<{
    currentTag: TagName
    projectName: string
    updates: AppUpdatePlan["updates"]
  }> = {},
): AppUpdatePlan {
  const currentTag = overrides.currentTag ?? toTagName("main-build-at-20251231-000000")
  return {
    app: makeApp({
      projectId: toProjectId("1"),
      projectName: toProjectName(overrides.projectName ?? "my-app"),
    }),
    latestTag: {
      name: toTagName("main-build-at-20260101-000000"),
      branchName: toBranchName("main"),
      taggedAt: new Date(Date.UTC(2026, 0, 1)),
    },
    origin: "existing",
    updates: overrides.updates ?? [
      {
        location: {
          valuesPath: toValuesPath("values.yaml"),
          anchorName: toAnchorName("appVersion"),
        },
        currentTag,
      },
    ],
  }
}
