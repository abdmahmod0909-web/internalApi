import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function generateVersionPlugin() {
  return {
    name: 'generate-version-plugin',
    closeBundle() {
      try {
        const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
        const distDir = path.resolve(__dirname, 'dist');
        if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
        fs.writeFileSync(
          path.join(distDir, 'version.json'),
          JSON.stringify(
            {
              version: rootPkg.version || '1.0.0',
              buildTime: new Date().toISOString(),
            },
            null,
            2
          ),
          'utf8'
        );
        console.log('✓ Generated dist/version.json for OTA hot push');
      } catch (err) {
        console.error('Failed to generate version.json:', err);
      }
    },
  };
}

export default defineConfig({
  // Crucial for Electron: forces Vite to use relative asset paths (./assets/...) 
  // so the packaged app can load assets offline via file:// or local server.
  base: './',
  plugins: [react(), generateVersionPlugin()],
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
        target: 'http://127.0.0.1:39281', // Dedicated port to prevent conflicts and Windows IPv6 DNS lag
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:39281',
        changeOrigin: true,
      },
    },
  },
});