import test from 'node:test';
import assert from 'node:assert/strict';
import { pickOccasionPhoto } from '../src/services/occasionPhotoService.js';

test('occasion photos rotate without repeats until the collection is exhausted', () => {
  const photos = ['wall', 'gate', 'celebration'];
  const date = new Date('2026-11-09T12:00:00Z');
  const selected = [0, 1, 2].map(slot => pickOccasionPhoto(photos, date, slot * 60000));
  assert.equal(new Set(selected).size, 3);
  assert.equal(pickOccasionPhoto(photos, date, 0), pickOccasionPhoto(photos, date, 59999));
  assert.equal(pickOccasionPhoto(photos, date, 0), pickOccasionPhoto(photos, date, 180000));
});

test('empty and single-photo collections are safe', () => {
  assert.equal(pickOccasionPhoto([]), null);
  assert.equal(pickOccasionPhoto(['only']), 'only');
});
