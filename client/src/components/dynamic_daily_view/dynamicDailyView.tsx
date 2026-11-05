import { frontendConfig } from '@config/frontend.config';
import { MapPin, Camera } from 'lucide-react';
import { useState, useEffect } from 'react';

import '@/styles/dynamicDailyView.css';
import BrandLogo from '@/components/brandLogo';
import OccasionArt from '@/components/dynamic_daily_view/occasionArt';
import AnimatedWeather from '@/components/dynamic_daily_view/animatedWeather';
import OccasionScene, { isSnowCode } from '@/components/dynamic_daily_view/flyers';
import { DebugOptions, applyWeatherDebug } from '@/components/dynamic_daily_view/debugOptions';
import { QuoteType, WeatherType, NasaImageType, GreetingsType, OccasionType, ContentType } from '@/components/dynamic_daily_view/types';
import { useServerStatus } from '@/contexts/ServerStatusContext';


/** How long each text stays on screen */
const ROTATE_MS = 25000;

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
  const [displayedImage, setDisplayedImage] = useState<NasaImageType | null>(null);
  const [previousImage, setPreviousImage] = useState<NasaImageType | null>(null);

  const weather = applyWeatherDebug(liveWeather, debug, time.getHours());
  const snowing = Boolean(weather && (isSnowCode(weather.weathercode) || weather.snowfall > 0));
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
      setDisplayedImage(null);
      setPreviousImage(null);
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
      setDisplayedImage(null);
      setPreviousImage(null);
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

    const photoTimer = setInterval(() => {
      if (isServerConnected) fetchNasaImage();
    }, 60000);

    // Cleanup
    return () => {
      clearInterval(timer);
      clearInterval(photoTimer);
      clearInterval(contentTimer);
      clearInterval(rotateTimer);
    };
  }, [isServerConnected, location, sourceParam, occasionDate, debug?.reloadKey]);  // Re-run when connection status or the test options change

  useEffect(() => {
    if (!nasaImage?.url || displayedImage?.url === nasaImage.url) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      if (displayedImage?.url === nasaImage.url) return;
      setPreviousImage(displayedImage);
      setDisplayedImage(nasaImage);
    };
    img.onerror = () => console.warn('Background image failed to load:', nasaImage.url);
    img.src = nasaImage.url;
    return () => { cancelled = true; };
  }, [nasaImage, displayedImage]);

  // "Description · Foto: Name (License)" -> description and credit shown separately
  const creditMatch = displayedImage?.explanation.match(/\s*·?\s*((?:Foto|Photo): .*)$/);
  const photoCredit = creditMatch?.[1] ?? '';
  const photoDescription = (creditMatch ? displayedImage?.explanation.slice(0, creditMatch.index) : displayedImage?.explanation) ?? '';

  const item = content ? content.items[step % content.items.length] : null;
  const shownQuote = content?.quotes.length ? content.quotes[step % content.quotes.length] : quote;

  const formattedDate = time.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // With ?date= the occasion is another day's: count down from that day, at the current time
  const previewDay = occasionDate || new window.URLSearchParams(window.location.search).get('date');
  const occasionNow = previewDay && /^\d{4}-\d{2}-\d{2}$/.test(previewDay)
    ? new Date(`${previewDay}T${time.toTimeString().slice(0, 8)}`)
    : time;

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');

  return (
    <div className={`daily-view ${isNight ? 'night' : 'day'}${occasion ? ` theme-${occasion.theme}` : ''}`}>
      {displayedImage && (
        <>
          {previousImage && <div key={`previous-${previousImage.url}`} className={`nasa-background photo-exit ${isNight ? 'night' : 'day'}`} style={{ backgroundImage: `url(${previousImage.url})` }} />}
          <div
            key={displayedImage.url}
            onAnimationEnd={() => setPreviousImage(null)}
            className={`nasa-background photo-enter ${isNight ? 'night' : 'day'}`}
            style={{ backgroundImage: `url(${displayedImage.url})` }}
          />
          <div className={`background-overlay ${isNight ? 'night' : 'day'}`} />
        </>
      )}

      <div className="background-effects">
        <div className="shooting-star"></div>
        <div className="shooting-star delay-1"></div>
        <div className="shooting-star delay-2"></div>
      </div>

      {(occasion || snowing) && <OccasionScene occasion={occasion} snowing={snowing} />}

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
            {occasion ? <OccasionArt occasion={occasion} now={occasionNow} /> : (
              <h1 className="greeting-text" key={`g${step}`}>{getGreetings(time.getHours())}</h1>
            )}
            <div className="clock" aria-label={`${hours}:${minutes}`}>
              {hours}
              <span className="clock-colon">:</span>
              {minutes}
            </div>
            <div className="date-text">{formattedDate}</div>
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

        {displayedImage && (
          <div className="photo-credit" onClick={() => setShowNasaInfo(!showNasaInfo)}>
            <Camera className="photo-credit-icon" />
            <div className="photo-credit-text">
              <div className="photo-credit-title">{displayedImage.title}</div>
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
