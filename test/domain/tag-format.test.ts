import { describe, expect, it } from "vitest"

import type { CreatableTagNaming } from "../../src/domain/tag-format.js"
import {
  buildNewTag,
  canCreateTag,
  compareTags,
  DEFAULT_TAG_TEMPLATE,
  findLatestParsedTag,
  parseTag,
  validateTagFormat,
} from "../../src/domain/tag-format.js"
import type { ParsedTag, TagNaming } from "../../src/types/types.js"
import { toBranchName, toTagName } from "../../src/types/types.js"

const DEFAULT_NAMING: TagNaming = { mode: "template", template: DEFAULT_TAG_TEMPLATE }
const SEMVER_NAMING: TagNaming = { mode: "semver" }

function templateNaming(template: string): TagNaming {
  return { mode: "template", template: validateTagFormat(template) }
}

/** `buildNewTag()`は`canCreateTag()`を通した命名規則しか受け取らないので、テストも同じ関門を通す */
function creatableNaming(template: string): CreatableTagNaming {
  const naming = templateNaming(template)
  if (!canCreateTag(naming)) throw new Error(`タグを自動作成できないテンプレート: ${template}`)
  return naming
}

function parseSemver(tagName: string): ParsedTag {
  const parsed = parseTag(toTagName(tagName), toBranchName("main"), SEMVER_NAMING)
  if (!parsed) throw new Error(`semverとして読めません: ${tagName}`)
  return parsed
}

describe("validateTagFormat", () => {
  it("デフォルトのフォーマットを受け入れる", () => {
    expect(validateTagFormat("{branch}-build-at-{date}-{time}")).toBe(
      "{branch}-build-at-{date}-{time}",
    )
  })

  it("プレースホルダの並び順を入れ替えたフォーマットを受け入れる", () => {
    expect(validateTagFormat("{date}-{time}-{branch}")).toBe("{date}-{time}-{branch}")
  })

  it("{time} を含まない {branch}+{date} を受け入れる", () => {
    expect(validateTagFormat("{branch}-{date}")).toBe("{branch}-{date}")
  })

  it("{branch} がないとき例外をスローする", () => {
    expect(() => validateTagFormat("build-at-{date}-{time}")).toThrow("tagNaming.template")
  })

  it("{date} がないとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-build-at-{time}")).toThrow("tagNaming.template")
  })

  it("{branch} 単独のフォーマットは例外をスローする", () => {
    expect(() => validateTagFormat("{branch}")).toThrow("tagNaming.template")
  })

  it("{time} 単独のフォーマットは例外をスローする", () => {
    expect(() => validateTagFormat("{time}")).toThrow("tagNaming.template")
  })

  it("{date} 単独のフォーマットは例外をスローする", () => {
    expect(() => validateTagFormat("{date}")).toThrow("tagNaming.template")
  })

  it("同じプレースホルダが複数回あるとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-{branch}-{date}-{time}")).toThrow("tagNaming.template")
  })

  it("{time} が2回あるとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-{date}-{time}-{time}")).toThrow("tagNaming.template")
  })

  it("未知のプレースホルダがあるとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-{date}-{time}-{foo}")).toThrow("tagNaming.template")
  })
})

