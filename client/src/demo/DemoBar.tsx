import { DEMO_OCCASIONS, DEMO_WEATHER } from '@/demo';

const base = import.meta.env.BASE_URL;

/** Page link with the demo's options kept, e.g. ?weather=rain */
const go = (path: string, changes: Record<string, string | null> = {}) => {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  return `${base}${path}${query ? `?${query}` : ''}`;
};

/** Small bar on the GitHub Pages demo: switch view, weather and occasion. Not part of real builds. */
const DemoBar = () => {
  const params = new URLSearchParams(window.location.search);
  const onDaily = window.location.pathname.endsWith('dynamic-view');
  const occasion = Object.entries(DEMO_OCCASIONS).find(([, o]) => params.get('date')?.endsWith(o.day))?.[0] ?? '';

  const style = {
    position: 'fixed', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: 8, alignItems: 'center',
    padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,.6)', color: '#fff',
    font: '12px/1.2 system-ui, sans-serif', backdropFilter: 'blur(6px)',
  } as const;
  const select = { background: '#222', color: '#fff', border: '1px solid #555', borderRadius: 4, font: 'inherit' } as const;

  return (
    <div style={style}>
      <strong>Demo</strong>
      <span style={{ opacity: 0.6 }}>v{__APP_VERSION__}</span>
      <a style={{ color: '#fff' }} href={go('', {})}>{onDaily ? 'Slideshow' : <b>Slideshow</b>}</a>
      <a style={{ color: '#fff' }} href={go('dynamic-view', {})}>{onDaily ? <b>Daily view</b> : 'Daily view'}</a>
      <select
        style={select}
        value={params.get('weather') ?? ''}
        onChange={(e) => window.location.assign(go(window.location.pathname.replace(base, ''), { weather: e.target.value || null }))}
        aria-label="Weather"
      >
        <option value="">Weather: default</option>
        {Object.keys(DEMO_WEATHER).map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      <select
        style={select}
        value={occasion}
        onChange={(e) => {
          const day = DEMO_OCCASIONS[e.target.value]?.day;
          window.location.assign(go(window.location.pathname.replace(base, ''), { date: day ? `${new Date().getFullYear()}-${day}` : null }));
        }}
        aria-label="Occasion"
      >
        <option value="">Occasion: today</option>
        {Object.entries(DEMO_OCCASIONS).map(([k, o]) => <option key={k} value={k}>{o.label}</option>)}
      </select>
    </div>
  );
};

export default DemoBar;
