// vite.config.ts
import { defineConfig } from "file:///C:/Users/NOVO%20USUARIO/.gemini/antigravity/lojafy/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/NOVO%20USUARIO/.gemini/antigravity/lojafy/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/NOVO%20USUARIO/.gemini/antigravity/lojafy/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///C:/Users/NOVO%20USUARIO/.gemini/antigravity/lojafy/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\NOVO USUARIO\\.gemini\\antigravity\\lojafy";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
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
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        shortcuts: [
          {
            name: "Meus Pedidos",
            short_name: "Pedidos",
            url: "/reseller/orders",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
          },
          {
            name: "Meu Cat\xE1logo",
            short_name: "Cat\xE1logo",
            url: "/reseller/catalog",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "/index.html",
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
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
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
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"]
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxOT1ZPIFVTVUFSSU9cXFxcLmdlbWluaVxcXFxhbnRpZ3Jhdml0eVxcXFxsb2phZnlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXE5PVk8gVVNVQVJJT1xcXFwuZ2VtaW5pXFxcXGFudGlncmF2aXR5XFxcXGxvamFmeVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvTk9WTyUyMFVTVUFSSU8vLmdlbWluaS9hbnRpZ3Jhdml0eS9sb2phZnkvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKSxcclxuICAgIFZpdGVQV0Eoe1xyXG4gICAgICByZWdpc3RlclR5cGU6IFwiYXV0b1VwZGF0ZVwiLFxyXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbXCJmYXZpY29uLmljb1wiLCBcInJvYm90cy50eHRcIl0sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgbmFtZTogXCJMb2phZnkgLSBTdWEgTG9qYSBEZXNjb21wbGljYWRhXCIsXHJcbiAgICAgICAgc2hvcnRfbmFtZTogXCJMb2phZnlcIixcclxuICAgICAgICBkZXNjcmlwdGlvbjogXCJQbGF0YWZvcm1hIGRlIHJldmVuZGEgZGUgcHJvZHV0b3NcIixcclxuICAgICAgICB0aGVtZV9jb2xvcjogXCIjMjU2M0VCXCIsXHJcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogXCIjZmZmZmZmXCIsXHJcbiAgICAgICAgZGlzcGxheTogXCJzdGFuZGFsb25lXCIsXHJcbiAgICAgICAgb3JpZW50YXRpb246IFwicG9ydHJhaXRcIixcclxuICAgICAgICBzY29wZTogXCIvXCIsXHJcbiAgICAgICAgc3RhcnRfdXJsOiBcIi9cIixcclxuICAgICAgICBjYXRlZ29yaWVzOiBbXCJzaG9wcGluZ1wiLCBcImJ1c2luZXNzXCJdLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogXCIvaWNvbnMvaWNvbi0xOTIucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjE5MngxOTJcIixcclxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogXCIvaWNvbnMvaWNvbi01MTIucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjUxMng1MTJcIixcclxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogXCIvaWNvbnMvaWNvbi01MTItbWFza2FibGUucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjUxMng1MTJcIixcclxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcclxuICAgICAgICAgICAgcHVycG9zZTogXCJtYXNrYWJsZVwiLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHNob3J0Y3V0czogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBuYW1lOiBcIk1ldXMgUGVkaWRvc1wiLFxyXG4gICAgICAgICAgICBzaG9ydF9uYW1lOiBcIlBlZGlkb3NcIixcclxuICAgICAgICAgICAgdXJsOiBcIi9yZXNlbGxlci9vcmRlcnNcIixcclxuICAgICAgICAgICAgaWNvbnM6IFt7IHNyYzogXCIvaWNvbnMvaWNvbi0xOTIucG5nXCIsIHNpemVzOiBcIjE5MngxOTJcIiB9XSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiTWV1IENhdFx1MDBFMWxvZ29cIixcclxuICAgICAgICAgICAgc2hvcnRfbmFtZTogXCJDYXRcdTAwRTFsb2dvXCIsXHJcbiAgICAgICAgICAgIHVybDogXCIvcmVzZWxsZXIvY2F0YWxvZ1wiLFxyXG4gICAgICAgICAgICBpY29uczogW3sgc3JjOiBcIi9pY29ucy9pY29uLTE5Mi5wbmdcIiwgc2l6ZXM6IFwiMTkyeDE5MlwiIH1dLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXHJcbiAgICAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxyXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgbWF4aW11bUZpbGVTaXplVG9DYWNoZUluQnl0ZXM6IDEwICogMTAyNCAqIDEwMjQsXHJcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbXCIqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3b2ZmMn1cIl0sXHJcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiBcIkNhY2hlRmlyc3RcIixcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogXCJnb29nbGUtZm9udHMtY2FjaGVcIixcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMCxcclxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXNlczogWzAsIDIwMF0sXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgXCJ2ZW5kb3ItcmVhY3RcIjogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC1yb3V0ZXItZG9tXCJdLFxyXG4gICAgICAgICAgXCJ2ZW5kb3ItcXVlcnlcIjogW1wiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCJdLFxyXG4gICAgICAgICAgXCJ2ZW5kb3Itc3VwYWJhc2VcIjogW1wiQHN1cGFiYXNlL3N1cGFiYXNlLWpzXCJdLFxyXG4gICAgICAgICAgXCJ2ZW5kb3ItdWlcIjogW1wiQHJhZGl4LXVpL3JlYWN0LWRpYWxvZ1wiLCBcIkByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51XCIsIFwiQHJhZGl4LXVpL3JlYWN0LXNlbGVjdFwiLCBcIkByYWRpeC11aS9yZWFjdC10YWJzXCIsIFwiQHJhZGl4LXVpL3JlYWN0LXRvb2x0aXBcIl0sXHJcbiAgICAgICAgICBcInZlbmRvci1jaGFydHNcIjogW1wicmVjaGFydHNcIl0sXHJcbiAgICAgICAgICBcInZlbmRvci1kbmRcIjogW1wiQGRuZC1raXQvY29yZVwiLCBcIkBkbmQta2l0L3NvcnRhYmxlXCIsIFwiQGRuZC1raXQvbW9kaWZpZXJzXCIsIFwiQGRuZC1raXQvdXRpbGl0aWVzXCJdLFxyXG4gICAgICAgICAgXCJ2ZW5kb3ItZm9ybXNcIjogW1wicmVhY3QtaG9vay1mb3JtXCIsIFwiQGhvb2tmb3JtL3Jlc29sdmVyc1wiLCBcInpvZFwiXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBZ1YsU0FBUyxvQkFBb0I7QUFDN1csT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUNoQyxTQUFTLGVBQWU7QUFKeEIsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUyxpQkFBaUIsZ0JBQWdCO0FBQUEsSUFDMUMsUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFB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
