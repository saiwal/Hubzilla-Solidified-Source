import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import solid from "vite-plugin-solid";
import path from "path";

const ASSET_WEB_PATH = "/view/theme/solidified/assets";
const OUT_DIR = path.resolve(
  __dirname,
  "../hz-ddev/core/extend/theme/utsukta-themes/solidified/assets",
);

export default defineConfig({
  plugins: [
    solid(),
    viteStaticCopy({
      targets: [{ src: "src/docs", dest: "../" },
      { src: "src/Api", dest: "../" }],
    }),
  ],
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    // removed watch: {} — use vite build --watch from CLI
    rollupOptions: {
      output: {
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
      "/cloud": {
        target: "https://hz-ddev.ddev.site",
        changeOrigin: true,
        secure: false,
      },
      "/photo": {
        target: "https://hz-ddev.ddev.site",
        changeOrigin: true,
        secure: false,
      },
      "/attach": {
        target: "https://hz-ddev.ddev.site",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  base: ASSET_WEB_PATH + "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
