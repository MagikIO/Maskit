import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "numeric",
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
