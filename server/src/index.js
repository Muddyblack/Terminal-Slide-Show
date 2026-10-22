import { config, publicConfig } from '../config/config.js';


import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { GoogleDriveService } from './services/googleDriveService.js';
import { SlideshowManager } from './services/slideshowManager.js';
import { Logger } from './utils/logger.js';
import { cached } from './utils/ttlCache.js';
import { createServer } from 'http';
import { webSocketManager } from './services/webSocketManager.js';



/**
 * Express application instance
 * @type {import('express').Express}
 */
const app = express();
const server = createServer(app);
const port = config.backend.port;
const host = config.backend.host;
const logger = new Logger('Main');




// Initialize services
const googleDriveService = new GoogleDriveService();
const slideshowManager = new SlideshowManager();

// Make slideshowManager globally accessible
global.slideshowManager = slideshowManager;
webSocketManager.initialize(server);
global.webSocketManager = webSocketManager;


/**
 * Initializes all backend services
 * @async
 * @throws {Error} If services fail to initialize
 */
async function initialize() {
    try {
        // Initialize core services first
        await slideshowManager.initialize();
        await googleDriveService.initialize();

        // Start services
        await googleDriveService.startSync();


        logger.info('All services initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

// Runtime frontend config
/* ------------------------------------ */

/**
 * Per-device settings for the browser, loaded before the app starts.
 * Never cached: a changed schedule must show up on the next page load.
 */
app.get('/config.js', (req, res) => {
    res.type('application/javascript');
    res.set('Cache-Control', 'no-cache');
    res.send(`window.__SLIDESHOW_CONFIG__ = ${JSON.stringify(publicConfig)};`);
});

// Static File Serving
/* ------------------------------------ */

/**
 * Static file middleware configuration
 * Serves files in order:
 * 1. Public files
 * 2. Client dist folder
 * 3. Media files with caching
 */

const staticOptions = {
    maxAge: '1y',
    etag: true
};

app.use(express.static(config.paths.clientDist, staticOptions));
// Media files can be replaced under the same name, so always revalidate.
// express.static generates ETag/Last-Modified, which makes revalidation cheap (304).
app.use('/media', express.static(path.resolve(process.cwd(), config.paths.downloadPath), {
    etag: true,
    lastModified: true,
    maxAge: 0,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache')
}));

// Security Middleware
/* ------------------------------------ */

/**
 * Security headers middleware
 */
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});


// Core API Routes
/* ------------------------------------ */

app.use('/api', (req, res, next) => {
    if (!req.headers['x-client-id']) {
        // Generate a random client ID if not provided
        req.clientId = Math.random().toString(36).substring(7);
        res.setHeader('X-Client-Id', req.clientId);
    } else {
        req.clientId = req.headers['x-client-id'];
    }
    next();
});


/**
 * @route GET /api/all-media
 * @description Get all available media files
 */
app.get('/api/all-media', (req, res) => {
    logger.debug('Getting all media files');
    const media = slideshowManager.getAllMedia();
    res.json(media || []);
});

app.get('/api/server-status', (req, res) => {
    logger.debug('Checking server status');
    try {
        const isGoogleDriveInitialized = googleDriveService.isInitialized();
        const isSlideshowManagerInitialized = slideshowManager.isInitialized();

        if (isGoogleDriveInitialized && isSlideshowManagerInitialized) {
            res.status(200).send('OK');
        } else {
            res.status(503).send('Service Unavailable');
        }
    } catch (error) {
        logger.error('Error checking server status:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Local Data API Routes
/* ------------------------------------ */

/**
 * @route GET /api/quotes
 * @description Get random quote from local database
 */
app.get('/api/quotes', async (req, res) => {
    logger.debug('Fetching random quote');
    try {
        const quotesData = await fs.readFile(path.join(config.paths.dataPath, 'quotes.json'), 'utf8');
        const quotes = JSON.parse(quotesData).quotes;
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        res.json(randomQuote);
    } catch (error) {
        logger.error('Failed to fetch quote:', error);
        res.status(500).json({ error: 'Failed to fetch quote' });
    }
});

/**
 * @route GET /api/facts
 * @description Get random facts from local database
 */
app.get('/api/facts', async (req, res) => {
    logger.debug('Fetching random fact');
    try {
        const factsData = await fs.readFile(path.join(config.paths.dataPath, 'facts.json'), 'utf8');
        const facts = JSON.parse(factsData);
        const randomFact = facts[Math.floor(Math.random() * facts.length)];
        res.json(randomFact);
    } catch (error) {
        logger.error('Failed to fetch fact:', error);
        res.status(500).json({ error: 'Failed to fetch fact' });
    }
});

/**
 * @route GET /api/greetings
 * @description Get random Greeting messages from local database
 */
app.get('/api/greetings', async (req, res) => {
    logger.debug('Fetching greetings');
    try {
        const greetingsData = await fs.readFile(path.join(config.paths.dataPath, 'greetings.json'), 'utf8');
        const greetings = JSON.parse(greetingsData);
        res.json(greetings);
    } catch (error) {
        logger.error('Failed to fetch greetings:', error);
        res.status(500).json({ error: 'Failed to fetch greetings' });
    }
});



// External API Integration Routes
/* ------------------------------------ */

/**
 * @route GET /api/nasa-apod
 * @description Fetch NASA Astronomy Picture of the Day
 * @throws {Error} If NASA API request fails
 */
app.get('/api/nasa-apod', async (req, res) => {
    logger.debug('Fetching NASA APOD');
    if (!config.apiKeys.NASA_API_KEY) {
        return res.status(503).json({ error: 'NASA_API_KEY is not configured' });
    }

    try {
        // The picture changes once a day; one upstream request per hour is plenty
        const data = await cached('nasa-apod', 60 * 60 * 1000, async () => {
            const nasaResponse = await fetch(
                `https://api.nasa.gov/planetary/apod?api_key=${config.apiKeys.NASA_API_KEY}`
            );
            if (!nasaResponse.ok) throw new Error(`NASA responded with ${nasaResponse.status}`);
            return nasaResponse.json();
        });

        res.set('Cache-Control', 'public, max-age=3600');
        res.json(data);
    } catch (error) {
        logger.error('Failed to fetch NASA APOD:', error);
        res.status(500).json({ error: 'Failed to fetch NASA image' });
    }
});

/**
 * @route GET /api/weather
 * @description Fetch weather data for location
 * @param {string} req.query.location - Location to get weather for
 */
app.get('/api/weather', async (req, res) => {
    const location = req.query.location || config.info.location;
    logger.debug(`Fetching weather for location: ${location}`);

    try {
        const enrichedResponse = await cached(`weather:${location}`, 10 * 60 * 1000, () => fetchWeather(location));
        if (!enrichedResponse) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json(enrichedResponse);
    } catch (error) {
        logger.error('Failed to fetch weather:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

/**
 * Looks up a location and its current weather
 * @param {string} location
 * @returns {Promise<Object|null>} Weather data, or null when the location is unknown
 */
async function fetchWeather(location) {
    const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    );
    const geoData = await geoResponse.json();

    if (!geoData.results?.[0]) {
        return null;
    }

    const { latitude, longitude, timezone } = geoData.results[0];

    const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${latitude}&longitude=${longitude}&` +
        `current=temperature_2m,is_day,rain,showers,snowfall,` +
        `weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,` +
        `wind_gusts_10m&timezone=${encodeURIComponent(timezone)}&forecast_days=1`
    );

    const weatherData = await weatherResponse.json();

    const enrichedResponse = {
        ...weatherData,
        location: {
            name: geoData.results[0].name,
            timezone: timezone,
            country: geoData.results[0].country,
            latitude,
            longitude
        },
        current_weather: {
            temperature: weatherData.current.temperature_2m,
            weathercode: weatherData.current.weather_code,
            is_day: weatherData.current.is_day,
            time: weatherData.current.time,
            windspeed: weatherData.current.wind_speed_10m,
            winddirection: weatherData.current.wind_direction_10m,
            wind_gusts: weatherData.current.wind_gusts_10m,
            cloud_cover: weatherData.current.cloud_cover,
            rain: weatherData.current.rain,
            showers: weatherData.current.showers,
            snowfall: weatherData.current.snowfall
        }
    };

    return enrichedResponse;
}

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(config.paths.clientDist, 'index.html'), (err) => {
        if (err) res.sendStatus(404); // Frontend is served elsewhere (e.g. nginx)
    });
});

// Server Lifecycle
/* ------------------------------------ */

/**
 * Start server and initialize services
 */
initialize().then(() => {
    server.listen(port, host, () => {
        logger.info(`Backend running at http://${host}:${port}/`);
    });
}).catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
});

// Handle shutdown (SIGTERM is what `docker stop` and systemd send)
let shuttingDown = false;
const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down...`);
    googleDriveService.stop();
    slideshowManager.stop();
    webSocketManager.stop();

    // Stop accepting connections; force exit if something keeps the process alive
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));