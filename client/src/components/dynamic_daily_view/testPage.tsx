import { frontendConfig } from '@config/frontend.config';
import { ReactNode, useEffect, useRef, useState } from 'react';

import '@/styles/testPage.css';
import {
  DEFAULT_DEBUG,
  DayNight,
  DebugOptions,
  PictureSource,
  WeatherPreset,
} from '@/components/dynamic_daily_view/debugOptions';
import DynamicDailyView from '@/components/dynamic_daily_view/dynamicDailyView';

/**
 * /test: the daily view with a control panel for trying out times, occasions, weather,
 * places and picture sources. Only compiled into development builds (see main.tsx).
 * Opening the panel shrinks the view next to it, so the whole screen stays visible.
 */

const year = new Date().getFullYear();

/** [emoji, label, MM-DD]. Easter dates move, these are for 2026 and only used as examples. */
const OCCASIONS: Array<[string, string, string]> = [
  ['🎆', 'Neujahr', '01-01'],
  ['⛄', 'Winterzeit', '01-25'],
  ['💝', 'Valentinstag', '02-14'],
  ['🎭', 'Fasnet', '02-17'],
  ['🐣', 'Ostern', '04-05'],
  ['🌷', 'Tag der Arbeit', '05-01'],
  ['🕊️', 'Pfingsten', '05-24'],
  ['🏛️', 'Einheit', '10-03'],
  ['🍂', 'Goldener Oktober', '10-20'],
  ['🎃', 'Halloween', '10-31'],
  ['🧱', 'Mauerfall', '11-09'],
  ['🏮', 'Sankt Martin', '11-11'],
  ['🌫️', 'Novembergrau', '11-20'],
  ['🎅', 'Nikolaus', '12-06'],
  ['🕯️', 'Advent', '12-15'],
  ['🎄', 'Weihnachten', '12-24'],
  ['🥂', 'Silvester', '12-31'],
];

const PLACES = ['Friedrichshafen', 'Hamburg', 'Berlin', 'Zürich', 'Tromsø', 'Kapstadt'];

const DAY_NIGHT: Array<[DayNight, string]> = [['auto', '🔄 Auto'], ['day', '☀️ Tag'], ['night', '🌙 Nacht']];

const WEATHER: Array<[WeatherPreset, string]> = [
  ['live', '📡 Live'],
  ['clear', '☀️ Klar'],
  ['cloudy', '⛅ Wolken'],
  ['rain', '🌧️ Regen'],
  ['thunder', '⛈️ Gewitter'],
  ['snow', '❄️ Schnee'],
  ['fog', '🌫️ Nebel'],
];

const SOURCES: Array<[PictureSource, string, string]> = [
  ['auto', 'Automatisch', 'Anlass, sonst NASA, sonst Region, sonst Wikimedia'],
  ['occasion', 'Nur Anlass', 'Foto zum Thema des Tages (Mauerfall, Halloween …)'],
  ['nasa', 'Nur NASA', 'Bild des Tages, falls ein echtes kommt'],
  ['region', 'Nur Region', 'Foto aus dem Umkreis des Ortes'],
  ['potd', 'Nur Wikimedia', 'Bild des Tages von Wikipedia'],
  ['none', 'Kein Bild', 'Nur der Farbverlauf'],
];

const pad = (n: number) => String(n).padStart(2, '0');
const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="card">
    <h3>{title}</h3>
    {children}
  </section>
);

