import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../../config');

/**
 * A theme is a set of CSS variables for the daily view (see the .daily-view block in dynamicDailyView.css).
 * "default" has no variables: the stylesheet's own look stays. Own themes go into config/themes.json,
 * see themes.example.json, and are picked with THEME=<id> in .env.
 */
export const BUILT_IN_THEMES = {
  default: { name: 'Default', vars: {} },
  // DHBW Ravensburg: brand red #e2001a (lightened a bit so it reads on dark), anthracite grey #5c6971
  dhbw: {
    name: 'DHBW Ravensburg',
    vars: {
      '--gold': '#ff3347',
      '--accent-2': '#c9d1d6',
      '--tint-1': '20 24 27',
      '--tint-2': '44 52 57',
      '--tint-3': '92 105 113',
    },
  },
};

function readCustom() {
  const file = join(dir, 'themes.json');
  if (!existsSync(file)) return {};
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch (err) {
    console.warn(`config/themes.json ignored, it is not valid JSON: ${err.message}`);
    return {};
  }
}

/** Only CSS custom properties with plain values may come from a file. */
function cleanVars(vars) {
  return Object.fromEntries(
    Object.entries(vars && typeof vars === 'object' ? vars : {})
      .filter(([key, value]) => /^--[\w-]+$/.test(key) && typeof value === 'string' && !/[;{}<>]/.test(value)),
  );
}

export function listThemes() {
  const custom = Object.fromEntries(
    Object.entries(readCustom()).map(([id, t]) => [id, { name: String(t?.name || id), vars: cleanVars(t?.vars) }]),
  );
  return { ...BUILT_IN_THEMES, ...custom };
}

/** The theme chosen by id; unknown ids fall back to default. */
export function getTheme(id) {
  const themes = listThemes();
  const key = String(id || 'default').toLowerCase();
  const theme = themes[key] ?? themes.default;
  return { id: themes[key] ? key : 'default', ...theme };
}
