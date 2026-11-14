import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';



const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../server/config/.env') });
const rootPackage = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
const isDemo = process.env.VITE_DEMO_MODE === 'true';
const isDevelopment = process.env.NODE_ENV !== 'production';

/** The demo has no backend that serves /config.js, so its settings go into the page instead */
const demoConfig = () => ({
  name: 'demo-config',
  transformIndexHtml: (html) => isDemo
    ? html.replace(
        '<script src="/config.js"></script>',
        `<script>window.__SLIDESHOW_CONFIG__ = ${JSON.stringify({
          info: { location: 'Demo City' },
          locale: { language: 'en' },
          schedule: { enabled: false },
        })};</script>`
      )
    : html,
});

export default defineConfig({
  // GitHub Pages serves the site below /<repo>/ (VITE_BASE_PATH); everywhere else it is the root
  base: process.env.VITE_BASE_PATH || '/',
  define: { __APP_VERSION__: JSON.stringify(rootPackage.version) },
  plugins: [react(), demoConfig()],
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
      '/config.js': {
        target: isDevelopment
          ? `http://localhost:${process.env.BACKEND_PORT}`
          : `http://backend:${process.env.BACKEND_PORT}`,
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
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.FRONTEND_PORT),
    allowedHosts: [process.env.FRONTEND_HOST]
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