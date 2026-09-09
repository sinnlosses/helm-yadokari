export async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; durationMs: number }> {
  const start = Date.now()
  const value = await fn()
  return { value, durationMs: Date.now() - start }
}
