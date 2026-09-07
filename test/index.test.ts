import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { loadEnvConfigMock, runMock, loggerMock } = vi.hoisted(() => ({
  loadEnvConfigMock: vi.fn(),
  runMock: vi.fn(),
  loggerMock: { info: vi.fn(), error: vi.fn() },
}))

vi.mock("../src/lib/env.js", () => ({ loadEnvConfig: loadEnvConfigMock }))
vi.mock("../src/main.js", () => ({ run: runMock }))
vi.mock("../src/utils/logger.js", () => ({ logger: loggerMock }))

/**
 * `src/index.ts`はimportした時点で`run()`を呼ぶ副作用モジュールなので、テストごとに
 * モジュールキャッシュを捨てて読み直す。`process.exit`は実際に呼ばれるとテストごと落ちるため、
 * 渡された終了コードを記録するだけのスタブに差し替える。
 */
async function importIndexAndWaitForExit(): Promise<number | undefined> {
  let exitCode: number | undefined
  const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    exitCode = code
    return undefined as never
  }) as never)
  await import("../src/index.js")
  await vi.waitFor(() => expect(exitSpy).toHaveBeenCalled())
  exitSpy.mockRestore()
  return exitCode
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("index", () => {
  it("SUCCESS のとき終了コード0で終わる", async () => {
    runMock.mockResolvedValue("SUCCESS")

    expect(await importIndexAndWaitForExit()).toBe(0)
  })

  it("PARTIAL_FAILURE のとき終了コード1で終わる", async () => {
    runMock.mockResolvedValue("PARTIAL_FAILURE")

    expect(await importIndexAndWaitForExit()).toBe(1)
  })

  it("FatalError のとき fatal_error として記録し終了コード1で終わる", async () => {
    // `index.ts`が見るのと同じモジュール実体から取らないと`instanceof`が成立しない
    const { FatalError } = await import("../src/utils/errors.js")
    runMock.mockRejectedValue(new FatalError(401, new Error("認証に失敗しました")))

    expect(await importIndexAndWaitForExit()).toBe(1)
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "fatal_error", httpStatus: 401 }),
    )
  })

  it("環境変数の読み込みの失敗も unhandled_error として記録し終了コード1で終わる", async () => {
    loadEnvConfigMock.mockImplementation(() => {
      throw new Error("GITLAB_URL が未設定です")
    })

    expect(await importIndexAndWaitForExit()).toBe(1)
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "unhandled_error" }),
    )
  })

  it("FatalError以外の例外のとき unhandled_error として記録し終了コード1で終わる", async () => {
    runMock.mockRejectedValue(new Error("想定外"))

    expect(await importIndexAndWaitForExit()).toBe(1)
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "unhandled_error" }),
    )
  })
})
