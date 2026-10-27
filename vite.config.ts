import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFile } from "node:fs/promises";
import path from "node:path";
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: "local-oslc-editor-source",
    configureServer(server) {
      server.middlewares.use("/__editor/oslc-source", async (_req, res) => {
        try { const html = await readFile(path.resolve(server.config.root, "oslc-whole-site.html"), "utf8"); res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(html); }
        catch { res.statusCode = 404; res.end("OSLC HTML file not found. Use Import to choose your HTML file."); }
      });
    },
  }],
  optimizeDeps: { entries: ["index.html"] },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    watch: { ignored: ["**/.local/**"] },
    proxy: {
      "/api": "http://127.0.0.1:3001",
      "/uploads": "http://127.0.0.1:3001",
      "/sitemap.xml": "http://127.0.0.1:3001",
      "/robots.txt": "http://127.0.0.1:3001",
    },
  },
});
