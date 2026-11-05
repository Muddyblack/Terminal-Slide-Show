/**
 * Seasonal and holiday occasions for the daily view.
 * Everything is computed locally from the date, so it needs no network and cannot break.
 * Movable feasts are never stored as dates: they are derived every year from Easter Sunday
 * or the first Advent, so they stay right in every year.
 * Holidays that only exist in Germany are skipped for other countries.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Easter Sunday (Gauss algorithm), as a UTC-midnight Date */
export function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
}

const utc = (y, m, d) => Date.UTC(y, m - 1, d);

/** First Advent: the fourth Sunday before Christmas Day, as UTC milliseconds */
export function firstAdvent(year) {
    const weekday = new Date(utc(year, 12, 25)).getUTCDay(); // 0 = Sunday
    const lastSunday = utc(year, 12, 25) - (weekday === 0 ? 7 : weekday) * DAY;
    return lastSunday - 3 * 7 * DAY;
}

/**
 * A day of the year `y`, written as
 *   "MM-DD"        fixed date, e.g. "12-24"
 *   "easter+39"    days after Easter Sunday (Himmelfahrt); "easter-47" is Fasnetsdienstag
 *   "advent+7"     days after the first Advent (2. Advent)
 * @returns {number|null} UTC milliseconds, or null if it cannot be read
 */
export function resolveDate(spec, y) {
    const text = String(spec ?? '').replace(/\s+/g, '').toLowerCase();
    const fixed = /^(\d{1,2})-(\d{1,2})$/.exec(text);
    if (fixed) {
        const [m, d] = [Number(fixed[1]), Number(fixed[2])];
        return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? utc(y, m, d) : null;
    }
    const relative = /^(easter|advent)([+-]\d+)?$/.exec(text);
    if (!relative) return null;
    const base = relative[1] === 'easter' ? easterSunday(y).getTime() : firstAdvent(y);
    return base + Number(relative[2] ?? 0) * DAY;
}

/**
 * The built-in occasions. Each one is shown from `before` days ahead of its `date` until `after`
 * days later; the rest of the year the screen stays plain. `de: true`: only in Germany.
 * config/occasions.json can change any of these fields or add more occasions (see the example file).
 */
export const DEFAULT_OCCASIONS = [
    { id: 'newyear', date: '01-01', before: 0, after: 10, title: 'Frohes neues Jahr!', text: 'Auf ein gutes Jahr voller Projekte.', theme: 'newyear', particle: 'spark' },
    // Schwäbisch-alemannische Fasnet: Schmotziger Dunschtig (easter-52) to Fasnetsdienstag (easter-47)
    { id: 'fasnet', date: 'easter-47', before: 5, after: 0, title: 'Fasnet', text: 'Narri, Narro! Die närrischen Tage sind da.', theme: 'carnival', particle: 'confetti' },
    { id: 'valentine', date: '02-14', before: 0, after: 0, title: 'Valentinstag', text: 'Ein nettes Wort kostet nichts.', theme: 'spring', particle: 'petal' },
    // Karfreitag to Ostermontag
    { id: 'easter', date: 'easter', before: 2, after: 1, title: 'Frohe Ostern!', text: 'Viel Spaß bei der Eiersuche.', theme: 'easter', particle: 'petal' },
    { id: 'maifeiertag', date: '05-01', before: 0, after: 0, title: 'Tag der Arbeit', text: 'Heute ist frei, genieße den Mai.', theme: 'spring', particle: 'petal', de: true },
    { id: 'himmelfahrt', date: 'easter+39', before: 0, after: 0, title: 'Christi Himmelfahrt', text: 'Vatertag und lange Ausflüge.', theme: 'spring', particle: 'petal' },
    { id: 'pfingsten', date: 'easter+49', before: 0, after: 1, title: 'Pfingsten', text: 'Ein Wochenende zum Durchatmen.', theme: 'spring', particle: 'petal' },
    { id: 'unity', date: '10-03', before: 2, after: 2, title: 'Tag der Deutschen Einheit', text: 'Seit dem 3. Oktober 1990 sind Ost und West wieder ein Land.', theme: 'unity', particle: 'spark', de: true },
    { id: 'goldenoctober', date: '10-16', before: 3, after: 3, title: 'Goldener Oktober', text: 'Bunte Blätter und klare Luft am See.', theme: 'autumn', particle: 'leaf' },
    { id: 'halloween', date: '10-31', before: 6, after: 0, title: 'Halloween & Reformationstag', text: 'Süßes oder Saures?', theme: 'halloween', particle: 'bat' },
    { id: 'mauerfall', date: '11-09', before: 0, after: 0, title: 'Mauerfall', text: 'Am 9. November 1989 öffnete sich die Berliner Mauer.', theme: 'unity', particle: 'spark', de: true },
    { id: 'martin', date: '11-11', before: 1, after: 0, title: 'Sankt Martin', text: 'Laternen, Weckmänner und Martinsumzüge.', theme: 'autumn', particle: 'leaf' },
    // Advent: only its four Sundays (four entries, one id)
    ...['1. Advent', '2. Advent', '3. Advent', '4. Advent'].map((title, week) => (
        { id: 'advent', date: `advent+${week * 7}`, before: 0, after: 0, title, text: 'Heute brennt die nächste Kerze.', theme: 'christmas', particle: 'snow' }
    )),
    { id: 'nikolaus', date: '12-06', before: 1, after: 0, title: 'Nikolaustag', text: 'Stiefel raus, heute gibt es etwas Süßes.', theme: 'christmas', particle: 'snow' },
    { id: 'christmas', date: '12-24', before: 6, after: 2, title: 'Frohe Weihnachten!', text: 'Schöne Feiertage und erholsame Tage.', theme: 'christmas', particle: 'snow' },
    { id: 'silvester', date: '12-31', before: 3, after: 0, title: 'Guten Rutsch!', text: 'Das Jahr geht zu Ende. Feuerwerk statt Code.', theme: 'newyear', particle: 'spark' },
];

