import { describe, expect, it } from "vitest"

import {
  buildNewTag,
  DEFAULT_TAG_TEMPLATE,
  findLatestParsedTag,
  parseTag,
  validateTagFormat,
} from "../../src/domain/tag-format.js"
import { toBranchName, toTagName } from "../../src/types/types.js"

describe("validateTagFormat", () => {
  it("デフォルトのフォーマットを受け入れる", () => {
    expect(validateTagFormat("{branch}-build-at-{date}-{time}")).toBe(
      "{branch}-build-at-{date}-{time}",
    )
  })

  it("プレースホルダの並び順を入れ替えたフォーマットを受け入れる", () => {
    expect(validateTagFormat("{date}-{time}-{branch}")).toBe("{date}-{time}-{branch}")
  })

  it("{branch} がないとき例外をスローする", () => {
    expect(() => validateTagFormat("build-at-{date}-{time}")).toThrow("tagNaming.template")
  })

  it("{date} がないとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-build-at-{time}")).toThrow("tagNaming.template")
  })

  it("{time} がないとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-build-at-{date}")).toThrow("tagNaming.template")
  })

  it("同じプレースホルダが複数回あるとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-{branch}-{date}-{time}")).toThrow("tagNaming.template")
  })

  it("未知のプレースホルダがあるとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-{date}-{time}-{foo}")).toThrow("tagNaming.template")
  })
})

describe("parseTag", () => {
  it("正しい形式のタグをパースする", () => {
    const parsed = parseTag(
      toTagName("main-build-at-20260902-123456"),
      toBranchName("main"),
      DEFAULT_TAG_TEMPLATE,
    )
    expect(parsed).toBeDefined()
    expect(parsed?.name).toBe("main-build-at-20260902-123456")
    expect(parsed?.branchName).toBe("main")
    // タグ名の 12:34:56 はJST。UTCでは9時間引いた 03:34:56 になる
    expect(parsed?.builtAt).toEqual(new Date(Date.UTC(2026, 8, 2, 3, 34, 56)))
  })

  it("スラッシュを含むブランチ由来のタグをパースする", () => {
    const parsed = parseTag(
      toTagName("release-foo-build-at-20260101-000000"),
      toBranchName("release/foo"),
      DEFAULT_TAG_TEMPLATE,
    )
    expect(parsed).toBeDefined()
    // タグ名の 2026-01-01 00:00:00 はJST。UTCでは9時間引いて前日（2025-12-31 15:00:00）になる
    expect(parsed?.builtAt).toEqual(new Date(Date.UTC(2025, 11, 31, 15, 0, 0)))
  })

  it("別ブランチのタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("develop-build-at-20260902-123456"),
        toBranchName("main"),
        DEFAULT_TAG_TEMPLATE,
      ),
    ).toBeUndefined()
  })

  it("build-at 部分がないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-20260902-123456"), toBranchName("main"), DEFAULT_TAG_TEMPLATE),
    ).toBeUndefined()
  })

  it("日付部分が8桁でないタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("main-build-at-2026902-123456"),
        toBranchName("main"),
        DEFAULT_TAG_TEMPLATE,
      ),
    ).toBeUndefined()
  })

  it("時刻部分が6桁でないタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("main-build-at-20260902-12345"),
        toBranchName("main"),
        DEFAULT_TAG_TEMPLATE,
      ),
    ).toBeUndefined()
  })

  it("日付・時刻部分が数字でないタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("main-build-at-2026090a-123456"),
        toBranchName("main"),
        DEFAULT_TAG_TEMPLATE,
      ),
    ).toBeUndefined()
  })

  it("余分なサフィックスがあるタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("main-build-at-20260902-123456-extra"),
        toBranchName("main"),
        DEFAULT_TAG_TEMPLATE,
      ),
    ).toBeUndefined()
  })

  it("テンプレートをカスタマイズすると、その形式でパースする", () => {
    const format = validateTagFormat("{date}-{time}-{branch}")
    const parsed = parseTag(toTagName("20260902-123456-main"), toBranchName("main"), format)
    expect(parsed).toBeDefined()
    expect(parsed?.builtAt.getUTCFullYear()).toBe(2026)
  })

  it("テンプレートのリテラル部分が異なれば、デフォルト形式のタグはパースできない", () => {
    const format = validateTagFormat("{branch}_{date}_{time}")
    expect(
      parseTag(toTagName("main-build-at-20260902-123456"), toBranchName("main"), format),
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
      DEFAULT_TAG_TEMPLATE,
    )
    expect(latest?.name).toBe("main-build-at-20260902-123456")
  })

  it("別ブランチのタグは無視する", () => {
    const latest = findLatestParsedTag(
      [toTagName("develop-build-at-20261231-235959"), toTagName("main-build-at-20260101-000000")],
      toBranchName("main"),
      DEFAULT_TAG_TEMPLATE,
    )
    expect(latest?.name).toBe("main-build-at-20260101-000000")
  })

  it("形式に合わないタグは無視する", () => {
    const latest = findLatestParsedTag(
      [toTagName("v1.0.0"), toTagName("main-build-at-20260101-000000")],
      toBranchName("main"),
      DEFAULT_TAG_TEMPLATE,
    )
    expect(latest?.name).toBe("main-build-at-20260101-000000")
  })

  it("該当するタグがないとき undefined を返す", () => {
    expect(
      findLatestParsedTag([toTagName("v1.0.0")], toBranchName("main"), DEFAULT_TAG_TEMPLATE),
    ).toBeUndefined()
  })

  it("空配列のとき undefined を返す", () => {
    expect(findLatestParsedTag([], toBranchName("main"), DEFAULT_TAG_TEMPLATE)).toBeUndefined()
  })
})

