import {
  BrickWall, Bird, CloudFog, Drama, Egg, Flame, Flower2, Ghost, Gift, Heart, Landmark,
  Leaf, LucideIcon, Snowflake, Sparkles, Sun, TreePine,
} from 'lucide-react';

import { OccasionType } from './types';

/**
 * The occasion of the day as a header above the clock: an emblem, the date, a title and,
 * when the day is still ahead, a countdown. Icons come from lucide, so it also works offline.
 */

const DAY = 24 * 60 * 60 * 1000;

const ICON_BY_ID: Record<string, LucideIcon> = {
  christmas: TreePine,
  nikolaus: Gift,
  advent: Flame,
  winter: Snowflake,
  newyear: Sparkles,
  silvester: Sparkles,
  halloween: Ghost,
  unity: Landmark,
  mauerfall: BrickWall,
  easter: Egg,
  himmelfahrt: Sun,
  pfingsten: Bird,
  maifeiertag: Flower2,
  valentine: Heart,
  fasnet: Drama,
  martin: Flame,
  goldenoctober: Leaf,
  november: CloudFog,
};

const ICON_BY_THEME: Record<string, LucideIcon> = {
  christmas: TreePine,
  winter: Snowflake,
  newyear: Sparkles,
  halloween: Ghost,
  unity: Landmark,
  easter: Egg,
  carnival: Drama,
  spring: Flower2,
  autumn: Leaf,
};

/** Countdown targets that are not the occasion's own day */
function specialTarget(id: string, y: number): { date: Date; label: string } | null {
  if (['advent', 'nikolaus', 'christmas'].includes(id)) return { date: new Date(y, 11, 24), label: 'bis Heiligabend' };
  if (id === 'silvester') return { date: new Date(y + 1, 0, 1), label: `bis ${y + 1}` };
  return null;
}

const COUNT_LABEL: Record<string, string> = {
  halloween: 'bis Halloween',
  easter: 'bis Ostern',
  unity: 'bis zum Feiertag',
  fasnet: 'bis zur Fasnet',
};

const parseDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const pad = (n: number) => String(n).padStart(2, '0');

const dayMonth = (date: Date) => date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });

function kicker(occasion: OccasionType, now: Date): string {
  if (occasion.id === 'mauerfall') return '9. November 1989';
  if (!occasion.day) return 'Zur Jahreszeit';
  const day = parseDay(occasion.day);
  if (startOfDay(now) >= day) return `Heute · ${dayMonth(now)}`;
  return day.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "19 Tage bis Heiligabend", or on New Year's Eve a running "09:12:44 bis 2027" */
function countdown(occasion: OccasionType, now: Date): { value: string; label: string } | null {
  const special = specialTarget(occasion.id, now.getFullYear());
  const target = special?.date ?? (occasion.day ? parseDay(occasion.day) : null);
  if (!target) return null;
  const label = special?.label ?? COUNT_LABEL[occasion.id] ?? '';

  const days = Math.round((target.getTime() - startOfDay(now).getTime()) / DAY);
  if (days <= 0) return null;
  if (days === 1 && occasion.id === 'silvester') {
    const left = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
    return { value: `${pad(Math.floor(left / 3600))}:${pad(Math.floor(left / 60) % 60)}:${pad(left % 60)}`, label };
  }
  return { value: String(days), label: `${days === 1 ? 'Tag' : 'Tage'} ${label}`.trim() };
}

export default function OccasionArt({ occasion, now }: { occasion: OccasionType; now: Date }) {
  const Icon = ICON_BY_ID[occasion.id] ?? ICON_BY_THEME[occasion.theme] ?? Sparkles;
  const count = countdown(occasion, now);

  return (
    <div className="occasion" key={occasion.id}>
      <div className="occasion-emblem" aria-hidden="true">
        <svg className="occasion-emblem-ring" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" pathLength="120" />
        </svg>
        <Icon className="occasion-emblem-icon" strokeWidth={1.4} />
      </div>
      <div className="occasion-copy">
        <span className="occasion-kicker">{kicker(occasion, now)}</span>
        <h1 className="occasion-title">{occasion.title.replace(/!$/, '')}</h1>
        <p className="occasion-text">{occasion.text}</p>
        {count && (
          <div className="occasion-countdown">
            <span className="occasion-countdown-label">noch</span>
            <b>{count.value}</b>
            <span>{count.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
