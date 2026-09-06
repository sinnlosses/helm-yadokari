import { describe, expect, it } from "vitest"

import {
  buildNewTag,
  DEFAULT_TAG_FORMAT,
  findLatestParsedTag,
  parseTag,
  validateTagFormat,
} from "../../../src/lib/gitlab/tag.js"
import { toBranchName, toTagName } from "../../../src/types/types.js"

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
    expect(() => validateTagFormat("build-at-{date}-{time}")).toThrow("TAG_FORMAT")
  })

  it("{date} がないとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-build-at-{time}")).toThrow("TAG_FORMAT")
  })

  it("{time} がないとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-build-at-{date}")).toThrow("TAG_FORMAT")
  })

  it("同じプレースホルダが複数回あるとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-{branch}-{date}-{time}")).toThrow("TAG_FORMAT")
  })

  it("未知のプレースホルダがあるとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-{date}-{time}-{foo}")).toThrow("TAG_FORMAT")
  })
})

describe("parseTag", () => {
  it("正しい形式のタグをパースする", () => {
    const parsed = parseTag(
      toTagName("main-build-at-20260902-123456"),
      toBranchName("main"),
      DEFAULT_TAG_FORMAT,
    )
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
      DEFAULT_TAG_FORMAT,
    )
    expect(parsed).toBeDefined()
    expect(parsed?.builtAt.getUTCFullYear()).toBe(2026)
  })

  it("別ブランチのタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("develop-build-at-20260902-123456"),
        toBranchName("main"),
        DEFAULT_TAG_FORMAT,
      ),
    ).toBeUndefined()
  })

  it("build-at 部分がないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-20260902-123456"), toBranchName("main"), DEFAULT_TAG_FORMAT),
    ).toBeUndefined()
  })

  it("日付部分が8桁でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-2026902-123456"), toBranchName("main"), DEFAULT_TAG_FORMAT),
    ).toBeUndefined()
  })

  it("時刻部分が6桁でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-20260902-12345"), toBranchName("main"), DEFAULT_TAG_FORMAT),
    ).toBeUndefined()
  })

  it("日付・時刻部分が数字でないタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("main-build-at-2026090a-123456"),
        toBranchName("main"),
        DEFAULT_TAG_FORMAT,
      ),
    ).toBeUndefined()
  })

  it("余分なサフィックスがあるタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("main-build-at-20260902-123456-extra"),
        toBranchName("main"),
        DEFAULT_TAG_FORMAT,
      ),
    ).toBeUndefined()
  })

  it("TAG_FORMATをカスタマイズすると、その形式でパースする", () => {
    const format = validateTagFormat("{date}-{time}-{branch}")
    const parsed = parseTag(toTagName("20260902-123456-main"), toBranchName("main"), format)
    expect(parsed).toBeDefined()
    expect(parsed?.builtAt.getUTCFullYear()).toBe(2026)
  })

  it("TAG_FORMATのリテラル部分が異なれば、デフォルト形式のタグはパースできない", () => {
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
      DEFAULT_TAG_FORMAT,
    )
    expect(latest?.name).toBe("main-build-at-20260902-123456")
  })

  it("別ブランチのタグは無視する", () => {
    const latest = findLatestParsedTag(
      [toTagName("develop-build-at-20261231-235959"), toTagName("main-build-at-20260101-000000")],
      toBranchName("main"),
      DEFAULT_TAG_FORMAT,
    )
    expect(latest?.name).toBe("main-build-at-20260101-000000")
  })

  it("形式に合わないタグは無視する", () => {
    const latest = findLatestParsedTag(
      [toTagName("v1.0.0"), toTagName("main-build-at-20260101-000000")],
      toBranchName("main"),
      DEFAULT_TAG_FORMAT,
    )
    expect(latest?.name).toBe("main-build-at-20260101-000000")
  })

  it("該当するタグがないとき undefined を返す", () => {
    expect(
      findLatestParsedTag([toTagName("v1.0.0")], toBranchName("main"), DEFAULT_TAG_FORMAT),
    ).toBeUndefined()
  })

  it("空配列のとき undefined を返す", () => {
    expect(findLatestParsedTag([], toBranchName("main"), DEFAULT_TAG_FORMAT)).toBeUndefined()
  })
})

describe("buildNewTag", () => {
  it("命名規則に従ったタグ名を組み立てる", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now, DEFAULT_TAG_FORMAT)
    expect(tag.name).toBe("main-build-at-20260902-123456")
  })

  it("スラッシュを含むブランチ名は - に置換する", () => {
    const now = new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
    const tag = buildNewTag(toBranchName("release/foo"), now, DEFAULT_TAG_FORMAT)
    expect(tag.name).toBe("release-foo-build-at-20260101-000000")
  })

  it("branch と builtAt をそのまま保持する", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now, DEFAULT_TAG_FORMAT)
    expect(tag.branch).toBe("main")
    expect(tag.builtAt).toBe(now)
  })

  it("組み立てたタグ名は parseTag で正しくパースし直せる", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const branch = toBranchName("main")
    const tag = buildNewTag(branch, now, DEFAULT_TAG_FORMAT)
    const reparsed = parseTag(tag.name, branch, DEFAULT_TAG_FORMAT)
    expect(reparsed?.builtAt).toEqual(now)
  })

  it("月・日・時・分・秒を2桁ゼロパディングする", () => {
    const now = new Date(Date.UTC(2026, 0, 5, 3, 7, 9))
    const tag = buildNewTag(toBranchName("main"), now, DEFAULT_TAG_FORMAT)
    expect(tag.name).toBe("main-build-at-20260105-030709")
  })

  it("TAG_FORMATをカスタマイズすると、その形式でタグ名を組み立てる", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const format = validateTagFormat("{date}-{time}-{branch}")
    const tag = buildNewTag(toBranchName("main"), now, format)
    expect(tag.name).toBe("20260902-123456-main")
  })
})

describe("TAG_FORMATのプレースホルダの並び順・区切り文字は任意（回帰テスト）", () => {
  it("{date}-{time}-{branch}（デフォルトと並び順が異なる）で生成・再パース・最新判定ができる", () => {
    const format = validateTagFormat("{date}-{time}-{branch}")
    const branch = toBranchName("main")
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))

    const tag = buildNewTag(branch, now, format)
    expect(tag.name).toBe("20260902-123456-main")

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
    expect(tag.name).toBe("v123456_release-2026-q2__20260902")

    const reparsed = parseTag(tag.name, branch, format)
    expect(reparsed?.builtAt).toEqual(now)

    const older = buildNewTag(branch, new Date(Date.UTC(2026, 0, 1, 0, 0, 0)), format)
    const latest = findLatestParsedTag([tag.name, older.name], branch, format)
    expect(latest?.name).toBe(tag.name)
  })
})
