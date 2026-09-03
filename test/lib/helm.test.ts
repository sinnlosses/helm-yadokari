import { describe, expect, it } from "vitest"

import {
  getImageTag,
  getValueAtAnchor,
  getValueAtPath,
  setImageTag,
  setValueAtAnchor,
  setValueAtPath,
} from "../../src/lib/helm.js"
import { toAnchorName, toDotPath } from "../../src/types.js"

describe("getValueAtPath", () => {
  it("トップレベルのキーの値を返す", () => {
    expect(getValueAtPath("tag: v1.0.0\n", toDotPath("tag"))).toBe("v1.0.0")
  })

  it("ネストしたdotパスの値を返す", () => {
    expect(getValueAtPath("image:\n  tag: v1.0.0\n", toDotPath("image.tag"))).toBe("v1.0.0")
  })

  it("深くネストしたdotパスの値を返す", () => {
    expect(getValueAtPath("a:\n  b:\n    c: v1.0.0\n", toDotPath("a.b.c"))).toBe("v1.0.0")
  })

  it("パスが存在しないとき undefined を返す", () => {
    expect(getValueAtPath("image:\n  tag: v1.0.0\n", toDotPath("image.repository"))).toBeUndefined()
  })

  it("途中のキーがオブジェクトでないとき undefined を返す", () => {
    expect(getValueAtPath("image: v1.0.0\n", toDotPath("image.tag"))).toBeUndefined()
  })

  it("数値やbooleanの値は文字列に変換して返す", () => {
    expect(getValueAtPath("image:\n  tag: 123\n", toDotPath("image.tag"))).toBe("123")
  })
})

describe("setValueAtPath", () => {
  it("トップレベルのキーの値を書き換える", () => {
    const result = setValueAtPath("tag: v1.0.0\nother: keep\n", toDotPath("tag"), "v2.0.0")
    expect(getValueAtPath(result, toDotPath("tag"))).toBe("v2.0.0")
    expect(getValueAtPath(result, toDotPath("other"))).toBe("keep")
  })

  it("ネストしたdotパスの値を書き換える", () => {
    const result = setValueAtPath(
      "image:\n  repository: my-app\n  tag: v1.0.0\n",
      toDotPath("image.tag"),
      "v2.0.0",
    )
    expect(getValueAtPath(result, toDotPath("image.tag"))).toBe("v2.0.0")
    expect(getValueAtPath(result, toDotPath("image.repository"))).toBe("my-app")
  })

  it("パスが存在しないとき例外をスローする", () => {
    expect(() =>
      setValueAtPath("image:\n  tag: v1.0.0\n", toDotPath("image.missing.deep"), "x"),
    ).toThrow("image.missing.deep")
  })

  it("途中のキーがオブジェクトでないとき例外をスローする", () => {
    expect(() => setValueAtPath("image: v1.0.0\n", toDotPath("image.tag"), "v2.0.0")).toThrow(
      "image.tag",
    )
  })

  it("書き換え対象以外のコメント・クォートスタイルを保持する", () => {
    const result = setValueAtPath(
      'image:\n  repository: "my-app" # keep me\n  tag: v1.0.0\n',
      toDotPath("image.tag"),
      "v2.0.0",
    )
    expect(result).toContain('repository: "my-app" # keep me')
  })
})

const VARIABLES_YAML = `variables:
  - &helmVersion develop
  - &tenant1client1AppsVersion main
  - &tenant1client2AppsVersion main
`

describe("getValueAtAnchor", () => {
  it("アンカー名に対応する値を返す", () => {
    expect(getValueAtAnchor(VARIABLES_YAML, toAnchorName("tenant1client1AppsVersion"))).toBe("main")
  })

  it("ネストの深い位置にあるアンカーも見つける", () => {
    const yamlContent = "other:\n  nested:\n    - &deepAnchor value1\n"
    expect(getValueAtAnchor(yamlContent, toAnchorName("deepAnchor"))).toBe("value1")
  })

  it("該当するアンカーが存在しないとき undefined を返す", () => {
    expect(getValueAtAnchor(VARIABLES_YAML, toAnchorName("noSuchAnchor"))).toBeUndefined()
  })
})

describe("setValueAtAnchor", () => {
  it("アンカー名に対応する値だけを書き換え、他の要素は保持する", () => {
    const result = setValueAtAnchor(
      VARIABLES_YAML,
      toAnchorName("tenant1client1AppsVersion"),
      "release/1.2.3",
    )
    expect(getValueAtAnchor(result, toAnchorName("tenant1client1AppsVersion"))).toBe(
      "release/1.2.3",
    )
    expect(getValueAtAnchor(result, toAnchorName("helmVersion"))).toBe("develop")
    expect(getValueAtAnchor(result, toAnchorName("tenant1client2AppsVersion"))).toBe("main")
  })

  it("アンカー記法自体は書き換え後も維持される", () => {
    const result = setValueAtAnchor(
      VARIABLES_YAML,
      toAnchorName("tenant1client1AppsVersion"),
      "release/1.2.3",
    )
    expect(result).toContain("&tenant1client1AppsVersion release/1.2.3")
  })

  it("該当するアンカーが存在しないとき例外をスローする", () => {
    expect(() => setValueAtAnchor(VARIABLES_YAML, toAnchorName("noSuchAnchor"), "x")).toThrow(
      "noSuchAnchor",
    )
  })
})

describe("getImageTag / setImageTag（imageTagKey/imageTagAnchorの振り分け）", () => {
  it("imageTagKeyが指定されているときdotパスとして扱う", () => {
    const yamlContent = "image:\n  tag: v1.0.0\n"
    expect(getImageTag(yamlContent, { imageTagKey: toDotPath("image.tag") })).toBe("v1.0.0")
    const updated = setImageTag(yamlContent, { imageTagKey: toDotPath("image.tag") }, "v2.0.0")
    expect(getImageTag(updated, { imageTagKey: toDotPath("image.tag") })).toBe("v2.0.0")
  })

  it("imageTagAnchorが指定されているときアンカー名として扱う", () => {
    const anchor = { imageTagAnchor: toAnchorName("tenant1client1AppsVersion") }
    expect(getImageTag(VARIABLES_YAML, anchor)).toBe("main")
    const updated = setImageTag(VARIABLES_YAML, anchor, "release/1.2.3")
    expect(getImageTag(updated, anchor)).toBe("release/1.2.3")
  })
})
