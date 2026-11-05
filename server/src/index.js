import { config } from '../config/config.js';


import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { GoogleDriveService } from './services/googleDriveService.js';
import { SlideshowManager } from './services/slideshowManager.js';
import { Logger } from './utils/logger.js';
import { cached } from './utils/ttlCache.js';
import { buildQueue } from './services/contentService.js';
import { getOccasion } from './utils/occasions.js';
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

app.use(express.static(path.join(process.cwd(), 'client', 'public'), staticOptions));
app.use(express.static(path.join(process.cwd(), 'dist'), staticOptions));
// Media files can be replaced under the same name, so always revalidate.
// express.static generates ETag/Last-Modified, which makes revalidation cheap (304).
app.use('/media', express.static(path.join(process.cwd(), config.paths.downloadPath), {
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
        const quotesData = await fs.readFile(path.join(process.cwd(), 'data', 'quotes.json'), 'utf8');
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
        const factsData = await fs.readFile(path.join(process.cwd(), 'data', 'facts.json'), 'utf8');
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
        const greetingsData = await fs.readFile(path.join(process.cwd(), 'data', 'greetings.json'), 'utf8');
        const greetings = JSON.parse(greetingsData);
        res.json(greetings);
    } catch (error) {
        logger.error('Failed to fetch greetings:', error);
        res.status(500).json({ error: 'Failed to fetch greetings' });
    }
});



/**
 * @route GET /api/content
 * @description Shuffled queue of rotating texts (city facts, on this day, sun times, tips, ...) plus quotes.
 * Feeds are fetched here and cached, so a failing source is skipped and the local pool still works.
 * @param {string} [req.query.location]
 */
app.get('/api/content', async (req, res) => {
    const location = String(req.query.location || config.info.location);
    try {
        const body = await cached(`content:${location}`, 10 * 60 * 1000, async () => {
            let place = null;
            try {
                const w = await cached(`weather:${location}`, 10 * 60 * 1000, () => fetchWeather(location));
                if (w) {
                    place = { ...w.location, current: w.current_weather };
                }
            } catch (error) {
                logger.warn('Content without weather:', error.message);
            }
            const items = await buildQueue({ location, date: new Date(), place, fetchFn: fetch });
            const quotesData = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'quotes.json'), 'utf8'));
            return { items, quotes: [...quotesData.quotes].sort(() => Math.random() - 0.5).slice(0, 20) };
        });
        res.json(body);
    } catch (error) {
        logger.error('Failed to build content queue:', error);
        res.status(500).json({ error: 'Failed to build content' });
    }
});

/**
 * @route GET /api/occasion
 * @description Today's seasonal occasion (Advent, Easter, Tag der Deutschen Einheit, ...) or null.
 * @param {string} [req.query.date] - YYYY-MM-DD, to preview another day
 */
app.get('/api/occasion', (req, res) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(req.query.date || ''));
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date();
    res.json(getOccasion(date, { country: config.info.country, ...config.occasions }));
});

// External API Integration Routes
/* ------------------------------------ */

/**
 * Wikimedia Commons picture of the day, shaped like a NASA APOD response.
 * Used when the NASA API is unavailable or only returns its logo.
 */
async function fetchWikimediaPotd() {
    const today = new Date().toISOString().slice(0, 10).replaceAll('-', '/');
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/featured/${today}`, {
        headers: { 'User-Agent': 'TerminalSlideShow/1.0' },
    });
    if (!response.ok) throw new Error(`Wikimedia responded with ${response.status}`);
    const { image } = await response.json();
    if (!image?.thumbnail?.source) throw new Error('Wikimedia returned no picture of the day');
    const artist = image.artist?.text ? ` Photo: ${image.artist.text}${image.license?.type ? ` (${image.license.type})` : ''}.` : '';
    return {
        media_type: 'image',
        title: image.title.replace(/^File:/, '').replace(/\.\w+$/, '').replace(/_/g, ' '),
        url: '/api/apod-image',
        source_url: image.thumbnail.source,
        explanation: `${image.description?.text || 'Wikimedia Commons picture of the day.'}${artist}`,
    };
}

/**
 * @route GET /api/apod-image
 * @description Picture of the day served from our own origin (no hotlinking from the browser)
 */
app.get('/api/apod-image', async (req, res) => {
    try {
        const apod = await cached('nasa-apod', 60 * 60 * 1000, fetchWikimediaPotd);
        const src = apod.source_url || apod.url;
        const image = await cached(`apod-image:${src}`, 60 * 60 * 1000, async () => {
            const r = await fetch(src, { headers: { 'User-Agent': 'TerminalSlideShow/1.0' } });
            if (!r.ok) throw new Error(`Image responded with ${r.status}`);
            return { type: r.headers.get('content-type') || 'image/jpeg', body: Buffer.from(await r.arrayBuffer()) };
        });
        res.set('Content-Type', image.type);
        res.set('Cache-Control', 'public, max-age=3600');
        res.send(image.body);
    } catch (error) {
        logger.error('Failed to serve APOD image:', error);
        res.status(502).end();
    }
});

/**
 * @route GET /api/nasa-apod
 * @description Fetch NASA Astronomy Picture of the Day
 * @throws {Error} If NASA API request fails
 */
app.get('/api/nasa-apod', async (req, res) => {
    logger.debug('Fetching NASA APOD');
    try {
        // The picture changes once a day; one upstream request per hour is plenty
        const data = await cached('nasa-apod', 60 * 60 * 1000, async () => {
            if (config.apiKeys.NASA_API_KEY) {
                try {
                    const nasaResponse = await fetch(
                        `https://api.nasa.gov/planetary/apod?api_key=${config.apiKeys.NASA_API_KEY}`
                    );
                    if (!nasaResponse.ok) throw new Error(`NASA responded with ${nasaResponse.status}`);
                    const apod = await nasaResponse.json();
                    // NASA sometimes serves its site logo instead of a picture
                    if (apod.media_type === 'image' && apod.url && !/nasa-logo/i.test(apod.url)) return apod;
                    logger.warn('NASA APOD returned a placeholder, using Wikimedia picture of the day');
                } catch (error) {
                    logger.warn('NASA APOD failed, using Wikimedia picture of the day:', error.message);
                }
            }
            return fetchWikimediaPotd();
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
    res.sendFile(path.join(process.cwd(), 'client', 'index.html'));
});

// Server Lifecycle
/* ------------------------------------ */

/**
 * Start server and initialize services
 */
initialize().then(() => {
    server.listen(port, () => {
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