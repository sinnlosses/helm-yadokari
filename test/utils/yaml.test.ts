import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { parseYamlFile } from "../../src/utils/yaml.js"

const Schema = z.object({ name: z.string(), count: z.number() })

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(process.cwd(), "test-tmp-"))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true })
})

function writeYaml(content: string): string {
  const filePath = join(tmpDir, "file.yaml")
  writeFileSync(filePath, content, "utf-8")
  return filePath
}

describe("parseYamlFile", () => {
  it("スキーマに一致するYAMLをパースする", () => {
    const filePath = writeYaml("name: my-app\ncount: 3\n")
    expect(parseYamlFile(filePath, Schema)).toEqual({ name: "my-app", count: 3 })
  })

  it("スキーマに違反するとき、ファイルパスを含む例外をスローする", () => {
    const filePath = writeYaml("name: my-app\ncount: not-a-number\n")
    expect(() => parseYamlFile(filePath, Schema)).toThrow(filePath)
  })

  it("スキーマに違反するとき、形式が不正である旨の例外をスローする", () => {
    const filePath = writeYaml("just a string")
    expect(() => parseYamlFile(filePath, Schema)).toThrow("形式が不正です")
  })

  it("ファイルが存在しないとき例外をスローする", () => {
    expect(() => parseYamlFile(join(tmpDir, "nonexistent.yaml"), Schema)).toThrow()
  })
})
