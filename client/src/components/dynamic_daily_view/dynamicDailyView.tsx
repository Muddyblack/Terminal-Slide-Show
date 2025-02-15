import { frontendConfig } from '@config/frontend.config';
import { Calendar, Quote, Coffee, MapPin, Clock, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

import '@/styles/dynamicDailyView.css';
import AnimatedWeather from '@/components/dynamic_daily_view/animatedWeather';
import { QuoteType, WeatherType, NasaImageType, GreetingsType } from '@/components/dynamic_daily_view/types';
import { useServerStatus } from '@/hooks/useServerStatus';


type SetterFunction = (value: any) => void;

const DynamicDailyView = () => {
  const [time, setTime] = useState(new Date());
  const [quote, setQuote] = useState<QuoteType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [fact, setFact] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [weather, setWeather] = useState<WeatherType | null>(null);
  const [nasaImage, setNasaImage] = useState<NasaImageType | null>(null);
  const [showNasaInfo, setShowNasaInfo] = useState(false);
  const [greetings, setGreetings] = useState<GreetingsType>({});
  const isServerConnected = useServerStatus();
  const [logoSrc, setLogoSrc] = useState('/slideshow.png');
  const [isImageLoading, setIsImageLoading] = useState(true);

  const isNight = weather ? !weather.is_day : (time.getHours() >= 18 || time.getHours() < 6); // fallback to time-based check if weather data isn't available

  const loadFromCache = (key: string) => {
    try {
      const cached = localStorage.getItem(`dynamicView_${key}`);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      // Cache valid for 30 minutes
      if (Date.now() - timestamp > 30 * 60 * 1000) {
        localStorage.removeItem(`dynamicView_${key}`);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('Failed to load from cache:', err);
      return null;
    }
  };

  const saveToCache = (key: string, data: any) => {
    try {
      localStorage.setItem(`dynamicView_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('Failed to save to cache:', err);
    }
  };

  const cacheLogo = async () => {
    try {
      // Check cache first
      const cachedLogo = loadFromCache('logo');
      if (cachedLogo) {
        return cachedLogo;
      }

      // Fetch and convert to base64 if not cached
      const response = await fetch('/slideshow.png');
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Logo = reader.result;
          // Save to cache
          saveToCache('logo', base64Logo);
          resolve(base64Logo);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Failed to cache logo:', err);
      return '/slideshow.png'; // Fallback to normal path
    }
  };

  const fetchWithCache = async (endpoint: string, cacheKey: string, setter: SetterFunction) => {
    console.debug('Fetch attempt - Server status:', isServerConnected);
    try {
      if (!isServerConnected) {
        const cachedData = loadFromCache(cacheKey);
        if (cachedData) {
          setter(cachedData);
          return;
        }
        return;
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setter(data);
      saveToCache(cacheKey, data);
    } catch (err) {
      console.warn(`Failed to fetch ${cacheKey}:`, err);
      const cachedData = loadFromCache(cacheKey);
      if (cachedData) {
        setter(cachedData);
      }
    }
  };

  const fetchQuotes = () => fetchWithCache('/api/quotes', 'quotes', setQuote);
  const fetchFacts = () => fetchWithCache('/api/facts', 'facts', setFact);
  const fetchGreetings = () => fetchWithCache('/api/greetings', 'greetings', setGreetings);
  const fetchNasaImage = () => fetchWithCache('/api/nasa-apod', 'nasa', setNasaImage);

  const fetchWeather = () => {
    fetchWithCache(
      `/api/weather?location=${encodeURIComponent(frontendConfig.info.location)}`,
      'weather',
      (data) => setWeather(data.current_weather)
    );
  };

  const getGreetings = (hour: number): string => {
    for (const range in greetings) {
      const [start, end] = range.split('-').map(Number);
      if (hour >= start && hour < end) {
        return greetings[range];
      }
    }
    return 'Nachtschicht oder Feierabend? 🌙';
  };

  const safeDataFetch = async () => {
    console.debug('Current server connection status:', isServerConnected);
    try {
      await Promise.allSettled([
        fetchQuotes(),
        fetchWeather(),
        fetchFacts(),
        fetchNasaImage(),
        fetchGreetings()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Initial data load
    safeDataFetch();

    // Set up content refresh timer only if connected (increased to 10 minutes)
    const contentTimer = setInterval(() => {
      if (isServerConnected) {
        safeDataFetch();
      }
    }, 600000); // 10 minutes

    // NASA info auto-toggle timer
    const nasaInfoTimer = setInterval(() => {
      setShowNasaInfo(prev => !prev);
    }, 60000);

    // Cache logo
    cacheLogo().then(setLogoSrc);

    // Cleanup
    return () => {
      clearInterval(timer);
      clearInterval(contentTimer);
      clearInterval(nasaInfoTimer);
    };
  }, [isServerConnected]);  // Re-run when connection status changes

  useEffect(() => {
    if (nasaImage?.url) {
      const img = new Image();
      img.onload = () => {
        setIsImageLoading(false);
      };
      img.src = nasaImage.url;
    }
  }, [nasaImage?.url]);

  const formattedDate = time.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = time.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className={`daily-view ${isNight ? 'night' : 'day'}`}>
      {nasaImage && !isImageLoading && (
        <>
          <div
            className={`nasa-background ${isNight ? 'night' : 'day'}`}
            style={{ 
              backgroundImage: `url(${nasaImage.url})`
            }}
          />
          <div className={`background-overlay ${isNight ? 'night' : 'day'}`} />
        </>
      )}

      <div className="background-effects">
        <div className="shooting-star"></div>
        <div className="shooting-star delay-1"></div>
        <div className="shooting-star delay-2"></div>
      </div>

      <div className="content-wrapper">
        <div className="dhbw-logo">
          <img src={logoSrc} alt="DHBW Logo" />
        </div>

        {!isServerConnected && (
          <div className="offline-badge">
            <span className="text-yellow-300">⚠️ Offline Mode - Using Cached Data</span>
          </div>
        )}

        <div className="location-badge">
          <MapPin className="text-blue-300" />
          <span>{frontendConfig.info.location}</span>
        </div>

        <div className="main-content">
          <h1 className="greeting-text">{getGreetings(time.getHours())}</h1>

          <div className="datetime-display">
            <div className="date">
              <Calendar className="text-blue-300 select-none" />
              <span className="select-text">{formattedDate}</span>
            </div>
            <div className="time">
              <Clock className="text-blue-300 select-none" />
              <span className="select-text">{formattedTime}</span>
            </div>
          </div>

          <div className="quote-card" onClick={() => setShowTranslation(!showTranslation)}>
            <Quote className="text-yellow-300" />
            {isLoading ? (
              <p className="quote-text">Lädt Zitat...</p>
            ) : error ? (
              <p className="quote-text text-yellow-300">{error}</p>
            ) : quote ? (
              <>
                <p className="quote-text">{quote.text}</p>
                <p className="quote-author">- {quote.author}</p>
                {showTranslation && quote.translation && (
                  <p className="quote-translation">{quote.translation}</p>
                )}
              </>
            ) : null}
          </div>

          <div className="fact-card">
            <Coffee className="text-emerald-300" />
            <p>{fact}</p>
          </div>
        </div>

        <div>
          {weather && (
            <AnimatedWeather
              weatherCode={weather.weathercode}
              temperature={weather.temperature}
              windSpeed={weather.windspeed}
              windDirection={weather.winddirection}
              cloud_cover={weather.cloud_cover}
              rain={weather.rain}
              showers={weather.showers}
              snowfall={weather.snowfall}
              is_day={weather.is_day}
              wind_gusts={weather.wind_gusts || 0}
            />
          )}
        </div>

        {nasaImage && (
          <div
            className={`nasa-info ${showNasaInfo ? 'expanded' : ''}`}
            onClick={() => setShowNasaInfo(!showNasaInfo)}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="nasa-title">{nasaImage.title}</h3>
              <Info className="w-5 h-5 text-blue-300" />
            </div>
            <p className={`nasa-description ${showNasaInfo ? 'expanded' : ''}`}>
              {nasaImage.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicDailyView;