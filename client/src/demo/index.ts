/**
 * Demo mode (VITE_DEMO_MODE=true), used for the GitHub Pages preview. There is no backend there, so
 * fetch() answers the /api calls from the made-up data below. Nothing in here comes from a real device.
 */
import facts from '../../../server/data/en/facts.json';
import greetings from '../../../server/data/en/greetings.json';
import quotes from '../../../server/data/en/quotes.json';

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const demoUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/** Weather the demo bar can switch to: WMO code plus the numbers the weather scene reads */
export const DEMO_WEATHER: Record<string, Record<string, number>> = {
  partly: { weathercode: 2, temperature: 17, cloud_cover: 45 },
  clear: { weathercode: 0, temperature: 24, cloud_cover: 0 },
  overcast: { weathercode: 3, temperature: 12, cloud_cover: 100 },
  fog: { weathercode: 45, temperature: 6, cloud_cover: 100 },
  rain: { weathercode: 63, temperature: 9, cloud_cover: 100, rain: 2.4 },
  snow: { weathercode: 73, temperature: -2, cloud_cover: 100, snowfall: 1.2 },
  thunder: { weathercode: 95, temperature: 19, cloud_cover: 100, rain: 4, windspeed: 30 },
};

/** Occasions the demo bar can preview, as a day of the year (MM-DD) to show them on */
export const DEMO_OCCASIONS: Record<string, { label: string; day: string }> = {
  halloween: { label: 'Halloween', day: '10-31' },
  autumn: { label: 'Golden October', day: '10-16' },
  christmas: { label: 'Christmas', day: '12-24' },
  newyear: { label: 'New Year', day: '12-31' },
  spring: { label: 'Valentine’s Day', day: '02-14' },
};

const OCCASIONS = [
  { id: 'halloween', date: '10-31', before: 6, after: 0, title: 'Halloween', text: 'Trick or treat?', theme: 'halloween', particle: 'bat' },
  { id: 'autumn', date: '10-16', before: 3, after: 3, title: 'Golden October', text: 'Colourful leaves and crisp air.', theme: 'autumn', particle: 'leaf' },
  { id: 'christmas', date: '12-24', before: 6, after: 2, title: 'Merry Christmas!', text: 'Happy holidays and restful days.', theme: 'christmas', particle: 'snow' },
  { id: 'newyear', date: '12-31', before: 3, after: 5, title: 'Happy New Year!', text: 'Here is to a good year.', theme: 'newyear', particle: 'spark' },
  { id: 'spring', date: '02-14', before: 0, after: 0, title: 'Valentine’s Day', text: 'A kind word costs nothing.', theme: 'spring', particle: 'petal' },
];

const params = () => new URLSearchParams(window.location.search);
const dayOfYear = (d: Date) => Math.floor((Date.UTC(2001, d.getMonth(), d.getDate()) - Date.UTC(2001, 0, 1)) / 864e5);

/** The occasion running on the given day (YYYY-MM-DD, default today), or null */
const occasionFor = (date: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? '');
  const now = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  const today = dayOfYear(now);
  for (const occ of OCCASIONS) {
    const [mm, dd] = occ.date.split('-').map(Number);
    const own = dayOfYear(new Date(2001, mm - 1, dd));
    if (today >= own - occ.before && today <= own + occ.after) {
      const day = `${now.getFullYear()}-${occ.date}`;
      return { id: occ.id, title: occ.title, text: occ.text, theme: occ.theme, particle: occ.particle, day };
    }
  }
  return null;
};

const weatherNow = () => {
  const preset = DEMO_WEATHER[params().get('weather') ?? ''] ?? DEMO_WEATHER.partly;
  const hour = new Date().getHours();
  return {
    current_weather: {
      weathercode: 0,
      temperature: 15,
      is_day: hour >= 6 && hour < 20 ? 1 : 0,
      windspeed: 8,
      winddirection: 250,
      wind_gusts: 14,
      cloud_cover: 0,
      rain: 0,
      showers: 0,
      snowfall: 0,
      time: new Date().toISOString(),
      ...preset,
    },
  };
};

const answer = (url: URL): unknown => {
  switch (url.pathname) {
    case '/api/server-status':
      return { status: 'ok', demo: true };
    case '/api/display-state':
      return { active: true };
    case '/api/quotes':
      return pick(quotes.quotes);
    case '/api/facts':
      return pick(facts);
    case '/api/greetings':
      return greetings;
    case '/api/content':
      return { items: [], quotes: [...quotes.quotes].sort(() => Math.random() - 0.5).slice(0, 20) };
    case '/api/theme':
      return { id: 'default', name: 'Default', vars: {}, available: ['default'] };
    case '/api/occasion':
      return occasionFor(url.searchParams.get('date') ?? params().get('date'));
    case '/api/weather':
      return weatherNow();
    case '/api/nasa-apod':
      return {
        media_type: 'image',
        title: 'A made-up nebula',
        url: demoUrl('demo/astro.svg'),
        explanation: 'A generated placeholder instead of the daily astronomy picture. The real screen shows a new photo every day.',
      };
    default:
      return undefined;
  }
};

/** Makes fetch() answer /api calls from the demo data; everything else goes to the network */
export function installDemo(): void {
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const raw = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    const url = new URL(raw, window.location.href);
    if (!url.pathname.startsWith('/api/')) return realFetch(input, init);
    const body = answer(url);
    return Promise.resolve(
      body === undefined ? new Response('{}', { status: 404 }) : new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
    );
  };
}
