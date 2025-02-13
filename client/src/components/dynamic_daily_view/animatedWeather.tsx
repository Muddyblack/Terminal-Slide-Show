/**
 * @module AnimatedWeather
 * @description Weather visualization component with animated SVG weather conditions
 */

import { Wind, ArrowUp, Cloud, CloudRain, CloudSnow } from 'lucide-react';
import React, { JSX }  from 'react';

import '@/styles/animatedWeather.css';
import { AnimatedWeatherProps } from '@/components/dynamic_daily_view/types';

/**
 * Determines which weather animation to display based on weather code and time of day
 * @param {number} code - Weather condition code (WMO standard)
 * @param {boolean} isNight - Whether it's nighttime
 * @returns {JSX.Element} Appropriate weather animation component
 */
const getWeatherAnimation = (code: number, isNight: boolean): JSX.Element => {
  switch (code) {
    case 0:
      return isNight ? <MoonAnimation /> : <SunnyAnimation />;
    case 1:
    case 2:
    case 3:
      return isNight ? <NightlyPartlyCloudyAnimation /> : <PartlyCloudyAnimation />;
    case 45:
    case 48:
      return <FogAnimation />;
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return <DrizzleAnimation />;
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return <RainyAnimation />;
    case 71:
    case 73:
    case 75:
    case 77:
      return <SnowyAnimation />;
    case 80:
    case 81:
    case 82:
      return <RainShowerAnimation />;
    case 85:
    case 86:
      return <SnowShowerAnimation />;
    case 95:
      return <ThunderstormAnimation intensity="moderate" />;
    case 96:
      return <ThunderstormAnimation intensity="slight-hail" />;
    case 99:
      return <ThunderstormAnimation intensity="heavy-hail" />;
    default:
      return isNight ? <MoonAnimation /> : <SunnyAnimation />;
  }
};

/**
 * Moon animation component with gradient and shadow effects
 * @returns {JSX.Element} Animated moon SVG
 */
const MoonAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <radialGradient id="moon-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style={{ stopColor: "#FFFFFF", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#E1E1E1", stopOpacity: 1 }} />
      </radialGradient>
      <radialGradient id="moon-shadow" cx="30%" cy="30%" r="70%">
        <stop offset="0%" style={{ stopColor: "#C4C4C4", stopOpacity: 0 }} />
        <stop offset="100%" style={{ stopColor: "#A0A0A0", stopOpacity: 0.3 }} />
      </radialGradient>
    </defs>
    <circle
      cx="50"
      cy="50"
      r="20"
      fill="url(#moon-gradient)"
      className="moon-circle"
    />
    <circle
      cx="50"
      cy="50"
      r="20"
      fill="url(#moon-shadow)"
      className="moon-shadow"
    />
    <style>{`
      .moon-circle {
        animation: moon-glow 4s infinite;
        filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.7));
      }
      .moon-shadow {
        animation: moon-phase 8s infinite;
      }
      @keyframes moon-glow {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes moon-phase {
        0%, 100% { transform: translateX(2px); }
        50% { transform: translateX(-2px); }
      }
    `}</style>
  </svg>
);

/**
 * Sun animation component with pulsing rays
 * @returns {JSX.Element} Animated sun SVG
 */
const SunnyAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <radialGradient id="sun-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style={{ stopColor: "#FFD700", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#FFA500", stopOpacity: 1 }} />
      </radialGradient>
    </defs>
    <circle
      cx="50"
      cy="50"
      r="20"
      fill="url(#sun-gradient)"
      className="sunny-circle"
    />
    {[...Array(8)].map((_, i) => (
      <line
        key={i}
        x1="50"
        y1="50"
        x2="50"
        y2="20"
        stroke="#FFD700"
        strokeWidth="4"
        className="sunny-ray"
        style={{
          transformOrigin: '50% 50%',
          transform: `rotate(${i * 45}deg)`,
        }}
      />
    ))}
    <style>{`
      .sunny-circle {
        animation: pulse 2s infinite;
        filter: drop-shadow(0 0 10px #FFD700);
      }
      .sunny-ray {
        animation: ray-pulse 2s infinite;
        filter: drop-shadow(0 0 5px #FFD700);
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      @keyframes ray-pulse {
        0%, 100% { transform: rotate(0deg) scale(1); }
        50% { transform: rotate(45deg) scale(1.1); }
      }
    `}</style>
  </svg>
);

/**
 * Cloud animation component with floating effect
 * @returns {JSX.Element} Animated cloud SVG
 */
const CloudyAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <linearGradient id="cloud-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#E0E0E0", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#B0B0B0", stopOpacity: 1 }} />
      </linearGradient>
      <filter id="cloud-shadow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
        <feOffset dx="0" dy="1" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    
    {/* Main cloud body */}
    <g className="cloud-group" filter="url(#cloud-shadow)">
      {/* Center puff */}
      <circle cx="50" cy="50" r="18" fill="url(#cloud-gradient)" />
      
      {/* Left puffs */}
      <circle cx="35" cy="50" r="15" fill="url(#cloud-gradient)" />
      <circle cx="25" cy="53" r="12" fill="url(#cloud-gradient)" />
      
      {/* Right puffs */}
      <circle cx="65" cy="50" r="15" fill="url(#cloud-gradient)" />
      <circle cx="75" cy="53" r="12" fill="url(#cloud-gradient)" />
      
      {/* Top puffs */}
      <circle cx="43" cy="40" r="14" fill="url(#cloud-gradient)" />
      <circle cx="57" cy="40" r="14" fill="url(#cloud-gradient)" />
      
      {/* Bottom fill */}
      <path
        d="M25,53 Q37,60 50,60 Q63,60 75,53 Q75,65 50,65 Q25,65 25,53"
        fill="url(#cloud-gradient)"
      />
    </g>

    <style>{`
      .cloud-group {
        animation: float 6s ease-in-out infinite;
      }
      
      @keyframes float {
        0% { transform: translate(0, 0) scale(1); }
        25% { transform: translate(2px, -2px) scale(1.02); }
        50% { transform: translate(0, 0) scale(1); }
        75% { transform: translate(-2px, -2px) scale(0.98); }
        100% { transform: translate(0, 0) scale(1); }
      }
    `}</style>
  </svg>
);


/**
 * Night cloud animation component with moon and cloud
 * @returns {JSX.Element} Animated night cloud SVG
 */
const NightlyPartlyCloudyAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <radialGradient id="night-moon-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style={{ stopColor: "#FFFFFF", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#E1E1E1", stopOpacity: 1 }} />
      </radialGradient>
      <linearGradient id="night-cloud-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#424242", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#303030", stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <circle
      cx="35"
      cy="40"
      r="15"
      fill="url(#night-moon-gradient)"
      className="night-moon"
    />
    <path
      d="M45,50 A15,15 0 0,1 75,50 A15,15 0 0,1 60,65 L50,65 A15,15 0 0,1 45,50"
      fill="url(#night-cloud-gradient)"
      className="night-cloud"
    />
    <style>{`
      .night-moon {
        animation: moon-pulse 4s infinite;
        filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
      }
      .night-cloud {
        animation: cloud-float 3s ease-in-out infinite;
        filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.3));
      }
      @keyframes moon-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes cloud-float {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(5px); }
      }
    `}</style>
  </svg>
);

/**
 * Rain animation component with falling droplets
 * @returns {JSX.Element} Animated rain SVG
 */
const RainyAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <CloudyAnimation />
    {[...Array(5)].map((_, i) => (
      <line
        key={i}
        x1={30 + i * 10}
        y1="70"
        x2={25 + i * 10}
        y2="90"
        stroke="#4FC3F7"
        strokeWidth="2"
        className="rain-drop"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
    <style>{`
      .rain-drop {
        animation: rain 1.5s linear infinite;
        filter: drop-shadow(0 0 5px #4FC3F7);
      }
      @keyframes rain {
        0% { transform: translateY(-10px); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(10px); opacity: 0; }
      }
    `}</style>
  </svg>
);

/**
 * Snow animation component with falling snowflakes
 * @returns {JSX.Element} Animated snow SVG
 */
const SnowyAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <CloudyAnimation />
    {[...Array(5)].map((_, i) => (
      <circle
        key={i}
        cx={30 + i * 10}
        cy="75"
        r="2"
        fill="white"
        className="snow-flake"
        style={{ animationDelay: `${i * 0.3}s` }}
      />
    ))}
    <style>{`
      .snow-flake {
        animation: snow 2s linear infinite;
        filter: drop-shadow(0 0 5px white);
      }
      @keyframes snow {
        0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(10px) rotate(360deg); opacity: 0; }
      }
    `}</style>
  </svg>
);

/**
 * Thunderstorm animation component with lightning effects
 * @returns {JSX.Element} Animated thunderstorm SVG
 */
const ThunderstormAnimation = ({ intensity = "moderate" }: { intensity?: "moderate" | "slight-hail" | "heavy-hail" }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <linearGradient id="storm-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#4A4A4A", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#1A1A1A", stopOpacity: 1 }} />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <CloudyAnimation />
    
    {/* Lightning bolts */}
    {[...Array(intensity === "heavy-hail" ? 4 : intensity === "slight-hail" ? 3 : 2)].map((_, i) => (
      <path
        key={i}
        d={`M${45 + i * 10},${65 + i * 5} L${55 + i * 10},${75 + i * 5} L${45 + i * 10},${85 + i * 5} L${55 + i * 10},${95 + i * 5}`}
        stroke={intensity.includes("hail") ? "#FFFFFF" : "#FFD700"}
        strokeWidth={intensity === "heavy-hail" ? 4 : 3}
        fill="none"
        className={`lightning lightning-${i}`}
        filter="url(#glow)"
      />
    ))}
    
    {/* Hail particles for hail variants */}
    {intensity.includes("hail") && [...Array(intensity === "heavy-hail" ? 8 : 5)].map((_, i) => (
      <circle
        key={`hail-${i}`}
        cx={25 + i * (intensity === "heavy-hail" ? 7 : 10)}
        cy={75}
        r={intensity === "heavy-hail" ? 3 : 2}
        fill="#A5F3FC"
        className="hail"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
    
    <style>{`
      .lightning {
        animation: multi-lightning ${intensity === "heavy-hail" ? 1.5 : 2}s infinite;
        filter: drop-shadow(0 0 ${intensity === "heavy-hail" ? 15 : 10}px ${intensity.includes("hail") ? "#FFFFFF" : "#FFD700"});
      }
      .lightning-0 { animation-delay: 0s; }
      .lightning-1 { animation-delay: 0.5s; }
      .lightning-2 { animation-delay: 1s; }
      .lightning-3 { animation-delay: 0.75s; }
      
      @keyframes multi-lightning {
        0%, ${intensity === "heavy-hail" ? "85" : "90"}%, 100% { opacity: 0; }
        ${intensity === "heavy-hail" ? "87" : "92"}%, ${intensity === "heavy-hail" ? "89" : "95"}% { opacity: 1; }
      }
      
      .hail {
        animation: hail-fall 1s linear infinite;
      }
      
      @keyframes hail-fall {
        0% { transform: translateY(-15px); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(15px); opacity: 0; }
      }
    `}</style>
  </svg>
);

/**
 * Partly cloudy animation component with sun and cloud
 * @returns {JSX.Element} Animated partly cloudy SVG
 */
const PartlyCloudyAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <radialGradient id="partly-cloudy-sun-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style={{ stopColor: "#FFD700", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#FFA500", stopOpacity: 1 }} />
      </radialGradient>
      <linearGradient id="partly-cloudy-cloud-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#E0E0E0", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#B0B0B0", stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <circle
      cx="35"
      cy="40"
      r="15"
      fill="url(#partly-cloudy-sun-gradient)"
      className="partly-cloudy-sun"
    />
    <path
      d="M45,50 A15,15 0 0,1 75,50 A15,15 0 0,1 60,65 L50,65 A15,15 0 0,1 45,50"
      fill="url(#partly-cloudy-cloud-gradient)"
      className="partly-cloudy-cloud"
    />
    <style>{`
      .partly-cloudy-sun {
        animation: sun-pulse 2s infinite;
        filter: drop-shadow(0 0 10px #FFD700);
      }
      .partly-cloudy-cloud {
        animation: cloud-float 3s ease-in-out infinite;
        filter: drop-shadow(0 0 10px #B0B0B0);
      }
      @keyframes sun-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      @keyframes cloud-float {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(5px); }
      }
    `}</style>
  </svg>
);

/**
 * Fog animation component with drifting fog layers
 * @returns {JSX.Element} Animated fog SVG
 */
const FogAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <linearGradient id="fog-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{ stopColor: "#CCCCCC", stopOpacity: 0.2 }} />
        <stop offset="50%" style={{ stopColor: "#FFFFFF", stopOpacity: 0.5 }} />
        <stop offset="100%" style={{ stopColor: "#CCCCCC", stopOpacity: 0.2 }} />
      </linearGradient>
    </defs>
    {[...Array(5)].map((_, i) => (
      <rect
        key={i}
        x="10"
        y={35 + i * 8}
        width="80"
        height="3"
        fill="url(#fog-gradient)"
        className="fog-layer"
        style={{ animationDelay: `${i * 0.5}s` }}
      />
    ))}
    <style>{`
      .fog-layer {
        animation: fog-drift 8s linear infinite;
        filter: blur(2px);
      }
      @keyframes fog-drift {
        0% { transform: translateX(-20px); opacity: 0.3; }
        50% { opacity: 0.8; }
        100% { transform: translateX(20px); opacity: 0.3; }
      }
    `}</style>
  </svg>
);

/**
 * Drizzle animation component with light rain droplets
 * @returns {JSX.Element} Animated drizzle SVG
 */
const DrizzleAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <CloudyAnimation />
    {[...Array(8)].map((_, i) => (
      <line
        key={i}
        x1={20 + i * 8}
        y1="60"
        x2={18 + i * 8}
        y2="70"
        stroke="#B0C4DE"
        strokeWidth="1"
        className="drizzle-drop"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
    <style>{`
      .drizzle-drop {
        animation: drizzle 1s linear infinite;
        filter: drop-shadow(0 0 2px #B0C4DE);
      }
      @keyframes drizzle {
        0% { transform: translateY(-5px); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(5px); opacity: 0; }
      }
    `}</style>
  </svg>
);

/**
 * Rain shower animation component with heavy rain droplets
 * @returns {JSX.Element} Animated rain shower SVG
 */
const RainShowerAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <CloudyAnimation />
    {[...Array(12)].map((_, i) => (
      <line
        key={i}
        x1={15 + i * 6}
        y1="65"
        x2={12 + i * 6}
        y2="85"
        stroke="#4FC3F7"
        strokeWidth="2"
        className="shower-drop"
        style={{ animationDelay: `${i * 0.1}s` }}
      />
    ))}
    <style>{`
      .shower-drop {
        animation: shower 0.8s linear infinite;
        filter: drop-shadow(0 0 3px #4FC3F7);
      }
      @keyframes shower {
        0% { transform: translateY(-10px); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(10px); opacity: 0; }
      }
    `}</style>
  </svg>
);

/**
 * Snow shower animation component with falling snowflakes
 * @returns {JSX.Element} Animated snow shower SVG
 */
const SnowShowerAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <CloudyAnimation />
    {[...Array(8)].map((_, i) => (
      <g key={i} className="snow-shower-flake" style={{ animationDelay: `${i * 0.2}s` }}>
        <circle cx={25 + i * 7} cy="75" r="2" fill="white" />
        {[...Array(6)].map((_, j) => (
          <line
            key={j}
            x1={25 + i * 7}
            y1="75"
            x2={25 + i * 7 + Math.cos(j * Math.PI / 3) * 4}
            y2={75 + Math.sin(j * Math.PI / 3) * 4}
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </g>
    ))}
    <style>{`
      .snow-shower-flake {
        animation: snow-shower 2s linear infinite;
        filter: drop-shadow(0 0 2px white);
      }
      @keyframes snow-shower {
        0% { transform: translateY(-15px) rotate(0deg); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(15px) rotate(180deg); opacity: 0; }
      }
    `}</style>
  </svg>
);

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
  is_day
}) => {
  const isNight = !is_day;
  const totalPrecipitation = rain + showers + snowfall;

  const getWeatherIcon = () => {
    if (snowfall > 0) return <CloudSnow className="info-icon" />;
    if (rain > 0 || showers > 0) return <CloudRain className="info-icon" />;
    return null;
  };

  return (
    <div className={`weather-badge ${isNight ? 'bg-opacity-80' : 'bg-opacity-90'}`}>
      <div className="flex flex-col items-center gap-2">
        <div className="w-full">
          {getWeatherAnimation(weatherCode, isNight)}
        </div>
        
        <div className="temperature-container">
          <span className="temperature-text">
            {Math.round(temperature)}°C
          </span>
        </div>

        <div className="weather-info-grid">
          {/* Wind Information */}
          <div className="weather-info-item">
            <Wind className="info-icon" />
            <span className="info-value">
              {windSpeed} km/h
            </span>
            <ArrowUp
              className="wind-direction-arrow w-3 h-3"
              style={{ transform: `rotate(${windDirection}deg)` }}
            />
          </div>

          {/* Cloud Cover */}
          <div className="weather-info-item">
            <Cloud className="info-icon" />
            <span className="info-value">
              {cloud_cover}%
            </span>
          </div>

          {/* Precipitation Info (if any) */}
          {totalPrecipitation > 0 && (
            <div className="weather-info-item col-span-2">
              {getWeatherIcon()}
              <span className="info-value">
                {rain > 0 && `Rain ${rain}mm`}
                {showers > 0 && `Showers ${showers}mm`}
                {snowfall > 0 && `Snow ${snowfall}cm`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimatedWeather;