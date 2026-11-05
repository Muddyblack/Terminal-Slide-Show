import { frontendConfig } from '@/config';

const strings = {
  de: {
    connecting: 'Verbindung zum Server...',
    loadingMedia: 'Medien werden geladen...',
    connectionLost: 'Verbindung verloren ...',
    offline: 'Offline-Modus – zwischengespeicherte Daten',
    loadingQuote: 'Lädt Zitat...',
    didYouKnow: 'Wusstest du?',
    rain: 'Regen',
    showers: 'Schauer',
    snow: 'Schnee',
  },
  en: {
    connecting: 'Connecting to server...',
    loadingMedia: 'Loading media...',
    connectionLost: 'Connection Lost ...',
    offline: 'Offline Mode - Using Cached Data',
    loadingQuote: 'Loading quote...',
    didYouKnow: 'Did you know?',
    rain: 'Rain',
    showers: 'Showers',
    snow: 'Snow',
  },
} as const;

export type TextKey = keyof typeof strings.en;

/** UI text in the configured language (falls back to German like the bundled content). */
export const t = (key: TextKey): string => {
  const language = frontendConfig.locale.language as keyof typeof strings;
  return (strings[language] ?? strings.de)[key];
};

/** Locale tag for date and time formatting */
export const dateLocale = (): string => (frontendConfig.locale.language === 'en' ? 'en-GB' : 'de-DE');

/** Display units for the weather */
export const weatherUnits = () =>
  frontendConfig.locale.units === 'imperial'
    ? { temperature: '°F', wind: 'mph', rain: 'in', snow: 'in' }
    : { temperature: '°C', wind: 'km/h', rain: 'mm', snow: 'cm' };

/** English names for the German weather descriptions from weatherModel */
const WEATHER_LABELS_EN: Record<string, string> = {
  'Klar': 'Clear',
  'Heiter': 'Mostly clear',
  'Teils bewölkt': 'Partly cloudy',
  'Bedeckt': 'Overcast',
  'Nebel': 'Fog',
  'Reifnebel': 'Freezing fog',
  'Leichter Nieselregen': 'Light drizzle',
  'Nieselregen': 'Drizzle',
  'Starker Nieselregen': 'Heavy drizzle',
  'Gefrierender Nieselregen': 'Freezing drizzle',
  'Leichter Regen': 'Light rain',
  'Regen': 'Rain',
  'Starker Regen': 'Heavy rain',
  'Eisregen': 'Freezing rain',
  'Starker Eisregen': 'Heavy freezing rain',
  'Leichter Schneefall': 'Light snow',
  'Schneefall': 'Snow',
  'Starker Schneefall': 'Heavy snow',
  'Schneegriesel': 'Snow grains',
  'Leichte Regenschauer': 'Light showers',
  'Regenschauer': 'Showers',
  'Heftige Regenschauer': 'Heavy showers',
  'Schneeschauer': 'Snow showers',
  'Starke Schneeschauer': 'Heavy snow showers',
  'Leichtes Gewitter': 'Light thunderstorm',
  'Gewitter': 'Thunderstorm',
  'Schweres Gewitter': 'Severe thunderstorm',
  'Gewitter mit Hagel': 'Thunderstorm with hail',
  'Schweres Gewitter mit Hagel': 'Severe thunderstorm with hail',
};

/** A weather description from weatherModel in the configured language */
export const weatherLabel = (label: string): string =>
  frontendConfig.locale.language === 'en' ? (WEATHER_LABELS_EN[label] ?? label) : label;
