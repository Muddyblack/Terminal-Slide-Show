import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { frontendConfig } from './frontend.config.js';

// Get current file's directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from the same directory as config.js
dotenv.config({ path: join(__dirname, '.env') });

export const config = {
  ...frontendConfig,
  info: {
    location: process.env.LOCATION || 'LOCATION',
  },
  apiKeys: {
    NASA_API_KEY: process.env.NASA_API_KEY
  },
  google: {
    useServiceAccount: true, // Set to false to use public folder access
    serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT ,
    apiKey: process.env.GOOGLE_API_KEY,
    folderId: process.env.GOOGLE_FOLDER_ID,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'], // Google Drive API scopes
    apiVersion: 'v3' // Google Drive API version
  },
  sync: {
    interval: 1000, // Default sync interval in milliseconds
    retryAttempts: 3, // Number of retry attempts for failed syncs
},
  kiosk: {
    targetUrl: process.env.KIOSK_URL, // Target URL for the kiosk
    user: process.env.KIOSK_USER || 'kiosk',                         
    password: process.env.KIOSK_PASSWORD,
  },
  backendPowerSaving: {
    timeout: 5 * 60 * 1000 // standard 5 minutes in milliseconds
  },
  paths: {
    downloadPath: '../downloads', // Path to download files from Google Drive
  },
  logging: {
    level: 'debug', // Logging level (debug, info, warn, error)
    format: 'json' // Logging format (text, json)
  },
  backend: {
    port: process.env.BACKEND_PORT || 3000,
    host: process.env.BACKEND_HOST || '127.0.0.1'
  },
  frontend: {
    port: process.env.FRONTEND_PORT || 5173,
    host: process.env.FRONTEND_HOST || '127.0.0.1'
  },
};

export default config;