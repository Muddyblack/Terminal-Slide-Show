import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { deepMerge } from '../src/utils/deepMerge.js';

describe('deepMerge', () => {
  it('merges nested objects and replaces arrays', () => {
    const base = { schedule: { onTime: '07:00', days: [1, 2, 3] }, info: { location: 'A' } };
    const merged = deepMerge(base, { schedule: { days: [6] } });
    assert.deepEqual(merged, { schedule: { onTime: '07:00', days: [6] }, info: { location: 'A' } });
  });

  it('does not mutate its inputs', () => {
    const base = { a: { b: 1 } };
    deepMerge(base, { a: { b: 2 } });
    assert.equal(base.a.b, 1);
  });

  it('returns the base for a missing override', () => {
    const base = { a: 1 };
    assert.equal(deepMerge(base, undefined), base);
  });
});

describe('SLIDESHOW_CONFIG', () => {
  const load = async (contents) => {
    const dir = mkdtempSync(join(tmpdir(), 'slideshow-'));
    const file = join(dir, 'config.json');
    writeFileSync(file, contents);
    process.env.SLIDESHOW_CONFIG = file;
    // Fresh module instance per call, since the config is built at import time
    return import(`../config/config.js?${Math.random()}`);
  };

  it('overrides defaults and is exposed to the browser', async () => {
    const { config, publicConfig } = await load(JSON.stringify({
      schedule: { onTime: '09:15' },
      secretThing: { token: 'x' },
    }));
    assert.equal(config.schedule.onTime, '09:15');
    assert.equal(config.schedule.offTime, '19:30'); // untouched default
    assert.equal(publicConfig.schedule.onTime, '09:15');
    assert.equal(publicConfig.secretThing, undefined); // keys the browser does not know stay private
  });

  it('fails loudly on a broken file', async () => {
    await assert.rejects(load('{ nope'), /Cannot load SLIDESHOW_CONFIG/);
  });
});
