import React, { CSSProperties } from 'react';

import { OccasionType } from './types';

/**
 * The moving layer of an occasion: falling particles plus one scene per theme
 * (fireworks, Santa's sleigh, a bat swarm, a hopping bunny). Everything is SVG and CSS,
 * coloured from the theme's --gold / --accent-2, and it all sits behind the text.
 */

/** Every silhouette is filled with this gradient, defined once per scene */
const FILL = 'url(#occasion-fill)';
const SHADE = 'rgba(10, 12, 24, .75)';

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

const FillGradient = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
    <defs>
      <linearGradient id="occasion-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--fill-light)' }} />
        <stop offset="1" style={{ stopColor: 'var(--gold)' }} />
      </linearGradient>
    </defs>
  </svg>
);

/* ---------- Christmas: Santa's sleigh with four reindeer ---------- */

/** One reindeer, facing right, mid-gallop. Drawn in a 120 x 100 box. */
const Reindeer = () => (
  <g>
    <g stroke={FILL} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeWidth="3.6">
      <path className="leg leg-front" d="M84 60 L100 70 L108 66" />
      <path className="leg leg-front b" d="M78 62 L90 76 L88 88" />
      <path className="leg leg-back" d="M28 60 L14 70 L4 68" />
      <path className="leg leg-back b" d="M36 62 L26 78 L30 88" />
      <path d="M96 12 C92 0 97 -8 104 -12 M99 -4 L108 -5 M95 3 L87 -5" strokeWidth="2.6" />
      <path d="M102 15 C104 4 110 0 116 -1 M110 4 L117 7" strokeWidth="2.6" />
    </g>
    <path
      fill={FILL}
      d="M10 54 C6 44 16 36 32 36 L66 36 C76 36 82 31 86 24 L92 13
         C94 9 99 8 103 10 L117 17 C120 19 119 23 115 24 L105 26
         C103 36 97 46 90 52 C86 57 80 62 70 62 L36 62 C24 64 14 62 10 54 Z"
    />
    <path fill={FILL} d="M10 48 C4 46 2 40 5 35 C9 38 12 42 14 46 Z" />
    <circle cx="112" cy="19" r="1.8" fill={SHADE} />
  </g>
);

/** Santa's sleigh with the sack. Drawn in a 270 x 120 box. */
const SleighBody = () => (
  <g>
    <g stroke={FILL} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M14 108 C-2 108 -4 90 10 88" strokeWidth="4.5" />
      <path d="M14 108 L238 108 C256 108 262 94 254 86" strokeWidth="4.5" />
      <path d="M58 108 L64 88 M128 108 L130 88 M198 108 L196 88" strokeWidth="3.4" />
      <path d="M200 40 C226 32 246 40 268 44" strokeWidth="1.4" opacity=".8" />
    </g>
    <g fill={FILL}>
      <path d="M20 58 C20 80 32 90 54 90 L216 90 C244 90 262 74 260 42 C250 58 234 64 214 64 L24 64 Z" />
      <path d="M44 62 C30 40 40 14 72 12 C104 10 118 38 108 62 Z" />
      <path d="M60 18 C64 6 80 6 86 16 L82 24 L64 24 Z" />
      <path d="M130 64 C126 44 138 30 156 30 C176 30 188 42 186 64 Z" />
      <circle cx="158" cy="20" r="10" />
      <path d="M148 21 C148 36 156 41 161 41 C167 41 170 34 169 21 C163 26 154 26 148 21 Z" />
      <path d="M147 12 C146 -4 160 -10 177 -2 L168 12 Z" />
      <rect x="145" y="10" width="26" height="6" rx="3" />
      <circle cx="178" cy="-3" r="4.6" />
      <path d="M184 44 L200 40 L202 46 L184 52 Z" />
    </g>
    {/* a few cut lines give the flat shape some depth */}
    <g fill={SHADE} opacity=".5">
      <rect x="130" y="54" width="56" height="3" />
      <rect x="24" y="72" width="220" height="2.5" rx="1.2" />
      <path d="M44 62 L108 62 L108 65 L44 65 Z" />
    </g>
  </g>
);

