import React from 'react';

/**
 * Flat gold silhouettes for the special days: a flyer that crosses the screen now and then,
 * and small particles that drift down. Everything is SVG, no emoji.
 */

const SHADE = '#0a1020';

/** One reindeer, facing right, mid-gallop. Drawn in a 120 x 100 box. */
const Reindeer = () => (
  <g>
    <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeWidth="3.4">
      {/* legs: front pair reaching forward, back pair pushing off */}
      <path d="M84 62 L102 70 L110 67" />
      <path d="M78 64 L92 78 L90 88" />
      <path d="M26 62 L12 72 L2 70" />
      <path d="M34 64 L24 80 L28 90" />
      {/* antlers */}
      <path d="M96 12 C92 0 97 -8 104 -12 M99 -4 L108 -5 M95 3 L87 -5" />
      <path d="M102 15 C104 4 110 0 116 -1 M110 4 L117 7" />
    </g>
    <path
      fill="currentColor"
      d="M10 54 C6 44 16 36 32 36 L66 36 C76 36 82 31 86 24 L92 13
         C94 9 99 8 103 10 L117 17 C120 19 119 23 115 24 L105 26
         C103 36 97 46 90 52 C86 57 80 62 70 62 L36 62 C24 64 14 62 10 54 Z"
    />
    <path fill="currentColor" d="M10 48 C4 46 2 40 5 35 C9 38 12 42 14 46 Z" />
    <circle cx="112" cy="19" r="1.8" fill={SHADE} />
  </g>
);

/** Santa's sleigh with the sack. Drawn in a 270 x 120 box. */
const SleighBody = () => (
  <g>
    <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* runner with curled front and back */}
      <path d="M14 108 C-2 108 -4 90 10 88" strokeWidth="4.5" />
      <path d="M14 108 L238 108 C256 108 262 94 254 86" strokeWidth="4.5" />
      <path d="M58 108 L64 86 M128 108 L130 86 M198 108 L196 86" strokeWidth="3.4" />
      {/* reins */}
      <path d="M200 40 C226 32 246 40 268 44" strokeWidth="1.6" opacity=".85" />
    </g>
    <g fill="currentColor">
      {/* sleigh body */}
      <path d="M20 58 C20 80 32 90 54 90 L216 90 C244 90 262 74 260 42 C250 58 234 64 214 64 L24 64 Z" />
      {/* sack of presents */}
      <path d="M44 62 C30 40 40 14 72 12 C104 10 118 38 108 62 Z" />
      <path d="M60 18 C64 6 80 6 86 16 L82 24 L64 24 Z" />
      {/* Santa: coat, face, beard, hat with fur brim and pompom */}
      <path d="M130 64 C126 44 138 30 156 30 C176 30 188 42 186 64 Z" />
      <circle cx="158" cy="20" r="10" />
      <path d="M148 21 C148 36 156 41 161 41 C167 41 170 34 169 21 C163 26 154 26 148 21 Z" />
      <path d="M147 12 C146 -4 160 -10 177 -2 L168 12 Z" />
      <rect x="145" y="10" width="26" height="6" rx="3" />
      <circle cx="178" cy="-3" r="4.6" />
      <path d="M184 44 L200 40 L202 46 L184 52 Z" />
    </g>
    {/* details cut into the silhouette */}
    <g fill={SHADE} opacity=".55">
      <rect x="130" y="54" width="56" height="3" />
      <path d="M44 62 L108 62 L108 65 L44 65 Z" />
      <path d="M62 24 L84 24 L84 27 L62 27 Z" />
      <path d="M146 17.5 L171 17.5" stroke={SHADE} strokeWidth="1.6" />
    </g>
  </g>
);

const Santa = () => (
  <svg viewBox="0 -24 700 154" className="flyer-art" aria-hidden="true">
    {/* sparkle trail behind the sleigh */}
    <g fill="currentColor">
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={-8 - i * 15} cy={96 - (i % 3) * 10} r={3.2 - i * 0.28} opacity={0.75 - i * 0.08} />
      ))}
    </g>
    <g className="flyer-bob">
      <SleighBody />
    </g>
    {/* reins connect to the first deer; three reindeer in a wave */}
    <g transform="translate(266 12) scale(.82)" className="flyer-bob b2"><Reindeer /></g>
    <g transform="translate(364 2) scale(.82)" className="flyer-bob b3"><Reindeer /></g>
    <g transform="translate(462 12) scale(.82)" className="flyer-bob b2"><Reindeer /></g>
    <g transform="translate(560 0) scale(.82)" className="flyer-bob b3"><Reindeer /></g>
  </svg>
);

