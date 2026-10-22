declare module '@config/frontend.config' {
  export interface VacationPeriod {
    start: string; // DD.MM.YYYY
    end: string;
  }

  export interface FrontendConfig {
    info: { location: string };
    slideshow: {
      watchInterval: number;
      defaultSlideDuration: number;
      controlsInterval: number;
    };
    polling: { serverStatusInterval: number };
    schedule: {
      enabled: boolean;
      onTime: string;
      offTime: string;
      days: number[];
      vacationPeriods: VacationPeriod[];
    };
    mediaTypes: {
      imageTypes: string[];
      videoTypes: string[];
      loop: boolean;
      autoplay: boolean;
      muted: boolean;
    };
    websocket: {
      heartbeatInterval: number;
      reconnectInterval: number;
      maxReconnectAttempts: number;
      path: string;
    };
  }

  export const frontendConfig: FrontendConfig;
}
