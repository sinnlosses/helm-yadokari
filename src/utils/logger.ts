// "accesstoken" は `EnvConfig` のキー名 `accessToken` を `toLowerCase()` した形。
// アンダースコアの有無は `toLowerCase()` では吸収できないため、"access_token" と別に持つ。
const SENSITIVE_KEYS = new Set([
  "token",
  "access_token",
  "accesstoken",
  "authorization",
  "password",
  "secret",
])

function redact(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : v,
    ]),
  )
}

function formatLog(level: string, fields: Record<string, unknown>): string {
  return JSON.stringify({ level, timestamp: new Date().toISOString(), ...redact(fields) })
}

export const logger = {
  info(fields: Record<string, unknown>): void {
    console.log(formatLog("info", fields))
  },
  error(fields: Record<string, unknown>): void {
    console.error(formatLog("error", fields))
  },
}
