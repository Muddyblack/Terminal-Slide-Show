import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { deepMerge } from '../src/utils/deepMerge.js';

import { frontendConfig } from './frontend.config.js';

// Get current file's directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from the same directory as config.js
dotenv.config({ path: join(__dirname, '.env') });

/**
 * Optional JSON file with per-device settings, merged over the defaults below.
 * Lets one build serve many devices (schedule, location, display behaviour, ...).
 */
function loadOverrides() {
  const file = process.env.SLIDESHOW_CONFIG;
  if (!file) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot load SLIDESHOW_CONFIG (${file}): ${error.message}`);
  }
}

const defaults = {
  ...frontendConfig,
  info: {
    location: process.env.LOCATION || frontendConfig.info.location,
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
  display: {
    // What the display does outside operating hours (terminal mode):
    // 'black' shows a black screen, 'power' also cuts the HDMI output
    offMode: process.env.DISPLAY_OFF_MODE === 'power' ? 'power' : 'black',
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
    // Resolved against the working directory, so absolute paths work too
    downloadPath: process.env.DOWNLOAD_PATH || '../downloads', // Where Google Drive files are stored
    dataPath: process.env.DATA_PATH || join(__dirname, '../data'), // Quotes, facts and greetings
    clientDist: process.env.CLIENT_DIST || join(__dirname, '../../client/dist'), // Built frontend, if served by this backend
  },
  logging: {
    level: process.env.LOG_LEVEL || 'warn', // Logging level (debug, info, warn, error)
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

export const config = deepMerge(defaults, loadOverrides());

/**
 * The part of the config the browser needs, served at /config.js
 * so it can differ per device without rebuilding the frontend.
 */
export const publicConfig = Object.fromEntries(
  Object.keys(frontendConfig).map((key) => [key, config[key]])
);

export default config;