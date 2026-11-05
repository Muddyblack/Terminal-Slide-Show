import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { frontendConfig } from './frontend.config.js';

// Get current file's directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from the same directory as config.js
dotenv.config({ path: join(__dirname, '.env') });

/**
 * Optional config/occasions.json: switch occasions off, change their days and texts, or add your own.
 * See occasions.example.json. Without the file every occasion keeps its default.
 */
function readOccasionsFile() {
  const file = join(__dirname, 'occasions.json');
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn(`config/occasions.json ignored, it is not valid JSON: ${err.message}`);
    return {};
  }
}

const occasionsFile = readOccasionsFile();
const envList = (value) => (value || '').split(',').map((v) => v.trim()).filter(Boolean);

export const config = {
  ...frontendConfig,
  info: {
    location: process.env.LOCATION || 'LOCATION',
    // ISO country code; Germany-only holidays are shown when this is DE
    country: process.env.COUNTRY || 'DE',
  },
  occasions: {
    // On by default. OCCASIONS=off (or "enabled": false in occasions.json) turns them all off.
    enabled: (process.env.OCCASIONS || 'on').toLowerCase() !== 'off' && occasionsFile.enabled !== false,
    // Ids to switch off: OCCASIONS_DISABLED=halloween,valentine and/or "disabled" in occasions.json
    disabled: [...envList(process.env.OCCASIONS_DISABLED), ...(Array.isArray(occasionsFile.disabled) ? occasionsFile.disabled : [])],
    // Changes to built-in occasions, by id: { "newyear": { "after": 6 } }
    override: occasionsFile.override ?? {},
    // Own occasions: [{ "id": "sommerfest", "date": "07-10", "title": "Sommerfest" }]
    custom: Array.isArray(occasionsFile.custom) ? occasionsFile.custom : [],
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
    downloadPath: '../downloads', // Path to download files from Google Drive
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

export default config;