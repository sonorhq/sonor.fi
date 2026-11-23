import { defineConfig } from "vitest/config";

// Stable file names: workers/api serves this build from an exact-path allowlist.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: "main.js",
        chunkFileNames: "main-[name].js",
        assetFileNames: "main[extname]",
      },
    },
  },
  test: { include: ["test/**/*.test.ts"] },
});
