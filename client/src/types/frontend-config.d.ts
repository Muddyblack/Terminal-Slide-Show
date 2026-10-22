declare module '@config/frontend.config' {
  export interface VacationPeriod {
    start: string; // DD.MM.YYYY
    end: string;
  }

  export interface FrontendConfig {
    info: {
      location: string;
      latitude: number | null;
      longitude: number | null;
      elevation: number | null;
    };
    locale: {
      language: 'de' | 'en';
      units: 'metric' | 'imperial';
    };
    dailyView: {
      weather: boolean;
      nasa: boolean;
      quote: boolean;
      fact: boolean;
      greeting: boolean;
    };
    branding: {
      logo: string;
      logoAlt: string;
    };
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
