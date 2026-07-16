import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },

  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,

    // HMR
    hmr: process.env.DISABLE_HMR !== "true",

    // Disable file watching when requested
    watch: process.env.DISABLE_HMR === "true" ? null : {},
  },

  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
  },
});