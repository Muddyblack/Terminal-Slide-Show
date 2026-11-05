import { ComponentRef, CSSProperties, useEffect, useRef } from 'react';

import '@/styles/weatherScene.css';
import { WeatherState } from './weatherModel';

/**
 * The weather over the whole screen, behind the text:
 * - a canvas for rain (with splashes), drizzle, snow, hail and lightning bolts
 * - CSS layers for fog, storm clouds, cloud shadows, the lightning flash and frost on the edges.
 * One canvas and a handful of transformed layers keep it light enough for a small kiosk PC.
 */

/* ---------- noise textures: drawn once by the browser, then only moved ---------- */

function noise({ fx, fy, octaves, seed, rgb, slope, offset, w = 1400, h = 700 }: {
  fx: number; fy: number; octaves: number; seed: number; rgb: [number, number, number]; slope: number; offset: number; w?: number; h?: number;
}): string {
  const [r, g, b] = rgb.map((c) => (c / 255).toFixed(3));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>`
    + `<filter id='n' x='0' y='0' width='100%' height='100%'>`
    + `<feTurbulence type='fractalNoise' baseFrequency='${fx} ${fy}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch'/>`
    + `<feColorMatrix values='0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  ${slope} 0 0 0 ${offset}'/>`
    + `</filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// Fog wisps: very large and soft (low frequency, two octaves), so no streaks or blotches
const FOG_DAY = noise({ fx: 0.0009, fy: 0.0022, octaves: 2, seed: 7, rgb: [208, 213, 219], slope: 1.6, offset: -0.55 });
const FOG_NIGHT = noise({ fx: 0.0009, fy: 0.0022, octaves: 2, seed: 7, rgb: [118, 132, 152], slope: 1.6, offset: -0.55 });
const CLOUD_DARK = noise({ fx: 0.0022, fy: 0.0045, octaves: 5, seed: 3, rgb: [12, 16, 26], slope: 2.4, offset: -0.6 });
const CLOUD_SHADOW = noise({ fx: 0.0012, fy: 0.0024, octaves: 3, seed: 11, rgb: [6, 10, 20], slope: 2.2, offset: -0.85 });

/* ---------- canvas engine ---------- */

interface EngineConfig {
  precip: WeatherState['precip'];
  level: number;
  hail: number;
  thunder: number;
  showers: boolean;
  windX: number;
  night: boolean;
}

interface Drop { x: number; y: number; z: number; len: number; vy: number; ground: number; layer: number }
interface Flake { x: number; y: number; z: number; r: number; vy: number; phase: number; sway: number }
interface Stone { x: number; y: number; z: number; r: number; vx: number; vy: number; ground: number; bounced: boolean }
interface Splash { x: number; y: number; t: number; size: number }
interface Bolt { paths: Array<{ points: Array<[number, number]>; width: number }>; born: number; pattern: Array<[number, number]>; x: number; sheet: boolean }

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Soft round sprite, used for snowflakes and hailstones */
function sprite(size: number, stops: Array<[number, string]>): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size * 0.42, size * 0.4, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** A jagged bolt from the clouds down, with a few side branches (midpoint displacement) */
function makeBoltPath(x0: number, y0: number, x1: number, y1: number, rough: number): Array<[number, number]> {
  let pts: Array<[number, number]> = [[x0, y0], [x1, y1]];
  let offset = rough;
  for (let pass = 0; pass < 6; pass++) {
    const next: Array<[number, number]> = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      next.push([(ax + bx) / 2 + rand(-offset, offset), (ay + by) / 2 + rand(-offset, offset) * 0.25]);
      next.push(pts[i + 1]);
    }
    pts = next;
    offset *= 0.55;
  }
  return pts;
}