describe("buildNewTag", () => {
  it("命名規則に従ったタグ名を組み立てる（UTC 12:34:56 → JST 21:34:56）", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now, DEFAULT_TAG_TEMPLATE)
    expect(tag.name).toBe("main-build-at-20260902-213456")
  })

  it("スラッシュを含むブランチ名は - に置換する（UTC 0:00 → JST 9:00）", () => {
    const now = new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
    const tag = buildNewTag(toBranchName("release/foo"), now, DEFAULT_TAG_TEMPLATE)
    expect(tag.name).toBe("release-foo-build-at-20260101-090000")
  })

  it("UTC 16:00 以降はJSTで日付が翌日に繰り上がる", () => {
    const now = new Date(Date.UTC(2026, 8, 8, 16, 0, 0)) // UTC 9/8 16:00 → JST 9/9 01:00
    const tag = buildNewTag(toBranchName("main"), now, DEFAULT_TAG_TEMPLATE)
    expect(tag.name).toBe("main-build-at-20260909-010000")
  })

  it("日付が繰り上がるタグ名も parseTag で元の now に正しく戻る（回帰）", () => {
    const now = new Date(Date.UTC(2026, 8, 8, 16, 0, 0))
    const branch = toBranchName("main")
    const tag = buildNewTag(branch, now, DEFAULT_TAG_TEMPLATE)
    const reparsed = parseTag(tag.name, branch, DEFAULT_TAG_TEMPLATE)
    expect(reparsed?.builtAt).toEqual(now)
  })

  it("branch と builtAt をそのまま保持する", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now, DEFAULT_TAG_TEMPLATE)
    expect(tag.branchName).toBe("main")
    expect(tag.builtAt).toBe(now)
  })

  it("組み立てたタグ名は parseTag で正しくパースし直せる", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const branch = toBranchName("main")
    const tag = buildNewTag(branch, now, DEFAULT_TAG_TEMPLATE)
    const reparsed = parseTag(tag.name, branch, DEFAULT_TAG_TEMPLATE)
    expect(reparsed?.builtAt).toEqual(now)
  })

  it("月・日・時・分・秒を2桁ゼロパディングする（UTC 3:07:09 → JST 12:07:09）", () => {
    const now = new Date(Date.UTC(2026, 0, 5, 3, 7, 9))
    const tag = buildNewTag(toBranchName("main"), now, DEFAULT_TAG_TEMPLATE)
    expect(tag.name).toBe("main-build-at-20260105-120709")
  })

  it("テンプレートをカスタマイズすると、その形式でタグ名を組み立てる", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const format = validateTagFormat("{date}-{time}-{branch}")
    const tag = buildNewTag(toBranchName("main"), now, format)
    expect(tag.name).toBe("20260902-213456-main")
  })
})

describe("テンプレートのプレースホルダの並び順・区切り文字は任意（回帰テスト）", () => {
  it("{date}-{time}-{branch}（デフォルトと並び順が異なる）で生成・再パース・最新判定ができる", () => {
    const format = validateTagFormat("{date}-{time}-{branch}")
    const branch = toBranchName("main")
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))

    const tag = buildNewTag(branch, now, format)
    expect(tag.name).toBe("20260902-213456-main")

    const reparsed = parseTag(tag.name, branch, format)
    expect(reparsed?.builtAt).toEqual(now)

    const older = buildNewTag(branch, new Date(Date.UTC(2026, 0, 1, 0, 0, 0)), format)
    const latest = findLatestParsedTag([older.name, tag.name], branch, format)
    expect(latest?.name).toBe(tag.name)
  })

  it("v{time}_{branch}__{date}（区切り文字が複数種類混在）で生成・再パース・最新判定ができる", () => {
    const format = validateTagFormat("v{time}_{branch}__{date}")
    const branch = toBranchName("release/2026-q2")
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))

    const tag = buildNewTag(branch, now, format)
    expect(tag.name).toBe("v213456_release-2026-q2__20260902")

    const reparsed = parseTag(tag.name, branch, format)
    expect(reparsed?.builtAt).toEqual(now)

    const older = buildNewTag(branch, new Date(Date.UTC(2026, 0, 1, 0, 0, 0)), format)
    const latest = findLatestParsedTag([tag.name, older.name], branch, format)
    expect(latest?.name).toBe(tag.name)
  })
})
