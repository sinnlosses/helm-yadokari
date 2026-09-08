const SENSITIVE_KEYS = new Set(["token", "access_token", "authorization", "password", "secret"])

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
  /** 実行は継続するが運用者に気づいてほしい事象（例: 最新タグが決まらずappを見送った） */
  warn(fields: Record<string, unknown>): void {
    console.warn(formatLog("warn", fields))
  },
  error(fields: Record<string, unknown>): void {
    console.error(formatLog("error", fields))
  },
}
