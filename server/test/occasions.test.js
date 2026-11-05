import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { easterSunday, firstAdvent, getOccasion, listOccasions, resolveDate } from '../src/utils/occasions.js';

const day = (y, m, d) => new Date(y, m - 1, d);
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

describe('movable dates match the calendar', () => {
  // Published dates, so a mistake in the formulas shows up here
  const EASTER = {
    2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28',
    2028: '2028-04-16', 2029: '2029-04-01', 2030: '2030-04-21', 2035: '2035-03-25', 2038: '2038-04-25',
  };

  it('computes Easter Sunday', () => {
    for (const [year, date] of Object.entries(EASTER)) {
      assert.equal(easterSunday(Number(year)).toISOString().slice(0, 10), date, `Easter ${year}`);
    }
  });

  it('derives Himmelfahrt, Pfingsten and the Fasnet from Easter', () => {
    assert.equal(iso(resolveDate('easter+39', 2026)), '2026-05-14');
    assert.equal(iso(resolveDate('easter+39', 2027)), '2027-05-06');
    assert.equal(iso(resolveDate('easter+49', 2026)), '2026-05-24');
    assert.equal(iso(resolveDate('easter+49', 2027)), '2027-05-16');
    assert.equal(iso(resolveDate('easter+49', 2028)), '2028-06-04');
    // Schmotziger Dunschtig and Rosenmontag
    assert.equal(iso(resolveDate('easter-52', 2026)), '2026-02-12');
    assert.equal(iso(resolveDate('easter-48', 2026)), '2026-02-16');
    assert.equal(iso(resolveDate('easter-52', 2027)), '2027-02-04');
    assert.equal(iso(resolveDate('easter-48', 2027)), '2027-02-08');
    assert.equal(iso(resolveDate('easter-48', 2028)), '2028-02-28');
  });

  it('finds the first Advent, also when Christmas is a Sunday or Monday', () => {
    assert.equal(iso(firstAdvent(2022)), '2022-11-27'); // Christmas on a Sunday
    assert.equal(iso(firstAdvent(2025)), '2025-11-30');
    assert.equal(iso(firstAdvent(2026)), '2026-11-29');
    assert.equal(iso(firstAdvent(2027)), '2027-11-28');
    assert.equal(iso(firstAdvent(2028)), '2028-12-03'); // 4th Advent is Heiligabend
  });

  it('reads date specs and rejects nonsense', () => {
    assert.equal(iso(resolveDate('12-24', 2026)), '2026-12-24');
    assert.equal(iso(resolveDate(' Advent + 7 ', 2026)), '2026-12-06');
    assert.equal(resolveDate('13-01', 2026), null);
    assert.equal(resolveDate('pentecost', 2026), null);
  });
});

describe('occasions', () => {
  it('knows the Tag der Deutschen Einheit only in Germany', () => {
    assert.equal(getOccasion(day(2026, 10, 3), 'DE').id, 'unity');
    assert.equal(getOccasion(day(2026, 10, 5), 'DE').id, 'unity');
    assert.notEqual(getOccasion(day(2026, 10, 3), 'CH')?.id, 'unity');
  });

  it('finds the Advent Sundays and Christmas', () => {
    assert.equal(getOccasion(day(2026, 11, 29), 'DE').title, '1. Advent');
    assert.equal(getOccasion(day(2026, 12, 13), 'DE').title, '3. Advent');
    assert.equal(getOccasion(day(2026, 12, 10), 'DE'), null);
    assert.equal(getOccasion(day(2026, 12, 24), 'DE').id, 'christmas');
    // 2028: the 4th Advent falls on Heiligabend, Christmas wins
    assert.equal(getOccasion(day(2028, 12, 24), 'DE').id, 'christmas');
    // 2026: Nikolaus is the 2nd Advent
    assert.equal(getOccasion(day(2026, 12, 6), 'DE').id, 'nikolaus');
  });

  it('lets an own occasion win over a built-in one on the same day', () => {
    const options = { custom: [{ id: 'jubilaeum', date: '10-31', title: '10 Jahre Firma' }] };
    assert.equal(getOccasion(day(2026, 10, 31), options).id, 'jubilaeum');
  });

  it('finds Easter, the Fasnet and Halloween', () => {
    assert.equal(getOccasion(day(2026, 4, 3), 'DE').id, 'easter');
    assert.equal(getOccasion(day(2026, 4, 6), 'DE').id, 'easter');
    assert.equal(getOccasion(day(2027, 2, 4), 'DE').id, 'fasnet');
    assert.equal(getOccasion(day(2027, 2, 10), 'DE'), null); // Aschermittwoch
    assert.equal(getOccasion(day(2026, 10, 31), 'DE').id, 'halloween');
  });

  it('runs New Year until 11 January, then nothing', () => {
    assert.equal(getOccasion(day(2026, 12, 29), 'DE').id, 'silvester');
    assert.equal(getOccasion(day(2027, 1, 2), 'DE').id, 'newyear');
    assert.equal(getOccasion(day(2027, 1, 11), 'DE').id, 'newyear');
    assert.equal(getOccasion(day(2027, 1, 12), 'DE'), null);
  });

  it('has Christmas week and a golden October week', () => {
    assert.equal(getOccasion(day(2026, 12, 18), 'DE').id, 'christmas');
    assert.equal(getOccasion(day(2026, 12, 20), 'DE').title, '4. Advent');
    assert.equal(getOccasion(day(2026, 10, 16), 'DE').id, 'goldenoctober');
    assert.equal(getOccasion(day(2026, 11, 20), 'DE'), null);
  });

  it('is off on most days of the year', () => {
    let shown = 0;
    for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
      if (getOccasion(d, 'DE')) shown += 1;
    }
    assert.ok(shown < 70, `${shown} days with an occasion`);
  });

  it('can be switched off', () => {
    assert.equal(getOccasion(day(2026, 10, 31), { enabled: false }), null);
    assert.notEqual(getOccasion(day(2026, 10, 31), { disabled: ['halloween'] })?.id, 'halloween');
  });

  it('returns null in summer', () => {
    assert.equal(getOccasion(day(2026, 7, 15), 'DE'), null);
  });
});

describe('user settings', () => {
  it('changes days and texts of a built-in occasion, keeping the rest', () => {
    const options = { override: { newyear: { after: 3 }, christmas: { before: 1, text: 'Vom ganzen Team!' } } };
    assert.equal(getOccasion(day(2027, 1, 5), options), null);
    assert.equal(getOccasion(day(2026, 12, 20), options).id, 'advent');
    const christmas = getOccasion(day(2026, 12, 24), options);
    assert.equal(christmas.text, 'Vom ganzen Team!');
    assert.equal(christmas.title, 'Frohe Weihnachten!');
  });

  it('keeps a custom Christmas title on the holidays', () => {
    const options = { override: { christmas: { title: 'Frohes Fest' } } };
    assert.equal(getOccasion(day(2026, 12, 25), options).title, 'Frohes Fest');
  });

  it('ignores invalid values', () => {
    const options = { override: { halloween: { before: -4, after: 'x', title: '' } } };
    const halloween = listOccasions(2026, options).find((o) => o.id === 'halloween');
    assert.deepEqual([halloween.from, halloween.to, halloween.title], ['2026-10-25', '2026-10-31', 'Halloween & Reformationstag']);
  });

  it('adds own occasions, also movable ones', () => {
    const options = {
      custom: [
        { id: 'sommerfest', date: '07-10', before: 2, title: 'Sommerfest', text: 'Ab 16 Uhr', theme: 'spring' },
        { id: 'fronleichnam', date: 'easter+60', title: 'Fronleichnam' },
        { id: 'broken', date: 'someday', title: 'Nie' },
        { title: 'no id' },
      ],
    };
    assert.equal(getOccasion(day(2026, 7, 8), options).id, 'sommerfest');
    assert.equal(getOccasion(day(2026, 7, 10), options).text, 'Ab 16 Uhr');
    assert.equal(getOccasion(day(2026, 6, 4), options).id, 'fronleichnam');
    assert.equal(getOccasion(day(2027, 5, 27), options).id, 'fronleichnam');
    assert.ok(!listOccasions(2026, options).some((o) => o.id === 'broken'));
  });
});
