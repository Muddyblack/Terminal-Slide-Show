export interface ControlsProps {
    show: boolean;
    onPrevious: () => Promise<void>;
    onNext: () => Promise<void>;
    disabled: boolean;
}

export interface MediaItem {
    id: string;
    name: string;
    url: string;
    duration?: number;
    isDynamicView?: boolean;
}

export interface LocalMediaManagerReturn {
    media: MediaItem | null;
    loading: boolean;
    error: string | null;
    serverReady: boolean;
    navigateMedia: (direction: 'next' | 'previous') => Promise<void>;
}

export type NavigationDirection = 'next' | 'previous';

export interface Dimensions {
  scaledWidth: number;
  scaledHeight: number;
  x: number;
  y: number;
}

export interface VideoPlayerProps {
  media: MediaItem;
}

export interface ImageCanvasProps {
  media: MediaItem;
  mediaType: 'image' | 'gif' | 'video';
}

export interface MediaCanvasProps {
  media: MediaItem;
}