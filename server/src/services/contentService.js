import fs from 'fs/promises';
import path from 'path';

import { clock, sunTimes } from '../utils/sun.js';

/**
 * Builds the rotating text queue for the daily view.
 *
 * Sources, in order of trust:
 *  1. Local JSON under data/content (always available)
 *  2. Open feeds fetched by the server only: Wikipedia "On this day" and a city summary.
 *     Each is cached, the last good copy is kept on disk, and a failing feed is simply skipped.
 *  3. Derived lines: sun times and a weather line, computed from data we already have.
 * The browser never talks to a third party.
 */

const dataDir = () => path.join(process.cwd(), 'data');
const cacheDir = () => path.join(dataDir(), 'cache');

async function readJson(file, fallback) {
    try {
        return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
        return fallback;
    }
}

async function readCache(name) {
    return readJson(path.join(cacheDir(), name), null);
}

async function writeCache(name, value) {
    try {
        await fs.mkdir(cacheDir(), { recursive: true });
        await fs.writeFile(path.join(cacheDir(), name), JSON.stringify(value));
    } catch {
        // The disk copy is a bonus, never a requirement
    }
}

/** Fetches JSON with a timeout and a User-Agent, as the Wikimedia API rules ask. */
async function fetchJson(url, fetchFn) {
    const response = await fetchFn(url, {
        headers: { 'User-Agent': 'TerminalSlideshow/1.0 (info display; open data reader)', Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`${url} responded with ${response.status}`);
    return response.json();
}

const clean = (text) => String(text).replace(/\s+/g, ' ').trim();

/** Wikipedia: events on this day. Returns [{year, text}], falling back to the last good copy. */
export async function onThisDay(date, fetchFn) {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const name = `onthisday-${mm}-${dd}.json`;
    try {
        const data = await fetchJson(`https://de.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`, fetchFn);
        const events = (data.events || [])
            .filter((e) => e.text && e.year && e.text.length < 220)
            .map((e) => ({ year: e.year, text: clean(e.text) }));
        if (events.length) {
            await writeCache(name, events);
            return events;
        }
    } catch {
        // fall through to the saved copy
    }
    return (await readCache(name)) || [];
}

/** Wikipedia: short summary for the place, trimmed to one or two sentences. */
export async function citySummary(location, fetchFn) {
    const name = `summary-${location.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    try {
        const data = await fetchJson(
            `https://de.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(location)}`,
            fetchFn
        );
        const sentences = clean(data.extract || '').match(/[^.!?]+[.!?]+/g) || [];
        const text = sentences.slice(0, 2).join(' ').trim();
        if (text.length > 30 && text.length < 320) {
            await writeCache(name, text);
            return text;
        }
    } catch {
        // fall through to the saved copy
    }
    return readCache(name);
}

// PEGELONLINE (Wasserstraßen- und Schifffahrtsverwaltung): the only gauge on the lake in this feed
const LAKE_GAUGE = { id: 'KONSTANZ', name: 'Konstanz', latitude: 47.66075, longitude: 9.181039 };
/** The gauge is shown for places up to this far from it */
const LAKE_RANGE_KM = 60;

