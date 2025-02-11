import { DateParser } from './dateParser.js';

/**
 * Validates if a filename's embedded dates are valid for current display
 * @param {string} filename - Filename to validate (e.g., "01-01-2024.jpg" or "01-01@31-12.jpg")
 * @returns {boolean} True if file should be displayed based on current date
 * 
 * @example
 * // Single date file (must be today)
 * isValidFile("25-03-2024.jpg") // true if today is March 25, 2024
 * 
 * @example
 * // Date range
 * isValidFile("01-01-2024@31-12-2024.jpg") // true if current date is within 2024
 */
export function isValidFile(filename) {
    const parsedDate = DateParser.parseFileName(filename);
    if (!parsedDate || !parsedDate.startDate) {
        return false;
    }

    const now = new Date();
    const { startDate, endDate } = parsedDate;

    // Helper to compare only dates, ignoring time
    const isSameDay = (date1, date2) => {
        if (!date1 || !date2) return false;
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    };

    if (!startDate || (startDate > now && !isSameDay(startDate, now))) {
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