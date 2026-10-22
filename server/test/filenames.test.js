import assert from 'node:assert/strict';
import { describe, it, mock, afterEach } from 'node:test';

import { DateParser } from '../src/utils/dateParser.js';
import { isValidFile } from '../src/utils/fileValidator.js';

// Local time, so the daily time windows line up with Date#getHours
const at = (iso) => mock.timers.enable({ apis: ['Date'], now: new Date(iso) });

afterEach(() => mock.timers.reset());

describe('DateParser', () => {
  it('parses a single date', () => {
    const { startDate, endDate } = DateParser.parseFileName('notice_15-03-2024.jpg');
    assert.equal(startDate.toISOString(), '2024-03-15T00:00:00.000Z');
    assert.equal(endDate, null);
  });

  it('parses a date range without years', () => {
    const { startDate, endDate } = DateParser.parseFileName('event_01-06@15-06.jpg');
    assert.equal(startDate.getUTCMonth(), 5);
    assert.equal(endDate.getUTCDate(), 15);
  });

  it('parses durations and requires both underscores', () => {
    assert.equal(DateParser.parseFileName('image_5s_25-12-2024.jpg').duration, 5000);
    assert.equal(DateParser.parseFileName('image5s_25-12-2024.jpg').duration, null);
  });

  it('parses time windows and does not mistake them for dates', () => {
    const info = DateParser.parseFileName('lunch_11h30-13h_.jpg');
    assert.deepEqual(info.timeWindow, { startMinutes: 690, endMinutes: 780 });
    assert.equal(info.startDate, undefined);
  });

  it('rejects impossible time windows', () => {
    assert.equal(DateParser.parseTimeWindow('x_25h-26h_.jpg'), null);
  });
});

describe('isValidFile', () => {
  it('shows a single-date file only on that day', () => {
    at(new Date(2024, 2, 15, 12));
    assert.equal(isValidFile('notice_15-03-2024.jpg'), true);
    assert.equal(isValidFile('notice_16-03-2024.jpg'), false);
  });

  it('shows a ranged file inside the range only', () => {
    at(new Date(2024, 5, 10, 12));
    assert.equal(isValidFile('event_01-06-2024@15-06-2024.jpg'), true);
    assert.equal(isValidFile('event_01-07-2024@15-07-2024.jpg'), false);
  });

  it('ignores files without a date or time window', () => {
    assert.equal(isValidFile('plain.jpg'), false);
  });

  it('applies a daily time window without a date to every day', () => {
    at(new Date(2024, 5, 10, 12));
    assert.equal(isValidFile('lunch_11h-13h_.jpg'), true);
    mock.timers.reset();
    at(new Date(2024, 5, 10, 14));
    assert.equal(isValidFile('lunch_11h-13h_.jpg'), false);
  });

  it('supports windows that cross midnight', () => {
    at(new Date(2024, 5, 10, 23, 30));
    assert.equal(isValidFile('night_22h-2h_.jpg'), true);
    mock.timers.reset();
    at(new Date(2024, 5, 10, 12));
    assert.equal(isValidFile('night_22h-2h_.jpg'), false);
  });

  it('can skip the time window when syncing ahead of time', () => {
    at(new Date(2024, 5, 10, 14));
    assert.equal(isValidFile('lunch_11h-13h_.jpg', { ignoreTime: true }), true);
  });

  it('combines a date range with a time window', () => {
    at(new Date(2024, 5, 10, 12));
    assert.equal(isValidFile('a_11h-13h_01-06-2024@15-06-2024.jpg'), true);
    assert.equal(isValidFile('a_14h-15h_01-06-2024@15-06-2024.jpg'), false);
  });
});
