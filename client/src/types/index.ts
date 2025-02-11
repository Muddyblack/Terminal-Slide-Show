export interface MediaItem {
  id: string;
  name: string;
  path: string;
  type?: string;
  dates?: {
    start?: string;
    end?: string;
    duration?: number;
  };
}

export interface AppState {
  isWebsocketConnected: boolean;
  setWebsocketConnected: (connected: boolean) => void;
  mediaList: MediaItem[];
  setMediaList: (media: MediaItem[]) => void;
  currentMediaIndex: number;
  setCurrentMediaIndex: (index: number) => void;
}
