/**
 * Turns the WMO weather code plus the live numbers (rain in mm, gusts) into what the screen shows:
 * a kind, a strength from 1 (light) to 3 (heavy), hail, freezing and how the wind pushes things.
 * The weather card and the full-screen weather layer both draw from this, so they always agree.
 */

export type WeatherKind = 'clear' | 'partly' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';
export type Precip = 'none' | 'drizzle' | 'rain' | 'snow' | 'grains';
export type Level = 1 | 2 | 3;

export interface WeatherState {
  kind: WeatherKind;
  level: Level;
  precip: Precip;
  /** Showers come and go: sun between the clouds in the card, gustier rain on screen */
  showers: boolean;
  /** 0: none, 1: small hail, 2: heavy hail */
  hail: 0 | 1 | 2;
  /** Freezing rain or drizzle, or rime fog: frost on the screen edges */
  freezing: boolean;
  /** Thunderstorm strength, 0 when there is none */
  thunder: 0 | Level;
  /** German description for the card (i18n weatherLabel translates it) */
  label: string;
  /** Horizontal push from -1 (to the left) to 1 (to the right) */
  windX: number;
}

export interface WeatherInput {
  code: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  windspeed?: number;
  winddirection?: number;
  gusts?: number;
}

const LEVEL_WORDS: Record<string, [string, string, string]> = {
  drizzle: ['Leichter Nieselregen', 'Nieselregen', 'Starker Nieselregen'],
  rain: ['Leichter Regen', 'Regen', 'Starker Regen'],
  showers: ['Leichte Regenschauer', 'Regenschauer', 'Heftige Regenschauer'],
  snow: ['Leichter Schneefall', 'Schneefall', 'Starker Schneefall'],
  snowShowers: ['Schneeschauer', 'Schneeschauer', 'Starke Schneeschauer'],
  thunder: ['Leichtes Gewitter', 'Gewitter', 'Schweres Gewitter'],
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Wind direction is where the wind comes from; things drift the other way. East is right. */
function windPush(speed = 0, direction = 0): number {
  const toward = ((direction + 180) * Math.PI) / 180;
  return clamp(Math.sin(toward) * Math.min(1, speed / 45), -1, 1);
}

/** Thunderstorms only come in three codes, so the strength is read from rain and gusts */
function thunderLevel(input: WeatherInput): Level {
  const water = (input.rain ?? 0) + (input.showers ?? 0);
  const gusts = input.gusts ?? 0;
  if (input.code === 99 || gusts >= 80 || water >= 15) return 3;
  if (input.code === 96 || gusts >= 55 || water >= 5) return 2;
  return 1;
}

export function describeWeather(input: WeatherInput): WeatherState {
  const base: WeatherState = {
    kind: 'clear',
    level: 1,
    precip: 'none',
    showers: false,
    hail: 0,
    freezing: false,
    thunder: 0,
    label: 'Klar',
    windX: windPush(input.windspeed, input.winddirection),
  };
  const lvl = (map: Record<number, Level>) => map[input.code] ?? 2;

  switch (input.code) {
    case 0:
      return { ...base, label: 'Klar' };
    case 1:
      return { ...base, kind: 'partly', level: 1, label: 'Heiter' };
    case 2:
      return { ...base, kind: 'partly', level: 2, label: 'Teils bewölkt' };
    case 3:
      return { ...base, kind: 'overcast', level: 2, label: 'Bedeckt' };
    case 45:
      return { ...base, kind: 'fog', level: 2, label: 'Nebel' };
    case 48:
      return { ...base, kind: 'fog', level: 3, freezing: true, label: 'Reifnebel' };
    case 51: case 53: case 55: {
      const level = lvl({ 51: 1, 53: 2, 55: 3 });
      return { ...base, kind: 'drizzle', level, precip: 'drizzle', label: LEVEL_WORDS.drizzle[level - 1] };
    }
    case 56: case 57: {
      const level = lvl({ 56: 1, 57: 3 });
      return { ...base, kind: 'drizzle', level, precip: 'drizzle', freezing: true, label: 'Gefrierender Nieselregen' };
    }
    case 61: case 63: case 65: {
      const level = lvl({ 61: 1, 63: 2, 65: 3 });
      return { ...base, kind: 'rain', level, precip: 'rain', label: LEVEL_WORDS.rain[level - 1] };
    }
    case 66: case 67: {
      const level = lvl({ 66: 1, 67: 3 });
      return { ...base, kind: 'rain', level, precip: 'rain', freezing: true, label: level === 3 ? 'Starker Eisregen' : 'Eisregen' };
    }
    case 71: case 73: case 75: {
      const level = lvl({ 71: 1, 73: 2, 75: 3 });
      return { ...base, kind: 'snow', level, precip: 'snow', label: LEVEL_WORDS.snow[level - 1] };
    }
    case 77:
      return { ...base, kind: 'snow', level: 1, precip: 'grains', label: 'Schneegriesel' };
    case 80: case 81: case 82: {
      const level = lvl({ 80: 1, 81: 2, 82: 3 });
      return { ...base, kind: 'rain', level, precip: 'rain', showers: true, label: LEVEL_WORDS.showers[level - 1] };
    }
    case 85: case 86: {
      const level = lvl({ 85: 2, 86: 3 });
      return { ...base, kind: 'snow', level, precip: 'snow', showers: true, label: LEVEL_WORDS.snowShowers[level - 1] };
    }
    case 95: case 96: case 99: {
      const level = thunderLevel(input);
      const hail = input.code === 99 ? 2 : input.code === 96 ? 1 : 0;
      const label = hail === 2 ? 'Schweres Gewitter mit Hagel' : hail === 1 ? 'Gewitter mit Hagel' : LEVEL_WORDS.thunder[level - 1];
      return { ...base, kind: 'thunder', level, precip: 'rain', hail, thunder: level, label };
    }
    default:
      return base;
  }
}
