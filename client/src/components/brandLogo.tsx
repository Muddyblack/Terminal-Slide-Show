import React from 'react';

/**
 * Terminal Slideshow logo as inline SVG, so it stays sharp at any size.
 * The mark is the faceted four-corner symbol; "side" adds the name next to it.
 */

const GOLD = '#e3dc9c';
const GOLD_MID = '#a8a362';
const GOLD_DARK = '#6e6b3e';

/**
 * Small sizes (the chip on the daily view, ~40 px) lose the dark facets on glass, and the corner
 * pieces fall apart into dots. There the facets use close, bright golds so every piece stays whole.
 */
const SMALL_TONES = { light: '#f1e9ac', mid: '#d6ce8a', dark: '#bdb571' };
const FULL_TONES = { light: GOLD, mid: GOLD_MID, dark: GOLD_DARK };
type Tones = typeof FULL_TONES;

const CornerPiece = ({ t }: { t: Tones }) => (
  <>
    <rect x="17" y="18" width="9" height="22" fill={t.light} />
    <rect x="8" y="32" width="9" height="8" fill={t.dark} />
    <polygon points="17,32 26,40 17,40" fill={t.mid} />
  </>
);

const MarkShapes = ({ t = FULL_TONES }: { t?: Tones }) => (
  <>
    <polygon points="33,4 67,4 56,15 44,15" fill={t.light} />
    <polygon points="33,4 44,15 44,26 33,26" fill={t.mid} />
    <polygon points="67,4 56,15 56,26 67,26" fill={t.dark} />
    <polygon points="33,96 67,96 56,85 44,85" fill={t.light} />
    <polygon points="33,96 44,85 44,74 33,74" fill={t.mid} />
    <polygon points="67,96 56,85 56,74 67,74" fill={t.dark} />
    <g><CornerPiece t={t} /></g>
    <g transform="translate(100 0) scale(-1 1)"><CornerPiece t={t} /></g>
    <g transform="translate(0 100) scale(1 -1)"><CornerPiece t={t} /></g>
    <g transform="translate(100 100) scale(-1 -1)"><CornerPiece t={t} /></g>
  </>
);

interface BrandLogoProps {
  /** "side": mark with the name on two lines. "wide": name on one line between the mark's halves. "mark": only the symbol. */
  variant?: 'side' | 'wide' | 'mark';
  className?: string;
  /** Height in CSS units; width follows the aspect ratio. */
  height?: string | number;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'side', className, height }) => {
  const style = height === undefined ? undefined : { height, width: 'auto' };

  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label="Terminal Slideshow"
        className={className}
        style={style}
      >
        <MarkShapes />
      </svg>
    );
  }

  if (variant === 'wide') {
    // Upper and lower half of the mark, pulled apart, with the name on one line in the gap
    return (
      <svg
        viewBox="0 0 210 72"
        role="img"
        aria-label="Terminal Slideshow"
        className={className}
        style={style}
      >
        <svg x="70" y="0" width="70" height="25.2" viewBox="0 4 100 36">
          <MarkShapes />
        </svg>
        <svg x="70" y="46.8" width="70" height="25.2" viewBox="0 60 100 36">
          <MarkShapes />
        </svg>
        <text
          x="105"
          y="41.5"
          textAnchor="middle"
          fontFamily="Orbitron, Oxanium, sans-serif"
          fontSize="14"
          fontWeight="600"
          letterSpacing="0.5"
          fill={GOLD}
        >
          TERMINAL SLIDESHOW
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 190 40"
      role="img"
      aria-label="Terminal Slideshow"
      className={className}
      style={style}
    >
      <defs>
        {/* a fine dark edge keeps the gold readable on bright photos and light glass */}
        <filter id="brand-logo-edge" x="-5%" y="-20%" width="110%" height="140%">
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.6" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>
      <g filter="url(#brand-logo-edge)">
        <g transform="scale(0.4)"><MarkShapes t={SMALL_TONES} /></g>
        <text
          x="48"
          y="16"
          fontFamily="Orbitron, Oxanium, sans-serif"
          fontSize="10.5"
          letterSpacing="2.4"
          fontWeight="600"
          fill={SMALL_TONES.mid}
        >
          TERMINAL
        </text>
        <text
          x="47"
          y="35"
          fontFamily="Orbitron, Oxanium, sans-serif"
          fontSize="16"
          fontWeight="700"
          fill={SMALL_TONES.light}
        >
          SLIDESHOW
        </text>
      </g>
    </svg>
  );
};

export default BrandLogo;
