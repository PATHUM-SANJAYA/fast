import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    manifest: true,
    modulePreload: {
      polyfill: true
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: "[name].[hash].js",
        chunkFileNames: "[name].[hash].js",
        assetFileNames: "[name].[hash].[ext]"
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true
  },
});
