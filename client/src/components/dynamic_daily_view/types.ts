export interface AnimatedWeatherProps {
    weatherCode: number;
    temperature: number;
    windSpeed: number;
    windDirection: number;
}


export interface QuoteType {
    text: string;
    author: string;
    translation?: string;
}

export interface WeatherType {
    weathercode: number;
    temperature: number;
    windspeed: number;
    winddirection: number;
}

export interface NasaImageType {
    url: string;
    title: string;
    explanation: string;
}

export interface GreetingsType {
    [timeRange: string]: string;
}