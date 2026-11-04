import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { easterSunday, getOccasion } from '../src/utils/occasions.js';

const day = (y, m, d) => new Date(y, m - 1, d);

describe('occasions', () => {
  it('computes Easter Sunday', () => {
    assert.equal(easterSunday(2024).toISOString().slice(0, 10), '2024-03-31');
    assert.equal(easterSunday(2026).toISOString().slice(0, 10), '2026-04-05');
  });

  it('knows the Tag der Deutschen Einheit only in Germany', () => {
    assert.equal(getOccasion(day(2026, 10, 3), 'DE').id, 'unity');
    assert.notEqual(getOccasion(day(2026, 10, 3), 'CH').id, 'unity');
  });

  it('finds Advent and Christmas', () => {
    assert.equal(getOccasion(day(2026, 11, 29), 'DE').title, '1. Advent');
    assert.equal(getOccasion(day(2026, 12, 10), 'DE').id, 'advent');
    assert.equal(getOccasion(day(2026, 12, 24), 'DE').id, 'christmas');
  });

  it('finds Easter and Halloween', () => {
    assert.equal(getOccasion(day(2026, 4, 5), 'DE').id, 'easter');
    assert.equal(getOccasion(day(2026, 10, 31), 'DE').id, 'halloween');
  });

  it('runs New Year around the turn of the year and winter after it', () => {
    assert.equal(getOccasion(day(2026, 12, 29), 'DE').id, 'silvester');
    assert.equal(getOccasion(day(2027, 1, 2), 'DE').id, 'newyear');
    assert.equal(getOccasion(day(2027, 1, 20), 'DE').id, 'winter');
  });

  it('can be switched off', () => {
    assert.equal(getOccasion(day(2026, 10, 31), { enabled: false }), null);
    assert.notEqual(getOccasion(day(2026, 10, 31), { disabled: ['halloween'] })?.id, 'halloween');
  });

  it('returns null in summer', () => {
    assert.equal(getOccasion(day(2026, 7, 15), 'DE'), null);
  });
});
