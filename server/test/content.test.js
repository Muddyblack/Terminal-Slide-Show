import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildQueue, distanceKm, interleave, lakeInfo, lakeLine, weatherLine, sunLines } from '../src/services/contentService.js';

const failing = async () => {
  throw new Error('offline');
};

describe('content queue', () => {
  it('never repeats the same kind twice in a row', () => {
    const out = interleave({ A: ['1', '2', '3'], B: ['4', '5', '6'], C: ['7', '8'] });
    assert.equal(out.length, 8);
    for (let i = 1; i < out.length; i++) assert.notEqual(out[i].kind, out[i - 1].kind);
  });

  it('computes sun times close to the real ones', () => {
    // Friedrichshafen, 4 November: sunset is around 16:50 local time
    const lines = sunLines(new Date(2026, 10, 4), 47.65, 9.48, 'Europe/Berlin');
    const sunset = lines.find((l) => l.startsWith('Sonnenuntergang'));
    const [h, m] = sunset.match(/(\d\d):(\d\d)/).slice(1).map(Number);
    const minutes = h * 60 + m;
    assert.ok(minutes > 16 * 60 + 35 && minutes < 17 * 60 + 10, sunset);
  });

  it('reacts to weather', () => {
    assert.match(weatherLine({ temperature: 5, rain: 0.4, showers: 0, snowfall: 0 }), /Schirm/);
    assert.match(weatherLine({ temperature: -3, rain: 0, showers: 0, snowfall: 0, wind_gusts: 5 }), /Frost/);
    assert.equal(weatherLine({ temperature: 12, rain: 0, showers: 0, snowfall: 0, wind_gusts: 5, cloud_cover: 80, is_day: 1 }), null);
  });

  it('still works with every feed offline', async () => {
    const items = await buildQueue({
      location: 'Friedrichshafen',
      date: new Date(2026, 10, 4),
      place: { latitude: 47.65, longitude: 9.48, timezone: 'Europe/Berlin', current: { temperature: 6, rain: 0, showers: 0, snowfall: 0, wind_gusts: 5, cloud_cover: 50, is_day: 1 } },
      fetchFn: failing,
    });
    const kinds = new Set(items.map((i) => i.kind));
    assert.ok(items.length > 20);
    for (const k of ['Bodensee', 'Stadtfakt', 'Tipp', 'Sonne']) assert.ok(kinds.has(k), k);
  });

  it('uses the Wikipedia feed when it answers', async () => {
    const fetchFn = async (url) => ({
      ok: true,
      json: async () =>
        url.includes('onthisday')
          ? { events: [{ year: 1989, text: 'Die Berliner Mauer fällt.' }] }
          : { extract: 'Ort am Bodensee. Er ist bekannt für den Zeppelin. Dritter Satz.' },
    });
    const items = await buildQueue({ location: 'Testort', date: new Date(2026, 10, 9), place: null, fetchFn });
    assert.ok(items.some((i) => i.kind === 'An diesem Tag' && i.text.includes('1989')));
    assert.ok(items.some((i) => i.text.startsWith('Ort am Bodensee.')));
  });

  describe('lake level', () => {
    it('words the level and the change since yesterday', () => {
      assert.equal(
        lakeLine({ value: 251, stateMnwMhw: 'low' }, [{ value: 251 }]),
        'Pegel Konstanz: 251 cm, niedriger Wasserstand. Seit gestern unverändert.'
      );
      assert.match(lakeLine({ value: 340, stateMnwMhw: 'normal' }, [{ value: 335 }]), /normaler Wasserstand\. Seit gestern um 5 cm gestiegen/);
      assert.match(lakeLine({ value: 400, stateMnwMhw: 'high' }, [{ value: 410 }]), /hoher Wasserstand\. Seit gestern um 10 cm gefallen/);
      assert.equal(lakeLine({ value: 300 }, []), 'Pegel Konstanz: 300 cm.');
      assert.equal(lakeLine(null), null);
    });

    it('measures distance between places', () => {
      const d = distanceKm(47.6533, 9.4797, 47.66075, 9.181039); // Friedrichshafen to Konstanz
      assert.ok(d > 20 && d < 30, String(d));
    });

    it('only shows the lake near the lake and survives a failing feed', async () => {
      const fetchFn = async (url) => ({
        ok: true,
        json: async () => (url.includes('measurements') ? [{ value: 250 }] : { value: 252, stateMnwMhw: 'low' }),
      });
      assert.match(await lakeInfo({ latitude: 47.6533, longitude: 9.4797 }, fetchFn), /252 cm/);
      assert.equal(await lakeInfo({ latitude: 53.55, longitude: 10.0 }, fetchFn), null); // Hamburg
      assert.equal(await lakeInfo({ latitude: 47.6533, longitude: 9.4797 }, failing), null);
      assert.equal(await lakeInfo(null, fetchFn), null);
    });

    it('adds the lake to the queue for places near the lake', async () => {
      const fetchFn = async (url) => ({
        ok: true,
        json: async () => (url.includes('pegelonline') ? (url.includes('measurements') ? [{ value: 251 }] : { value: 251, stateMnwMhw: 'low' }) : { events: [], extract: '' }),
      });
      const place = { latitude: 47.65, longitude: 9.48, timezone: 'Europe/Berlin', current: { temperature: 6, rain: 0, showers: 0, snowfall: 0, wind_gusts: 5, cloud_cover: 50, is_day: 1 } };
      const items = await buildQueue({ location: 'Friedrichshafen', date: new Date(2026, 10, 4), place, fetchFn });
      assert.ok(items.some((i) => i.kind === 'Bodensee aktuell' && i.text.includes('251 cm')));
    });
  });
});
