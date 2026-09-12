import { describe, expect, it } from "vitest"

import {
  buildNewTag,
  findLatestParsedTag,
  parseTag,
  validateTagFormat,
} from "../../src/domain/tag-format.js"
import { toBranchName, toTagName } from "../../src/types/types.js"

/** 実際に使われているタグ形式の1つ。もう1つは並び順が異なる`{date}-{time}-{branch}` */
const BUILD_AT_FORMAT = validateTagFormat("{branch}-build-at-{date}-{time}")

describe("validateTagFormat", () => {
  it("{branch}-build-at-{date}-{time} を受け入れる", () => {
    expect(validateTagFormat("{branch}-build-at-{date}-{time}")).toBe(
      "{branch}-build-at-{date}-{time}",
    )
  })

  it("プレースホルダの並び順を入れ替えたフォーマットを受け入れる", () => {
    expect(validateTagFormat("{date}-{time}-{branch}")).toBe("{date}-{time}-{branch}")
  })

  it("{branch} がないとき例外をスローする", () => {
    expect(() => validateTagFormat("build-at-{date}-{time}")).toThrow("tagFormat")
  })

  it("{date} がないとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-build-at-{time}")).toThrow("tagFormat")
  })

  it("{time} がないとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-{date}")).toThrow("tagFormat")
  })

  // {branch}/{time}/{date} 単独はいずれも「{branch}がないとき」「{date}がないとき」と
  // 同じ分岐（REQUIRED_PLACEHOLDERSの出現回数が1でない）しか通らないが、「単独形はすべて
  // 設定エラー」という仕様（docs/requirements.md 4.1節）の確認として1件にまとめて残す
  it.each(["{branch}", "{time}", "{date}"])("%s 単独のフォーマットは例外をスローする", (format) => {
    expect(() => validateTagFormat(format)).toThrow("tagFormat")
  })

  it("同じプレースホルダが複数回あるとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-{branch}-{date}-{time}")).toThrow("tagFormat")
  })

  it("未知のプレースホルダがあるとき例外をスローする", () => {
    expect(() => validateTagFormat("{branch}-{date}-{time}-{foo}")).toThrow("tagFormat")
  })
})

describe("parseTag", () => {
  it("正しい形式のタグをパースする", () => {
    const parsed = parseTag(
      toTagName("main-build-at-20260902-123456"),
      toBranchName("main"),
      BUILD_AT_FORMAT,
    )
    expect(parsed).toBeDefined()
    expect(parsed?.name).toBe("main-build-at-20260902-123456")
    expect(parsed?.branchName).toBe("main")
    // タグ名の 12:34:56 はJST。UTCでは9時間引いた 03:34:56 になる
    expect(parsed?.taggedAt).toEqual(new Date(Date.UTC(2026, 8, 2, 3, 34, 56)))
  })

  it("スラッシュを含むブランチ由来のタグをパースする", () => {
    const parsed = parseTag(
      toTagName("release-foo-build-at-20260101-000000"),
      toBranchName("release/foo"),
      BUILD_AT_FORMAT,
    )
    expect(parsed).toBeDefined()
    // タグ名の 2026-01-01 00:00:00 はJST。UTCでは9時間引いて前日（2025-12-31 15:00:00）になる
    expect(parsed?.taggedAt).toEqual(new Date(Date.UTC(2025, 11, 31, 15, 0, 0)))
  })

  it("別ブランチのタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("develop-build-at-20260902-123456"),
        toBranchName("main"),
        BUILD_AT_FORMAT,
      ),
    ).toBeUndefined()
  })

  it("build-at 部分がないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-20260902-123456"), toBranchName("main"), BUILD_AT_FORMAT),
    ).toBeUndefined()
  })

  it("日付部分が8桁でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-2026902-123456"), toBranchName("main"), BUILD_AT_FORMAT),
    ).toBeUndefined()
  })

  it("時刻部分が6桁でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-20260902-12345"), toBranchName("main"), BUILD_AT_FORMAT),
    ).toBeUndefined()
  })

  it("日付・時刻部分が数字でないタグは undefined を返す", () => {
    expect(
      parseTag(toTagName("main-build-at-2026090a-123456"), toBranchName("main"), BUILD_AT_FORMAT),
    ).toBeUndefined()
  })

  it("余分なサフィックスがあるタグは undefined を返す", () => {
    expect(
      parseTag(
        toTagName("main-build-at-20260902-123456-extra"),
        toBranchName("main"),
        BUILD_AT_FORMAT,
      ),
    ).toBeUndefined()
  })

  it("フォーマットを変えると、その形式でパースする", () => {
    const format = validateTagFormat("{date}-{time}-{branch}")
    const parsed = parseTag(toTagName("20260902-123456-main"), toBranchName("main"), format)
    expect(parsed?.taggedAt).toEqual(new Date(Date.UTC(2026, 8, 2, 3, 34, 56)))
  })

  it("フォーマットのリテラル部分が異なれば、別形式のタグはパースできない", () => {
    const format = validateTagFormat("{branch}_{date}_{time}")
    expect(
      parseTag(toTagName("main-build-at-20260902-123456"), toBranchName("main"), format),
    ).toBeUndefined()
  })
})

