import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readLocalizedData } from '../src/utils/localizedData.js';
import { forecastUrl, hasCoordinates } from '../src/utils/weather.js';

describe('forecastUrl', () => {
  it('uses metric units by default and omits elevation when unset', () => {
    const url = new URL(forecastUrl({ latitude: 47.65, longitude: 9.48 }));
    assert.equal(url.searchParams.get('latitude'), '47.65');
    assert.equal(url.searchParams.get('elevation'), null);
    assert.equal(url.searchParams.get('temperature_unit'), null);
  });

  it('passes elevation and imperial units', () => {
    const url = new URL(forecastUrl({ latitude: 1, longitude: 2, elevation: 395, units: 'imperial' }));
    assert.equal(url.searchParams.get('elevation'), '395');
    assert.equal(url.searchParams.get('temperature_unit'), 'fahrenheit');
    assert.equal(url.searchParams.get('wind_speed_unit'), 'mph');
    assert.equal(url.searchParams.get('precipitation_unit'), 'inch');
  });
});

describe('hasCoordinates', () => {
  it('needs both latitude and longitude as numbers', () => {
    assert.equal(hasCoordinates({ latitude: 1, longitude: 2 }), true);
    assert.equal(hasCoordinates({ latitude: 1, longitude: null }), false);
    assert.equal(hasCoordinates({}), false);
  });
});

describe('readLocalizedData', () => {
  const setup = () => {
    const root = mkdtempSync(join(tmpdir(), 'content-'));
    const write = (rel, data) => {
      const file = join(root, rel);
      mkdirSync(join(file, '..'), { recursive: true });
      writeFileSync(file, JSON.stringify(data));
    };
    return { root, write };
  };

  it('prefers the language folder, then the flat custom file, then bundled content', async () => {
    const { root, write } = setup();
    const bundledPath = join(root, 'bundled');
    write('bundled/de/facts.json', ['bundled de']);
    write('bundled/en/facts.json', ['bundled en']);
    const dataPath = join(root, 'custom');

    const read = (language) => readLocalizedData('facts.json', { dataPath, language, bundledPath });

    assert.deepEqual(await read('en'), ['bundled en']);
    assert.deepEqual(await read('fr'), ['bundled de']); // unknown language falls back to German

    write('custom/facts.json', ['custom flat']);
    assert.deepEqual(await read('en'), ['custom flat']);

    write('custom/en/facts.json', ['custom en']);
    assert.deepEqual(await read('en'), ['custom en']);
  });

  it('rejects when nothing exists', async () => {
    const { root } = setup();
    await assert.rejects(
      readLocalizedData('nope.json', { dataPath: root, language: 'de', bundledPath: root }),
      /No content file/
    );
  });
});
