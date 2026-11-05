import { config, publicConfig } from '../config/config.js';


import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { GoogleDriveService } from './services/googleDriveService.js';
import { SlideshowManager } from './services/slideshowManager.js';
import { Logger } from './utils/logger.js';
import { readLocalizedData } from './utils/localizedData.js';
import { isOperatingNow } from './utils/schedule.js';
import { cached } from './utils/ttlCache.js';
import { buildQueue } from './services/contentService.js';
import { occasionPhotoIfReady } from './services/occasionPhotoService.js';
import { regionPhotosIfReady, pickDaily } from './services/regionPhotoService.js';
import { getOccasion, listOccasions } from './utils/occasions.js';
import { getTheme, listThemes } from './utils/themes.js';
import { forecastUrl, hasCoordinates } from './utils/weather.js';
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

/**
 * @route GET /api/display-state
 * @description Whether the display should be on right now according to the schedule.
 * Polled by the device's power timer and by the MPV player.
 */
app.get('/api/display-state', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ active: isOperatingNow(config.schedule) });
});

// Local Data API Routes
/* ------------------------------------ */

const bundledDataPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const readContent = (name) => readLocalizedData(name, {
    dataPath: config.paths.dataPath,
    language: config.locale.language,
    bundledPath: bundledDataPath,
});

/**
 * @route GET /api/quotes
 * @description Get random quote from local database
 */
app.get('/api/quotes', limiter, async (req, res) => {
    logger.debug('Fetching random quote');
    try {
        const quotesData = await readContent('quotes.json');
        const quotes = quotesData.quotes;
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
        const factsData = await readContent('facts.json');
        const facts = factsData;
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
        const greetingsData = await readContent('greetings.json');
        const greetings = greetingsData;
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
            const quotesData = await readContent('quotes.json');
            const quotes = [...quotesData.quotes].sort(() => Math.random() - 0.5).slice(0, 20);
            // The rotating texts are German only; other languages keep the plain facts
            if (config.locale.language !== 'de') return { items: [], quotes };

            let place = null;
            try {
                // The weather lines are written for °C and km/h
                const w = await weatherFor(location, 'metric');
                if (w) {
                    place = { ...w.location, current: w.current_weather };
                }
            } catch (error) {
                logger.warn('Content without weather:', error.message);
            }
            const items = await buildQueue({ location, date: new Date(), place, fetchFn: fetch });
            return { items, quotes };
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
/**
 * Options for the occasion rules. The built-in occasions are German holidays with German
 * texts, so they are off unless the language is German.
 */
const occasionOptions = () => ({
    country: config.info.country,
    ...config.occasions,
    enabled: config.occasions.enabled && config.locale.language === 'de',
});

/** The day from a ?date=YYYY-MM-DD query, or today. */
const dayFromQuery = (query) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(query.date || ''));
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date();
};

/**
 * @route GET /api/theme
 * @description The look chosen with THEME in .env (or "theme" in SLIDESHOW_CONFIG), as CSS variables for the daily view.
 */
app.get('/api/theme', limiter, (req, res) => {
    res.json({ ...getTheme(config.theme), available: Object.keys(listThemes()) });
});

app.get('/api/occasion', limiter, (req, res) => {
    res.json(getOccasion(dayFromQuery(req.query), occasionOptions()));
});

/**
 * @route GET /api/occasions
 * @description Every occasion of a year with the days it is shown (for the test page).
 * @param {string} [req.query.year] - defaults to this year
 */
app.get('/api/occasions', limiter, (req, res) => {
    const year = /^\d{4}$/.test(String(req.query.year)) ? Number(req.query.year) : new Date().getFullYear();
    res.json(listOccasions(year, occasionOptions()));
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
    const occasion = getOccasion(day, occasionOptions());
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
 * @description Current weather for the configured position (info.latitude/longitude,
 * or looked up from info.location), in the configured units
 */
app.get('/api/weather', limiter, async (req, res) => {
    const location = String(req.query.location || config.info.location);
    logger.debug(`Fetching weather for ${location}`);

    try {
        const weather = await weatherFor(location);
        if (!weather) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json(weather);
    } catch (error) {
        logger.error('Failed to fetch weather:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

/**
 * Fetches the current weather for a configured position
 * @param {Object} info - config.info
 * @param {'metric'|'imperial'} units
 * @returns {Promise<Object|null>} Weather data, or null when the location is unknown
 */
async function fetchWeather(info, units) {
    let { latitude, longitude, elevation } = info;
    let place = { name: info.location };

    if (!hasCoordinates(info)) {
        const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(info.location)}&count=1`
        );
        const geoData = await geoResponse.json();
        const result = geoData.results?.[0];
        if (!result) return null;

        ({ latitude, longitude } = result);
        place = { name: result.name, country: result.country };
    }

    const weatherResponse = await fetch(forecastUrl({ latitude, longitude, elevation, units }));
    if (!weatherResponse.ok) throw new Error(`Open-Meteo responded with ${weatherResponse.status}`);
    const weatherData = await weatherResponse.json();
    const { current } = weatherData;

    return {
        ...weatherData,
        location: { ...place, timezone: weatherData.timezone, latitude, longitude },
        units,
        current_weather: {
            temperature: current.temperature_2m,
            weathercode: current.weather_code,
            is_day: current.is_day,
            time: current.time,
            windspeed: current.wind_speed_10m,
            winddirection: current.wind_direction_10m,
            wind_gusts: current.wind_gusts_10m,
            cloud_cover: current.cloud_cover,
            rain: current.rain,
            showers: current.showers,
            snowfall: current.snowfall
        }
    };
}

/**
 * Cached weather for a place name. The configured location uses the configured
 * coordinates; any other name (test page preview) is looked up by name.
 * @param {string} location
 * @param {'metric'|'imperial'} [units]
 */
function weatherFor(location, units = config.locale.units) {
    const { info } = config;
    const target = location === info.location ? info : { location };
    const key = `weather:${location}:${target.latitude}:${target.longitude}:${target.elevation}:${units}`;
    return cached(key, 10 * 60 * 1000, () => fetchWeather(target, units));
}

// Serve index.html for all other routes (SPA support)
app.get('*', limiter, (req, res) => {
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