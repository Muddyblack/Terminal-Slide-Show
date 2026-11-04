/**
 * Seasonal and holiday occasions for the daily view.
 * Everything is computed locally from the date, so it needs no network and cannot break.
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

/** First Advent: the fourth Sunday before Christmas Day */
function firstAdvent(year) {
    const christmas = new Date(Date.UTC(year, 11, 25));
    const weekday = christmas.getUTCDay(); // 0 = Sunday
    const lastSunday = utc(year, 12, 25) - (weekday === 0 ? 7 : weekday) * DAY;
    return lastSunday - 3 * 7 * DAY;
}

const ADVENT_NAMES = ['1. Advent', '2. Advent', '3. Advent', '4. Advent'];

const make = (id, title, text, theme, particle) => ({ id, title, text, theme, particle });

/**
 * Every occasion runs for a window around its day: `before` days ahead of it and `after` days after.
 * `de: true` marks holidays that only exist in Germany. When windows overlap, the occasion whose
 * own day is closest wins, so the big days still beat the long seasons.
 */
function buildOccasions(y) {
    const easter = easterSunday(y).getTime();
    const advent = firstAdvent(y);
    const fixed = (m, d) => utc(y, m, d);
    return [
        { ...make('newyear', 'Frohes neues Jahr!', 'Auf ein gutes Jahr voller Projekte.', 'newyear', 'spark'), at: fixed(1, 1), before: 0, after: 3 },
        { ...make('silvester', 'Guten Rutsch!', 'Das Jahr geht zu Ende. Feuerwerk statt Code.', 'newyear', 'spark'), at: fixed(12, 31), before: 3, after: 0 },
        { ...make('christmas', 'Frohe Weihnachten!', 'Schöne Feiertage und erholsame Tage.', 'christmas', 'snow'), at: fixed(12, 24), before: 1, after: 2 },
        { ...make('nikolaus', 'Nikolaustag', 'Stiefel raus, heute gibt es etwas Süßes.', 'christmas', 'snow'), at: fixed(12, 6), before: 1, after: 0 },
        { ...make('advent', 'Adventszeit', 'Plätzchen, Glühwein und Lichterglanz.', 'christmas', 'snow'), at: advent, before: 0, after: fixed(12, 23) / DAY - advent / DAY },
        { ...make('martin', 'Sankt Martin', 'Laternen, Weckmänner und Martinsumzüge.', 'autumn', 'leaf'), at: fixed(11, 11), before: 1, after: 0 },
        { ...make('halloween', 'Halloween & Reformationstag', 'Süßes oder Saures?', 'halloween', 'bat'), at: fixed(10, 31), before: 6, after: 0 },
        { ...make('valentine', 'Valentinstag', 'Ein nettes Wort kostet nichts.', 'spring', 'petal'), at: fixed(2, 14), before: 0, after: 0 },
        { ...make('mauerfall', 'Mauerfall', 'Am 9. November 1989 öffnete sich die Berliner Mauer.', 'unity', 'spark'), at: fixed(11, 9), before: 0, after: 0, de: true },
        { ...make('unity', 'Tag der Deutschen Einheit', 'Seit dem 3. Oktober 1990 sind Ost und West wieder ein Land.', 'unity', 'spark'), at: fixed(10, 3), before: 2, after: 0, de: true },
        { ...make('maifeiertag', 'Tag der Arbeit', 'Heute ist frei, genieße den Mai.', 'spring', 'petal'), at: fixed(5, 1), before: 0, after: 0, de: true },
        { ...make('easter', 'Frohe Ostern!', 'Viel Spaß bei der Eiersuche.', 'easter', 'egg'), at: easter, before: 9, after: 1 },
        { ...make('himmelfahrt', 'Christi Himmelfahrt', 'Vatertag und lange Ausflüge.', 'spring', 'petal'), at: easter + 39 * DAY, before: 0, after: 0 },
        { ...make('pfingsten', 'Pfingsten', 'Ein Wochenende zum Durchatmen.', 'spring', 'petal'), at: easter + 49 * DAY, before: 0, after: 1 },
        { ...make('fasnet', 'Fasnet', 'Narri, Narro! Die närrischen Tage sind da.', 'carnival', 'confetti'), at: easter - 47 * DAY, before: 5, after: 0 },
        // Seasons: long windows, lowest priority because their "day" is far away
        { ...make('goldenoctober', 'Goldener Oktober', 'Bunte Blätter und klare Luft am See.', 'autumn', 'leaf'), at: fixed(10, 15), before: 14, after: 16, season: true },
        { ...make('november', 'Novembergrau', 'Zeit für Tee und Projektarbeit.', 'autumn', 'leaf'), at: fixed(11, 15), before: 14, after: 14, season: true },
        { ...make('winter', 'Winterzeit', 'Warm anziehen, es ist kalt draußen.', 'winter', 'snow'), at: fixed(1, 20), before: 50, after: 40, season: true },
        { ...make('winter', 'Winterzeit', 'Warm anziehen, es ist kalt draußen.', 'winter', 'snow'), at: fixed(12, 20), before: 10, after: 11, season: true },
    ];
}

/**
 * @param {Date} date - the day to look at (its local Y/M/D is used)
 * @param {{country?: string, enabled?: boolean, disabled?: string[]}} [options]
 *   country: ISO code, Germany-only holidays are skipped unless it is DE.
 *   enabled: false turns all occasions off. disabled: ids to turn off.
 * @returns {{id:string,title:string,text:string,theme:string,particle:string}|null}
 */
export function getOccasion(date = new Date(), options = {}) {
    const { country = 'DE', enabled = true, disabled = [] } = typeof options === 'string' ? { country: options } : options;
    if (!enabled) return null;

    const today = utc(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const de = String(country).toUpperCase() === 'DE';
    // Windows of the previous and next year matter around New Year
    const years = [date.getFullYear() - 1, date.getFullYear(), date.getFullYear() + 1];

    let best = null;
    for (const y of years) {
        for (const occ of buildOccasions(y)) {
            if (occ.de && !de) continue;
            if (disabled.includes(occ.id)) continue;
            const from = occ.at - occ.before * DAY;
            const to = occ.at + occ.after * DAY;
            if (today < from || today > to) continue;
            // Seasons lose against real days; otherwise the closer day wins
            const score = (occ.season ? 1000 : 0) + Math.abs(today - occ.at) / DAY;
            if (!best || score < best.score) best = { occ, score, at: occ.at };
        }
    }
    if (!best) return null;

    const { at, before, after, de: _de, season: _s, ...out } = best.occ;
    // Advent Sundays get their own title
    if (out.id === 'advent' && date.getDay() === 0) {
        const week = Math.floor((today - at) / (7 * DAY));
        return { ...out, title: ADVENT_NAMES[week], text: 'Heute brennt die nächste Kerze.' };
    }
    if (out.id === 'christmas' && today !== at) {
        const day = Math.round((today - at) / DAY);
        if (day === 1) return { ...out, title: 'Erster Weihnachtsfeiertag' };
        if (day === 2) return { ...out, title: 'Zweiter Weihnachtsfeiertag' };
        if (day < 0) return { ...out, title: 'Bald ist Weihnachten', text: 'Noch einmal schlafen.' };
    }
    return out;
}
