import { frontendConfig } from '@config/frontend.config';
import { MapPin, Camera } from 'lucide-react';
import { useState, useEffect } from 'react';

import '@/styles/dynamicDailyView.css';
import BrandLogo from '@/components/brandLogo';
import AnimatedWeather from '@/components/dynamic_daily_view/animatedWeather';
import { FLYERS, PARTICLES } from '@/components/dynamic_daily_view/flyers';
import { DebugOptions, applyWeatherDebug } from '@/components/dynamic_daily_view/debugOptions';
import { QuoteType, WeatherType, NasaImageType, GreetingsType, OccasionType, ContentType } from '@/components/dynamic_daily_view/types';
import { useServerStatus } from '@/contexts/ServerStatusContext';


/** How long each text stays on screen */
const ROTATE_MS = 25000;

const SNOW_THEMES = ['christmas', 'winter'];

type SetterFunction = (value: any) => void;

interface DynamicDailyViewProps {
  /** Only the /test page passes this */
  debug?: DebugOptions;
}

const DynamicDailyView = ({ debug }: DynamicDailyViewProps = {}) => {
  const [clock, setClock] = useState(new Date());
  const time = debug?.fakeNow ? new Date(debug.fakeNow) : clock;
  const location = debug?.location || frontendConfig.info.location;
  const sourceParam = debug && debug.source !== 'auto' ? debug.source : '';
  const occasionDate = debug?.fakeNow ? debug.fakeNow.slice(0, 10) : '';
  const [quote, setQuote] = useState<QuoteType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [fact, setFact] = useState<string | null>(null);
  const [content, setContent] = useState<ContentType | null>(null);
  const [step, setStep] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [liveWeather, setWeather] = useState<WeatherType | null>(null);
  const [nasaImage, setNasaImage] = useState<NasaImageType | null>(null);
  const [showNasaInfo, setShowNasaInfo] = useState(false);
  const [greetings, setGreetings] = useState<GreetingsType>({});
  const [occasion, setOccasion] = useState<OccasionType | null>(null);
  const serverConnected = useServerStatus();
  const isServerConnected = debug?.offline ? false : serverConnected;
  const [isImageLoading, setIsImageLoading] = useState(true);

  const weather = applyWeatherDebug(liveWeather, debug, time.getHours());
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
  const fetchContent = () =>
    fetchWithCache(
      `/api/content?location=${encodeURIComponent(location)}`,
      `content:${location}`,
      (data: ContentType) => {
        if (data?.items?.length) setContent(data);
      }
    );
  const fetchFacts = () => fetchWithCache('/api/facts', 'facts', setFact);
  const fetchGreetings = () => fetchWithCache('/api/greetings', 'greetings', setGreetings);
  const fetchOccasion = () => {
    // ?date=YYYY-MM-DD previews another day, e.g. /dynamic-view?date=2026-12-24
    const date = occasionDate || new window.URLSearchParams(window.location.search).get('date');
    fetchWithCache(`/api/occasion${date ? `?date=${encodeURIComponent(date)}` : ''}`, `occasion:${date ?? ''}`, setOccasion);
  };
  // Ignore the NASA logo placeholder, e.g. from an older cached response
  const fetchNasaImage = async () => {
    if (debug?.source === 'none') {
      setNasaImage(null);
      return;
    }
    // The picture follows the occasion of the day, so the preview date goes along
    const date = occasionDate || new window.URLSearchParams(window.location.search).get('date') || '';
    const query = `location=${encodeURIComponent(location)}${sourceParam ? `&source=${sourceParam}` : ''}${date ? `&date=${encodeURIComponent(date)}` : ''}`;
    await fetchWithCache(`/api/nasa-apod?${query}`, `nasa:${location}:${sourceParam}:${date}`, (data: NasaImageType) => {
      if (data?.url && !/nasa-logo/i.test(data.url)) setNasaImage(data);
    });
  };

  const fetchWeather = () => {
    fetchWithCache(
      `/api/weather?location=${encodeURIComponent(location)}`,
      `weather:${location}`,
      (data) => setWeather(data.current_weather)
    );
  };

  const getGreetings = (hour: number): string => {
    for (const range in greetings) {
      const [start, end] = range.split('-').map(Number);
      if (hour >= start && hour < end) {
        const options = greetings[range];
        return Array.isArray(options) ? options[step % options.length] : options;
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
        fetchContent(),
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
      setClock(new Date());
    }, 1000);

    // The test page changes places and sources: drop what is shown for the old ones
    if (debug) {
      setNasaImage(null);
      setIsImageLoading(true);
    }

    // Initial data load
    safeDataFetch();

    // Set up content refresh timer only if connected (increased to 10 minutes)
    const contentTimer = setInterval(() => {
      if (isServerConnected) {
        safeDataFetch();
      }
    }, 600000); // 10 minutes

    // Rotate facts, quotes and greetings so the screen does not show the same text all day
    const rotateTimer = setInterval(() => setStep((prev) => prev + 1), ROTATE_MS);

    // Cleanup
    return () => {
      clearInterval(timer);
      clearInterval(contentTimer);
      clearInterval(rotateTimer);
    };
  }, [isServerConnected, location, sourceParam, occasionDate, debug?.reloadKey]);  // Re-run when connection status or the test options change

  useEffect(() => {
    if (nasaImage?.url) {
      const img = new Image();
      img.onload = () => {
        setIsImageLoading(false);
      };
      img.onerror = () => console.warn('Background image failed to load:', nasaImage.url);
      img.src = nasaImage.url;
    }
  }, [nasaImage?.url]);

  // "Description · Foto: Name (License)" -> description and credit shown separately
  const creditMatch = nasaImage?.explanation.match(/\s*·?\s*((?:Foto|Photo): .*)$/);
  const photoCredit = creditMatch?.[1] ?? '';
  const photoDescription = (creditMatch ? nasaImage?.explanation.slice(0, creditMatch.index) : nasaImage?.explanation) ?? '';

  const item = content ? content.items[step % content.items.length] : null;
  const shownQuote = content?.quotes.length ? content.quotes[step % content.quotes.length] : quote;

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
            <span>{location}</span>
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
            <h1 className="greeting-text" key={`g${step}`}>
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
            <div className="quote-block" key={`q${step}`} onClick={() => setShowTranslation(!showTranslation)}>
              <div className="gold-rule" />
              {isLoading ? (
                <p className="quote-text">Lädt Zitat...</p>
              ) : error ? (
                <p className="quote-text">{error}</p>
              ) : shownQuote ? (
                <>
                  <p className="quote-text">{shownQuote.text}</p>
                  <p className="quote-author">{shownQuote.author}</p>
                  {showTranslation && shownQuote.translation && (
                    <p className="quote-translation">{shownQuote.translation}</p>
                  )}
                </>
              ) : null}
            </div>

            {(item || fact) && (
              <div className="fact-block" key={`f${step}`}>
                <span className="fact-kicker">{item ? item.kind : 'Wusstest du?'}</span>
                <p>{item ? item.text : fact}</p>
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

        <BrandLogo variant="wide" className="brand-logo" />

        {nasaImage && (
          <div className="photo-credit" onClick={() => setShowNasaInfo(!showNasaInfo)}>
            <Camera className="photo-credit-icon" />
            <div className="photo-credit-text">
              <div className="photo-credit-title">{nasaImage.title}</div>
              {photoCredit && <div className="photo-credit-by">{photoCredit}</div>}
              {showNasaInfo && photoDescription && (
                <p className="photo-credit-description">{photoDescription}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicDailyView;
