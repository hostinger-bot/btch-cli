import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Vitest workers run under Node and cannot resolve Bun's builtin module.
      // Provide a node:sqlite-backed shim (test/bun-sqlite.ts) instead.
      "bun:sqlite": fileURLToPath(new URL("./test/bun-sqlite.ts", import.meta.url)),
    },
  },
  test: {
    exclude: ["dist/**", "node_modules/**", "tmp/**", ".claude/**", ".cursor/**"],
  },
});
