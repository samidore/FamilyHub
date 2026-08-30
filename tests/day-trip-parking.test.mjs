import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseDayTripParking, parseDayTrips } from '../src/data/dayTripSchema.mjs';

const readJson = async (file) => JSON.parse(await readFile(new URL(file, import.meta.url), 'utf8'));
const trips = parseDayTrips(await readJson('../src/data/day-trips.json'));
const parking = parseDayTripParking(await readJson('../src/data/day-trip-parking.json'), trips.map((trip) => trip.id));

test('Day Trips keeps parking warnings keyed to real destinations', () => {
  const ids = new Set(trips.map((trip) => trip.id));
  for (const id of Object.keys(parking)) assert.ok(ids.has(id), `${id} parking points at a missing destination`);
});

test('NJ Botanical Garden makes its summer cash-only parking impossible to miss in data', () => {
  const rule = parking['new-jersey-botanical-garden'];
  assert.ok(rule, 'NJ Botanical Garden parking rule is missing');
  assert.equal(rule.payment, 'cash-only');
  assert.match(rule.fee, /\$5/);
  assert.match(rule.fee, /\$7/);
  assert.match(rule.schedule, /Memorial Day/i);
  assert.match(rule.schedule, /Labor Day/i);
  assert.equal(rule.verifiedDate, '2026-08-30');
});

test('known paid state-park parking uses structured fee metadata', () => {
  assert.equal(parking['rockefeller-main-entrance-swan-lake']?.payment, 'automated-pay-station');
  assert.match(parking['rockefeller-main-entrance-swan-lake']?.fee ?? '', /\$6/);
  assert.match(parking['bear-mountain-hessian-lake']?.fee ?? '', /\$10/);
});
