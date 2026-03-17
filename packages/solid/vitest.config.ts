import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "solid",
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
  },
});