describe("findLatestParsedTag", () => {
  it("最も新しいタグを返す", () => {
    const latest = findLatestParsedTag(
      [
        toTagName("main-build-at-20260101-000000"),
        toTagName("main-build-at-20260902-123456"),
        toTagName("main-build-at-20260601-000000"),
      ],
      toBranchName("main"),
      BUILD_AT_FORMAT,
    )
    expect(latest?.name).toBe("main-build-at-20260902-123456")
  })

  it("別ブランチのタグは無視する", () => {
    const latest = findLatestParsedTag(
      [toTagName("develop-build-at-20261231-235959"), toTagName("main-build-at-20260101-000000")],
      toBranchName("main"),
      BUILD_AT_FORMAT,
    )
    expect(latest?.name).toBe("main-build-at-20260101-000000")
  })

  it("形式に合わないタグは無視する", () => {
    const latest = findLatestParsedTag(
      [toTagName("v1.0.0"), toTagName("main-build-at-20260101-000000")],
      toBranchName("main"),
      BUILD_AT_FORMAT,
    )
    expect(latest?.name).toBe("main-build-at-20260101-000000")
  })

  it("該当するタグがないとき undefined を返す", () => {
    expect(
      findLatestParsedTag([toTagName("v1.0.0")], toBranchName("main"), BUILD_AT_FORMAT),
    ).toBeUndefined()
  })

  it("空配列のとき undefined を返す", () => {
    expect(findLatestParsedTag([], toBranchName("main"), BUILD_AT_FORMAT)).toBeUndefined()
  })
})

describe("buildNewTag", () => {
  it("フォーマットに従ったタグ名を組み立てる（UTC 12:34:56 → JST 21:34:56）", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now, BUILD_AT_FORMAT)
    expect(tag.name).toBe("main-build-at-20260902-213456")
  })

  it("スラッシュを含むブランチ名は - に置換する（UTC 0:00 → JST 9:00）", () => {
    const now = new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
    const tag = buildNewTag(toBranchName("release/foo"), now, BUILD_AT_FORMAT)
    expect(tag.name).toBe("release-foo-build-at-20260101-090000")
  })

  it("UTC 16:00 以降はJSTで日付が翌日に繰り上がる", () => {
    const now = new Date(Date.UTC(2026, 8, 8, 16, 0, 0)) // UTC 9/8 16:00 → JST 9/9 01:00
    const tag = buildNewTag(toBranchName("main"), now, BUILD_AT_FORMAT)
    expect(tag.name).toBe("main-build-at-20260909-010000")
  })

  it("日付が繰り上がるタグ名も parseTag で元の now に正しく戻る（回帰）", () => {
    const now = new Date(Date.UTC(2026, 8, 8, 16, 0, 0))
    const branch = toBranchName("main")
    const tag = buildNewTag(branch, now, BUILD_AT_FORMAT)
    const reparsed = parseTag(tag.name, branch, BUILD_AT_FORMAT)
    expect(reparsed?.taggedAt).toEqual(now)
  })

  it("branch と打刻日時をそのまま保持する", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))
    const tag = buildNewTag(toBranchName("main"), now, BUILD_AT_FORMAT)
    expect(tag.branchName).toBe("main")
    expect(tag.taggedAt).toEqual(now)
  })

  it("ミリ秒を含む now でも、タグ名から読み直した打刻日時と一致する", () => {
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56, 789))
    const branch = toBranchName("main")
    const tag = buildNewTag(branch, now, BUILD_AT_FORMAT)
    expect(parseTag(tag.name, branch, BUILD_AT_FORMAT)?.taggedAt).toEqual(tag.taggedAt)
  })

  it("月・日・時・分・秒を2桁ゼロパディングする（UTC 3:07:09 → JST 12:07:09）", () => {
    const now = new Date(Date.UTC(2026, 0, 5, 3, 7, 9))
    const tag = buildNewTag(toBranchName("main"), now, BUILD_AT_FORMAT)
    expect(tag.name).toBe("main-build-at-20260105-120709")
  })
})