/** Four-point star used for the sparkle trail and the glitter */
const Star = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <path d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`} />
);

const Sleigh = () => (
  <div className="scene-fly sleigh">
    <svg viewBox="-260 -24 960 154" className="flyer-art" aria-hidden="true">
      <g className="trail" fill="var(--fill-light)">
        {Array.from({ length: 22 }, (_, i) => (
          <g key={i} className="twinkle" style={css({ animationDelay: `${-(i * 0.37) % 1.6}s` })}>
            <Star x={-6 - i * 11.5} y={100 - Math.sin(i * 0.9) * 10 - i * 0.6} r={Math.max(1.4, 7 - i * 0.28)} />
          </g>
        ))}
      </g>
      <g className="flyer-bob"><SleighBody /></g>
      <g transform="translate(266 12) scale(.82)" className="flyer-bob b2"><Reindeer /></g>
      <g transform="translate(364 2) scale(.82)" className="flyer-bob b3"><Reindeer /></g>
      <g transform="translate(462 12) scale(.82)" className="flyer-bob b2"><Reindeer /></g>
      <g transform="translate(560 0) scale(.82)" className="flyer-bob b3"><Reindeer /></g>
    </svg>
  </div>
);

/* ---------- New Year: fireworks ---------- */

const BURSTS: Array<{ x: number; y: number; size: number; delay: number; color: 1 | 2 | 3 }> = [
  { x: 52, y: 16, size: 17, delay: 0, color: 1 },
  { x: 74, y: 10, size: 13, delay: 1.7, color: 2 },
  { x: 38, y: 8, size: 11, delay: 3.1, color: 3 },
  { x: 64, y: 30, size: 15, delay: 4.4, color: 1 },
  { x: 86, y: 26, size: 10, delay: 5.6, color: 3 },
  { x: 46, y: 34, size: 9, delay: 6.9, color: 2 },
];

const Burst = () => (
  <svg viewBox="-100 -100 200 200" className="burst-art">
    {Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      const r = i % 2 ? 70 : 88;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      return (
        <g key={i}>
          <line x1={x * 0.45} y1={y * 0.45} x2={x * 0.92} y2={y * 0.92} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
          <circle cx={x} cy={y} r={i % 2 ? 2.4 : 3.2} stroke="none" />
        </g>
      );
    })}
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + 0.26;
      return <circle key={`in${i}`} cx={Math.cos(a) * 40} cy={Math.sin(a) * 40} r="2" stroke="none" opacity=".8" />;
    })}
  </svg>
);

const Fireworks = () => (
  <div className="fireworks" aria-hidden="true">
    {BURSTS.map((b, i) => (
      <div
        key={i}
        className={`burst c${b.color}`}
        style={css({ left: `${b.x}%`, top: `${b.y}%`, '--size': `${b.size}vw`, animationDelay: `${b.delay}s` })}
      >
        <span className="rocket" style={{ animationDelay: `${b.delay}s` }} />
        <div className="burst-bloom" style={{ animationDelay: `${b.delay}s` }}><Burst /></div>
      </div>
    ))}
  </div>
);

/* ---------- Halloween: a swarm of flapping bats ---------- */

const WING = 'M58 24 C46 12 28 8 4 16 C12 21 14 29 12 35 C18 31 24 33 28 39 C32 33 40 33 44 39 C46 33 52 31 58 33 Z';

const BatShape = () => (
  <svg viewBox="0 0 120 60" className="bat-art">
    <g fill={FILL}>
      <path className="wing" d={WING} />
      <g transform="translate(120 0) scale(-1 1)"><path className="wing" d={WING} /></g>
      <ellipse cx="60" cy="31" rx="6.5" ry="12" />
      <circle cx="60" cy="17" r="6.5" />
      <path d="M55 13 L54 4 L59 10 Z M65 13 L66 4 L61 10 Z" />
    </g>
  </svg>
);

const BATS = [
  { x: 0, y: 4, s: 1, d: 0 },
  { x: 7, y: 0, s: 0.7, d: -0.2 },
  { x: 11, y: 8, s: 0.55, d: -0.4 },
  { x: -6, y: 9, s: 0.62, d: -0.1 },
  { x: 16, y: 3, s: 0.45, d: -0.3 },
];

const BatSwarm = () => (
  <div className="scene-fly bats">
    {BATS.map((b, i) => (
      <div key={i} className="bat" style={css({ left: `${b.x}vw`, top: `${b.y}vh`, '--s': b.s, animationDelay: `${b.d * 4}s` })}>
        <div className="bat-flap" style={css({ '--flap-delay': `${b.d}s` })}><BatShape /></div>
      </div>
    ))}
  </div>
);

/* ---------- Easter: a bunny hopping along the bottom ---------- */

const Bunny = () => (
  <svg viewBox="0 -6 150 104" className="bunny-art">
    <g fill={FILL}>
      <path d="M96 34 C86 12 88 -4 97 -2 C106 0 107 18 105 33 Z" />
      <path d="M106 32 C109 9 119 -3 127 1 C134 5 124 22 113 36 Z" />
      <path d="M22 76 C12 58 26 34 60 32 C82 30 98 40 102 56 C106 72 94 86 72 88 L36 88 C28 88 24 84 22 76 Z" />
      <ellipse cx="107" cy="46" rx="19" ry="15" transform="rotate(-14 107 46)" />
      <ellipse cx="50" cy="89" rx="24" ry="6" />
      <ellipse cx="97" cy="86" rx="10" ry="5" />
    </g>
    <circle cx="20" cy="64" r="10" fill="var(--fill-light)" />
    <circle cx="114" cy="42" r="2.2" fill={SHADE} />
    <circle cx="125" cy="49" r="2" fill={SHADE} opacity=".6" />
  </svg>
);

const Hopper = () => (
  <div className="hopper" aria-hidden="true">
    <div className="hop"><Bunny /></div>
  </div>
);

/* ---------- falling particles ---------- */

/** Small falling shapes (24 x 24 box). Snow is drawn with CSS. */
export const PARTICLES: Record<string, React.ReactNode> = {
  leaf: <path d="M12 2 C20 6 22 14 12 22 C2 14 4 6 12 2 Z M12 6 L12 21" />,
  bat: <path d="M12 8 C10 6 6 5 1 8 C4 9 5 12 6 14 C8 12 10 13 12 17 C14 13 16 12 18 14 C19 12 20 9 23 8 C18 5 14 6 12 8 Z" />,
  egg: <ellipse cx="12" cy="13" rx="7" ry="9" />,
  spark: <path d="M12 1 Q12 12 23 12 Q12 12 12 23 Q12 12 1 12 Q12 12 12 1 Z" />,
  confetti: <rect x="8" y="3" width="8" height="18" rx="1" />,
  petal: <path d="M12 2 C19 8 19 16 12 22 C5 16 5 8 12 2 Z" />,
  coin: <circle cx="12" cy="12" r="6" />,
};

/** Snow only when it really snows, or in Christmas week; otherwise the occasion's own shape */
/** Gentle snow in Christmas week, otherwise the occasion's own shape (real snow is the weather layer's) */
const Particles = ({ occasion }: { occasion: OccasionType }) => {
  // Christmas week: from 18 December (the 4th Advent can fall into it too)
  const snow = occasion.theme === 'christmas' && (occasion.day?.slice(5) ?? '') >= '12-18';
  const shape = occasion.particle === 'snow' ? undefined : PARTICLES[occasion.particle];
  if (!snow && !shape) return null;
  return (
    <div className={`particles ${snow ? 'snow' : 'glyphs'}`} aria-hidden="true">
      {Array.from({ length: snow ? 60 : 22 }, (_, i) => (
        <span
          key={i}
          style={css({
            left: `${(i * 37) % 100}%`,
            animationDelay: `${-((i * 53) % 23)}s`,
            animationDuration: `${12 + ((i * 7) % 14)}s`,
            '--size': `${0.25 + ((i * 13) % 10) / 14}vw`,
            '--drift': `${((i * 11) % 9) - 4}vw`,
            '--spin': `${2.5 + (i % 5) * 0.7}s`,
          })}
        >
          {!snow && <svg viewBox="0 0 24 24" fill="currentColor">{shape}</svg>}
        </span>
      ))}
    </div>
  );
};

const SCENES: Record<string, () => React.ReactElement> = {
  christmas: Sleigh,
  newyear: Fireworks,
  halloween: BatSwarm,
  easter: Hopper,
};

/**
 * @param quiet true while real weather (rain, snow, fog) fills the screen: the occasion then
 *   drops its own particles and keeps only the flyby. Real snow comes from the weather layer.
 */
export default function OccasionScene({ occasion, quiet }: { occasion: OccasionType; quiet: boolean }) {
  const Scene = SCENES[occasion.theme];
  return (
    <>
      <FillGradient />
      {!quiet && <Particles occasion={occasion} />}
      {Scene && <Scene />}
    </>
  );
}
