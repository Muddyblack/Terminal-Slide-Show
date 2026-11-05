/**
 * @module AnimatedWeather
 * @description The weather card (top right): an animated icon, the temperature, a short German
 * description and the wind / cloud / precipitation numbers. The icon is built from the same
 * weather model as the full-screen weather layer, so both always show the same weather.
 */

import { Wind, ArrowUp, Cloud, CloudRain, CloudSnow } from 'lucide-react';
import React, { CSSProperties } from 'react';

import '@/styles/animatedWeather.css';
import { AnimatedWeatherProps } from '@/components/dynamic_daily_view/types';
import { describeWeather, WeatherState } from '@/components/dynamic_daily_view/weatherModel';

type Tone = 'light' | 'gray' | 'dark' | 'back' | 'backdark';

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

/* ---------- building blocks, all in a 100 x 100 box ---------- */

const Defs = () => (
  <defs>
    <radialGradient id="wx-sun" cx="50%" cy="50%" r="50%">
      <stop offset="0" stopColor="#FFD700" />
      <stop offset="1" stopColor="#FFA500" />
    </radialGradient>
    <radialGradient id="wx-moon" cx="40%" cy="35%" r="70%">
      <stop offset="0" stopColor="#fffdf3" />
      <stop offset="1" stopColor="#d8d2bd" />
    </radialGradient>
    <radialGradient id="wx-moon-halo">
      <stop offset="0" stopColor="#e9f0ff" stopOpacity=".35" />
      <stop offset="1" stopColor="#e9f0ff" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="wx-hail" cx="38%" cy="35%" r="65%">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset="1" stopColor="#a9cbe6" />
    </radialGradient>
    <linearGradient id="wx-bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fffbe0" />
      <stop offset="1" stopColor="#ffd23f" />
    </linearGradient>
    {([
      ['light', '#ffffff', '#d3dbe6'],
      ['gray', '#e1e6ee', '#97a3b3'],
      ['dark', '#8d96a5', '#424955'],
      ['back', '#c3ccd9', '#8490a2'],
      ['backdark', '#5f6775', '#2c3139'],
    ] as const).map(([id, top, bottom]) => (
      <linearGradient key={id} id={`wx-cloud-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="-21" x2="0" y2="13">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
    ))}
    <clipPath id="wx-under-cloud">
      <rect x="0" y="58" width="100" height="42" />
    </clipPath>
  </defs>
);

const CloudShape = ({ x, y, s, tone, drift = true }: { x: number; y: number; s: number; tone: Tone; drift?: boolean }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className={drift ? 'wx-i-cloud' : undefined} fill={`url(#wx-cloud-${tone})`}>
      <circle cx="-14" cy="2" r="11" />
      <circle cx="0" cy="-6" r="15" />
      <circle cx="14" cy="0" r="12" />
      <rect x="-25" y="0" width="51" height="13" rx="6.5" />
    </g>
  </g>
);

/** The sun as before: a glowing orb that pulses gently, no rays */
const Sun = ({ x, y, r, faded = false }: { x: number; y: number; r: number; faded?: boolean }) => (
  <circle cx={x} cy={y} r={r} fill="url(#wx-sun)" className="wx-i-sun" opacity={faded ? 0.55 : 1} />
);

const Moon = ({ x, y, r, stars = false, faded = false }: { x: number; y: number; r: number; stars?: boolean; faded?: boolean }) => (
  <g opacity={faded ? 0.5 : 1}>
    <circle cx={x} cy={y} r={r * 2} fill="url(#wx-moon-halo)" className="wx-i-halo" />
    {/* crescent: the disc minus a slightly shifted disc */}
    <mask id={`wx-moon-cut-${x}-${y}`}>
      <rect width="100" height="100" fill="#fff" />
      <circle cx={x + r * 0.55} cy={y - r * 0.35} r={r * 0.92} fill="#000" />
    </mask>
    <circle cx={x} cy={y} r={r} fill="url(#wx-moon)" mask={`url(#wx-moon-cut-${x}-${y})`} />
    {stars && [[20, 24, 2.2], [78, 20, 1.6], [82, 70, 1.9], [18, 72, 1.4]].map(([sx, sy, sr], i) => (
      <path
        key={i}
        className="wx-i-star"
        style={{ animationDelay: `${i * 0.7}s` }}
        d={`M${sx} ${sy - sr * 2} Q${sx} ${sy} ${sx + sr * 2} ${sy} Q${sx} ${sy} ${sx} ${sy + sr * 2} Q${sx} ${sy} ${sx - sr * 2} ${sy} Q${sx} ${sy} ${sx} ${sy - sr * 2}Z`}
        fill="#fff"
      />
    ))}
  </g>
);

/** Spots under the cloud where precipitation starts, spread but not in a grid */
const SPOTS = [34, 58, 46, 70, 40, 64, 52, 30, 76, 44, 60, 36];

const Precipitation = ({ state }: { state: WeatherState }) => {
  const slant = state.windX * 6;
  const n = [0, 4, 6, 9][state.level];
  return (
    <g clipPath="url(#wx-under-cloud)">
      {state.precip === 'rain' && SPOTS.slice(0, state.hail ? Math.max(3, n - 3) : n).map((x, i) => (
        <line
          key={`r${i}`}
          className="wx-i-drop"
          style={css({ animationDelay: `${(i * 0.37) % 0.9}s`, '--dx': `${slant}px`, animationDuration: `${0.75 - state.level * 0.08}s` })}
          x1={x} y1={58 + (i % 3) * 3} x2={x - slant * 0.45} y2={58 + (i % 3) * 3 + 7 + state.level * 2}
          stroke="#8fc6f5" strokeWidth={1.6 + state.level * 0.3} strokeLinecap="round"
        />
      ))}
      {state.precip === 'drizzle' && SPOTS.slice(0, n + 2).map((x, i) => (
        <line
          key={`d${i}`}
          className="wx-i-drop drizzle"
          style={css({ animationDelay: `${(i * 0.29) % 1.2}s`, '--dx': `${slant}px` })}
          x1={x} y1={60 + (i % 4) * 2} x2={x - slant * 0.2} y2={63 + (i % 4) * 2}
          stroke="#b8d6ef" strokeWidth="1.4" strokeLinecap="round"
        />
      ))}
      {(state.precip === 'snow' || (state.freezing && state.precip !== 'none')) && SPOTS.slice(0, state.freezing ? 3 : n).map((x, i) => (
        <g
          key={`s${i}`}
          className="wx-i-flake"
          style={css({ animationDelay: `${(i * 0.53) % 2.4}s`, '--dx': `${slant}px` })}
          stroke={state.freezing ? '#cfeaff' : '#ffffff'} strokeWidth="1.1" strokeLinecap="round"
        >
          {[0, 60, 120].map((a) => (
            <line key={a} x1={x - 3.2} y1={62} x2={x + 3.2} y2={62} transform={`rotate(${a} ${x} 62)`} />
          ))}
        </g>
      ))}
      {state.precip === 'grains' && SPOTS.slice(0, 8).map((x, i) => (
        <circle key={`g${i}`} className="wx-i-drop grain" style={css({ animationDelay: `${(i * 0.31) % 1}s`, '--dx': `${slant}px` })} cx={x} cy={61} r="1.3" fill="#fff" />
      ))}
      {state.hail > 0 && SPOTS.slice(0, state.hail === 2 ? 7 : 4).map((x, i) => (
        <circle
          key={`h${i}`}
          className="wx-i-hail"
          style={css({ animationDelay: `${(i * 0.23) % 0.8}s`, '--dx': `${slant}px` })}
          cx={x + 3} cy={60} r={state.hail === 2 ? 3 : 2.3}
          fill="url(#wx-hail)" stroke="#e8f4ff" strokeWidth=".5"
        />
      ))}
    </g>
  );
};

const Bolt = ({ level }: { level: number }) => (
  <g>
    <path
      className="wx-i-bolt"
      style={{ animationDuration: `${[0, 5, 3.2, 2.1][level]}s` }}
      d="M56 54 L44 74 H52 L46 94 L65 68 H56 L62 54 Z"
      fill="url(#wx-bolt)"
    />
    {level === 3 && (
      <path className="wx-i-bolt" style={{ animationDuration: '2.6s', animationDelay: '-1.2s' }} d="M36 56 L29 68 H34 L30 80 L42 64 H36 L40 56 Z" fill="url(#wx-bolt)" />
    )}
  </g>
);

const FogBars = () => (
  <g className="wx-i-fog" fill="#e6ebf1">
    {[[24, 46, 52], [16, 55, 62], [26, 64, 50], [20, 73, 58], [30, 82, 40]].map(([x, y, w], i) => (
      <rect key={i} x={x} y={y} width={w} height="4.2" rx="2.1" opacity={0.92 - i * 0.1} style={{ animationDelay: `${-i * 1.7}s` }} />
    ))}
  </g>
);

function WeatherIcon({ state, night }: { state: WeatherState; night: boolean }) {
  const Body = night ? Moon : Sun;
  const severe = state.kind === 'thunder' || (state.kind === 'rain' && state.level === 3);
  const front: Tone = severe ? 'dark' : state.kind === 'rain' || state.kind === 'drizzle' ? 'gray' : 'light';
  const back: Tone = severe ? 'backdark' : 'back';

  return (
    <svg viewBox="0 0 100 100" className="weather-icon" role="img" aria-label={state.label}>
      <Defs />
      {state.kind === 'clear' && <Body x={50} y={50} r={night ? 19 : 20} stars={night} />}

      {state.kind === 'partly' && (
        <>
          <Body x={38} y={38} r={state.level === 1 ? 15 : 13} stars={night} />
          <CloudShape x={58} y={58} s={state.level === 1 ? 0.9 : 1.1} tone="light" />
        </>
      )}

      {state.kind === 'overcast' && (
        <>
          <CloudShape x={38} y={44} s={0.95} tone="back" />
          <CloudShape x={58} y={56} s={1.15} tone="light" />
        </>
      )}

      {state.kind === 'fog' && (
        <>
          <Body x={50} y={40} r={15} faded />
          <FogBars />
        </>
      )}

      {state.precip !== 'none' && (
        <>
          {state.showers && <Body x={30} y={26} r={11} />}
          <CloudShape x={38} y={34} s={0.85} tone={back} />
          <Precipitation state={state} />
          {state.thunder > 0 && <Bolt level={state.thunder} />}
          <CloudShape x={56} y={44} s={1.15} tone={front} />
        </>
      )}
    </svg>
  );
}

/**
 * Main weather display component
 * @component
 * @param {AnimatedWeatherProps} props - Component properties
 * @returns {JSX.Element} Weather display with animation and metrics
 */
const AnimatedWeather: React.FC<AnimatedWeatherProps> = ({
  weatherCode,
  temperature,
  windSpeed,
  windDirection,
  cloud_cover,
  rain,
  showers,
  snowfall,
  is_day,
  wind_gusts,
}) => {
  const isNight = !is_day;
  const state = describeWeather({ code: weatherCode, rain, showers, snowfall, windspeed: windSpeed, winddirection: windDirection, gusts: wind_gusts });
  const totalPrecipitation = rain + showers + snowfall;

  const precipIcon = snowfall > 0 ? <CloudSnow className="info-icon" /> : <CloudRain className="info-icon" />;
  const precipText = [
    rain > 0 && `Regen ${rain} mm`,
    showers > 0 && `Schauer ${showers} mm`,
    snowfall > 0 && `Schnee ${snowfall} cm`,
  ].filter(Boolean).join(' · ');

  return (
    <div className={`weather-badge wx-card-${state.kind}${isNight ? ' bg-opacity-80' : ' bg-opacity-90'}`}>
      <div className="flex flex-col items-center gap-2">
        <div className="w-full">
          <WeatherIcon state={state} night={isNight} />
        </div>

        <div className="temperature-container">
          <span className="temperature-text">{Math.round(temperature)}°C</span>
        </div>
        <span className="weather-label">{state.label}</span>

        <div className="weather-info-grid">
          <div className="weather-info-item">
            <Wind className="info-icon" />
            <span className="info-value">{Math.round(windSpeed)} km/h</span>
            <ArrowUp className="wind-direction-arrow w-3 h-3" style={{ transform: `rotate(${windDirection}deg)` }} />
          </div>

          <div className="weather-info-item">
            <Cloud className="info-icon" />
            <span className="info-value">{cloud_cover}%</span>
          </div>

          {totalPrecipitation > 0 && (
            <div className="weather-info-item col-span-2">
              {precipIcon}
              <span className="info-value">{precipText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimatedWeather;
