export class DateParser {
  static parseFileName(filename) {
    const patterns = [
      // Original patterns with full dates
      /(\d{1,2})[-._](\d{1,2})[-._](\d{2,4})@(\d{1,2})[-._](\d{1,2})[-._](\d{2,4})/, // dd.mm.yyyy@dd.mm.yyyy
      /(\d{1,2})[-._](\d{1,2})[-._](\d{2,4})(?:T(\d+))?/, // dd.mm.yyyy
      // New patterns without year
      /(\d{1,2})[-._](\d{1,2})@(\d{1,2})[-._](\d{1,2})/, // dd.mm@dd.mm
      /(\d{1,2})[-._](\d{1,2})/ // dd.mm
    ];

    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (!match) continue;

      try {
        if (match[0].includes('@')) {
          // Pattern with start and end dates
          if (match.length === 7) {
            // Full dates with years
            const startDate = DateParser.createDate(match[1], match[2], match[3]);
            const endDate = DateParser.createDate(match[4], match[5], match[6]);
            return { startDate, endDate };
          } else {
            // Dates without years
            const currentYear = new Date().getUTCFullYear().toString();
            const startDate = DateParser.createDate(match[1], match[2], currentYear);
            const endDate = DateParser.createDate(match[3], match[4], currentYear);
            return { startDate, endDate };
          }
        } else {
          // Single date pattern
          const currentYear = new Date().getUTCFullYear().toString();
          const year = match[3] || currentYear;
          const startDate = DateParser.createDate(match[1], match[2], year);
          return { startDate, endDate: null };
        }
      } catch (error) {
        console.warn(`Invalid date in filename: ${filename}`, error);
        continue;
      }
    }
    return null;
  }

  static createDate(day, month, year) {
    const normalizedYear = year.length === 2 ? '20' + year : year;
    
    // Create a UTC date by explicitly setting UTC components
    const date = new Date(Date.UTC(
      parseInt(normalizedYear),
      parseInt(month) - 1, // Months are 0-based in JavaScript
      parseInt(day),
      0, // Hours
      0, // Minutes
      0, // Seconds
      0  // Milliseconds
    ));

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    return date;
  }
}