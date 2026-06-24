import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite config tuned for Tauri: a fixed dev port the Rust side points `devUrl`
// at, and quiet output so the Tauri CLI's logs stay readable.
// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Prevent Vite from clearing the screen so Rust compile errors stay visible.
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    // Tauri serves over a custom protocol in production; HMR needs an
    // explicit host/port in dev.
    host: "127.0.0.1",
    watch: {
      // Don't watch the Rust source tree — Tauri handles that itself.
      ignored: ["**/src-tauri/**"],
    },
  },

  // Only env vars prefixed VITE_ or TAURI_ are exposed to the frontend.
  envPrefix: ["VITE_", "TAURI_"],

  build: {
    // Tauri's webview targets are modern; align the build target with them.
    target: "es2022",
    sourcemap: true,
  },
});
