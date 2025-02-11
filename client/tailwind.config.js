/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'spin-slow': 'spin 1.5s linear infinite',
        'blob': 'blob 3.5s infinite',
        'ping-slow': 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'draw': 'draw 1s ease infinite',
        'fill-in': 'fillIn 0.25s ease forwards',
        'temperature-pulse': 'temperature-pulse 3s ease-in-out infinite',
        'wind-sway': 'wind-sway 2s ease-in-out infinite',
        'weather-float': 'weather-float 4s ease-in-out infinite',
        'shooting-star': 'shoot 3s linear infinite',
        'float': 'float 4s ease-in-out infinite',
        'pulse-soft': 'pulse 4s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'blob': {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0, 0) scale(1)' },
        },
        'draw': {
          '0%': {
            'stroke-dashoffset': '1000',
            'fill-opacity': '0',
          },
          '90%': {
            'fill-opacity': '0',
          },
          '100%': {
            'stroke-dashoffset': '0',
            'fill-opacity': '1',
          },
        },
        'fillIn': {
          '0%': {
            'fill-opacity': '0',
          },
          '100%': {
            'fill-opacity': '1',
          },
        },
        'temperature-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'wind-sway': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(5deg)' },
        },
        'weather-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'shoot': {
          '0%': { transform: 'translateX(-100%) translateY(0)', opacity: 1 },
          '70%': { opacity: 1 },
          '100%': { transform: 'translateX(200%) translateY(100%)', opacity: 0 },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      strokeWidth: {
        '4': '4',
      },
      colors: {
        primary: '#135D7B',
        accent: '#55DCF5',
      },
      dropShadow: {
        'primary-glow': '0 0 8px rgba(19,93,123,0.6)',
        'accent-glow': '0 0 8px rgba(85,220,245,0.6)',
      },
      backgroundImage: {
        'weather-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
        'day-gradient': 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)',
        'night-gradient': 'linear-gradient(135deg, #0f172a, #1e293b, #334155)',
      },
    },
  },
  plugins: [],
}