import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

// Update the import path to use the config from the root directory
import { config } from '../config/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [react()],
  server: {
    host: isDevelopment ? 'localhost' : '0.0.0.0',
    port: config.frontend.port,
    strictPort: false,
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: isDevelopment
          ? `http://localhost:${config.backend.port}`
          : `http://backend:${config.backend.port}`,
        changeOrigin: true,
      },
      '/ws': {
        target: isDevelopment
          ? `ws://localhost:${config.backend.port}`
          : `ws://backend:${config.backend.port}`,
        ws: true,
        changeOrigin: true,
      },
      '/media': {
        target: isDevelopment
          ? `http://localhost:${config.backend.port}`
          : `http://backend:${config.backend.port}`,
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, '../config')
    },
  },
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true
  }
});