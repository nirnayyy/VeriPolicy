import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Standard Vite SPA configuration (no TanStack Start / nitro / SSR).
//
// - tanstackRouter: generates src/routeTree.gen.ts from src/routes/*.tsx
//   (file-based routing, code-split per route).
// - react: the standard Vite React Fast Refresh plugin.
// - tailwindcss: Tailwind v4 Vite plugin (replaces the old PostCSS chain).
// - resolve.tsconfigPaths: resolves the "@" -> "./src" alias from tsconfig.json.
//
// The /api directory is handled by Vercel at deploy time as serverless
// functions and is excluded from the client bundle below.
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  cacheDir: ".vite-cache",
  // Don't try to bundle the serverless functions into the client.
  server: {
    fs: { strict: false },
  },
});
