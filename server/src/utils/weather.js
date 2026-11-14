const CURRENT_FIELDS = [
  'temperature_2m', 'is_day', 'rain', 'showers', 'snowfall', 'weather_code',
  'cloud_cover', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'
];

/**
 * Builds the Open-Meteo forecast URL for a position.
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {number} [options.elevation] - Metres above sea level; Open-Meteo corrects the temperature for it
 * @param {string} [options.timezone='auto']
 * @param {'metric'|'imperial'} [options.units='metric']
 * @returns {string}
 */
export function forecastUrl({ latitude, longitude, elevation, timezone = 'auto', units = 'metric' }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: CURRENT_FIELDS.join(','),
    timezone,
    forecast_days: '1',
  });

  if (Number.isFinite(elevation)) params.set('elevation', String(elevation));

  if (units === 'imperial') {
    params.set('temperature_unit', 'fahrenheit');
    params.set('wind_speed_unit', 'mph');
    params.set('precipitation_unit', 'inch');
  }

  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/**
 * True when the configured position is usable, so no geocoding lookup is needed.
 * @param {{latitude?: unknown, longitude?: unknown}} info
 */
export function hasCoordinates(info) {
  return Number.isFinite(info?.latitude) && Number.isFinite(info?.longitude);
}
