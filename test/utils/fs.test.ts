import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { assertSafePath, listSubdirectories } from "../../src/utils/fs.js"

describe("assertSafePath", () => {
  it(".. を含む相対パスのとき例外をスローする", () => {
    expect(() => assertSafePath("../../etc/passwd")).toThrow("パストラバーサル")
  })

  it(".. を含む絶対パスのとき例外をスローする", () => {
    expect(() => assertSafePath("/tmp/../etc/passwd")).toThrow("パストラバーサル")
  })

  it("cwd() 外の絶対パスのとき例外をスローする", () => {
    expect(() => assertSafePath("/etc/passwd")).toThrow("パストラバーサル")
  })

  it("cwd() 配下の相対パスは例外をスローしない", () => {
    expect(() => assertSafePath("config")).not.toThrow()
  })

  it("cwd() 自体は例外をスローしない", () => {
    expect(() => assertSafePath(".")).not.toThrow()
  })

  it("label を指定するとエラーメッセージに含まれる", () => {
    expect(() => assertSafePath("../../etc/passwd", "CONFIG_PATH")).toThrow("CONFIG_PATH")
  })

  it("label を省略すると汎用的なメッセージになる", () => {
    expect(() => assertSafePath("../../etc/passwd")).toThrow("パス にパストラバーサル")
  })
})

describe("listSubdirectories", () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(process.cwd(), "test-tmp-"))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it("サブディレクトリ名をアルファベット順で返す", () => {
    mkdirSync(join(tmpDir, "b-dir"))
    mkdirSync(join(tmpDir, "a-dir"))
    expect(listSubdirectories(tmpDir)).toEqual(["a-dir", "b-dir"])
  })

  it("ファイルは含めない", () => {
    mkdirSync(join(tmpDir, "a-dir"))
    writeFileSync(join(tmpDir, "file.txt"), "")
    expect(listSubdirectories(tmpDir)).toEqual(["a-dir"])
  })

  it("空ディレクトリのとき空配列を返す", () => {
    expect(listSubdirectories(tmpDir)).toEqual([])
  })
})
