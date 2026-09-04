import assert from 'node:assert/strict';
import test from 'node:test';
import { filterDayTripLocations, matchesDayTripActivities } from '../src/lib/dayTripFiltering.mjs';

const location = (tags, bikeExposure, stroller = true, environment = 'outdoor') => ({
  tags,
  bikeExposure,
  stroller,
  environment,
  notFor: [],
  hours: 'always',
});

test('ordinary constraints are applied before activity matching', () => {
  const locations = [location(['woody-walk'], 'high'), location(['playground'], 'low')];
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { bicycleFree: true }), false);
});

test('a surviving low bike-exposure location can satisfy the activity', () => {
  const locations = [location(['woody-walk'], 'high'), location(['woody-walk'], 'low')];
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { bicycleFree: true }), true);
});

test('no-playground rejects from original locations and unknown bike exposure fails closed', () => {
  const locations = [location(['playground'], 'unknown'), location(['woody-walk'], 'unknown')];
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { noPlayground: true }), false);
  assert.equal(filterDayTripLocations(locations, { bicycleFree: true }).length, 0);
});

test('stroller is unrestricted off and applied before activity matching when on', () => {
  const locations = [location(['woody-walk'], 'unknown', false), location(['playground'], 'low', true)];
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { stroller: false }), true);
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { stroller: true }), false);
});

test('bike-free filtering keeps a separate low-exposure forest route in a mixed destination', () => {
  const locations = [location(['woody-walk'], 'high', true), location(['woody-walk'], 'low', false)];
  assert.equal(matchesDayTripActivities(locations, new Set(['woody-walk']), { bicycleFree: true }), true);
});

test('bike-free filtering does not reject an enclosed activity classified low', () => {
  const locations = [location(['indoor-visit'], 'low', true, 'indoor')];
  assert.equal(matchesDayTripActivities(locations, new Set(['indoor-visit']), { bicycleFree: true }), true);
});
