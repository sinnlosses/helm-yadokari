import { describe, expect, it } from "vitest"

import { buildCompareUrl, buildTagUrl } from "../../../src/lib/gitlab/web-url.js"
import { toGitLabUrl, toTagName } from "../../../src/types/types.js"

describe("buildTagUrl", () => {
  it("プロジェクトのweb URLの配下にタグページのパスを足す", () => {
    expect(
      buildTagUrl(toGitLabUrl("https://gitlab.example.com/group/proj"), toTagName("v1.0.0")),
    ).toBe("https://gitlab.example.com/group/proj/-/tags/v1.0.0")
  })

  it("サブパス設置のインスタンスでもグループ/プロジェクト部分を落とさない", () => {
    expect(
      buildTagUrl(toGitLabUrl("https://example.com/gitlab/group/proj"), toTagName("v1.0.0")),
    ).toBe("https://example.com/gitlab/group/proj/-/tags/v1.0.0")
  })

  it("タグ名の / をエスケープする", () => {
    expect(
      buildTagUrl(toGitLabUrl("https://gitlab.example.com/group/proj"), toTagName("release/1.0")),
    ).toBe("https://gitlab.example.com/group/proj/-/tags/release%2F1.0")
  })
})

describe("buildCompareUrl", () => {
  it("2つのタグを ... で繋いだ比較ページのURLを組み立てる", () => {
    expect(
      buildCompareUrl(
        toGitLabUrl("https://gitlab.example.com/group/proj"),
        toTagName("release/1.0"),
        toTagName("v2.0.0"),
      ),
    ).toBe("https://gitlab.example.com/group/proj/-/compare/release%2F1.0...v2.0.0")
  })
})