describe("parseTag（template モード）", () => {
  it("正しい形式のタグをパースする", () => {
    const parsed = parseTag(
      toTagName("main-build-at-20260902-123456"),
      toBranchName("main"),
      DEFAULT_NAMING,
    )
    expect(parsed).toBeDefined()
    expect(parsed?.name).toBe("main-build-at-20260902-123456")
    expect(parsed?.branchName).toBe("main")
    // タグ名の 12:34:56 はJST。UTCでは9時間引いた 03:34:56 になる
    expect(parsed?.orderKey).toEqual([Date.UTC(2026, 8, 2, 3, 34, 56)])
  })

  it("スラッシュを含むブランチ由来のタグをパースする", () => {
    const parsed = parseTag(
      toTagName("release-foo-build-at-20260101-000000"),
      toBranchName("release/foo"),
      DEFAULT_NAMING,
    )
    expect(parsed).toBeDefined()
    // タグ名の 2026-01-01 00:00:00 はJST。UTCでは9時間引いて前日（2025-12-31 15:00:00）になる
    expect(parsed?.orderKey).toEqual([Date.UTC(2025, 11, 31, 15, 0, 0)])
  })

  it("別ブランチのタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("develop-build-at-20260902-123456"), toBranchName("main"), DEFAULT_NAMING),
    ).toBeUndefined()
  })

  it("build-at 部分がないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-20260902-123456"), toBranchName("main"), DEFAULT_NAMING),
    ).toBeUndefined()
  })

  it("日付部分が8桁でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-2026902-123456"), toBranchName("main"), DEFAULT_NAMING),
    ).toBeUndefined()
  })

  it("時刻部分が6桁でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-20260902-12345"), toBranchName("main"), DEFAULT_NAMING),
    ).toBeUndefined()
  })

  it("日付・時刻部分が数字でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-2026090a-123456"), toBranchName("main"), DEFAULT_NAMING),
    ).toBeUndefined()
  })

  it("余分なサフィックスがあるタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("main-build-at-20260902-123456-extra"),
        toBranchName("main"),
        DEFAULT_NAMING,
      ),
    ).toBeUndefined()
  })

  it("テンプレートをカスタマイズすると、その形式でパースする", () => {
    const naming = templateNaming("{date}-{time}-{branch}")
    const parsed = parseTag(toTagName("20260902-123456-main"), toBranchName("main"), naming)
    expect(parsed?.orderKey).toEqual([Date.UTC(2026, 8, 2, 3, 34, 56)])
  })

  it("テンプレートのリテラル部分が異なれば、デフォルト形式のタグはパースできない", () => {
    const naming = templateNaming("{branch}_{date}_{time}")
    expect(
      parseTag(toTagName("main-build-at-20260902-123456"), toBranchName("main"), naming),
    ).toBeUndefined()
  })

  it("{time} を含まないテンプレートでは、時刻を0時0分0秒（JST）として読み取る", () => {
    const naming = templateNaming("{branch}-{date}")
    const parsed = parseTag(toTagName("main-20260902"), toBranchName("main"), naming)
    expect(parsed?.orderKey).toEqual([Date.UTC(2026, 8, 1, 15, 0, 0)])
  })

  it("{time} を含まないテンプレートでは、時刻が付いたタグ名はパースできない", () => {
    const naming = templateNaming("{branch}-{date}")
    expect(
      parseTag(toTagName("main-20260902-123456"), toBranchName("main"), naming),
    ).toBeUndefined()
  })
})

describe("parseTag（semver モード）", () => {
  it("v 接頭辞のあり・なしどちらも同じ版として読み取る", () => {
    const withPrefix = parseSemver("v1.2.3")
    const withoutPrefix = parseSemver("1.2.3")
    expect(compareTags(withPrefix, withoutPrefix)).not.toBe(0)
    expect(withPrefix.orderKey).toEqual(withoutPrefix.orderKey)
  })

  it("プレリリース付きのタグも読み取る", () => {
    expect(parseSemver("v1.2.3-rc.1").name).toBe("v1.2.3-rc.1")
  })

  it("ビルドメタデータ付きのタグも読み取る", () => {
    expect(parseSemver("1.2.3+build.20260101").name).toBe("1.2.3+build.20260101")
  })

  it("追跡ブランチ名はタグ名に現れなくてもそのまま保持する", () => {
    const parsed = parseTag(toTagName("v1.2.3"), toBranchName("release/foo"), SEMVER_NAMING)
    expect(parsed?.branchName).toBe("release/foo")
  })

  it("semverとして読めないタグは undefined を返す", () => {
    const branch = toBranchName("main")
    expect(parseTag(toTagName("1.2"), branch, SEMVER_NAMING)).toBeUndefined()
    expect(parseTag(toTagName("01.2.3"), branch, SEMVER_NAMING)).toBeUndefined()
    expect(parseTag(toTagName("v1.2.3-"), branch, SEMVER_NAMING)).toBeUndefined()
    expect(parseTag(toTagName("release-1.2.3"), branch, SEMVER_NAMING)).toBeUndefined()
    expect(
      parseTag(toTagName("main-build-at-20260902-123456"), branch, SEMVER_NAMING),
    ).toBeUndefined()
  })
})

describe("compareTags（semver 2.0.0 §11 の優先順位）", () => {
  const isNewer = (a: string, b: string): boolean => compareTags(parseSemver(a), parseSemver(b)) > 0

  it("メジャー・マイナー・パッチを数値として比べる", () => {
    expect(isNewer("1.10.0", "1.9.0")).toBe(true)
    expect(isNewer("2.0.0", "1.99.99")).toBe(true)
    expect(isNewer("1.0.10", "1.0.9")).toBe(true)
  })

  it("v 接頭辞は順序に影響しない", () => {
    expect(isNewer("v2.0.0", "1.9.9")).toBe(true)
    expect(isNewer("2.0.0", "v1.9.9")).toBe(true)
  })

  it("プレリリースは同じ版のリリースより古い", () => {
    expect(isNewer("1.0.0", "1.0.0-rc.1")).toBe(true)
  })

  it("プレリリース識別子を左から順に比べる（§11.4の例）", () => {
    expect(isNewer("1.0.0-alpha.1", "1.0.0-alpha")).toBe(true)
    expect(isNewer("1.0.0-alpha.beta", "1.0.0-alpha.1")).toBe(true)
    expect(isNewer("1.0.0-beta", "1.0.0-alpha.beta")).toBe(true)
    expect(isNewer("1.0.0-beta.2", "1.0.0-beta")).toBe(true)
    expect(isNewer("1.0.0-beta.11", "1.0.0-beta.2")).toBe(true)
    expect(isNewer("1.0.0-rc.1", "1.0.0-beta.11")).toBe(true)
  })

  it("ビルドメタデータは順序に影響しない（同値ならタグ名の降順で決まる）", () => {
    expect(compareTags(parseSemver("1.0.0+aaa"), parseSemver("1.0.0+bbb"))).toBeLessThan(0)
    expect(isNewer("1.0.1+aaa", "1.0.0+zzz")).toBe(true)
  })
})