/** Days before/after: whole numbers from 0 to 60, anything else keeps the fallback */
const dayCount = (value, fallback) => (Number.isInteger(value) && value >= 0 && value <= 60 ? value : fallback);

const pickText = (value, fallback) => (typeof value === 'string' && value.trim() ? value : fallback);

/**
 * Built-in occasions with the user's changes applied, plus the user's own ones.
 * Fields the user leaves out keep their default.
 */
function occasionSpecs({ override = {}, custom = [] }) {
    const merge = (base, change = {}) => ({
        ...base,
        date: change.date ?? base.date,
        before: dayCount(change.before, base.before),
        after: dayCount(change.after, base.after),
        title: pickText(change.title, base.title),
        text: pickText(change.text, base.text),
        theme: pickText(change.theme, base.theme),
        particle: pickText(change.particle, base.particle),
        // the special Christmas titles only replace the default title
        customTitle: Boolean(change.title) || base.customTitle,
    });
    const builtIn = DEFAULT_OCCASIONS.map((occ) => merge(occ, override[occ.id]));
    const own = (Array.isArray(custom) ? custom : [])
        .filter((occ) => occ && typeof occ.id === 'string' && occ.date && occ.title)
        .map((occ) => merge({ id: occ.id, before: 0, after: 0, text: '', theme: 'custom', particle: 'spark', customTitle: true }, occ));
    return [...builtIn, ...own];
}

/** Every occasion of one year with its own day (`at`), in UTC milliseconds */
function buildOccasions(y, options) {
    return occasionSpecs(options)
        .map((occ) => ({ ...occ, at: resolveDate(occ.date, y) }))
        .filter((occ) => occ.at !== null);
}

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Options as the config passes them, or just a country code */
const readOptions = (options) => {
    const { country = 'DE', enabled = true, disabled = [], override = {}, custom = [] } =
        typeof options === 'string' ? { country: options } : options;
    return {
        enabled,
        disabled,
        override: override && typeof override === 'object' ? override : {},
        custom,
        de: String(country).toUpperCase() === 'DE',
    };
};

const shownHere = (occ, { de, disabled }) => (de || !occ.de) && !disabled.includes(occ.id);

/**
 * Every occasion of a year with the days it is on screen, sorted by date. For the test page.
 * @returns {{id:string,title:string,theme:string,day:string,from:string,to:string}[]}
 */
export function listOccasions(year, options = {}) {
    const opts = readOptions(options);
    if (!opts.enabled) return [];
    return buildOccasions(year, opts)
        .filter((occ) => shownHere(occ, opts))
        .map((occ) => ({
            id: occ.id,
            title: occ.title,
            theme: occ.theme,
            day: isoDay(occ.at),
            from: isoDay(occ.at - occ.before * DAY),
            to: isoDay(occ.at + occ.after * DAY),
        }))
        .sort((a, b) => a.from.localeCompare(b.from));
}

/**
 * @param {Date} date - the day to look at (its local Y/M/D is used)
 * @param {{country?: string, enabled?: boolean, disabled?: string[], override?: object, custom?: object[]}} [options]
 *   country: ISO code, Germany-only holidays are skipped unless it is DE.
 *   enabled: false turns all occasions off. disabled: ids to turn off.
 *   override: changes per built-in id, e.g. { newyear: { after: 10 } }. custom: own occasions.
 * @returns {{id:string,title:string,text:string,theme:string,particle:string,day:string}|null}
 */
export function getOccasion(date = new Date(), options = {}) {
    const opts = readOptions(options);
    if (!opts.enabled) return null;

    const today = utc(date.getFullYear(), date.getMonth() + 1, date.getDate());
    // Windows of the previous and next year matter around New Year
    const years = [date.getFullYear() - 1, date.getFullYear(), date.getFullYear() + 1];

    let best = null;
    for (const y of years) {
        for (const occ of buildOccasions(y, opts)) {
            if (!shownHere(occ, opts)) continue;
            if (today < occ.at - occ.before * DAY || today > occ.at + occ.after * DAY) continue;
            // When windows overlap, the closer day wins. On a tie the one listed later wins:
            // Christmas over the 4th Advent, Nikolaus over the 2nd, own occasions over built-in ones.
            const score = Math.abs(today - occ.at) / DAY;
            if (!best || score <= best.score) best = { occ, score };
        }
    }
    if (!best) return null;

    const { id, title, text, theme, particle, at, customTitle } = best.occ;
    // `day` is the occasion's own date (YYYY-MM-DD) for the countdown on screen
    const out = { id, title, text, theme, particle, day: isoDay(at) };
    if (id === 'christmas' && today !== at && !customTitle) {
        const offset = Math.round((today - at) / DAY);
        if (offset === 1) return { ...out, title: 'Erster Weihnachtsfeiertag' };
        if (offset === 2) return { ...out, title: 'Zweiter Weihnachtsfeiertag' };
        if (offset === -1) return { ...out, title: 'Bald ist Weihnachten', text: 'Noch einmal schlafen.' };
        if (offset < 0) return { ...out, title: 'Bald ist Weihnachten', text: 'Die letzte Woche vor dem Fest.' };
    }
    return out;
}
