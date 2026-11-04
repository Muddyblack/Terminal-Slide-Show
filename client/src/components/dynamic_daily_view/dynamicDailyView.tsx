import { frontendConfig } from '@config/frontend.config';
import { MapPin, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

import '@/styles/dynamicDailyView.css';
import BrandLogo from '@/components/brandLogo';
import { FLYERS, PARTICLES } from '@/components/dynamic_daily_view/flyers';
import AnimatedWeather from '@/components/dynamic_daily_view/animatedWeather';
import { QuoteType, WeatherType, NasaImageType, GreetingsType, OccasionType } from '@/components/dynamic_daily_view/types';
import { useServerStatus } from '@/contexts/ServerStatusContext';


const SNOW_THEMES = ['christmas', 'winter'];

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
  const [occasion, setOccasion] = useState<OccasionType | null>(null);
  const isServerConnected = useServerStatus();
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
  const fetchOccasion = () => {
    // ?date=YYYY-MM-DD previews another day, e.g. /dynamic-view?date=2026-12-24
    const date = new URLSearchParams(window.location.search).get('date');
    fetchWithCache(`/api/occasion${date ? `?date=${encodeURIComponent(date)}` : ''}`, 'occasion', setOccasion);
  };
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
        fetchGreetings(),
        fetchOccasion()
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

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');

  return (
    <div className={`daily-view ${isNight ? 'night' : 'day'}${occasion ? ` theme-${occasion.theme}` : ''}`}>
      {nasaImage && !isImageLoading && (
        <>
          <div
            className={`nasa-background ${isNight ? 'night' : 'day'}`}
            style={{ backgroundImage: `url(${nasaImage.url})` }}
          />
          <div className={`background-overlay ${isNight ? 'night' : 'day'}`} />
        </>
      )}

      <div className="background-effects">
        <div className="shooting-star"></div>
        <div className="shooting-star delay-1"></div>
        <div className="shooting-star delay-2"></div>
      </div>

      {occasion && (
        <div className={`particles ${SNOW_THEMES.includes(occasion.theme) ? 'snow' : 'glyphs'}`} aria-hidden="true">
          {Array.from({ length: SNOW_THEMES.includes(occasion.theme) ? 60 : 16 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${-((i * 53) % 23)}s`,
                animationDuration: `${12 + ((i * 7) % 14)}s`,
                ['--size' as string]: `${0.25 + ((i * 13) % 10) / 14}vw`,
                ['--drift' as string]: `${((i * 11) % 9) - 4}vw`,
              }}
            >
              {!SNOW_THEMES.includes(occasion.theme) && PARTICLES[occasion.particle] && (
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
                  {PARTICLES[occasion.particle]}
                </svg>
              )}
            </span>
          ))}
        </div>
      )}

      {occasion && FLYERS[occasion.theme] && (
        <div className={`flyer${FLYERS[occasion.theme].wide ? ' wide' : ''}`} aria-hidden="true">
          {FLYERS[occasion.theme].art}
          <span className="flyer-shout">{FLYERS[occasion.theme].shout}</span>
        </div>
      )}

      <div className="content-wrapper">
        <div className="top-bar">
          <div className="location-badge">
            <MapPin />
            <span>{frontendConfig.info.location}</span>
          </div>
          {!isServerConnected && (
            <span
              className="offline-dot"
              role="status"
              title="Offline mode - using cached data"
              aria-label="Offline mode - using cached data"
            />
          )}
        </div>

        <main className="split">
          <section className="time-block">
            <h1 className="greeting-text">
              {occasion ? occasion.title : getGreetings(time.getHours())}
            </h1>
            <div className="clock" aria-label={`${hours}:${minutes}`}>
              {hours}
              <span className="clock-colon">:</span>
              {minutes}
            </div>
            <div className="date-text">{formattedDate}</div>
            {occasion && <div className="occasion-text">{occasion.text}</div>}
          </section>

          <section className="reading-column">
            <div className="quote-block" onClick={() => setShowTranslation(!showTranslation)}>
              <div className="gold-rule" />
              {isLoading ? (
                <p className="quote-text">Lädt Zitat...</p>
              ) : error ? (
                <p className="quote-text">{error}</p>
              ) : quote ? (
                <>
                  <p className="quote-text">{quote.text}</p>
                  <p className="quote-author">{quote.author}</p>
                  {showTranslation && quote.translation && (
                    <p className="quote-translation">{quote.translation}</p>
                  )}
                </>
              ) : null}
            </div>

            {fact && (
              <div className="fact-block">
                <span className="fact-kicker">Wusstest du?</span>
                <p>{fact}</p>
              </div>
            )}
          </section>
        </main>

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

        <BrandLogo className="brand-logo" />

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
