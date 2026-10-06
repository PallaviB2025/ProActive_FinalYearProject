import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@proactive/shared": fileURLToPath(
        new URL("./packages/shared/src/schema.ts", import.meta.url),
      ),
    },
  },
});