export function distanceKm(lat1, lon1, lat2, lon2) {
    const rad = (deg) => (deg * Math.PI) / 180;
    const a =
        Math.sin(rad(lat2 - lat1) / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const LEVEL_WORDS = { low: 'niedriger', normal: 'normaler', high: 'hoher' };

/**
 * The lake line, e.g. "Pegel Konstanz: 251 cm, niedriger Wasserstand. Seit gestern unverändert."
 * Built from a current reading and the last 24 hours.
 * @param {{value:number, stateMnwMhw?:string}} current
 * @param {Array<{value:number}>} [last24h]
 */
export function lakeLine(current, last24h = []) {
    if (!current || typeof current.value !== 'number') return null;
    const level = LEVEL_WORDS[current.stateMnwMhw];
    let text = `Pegel ${LAKE_GAUGE.name}: ${Math.round(current.value)} cm${level ? `, ${level} Wasserstand` : ''}.`;
    const first = last24h.find((m) => typeof m.value === 'number');
    if (first) {
        const diff = Math.round(current.value - first.value);
        if (Math.abs(diff) < 1) text += ' Seit gestern unverändert.';
        else text += ` Seit gestern um ${Math.abs(diff)} cm ${diff > 0 ? 'gestiegen' : 'gefallen'}.`;
    }
    return text;
}

/** Water level of the lake for places near the gauge, or null (too far away, feed down, ...). */
export async function lakeInfo(place, fetchFn) {
    if (!place) return null;
    if (distanceKm(place.latitude, place.longitude, LAKE_GAUGE.latitude, LAKE_GAUGE.longitude) > LAKE_RANGE_KM) return null;
    const base = `https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/${LAKE_GAUGE.id}/W`;
    try {
        const [current, series] = await Promise.all([
            fetchJson(`${base}/currentmeasurement.json`, fetchFn),
            fetchJson(`${base}/measurements.json?start=P1D`, fetchFn).catch(() => []),
        ]);
        return lakeLine(current, series);
    } catch {
        return null;
    }
}

/** Sun lines for today, e.g. "Sonnenuntergang heute um 16:52 Uhr." */
export function sunLines(date, lat, lon, timeZone) {
    const { sunrise, sunset } = sunTimes(date, lat, lon);
    const lines = [];
    if (sunrise) lines.push(`Sonnenaufgang heute um ${clock(sunrise, timeZone)} Uhr.`);
    if (sunset) lines.push(`Sonnenuntergang heute um ${clock(sunset, timeZone)} Uhr.`);
    if (sunrise && sunset) {
        const minutes = Math.round((sunset - sunrise) / 60000);
        lines.push(`Der Tag ist heute ${Math.floor(minutes / 60)} Stunden und ${minutes % 60} Minuten lang.`);
    }
    return lines;
}

/** A line that reacts to the current weather, or null when nothing is notable. */
export function weatherLine(current) {
    if (!current) return null;
    const t = Math.round(current.temperature);
    if (current.snowfall > 0) return `Es schneit gerade. Bei ${t} °C lohnt sich ein warmer Schal.`;
    if (current.rain > 0 || current.showers > 0) return `Es regnet gerade, nimm einen Schirm mit. Draußen sind es ${t} °C.`;
    if (current.wind_gusts >= 50) return `Starke Böen bis ${Math.round(current.wind_gusts)} km/h, Fahrräder gut festhalten.`;
    if (current.temperature <= 0) return `Frost: ${t} °C draußen. Vorsicht auf glatten Wegen.`;
    if (current.temperature >= 28) return `Heiß mit ${t} °C. Viel trinken und der Bodensee ist nicht weit.`;
    if (current.cloud_cover <= 15 && current.is_day) return `Fast wolkenlos bei ${t} °C. Gute Sicht auf die Alpen.`;
    return null;
}

/** Fisher-Yates */
export function shuffle(list, rand = Math.random) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Shuffles every kind, then deals them round-robin so the same kind never shows twice in a row
 * (as long as more than one kind has items left).
 */
export function interleave(groups, rand = Math.random) {
    const pools = Object.entries(groups)
        .filter(([, items]) => items.length)
        .map(([kind, items]) => ({ kind, items: shuffle(items, rand) }));
    const out = [];
    let last = null;
    while (pools.some((p) => p.items.length)) {
        const candidates = pools.filter((p) => p.items.length && p.kind !== last);
        const list = candidates.length ? candidates : pools.filter((p) => p.items.length);
        // Always take from the fullest pool (random among ties). This keeps the
        // no-repeat rule satisfiable to the end instead of piling one kind at the bottom.
        const most = Math.max(...list.map((p) => p.items.length));
        const top = list.filter((p) => p.items.length === most);
        const pick = top[Math.floor(rand() * top.length)];
        out.push({ kind: pick.kind, text: pick.items.pop() });
        last = pick.kind;
    }
    return out;
}

/**
 * @param {object} args
 * @param {string} args.location
 * @param {Date} args.date
 * @param {{latitude:number, longitude:number, timezone:string, current:object}|null} args.place - from the weather lookup
 * @param {typeof fetch} args.fetchFn
 * @param {() => number} [args.rand]
 * @returns {Promise<{kind:string,text:string}[]>}
 */
export async function buildQueue({ location, date, place, fetchFn, rand = Math.random }) {
    const region = await readJson(path.join(dataDir(), 'content', 'region.json'), { bodensee: [], cities: {} });
    const extra = await readJson(path.join(dataDir(), 'content', 'tips.json'), {});

    const key = Object.keys(region.cities).find((c) => location.toLowerCase().includes(c));
    const groups = {
        Bodensee: region.bodensee || [],
        Stadtfakt: key ? region.cities[key] : [],
        Tipp: extra.tips || [],
        'Wort des Tages': (extra.words || []).map(([w, m]) => `${w}: ${m}`),
        Wissen: extra.science || [],
    };

    // Live feeds, each optional
    const [events, summary] = await Promise.all([
        onThisDay(date, fetchFn).catch(() => []),
        citySummary(location, fetchFn).catch(() => null),
    ]);
    groups['An diesem Tag'] = events.slice(0, 12).map((e) => `${e.year}: ${e.text}`);
    if (summary) groups.Stadtfakt = [...groups.Stadtfakt, summary];

    if (place) {
        const lake = await lakeInfo(place, fetchFn);
        if (lake) groups['Bodensee aktuell'] = [lake];
        groups.Sonne = sunLines(date, place.latitude, place.longitude, place.timezone);
        const line = weatherLine(place.current);
        if (line) groups.Wetter = [line];
    }

    return interleave(groups, rand);
}
