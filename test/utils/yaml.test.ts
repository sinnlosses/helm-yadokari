import { writeFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import { z } from "zod"

import { parseYamlFile } from "../../src/utils/yaml.js"
import { useTmpDir } from "../helpers.js"

const Schema = z.object({ name: z.string(), count: z.number() })

const tmpDir = useTmpDir()

function writeYaml(content: string): string {
  const filePath = join(tmpDir.path, "file.yaml")
  writeFileSync(filePath, content, "utf-8")
  return filePath
}

describe("parseYamlFile", () => {
  it("スキーマに違反するとき、ファイルパスを含む例外をスローする", () => {
    const filePath = writeYaml("name: my-app\ncount: not-a-number\n")
    expect(() => parseYamlFile(filePath, Schema)).toThrow(filePath)
  })
})
