import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // KEY CHANGE: "manifest: false" means "Don't overwrite my public/manifest.json"
      // The plugin will essentially just build the Service Worker for you.
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
