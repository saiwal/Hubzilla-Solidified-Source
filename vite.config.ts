import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "path";

export default defineConfig({
  plugins: [solid()],
  build: {
    // Output directly to your Hubzilla theme asset folder
    outDir: path.resolve(
      __dirname,
      "../hz-ddev/core/extend/theme/utsukta-themes/solidified/assets",
    ),
    emptyOutDir: true,

    rollupOptions: {
      output: {
        // Fixed filenames — no more hashes
        entryFileNames: "app.js",
        chunkFileNames: "app-[name].js",
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "app.css" : "[name][extname]",
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://hz-ddev.ddev.site",
        changeOrigin: true,
        secure: false,
      },
      "/perfstats": {
        target: "https://hz-ddev.ddev.site",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  base: "./",
});
