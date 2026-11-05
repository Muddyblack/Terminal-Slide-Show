import { WeatherType } from '@/components/dynamic_daily_view/types';

/**
 * Overrides the /test page feeds into the daily view. Production never passes any,
 * so the view behaves exactly as before.
 */
export type PictureSource = 'auto' | 'occasion' | 'nasa' | 'region' | 'potd' | 'none';
export type DayNight = 'auto' | 'day' | 'night';
export type WeatherPreset =
  | 'live' | 'clear' | 'partly' | 'cloudy'
  | 'drizzle' | 'rainLight' | 'rain' | 'rainHeavy' | 'showers' | 'freezing'
  | 'thunder1' | 'thunder2' | 'thunder3' | 'hail' | 'hailHeavy'
  | 'snowLight' | 'snow' | 'snowHeavy' | 'grains'
  | 'fog' | 'rimeFog' | 'storm';

export interface DebugOptions {
  /** Local date and time as "YYYY-MM-DDTHH:mm"; the clock stands still there. Empty: real time. */
  fakeNow: string;
  dayNight: DayNight;
  weather: WeatherPreset;
  /** Place for weather, facts and the regional pictures. Empty: the configured one. */
  location: string;
  source: PictureSource;
  /** Pretend the server cannot be reached, so the view has to use its cached data. */
  offline: boolean;
  /** Changing this refetches everything. */
  reloadKey: number;
}

export const DEFAULT_DEBUG: DebugOptions = {
  fakeNow: '',
  dayNight: 'auto',
  weather: 'live',
  location: '',
  source: 'auto',
  offline: false,
  reloadKey: 0,
};

const BASE_WEATHER: Omit<WeatherType, 'time'> = {
  weathercode: 0,
  temperature: 18,
  is_day: 1,
  windspeed: 8,
  winddirection: 220,
  wind_gusts: 14,
  cloud_cover: 10,
  rain: 0,
  showers: 0,
  snowfall: 0,
};

/** WMO weather codes with matching numbers, see weatherModel.ts */
export const WEATHER_PRESETS: Record<Exclude<WeatherPreset, 'live'>, Partial<WeatherType>> = {
  clear: { weathercode: 0, cloud_cover: 5, temperature: 22 },
  partly: { weathercode: 2, cloud_cover: 45, temperature: 18 },
  cloudy: { weathercode: 3, cloud_cover: 90, temperature: 14 },
  drizzle: { weathercode: 53, cloud_cover: 95, rain: 0.4, temperature: 10, windspeed: 8 },
  rainLight: { weathercode: 61, cloud_cover: 95, rain: 0.8, temperature: 11, windspeed: 10 },
  rain: { weathercode: 63, cloud_cover: 95, rain: 2.5, temperature: 9, windspeed: 16 },
  rainHeavy: { weathercode: 65, cloud_cover: 100, rain: 8, temperature: 9, windspeed: 28, winddirection: 250, wind_gusts: 50 },
  showers: { weathercode: 81, cloud_cover: 70, showers: 3, temperature: 14, windspeed: 22, wind_gusts: 45 },
  freezing: { weathercode: 67, cloud_cover: 100, rain: 2, temperature: -1, windspeed: 12 },
  thunder1: { weathercode: 95, cloud_cover: 90, rain: 1, wind_gusts: 30, windspeed: 15, temperature: 21 },
  thunder2: { weathercode: 95, cloud_cover: 100, rain: 6, showers: 3, wind_gusts: 60, windspeed: 30, temperature: 19 },
  thunder3: { weathercode: 95, cloud_cover: 100, rain: 14, showers: 6, wind_gusts: 90, windspeed: 45, winddirection: 260, temperature: 18 },
  hail: { weathercode: 96, cloud_cover: 100, rain: 5, showers: 2, wind_gusts: 55, windspeed: 28, temperature: 16 },
  hailHeavy: { weathercode: 99, cloud_cover: 100, rain: 12, showers: 6, wind_gusts: 85, windspeed: 40, winddirection: 240, temperature: 15 },
  snowLight: { weathercode: 71, cloud_cover: 85, snowfall: 0.3, temperature: -1, windspeed: 6 },
  snow: { weathercode: 73, cloud_cover: 90, snowfall: 2, temperature: -2, windspeed: 10 },
  snowHeavy: { weathercode: 75, cloud_cover: 100, snowfall: 5, temperature: -4, windspeed: 26, winddirection: 290 },
  grains: { weathercode: 77, cloud_cover: 90, snowfall: 0.2, temperature: -3, windspeed: 8 },
  fog: { weathercode: 45, cloud_cover: 100, temperature: 6, windspeed: 3 },
  rimeFog: { weathercode: 48, cloud_cover: 100, temperature: -3, windspeed: 2 },
  storm: { weathercode: 82, cloud_cover: 100, showers: 12, temperature: 12, windspeed: 55, winddirection: 270, wind_gusts: 95 },
};

/** Applies the test overrides to the real weather (or to a made-up one if none was loaded). */
export function applyWeatherDebug(live: WeatherType | null, debug: DebugOptions | undefined, hour: number): WeatherType | null {
  if (!debug) return live;
  const preset = debug.weather === 'live' ? null : WEATHER_PRESETS[debug.weather];
  if (!preset && debug.dayNight === 'auto') return live;

  const base: WeatherType = live ?? { ...BASE_WEATHER, time: '' };
  const merged: WeatherType = { ...base, ...(preset ?? {}) };
  if (debug.dayNight === 'day') merged.is_day = 1;
  else if (debug.dayNight === 'night') merged.is_day = 0;
  else if (debug.fakeNow) merged.is_day = hour >= 6 && hour < 18 ? 1 : 0;
  return merged;
}
