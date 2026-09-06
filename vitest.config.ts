import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    env: {
      GITLAB_URL: "https://gitlab.test",
      ACCESS_TOKEN: "test-token",
    },
    // junit レポート（test-results.xml）はCIのartifact用。ローカル実行のたびに
    // 生成物が増えないよう、CI（GitLab CIが自動で設定する CI=true）でのみ有効にする。
    reporters: process.env["CI"] ? ["verbose", "junit"] : ["verbose"],
    outputFile: {
      junit: "test-results.xml",
    },
    coverage: {
      provider: "v8",
      // scripts/ で唯一テストを持つのが verify-config なので、そこだけ対象に加える
      include: ["src/**/*.ts", "scripts/lint/verify-config/**/*.ts"],
    },
  },
})