function makeBolt(w: number, h: number, now: number, level: number, sheet: boolean): Bolt {
  const x0 = rand(w * 0.12, w * 0.88);
  const flickers = 2 + Math.floor(Math.random() * (1 + level));
  // [ms, brightness]: a first strike, a few re-strikes, then out
  const pattern: Array<[number, number]> = [[0, 1]];
  let t = 0;
  for (let i = 0; i < flickers; i++) {
    t += rand(40, 90);
    pattern.push([t, rand(0.05, 0.25)]);
    t += rand(30, 70);
    pattern.push([t, rand(0.55, 1)]);
  }
  pattern.push([t + rand(160, 320), 0]);
  if (sheet) return { paths: [], born: now, pattern, x: x0, sheet };

  const y1 = rand(h * 0.55, h * 1.02);
  const x1 = x0 + rand(-0.22, 0.22) * w;
  const main = makeBoltPath(x0, -20, x1, y1, w * 0.06);
  const paths = [{ points: main, width: 1 }];
  const branches = 2 + Math.floor(Math.random() * (2 + level));
  for (let i = 0; i < branches; i++) {
    const start = main[Math.floor(rand(0.15, 0.7) * main.length)];
    const len = rand(0.12, 0.3) * h;
    const dir = Math.random() < 0.5 ? -1 : 1;
    paths.push({ points: makeBoltPath(start[0], start[1], start[0] + dir * rand(0.3, 0.8) * len, start[1] + len, w * 0.025), width: 0.45 });
  }
  return { paths, born: now, pattern, x: x0, sheet };
}

/** Brightness of a bolt `ms` after it was born, from its flicker pattern */
function boltLight(bolt: Bolt, ms: number): number {
  const p = bolt.pattern;
  if (ms >= p[p.length - 1][0]) return 0;
  for (let i = p.length - 2; i >= 0; i--) {
    if (ms >= p[i][0]) {
      // the last step fades out, the others snap
      if (i === p.length - 2) return p[i][1] * (1 - (ms - p[i][0]) / (p[i + 1][0] - p[i][0]));
      return p[i][1];
    }
  }
  return 0;
}

