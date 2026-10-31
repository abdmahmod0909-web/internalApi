import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Crucial for Electron: forces Vite to use relative asset paths (./assets/...) 
  // so the packaged app can load assets offline via file:// or local server.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@internalapi/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 3000,
    host: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001', // Use 127.0.0.1 to prevent Windows IPv6 DNS lag
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});