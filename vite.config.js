import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Fixes the node:fs warning by aliasing to a browser-safe module
      'node:fs/promises': 'path-browserify',
    },
  },
  build: {
    minify: 'esbuild',
    sourcemap: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Dynamic manualChunks function handles all node_modules automatically
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  define: {
    // Ensures 'global' is defined for libraries like Fireproof
    global: 'globalThis',
  },
  server: {
    port: 3000,
  },
});