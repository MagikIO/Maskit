import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "dom",
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
  },
});
