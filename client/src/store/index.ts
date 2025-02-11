import { create } from 'zustand';

import { AppState } from '@/types';

const useStore = create<AppState>((set) => ({
  containers: [],
  metrics: [],
  isWebsocketConnected: false,
  setWebsocketConnected: (connected: boolean) => 
    set({ isWebsocketConnected: connected }),
}));

export default useStore;
