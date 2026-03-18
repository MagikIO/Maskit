import { resolve } from "node:path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "@magik_io/maskit-core",
        "@magik_io/maskit-dom",
        "solid-js",
        "solid-js/web",
        "solid-js/store",
      ],
    },
  },
});
