import { loadConfig } from "../../src/lib/config.js"

const configPath = process.argv[2] ?? "config"

try {
  const { chartGroups } = loadConfig(configPath)
  const appCount = chartGroups.reduce((sum, g) => sum + g.apps.length, 0)
  console.log(`config OK: ${chartGroups.length} chart groups, ${appCount} apps (${configPath})`)
} catch (err) {
  console.error(`config ERROR: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
}
