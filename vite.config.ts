import { defineConfig, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import solid from "vite-plugin-solid";
import path from "path";
import { readdirSync, readFileSync } from "fs";

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
const FFMPEG_CORE_DIR = path.resolve(__dirname, "node_modules/@ffmpeg/core/dist/umd");

const FFMPEG_WORKER_SRC = path.resolve(__dirname, "src/ffmpeg-worker.js");

/** Serve @ffmpeg/core WASM files + our custom worker during dev at the same path used in production. */
function serveFFmpegCore(): Plugin {
  const FFMPEG_BASE = ASSET_WEB_PATH + "/ffmpeg/";
  const CORE_FILES: Record<string, string> = {
    "ffmpeg-core.js":   "text/javascript",
    "ffmpeg-core.wasm": "application/wasm",
  };
  return {
    name: "serve-ffmpeg-core",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(FFMPEG_BASE)) return next();
        const file = req.url.slice(FFMPEG_BASE.length).split("?")[0];
        let filePath: string;
        let contentType: string;
        if (file === "ffmpeg-worker.js") {
          filePath = FFMPEG_WORKER_SRC;
          contentType = "text/javascript";
        } else if (CORE_FILES[file]) {
          filePath = path.join(FFMPEG_CORE_DIR, file);
          contentType = CORE_FILES[file];
        } else {
          return next();
        }
        const data = readFileSync(filePath);
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "no-store");
        res.end(data);
      });
    },
  };
}
const OUT_DIR = path.resolve(
  __dirname,
  "../hz-ddev/core/extend/theme/utsukta-themes/solidified/assets",
);

export default defineConfig({
  plugins: [
    publicDirListing(),
    serveFFmpegCore(),
    solid(),
    viteStaticCopy({
      targets: [
        { src: "src/docs", dest: "../" },
        { src: "src/Api", dest: "../" },
        { src: "src/img", dest: "../" },
        { src: "src/mod", dest: "../" },
        { src: "src/php", dest: "../" },
        { src: "README.md", dest: "../" },
        { src: `${FFMPEG_CORE_DIR}/ffmpeg-core.js`,   dest: "ffmpeg" },
        { src: `${FFMPEG_CORE_DIR}/ffmpeg-core.wasm`, dest: "ffmpeg" },
        { src: FFMPEG_WORKER_SRC,                     dest: "ffmpeg" },
      ],
    }),
  ],
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    cssCodeSplit: true,
    // .vite/manifest.json maps entry → hashed filenames; read by php/manifest.php
    manifest: true,
    // removed watch: {} — use vite build --watch from CLI
    rollupOptions: {
      output: {
        entryFileNames: "app-[hash].js",
        chunkFileNames: "app-[name]-[hash].js",
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "app-[hash].css" : "[name][extname]",
        manualChunks(id) {
          // React + Filerobot image editor land in a single vendor chunk so
          // the browser can cache them across deploys independently of app code.
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-filerobot-image-editor/") ||
            id.includes("node_modules/filerobot-image-editor/")
          ) {
            return "vendor-image-editor";
          }
          if (id.includes("node_modules/plyr/")) return "vendor-plyr";
          if (id.includes("node_modules/dompurify/")) return "vendor-dompurify";
        },
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
      "/wall_upload": {
        target: "https://hz-ddev.ddev.site",
        changeOrigin: true,
        secure: false,
      },
      "/wall_attach": {
        target: "https://hz-ddev.ddev.site",
        changeOrigin: true,
        secure: false,
      },
      "/item": {
        target: "https://hz-ddev.ddev.site",
        changeOrigin: true,
        secure: false,
      },
      "/follow": {
        target: "https://hz-ddev.ddev.site",
        changeOrigin: true,
        secure: false,
      },
      "/subthread": {
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