describe("findLatestParsedTag（template モード）", () => {
  it("最も新しいタグを返す", () => {
    const latest = findLatestParsedTag(
      [
        toTagName("main-build-at-20260101-000000"),
        toTagName("main-build-at-20260902-123456"),
        toTagName("main-build-at-20260601-000000"),
      ],
      toBranchName("main"),
      DEFAULT_NAMING,
    )
    expect(latest?.name).toBe("main-build-at-20260902-123456")
  })

  it("別ブランチのタグは無視する", () => {
    const latest = findLatestParsedTag(
      [toTagName("develop-build-at-20261231-235959"), toTagName("main-build-at-20260101-000000")],
      toBranchName("main"),
      DEFAULT_NAMING,
    )
    expect(latest?.name).toBe("main-build-at-20260101-000000")
  })

  it("形式に合わないタグは無視する", () => {
    const latest = findLatestParsedTag(
      [toTagName("v1.0.0"), toTagName("main-build-at-20260101-000000")],
      toBranchName("main"),
      DEFAULT_NAMING,
    )
    expect(latest?.name).toBe("main-build-at-20260101-000000")
  })

  it("該当するタグがないとき undefined を返す", () => {
    expect(
      findLatestParsedTag([toTagName("v1.0.0")], toBranchName("main"), DEFAULT_NAMING),
    ).toBeUndefined()
  })

  it("空配列のとき undefined を返す", () => {
    expect(findLatestParsedTag([], toBranchName("main"), DEFAULT_NAMING)).toBeUndefined()
  })

  it("{time} を含まないテンプレートでも日付で最新を選ぶ", () => {
    const latest = findLatestParsedTag(
      [toTagName("main-20260101"), toTagName("main-20260902"), toTagName("main-20260601")],
      toBranchName("main"),
      templateNaming("{branch}-{date}"),
    )
    expect(latest?.name).toBe("main-20260902")
  })
})

describe("findLatestParsedTag（semver モード）", () => {
  const branch = toBranchName("main")

  it("プレリリース・v接頭辞・ビルドメタデータが混在していても最新の版を選ぶ", () => {
    const latest = findLatestParsedTag(
      [
        toTagName("v1.2.3"),
        toTagName("1.2.4-rc.1"),
        toTagName("v1.2.4"),
        toTagName("1.2.4+build.7"),
        toTagName("v1.10.0-alpha.1"),
      ],
      branch,
      SEMVER_NAMING,
    )
    expect(latest?.name).toBe("v1.10.0-alpha.1")
  })

  it("同じ版がビルドメタデータ違いで並ぶときはタグ名の降順で1件に決める", () => {
    const latest = findLatestParsedTag(
      [toTagName("1.2.4+aaa"), toTagName("1.2.4+ccc"), toTagName("1.2.4+bbb")],
      branch,
      SEMVER_NAMING,
    )
    expect(latest?.name).toBe("1.2.4+ccc")
  })

  it("semverとして読めないタグは候補から外す", () => {
    const latest = findLatestParsedTag(
      [toTagName("main-build-at-20991231-235959"), toTagName("v0.0.1")],
      branch,
      SEMVER_NAMING,
    )
    expect(latest?.name).toBe("v0.0.1")
  })

  it("semverのタグが1件も無いとき undefined を返す", () => {
    const latest = findLatestParsedTag(
      [toTagName("main-build-at-20260101-000000")],
      branch,
      SEMVER_NAMING,
    )
    expect(latest).toBeUndefined()
  })
})

describe("canCreateTag", () => {
  it("{time} を含む template モードのときだけ true を返す", () => {
    expect(canCreateTag(DEFAULT_NAMING)).toBe(true)
    expect(canCreateTag(templateNaming("{date}-{time}-{branch}"))).toBe(true)
  })

  it("{time} を含まないテンプレートでは false を返す", () => {
    expect(canCreateTag(templateNaming("{branch}-{date}"))).toBe(false)
  })

  it("semver モードでは false を返す", () => {
    expect(canCreateTag(SEMVER_NAMING)).toBe(false)
  })
})

