import { describe, expect, it } from "vitest"

import {
  buildNewTag,
  buildTagPrefix,
  findLatestParsedTag,
  parseTag,
} from "../../../src/lib/gitlab/tag.js"
import { toBranchName, toTagName } from "../../../src/types.js"

describe("buildTagPrefix", () => {
  it("スラッシュを含まないブランチ名はそのままプレフィックスにする", () => {
    expect(buildTagPrefix(toBranchName("main"))).toBe("main-build-at-")
  })

  it("スラッシュを含むブランチ名は - に置換する", () => {
    expect(buildTagPrefix(toBranchName("release/foo"))).toBe("release-foo-build-at-")
  })

  it("スラッシュを複数含むブランチ名はすべて置換する", () => {
    expect(buildTagPrefix(toBranchName("team/release/foo"))).toBe("team-release-foo-build-at-")
  })
})

describe("parseTag", () => {
  it("正しい形式のタグをパースする", () => {
    const parsed = parseTag(toTagName("main-build-at-20260902-123456"), toBranchName("main"))
    expect(parsed).toBeDefined()
    expect(parsed?.name).toBe("main-build-at-20260902-123456")
    expect(parsed?.branch).toBe("main")
    expect(parsed?.builtAt.getUTCFullYear()).toBe(2026)
    expect(parsed?.builtAt.getUTCMonth()).toBe(8) // 0-indexed = 9月
    expect(parsed?.builtAt.getUTCDate()).toBe(2)
    expect(parsed?.builtAt.getUTCHours()).toBe(12)
    expect(parsed?.builtAt.getUTCMinutes()).toBe(34)
    expect(parsed?.builtAt.getUTCSeconds()).toBe(56)
  })

  it("スラッシュを含むブランチ由来のタグをパースする", () => {
    const parsed = parseTag(
      toTagName("release-foo-build-at-20260101-000000"),
      toBranchName("release/foo"),
    )
    expect(parsed).toBeDefined()
    expect(parsed?.builtAt.getUTCFullYear()).toBe(2026)
  })

  it("別ブランチのタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("develop-build-at-20260902-123456"), toBranchName("main")),
    ).toBeUndefined()
  })

  it("build-at 部分がないタグは undefined を返す", () => {
    expect(parseTag(toTagName("main-20260902-123456"), toBranchName("main"))).toBeUndefined()
  })

  it("日付部分が8桁でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-2026902-123456"), toBranchName("main")),
    ).toBeUndefined()
  })

  it("時刻部分が6桁でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-20260902-12345"), toBranchName("main")),
    ).toBeUndefined()
  })

  it("日付・時刻部分が数字でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-2026090a-123456"), toBranchName("main")),
    ).toBeUndefined()
  })

  it("余分なサフィックスがあるタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-20260902-123456-extra"), toBranchName("main")),
    ).toBeUndefined()
  })
})

describe("findLatestParsedTag", () => {
  it("最も新しい builtAt のタグを返す", () => {
    const latest = findLatestParsedTag(
      [
        toTagName("main-build-at-20260101-000000"),
        toTagName("main-build-at-20260902-123456"),
        toTagName("main-build-at-20260601-000000"),
      ],
      toBranchName("main"),
    )
    expect(latest?.name).toBe("main-build-at-20260902-123456")
  })

  it("別ブランチのタグは無視する", () => {
    const latest = findLatestParsedTag(
      [toTagName("develop-build-at-20261231-235959"), toTagName("main-build-at-20260101-000000")],
      toBranchName("main"),
    )
    expect(latest?.name).toBe("main-build-at-20260101-000000")
  })

  it("形式に合わないタグは無視する", () => {
    const latest = findLatestParsedTag(
      [toTagName("v1.0.0"), toTagName("main-build-at-20260101-000000")],
      toBranchName("main"),
    )
    expect(latest?.name).toBe("main-build-at-20260101-000000")
  })

  it("該当するタグがないとき undefined を返す", () => {
    expect(findLatestParsedTag([toTagName("v1.0.0")], toBranchName("main"))).toBeUndefined()
  })

  it("空配列のとき undefined を返す", () => {
    expect(findLatestParsedTag([], toBranchName("main"))).toBeUndefined()
  })
})

describe("buildNewTag", () => {
  it("命名規則に従ったタグ名を組み立てる", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now)
    expect(tag.name).toBe("main-build-at-20260902-123456")
  })

  it("スラッシュを含むブランチ名は - に置換する", () => {
    const now = new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
    const tag = buildNewTag(toBranchName("release/foo"), now)
    expect(tag.name).toBe("release-foo-build-at-20260101-000000")
  })

  it("branch と builtAt をそのまま保持する", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now)
    expect(tag.branch).toBe("main")
    expect(tag.builtAt).toBe(now)
  })

  it("組み立てたタグ名は parseTag で正しくパースし直せる", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const branch = toBranchName("main")
    const tag = buildNewTag(branch, now)
    const reparsed = parseTag(tag.name, branch)
    expect(reparsed?.builtAt).toEqual(now)
  })

  it("月・日・時・分・秒を2桁ゼロパディングする", () => {
    const now = new Date(Date.UTC(2026, 0, 5, 3, 7, 9))
    const tag = buildNewTag(toBranchName("main"), now)
    expect(tag.name).toBe("main-build-at-20260105-030709")
  })
})
