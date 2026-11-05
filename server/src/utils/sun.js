/**
 * Sunrise and sunset computed locally (NOAA / Almanac algorithm), so no network is needed.
 * Accurate to a few minutes, which is plenty for a display.
 */

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const mod = (a, n) => ((a % n) + n) % n;

function eventTime(year, month, day, lat, lon, rising) {
    const start = Date.UTC(year, 0, 0);
    const dayOfYear = Math.floor((Date.UTC(year, month - 1, day) - start) / 86400000);
    const lngHour = lon / 15;
    const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    const L = mod(M + 1.916 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 282.634, 360);
    let RA = mod(deg(Math.atan(0.91764 * Math.tan(rad(L)))), 360);
    RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
    RA /= 15;
    const sinDec = 0.39782 * Math.sin(rad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(rad(90.833)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)));
    if (cosH > 1 || cosH < -1) return null; // polar night or midnight sun
    const H = (rising ? 360 - deg(Math.acos(cosH)) : deg(Math.acos(cosH))) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    const UT = mod(T - lngHour, 24);
    return new Date(Date.UTC(year, month - 1, day) + UT * 3600000);
}

/**
 * @returns {{sunrise: Date|null, sunset: Date|null}}
 */
export function sunTimes(date, lat, lon) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return { sunrise: eventTime(y, m, d, lat, lon, true), sunset: eventTime(y, m, d, lat, lon, false) };
}

/** Formats a Date as HH:MM in a time zone */
export function clock(date, timeZone) {
    return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone }).format(date);
}
