import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { cached } from '../utils/ttlCache.js';

export const USER_AGENT = 'TerminalSlideShow/1.0 (https://github.com/Muddyblack/Terminal-Slide-Show)';
const DAY = 24 * 60 * 60 * 1000;
// Commons geosearch allows at most 10 km per query, so rings of overlapping queries cover the area
const QUERY_RADIUS_M = 10000;
const RADIUS_KM = Number(process.env.BACKGROUND_RADIUS_KM) || 50;
const CONCURRENCY = 2;
const DISK_TTL_MS = 7 * DAY;
const SKIP_TITLE = /\b(map|karte|logo|wappen|plan|flag|flagge|diagram|poster|plakat|stadtplan|coat of arms|screenshot)\b|\.svg$/i;

/**
 * Finds the coordinates of a place name.
 * @param {string} name
 * @returns {Promise<{latitude:number, longitude:number}|null>}
 */
export function geocode(name) {
  return cached(`geocode:${name}`, DAY, async () => {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`
    );
    if (!res.ok) throw new Error(`Geocoding responded with ${res.status}`);
    const hit = (await res.json()).results?.[0];
    return hit ? { latitude: hit.latitude, longitude: hit.longitude } : null;
  });
}

const stripHtml = (html = '') =>
  html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

export function toPhoto(page) {
  const info = page.imageinfo?.[0];
  if (!info || info.mime !== 'image/jpeg') return null;
  if (info.width < 1600 || info.width / info.height < 1.4) return null;
  if (SKIP_TITLE.test(page.title)) return null;

  const meta = info.extmetadata || {};
  const artist = stripHtml(meta.Artist?.value);
  const license = stripHtml(meta.LicenseShortName?.value);
  const description = stripHtml(meta.ImageDescription?.value).slice(0, 280);
  if (!artist) return null;
  const credit = artist ? `Foto: ${artist}${license ? ` (${license})` : ''}` : '';

  return {
    title: page.title.replace(/^File:/, '').replace(/\.\w+$/, '').replace(/_/g, ' '),
    source_url: info.thumburl,
    explanation: [description, credit].filter(Boolean).join(' · ') || 'Wikimedia Commons',
  };
}

/** Runs a Commons query for files and returns the pages with image info and attribution. */
export async function commonsQuery(extra) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1920',
    iiextmetadatafilter: 'Artist|LicenseShortName|ImageDescription',
    ...extra,
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Commons responded with ${res.status}`);
  return Object.values((await res.json()).query?.pages || {});
}

async function searchAround(latitude, longitude) {
  return commonsQuery({
    generator: 'geosearch',
    ggscoord: `${latitude}|${longitude}`,
    ggsradius: String(QUERY_RADIUS_M),
    ggsnamespace: '6',
    ggslimit: '50',
  });
}

/**
 * Query points on rings around the place; each query covers 10 km, so the rings together cover `radiusKm`.
 * @returns {Array<[number, number]>} [latitude, longitude] pairs
 */
export function searchCenters(latitude, longitude, radiusKm) {
  const centers = [[latitude, longitude]];
  const step = Math.max(radiusKm / 3, 10);
  const kmPerDegLat = 111;
  const kmPerDegLon = 111 * Math.cos((latitude * Math.PI) / 180);
  for (let ring = step; ring <= radiusKm + 0.01; ring += step) {
    const points = Math.ceil((2 * Math.PI * ring) / step);
    for (let i = 0; i < points; i += 1) {
      const angle = (2 * Math.PI * i) / points;
      centers.push([
        latitude + (ring * Math.sin(angle)) / kmPerDegLat,
        longitude + (ring * Math.cos(angle)) / kmPerDegLon,
      ]);
    }
  }
  return centers;
}

const cacheFile = (name) => path.join(process.cwd(), 'data', 'cache', `${name}.json`);

/** Last good photo list, kept on disk so a restart does not repeat a slow search. */
export async function readDiskCache(name) {
  try {
    return JSON.parse(await fs.readFile(cacheFile(name), 'utf8'));
  } catch {
    return null;
  }
}

export async function writeDiskCache(name, photos) {
  try {
    await fs.mkdir(path.dirname(cacheFile(name)), { recursive: true });
    await fs.writeFile(cacheFile(name), JSON.stringify({ at: Date.now(), photos }));
  } catch {
    // The disk copy is a bonus, never a requirement
  }
}

const regionCacheName = (location) =>
  `region-${location.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${RADIUS_KM}`;

async function searchRegion(location) {
  const place = await geocode(location);
  if (!place) return [];

  const centers = searchCenters(place.latitude, place.longitude, RADIUS_KM);
  const unique = new Map();
  let failed = 0;
  let next = 0;

  // A few requests at a time: Wikimedia throttles bigger bursts, and this runs rarely
  const worker = async () => {
    while (next < centers.length) {
      const [lat, lon] = centers[next++];
      try {
        for (const page of await searchAround(lat, lon)) {
          const photo = toPhoto(page);
          if (photo && !unique.has(photo.title)) unique.set(photo.title, photo);
        }
      } catch {
        failed += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Do not cache an empty result that came from failed requests
  if (!unique.size && failed) throw new Error('Commons photo search failed');
  return [...unique.values()].sort((x, y) => x.title.localeCompare(y.title));
}

/**
 * Landscape photos taken within `BACKGROUND_RADIUS_KM` (default 50) of a place, from Wikimedia Commons.
 * The first search takes minutes, so the list is kept on disk for a week (a stale copy is used if a
 * refresh fails) and kept in memory for a day.
 * @param {string} location place name, e.g. "Friedrichshafen"
 * @returns {Promise<Array<{title:string, source_url:string, explanation:string}>>}
 */
export function regionPhotos(location) {
  return cached(`region-photos:${location}`, DAY, async () => {
    const disk = await readDiskCache(regionCacheName(location));
    if (disk?.photos?.length && Date.now() - disk.at < DISK_TTL_MS) return disk.photos;
    try {
      const photos = await searchRegion(location);
      if (photos.length) await writeDiskCache(regionCacheName(location), photos);
      return photos;
    } catch (error) {
      if (disk?.photos?.length) return disk.photos;
      throw error;
    }
  });
}

/**
 * The photo list if it is ready within `waitMs`, otherwise null. The search keeps running in the
 * background, so a later call finds it ready.
 */
export async function regionPhotosIfReady(location, waitMs = 3000) {
  const search = regionPhotos(location);
  search.catch(() => {});
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), waitMs));
  try {
    return await Promise.race([search, timeout]);
  } catch {
    return null;
  }
}

/**
 * Picks one photo for today; the same one all day, a different one tomorrow.
 * @param {Array} photos
 * @param {Date} [date]
 */
export function pickDaily(photos, date = new Date()) {
  if (!photos.length) return null;
  const dayNumber = Math.floor(date.getTime() / DAY);
  return photos[dayNumber % photos.length];
}
