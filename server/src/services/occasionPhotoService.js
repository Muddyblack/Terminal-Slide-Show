import { cached } from '../utils/ttlCache.js';
import { commonsQuery, pickDaily, readDiskCache, toPhoto, writeDiskCache } from './regionPhotoService.js';

/**
 * Background photos that match an occasion (Mauerfall, Halloween, Weihnachtsmarkt, ...), taken from
 * curated Wikimedia Commons categories. Categories keep the pictures on topic and suitable for a
 * public screen; a free-text search would not.
 *
 * Keys are occasion ids from utils/occasions.js. Occasions without an entry (and the long seasons)
 * keep the regional photos.
 */
const DAY = 24 * 60 * 60 * 1000;
const DISK_TTL_MS = 30 * DAY;

/**
 * categories: Commons categories (with all their subcategories).
 * skip: optional titles to drop (fountains and monuments are no fun on carnival day).
 * keep: optional topic filter on title and description. The deep category trees contain stray files
 * (a raccoon under "pumpkin carving"), so it is applied when it still leaves enough photos.
 */
const MIN_AFTER_FILTER = 5;

export const OCCASIONS = {
  newyear: { categories: ['New Year fireworks'] },
  silvester: { categories: ['New Year fireworks'] },
  christmas: { categories: ['Christmas markets in Germany'] },
  advent: { categories: ['Advent wreaths', 'Christmas markets in Germany'] },
  nikolaus: { categories: ['Saint Nicholas Day'], keep: /nikolaus|nicholas|sinterklaas|klaus/i },
  halloween: { categories: ['Jack-o-lantern', 'Pumpkin carving'], keep: /halloween|pumpkin|kürbis|kuerbis|jack|lantern|laterne/i },
  valentine: { categories: ["Valentine's Day"], keep: /valentine|\brose|herz|heart|liebe|love|blume|flower/i },
  mauerfall: { categories: ['Fall and demolition of the Berlin Wall', 'Berlin Wall', 'East Side Gallery'] },
  unity: { categories: ['German Unity Day', 'Brandenburg Gate'] },
  maifeiertag: { categories: ['Maypoles'], keep: /mai|may/i },
  easter: { categories: ['Easter eggs'], keep: /easter|oster|egg|\bei\b/i },
  pfingsten: { categories: ['Paeonia'] },
  fasnet: { categories: ['Carnivals in Germany'], keep: /fasnet|fasnacht|fastnacht|karneval|carnival|narren|umzug|parade|mask|maske|hästräger|hexe/i, skip: /brunnen|fountain|denkmal|monument/i },
};

async function searchCategory(category) {
  const pages = await commonsQuery({
    generator: 'search',
    gsrsearch: `deepcat:"${category}" filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '50',
  });
  return pages.map(toPhoto).filter(Boolean);
}

async function searchOccasion(id) {
  const unique = new Map();
  let failed = 0;
  for (const category of OCCASIONS[id].categories) {
    try {
      for (const photo of await searchCategory(category)) {
        if (!unique.has(photo.title)) unique.set(photo.title, photo);
      }
    } catch {
      failed += 1;
    }
  }
  // Do not cache an empty result that came from failed requests
  if (!unique.size && failed) throw new Error('Commons category search failed');
  const { keep, skip } = OCCASIONS[id];
  const all = [...unique.values()].filter((photo) => !skip?.test(photo.title));
  const onTopic = keep ? all.filter((photo) => keep.test(`${photo.title} ${photo.explanation}`)) : all;
  return (onTopic.length >= MIN_AFTER_FILTER ? onTopic : all).sort((x, y) => x.title.localeCompare(y.title));
}

/** Photo list for an occasion id, or [] if the occasion has no categories. Kept on disk for 30 days. */
export function occasionPhotos(id) {
  if (!OCCASIONS[id]) return Promise.resolve([]);
  return cached(`occasion-photos:${id}`, DAY, async () => {
    const name = `occasion-${id}`;
    const disk = await readDiskCache(name);
    if (disk?.photos?.length && Date.now() - disk.at < DISK_TTL_MS) return disk.photos;
    try {
      const photos = await searchOccasion(id);
      if (photos.length) await writeDiskCache(name, photos);
      return photos;
    } catch (error) {
      if (disk?.photos?.length) return disk.photos;
      throw error;
    }
  });
}

/**
 * Today's photo for an occasion, or null if none is ready within `waitMs` (the search then keeps
 * running in the background and a later call finds it).
 * @param {string} id occasion id
 * @param {Date} date picks the photo of that day
 */
export async function occasionPhotoIfReady(id, date = new Date(), waitMs = 3000) {
  if (!OCCASIONS[id]) return null;
  const search = occasionPhotos(id);
  search.catch(() => {});
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), waitMs));
  try {
    const photos = await Promise.race([search, timeout]);
    return photos?.length ? pickDaily(photos, date) : null;
  } catch {
    return null;
  }
}
