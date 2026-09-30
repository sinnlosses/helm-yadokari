import { loadEnvConfig } from "./lib/env.js"
import { run } from "./main.js"
import { FatalError, toErrorStack } from "./utils/errors.js"
import { logger } from "./utils/logger.js"

try {
  const result = await run(loadEnvConfig())
  process.exit(result === "SUCCESS" ? 0 : 1)
} catch (err: unknown) {
  if (err instanceof FatalError) {
    logger.error({
      event: "fatal_error",
      httpStatus: err.httpStatus,
      message: err.message,
      ...err.context,
      stack: toErrorStack(err),
    })
  } else {
    logger.error({ event: "unhandled_error", message: String(err), stack: toErrorStack(err) })
  }
  process.exit(1)
}
