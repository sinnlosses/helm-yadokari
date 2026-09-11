import { beforeEach, describe, expect, it, vi } from "vitest"

// 「config/ のYAML実ファイル → loadConfig() → 3ステップ → コミットされる values.yaml の
// 中身・MRタイトル・MR本文」という連結を通す唯一のテスト（docs/coding-standards.md
// 「通し（e2e）で守るのは『実ファイル → MRの中身』の連結だけ」参照）。
//
// `test/main.dry-run.test.ts` と同じく **gitbeaker（@gitbeaker/rest）の境界**でモックする。
// `lib/gitlab/gitlab.js` をモックする境界だと、`lib/gitlab/` 自身が組み立てるコミットの
// actions・MRのパラメータまでは固定できないため。
//
// `src/lib/config/config.js` は意図的にモックしない。これがこのファイル固有の存在理由で、
// `test/main.test.ts` と同居できないのはモックの範囲が違うため。
//
// fakeのGitLab準備は `test/main.dry-run.test.ts` の `makeFakeGitlab()` と
// 共有できるか検討した。dry-runのfakeは単一appの状態（HEADにタグ無し・値が古い）を
// 固定で返すだけで足りるのに対し、このテストは `config/` の実ファイル（複数
// projectId・複数valuesPath）ごとに応答を変える必要があり、形が違う。無理に寄せると
// 両方が読みにくくなるため、`test/helpers.ts` には寄せずこのファイルに閉じ込める。
vi.mock("@gitbeaker/rest")
vi.mock("../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { Gitlab } from "@gitbeaker/rest"

import type { EnvConfig } from "../src/lib/env.js"
import { run } from "../src/main.js"
import { toAccessToken, toConfigUnitPath, toGitLabUrl, toLocalPath } from "../src/types/types.js"
import { makeHttpError } from "./helpers.js"

/** `config/yadokari-smoke-test-chart/registry.yaml` の projectId */
const CHART_PROJECT_ID = 86061211
/** `config/yadokari-smoke-test-chart2/registry.yaml` の projectId */
const CHART2_PROJECT_ID = 86354445
/** `sample-qa-sprint`。4つの設定ユニット（`anchor-app`＋`tenant2/client1`＋`tenant2/client2`＋
 * chartリポジトリ2の`shared-app`）共通で登録されているapp。追跡ブランチ`main`のHEADに現在値と
 * 異なる名前のタグが既にある状態にする（更新対象、タグ自動作成の経路には入らない）。
 * `shared-app`だけは`branchToSync`が`develop`で、キャッシュキー（`projectId:branchToSync`）が
 * 他の3ユニットとは分岐する経路を通る */
const QA_PROJECT_ID = 82861978
/** `sample-develop-client`。tenant2の2ユニット共通で登録されているapp（`anchor-app`・
 * `shared-app`は登録していない）。追跡ブランチ`main`のHEADのタグ名がvalues.yamlの現在値と
 * 同じ状態にする（already_up_to_dateで据え置き）*/
const DEV_PROJECT_ID = 82861977

const HEAD_SHA_QA = "head-sha-qa"
const HEAD_SHA_DEV = "head-sha-dev"
/** QA appの`develop`ブランチのHEAD（`main`とは別コミット） */
const HEAD_SHA_QA_DEVELOP = "head-sha-qa-develop"

/** QA appの追跡ブランチ`main`のHEADを指すタグ名（＝更新後にvalues.yamlへ書き込まれる新タグ） */
const QA_NEW_TAG = "main-build-at-20260101-030000"
/** QA appのvalues.yaml上の現在値（新タグと異なるため更新対象になる） */
const QA_OLD_VALUE = "main-build-at-20251230-000000"
/** DEV appの追跡ブランチHEADを指すタグ名 = values.yaml上の現在値（既に最新のため据え置き） */
const DEV_TAG = "main-build-at-20251231-000000"
/** QA appの追跡ブランチ`develop`のHEADを指すタグ名（`shared-app`が書き込む新タグ） */
const QA_NEW_TAG_DEVELOP = "develop-build-at-20260102-030000"

/** 4つの設定ユニットの `config.yaml` に書かれている `helm.branchToSync`（4つとも同じ値） */
const NEW_HELM_BRANCH = "release/2026-q1"
/** `charts/smoke-tenant2/client1/values.yaml` の `t2c1HelmTargetBranch` の現在値 */
const OLD_HELM_BRANCH = "release/2025-q4"

// `anchor-app`・`tenant2/client2`・`shared-app` の向き先ブランチの現在値は `helm.branchToSync`
// と同じにしており、この3ユニットはイメージタグだけが書き換わる（`scripts/smoke/smoke-fixture.ts`
// のシード値と同じ考え方）。差分が出る側は `tenant2/client1` だけ。
const VALUES_YAML_ANCHOR_APP =
  `variables:\n` +
  `  - &helmVersion develop\n` +
  `  - &tenantId1client1AppsVersion ${QA_OLD_VALUE}\n` +
  `  - &smokeTestTargetBranch ${NEW_HELM_BRANCH}\n`
// `tenant2/client1` は `sample-qa-sprint` が `values.yaml` と `values-extra.yaml` の
// 2つの `valuesPath` へ書き込む（1appが複数箇所に書き込むシナリオ）。Helmの向き先ブランチも
// 両ファイルで書き換わるよう、どちらも古い値でシードする。
const VALUES_YAML_TENANT2_CLIENT1 =
  `variables:\n` +
  `  - &t2c1QaSprintVersion ${QA_OLD_VALUE}\n` +
  `  - &t2c1DevelopClientVersion ${DEV_TAG}\n` +
  `  - &t2c1HelmTargetBranch ${OLD_HELM_BRANCH}\n`
const VALUES_YAML_TENANT2_CLIENT1_EXTRA =
  `variables:\n` +
  `  - &t2c1QaSprintVersionExtra ${QA_OLD_VALUE}\n` +
  `  - &t2c1HelmTargetBranchExtra ${OLD_HELM_BRANCH}\n`
const VALUES_YAML_TENANT2_CLIENT2 =
  `variables:\n` +
  `  - &t2c2QaSprintVersion ${QA_OLD_VALUE}\n` +
  `  - &t2c2DevelopClientVersion ${DEV_TAG}\n` +
  `  - &t2c2HelmTargetBranch ${NEW_HELM_BRANCH}\n`
// chartリポジトリ2（`yadokari-smoke-test-chart2`）配下の唯一の設定ユニット。`sample-qa-sprint`を
// `branchToSync: develop` で追跡する（複数chartリポジトリ・複数追跡ブランチのシナリオ）。
const VALUES_YAML_SHARED_APP =
  `variables:\n` +
  `  - &sharedQaSprintVersion ${QA_OLD_VALUE}\n` +
  `  - &sharedHelmTargetBranch ${NEW_HELM_BRANCH}\n`

const env: EnvConfig = {
  gitlabUrl: toGitLabUrl("https://gitlab.test"),
  accessToken: toAccessToken("test-token"),
  configDirPath: toLocalPath("config"),
  concurrencyLimit: 3,
  dryRun: false,
  targetChart: undefined,
  targetUnits: undefined,
}

/**
 * `config/` の実ファイルに合わせて応答するfake GitLab。projectId・パスで分岐させる
 * 必要があるため `test/main.dry-run.test.ts` の単一app向けfakeとは形が異なる（寄せない
 * 理由はファイル冒頭のコメント参照）。
 */
function makeFakeGitlab() {
  const tagsByProject = new Map<number, { name: string; commit: { id: string } }[]>([
    [
      QA_PROJECT_ID,
      [
        { name: QA_NEW_TAG, commit: { id: HEAD_SHA_QA } },
        { name: QA_NEW_TAG_DEVELOP, commit: { id: HEAD_SHA_QA_DEVELOP } },
      ],
    ],
    [DEV_PROJECT_ID, [{ name: DEV_TAG, commit: { id: HEAD_SHA_DEV } }]],
  ])

  const branchHeadShaByKey = new Map<string, string>([
    [`${QA_PROJECT_ID}\0main`, HEAD_SHA_QA],
    [`${QA_PROJECT_ID}\0develop`, HEAD_SHA_QA_DEVELOP],
    [`${DEV_PROJECT_ID}\0main`, HEAD_SHA_DEV],
    [`${CHART_PROJECT_ID}\0${NEW_HELM_BRANCH}`, "chart-branch-sha"],
  ])

  const valuesYamlByPath = new Map<string, string>([
    ["charts/anchor-app/values.yaml", VALUES_YAML_ANCHOR_APP],
    ["charts/smoke-tenant2/client1/values.yaml", VALUES_YAML_TENANT2_CLIENT1],
    ["charts/smoke-tenant2/client1/values-extra.yaml", VALUES_YAML_TENANT2_CLIENT1_EXTRA],
    ["charts/smoke-tenant2/client2/values.yaml", VALUES_YAML_TENANT2_CLIENT2],
    ["charts/shared-app/values.yaml", VALUES_YAML_SHARED_APP],
  ])

  return {
    Tags: {
      all: vi.fn((projectId: number) => Promise.resolve(tagsByProject.get(projectId) ?? [])),
      create: vi.fn().mockResolvedValue({}),
    },
    Branches: {
      // 未登録の組み合わせ（固定ブランチ`feature/yadokari/...`など）は404を返す。
      // `submitMergeRequest()`の「featureBranchが既に存在するか」判定はこの経路を通り、
      // 常に「まだ存在しない」として扱われる。
      show: vi.fn((projectId: number, branch: string) => {
        const sha = branchHeadShaByKey.get(`${projectId}\0${branch}`)
        return sha !== undefined
          ? Promise.resolve({ commit: { id: sha } })
          : Promise.reject(makeHttpError(404))
      }),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    RepositoryFiles: {
      show: vi.fn((_projectId: number, path: string) => {
        const content = valuesYamlByPath.get(path)
        if (content === undefined) return Promise.reject(makeHttpError(404))
        return Promise.resolve({ content: Buffer.from(content).toString("base64") })
      }),
    },
    MergeRequests: {
      all: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
    Commits: { create: vi.fn().mockResolvedValue({}) },
    Projects: {
      show: vi.fn().mockResolvedValue({ web_url: "https://gitlab.test/g/app" }),
    },
    Pipelines: {
      showLatest: vi.fn().mockResolvedValue({ web_url: "https://gitlab.test/g/app/-/pipelines/1" }),
    },
  }
}

/** `MergeRequests.create` の呼び出しから、sourceBranchで指定した1件を取り出す */
function findMrCreateCall(
  gitlab: ReturnType<typeof makeFakeGitlab>,
  sourceBranch: string,
): readonly unknown[] {
  const call = gitlab.MergeRequests.create.mock.calls.find((args) => args[1] === sourceBranch)
  if (call === undefined) {
    throw new Error(`MergeRequests.create が sourceBranch "${sourceBranch}" で呼ばれていない`)
  }
  return call
}

describe("run（config/ の実ファイルを読むe2e）", () => {
  let gitlab: ReturnType<typeof makeFakeGitlab>

  beforeEach(() => {
    gitlab = makeFakeGitlab()
    // アロー関数は `new` できないので、コンストラクタとして呼べる関数を渡す
    vi.mocked(Gitlab).mockImplementation(function () {
      return gitlab
    } as never)
  })

  it("config/ 全件で、設定ユニット単位に1つずつMRが作られる（深さ1・深さ2・複数chartリポジトリが混在）", async () => {
    await expect(run(env)).resolves.toBe("SUCCESS")

    expect(gitlab.MergeRequests.create).toHaveBeenCalledTimes(4)

    // `anchor-app`・`shared-app` は深さ1、`tenant2/client1` `tenant2/client2` は深さ2の設定
    // ユニット。4件とも呼ばれていることが、深さ1・深さ2の混在・複数chartリポジトリへの分岐が
    // 実ファイルから最後まで動くことの確認になる
    const anchorApp = findMrCreateCall(gitlab, "feature/yadokari/anchor-app")
    const tenant2Client1 = findMrCreateCall(gitlab, "feature/yadokari/tenant2/client1")
    const tenant2Client2 = findMrCreateCall(gitlab, "feature/yadokari/tenant2/client2")
    const sharedApp = findMrCreateCall(gitlab, "feature/yadokari/shared-app")

    for (const call of [anchorApp, tenant2Client1, tenant2Client2]) {
      // (projectId, sourceBranch, targetBranch, title, { description })
      expect(call[0]).toBe(CHART_PROJECT_ID)
      expect(call[2]).toBe("main") // registry.yaml の mrTargetBranch
    }
    // `shared-app` はchartリポジトリ2（別projectId）宛てのMR
    expect(sharedApp[0]).toBe(CHART2_PROJECT_ID)
    expect(sharedApp[2]).toBe("main") // yadokari-smoke-test-chart2/registry.yaml の mrTargetBranch

    expect(anchorApp[3]).toContain("anchor-app")
    expect(tenant2Client1[3]).toContain("tenant2/client1")
    expect(tenant2Client2[3]).toContain("tenant2/client2")
    expect(sharedApp[3]).toContain("shared-app")
    // MRタイトルには書き換え箇所数（image tag件数）も入る
    expect(anchorApp[3]).toContain("image tag 1")
    // tenant2/client1 は sample-qa-sprint が values.yaml と values-extra.yaml の2箇所に
    // 書き込むため image tag は2件、Helmの向き先ブランチも両ファイルで書き換わるため2件
    expect(tenant2Client1[3]).toContain("image tag 2")
    expect(tenant2Client1[3]).toContain("helm branch 2")
    expect(sharedApp[3]).toContain("image tag 1")

    const tenant2Client1Description = (tenant2Client1[4] as { readonly description: string })
      .description
    expect(tenant2Client1Description).toContain("charts/smoke-tenant2/client1/values.yaml")
    expect(tenant2Client1Description).toContain("t2c1QaSprintVersion")
    expect(tenant2Client1Description).toContain("charts/smoke-tenant2/client1/values-extra.yaml")
    expect(tenant2Client1Description).toContain("t2c1QaSprintVersionExtra")

    // shared-app は branchToSync: develop で追跡するため、main由来のタグではなくdevelop由来の
    // タグが新タグとして選ばれる（キャッシュキーが projectId:branchToSync で分岐する確認）
    const sharedAppDescription = (sharedApp[4] as { readonly description: string }).description
    expect(sharedAppDescription).toContain(QA_NEW_TAG_DEVELOP)
  })

  it("コミットされる values.yaml の中身が、実ファイルの設定どおりに書き換わる", async () => {
    await run(env)

    type CommitAction = { readonly filePath: string; readonly content: string }
    const commitCall = gitlab.Commits.create.mock.calls.find(
      (args) => args[1] === "feature/yadokari/tenant2/client1",
    )
    if (commitCall === undefined) throw new Error("tenant2/client1 のCommits.create呼び出しが無い")
    const actions = commitCall[3] as readonly CommitAction[]
    const values = actions.find(
      (action) => action.filePath === "charts/smoke-tenant2/client1/values.yaml",
    )
    if (values === undefined) throw new Error("values.yaml へのcommit actionが無い")

    // イメージタグは新しいタグへ書き換わる
    expect(values.content).toContain(`&t2c1QaSprintVersion ${QA_NEW_TAG}`)
    // Helmの向き先ブランチは config.yaml の helm.branchToSync へ書き換わる
    expect(values.content).toContain(`&t2c1HelmTargetBranch ${NEW_HELM_BRANCH}`)
    // HEAD一致で据え置きになるアプリは元の値のまま
    expect(values.content).toContain(`&t2c1DevelopClientVersion ${DEV_TAG}`)

    // 同じappが複数valuesPathに書き込む2件目のファイルも、同じコミットで一緒に書き換わる
    const valuesExtra = actions.find(
      (action) => action.filePath === "charts/smoke-tenant2/client1/values-extra.yaml",
    )
    if (valuesExtra === undefined) throw new Error("values-extra.yaml へのcommit actionが無い")
    expect(valuesExtra.content).toContain(`&t2c1QaSprintVersionExtra ${QA_NEW_TAG}`)
    expect(valuesExtra.content).toContain(`&t2c1HelmTargetBranchExtra ${NEW_HELM_BRANCH}`)
  })

  it("TARGET_UNITS 相当の絞り込みで、作られるMRが実際に減る", async () => {
    await expect(
      run({
        ...env,
        targetUnits: [toConfigUnitPath("tenant2/client2")],
      }),
    ).resolves.toBe("SUCCESS")

    expect(gitlab.MergeRequests.create).toHaveBeenCalledTimes(1)
    const call = gitlab.MergeRequests.create.mock.calls[0]
    if (call === undefined) throw new Error("MergeRequests.create が呼ばれていない")
    expect(call[1]).toBe("feature/yadokari/tenant2/client2")
  })
})
