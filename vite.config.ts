import { defineConfig, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import solid from "vite-plugin-solid";
import path from "path";
import { readdirSync } from "fs";

/** Virtual module `virtual:public-listing/<folder>` → sorted filename array. */
function publicDirListing(): Plugin {
  const PREFIX = "virtual:public-listing/";
  const RESOLVED = "\0" + PREFIX;
  return {
    name: "public-dir-listing",
    resolveId(id) {
      if (id.startsWith(PREFIX)) return RESOLVED + id.slice(PREFIX.length);
    },
    load(id) {
      if (!id.startsWith(RESOLVED)) return;
      const folder = id.slice(RESOLVED.length);
      const dir = path.join(__dirname, "public", folder);
      const files = readdirSync(dir)
        .filter((f) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f))
        .sort();
      return `export default ${JSON.stringify(files)}`;
    },
  };
}

const ASSET_WEB_PATH = "/view/theme/solidified/assets";
const OUT_DIR = path.resolve(
  __dirname,
  "../hz-ddev/core/extend/theme/utsukta-themes/solidified/assets",
);

export default defineConfig({
  plugins: [
    publicDirListing(),
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
