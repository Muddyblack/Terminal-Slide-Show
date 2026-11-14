import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isOperatingNow } from '../src/utils/schedule.js';

const schedule = {
  enabled: true,
  onTime: '07:30',
  offTime: '19:30',
  days: [1, 2, 3, 4, 5],
  vacationPeriods: [{ start: '24.06.2024', end: '28.06.2024' }],
};

// 2024-06-10 is a Monday
const at = (month, day, hour, minute = 0) => new Date(2024, month - 1, day, hour, minute);

describe('isOperatingNow', () => {
  it('is on inside the daily window on an allowed day', () => {
    assert.equal(isOperatingNow(schedule, at(6, 10, 12)), true);
    assert.equal(isOperatingNow(schedule, at(6, 10, 7, 30)), true);
  });

  it('is off before the on time and from the off time', () => {
    assert.equal(isOperatingNow(schedule, at(6, 10, 7, 29)), false);
    assert.equal(isOperatingNow(schedule, at(6, 10, 19, 30)), false);
  });

  it('is off on days that are not listed', () => {
    assert.equal(isOperatingNow(schedule, at(6, 15, 12)), false); // Saturday
    assert.equal(isOperatingNow(schedule, at(6, 16, 12)), false); // Sunday
  });

  it('is off during vacation, including the first and last day', () => {
    assert.equal(isOperatingNow(schedule, at(6, 24, 12)), false);
    assert.equal(isOperatingNow(schedule, at(6, 28, 12)), false);
    assert.equal(isOperatingNow(schedule, at(7, 1, 12)), true);
  });

  it('supports a window that crosses midnight', () => {
    const night = { ...schedule, onTime: '22:00', offTime: '06:00', days: [1, 2, 3, 4, 5, 6, 7], vacationPeriods: [] };
    assert.equal(isOperatingNow(night, at(6, 10, 23)), true);
    assert.equal(isOperatingNow(night, at(6, 10, 3)), true);
    assert.equal(isOperatingNow(night, at(6, 10, 12)), false);
  });

  it('is always on when the schedule is disabled', () => {
    assert.equal(isOperatingNow({ ...schedule, enabled: false }, at(6, 15, 3)), true);
  });
});
