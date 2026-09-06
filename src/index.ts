import { loadEnvConfig } from "./lib/env.js"
import { run } from "./main.js"
import { FatalError } from "./utils/errors.js"
import { logger } from "./utils/logger.js"

// 環境変数の読み込みを非同期の中で呼ぶのは、その失敗も下の catch に載せて構造化ログに出すため
// トップレベルで投げると素のスタックトレースになる
run(loadEnvConfig())
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
