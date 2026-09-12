import { describe, expect, it } from "vitest"

import { buildCompareUrl, buildTagUrl } from "../../../src/lib/github/web-url.js"
import { toPlatformUrl, toTagName } from "../../../src/types/types.js"

describe("buildTagUrl", () => {
  it("リポジトリのweb URLの配下にリリースページのパスを足す", () => {
    expect(buildTagUrl(toPlatformUrl("https://github.com/acme/chart"), toTagName("v1.0.0"))).toBe(
      "https://github.com/acme/chart/releases/tag/v1.0.0",
    )
  })

  it("GHES でも owner/repo 部分を落とさない", () => {
    expect(
      buildTagUrl(toPlatformUrl("https://ghe.example.com/acme/chart"), toTagName("v1.0.0")),
    ).toBe("https://ghe.example.com/acme/chart/releases/tag/v1.0.0")
  })

  it("タグ名の / をエスケープする", () => {
    expect(
      buildTagUrl(toPlatformUrl("https://github.com/acme/chart"), toTagName("release/1.0")),
    ).toBe("https://github.com/acme/chart/releases/tag/release%2F1.0")
  })
})

describe("buildCompareUrl", () => {
  it("2つのタグを ... で繋いだ比較ページのURLを組み立てる", () => {
    expect(
      buildCompareUrl(
        toPlatformUrl("https://github.com/acme/chart"),
        toTagName("release/1.0"),
        toTagName("v2.0.0"),
      ),
    ).toBe("https://github.com/acme/chart/compare/release%2F1.0...v2.0.0")
  })
})
