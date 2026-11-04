import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import { execSync } from "child_process";

function getGitCommitInfo() {
  const env = process.env;
  let hash = env.VERCEL_GIT_COMMIT_SHA || "";
  let message = env.VERCEL_GIT_COMMIT_MESSAGE || "";
  let author = env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN || env.VERCEL_GIT_COMMIT_AUTHOR_NAME || "";

  if (!hash || !message || !author) {
    try {
      if (!hash) {
        hash = execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      }
      if (!message) {
        message = execSync("git log -1 --pretty=format:%s", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      }
      if (!author) {
        author = execSync("git log -1 --pretty=format:%an", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      }
    } catch {
      // Git command might fail in shallow clone or if git not in PATH
    }
  }

  const shortHash = hash ? hash.slice(0, 7) : "latest";
  const timestamp = Date.now();

  return {
    hash: hash || `build-${timestamp}`,
    shortHash,
    message: message || "Atualização do sistema",
    author: author || "estevaodutra",
    timestamp,
  };
}

function versionTrackerPlugin(versionInfo: ReturnType<typeof getGitCommitInfo>) {
  return {
    name: "version-tracker",
    buildStart() {
      try {
        const publicDir = path.resolve(__dirname, "public");
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(
          path.resolve(publicDir, "version.json"),
          JSON.stringify(versionInfo, null, 2)
        );
      } catch (err) {
        console.warn("Failed to write public/version.json", err);
      }
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify(versionInfo, null, 2),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const appVersionInfo = getGitCommitInfo();

  return {
    define: {
      __APP_VERSION_INFO__: JSON.stringify(appVersionInfo),
    },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    versionTrackerPlugin(appVersionInfo),
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      selfDestroying: true,
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.png", "robots.txt"],
      manifest: {
        name: "Lojafy - Sua Loja Descomplicada",
        short_name: "Lojafy",
        description: "Plataforma de revenda de produtos",
        theme_color: "#2563EB",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["shopping", "business"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Meus Pedidos",
            short_name: "Pedidos",
            url: "/reseller/orders",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Meu Catálogo",
            short_name: "Catálogo",
            url: "/reseller/catalog",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select", "@radix-ui/react-tabs", "@radix-ui/react-tooltip"],
          "vendor-charts": ["recharts"],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/modifiers", "@dnd-kit/utilities"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
