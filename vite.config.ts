import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Compute base path from APP_BASE_PATH environment variable
// In production: reads from APP_BASE_PATH (e.g., "/inboxai" -> "/inboxai/")
// In development: always use "/" for root
function getBasePath(): string {
  if (process.env.NODE_ENV !== 'production') {
    return '/';
  }
  const basePath = process.env.APP_BASE_PATH || '';
  if (!basePath) {
    return '/';
  }
  // Normalize: ensure starts with / and ends with /
  const normalized = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

export default defineConfig({
  base: getBasePath(),
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
