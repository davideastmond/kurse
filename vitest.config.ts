import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(configDir, "src"),
      "@auth": path.resolve(configDir, "src/auth"),
      "@components": path.resolve(configDir, "src/components"),
    },
  },
  test: {
    environment: "node",
  },
});
