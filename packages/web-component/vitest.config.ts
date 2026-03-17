import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "web-component",
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
  },
});
