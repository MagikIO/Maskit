import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    name: "solid",
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
