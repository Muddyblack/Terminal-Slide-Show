import { WeatherType } from '@/components/dynamic_daily_view/types';

/**
 * Overrides the /test page feeds into the daily view. Production never passes any,
 * so the view behaves exactly as before.
 */
export type PictureSource = 'auto' | 'occasion' | 'nasa' | 'region' | 'potd' | 'none';
export type DayNight = 'auto' | 'day' | 'night';
export type WeatherPreset = 'live' | 'clear' | 'cloudy' | 'rain' | 'thunder' | 'snow' | 'fog';

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

/** WMO weather codes with matching numbers, see animatedWeather.tsx */
export const WEATHER_PRESETS: Record<Exclude<WeatherPreset, 'live'>, Partial<WeatherType>> = {
  clear: { weathercode: 0, cloud_cover: 5, temperature: 22 },
  cloudy: { weathercode: 3, cloud_cover: 90, temperature: 14 },
  rain: { weathercode: 63, cloud_cover: 95, rain: 2.5, temperature: 9, windspeed: 16 },
  thunder: { weathercode: 95, cloud_cover: 100, rain: 6, showers: 3, wind_gusts: 60, windspeed: 30, temperature: 17 },
  snow: { weathercode: 73, cloud_cover: 90, snowfall: 2, temperature: -2, windspeed: 10 },
  fog: { weathercode: 45, cloud_cover: 100, temperature: 6, windspeed: 3 },
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
