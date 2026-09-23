import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NEXT_PUBLIC_API_BASE_URL: "http://api.test.local/api/v1",
    },
    globals: false,
    passWithNoTests: false,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
