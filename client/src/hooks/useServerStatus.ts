import { frontendConfig } from '@config/frontend.config';
import { useState, useEffect } from 'react';

/**
 * Custom hook to monitor server connection status with periodic polling
 * @param {boolean} isScheduleActive - Whether the schedule is currently active
 * @param {number} [pollingInterval=frontendConfig.polling.serverStatusInterval] - Interval in ms between status checks
 * @returns {boolean} Current server connection status
 */
export const useServerStatus = (isScheduleActive = true, pollingInterval = frontendConfig.polling.serverStatusInterval) => {
  const [isServerConnected, setIsServerConnected] = useState(false);

  useEffect(() => {
    // Reset connection status when schedule becomes inactive
    if (!isScheduleActive) {
      setIsServerConnected(false);
      return;
    }

    /**
     * Checks server status via API endpoint
     * @async
     * @function
     */
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/server-status');
        if (response.ok) {
          setIsServerConnected(true);
        } else {
          setIsServerConnected(false);
        }
      } catch (error) {
        console.error('Failed to check server status:', error);
        setIsServerConnected(false);
      }
    };

    // Initial check
    checkServerStatus();

    // Set up periodic polling only if schedule is active
    const intervalId = setInterval(checkServerStatus, pollingInterval);

    // Cleanup interval on unmount or when schedule becomes inactive
    return () => clearInterval(intervalId);
  }, [pollingInterval, isScheduleActive]);

  return isServerConnected;
};

export default useServerStatus;