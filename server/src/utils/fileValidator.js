import { DateParser } from './dateParser.js';

/**
 * Checks if the given time falls inside a daily window.
 * Windows that cross midnight (e.g. 22h-2h) are supported.
 */
function isInTimeWindow({ startMinutes, endMinutes }, now) {
    const current = now.getHours() * 60 + now.getMinutes();
    if (startMinutes <= endMinutes) {
        return current >= startMinutes && current < endMinutes;
    }
    return current >= startMinutes || current < endMinutes;
}

/**
 * Validates if a filename's embedded dates are valid for current display
 * @param {string} filename - Filename to validate (e.g., "01-01-2024.jpg" or "01-01@31-12.jpg")
 * @param {Object} [options]
 * @param {boolean} [options.ignoreTime=false] - Skip the daily time window check (e.g. when syncing files ahead of time)
 * @returns {boolean} True if file should be displayed based on current date and time
 * 
 * @example
 * // Single date file (must be today)
 * isValidFile("25-03-2024.jpg") // true if today is March 25, 2024
 * 
 * @example
 * // Date range
 * isValidFile("01-01-2024@31-12-2024.jpg") // true if current date is within 2024
 */
export function isValidFile(filename, { ignoreTime = false } = {}) {
    const { startDate, endDate, timeWindow } = DateParser.parseFileName(filename);
    const now = new Date();

    if (timeWindow && !ignoreTime && !isInTimeWindow(timeWindow, now)) {
        return false;
    }

    // A time window without a date applies every day
    if (!startDate) {
        return Boolean(timeWindow);
    }

    // Helper to compare only dates, ignoring time
    const isSameDay = (date1, date2) => {
        if (!date1 || !date2) return false;
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    };

    if (startDate > now && !isSameDay(startDate, now)) {
        return false;
    }

    if (endDate && endDate < now && !isSameDay(endDate, now)) {
        return false;
    }

    // For single-date files (no end date),
    // ensure the start date matches today's date
    if (!endDate) {
        return isSameDay(startDate, now);
    }

    return true;
}