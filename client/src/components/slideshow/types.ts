import type { FadeStyle, TransitionKind } from '@/components/slideshow/transitions';

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
  onEnded?: () => void;
  fade: FadeStyle;
}

export interface ImageCanvasProps {
  media: MediaItem;
  mediaType: 'image' | 'gif' | 'video';
  fade: FadeStyle;
  /** Called once the picture has been drawn */
  onReady?: () => void;
}

export interface MediaCanvasProps {
  media: MediaItem;
  onVideoEnd?: () => void;
  /** Overrides `slideshow.transition` */
  transition?: TransitionKind;
}