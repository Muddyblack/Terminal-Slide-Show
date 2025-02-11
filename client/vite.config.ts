import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';



const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../server/config/.env') });
const isDevelopment = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [react()],
  server: {
    host: isDevelopment ? 'localhost' : '0.0.0.0',
    port: Number(process.env.FRONTEND_PORT),
    strictPort: false,
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: isDevelopment
          ? `http://localhost:${process.env.BACKEND_PORT}`
          : `http://backend:${process.env.BACKEND_PORT}`,
        changeOrigin: true,
      },
      '/ws': {
        target: isDevelopment
          ? `ws://localhost:${process.env.BACKEND_PORT}`
          : `ws://backend:${process.env.BACKEND_PORT}`,
        ws: true,
        changeOrigin: true,
      },
      '/media': {
        target: isDevelopment
          ? `http://localhost:${process.env.BACKEND_PORT}`
          : `http://backend:${process.env.BACKEND_PORT}`,
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, '../server/config')
    },
  },
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true
  }
});