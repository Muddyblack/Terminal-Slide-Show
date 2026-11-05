export interface AnimatedWeatherProps {
    weatherCode: number;
    temperature: number;
    windSpeed: number;
    windDirection: number;
    wind_gusts: number;
    cloud_cover: number;
    rain: number;
    showers: number;
    snowfall: number;
    is_day: number;
}

export interface QuoteType {
    text: string;
    author: string;
    translation?: string;
}

export interface WeatherType {
    weathercode: number;
    temperature: number;
    is_day: number;
    windspeed: number;
    winddirection: number;
    wind_gusts: number;
    cloud_cover: number;
    rain: number;
    showers: number;
    snowfall: number;
    time: string;
}

export interface NasaImageType {
    url: string;
    title: string;
    explanation: string;
}

export interface GreetingsType {
    [timeRange: string]: string | string[];
}

export interface OccasionType {
    id: string;
    title: string;
    text: string;
    theme: string;
    particle: string;
    /** The occasion's own day (YYYY-MM-DD); null for seasons. Missing in older cached responses. */
    day?: string | null;
}

export interface ContentItem {
    kind: string;
    text: string;
}

export interface ContentType {
    items: ContentItem[];
    quotes: QuoteType[];
}