const Bat = () => (
  <svg viewBox="0 0 260 110" className="flyer-art" aria-hidden="true">
    <path
      fill="currentColor"
      d="M130 30 C122 30 118 20 120 10 C126 16 134 16 140 10 C142 20 138 30 130 30 Z
         M128 32 C110 22 80 18 40 30 C28 34 12 28 2 18 C6 40 18 58 40 58 C50 58 58 52 66 58
         C76 66 84 62 92 68 C102 76 112 66 120 80 C124 86 126 94 130 102 C134 94 136 86 140 80
         C148 66 158 76 168 68 C176 62 184 66 194 58 C202 52 210 58 220 58 C242 58 254 40 258 18
         C248 28 232 34 220 30 C180 18 150 22 132 32 Z"
    />
    <circle cx="126" cy="22" r="1.6" fill={SHADE} />
    <circle cx="134" cy="22" r="1.6" fill={SHADE} />
  </svg>
);

const Bunny = () => (
  <svg viewBox="0 0 150 110" className="flyer-art" aria-hidden="true">
    <g fill="currentColor">
      <ellipse cx="62" cy="72" rx="42" ry="24" />
      <circle cx="112" cy="52" r="18" />
      <path d="M104 40 C96 14 100 0 108 2 C116 4 118 22 114 38 Z" />
      <path d="M118 38 C120 14 128 2 136 6 C142 10 134 28 126 42 Z" />
      <circle cx="16" cy="70" r="9" />
      <ellipse cx="94" cy="96" rx="20" ry="7" />
      <ellipse cx="36" cy="98" rx="18" ry="7" />
    </g>
    <circle cx="120" cy="48" r="2.2" fill={SHADE} />
  </svg>
);

const Firework = () => (
  <svg viewBox="0 0 160 160" className="flyer-art" aria-hidden="true">
    <g stroke="currentColor" strokeLinecap="round" fill="currentColor">
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8;
        const long = i % 2 === 0;
        const r1 = long ? 22 : 30;
        const r2 = long ? 72 : 56;
        return (
          <g key={i}>
            <line x1={80 + Math.cos(a) * r1} y1={80 + Math.sin(a) * r1} x2={80 + Math.cos(a) * r2} y2={80 + Math.sin(a) * r2} strokeWidth="3" />
            <circle cx={80 + Math.cos(a) * (r2 + 7)} cy={80 + Math.sin(a) * (r2 + 7)} r="3.4" stroke="none" />
          </g>
        );
      })}
    </g>
  </svg>
);

const Mask = () => (
  <svg viewBox="0 0 160 100" className="flyer-art" aria-hidden="true">
    <path
      fill="currentColor"
      d="M8 40 C8 16 40 8 80 8 C120 8 152 16 152 40 C152 70 124 92 100 80 C90 74 86 66 80 66 C74 66 70 74 60 80 C36 92 8 70 8 40 Z"
    />
    <ellipse cx="46" cy="42" rx="16" ry="9" fill={SHADE} />
    <ellipse cx="114" cy="42" rx="16" ry="9" fill={SHADE} />
  </svg>
);

export const FLYERS: Record<string, { art: React.ReactNode; shout: string; wide?: boolean }> = {
  christmas: { art: <Santa />, shout: 'Frohe Weihnachten', wide: true },
  halloween: { art: <Bat />, shout: 'Happy Halloween' },
  easter: { art: <Bunny />, shout: 'Frohe Ostern' },
  newyear: { art: <Firework />, shout: 'Prosit Neujahr' },
  carnival: { art: <Mask />, shout: 'Narri, Narro' },
};

/** Small falling shapes. Snow is drawn with CSS, everything else is one of these (24 x 24 box). */
export const PARTICLES: Record<string, React.ReactNode> = {
  leaf: <path d="M12 2 C20 6 22 14 12 22 C2 14 4 6 12 2 Z M12 6 L12 21" />,
  bat: <path d="M12 8 C10 6 6 5 1 8 C4 9 5 12 6 14 C8 12 10 13 12 17 C14 13 16 12 18 14 C19 12 20 9 23 8 C18 5 14 6 12 8 Z" />,
  egg: <ellipse cx="12" cy="13" rx="7" ry="9" />,
  spark: <path d="M12 1 L14 10 L23 12 L14 14 L12 23 L10 14 L1 12 L10 10 Z" />,
  confetti: <rect x="8" y="3" width="8" height="18" rx="1" />,
  petal: <path d="M12 2 C19 8 19 16 12 22 C5 16 5 8 12 2 Z" />,
  coin: <circle cx="12" cy="12" r="6" />,
};
