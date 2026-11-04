import React from 'react';

/**
 * Terminal Slideshow logo as inline SVG, so it stays sharp at any size.
 * The mark is the faceted four-corner symbol; "side" adds the name next to it.
 */

const GOLD = '#e3dc9c';
const GOLD_MID = '#a8a362';
const GOLD_DARK = '#6e6b3e';

const CornerPiece = () => (
  <>
    <rect x="17" y="18" width="9" height="22" fill={GOLD} />
    <rect x="8" y="32" width="9" height="8" fill={GOLD_DARK} />
    <polygon points="17,32 26,40 17,40" fill={GOLD_MID} />
  </>
);

const MarkShapes = () => (
  <>
    <polygon points="33,4 67,4 56,15 44,15" fill={GOLD} />
    <polygon points="33,4 44,15 44,26 33,26" fill={GOLD_MID} />
    <polygon points="67,4 56,15 56,26 67,26" fill={GOLD_DARK} />
    <polygon points="33,96 67,96 56,85 44,85" fill={GOLD} />
    <polygon points="33,96 44,85 44,74 33,74" fill={GOLD_MID} />
    <polygon points="67,96 56,85 56,74 67,74" fill={GOLD_DARK} />
    <g><CornerPiece /></g>
    <g transform="translate(100 0) scale(-1 1)"><CornerPiece /></g>
    <g transform="translate(0 100) scale(1 -1)"><CornerPiece /></g>
    <g transform="translate(100 100) scale(-1 -1)"><CornerPiece /></g>
  </>
);

interface BrandLogoProps {
  /** "side": mark with the name on two lines. "mark": only the symbol. */
  variant?: 'side' | 'mark';
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

  return (
    <svg
      viewBox="0 0 190 40"
      role="img"
      aria-label="Terminal Slideshow"
      className={className}
      style={style}
    >
      <g transform="scale(0.4)"><MarkShapes /></g>
      <text
        x="48"
        y="17"
        fontFamily="Orbitron, Oxanium, sans-serif"
        fontSize="8"
        letterSpacing="3"
        fontWeight="500"
        fill={GOLD_MID}
      >
        TERMINAL
      </text>
      <text
        x="47"
        y="34"
        fontFamily="Orbitron, Oxanium, sans-serif"
        fontSize="15"
        fontWeight="700"
        fill={GOLD}
      >
        SLIDESHOW
      </text>
    </svg>
  );
};

export default BrandLogo;
