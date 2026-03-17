import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "date",
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