function startEngine(canvas: ComponentRef<'canvas'>, flash: ComponentRef<'div'>, cfg: EngineConfig): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;

  let w = 0;
  let h = 0;
  let scale = 1;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  const drops: Drop[] = [];
  const flakes: Flake[] = [];
  const stones: Stone[] = [];
  const splashes: Splash[] = [];
  let bolt: Bolt | null = null;
  let nextStrike = window.performance.now() + rand(1500, 4000);

  const flakeSprite = sprite(64, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.85)'], [1, 'rgba(255,255,255,0)']]);
  const hailSprite = sprite(48, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(225,240,255,.95)'], [0.75, 'rgba(170,205,235,.8)'], [1, 'rgba(170,205,235,0)']]);

  const wind = cfg.windX * (cfg.showers ? 1.4 : 1);

  const newDrop = (top: boolean): Drop => {
    const z = Math.random();
    const drizzle = cfg.precip === 'drizzle';
    const heavy = 0.75 + cfg.level * 0.25;
    return {
      x: rand(-0.15 * w, 1.15 * w),
      y: top ? rand(-0.3 * h, -10) : rand(-0.1 * h, h),
      z,
      len: drizzle ? 5 + 8 * z : (14 + 30 * z) * heavy,
      vy: (drizzle ? 380 + 320 * z : 950 + 1100 * z) * (drizzle ? 1 : heavy),
      ground: h * (0.86 + 0.16 * z),
      layer: z < 0.4 ? 0 : z < 0.8 ? 1 : 2,
    };
  };
  const newFlake = (top: boolean): Flake => {
    const z = Math.random();
    const grains = cfg.precip === 'grains';
    return {
      x: rand(-0.1 * w, 1.1 * w),
      y: top ? rand(-0.2 * h, -10) : rand(0, h),
      z,
      r: grains ? 1 + z * 1.4 : (1.2 + z * 3.6) * (0.8 + cfg.level * 0.2),
      vy: grains ? 220 + 160 * z : 35 + 85 * z + cfg.level * 12,
      phase: rand(0, Math.PI * 2),
      sway: grains ? 4 : 10 + 26 * z,
    };
  };
  const newStone = (top: boolean): Stone => {
    const z = Math.random();
    return {
      x: rand(-0.05 * w, 1.05 * w),
      y: top ? rand(-0.4 * h, -10) : rand(-0.2 * h, h * 0.8),
      z,
      r: (1.8 + z * 2.8) * (cfg.hail === 2 ? 1.6 : 1),
      vx: 0,
      vy: 900 + 700 * z,
      ground: h * (0.88 + 0.12 * z),
      bounced: false,
    };
  };

  const fill = () => {
    const area = Math.min(2.2, (w * h) / (1920 * 1080));
    const count = (base: number) => Math.round(base * area);
    drops.length = 0;
    flakes.length = 0;
    stones.length = 0;
    if (cfg.precip === 'rain') {
      const n = count([0, 170, 330, 560][cfg.level] * (cfg.hail ? 0.6 : 1));
      for (let i = 0; i < n; i++) drops.push(newDrop(false));
    }
    if (cfg.precip === 'drizzle') {
      const n = count([0, 160, 260, 380][cfg.level]);
      for (let i = 0; i < n; i++) drops.push(newDrop(false));
    }
    if (cfg.precip === 'snow' || cfg.precip === 'grains') {
      const n = count(cfg.precip === 'grains' ? 220 : [0, 90, 190, 340][cfg.level]);
      for (let i = 0; i < n; i++) flakes.push(newFlake(false));
    }
    if (cfg.hail) {
      const n = count(cfg.hail === 2 ? 170 : 90);
      for (let i = 0; i < n; i++) stones.push(newStone(false));
    }
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    scale = Math.min(1.4, Math.max(0.6, h / 1080));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fill();
  };
  resize();
  window.addEventListener('resize', resize);

  // three depth layers: far drops are thin and faint, near ones thicker and brighter
  const rainColor = cfg.night ? '175, 195, 225' : '215, 228, 245';
  const layers = cfg.precip === 'drizzle'
    ? [[0.16, 0.7], [0.24, 0.9], [0.32, 1.1]]
    : [[0.14, 0.8], [0.24, 1.1], [0.38, 1.6]];

  let last = window.performance.now();
  let raf = 0;

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);

    // rain and drizzle, batched per depth layer
    if (drops.length) {
      const slant = wind * 0.35;
      for (let l = 0; l < 3; l++) {
        ctx.beginPath();
        for (const d of drops) {
          if (d.layer !== l) continue;
          d.y += d.vy * dt;
          d.x += d.vy * slant * dt;
          if (d.y - d.len > d.ground) {
            if (cfg.precip === 'rain' && d.z > 0.45 && splashes.length < 160) {
              splashes.push({ x: d.x, y: d.ground, t: 0, size: (3 + 7 * d.z) * scale });
            }
            Object.assign(d, newDrop(true));
            continue;
          }
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * slant, d.y - d.len);
        }
        ctx.strokeStyle = `rgba(${rainColor}, ${layers[l][0]})`;
        ctx.lineWidth = layers[l][1] * scale;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // splashes: a small crown that widens and fades
    if (splashes.length) {
      ctx.lineWidth = 1 * scale;
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.t += dt / 0.28;
        if (s.t >= 1) { splashes.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(${rainColor}, ${0.45 * (1 - s.t)})`;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.size * (0.3 + s.t), s.size * 0.32 * (0.3 + s.t), 0, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
    }

    // snow: soft flakes that sway, the near ones bigger and faster
    if (flakes.length) {
      const t = now / 1000;
      for (const f of flakes) {
        f.y += f.vy * dt;
        f.x += (wind * 60 * (0.4 + f.z) + Math.cos(t * 0.8 + f.phase) * f.sway * 0.6) * dt;
        if (f.y - f.r > h) Object.assign(f, newFlake(true));
        if (f.x > w * 1.15) f.x -= w * 1.3;
        if (f.x < -w * 0.15) f.x += w * 1.3;
        const size = f.r * 2 * scale;
        ctx.globalAlpha = 0.35 + 0.55 * f.z;
        ctx.drawImage(flakeSprite, f.x - size / 2, f.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    }

    // hail: hard, fast, and it bounces once
    if (stones.length) {
      for (const s of stones) {
        s.vy += (s.bounced ? 2600 : 0) * dt;
        s.y += s.vy * dt;
        s.x += (s.vx + wind * 220) * dt;
        if (!s.bounced && s.y > s.ground) {
          s.bounced = true;
          s.y = s.ground;
          s.vy = -s.vy * rand(0.18, 0.32);
          s.vx = rand(-90, 90);
        } else if (s.bounced && s.y > s.ground + 2) {
          Object.assign(s, newStone(true));
        }
        const size = s.r * 2 * scale;
        ctx.globalAlpha = 0.55 + 0.45 * s.z;
        ctx.drawImage(hailSprite, s.x - size / 2, s.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    }

    // lightning
    if (cfg.thunder) {
      if (!bolt && now >= nextStrike) {
        const sheetChance = [0, 0.6, 0.35, 0.2][cfg.thunder];
        bolt = makeBolt(w, h, now, cfg.thunder, Math.random() < sheetChance);
        const gap = [[0, 0], [9, 20], [4.5, 11], [1.8, 6]][cfg.thunder];
        nextStrike = now + rand(gap[0], gap[1]) * 1000;
      }
      if (bolt) {
        const light = boltLight(bolt, now - bolt.born);
        const strength = [0, 0.32, 0.45, 0.6][cfg.thunder] * (bolt.sheet ? 0.65 : 1);
        flash.style.opacity = String(light * strength);
        flash.style.setProperty('--fx', `${(bolt.x / w) * 100}%`);
        if (light > 0 && !bolt.sheet) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (const pass of [
            { width: 9, color: `rgba(150, 175, 255, ${0.22 * light})`, blur: 28 },
            { width: 3.2, color: `rgba(205, 220, 255, ${0.75 * light})`, blur: 10 },
            { width: 1.3, color: `rgba(255, 255, 255, ${light})`, blur: 0 },
          ]) {
            ctx.shadowBlur = pass.blur;
            ctx.shadowColor = 'rgba(160, 185, 255, .9)';
            ctx.strokeStyle = pass.color;
            for (const path of bolt.paths) {
              ctx.lineWidth = pass.width * path.width * scale;
              ctx.beginPath();
              path.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
              ctx.stroke();
            }
          }
          ctx.restore();
        }
        if (light === 0 && now - bolt.born > 100) bolt = null;
      }
    }

    raf = window.requestAnimationFrame(frame);
  };

  const onVisibility = () => {
    window.cancelAnimationFrame(raf);
    if (!document.hidden) {
      last = window.performance.now();
      raf = window.requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  raf = window.requestAnimationFrame(frame);

  return () => {
    window.cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    flash.style.opacity = '0';
    // wipe the last frame, or the rain would hang frozen on screen when the weather clears up
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}

/* ---------- component ---------- */

export default function WeatherScene({ state, night }: { state: WeatherState; night: boolean }) {
  const canvasRef = useRef<ComponentRef<'canvas'>>(null);
  const flashRef = useRef<ComponentRef<'div'>>(null);
  const moving = state.precip !== 'none' || state.thunder > 0;

  useEffect(() => {
    if (!moving || !canvasRef.current || !flashRef.current) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    return startEngine(canvasRef.current, flashRef.current, {
      precip: state.precip,
      level: state.level,
      hail: state.hail,
      thunder: state.thunder,
      showers: state.showers,
      windX: state.windX,
      night,
    });
  }, [moving, state.precip, state.level, state.hail, state.thunder, state.showers, state.windX, night]);

  if (state.kind === 'clear' && night) return null;

  const cloudy = ['overcast', 'drizzle', 'rain', 'snow', 'thunder'].includes(state.kind);
  const vars = {
    '--fog-tex': night ? FOG_NIGHT : FOG_DAY,
    '--cloud-tex': CLOUD_DARK,
    '--shadow-tex': CLOUD_SHADOW,
    '--wind': state.windX,
  } as CSSProperties;

  return (
    <div
      className={`weather-scene wx-${state.kind} wx-l${state.level}${night ? ' wx-night' : ' wx-day'}${state.showers ? ' wx-showers' : ''}`}
      style={vars}
      aria-hidden="true"
    >
      {state.kind === 'clear' && <div className="wx-sun-glow" />}
      {(state.kind === 'partly' || state.kind === 'overcast') && <div className="wx-shadows" />}
      {cloudy && <div className="wx-mood" />}
      {cloudy && state.kind !== 'overcast' && <div className="wx-clouds" />}
      {state.kind === 'fog' && (
        <>
          {/* the scene behind goes soft, pale and flat, like through real fog */}
          <div className="wx-fog-veil" />
          <div className="wx-mist wx-mist-a" />
          <div className="wx-mist wx-mist-b" />
        </>
      )}
      <canvas ref={canvasRef} className="wx-canvas" />
      <div ref={flashRef} className="wx-flash" />
      {state.freezing && <div className="wx-frost" />}
    </div>
  );
}
