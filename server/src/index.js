import { config } from '../config/config.js';


import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { GoogleDriveService } from './services/googleDriveService.js';
import { SlideshowManager } from './services/slideshowManager.js';
import { Logger } from './utils/logger.js';
import { cached } from './utils/ttlCache.js';
import { buildQueue } from './services/contentService.js';
import { occasionPhotoIfReady } from './services/occasionPhotoService.js';
import { regionPhotosIfReady, pickDaily } from './services/regionPhotoService.js';
import { getOccasion, listOccasions } from './utils/occasions.js';
import { getTheme, listThemes } from './utils/themes.js';
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

const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
});

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
app.get('/api/all-media', limiter, (req, res) => {
    logger.debug('Getting all media files');
    const media = slideshowManager.getAllMedia();
    res.json(media || []);
});

app.get('/api/server-status', limiter, (req, res) => {
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
app.get('/api/quotes', limiter, async (req, res) => {
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
app.get('/api/facts', limiter, async (req, res) => {
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
app.get('/api/greetings', limiter, async (req, res) => {
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
app.get('/api/content', limiter, async (req, res) => {
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
/** The day from a ?date=YYYY-MM-DD query, or today. */
const dayFromQuery = (query) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(query.date || ''));
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date();
};

/**
 * @route GET /api/theme
 * @description The look chosen with THEME in .env, as CSS variables for the daily view.
 */
app.get('/api/theme', limiter, (req, res) => {
    res.json({ ...getTheme(process.env.THEME), available: Object.keys(listThemes()) });
});

app.get('/api/occasion', limiter, (req, res) => {
    res.json(getOccasion(dayFromQuery(req.query), { country: config.info.country, ...config.occasions }));
});

/**
 * @route GET /api/occasions
 * @description Every occasion of a year with the days it is shown (for the test page).
 * @param {string} [req.query.year] - defaults to this year
 */
app.get('/api/occasions', limiter, (req, res) => {
    const year = /^\d{4}$/.test(String(req.query.year)) ? Number(req.query.year) : new Date().getFullYear();
    res.json(listOccasions(year, { country: config.info.country, ...config.occasions }));
});

// External API Integration Routes
/* ------------------------------------ */

/** Pictures are proxied so the browser only talks to our own origin. */
const imageProxyUrl = (src) => `/api/apod-image?src=${encodeURIComponent(src)}`;

/** Wikimedia Commons picture of the day, shaped like a NASA APOD response. Last resort. */
async function fetchWikimediaPotd() {
    const today = new Date().toISOString().slice(0, 10).replaceAll('-', '/');
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/featured/${today}`, {
        headers: { 'User-Agent': 'TerminalSlideShow/1.0 (https://github.com/Muddyblack/Terminal-Slide-Show)' },
    });
    if (!response.ok) throw new Error(`Wikimedia responded with ${response.status}`);
    const { image } = await response.json();
    if (!image?.thumbnail?.source) throw new Error('Wikimedia returned no picture of the day');
    const artist = image.artist?.text ? ` Photo: ${image.artist.text}${image.license?.type ? ` (${image.license.type})` : ''}.` : '';
    return {
        media_type: 'image',
        title: image.title.replace(/^File:/, '').replace(/\.\w+$/, '').replace(/_/g, ' '),
        url: imageProxyUrl(image.thumbnail.source),
        explanation: `${image.description?.text || 'Wikimedia Commons picture of the day.'}${artist}`,
    };
}

/** Today's photo taken within ~30 km of the location, or null if there is none. */
async function fetchRegionPhoto(location) {
    const photo = pickDaily((await regionPhotosIfReady(location)) || []);
    if (!photo) return null;
    return {
        media_type: 'image',
        title: photo.title,
        url: imageProxyUrl(photo.source_url),
        explanation: photo.explanation,
    };
}

/**
 * @route GET /api/apod-image
 * @description Serves a Wikimedia picture from our own origin (no hotlinking from the browser)
 */
app.get('/api/apod-image', limiter, async (req, res) => {
    let src;
    try {
        src = new URL(String(req.query.src));
    } catch {
        return res.status(400).end();
    }
    if (src.protocol !== 'https:' || !/^(upload|thumb)\.wikimedia\.org$/.test(src.hostname)) {
        return res.status(400).end();
    }

    try {
        // Rebuilt from the validated parts only, so nothing else from the query reaches fetch()
        const target = `https://${src.hostname}${src.pathname}${src.search}`;
        const image = await cached(`apod-image:${target}`, 24 * 60 * 60 * 1000, async () => {
            const r = await fetch(target, { headers: { 'User-Agent': 'TerminalSlideShow/1.0 (https://github.com/Muddyblack/Terminal-Slide-Show)' } });
            if (!r.ok) throw new Error(`Image responded with ${r.status}`);
            return { type: r.headers.get('content-type') || 'image/jpeg', body: Buffer.from(await r.arrayBuffer()) };
        });
        res.set('Content-Type', image.type);
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(image.body);
    } catch (error) {
        logger.error('Failed to serve picture:', error);
        res.status(502).end();
    }
});

/**
 * Test-page helpers (the /test page can pick the picture source). Only on when the server was started by
 * `npm run dev`, which sets DEV_TOOLS=1. Terminal mode and Docker never set it.
 */
const devTools = process.env.DEV_TOOLS === '1';

/** NASA's picture of the day when it is a real picture (checked hourly), otherwise null. */
function fetchNasaApod() {
    return cached('nasa-apod', 60 * 60 * 1000, async () => {
        if (!config.apiKeys.NASA_API_KEY) return null;
        try {
            const nasaResponse = await fetch(
                `https://api.nasa.gov/planetary/apod?api_key=${config.apiKeys.NASA_API_KEY}`
            );
            if (!nasaResponse.ok) throw new Error(`NASA responded with ${nasaResponse.status}`);
            const apod = await nasaResponse.json();
            // NASA sometimes serves its site logo instead of a picture
            if (apod.media_type === 'image' && apod.url && !/nasa-logo/i.test(apod.url)) return apod;
            logger.warn('NASA APOD returned a placeholder');
        } catch (error) {
            logger.warn('NASA APOD failed:', error.message);
        }
        return null;
    });
}

/** Today's photo that fits the occasion of the day (Mauerfall, Halloween, ...), or null. */
async function fetchOccasionPhoto(day) {
    const occasion = getOccasion(day, { country: config.info.country, ...config.occasions });
    if (!occasion) return null;
    const photo = await occasionPhotoIfReady(occasion.id, day);
    if (!photo) return null;
    return {
        media_type: 'image',
        title: photo.title,
        url: imageProxyUrl(photo.source_url),
        explanation: photo.explanation,
    };
}

/**
 * @route GET /api/nasa-apod
 * @description Background picture. On an occasion (Mauerfall, Halloween, ...): a photo of that topic.
 * Otherwise NASA's picture of the day when it is a real picture, otherwise today's photo from around
 * the location (BACKGROUND_RADIUS_KM, default 50), otherwise Wikimedia's picture of the day.
 * @param {string} [req.query.location] Place to look around, defaults to the configured location
 * @param {string} [req.query.date] YYYY-MM-DD, previews another day's occasion
 * @param {string} [req.query.source] Dev tools only: auto | occasion | nasa | region | potd
 */
app.get('/api/nasa-apod', limiter, async (req, res) => {
    const location = String(req.query.location || config.info.location);
    const source = devTools ? String(req.query.source || 'auto') : 'auto';
    logger.debug('Fetching background picture');

    try {
        let data = null;
        if (source === 'auto' || source === 'occasion') {
            try {
                data = await fetchOccasionPhoto(dayFromQuery(req.query));
            } catch (error) {
                logger.warn('Occasion photo search failed:', error.message);
            }
        }
        if (!data && (source === 'auto' || source === 'nasa')) data = await fetchNasaApod();

        if (!data && (source === 'auto' || source === 'region')) {
            try {
                data = await fetchRegionPhoto(location);
            } catch (error) {
                logger.warn('Regional photo search failed:', error.message);
            }
        }
        // Wikimedia's picture of the day covers the time until the regional search is ready
        if (!data && (source === 'auto' || source === 'potd')) {
            data = await cached('wikimedia-potd', 60 * 60 * 1000, fetchWikimediaPotd);
        }

        if (!data) return res.status(503).json({ error: `No picture from source "${source}"` });

        // Short cache so the regional photo shows up soon after the search finished
        res.set('Cache-Control', 'public, max-age=60');
        res.json(data);
    } catch (error) {
        logger.error('Failed to fetch background picture:', error);
        res.status(500).json({ error: 'Failed to fetch background picture' });
    }
});

/**
 * @route GET /api/weather
 * @description Fetch weather data for location
 * @param {string} req.query.location - Location to get weather for
 */
app.get('/api/weather', limiter, async (req, res) => {
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
app.get('*', limiter, (req, res) => {
    res.sendFile(path.join(process.cwd(), 'client', 'index.html'));
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