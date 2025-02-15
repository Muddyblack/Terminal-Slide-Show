import { frontendConfig } from '@config/frontend.config';
import { useState, useEffect, useCallback } from 'react';

type ConnectionState = {
  isConnected: boolean;
  wasEverConnected: boolean;
  hasLostConnection: boolean;
};

export const useServerStatus = (isScheduleActive = true, pollingInterval = frontendConfig.polling.serverStatusInterval) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    wasEverConnected: false,
    hasLostConnection: false,
  });

  const handleConnectionChange = useCallback((isConnected: boolean) => {
    setConnectionState(prev => {
      // First successful connection
      if (isConnected && !prev.wasEverConnected) {
        return {
          isConnected: true,
          wasEverConnected: true,
          hasLostConnection: false,
        };
      }

      // Connection lost
      if (!isConnected && prev.wasEverConnected) {
        return {
          ...prev,
          isConnected: false,
          hasLostConnection: true,
        };
      }

      // Connection restored after loss
      if (isConnected && prev.hasLostConnection) {
        window.location.reload();
        return prev; // State will be reset on reload anyway
      }

      return { ...prev, isConnected };
    });
  }, []);

  useEffect(() => {
    if (!isScheduleActive) {
      handleConnectionChange(false);
      return;
    }

    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/server-status');
        handleConnectionChange(response.ok);
      } catch (error) {
        console.error('Failed to check server status:', error);
        handleConnectionChange(false);
      }
    };

    // Initial check with delay
    const intervalId = setInterval(checkServerStatus, pollingInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [isScheduleActive, pollingInterval, handleConnectionChange]);

  return connectionState.isConnected;
};

export default useServerStatus;