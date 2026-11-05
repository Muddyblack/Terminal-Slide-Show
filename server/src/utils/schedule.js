/**
 * Parses a 'DD.MM.YYYY' (or 'DD-MM-YYYY') date into a local Date at midnight.
 * @param {string} value
 * @returns {Date}
 */
function parseDate(value) {
  const [day, month, year] = value.split(/[.-]/).map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Decides whether the display should be on at the given time.
 * Same rules as the browser: vacation periods (inclusive, whole days), weekdays
 * (1 = Monday ... 7 = Sunday) and a daily on/off window that may cross midnight.
 * @param {Object} schedule - config.schedule
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isOperatingNow(schedule, now = new Date()) {
  if (!schedule?.enabled) return true;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const onVacation = (schedule.vacationPeriods ?? []).some(({ start, end }) =>
    startOfToday >= parseDate(start) && startOfToday <= parseDate(end));
  if (onVacation) return false;

  const day = now.getDay() === 0 ? 7 : now.getDay();
  if (!schedule.days.includes(day)) return false;

  const toMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const current = now.getHours() * 60 + now.getMinutes();
  const on = toMinutes(schedule.onTime);
  const off = toMinutes(schedule.offTime);

  return off < on
    ? current >= on || current < off
    : current >= on && current < off;
}
