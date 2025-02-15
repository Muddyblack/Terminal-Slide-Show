import React, { createContext, useContext, PropsWithChildren } from 'react';
import { useServerStatus as useServerStatusHook } from '@/hooks/useServerStatus';

type ServerStatusContextType = {
  isConnected: boolean;
};

const ServerStatusContext = createContext<ServerStatusContextType | undefined>(undefined);

export const ServerStatusProvider: React.FC<PropsWithChildren<{ isScheduleActive?: boolean }>> = ({ 
  children, 
  isScheduleActive = true 
}) => {
  const isConnected = useServerStatusHook(isScheduleActive);

  return (
    <ServerStatusContext.Provider value={{ isConnected }}>
      {children}
    </ServerStatusContext.Provider>
  );
};

export const useServerStatus = () => {
  const context = useContext(ServerStatusContext);
  if (context === undefined) {
    throw new Error('useServerStatus must be used within a ServerStatusProvider');
  }
  return context.isConnected;
};