const Segmented = <T extends string>({ value, options, onChange }: {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) => (
  <div className="segmented" role="group">
    {options.map(([id, label]) => (
      <button key={id} className={value === id ? 'on' : ''} aria-pressed={value === id} onClick={() => onChange(id)}>
        {label}
      </button>
    ))}
  </div>
);

const Toggle = ({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) => (
  <label className="toggle">
    <span>{children}</span>
    <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <i aria-hidden="true" />
  </label>
);

const PANEL_WIDTH = 380;

const TestPage = () => {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'left' | 'right'>('left');
  const [debug, setDebug] = useState<DebugOptions>(DEFAULT_DEBUG);
  const [placeInput, setPlaceInput] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  // Measure the stage itself: sidebars, scrollbars and zoom change its width without a window resize
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const observer = new ResizeObserver(() => setViewportWidth(stage.clientWidth));
    observer.observe(stage);
    setViewportWidth(stage.clientWidth);
    return () => observer.disconnect();
  }, []);

  const update = (patch: Partial<DebugOptions>) => setDebug((prev) => ({ ...prev, ...patch }));

  const date = debug.fakeNow ? debug.fakeNow.slice(0, 10) : '';
  const minutes = debug.fakeNow
    ? Number(debug.fakeNow.slice(11, 13)) * 60 + Number(debug.fakeNow.slice(14, 16))
    : 0;
  const setTimeParts = (newDate: string, newMinutes: number) =>
    update({ fakeNow: `${newDate}T${pad(Math.floor(newMinutes / 60))}:${pad(newMinutes % 60)}` });

  const clearCache = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('dynamicView_'))
      .forEach((key) => localStorage.removeItem(key));
    update({ reloadKey: debug.reloadKey + 1 });
  };

  // The view shrinks into the space the panel leaves free, so nothing is covered
  const panelWidth = Math.min(PANEL_WIDTH, viewportWidth - 48);
  const scale = open ? (viewportWidth - panelWidth) / viewportWidth : 1;

  return (
    <>
      <div className="test-stage" ref={stageRef}>
        <div
          className={`test-view${open ? ' open' : ''}`}
          style={{ transform: `scale(${scale})`, transformOrigin: side === 'left' ? 'right center' : 'left center' }}
        >
          <DynamicDailyView debug={debug} />
        </div>
      </div>

      <aside
        className={`test-drawer ${side}${open ? ' open' : ''}`}
        style={{ width: panelWidth }}
        aria-label="Testseite"
      >
        <button className="test-handle" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? '✕' : '⚙'} <span>Test</span>
        </button>

        <div className="test-panel" inert={!open}>
          <header>
            <div>
              <h2>Testseite</h2>
              <p>Nur in der Entwicklung</p>
            </div>
            <button className="icon" onClick={() => setSide(side === 'left' ? 'right' : 'left')} title="Panel auf die andere Seite">
              ⇄
            </button>
          </header>

          <Card title="Zeit &amp; Datum">
            <Toggle
              checked={Boolean(debug.fakeNow)}
              onChange={(on) => update({ fakeNow: on ? nowLocal() : '' })}
            >
              Eigene Uhrzeit
            </Toggle>
            {debug.fakeNow && (
              <>
                <div className="time-readout">{pad(Math.floor(minutes / 60))}:{pad(minutes % 60)}</div>
                <input
                  type="range"
                  min={0}
                  max={1439}
                  step={5}
                  value={minutes}
                  onChange={(e) => setTimeParts(date, Number(e.target.value))}
                />
                <div className="chips">
                  {([['🌅 Morgen', 7 * 60], ['🌞 Mittag', 12 * 60], ['🌇 Abend', 19 * 60], ['🌌 Nacht', 23 * 60 + 30]] as const).map(([label, m]) => (
                    <button key={label} onClick={() => setTimeParts(date, m)}>{label}</button>
                  ))}
                </div>
                <input type="date" value={date} onChange={(e) => e.target.value && setTimeParts(e.target.value, minutes)} />
              </>
            )}
          </Card>

          <Card title="Anlass">
            <div className="chips">
              {OCCASIONS.map(([emoji, label, md]) => (
                <button
                  key={label}
                  className={date === `${year}-${md}` ? 'on' : ''}
                  onClick={() => update({ fakeNow: `${year}-${md}T${debug.fakeNow ? debug.fakeNow.slice(11) : '12:00'}` })}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
            <button className="ghost" onClick={() => update({ fakeNow: '' })}>Zurück zum heutigen Datum</button>
          </Card>

          <Card title="Licht &amp; Wetter">
            <Segmented value={debug.dayNight} options={DAY_NIGHT} onChange={(dayNight) => update({ dayNight })} />
            <div className="chips">
              {WEATHER.map(([id, label]) => (
                <button key={id} className={debug.weather === id ? 'on' : ''} onClick={() => update({ weather: id })}>
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Ort">
            <p className="hint">Für Wetter, Fakten und Regionalfotos. Standard: {frontendConfig.info.location}</p>
            <div className="chips">
              {PLACES.map((place) => (
                <button
                  key={place}
                  className={(debug.location || frontendConfig.info.location) === place ? 'on' : ''}
                  onClick={() => update({ location: place })}
                >
                  {place}
                </button>
              ))}
            </div>
            <form
              className="field"
              onSubmit={(e) => {
                e.preventDefault();
                update({ location: placeInput.trim() });
              }}
            >
              <input value={placeInput} onChange={(e) => setPlaceInput(e.target.value)} placeholder="Anderer Ort …" />
              <button type="submit">OK</button>
            </form>
          </Card>

          <Card title="Hintergrundbild">
            <div className="choices">
              {SOURCES.map(([id, label, hint]) => (
                <button key={id} className={debug.source === id ? 'on' : ''} aria-pressed={debug.source === id} onClick={() => update({ source: id })}>
                  <strong>{label}</strong>
                  <small>{hint}</small>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Verbindung">
            <Toggle checked={debug.offline} onChange={(offline) => update({ offline })}>
              Server nicht erreichbar
            </Toggle>
            <p className="hint">Die Ansicht muss dann mit ihrem Cache auskommen.</p>
            <div className="chips">
              <button onClick={() => update({ reloadKey: debug.reloadKey + 1 })}>🔄 Neu laden</button>
              <button onClick={clearCache}>🗑️ Cache leeren</button>
            </div>
          </Card>

          <button className="reset" onClick={() => { setDebug(DEFAULT_DEBUG); setPlaceInput(''); }}>
            Alles zurücksetzen
          </button>
        </div>
      </aside>
    </>
  );
};

export default TestPage;