describe("プレースホルダの並び順・区切り文字は任意（回帰テスト）", () => {
  it("{date}-{time}-{branch}（実際に使われているもう1つの形式）で生成・再パース・最新判定ができる", () => {
    const format = validateTagFormat("{date}-{time}-{branch}")
    const branch = toBranchName("main")
    const now = new Date(Date.UTC(2026, 8, 2, 12, 34, 56))

    const tag = buildNewTag(branch, now, format)
    expect(tag.name).toBe("20260902-213456-main")

    const reparsed = parseTag(tag.name, branch, format)
    expect(reparsed?.taggedAt).toEqual(now)

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
    expect(reparsed?.taggedAt).toEqual(now)

    const older = buildNewTag(branch, new Date(Date.UTC(2026, 0, 1, 0, 0, 0)), format)
    const latest = findLatestParsedTag([tag.name, older.name], branch, format)
    expect(latest?.name).toBe(tag.name)
  })
})

describe("compileTagPattern（正規表現特殊文字のエスケープ）", () => {
  it("区切り文字に . を使うフォーマットでは、別の区切り文字のタグ名を誤ってマッチさせない", () => {
    const format = validateTagFormat("{branch}.{date}.{time}")
    // "." がエスケープされていれば任意の1文字にはマッチしない。区切り文字が "-" の
    // タグ名（本来別形式のタグ）が誤って読めてしまわないことを確認する
    expect(
      parseTag(toTagName("main-20260101-000000"), toBranchName("main"), format),
    ).toBeUndefined()
  })

  it("区切り文字に . を使うフォーマットでも、正しい区切り文字のタグ名は従来どおりパースできる", () => {
    const format = validateTagFormat("{branch}.{date}.{time}")
    const parsed = parseTag(toTagName("main.20260101.000000"), toBranchName("main"), format)
    // 2026-01-01 00:00:00（JST）はUTCで前日15:00:00
    expect(parsed?.taggedAt).toEqual(new Date(Date.UTC(2025, 11, 31, 15, 0, 0)))
  })

  it("フォーマット末尾のリテラルに . があるとき、末尾の文字が異なるタグ名を誤ってマッチさせない", () => {
    const format = validateTagFormat("{branch}-{date}-{time}.")
    expect(
      parseTag(toTagName("main-20260101-000000x"), toBranchName("main"), format),
    ).toBeUndefined()
  })

  it("フォーマット末尾のリテラルに . があるフォーマットでも、正しいタグ名は従来どおりパースできる", () => {
    const format = validateTagFormat("{branch}-{date}-{time}.")
    const parsed = parseTag(toTagName("main-20260101-000000."), toBranchName("main"), format)
    expect(parsed?.taggedAt).toEqual(new Date(Date.UTC(2025, 11, 31, 15, 0, 0)))
  })

  it("ブランチ名に . を含むとき、別の文字に置き換わったタグ名を誤ってマッチさせない", () => {
    const format = validateTagFormat("{branch}-{date}-{time}")
    expect(
      parseTag(toTagName("release-1x0-20260101-000000"), toBranchName("release/1.0"), format),
    ).toBeUndefined()
  })

  it("ブランチ名に . を含むフォーマットでも、正しいタグ名は従来どおりパースできる", () => {
    const format = validateTagFormat("{branch}-{date}-{time}")
    const parsed = parseTag(
      toTagName("release-1.0-20260101-000000"),
      toBranchName("release/1.0"),
      format,
    )
    expect(parsed?.taggedAt).toEqual(new Date(Date.UTC(2025, 11, 31, 15, 0, 0)))
  })
})
