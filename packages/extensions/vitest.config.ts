import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "extensions",
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
