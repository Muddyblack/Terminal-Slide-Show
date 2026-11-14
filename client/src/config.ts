import { frontendConfig as defaults, type FrontendConfig } from '@config/frontend.config';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K] };

declare global {
  interface Window {
    /** Per-device settings served by the backend at /config.js */
    __SLIDESHOW_CONFIG__?: DeepPartial<FrontendConfig>;
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const merge = <T extends Record<string, unknown>>(base: T, override: unknown): T => {
  if (!isPlainObject(override)) return base;

  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = isPlainObject(value) && isPlainObject(base[key])
      ? merge(base[key] as Record<string, unknown>, value)
      : value;
  }
  return result as T;
};

/**
 * Built-in defaults, overridden by the device-specific values the backend
 * serves at /config.js. Falls back to the defaults if that script is missing.
 */
export const frontendConfig: FrontendConfig = merge(
  defaults as unknown as Record<string, unknown>,
  typeof window === 'undefined' ? undefined : window.__SLIDESHOW_CONFIG__
) as unknown as FrontendConfig;
