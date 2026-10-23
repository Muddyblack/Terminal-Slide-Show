import { frontendConfig } from '@/config';

const strings = {
  de: {
    connecting: 'Verbindung zum Server...',
    loadingMedia: 'Medien werden geladen...',
    connectionLost: 'Verbindung verloren ...',
    offline: 'Offline-Modus – zwischengespeicherte Daten',
    loadingQuote: 'Lädt Zitat...',
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