describe("buildNewTag", () => {
  it("命名規則に従ったタグ名を組み立てる（UTC 12:34:56 → JST 21:34:56）", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now, creatableNaming(DEFAULT_TAG_TEMPLATE))
    expect(tag.name).toBe("main-build-at-20260902-213456")
  })

  it("スラッシュを含むブランチ名は - に置換する（UTC 0:00 → JST 9:00）", () => {
    const now = new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
    const tag = buildNewTag(toBranchName("release/foo"), now, creatableNaming(DEFAULT_TAG_TEMPLATE))
    expect(tag.name).toBe("release-foo-build-at-20260101-090000")
  })

  it("UTC 16:00 以降はJSTで日付が翌日に繰り上がる", () => {
    const now = new Date(Date.UTC(2026, 8, 8, 16, 0, 0)) // UTC 9/8 16:00 → JST 9/9 01:00
    const tag = buildNewTag(toBranchName("main"), now, creatableNaming(DEFAULT_TAG_TEMPLATE))
    expect(tag.name).toBe("main-build-at-20260909-010000")
  })

  it("日付が繰り上がるタグ名も parseTag で元の now に正しく戻る（回帰）", () => {
    const now = new Date(Date.UTC(2026, 8, 8, 16, 0, 0))
    const branch = toBranchName("main")
    const tag = buildNewTag(branch, now, creatableNaming(DEFAULT_TAG_TEMPLATE))
    const reparsed = parseTag(tag.name, branch, DEFAULT_NAMING)
    expect(reparsed?.orderKey).toEqual([now.getTime()])
  })

  it("branch と順序キーをそのまま保持する", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now, creatableNaming(DEFAULT_TAG_TEMPLATE))
    expect(tag.branchName).toBe("main")
    expect(tag.orderKey).toEqual([now.getTime()])
  })

  it("組み立てたタグ名は parseTag で正しくパースし直せる", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const branch = toBranchName("main")
    const tag = buildNewTag(branch, now, creatableNaming(DEFAULT_TAG_TEMPLATE))
    const reparsed = parseTag(tag.name, branch, DEFAULT_NAMING)
    expect(reparsed?.orderKey).toEqual(tag.orderKey)
  })

  it("ミリ秒を含む now でも、タグ名から読み直した順序キーと一致する", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56, 789))
    const branch = toBranchName("main")
    const tag = buildNewTag(branch, now, creatableNaming(DEFAULT_TAG_TEMPLATE))
    expect(parseTag(tag.name, branch, DEFAULT_NAMING)?.orderKey).toEqual(tag.orderKey)
  })

  it("月・日・時・分・秒を2桁ゼロパディングする（UTC 3:07:09 → JST 12:07:09）", () => {
    const now = new Date(Date.UTC(2026, 0, 5, 3, 7, 9))
    const tag = buildNewTag(toBranchName("main"), now, creatableNaming(DEFAULT_TAG_TEMPLATE))
    expect(tag.name).toBe("main-build-at-20260105-120709")
  })

  it("テンプレートをカスタマイズすると、その形式でタグ名を組み立てる", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now, creatableNaming("{date}-{time}-{branch}"))
    expect(tag.name).toBe("20260902-213456-main")
  })
})

describe("テンプレートのプレースホルダの並び順・区切り文字は任意（回帰テスト）", () => {
  it("{date}-{time}-{branch}（デフォルトと並び順が異なる）で生成・再パース・最新判定ができる", () => {
    const naming = creatableNaming("{date}-{time}-{branch}")
    const branch = toBranchName("main")
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))

    const tag = buildNewTag(branch, now, naming)
    expect(tag.name).toBe("20260902-213456-main")

    const reparsed = parseTag(tag.name, branch, naming)
    expect(reparsed?.orderKey).toEqual([now.getTime()])

    const older = buildNewTag(branch, new Date(Date.UTC(2026, 0, 1, 0, 0, 0)), naming)
    const latest = findLatestParsedTag([older.name, tag.name], branch, naming)
    expect(latest?.name).toBe(tag.name)
  })

  it("v{time}_{branch}__{date}（区切り文字が複数種類混在）で生成・再パース・最新判定ができる", () => {
    const naming = creatableNaming("v{time}_{branch}__{date}")
    const branch = toBranchName("release/2026-q2")
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))

    const tag = buildNewTag(branch, now, naming)
    expect(tag.name).toBe("v213456_release-2026-q2__20260902")

    const reparsed = parseTag(tag.name, branch, naming)
    expect(reparsed?.orderKey).toEqual([now.getTime()])

    const older = buildNewTag(branch, new Date(Date.UTC(2026, 0, 1, 0, 0, 0)), naming)
    const latest = findLatestParsedTag([tag.name, older.name], branch, naming)
    expect(latest?.name).toBe(tag.name)
  })
})
