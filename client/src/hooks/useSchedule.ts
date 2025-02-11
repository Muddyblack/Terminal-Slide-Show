import { frontendConfig } from '@config/frontend.config';
import { useState, useEffect } from 'react';

/**
 * Custom hook to manage schedule-based activation states
 * Handles vacation periods, daily schedules, and time windows
 * @returns {boolean} Current activation state based on schedule
 */
export const useSchedule = () => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!frontendConfig.schedule.enabled) {
      setIsActive(true);
      return;
    }

    /**
     * Checks if given date falls within configured vacation periods
     * @param {Date} date - Date to check
     * @returns {boolean} True if date is in vacation period
     */
    const isDateInVacationPeriod = (date: Date): boolean => {
      if (!frontendConfig.schedule.vacationPeriods?.length) return false;

      return frontendConfig.schedule.vacationPeriods.some(period => {
        const [startDay, startMonth, startYear] = period.start.split('.').map(Number);
        const [endDay, endMonth, endYear] = period.end.split('.').map(Number);

        const startDate = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(endYear, endMonth - 1, endDay);

        return date >= startDate && date <= endDate;
      });
    };

    const convertToCustomDayNumber = (javascriptDay: number): number => {
      return javascriptDay === 0 ? 7 : javascriptDay;
    };
  

    /**
     * Evaluates current schedule state based on time and configuration
     * @function
     */
    const checkSchedule = () => {
      const now = new Date();

      if (isDateInVacationPeriod(now)) {
        setIsActive(false);
        return;
      }

      const jsDay = now.getDay();
      const currentDay = convertToCustomDayNumber(jsDay);
  
      if (!frontendConfig.schedule.days.includes(currentDay)) {
          setIsActive(false);
          return;
      }

      // Parse schedule times
      const [onHour, onMinute] = frontendConfig.schedule.onTime.split(':').map(Number);
      const [offHour, offMinute] = frontendConfig.schedule.offTime.split(':').map(Number);

      // Convert current time to minutes for easier comparison
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const onTimeMinutes = onHour * 60 + onMinute;
      const offTimeMinutes = offHour * 60 + offMinute;

      // Handle cases where off time is on the next day
      if (offTimeMinutes < onTimeMinutes) {
        setIsActive(
          currentMinutes >= onTimeMinutes ||
          currentMinutes < offTimeMinutes
        );
      } else {
        setIsActive(
          currentMinutes >= onTimeMinutes &&
          currentMinutes < offTimeMinutes
        );
      }
    };

    // Initial schedule check
    checkSchedule();

    // Check schedule every minute
    const interval = setInterval(checkSchedule, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  return isActive;
};