import { loadEnvConfig } from "./lib/env.js"
import { run } from "./main.js"
import { FatalError } from "./utils/errors.js"
import { logger } from "./utils/logger.js"

// 環境変数の読み込みも `then` の中で呼ぶ。`run(loadEnvConfig())` と書くと引数が先に同期評価され、
// 失敗が下の catch に載らず素のスタックトレースになる
Promise.resolve()
  .then(() => run(loadEnvConfig()))
  .then((result) => {
    if (result === "SUCCESS") process.exit(0)
    else process.exit(1)
  })
  .catch((err: unknown) => {
    if (err instanceof FatalError) {
      logger.error({ event: "fatal_error", httpStatus: err.httpStatus, message: err.message })
    } else {
      logger.error({ event: "unhandled_error", message: String(err) })
    }
    process.exit(1)
  })
